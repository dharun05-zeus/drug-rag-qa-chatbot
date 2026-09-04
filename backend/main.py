import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass
import base64
import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

# Load RAG module
from rag import query_rag, chroma_client
from attachment_processor import process_attachment

# Load environment variables
load_dotenv()

app = FastAPI(
    title="RAG Drug Information Q&A Chatbot",
    description="A secure FastAPI backend for drug information retrieval using ChromaDB and Groq API",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Text content of the message")

class ChatRequest(BaseModel):
    question: str = Field(..., description="The user's query about a drug")
    role: str = Field(..., description="Target audience: 'doctor' or 'patient'")
    session_id: str = Field(..., description="Unique session ID for tracking history")

class Citation(BaseModel):
    document: str = Field(..., description="Name of the source PDF file")
    doc_id: Optional[str] = Field(None, description="Identifier of the source PDF file")
    page: int = Field(..., description="1-indexed page number in the source PDF")
    chunk_id: Optional[str] = Field(None, description="Unique chunk ID for citation highlighting")

class DebugScore(BaseModel):
    document: str = Field(..., description="Name of the source PDF file")
    page: int = Field(..., description="1-indexed page number in the source PDF")
    distance: float = Field(..., description="L2 distance of this chunk from query")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="The guardrailed LLM answer")
    citations: List[Citation] = Field(..., description="List of source file and page citations")
    conversation_history: List[ChatMessage] = Field(..., description="Updated chat history including the new turn")
    debug_scores: Optional[List[DebugScore]] = Field(default=None, description="Optional debug similarity scores")

class HighlightRect(BaseModel):
    x: float
    y: float
    width: float
    height: float

class PageImageResponse(BaseModel):
    image_base64: str
    image_width: int
    image_height: int
    highlights: List[HighlightRect]

class DocumentSource(BaseModel):
    name: str = Field(..., description="Name of the source PDF file")
    pages: int = Field(..., description="Number of unique pages indexed")

class UploadResponse(BaseModel):
    status: str = Field(..., description="Status of the upload: 'success' or 'error'")
    filename: str = Field(..., description="Name of the uploaded file")
    chunks: int = Field(..., description="Number of extracted text chunks")

# In-memory store resets on server restart. For production, replace with Redis or a lightweight persistent store.
session_histories = {}
session_attachments = {}

# Document paths mapping
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

DOC_PATHS = {
    "rinvoq_pi.pdf": os.path.join(DATA_DIR, "rinvoq_pi.pdf"),
    "hackathonol_label.pdf": os.path.join(DATA_DIR, "hackathonol_label.pdf"),
}

def resolve_pdf_path(doc_id: str) -> Optional[str]:
    if not doc_id:
        return None
    # 1. Direct dictionary lookup
    if doc_id in DOC_PATHS and os.path.exists(DOC_PATHS[doc_id]):
        return DOC_PATHS[doc_id]
    # 2. Check filename in DATA_DIR
    fname = os.path.basename(doc_id)
    candidate = os.path.join(DATA_DIR, fname)
    if os.path.exists(candidate):
        return candidate
    # 3. Case-insensitive check in DATA_DIR
    if os.path.exists(DATA_DIR):
        for f in os.listdir(DATA_DIR):
            if f.lower() == fname.lower() and f.endswith(".pdf"):
                return os.path.join(DATA_DIR, f)
    return None

def lookup_chunk_text(chunk_id: Optional[str]) -> Optional[str]:
    if not chunk_id:
        return None
    try:
        collection = chroma_client.get_collection("drug_info")
        data = collection.get(ids=[chunk_id], include=["documents"])
        if data and data.get("documents") and len(data["documents"]) > 0:
            return data["documents"][0]
    except Exception as e:
        print(f"Error looking up chunk in ChromaDB: {e}")
        
    for sid, chunks in session_attachments.items():
        for ch in chunks:
            if ch.get("metadata", {}).get("chunk_id") == chunk_id:
                return ch.get("text")
    return None

# --- API Endpoints ---

@app.get("/page-image", response_model=PageImageResponse)
def get_page_image_endpoint(
    doc_id: str = Query(..., description="Document identifier or filename"),
    page: int = Query(..., description="1-indexed target page number"),
    chunk_id: Optional[str] = Query(None, description="Optional chunk ID to highlight")
):
    """
    Renders a specific page of a PDF document as a 150 DPI base64 PNG,
    and returns pixel-scaled highlight bounding boxes for the referenced chunk text.
    """
    filepath = resolve_pdf_path(doc_id)
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
        
    try:
        doc = fitz.open(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open PDF document: {str(e)}")
        
    if page < 1 or page > len(doc):
        num_pages = len(doc)
        doc.close()
        raise HTTPException(status_code=404, detail=f"Page {page} out of range (document has {num_pages} pages).")
        
    target_page = doc[page - 1]
    
    # Text search strategy for highlights
    rects = []
    chunk_text = lookup_chunk_text(chunk_id)
    
    if chunk_text:
        # a. Exact match first
        rects = target_page.search_for(chunk_text)
        # b. Word-prefix fallback (~8-10 words)
        if not rects:
            prefix_words = " ".join(chunk_text.split()[:10])
            if prefix_words:
                rects = target_page.search_for(prefix_words)
        # c. Fallback to empty highlight list if still no match
        if not rects:
            rects = []
            
    # Render page to pixmap at fixed 150 DPI without drawing on it
    dpi = 150
    pix = target_page.get_pixmap(dpi=dpi)
    png_bytes = pix.tobytes("png")
    image_base64 = base64.b64encode(png_bytes).decode("utf-8")
    
    # Scale from 72 pt/inch to 150 DPI
    scale = dpi / 72.0
    highlights = []
    for r in rects:
        highlights.append(HighlightRect(
            x=float(r.x0 * scale),
            y=float(r.y0 * scale),
            width=float((r.x1 - r.x0) * scale),
            height=float((r.y1 - r.y0) * scale)
        ))
        
    doc.close()
    
    return PageImageResponse(
        image_base64=image_base64,
        image_width=pix.width,
        image_height=pix.height,
        highlights=highlights
    )

@app.get("/documents", response_model=List[DocumentSource])
def get_documents_endpoint():
    """
    Retrieves unique list of document filenames and their page counts from ChromaDB.
    """
    try:
        collection = chroma_client.get_collection("drug_info")
        data = collection.get(include=["metadatas"])
        
        if not data or not data["metadatas"]:
            return []
            
        doc_pages = {}
        for meta in data["metadatas"]:
            source = meta.get("source", "Unknown")
            page = meta.get("page", 0)
            if source not in doc_pages:
                doc_pages[source] = set()
            doc_pages[source].add(page)
            
        return [
            DocumentSource(name=doc, pages=len(pages))
            for doc, pages in doc_pages.items()
        ]
    except Exception as e:
        print(f"Error fetching documents list: {e}")
        return []

@app.get("/health")
def health_endpoint():
    """
    Health check endpoint for testing connection and basic status.
    """
    return {
        "status": "healthy",
        "description": "RAG Drug Information API is up and running.",
        "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    }

@app.post("/upload", response_model=UploadResponse)
async def upload_endpoint(
    session_id: str = Form(..., description="Unique session ID to associate the attachment with"),
    file: UploadFile = File(..., description="The file attachment to process")
):
    """
    Upload Attachment Endpoint:
    1. Extracts text from PDF, DOCX, Images (OCR), or Text.
    2. Chunk and embed using SentenceTransformer.
    3. Cache the chunks inside session_attachments[session_id].
    """
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="session_id cannot be empty.")
        
    file_bytes = await file.read()
    try:
        chunks = process_attachment(file_bytes, file.filename)
        
        if session_id not in session_attachments:
            session_attachments[session_id] = []
            
        # Add chunks to session cache
        session_attachments[session_id].extend(chunks)
        
        return UploadResponse(
            status="success",
            filename=file.filename,
            chunks=len(chunks)
        )
    except ValueError as ve:
        import traceback
        print(f"\n[ERROR] ValueError during upload of file '{file.filename}': {ve}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        print(f"\n[ERROR] Unexpected error during upload of file '{file.filename}': {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal processing error: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Core Chat Endpoint:
    1. Fetches history for the given session_id from backend memory.
    2. Runs the query through RAG pipeline using the requested role (doctor/patient).
    3. Appends the new Q&A turn to the session history cache.
    4. Returns updated history, citations, and debug scores back to the React UI.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if request.role not in ["doctor", "patient"]:
        raise HTTPException(status_code=400, detail="Role must be 'doctor' or 'patient'.")
    
    # Retrieve or initialize history for this session_id
    if request.session_id not in session_histories:
        session_histories[request.session_id] = []
        
    history = session_histories[request.session_id]
    
    # Format history for rag.py consumption
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in history]
        
    try:
        # Retrieve attachments for this session
        attachments = session_attachments.get(request.session_id, [])
        # Run the query through RAG pipeline
        result = query_rag(request.question, role=request.role, history=history_dicts, attachments=attachments)
        
        # Build updated conversation history in session store
        user_message = ChatMessage(role="user", content=request.question)
        assistant_message = ChatMessage(role="assistant", content=result["answer"])
        history.append(user_message)
        history.append(assistant_message)
        session_histories[request.session_id] = history
        
        # Build response citations with doc_id and chunk_id
        citations = []
        for cite in result["citations"]:
            citations.append(Citation(
                document=cite["document"],
                doc_id=cite.get("doc_id", cite["document"]),
                page=cite["page"],
                chunk_id=cite.get("chunk_id")
            ))
            
        # Build response debug scores
        debug_scores = []
        if "debug_scores" in result:
            for score in result["debug_scores"]:
                debug_scores.append(DebugScore(
                    document=score["document"],
                    page=score["page"],
                    distance=score["distance"]
                ))
            
        return ChatResponse(
            answer=result["answer"],
            citations=citations,
            conversation_history=history,
            debug_scores=debug_scores
        )
        
    except Exception as e:
        print(f"Error handling chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.delete("/session/{session_id}")
def delete_session_endpoint(session_id: str):
    """
    Deletes the session history and session attachments associated with the given session_id.
    """
    if session_id in session_histories:
        del session_histories[session_id]
    if session_id in session_attachments:
        del session_attachments[session_id]
    return {"status": "success", "message": f"Session {session_id} deleted successfully."}

if __name__ == "__main__":
    import uvicorn
    # Start the server locally
    # To run: python main.py
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
