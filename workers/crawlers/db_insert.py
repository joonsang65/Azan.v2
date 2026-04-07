from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any, List

import pandas as pd
import psycopg
from dotenv import load_dotenv

from .models import TopikScheduleRow


BASE_DIR = Path(__file__).resolve().parent.parent  # .../crawl
CSV_PATH = BASE_DIR / "data" / "notices.csv"


def _to_timestamptz(series: pd.Series) -> pd.Series:
    """
    '2026-02-12' 같은 날짜 문자열을 TIMESTAMPTZ로 넣기 좋게 변환.
    - 값이 비면 None
    - 날짜만 있으면 00:00:00 기준
    - Neon은 UTC로 보일 수 있음(정상)
    """
    s = series.fillna("").astype(str).str.strip()
    s = s.replace({"": None, "nan": None, "NaT": None})
    dt = pd.to_datetime(s, errors="coerce")

    # dt가 NaT면 None
    dt = dt.where(dt.notna(), None)
    return dt


def main() -> None:
    load_dotenv()  # 현재 작업 디렉터리의 .env 읽음
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is missing. (.env에 DATABASE_URL=postgresql://... 넣었는지 확인)")

    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")

    required = ["source_url", "title", "body", "dedupe_hash"]
    for col in required:
        if col not in df.columns:
            raise RuntimeError(f"CSV column missing: {col}. 현재 CSV 컬럼: {list(df.columns)}")

    if "published_at" in df.columns:
        df["published_at"] = _to_timestamptz(df["published_at"])
    else:
        df["published_at"] = None

    if "deadline_at" in df.columns:
        df["deadline_at"] = _to_timestamptz(df["deadline_at"])
    else:
        df["deadline_at"] = None

    if "source_notice_id" not in df.columns:
        df["source_notice_id"] = None

    df["body"] = df["body"].fillna("").astype(str)
    df["source_type"] = "department_site"
    df["source_name"] = "ajou_oia"

    rows: list[tuple[Any, ...]] = []
    for _, r in df.iterrows():
        rows.append(
            (
                r["source_type"],
                r["source_name"],
                r.get("source_url"),
                r.get("source_notice_id"),
                r.get("title"),
                r.get("body"),
                r.get("published_at"),
                r.get("deadline_at"),
                r.get("dedupe_hash"),
            )
        )

    insert_sql = """
    INSERT INTO notices (
      source_type, source_name, source_url, source_notice_id,
      title, body, published_at, deadline_at, dedupe_hash
    )
    VALUES (
      %s, %s, %s, %s,
      %s, %s, %s, %s, %s
    )
    ON CONFLICT (dedupe_hash) DO UPDATE SET
      source_type      = EXCLUDED.source_type,
      source_name      = EXCLUDED.source_name,
      source_url       = EXCLUDED.source_url,
      source_notice_id = EXCLUDED.source_notice_id,
      title            = EXCLUDED.title,
      body             = EXCLUDED.body,
      published_at     = EXCLUDED.published_at,
      deadline_at      = EXCLUDED.deadline_at,
      updated_at       = NOW();
    """

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.executemany(insert_sql, rows)
        conn.commit()

    print(f"DB INSERT/UPSERT OK: {len(rows)} rows (dedupe_hash 기준)")

def upsert_notices(rows: list[dict[str, Any]]) -> tuple[int, int]:
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL is missing. (.env에 DATABASE_URL=postgresql://... 넣었는지 확인)")

    print("NOTICES DATABASE_URL =", db_url)
    print("NOTICE ROW COUNT =", len(rows))

    if not rows:
        return 0, 0

    insert_sql = """
    INSERT INTO notices (
      source_type, source_name, source_url, source_notice_id,
      title, body, published_at, deadline_at, dedupe_hash,
      is_processed, is_embedded, is_deleted,
      created_at, updated_at,
      published_at_raw, published_at_inferred, published_at_final, published_at_confidence,
      notice_tag, category_final, category_reason, deadline_text, content_hash
    )
    VALUES (
      %s, %s, %s, %s,
      %s, %s, %s, %s, %s,
      %s, %s, %s,
      %s, %s,
      %s, %s, %s, %s,
      %s, %s, %s, %s, %s
    )
    ON CONFLICT (dedupe_hash) DO UPDATE SET
      source_type              = EXCLUDED.source_type,
      source_name              = EXCLUDED.source_name,
      source_url               = EXCLUDED.source_url,
      source_notice_id         = EXCLUDED.source_notice_id,
      title                    = EXCLUDED.title,
      body                     = EXCLUDED.body,
      published_at             = EXCLUDED.published_at,
      deadline_at              = EXCLUDED.deadline_at,
      is_processed             = EXCLUDED.is_processed,
      is_embedded              = EXCLUDED.is_embedded,
      is_deleted               = EXCLUDED.is_deleted,
      updated_at               = NOW(),
      published_at_raw         = EXCLUDED.published_at_raw,
      published_at_inferred    = EXCLUDED.published_at_inferred,
      published_at_final       = EXCLUDED.published_at_final,
      published_at_confidence  = EXCLUDED.published_at_confidence,
      notice_tag               = EXCLUDED.notice_tag,
      category_final           = EXCLUDED.category_final,
      category_reason          = EXCLUDED.category_reason,
      deadline_text            = EXCLUDED.deadline_text,
      content_hash             = EXCLUDED.content_hash;
    """

    payloads: list[tuple[Any, ...]] = []
    for r in rows:
        payloads.append(
            (
                r.get("source_type"),
                r.get("source_name"),
                r.get("source_url"),
                r.get("source_notice_id"),
                r.get("title"),
                r.get("body"),
                r.get("published_at"),
                r.get("deadline_at"),
                r.get("dedupe_hash"),
                r.get("is_processed"),
                r.get("is_embedded"),
                r.get("is_deleted"),
                r.get("created_at"),
                r.get("updated_at"),
                r.get("published_at_raw"),
                r.get("published_at_inferred"),
                r.get("published_at_final"),
                r.get("published_at_confidence"),
                r.get("notice_tag"),
                r.get("category_final"),
                r.get("category_reason"),
                r.get("deadline_text"),
                r.get("content_hash"),
            )
        )

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.executemany(insert_sql, payloads)
        conn.commit()

    return len(rows), len(rows)

def upsert_topik_schedules(rows: List[TopikScheduleRow]) -> None:
    if not rows:
        print("No TOPIK rows to insert")
        return

    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL missing")

    print("TOPIK DATABASE_URL =", db_url)
    print("TOPIK ROW COUNT =", len(rows))
    insert_sql = """
    INSERT INTO topik_schedules (
        category,
        round_label,
        apply_start,
        apply_end,
        apply_status,
        exam_date_kr,
        exam_date_global,
        exam_date_asia,
        exam_level,
        result_announce_at,
        notice_link,
        source_url,
        raw_json
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (category, round_label)
    DO UPDATE SET
        apply_start = EXCLUDED.apply_start,
        apply_end = EXCLUDED.apply_end,
        apply_status = EXCLUDED.apply_status,
        exam_date_kr = EXCLUDED.exam_date_kr,
        exam_date_global = EXCLUDED.exam_date_global,
        exam_date_asia = EXCLUDED.exam_date_asia,
        exam_level = EXCLUDED.exam_level,
        result_announce_at = EXCLUDED.result_announce_at,
        notice_link = EXCLUDED.notice_link,
        source_url = EXCLUDED.source_url,
        raw_json = EXCLUDED.raw_json,
        updated_at = NOW();
    """

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            for r in rows:
                cur.execute(
                    insert_sql,
                    (
                        r.category,
                        r.round_label,
                        r.apply_start,
                        r.apply_end,
                        r.apply_status,
                        r.exam_date_kr,
                        r.exam_date_global,
                        r.exam_date_asia,
                        r.exam_level,
                        r.result_announce_at,
                        r.notice_link,
                        r.source_url,
                        json.dumps(r.__dict__, ensure_ascii=False),
                    ),
                )
        conn.commit()

    print(f"TOPIK DB 저장 완료: {len(rows)} rows")


if __name__ == "__main__":
    main()