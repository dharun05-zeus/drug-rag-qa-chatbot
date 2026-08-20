import os
import io
import fitz  # PyMuPDF
import docx2txt
import urllib3
import logging

# Set up logging
logger = logging.getLogger("attachment_processor")

# Import chunking logic from ingest
from ingest import chunk_text
from rag import get_embed_model

# Lazy OCR Reader singleton
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        logger.info("Initializing EasyOCR Reader...")
        import easyocr
        # Disable easyocr download progress logging to avoid console UnicodeEncodeError on Windows
        _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    return _ocr_reader


def process_pdf(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Extracts text page by page from PDF file bytes using PyMuPDF.
    If a page is scanned (no text layer), renders it and uses EasyOCR.
    """
    pages_data = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            clean_text = " ".join(text.split())
            
            if not clean_text:
                try:
                    logger.info(f"Page {page_num + 1} of PDF '{filename}' has no text layer. Running OCR fallback...")
                    pix = page.get_pixmap(dpi=150)
                    # Convert PDF page pixmap to image for OCR using Pillow
                    from PIL import Image
                    import numpy as np
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    img_np = np.array(img)
                    reader = get_ocr_reader()
                    results = reader.readtext(img_np, detail=0)
                    clean_text = " ".join(" ".join(results).split())
                except Exception as ocr_err:
                    logger.warning(f"OCR fallback failed on page {page_num + 1} of PDF '{filename}': {ocr_err}")
            
            if clean_text:
                pages_data.append({
                    "text": clean_text,
                    "page": page_num + 1
                })
        doc.close()
    except Exception as e:
        logger.error(f"Error parsing PDF {filename}: {e}")
        raise ValueError(f"Failed to parse PDF: {str(e)}")
    return pages_data


def process_docx(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Extracts text from DOCX file bytes using docx2txt.
    """
    try:
        temp_file = io.BytesIO(file_bytes)
        text = docx2txt.process(temp_file)
        clean_text = " ".join(text.split())
        if not clean_text:
            return []
        return [{"text": clean_text, "page": 1}]
    except Exception as e:
        logger.error(f"Error parsing DOCX {filename}: {e}")
        raise ValueError(f"Failed to parse Word Document: {str(e)}")


def process_image(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Extracts text from image bytes using EasyOCR.
    """
    try:
        reader = get_ocr_reader()
        # easyocr readtext can process raw bytes directly
        results = reader.readtext(file_bytes, detail=1)
        
        # Sort results top-to-bottom, left-to-right to maintain reading order
        results.sort(key=lambda r: (r[0][0][1], r[0][0][0]))
        
        text_lines = [text for bbox, text, confidence in results if confidence > 0.1]
        extracted_text = " ".join(text_lines).strip()
        
        if not extracted_text:
            return []
        return [{"text": extracted_text, "page": 1}]
    except Exception as e:
        logger.error(f"Error performing OCR on image {filename}: {e}")
        raise ValueError(f"Failed to extract text from image: {str(e)}")


def process_text(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Extracts text from plain text file bytes with encoding fallbacks.
    """
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode("latin-1")
        except Exception as e:
            logger.error(f"Error decoding text file {filename}: {e}")
            raise ValueError("Failed to decode text file. Ensure it is UTF-8 or Latin-1 encoded.")
            
    clean_text = " ".join(text.split())
    if not clean_text:
        return []
    return [{"text": clean_text, "page": 1}]


def process_attachment(file_bytes: bytes, filename: str) -> list[dict]:
    """
    Processes file bytes, extracts text pages/segments, chunks the text,
    generates SentenceTransformer embeddings, and returns a list of processed chunks.
    """
    ext = os.path.splitext(filename.lower())[1]
    
    # 1. Parse content based on file extension
    if ext == ".pdf":
        pages = process_pdf(file_bytes, filename)
    elif ext in [".docx", ".doc"]:
        pages = process_docx(file_bytes, filename)
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        pages = process_image(file_bytes, filename)
    elif ext in [".txt", ".md", ".json", ".csv", ".xml"]:
        pages = process_text(file_bytes, filename)
    else:
        raise ValueError(f"Unsupported file type '{ext}'. Supported formats: PDF, Image, Word, Text.")
        
    # Check if we got any text at all
    total_length = sum(len(p["text"].strip()) for p in pages)
    if total_length == 0:
        raise ValueError("I couldn't reliably read the uploaded document/image. Please upload a clearer file or image.")
        
    # 2. Chunk text page-by-page
    all_chunks = []
    for page in pages:
        chunks = chunk_text(page["text"])
        for idx, chunk in enumerate(chunks):
            all_chunks.append({
                "text": chunk,
                "metadata": {
                    "source": filename,
                    "page": page["page"],
                    "source_type": "user_attachment",
                    "chunk_index": idx
                }
            })
            
    # 3. Generate embeddings
    if not all_chunks:
        return []
        
    embed_model = get_embed_model()
    chunk_texts = [c["text"] for c in all_chunks]
    
    # Generate embeddings and convert to list format
    embeddings = embed_model.encode(chunk_texts)
    embeddings = [emb.tolist() for emb in embeddings]
    
    # Combine chunks with their embeddings
    for chunk, embedding in zip(all_chunks, embeddings):
        chunk["embedding"] = embedding
        
    return all_chunks
