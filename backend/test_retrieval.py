import os
from sentence_transformers import SentenceTransformer
import chromadb

# Setup paths relative to script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(SCRIPT_DIR, "chroma_db")

print("Loading SentenceTransformer model ('all-MiniLM-L6-v2')...")
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

print(f"Connecting to ChromaDB at: {CHROMA_DIR}")
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

try:
    collection = chroma_client.get_collection("drug_info")
    print("Successfully connected to 'drug_info' collection.\n")
except Exception as e:
    print(f"Error: Could not retrieve 'drug_info' collection. Have you run ingest.py? Details: {e}")
    exit(1)

test_queries = [
    ("QUESTION 1 (In-document search)", "What are the common side effects listed for this drug?"),
    ("QUESTION 2 (Unsupported medical advice search)", "Can I double the dosage if I missed my pill?"),
    ("QUESTION 3 (Out-of-scope search)", "How do you bake a chocolate chip cookie?")
]

for name, query in test_queries:
    print(f"=== Running Retrieval for: {name} ===")
    print(f"Query text: '{query}'")
    
    # Generate embedding
    query_emb = embed_model.encode(query).tolist()
    
    # Query Chroma
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=4
    )
    
    # Inspect matches
    if not results or not results["documents"] or not results["documents"][0]:
        print("No matches found in database.")
    else:
        for idx, (doc, meta, dist) in enumerate(zip(results["documents"][0], results["metadatas"][0], results["distances"][0])):
            print(f"  Rank {idx+1} | Source: {meta.get('source')} (Page {meta.get('page')}) | L2 Distance: {dist:.4f}")
            # print a tiny snippet of the chunk
            snippet = doc[:80] + "..." if len(doc) > 80 else doc
            print(f"    Snippet: \"{snippet}\"")
            
    print("=" * 50 + "\n")
