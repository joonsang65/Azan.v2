from langchain_google_genai import ChatGoogleGenerativeAI
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent))

from env_utils import require_gemini_api_key

api_key = require_gemini_api_key()

models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]

for model_name in models:
    try:
        llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key)
        res = llm.invoke("Hello")
        print(f"Success with {model_name}: {res.content[:20]}...")
    except Exception as e:
        print(f"Failed with {model_name}: {e}")
