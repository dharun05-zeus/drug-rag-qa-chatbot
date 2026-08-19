# Clinical Q&A RAG Chatbot Engine

An advanced, zero-hallucination Retrieval-Augmented Generation (RAG) prototype built to answer clinical questions about drug prescribing documentation. The system features a two-panel React dashboard, dynamic document indexing, page-level citations, similarity score debugging, and robust safety guardrails.

---

## 📂 Repository Structure

*   `backend/`: FastAPI API server, ChromaDB vector store, SentenceTransformers embedding module, and PDF ingestion scripts.
*   `frontend/`: Modular React components styled with plain custom CSS (no external framework dependency).

---

## 🛠️ Teammate Quickstart Guide

Follow these steps to set up and run the project locally after cloning the repository.

### Phase 1: Backend Setup & Ingestion

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

2.  **Configure environment variables**:
    Copy the environment template file:
    ```bash
    cp .env.example .env
    ```
    Open the newly created `.env` file and replace `YOUR_GROQ_API_KEY_HERE` with your personal Groq API key:
    ```env
    GROQ_API_KEY=gsk_xxx...
    GROQ_MODEL=qwen/qwen3.6-27b
    ```

3.  **Install Python dependencies**:
    *(We recommend using a virtual environment like `venv`)*
    ```bash
    pip install -r requirements.txt
    ```

4.  **Load Source drug PDFs**:
    Place one or more prescribing information PDFs (for example, `rinvoq_pi.pdf`) inside the `backend/data/` folder.
    *   *If you do not have a PDF on hand, run `python create_sample_pdf.py` or `python create_rinvoq_pdf.py` to generate mock prescribing sheets.*

5.  **Run Ingestion**:
    Parse the PDFs, compute local semantic embeddings, and build the vector search index:
    ```bash
    python ingest.py
    ```

6.  **Start the FastAPI Server**:
    Launch the API server locally:
    ```bash
    python -m uvicorn main:app --reload
    ```
    Verify it is running by visiting: `http://localhost:8000/health`.

---

### Phase 2: Frontend Dashboard Launch

Open a **new separate terminal window** and run the following:

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install node modules**:
    ```bash
    npm install
    ```

3.  **Start Vite dev server**:
    ```bash
    npm run dev
    ```

4.  **Access the Dashboard**:
    Open **`http://localhost:5173`** in your browser. The connection badge in the top-right corner should show a green "Server Online" status.

---

## 🧪 Testing the Pipeline & Guardrails

To verify the dual-tier safety checks and vector calibration, try asking these questions:

1.  **Factual retrieval**: *"What is the recommended dosage of RINVOQ for rheumatoid arthritis?"*
    *   *Expected*: Returns the answer citing page 8, and shows only page 8 in the sources badge.
2.  **Medical advice refusal**: *"Can I double my dose if I miss a day?"*
    *   *Expected*: The vector DB retrieves relevant segments, but the LLM triggers a Tier-2 prompt guardrail refusal warning you not to double doses, displaying a disclaimer and styling the bubble in warning amber.
3.  **Out-of-scope block**: *"How do you bake a chocolate chip cookie?"*
    *   *Expected*: The vector distance exceeds `1.25` (e.g. `1.94`). The query is intercepted at the database level (Tier-1) and immediately refused without calling the LLM.
4.  **Retrieval details check**: Click the **"Show Retrieval Details"** link under any bot bubble to inspect the exact L2 similarity distance metrics returned by ChromaDB.
