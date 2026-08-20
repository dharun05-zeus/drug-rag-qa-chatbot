import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
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
    page: int = Field(..., description="1-indexed page number in the source PDF")

class DebugScore(BaseModel):
    document: str = Field(..., description="Name of the source PDF file")
    page: int = Field(..., description="1-indexed page number in the source PDF")
    distance: float = Field(..., description="L2 distance of this chunk from query")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="The guardrailed LLM answer")
    citations: List[Citation] = Field(..., description="List of source file and page citations")
    conversation_history: List[ChatMessage] = Field(..., description="Updated chat history including the new turn")
    debug_scores: Optional[List[DebugScore]] = Field(default=None, description="Optional debug similarity scores")

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

# --- API Endpoints ---

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
        
        # Build response citations
        citations = []
        for cite in result["citations"]:
            citations.append(Citation(
                document=cite["document"],
                page=cite["page"]
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

if __name__ == "__main__":
    import uvicorn
    # Start the server locally
    # To run: python main.py
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
