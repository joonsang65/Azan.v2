"""
slack_main.py — Slack 공지 크롤러 단독 실행 진입점.

프로젝트 루트 또는 임의의 디렉터리에서 스크립트로 실행할 수 있다:
  python workers/crawler/slack_main.py

또는 workers/ 패키지 내에서 모듈로 실행:
  cd workers/ && python -m crawler.slack_main

필요한 환경변수:
  SLACK_BOT_TOKEN  — Slack Bot OAuth 토큰 (xoxb-...)
  DATABASE_URL     — Neon DB 연결 문자열 (postgresql://...)
  SLACK_CHANNEL_ID — 크롤할 Slack 채널 ID (예: C0XXXXXXX)

종료 코드:
  0 — 정상 완료
  1 — 환경변수 누락 또는 예외 발생 (GitHub Actions 가 실패로 표시)
"""

from __future__ import annotations

import sys
from pathlib import Path

# 스크립트로 직접 실행할 때 workers/ 패키지를 임포트 가능하게 sys.path 에 추가한다.
# __file__ = workers/crawler/slack_main.py
# parents[0] = workers/crawler/
# parents[1] = workers/
_WORKERS_DIR = Path(__file__).resolve().parents[1]
if str(_WORKERS_DIR) not in sys.path:
    sys.path.insert(0, str(_WORKERS_DIR))

import logging
import os

# python-dotenv 는 선택적 의존성 — 로컬 개발 편의를 위해 존재 시 로드한다
try:
    from dotenv import load_dotenv
    load_dotenv(_WORKERS_DIR / ".env")
    load_dotenv(_WORKERS_DIR.parent / ".env")
except ImportError:
    pass

from crawler import db
from crawler.slack_scraper import fetch_notices

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_REQUIRED_VARS = ("SLACK_BOT_TOKEN", "DATABASE_URL", "SLACK_CHANNEL_ID")


def main() -> None:
    """
    환경변수를 검증하고 Slack 공지를 크롤하여 Neon DB에 저장한다.

    Input:  없음 (환경변수에서 설정을 읽음)
    Output: 없음 (부수 효과: DB 행 삽입, stdout 요약 출력)
    Raises: SystemExit(1) — 환경변수 누락 또는 처리 중 예외 발생
    """
    missing = [v for v in _REQUIRED_VARS if not os.environ.get(v)]
    if missing:
        print(
            f"ERROR: 필수 환경변수가 설정되지 않음 — {', '.join(missing)}",
            file=sys.stderr,
        )
        sys.exit(1)

    channel_id: str = os.environ["SLACK_CHANNEL_ID"]

    try:
        logger.info("Slack 채널 %s 크롤 시작 (lookback=25h)", channel_id)
        notices = fetch_notices(channel_id, lookback_hours=25)
        logger.info("메시지 %d건 수집 완료", len(notices))

        inserted = 0
        skipped = 0

        conn = db.get_connection()
        try:
            for notice in notices:
                result = db.upsert_notice(conn, notice)
                if result == "inserted":
                    inserted += 1
                    logger.info(
                        "저장: %s | %s",
                        notice["notice_id"],
                        notice["title"][:60],
                    )
                else:
                    skipped += 1
        finally:
            conn.close()

    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        logger.exception("Slack 크롤러 실행 중 예외 발생")
        sys.exit(1)

    print(f"완료: {inserted}개 저장, {skipped}개 스킵")


if __name__ == "__main__":
    main()
