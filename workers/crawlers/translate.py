import os
import logging
import time
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# 로거 설정
logger = logging.getLogger("crawler.translate")

# .env 로드
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 모델 인스턴스 재사용을 위한 전역 변수
_llm_instance = None

def _get_llm():
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", 
            google_api_key=GEMINI_API_KEY,
            temperature=0
        )
    return _llm_instance

def translate_body_to_english(body_text: str, max_retries: int = 3) -> Optional[str]:
    """
    공지사항 본문을 Gemini 2.5 Flash를 통해 영어로 번역합니다.
    재시도 로직을 포함합니다.
    """
    if not body_text or not body_text.strip():
        return None
    
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is missing. Skipping translation.")
        return None
    
    for attempt in range(max_retries):
        try:
            llm = _get_llm()
            truncated_body = body_text[:10000]
            
            system_prompt = "You are a professional translator. Translate the following university notice to English. Keep the meaning accurate, formal, and preserve the original structure."
            
            messages = [
                ("system", system_prompt),
                ("human", truncated_body),
            ]
            
            # 호출 전 지연
            if attempt > 0:
                time.sleep(2 ** attempt) # 지수 백오프
            
            response = llm.invoke(messages)
            
            if response and response.content and response.content.strip():
                return response.content.strip()
            
            logger.warning(f"Attempt {attempt+1}: Gemini returned empty response for '{body_text[:20]}...'")
            
        except Exception as e:
            logger.error(f"Attempt {attempt+1}: Gemini Translation error: {e}")
            if attempt == max_retries - 1:
                return None
            time.sleep(1)
            
    return None
