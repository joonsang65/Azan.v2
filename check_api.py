import os
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("backend/.env"))
api_key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
res = requests.get(url)
print(res.json())
