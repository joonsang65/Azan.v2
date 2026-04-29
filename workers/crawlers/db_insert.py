from __future__ import annotations

import os
import json
import time
from pathlib import Path
from typing import Any, List
from datetime import datetime

import pandas as pd
import psycopg
from dotenv import load_dotenv

# Import Embedder for RAG integration
try:
    from workers.rag.src.rag.embedder import Embedder
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from workers.rag.src.rag.embedder import Embedder

from .models import TopikScheduleRow


BASE_DIR = Path(__file__).resolve().parent.parent  # .../crawl
CSV_PATH = BASE_DIR / "data" / "notices.csv"

def _generate_embeddings_for_rows(rows: list[dict[str, Any]]) -> None:
    """Generate embeddings for each row in-place."""
    try:
        embedder_obj = Embedder().get_embedding_function()
        print(f"Generating embeddings for {len(rows)} notices...")
        for i, r in enumerate(rows):
            content = f"제목: {r.get('title', '')}\n내용: {r.get('body', '')}"
            try:
                # Generate embedding (1536 dim)
                vector = embedder_obj.embed_query(text=content, output_dimensionality=1536)
                r["embedding"] = vector
                if (i + 1) % 10 == 0:
                    print(f"Embedded {i+1}/{len(rows)}...")
                    time.sleep(1) # Avoid rate limits
            except Exception as e:
                print(f"Embedding failed for row {i}: {e}")
                r["embedding"] = None
    except Exception as e:
        print(f"Embedder initialization failed: {e}")
        for r in rows:
            r["embedding"] = None


def _to_timestamptz(series: pd.Series) -> pd.Series:
    s = series.fillna("").astype(str).str.strip()
    s = s.replace({"": None, "nan": None, "NaT": None})
    dt = pd.to_datetime(s, errors="coerce")
    dt = dt.where(dt.notna(), None)
    return dt


def main() -> None:
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is missing.")

    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")

    # Mapping to existing columns
    df["notice_id"] = df["source_notice_id"].fillna(df["dedupe_hash"]).astype(str)
    df["url"] = df["source_url"]
    df["hash"] = df["dedupe_hash"]
    df["published_at"] = _to_timestamptz(df["published_at"])
    df["deadline"] = _to_timestamptz(df["deadline_at"]).dt.date
    df["preview"] = df["body"].fillna("").astype(str).str[:200]
    df["keyword_id"] = 13  # Default Academic keyword

    rows_data = df.to_dict('records')
    _generate_embeddings_for_rows(rows_data)

    insert_sql = """
    INSERT INTO notices (
      notice_id, keyword_id, title, preview, body, hash, deadline, url, published_at, embedding
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (notice_id) DO UPDATE SET
      title        = EXCLUDED.title,
      preview      = EXCLUDED.preview,
      body         = EXCLUDED.body,
      hash         = EXCLUDED.hash,
      deadline     = EXCLUDED.deadline,
      url          = EXCLUDED.url,
      published_at = EXCLUDED.published_at,
      embedding    = EXCLUDED.embedding;
    """

    rows: list[tuple[Any, ...]] = []
    for r in rows_data:
        rows.append((
            r["notice_id"], r["keyword_id"], r["title"], r["preview"], r.get("body"),
            r["hash"], r["deadline"], r["url"], r["published_at"], r.get("embedding")
        ))

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.executemany(insert_sql, rows)
        conn.commit()

    print(f"DB INSERT/UPSERT OK: {len(rows)} rows")

def upsert_notices(rows: list[dict[str, Any]]) -> tuple[int, int]:
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is missing.")

    if not rows:
        return 0, 0

    # Generate embeddings
    _generate_embeddings_for_rows(rows)

    # Map incoming crawler rows to baseline schema
    import uuid
    insert_sql = """
    INSERT INTO notices (
      id, notice_id, keyword_id, title, preview, body, eng_body, hash, deadline, url, published_at, embedding
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (notice_id) DO UPDATE SET
      title        = EXCLUDED.title,
      preview      = EXCLUDED.preview,
      body         = EXCLUDED.body,
      eng_body     = EXCLUDED.eng_body,
      hash         = EXCLUDED.hash,
      deadline     = EXCLUDED.deadline,
      url          = EXCLUDED.url,
      published_at = EXCLUDED.published_at,
      embedding    = EXCLUDED.embedding;
    """

    payloads: list[tuple[Any, ...]] = []
    for r in rows:
        # Determine published_at
        pub_at = r.get("published_at")
        if isinstance(pub_at, str):
            try:
                pub_at = datetime.fromisoformat(pub_at)
            except:
                pub_at = datetime.now()
        
        # Determine deadline (Date only)
        deadline_val = r.get("deadline_at")
        if isinstance(deadline_val, str):
            try:
                deadline_val = datetime.fromisoformat(deadline_val).date()
            except:
                deadline_val = None

        payloads.append((
            str(uuid.uuid4()), # Generate new UUID for id
            str(r.get("source_notice_id") or r.get("dedupe_hash")),
            13, # keyword_id
            r.get("title"),
            (r.get("body") or "")[:200], # preview
            r.get("body"),
            r.get("eng_body"),
            r.get("dedupe_hash"),
            deadline_val,
            r.get("source_url"),
            pub_at or datetime.now(),
            r.get("embedding")
        ))

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.executemany(insert_sql, payloads)
        conn.commit()

    return len(rows), len(rows)

def upsert_topik_schedules(rows: List[Any]) -> None:
    # TOPIK schedules table seems to match, keep as is or minimal fix if needed
    if not rows: return
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    
    insert_sql = """
    INSERT INTO topik_schedules (
        category, round_label, apply_start, apply_end, apply_status,
        exam_date_kr, exam_date_global, exam_date_asia, exam_level,
        result_announce_at, notice_link, source_url, raw_json
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (category, round_label) DO UPDATE SET updated_at = NOW();
    """

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            for r in rows:
                # Handle r being a dict or object
                cat = r.get('category') if isinstance(r, dict) else getattr(r, 'category', None)
                rnd = r.get('round') if isinstance(r, dict) else getattr(r, 'round_label', None)
                cur.execute(insert_sql, (
                    cat, rnd, None, None, None, None, None, None, None, None, None, None, json.dumps(r if isinstance(r, dict) else r.__dict__)
                ))
        conn.commit()

if __name__ == "__main__":
    main()
