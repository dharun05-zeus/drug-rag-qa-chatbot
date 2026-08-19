import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

groq_api_key = os.environ.get("GROQ_API_KEY")

if not groq_api_key or "YOUR_GROQ_API_KEY" in groq_api_key:
    print("Error: Groq API Key is not set or configured incorrectly in .env")
    exit(1)

try:
    print(f"Connecting to Groq with API key: {groq_api_key[:10]}...")
    client = Groq(api_key=groq_api_key)
    
    # List available models
    models_list = client.models.list()
    
    print("\n--- Available Groq Models ---")
    for model in models_list.data:
        print(f" - Model ID: {model.id} (Owner: {model.owned_by})")
    print("-----------------------------\n")
    
except Exception as e:
    print(f"Error querying Groq API: {e}")
