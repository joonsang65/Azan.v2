import os
from dotenv import load_dotenv
from pathlib import Path
import sys

env_path = Path("backend/.env")
load_dotenv(dotenv_path=env_path)

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.append(str(PROJECT_ROOT))

from backend.app.database import SessionLocal
from backend.app.models import Notice

def check_one(notice_id):
    db = SessionLocal()
    try:
        n = db.query(Notice).filter(Notice.notice_id == notice_id).first()
        if n:
            print(f"ID: {n.notice_id}")
            print(f"Published At: {n.published_at}")
            print(f"Deadline: {n.deadline}")
            print(f"Is Processed: {n.is_processed}")
            print(f"Title: {n.title}")
            print(f"Body: {n.body[:300]}...")
        else:
            print("Not found")
    finally:
        db.close()

if __name__ == "__main__":
    check_one("1779181066275559")
