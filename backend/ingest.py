import os
import ssl
# Bypass SSL verification to avoid CERTIFICATE_VERIFY_FAILED error when downloading HuggingFace models
ssl._create_default_https_context = ssl._create_unverified_context
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["HF_HUB_DISABLE_SSL_VERIFICATION"] = "1"

import httpx
import urllib3
from huggingface_hub.utils._http import set_client_factory
import huggingface_hub.constants as constants

def custom_client_factory() -> httpx.Client:
    from huggingface_hub.utils._http import hf_request_event_hook
    return httpx.Client(
        verify=False,  # Bypass SSL verification
        event_hooks={"request": [hf_request_event_hook]},
        follow_redirects=True,
        timeout=httpx.Timeout(constants.HF_HUB_DOWNLOAD_TIMEOUT, write=60.0),
    )

set_client_factory(custom_client_factory)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

import glob
import fitz  # PyMuPDF
from sentence_transformers import SentenceTransformer
import chromadb


# 1. Setup paths relative to this script for consistency
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
CHROMA_DIR = os.path.join(SCRIPT_DIR, "chroma_db")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)

# 2. Configuration for chunking
# 1 word is roughly 1.3 tokens. A 300-word chunk is about 390 tokens.
CHUNK_SIZE_WORDS = 300
OVERLAP_WORDS = 40

def chunk_text(text, chunk_size_words=CHUNK_SIZE_WORDS, overlap_words=OVERLAP_WORDS):
    """
    Chunks a block of text based on word count with a sliding overlap.
    We chunk per-page to keep page citations exact and clean.
    """
    words = text.split()
    if not words:
        return []
    
    # If the text is shorter than chunk size, return it as a single chunk
    if len(words) <= chunk_size_words:
        return [" ".join(words)]
    
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size_words
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end >= len(words):
            break
        # Slide forward by (chunk_size - overlap)
        start += (chunk_size_words - overlap_words)
        
    return chunks

def extract_pdf_data(pdf_path):
    """
    Extracts text page by page from a PDF file.
    Returns a list of dictionaries with text, page number, and source filename.
    """
    doc_name = os.path.basename(pdf_path)
    pages_data = []
    
    try:
        # Open PDF using PyMuPDF
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            
            # Simple cleanup: remove extra whitespaces
            clean_text = " ".join(text.split())
            if clean_text:
                # page_num is 0-indexed in code, but users expect 1-indexed pages
                pages_data.append({
                    "text": clean_text,
                    "page_number": page_num + 1,
                    "source": doc_name
                })
        doc.close()
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        
    return pages_data

def main():
    print("--- Starting PDF Ingestion Process ---")
    
    # Find all PDFs in the data directory
    pdf_pattern = os.path.join(DATA_DIR, "*.pdf")
    pdf_files = glob.glob(pdf_pattern)
    
    if not pdf_files:
        print(f"No PDF files found in {DATA_DIR}.")
        print("Please place your drug PDF documents in that folder and run this script again.")
        return
    
    print(f"Found {len(pdf_files)} PDF files to process.")
    
    # 3. Extract text and create document chunks
    all_chunks = []
    for pdf_path in pdf_files:
        print(f"Processing: {os.path.basename(pdf_path)}...")
        pages_data = extract_pdf_data(pdf_path)
        
        pdf_chunks_count = 0
        for page in pages_data:
            chunks = chunk_text(page["text"])
            for idx, chunk in enumerate(chunks):
                all_chunks.append({
                    "text": chunk,
                    "metadata": {
                        "source": page["source"],
                        "page": page["page_number"],
                        "chunk_index": idx
                    }
                })
                pdf_chunks_count += 1
        print(f"-> Extracted {pdf_chunks_count} chunks from {os.path.basename(pdf_path)}")

    if not all_chunks:
        print("No readable text chunks extracted from the PDFs. Exiting.")
        return

    print(f"Total chunks extracted: {len(all_chunks)}")
    
    # 4. Initialize Local Embeddings Model
    # sentence-transformers/all-MiniLM-L6-v2 runs completely locally on CPU or GPU
    print("Loading SentenceTransformer model ('all-MiniLM-L6-v2')...")
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # Extract chunk texts and compute embeddings
    chunk_texts = [c["text"] for c in all_chunks]
    print(f"Generating embeddings for {len(chunk_texts)} chunks...")
    embeddings = embed_model.encode(chunk_texts, show_progress_bar=True)
    
    # Convert embeddings from numpy arrays to python lists (required by ChromaDB)
    embeddings = [emb.tolist() for emb in embeddings]
    
    # 5. Initialize & Populate ChromaDB
    print(f"Connecting to ChromaDB at: {CHROMA_DIR}")
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Safe re-runnable collection creation: Clear existing collection first
    collection_name = "drug_info"
    try:
        chroma_client.delete_collection(collection_name)
        print(f"Cleared existing '{collection_name}' collection for a fresh start.")
    except Exception:
        # Collection didn't exist yet, which is fine
        pass
        
    print(f"Creating new collection '{collection_name}'...")
    collection = chroma_client.create_collection(collection_name)
    
    # Prepare data for batch insert
    ids = [f"{c['metadata']['source']}_p{c['metadata']['page']}_c{c['metadata']['chunk_index']}" for c in all_chunks]
    metadatas = [c["metadata"] for c in all_chunks]
    
    # Write to ChromaDB
    # Chroma DB allows inserting documents, embeddings, metadatas, and ids
    print(f"Writing {len(all_chunks)} chunks to ChromaDB...")
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunk_texts,
        metadatas=metadatas
    )
    
    print("--- Ingestion Complete! ---")
    print(f"Successfully indexed {len(all_chunks)} chunks from {len(pdf_files)} files in ChromaDB.")

if __name__ == "__main__":
    main()
