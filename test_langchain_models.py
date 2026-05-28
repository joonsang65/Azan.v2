import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path("backend/.env")
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")

models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]

for model_name in models:
    try:
        llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key)
        res = llm.invoke("Hello")
        print(f"Success with {model_name}: {res.content[:20]}...")
    except Exception as e:
        print(f"Failed with {model_name}: {e}")
