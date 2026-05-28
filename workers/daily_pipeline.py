"""
daily_pipeline.py — 매일 오전 4시에 실행될 전체 공지 처리 파이프라인.

실행 순서:
  1. 크롤링 (Crawler): 최신 공지사항 수집 및 DB 저장.
  2. 가공 (Processor): Gemini API를 이용한 번역, 마감일 추출, 키워드 분류.
  3. 임베딩 (Embedder): RAG 검색을 위한 벡터 생성 및 저장.
  4. 알림 (Notifier): 구독 키워드 기반 유저 알림 발송.
"""

import logging
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# .env 로드
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "backend" / ".env")

# 각 모듈 임포트
from workers.crawler.main import main as run_crawler
from workers.crawler.db import get_session, delete_old_notices_by_deadline
from workers.crawler.processor import NoticeProcessor
from backend.app.services.embedding_service import update_missing_embeddings
from workers.alarm.keyword_match.send_notifications import main as send_notifications

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("pipeline.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DailyPipeline")

def run_pipeline():
    logger.info("=== Starting Daily Pipeline ===")

    # 0. 데이터 정리 (마감일 지난 공지 삭제)
    try:
        logger.info("[Step 0] Cleaning up old notices (deadline < today - 7 days)...")
        with get_session() as session:
            deleted_count = delete_old_notices_by_deadline(session)
            logger.info(f"[Step 0] Deleted {deleted_count} old notices.")
    except Exception as e:
        logger.error(f"[Step 0] Cleanup failed: {e}")

    # 1. 크롤링
    try:
        logger.info("[Step 1] Running Crawler...")
        run_crawler()
        logger.info("[Step 1] Crawler finished successfully.")
    except Exception as e:
        logger.error(f"[Step 1] Crawler failed: {e}")
        # 크롤링 실패해도 기존 수집된 데이터 처리를 위해 계속 진행할 수 있음

    # 2. 가공 (번역, 마감일, 키워드)
    try:
        logger.info("[Step 2] Running Notice Processor (Gemini)...")
        processor = NoticeProcessor()
        processor.process_unprocessed_notices()
        processor.close()
        logger.info("[Step 2] Notice Processor finished successfully.")
    except Exception as e:
        logger.error(f"[Step 2] Notice Processor failed: {e}")

    # 3. 임베딩 업데이트
    try:
        logger.info("[Step 3] Updating Embeddings for RAG...")
        update_missing_embeddings()
        logger.info("[Step 3] Embeddings updated successfully.")
    except Exception as e:
        logger.error(f"[Step 3] Embedding update failed: {e}")

    # 4. 알림 발송
    try:
        logger.info("[Step 4] Sending Notifications...")
        send_notifications()
        logger.info("[Step 4] Notifications sent successfully.")
    except Exception as e:
        logger.error(f"[Step 4] Notifications failed: {e}")

    logger.info("=== Daily Pipeline Completed ===")

if __name__ == "__main__":
    run_pipeline()
