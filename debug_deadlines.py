import os
from dotenv import load_dotenv
from pathlib import Path
import sys

# Load env BEFORE importing any backend modules
env_path = Path("backend/.env")
load_dotenv(dotenv_path=env_path)

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.append(str(PROJECT_ROOT))

from backend.app.database import SessionLocal
from backend.app.models import Notice

def analyze_deadlines():
    db = SessionLocal()
    try:
        # Check notices that were processed but have NULL deadline
        processed_no_deadline = db.query(Notice).filter(Notice.is_processed == True, Notice.deadline.is_(None)).limit(5).all()
        print("--- Processed Notices with NULL Deadline ---")
        for n in processed_no_deadline:
            print(f"ID: {n.notice_id}")
            print(f"Title: {n.title}")
            print(f"Body snippet: {n.body[:200] if n.body else ''}...")
            print("-" * 20)

        # Check notices with successfully parsed deadline
        has_deadline = db.query(Notice).filter(Notice.deadline.is_not(None)).limit(5).all()
        print("\n--- Notices with Parsed Deadline ---")
        for n in has_deadline:
            print(f"ID: {n.notice_id} | Deadline: {n.deadline}")
            print(f"Title: {n.title}")
            print("-" * 20)
            
    finally:
        db.close()

if __name__ == "__main__":
    analyze_deadlines()
