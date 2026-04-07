# apps\rag\src\rag\embedder.py

import logging
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from .RAG_config import settings

logger = logging.getLogger("RAG")

class Embedder:
    def __init__(self):
        self._model_name = settings.EMBEDDING_MODEL
        self._api_key = settings.GEMINI_API_KEY
        
        if not self._api_key:
            logger.error("GEMINI_API_KEY is missing in settings.")
            raise ValueError("GEMINI_API_KEY is not set.")

    def get_embedding_function(self):
        """LangChain 호환 임베딩 객체 반환"""
        return GoogleGenerativeAIEmbeddings(
            model=self._model_name,
            google_api_key=self._api_key
        )