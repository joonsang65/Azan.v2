"""
processor.py — Gemini API를 활용하여 공지사항의 추가 정보를 추출하고 가공하는 모듈.

주요 기능:
  1. 마감일(Deadline) 추출: 본문에서 날짜 정보를 찾아 YYYY-MM-DD 형식으로 변환.
  2. 영어 번역(Translation): 한국어 본문을 고품질 영어로 번역.
  3. 키워드 분류(Categorization): 공지 내용을 분석하여 적절한 카테고리(Visa, TOPIK 등) 지정.
  4. 처리 상태 업데이트: 작업 완료 후 is_processed 를 True로 변경.
"""

import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# 프로젝트 루트를 sys.path에 추가
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# .env 로드
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy import select
from backend.app.database import SessionLocal
from backend.app.models import Notice, Keyword
from backend.app.services.alert_service import queue_alerts_for_notice

# 로깅 설정
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("NoticeProcessor")

# Gemini 설정 (RAG 설정을 공유)
from workers.rag.src.rag.RAG_config import settings

class NoticeProcessor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GENERATION_MODEL, # centralized 설정 사용
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
            request_timeout=30, # 30초 타임아웃 추가
        )
        self.db = SessionLocal()
        self._load_keywords()

    def _load_keywords(self):
        """DB에서 키워드 목록을 불러와 매핑을 생성합니다."""
        keywords = self.db.query(Keyword).all()
        self.keyword_map = {k.keyword: k.id for k in keywords}
        self.keyword_names = list(self.keyword_map.keys())
        logger.info(f"Loaded keywords: {self.keyword_names}")

    def process_unprocessed_notices(self, limit: int = 50):
        """처리되지 않은 공지사항을 가져와 Gemini 파이프라인을 실행합니다."""
        notices = self.db.query(Notice).filter(Notice.is_processed == False).limit(limit).all()
        
        if not notices:
            logger.info("No unprocessed notices found.")
            return

        logger.info(f"Processing {len(notices)} notices...")

        for notice in notices:
            try:
                self._process_single_notice(notice)
                self.db.commit()
            except Exception as e:
                logger.error(f"Failed to process notice {notice.notice_id}: {e}")
                self.db.rollback()

    def _process_single_notice(self, notice: Notice):
        """단일 공지에 대해 번역, 마감일 추출, 키워드 분류를 수행합니다."""
        content = f"Title: {notice.title}\nBody: {notice.body or ''}"
        
        prompt = ChatPromptTemplate.from_template("""
        You are an assistant for Ajou University International Students.
        Analyze the following notice and provide:
        1. English translation of the title (concise, natural English).
        2. English Translation of the body (naturally for students).
        3. Deadline in YYYY-MM-DD format (if multiple, use the main application deadline. If none, return null).
        4. Category (Must be one of: {categories}).

        Return ONLY a JSON object with keys: "title_translation", "translation", "deadline", "category".

        Notice Content:
        {content}
        """)

        chain = prompt | self.llm
        try:
            response = chain.invoke({
                "categories": ", ".join(self.keyword_names),
                "content": content
            })
            
            # JSON 파싱
            raw_text = response.content
            
            # Ensure raw_text is a string (handle list content from newer Gemini/LangChain)
            if isinstance(raw_text, list):
                raw_text = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in raw_text])
                
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0]
            data = json.loads(raw_text.strip())

            # 정보 업데이트
            notice.title_eng = data.get("title_translation")
            notice.eng_body = data.get("translation")
            
            deadline_str = data.get("deadline")
            if deadline_str and deadline_str.lower() != "null":
                try:
                    notice.deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
                except ValueError:
                    logger.warning(f"Invalid deadline format: {deadline_str}")

            cat_name = data.get("category")
            if cat_name in self.keyword_map:
                notice.keyword_id = self.keyword_map[cat_name]
            else:
                # 기본값 (Academic 등)
                notice.keyword_id = self.keyword_map.get("Academic", 1)

            notice.is_processed = True
            
            # 알림 큐 적재 (DB 제약조건 이슈로 인해 일시적으로 주석 처리)
            # queued_count = queue_alerts_for_notice(self.db, notice.id)
            # logger.info(f"Successfully processed notice: {notice.notice_id} ({cat_name}), queued {queued_count} alerts.")
            logger.info(f"Successfully processed notice: {notice.notice_id} ({cat_name})")

        except Exception as e:
            logger.error(f"Gemini processing failed for {notice.notice_id}: {e}")
            raise e

    def close(self):
        self.db.close()

if __name__ == "__main__":
    processor = NoticeProcessor()
    try:
        processor.process_unprocessed_notices()
    finally:
        processor.close()
