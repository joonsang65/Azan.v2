from pathlib import Path
from datetime import datetime, timezone, timedelta

# KST timezone
KST = timezone(timedelta(hours=9))

LIST_URL = "https://www.ajou.ac.kr/oia/notice/notice.do"

# 🔥 핵심 수정
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LOG_DIR = BASE_DIR / "logs"

CSV_PATH = DATA_DIR / "notices.csv"
LOG_PATH = LOG_DIR / "crawl.log"


def now_kst_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")