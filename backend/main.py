import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

# Load RAG module
from rag import query_rag, chroma_client

# Load environment variables
load_dotenv()

app = FastAPI(
    title="RAG Drug Information Q&A Chatbot",
    description="A secure FastAPI backend for drug information retrieval using ChromaDB and Groq API",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows our React frontend (running on a different port like 5173) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domains, e.g. ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Text content of the message")

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's query about a drug")
    conversation_history: List[ChatMessage] = Field(
        default=[], 
        description="List of past messages in the conversation for continuity"
    )

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

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Core Chat Endpoint:
    1. Extracts history as standard list of dictionaries.
    2. Invokes query_rag to search document embeddings and build completion.
    3. Appends the new query and generated response to the conversation history.
    4. Returns response back to the React UI.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    
    # Format request history for rag.py consumption
    history_dicts = []
    for msg in request.conversation_history:
        # Validate roles
        if msg.role not in ["user", "assistant"]:
            raise HTTPException(status_code=400, detail="Invalid message role. Must be 'user' or 'assistant'.")
        history_dicts.append({
            "role": msg.role,
            "content": msg.content
        })
        
    try:
        # Run the query through RAG pipeline
        result = query_rag(request.message, history=history_dicts)
        
        # Build updated conversation history
        # We append the user message and the assistant message to the history
        new_history = list(request.conversation_history)
        new_history.append(ChatMessage(role="user", content=request.message))
        new_history.append(ChatMessage(role="assistant", content=result["answer"]))
        
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
            conversation_history=new_history,
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
