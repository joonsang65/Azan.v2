import os
import sys
from pathlib import Path
import logging

# 프로젝트 루트를 경로에 추가
sys.path.append(str(Path(__file__).resolve().parents[2]))

from backend.app.database import SessionLocal
from backend.app.models import Notice
from workers.crawlers.translate import translate_body_to_english

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fill_eng_body")

def main():
    db = SessionLocal()
    try:
        # eng_body가 없고 body는 있는 공지사항 검색
        targets = db.query(Notice).filter(
            Notice.eng_body == None,
            Notice.body != None
        ).all()
        
        logger.info(f"Found {len(targets)} notices to translate.")
        
        count = 0
        for notice in targets:
            logger.info(f"[{count+1}/{len(targets)}] Translating: {notice.title[:30]}...")
            
            # Gemini 2.5 Flash를 통한 번역
            translated = translate_body_to_english(notice.body)
            
            if translated:
                notice.eng_body = translated
                db.commit() # 하나씩 커밋하여 유실 방지
                logger.info(f"Successfully updated: {notice.title[:30]}")
                count += 1
            else:
                logger.warning(f"Failed to translate: {notice.title[:30]}")
        
        logger.info(f"Migration completed. Total {count} notices updated.")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
