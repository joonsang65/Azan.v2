import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path("backend/.env")
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

print("Listing models...")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)
