#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

import psycopg2
from psycopg2.extras import execute_values


SEOUL_TZ = ZoneInfo("Asia/Seoul")
BODY_PREFIX_LEN = 200
SOURCE_VALUE = "ajou-oia-dummy"
NOTICE_FILE_PATTERN = "ajou_notice_*.json"
NOTICE_ID_REGEX = re.compile(r"^ajou_notice_(\d+)\.json$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed keywords and upsert dummy notices into Neon/Postgres."
    )
    parser.add_argument(
        "--db-dir",
        default=Path(__file__).resolve().parent,
        type=Path,
        help="Directory containing dummy notice JSON files and config JSON files.",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL connection URL. Defaults to DATABASE_URL env.",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def parse_datetime_to_utc(value: Any, field_name: str) -> datetime:
    if value is None:
        raise ValueError(f"{field_name} is required")
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            raise ValueError(f"{field_name} is empty")
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
    else:
        raise ValueError(f"{field_name} must be ISO datetime/date string")

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SEOUL_TZ)
    return dt.astimezone(timezone.utc)


def parse_deadline_to_date(value: Any):
    if value is None:
        return None
    dt = parse_datetime_to_utc(value, "deadline")
    return dt.date()


def build_notice_id(file_name: str) -> str:
    match = NOTICE_ID_REGEX.match(file_name)
    if not match:
        raise ValueError(
            f"Unsupported notice file name: {file_name} (expected ajou_notice_<digits>.json)"
        )
    return f"ajou-{match.group(1)}"


def build_hash(title: str, published_at_utc: datetime, body: str) -> str:
    material = f"{title}|{published_at_utc.isoformat()}|{(body or '')[:BODY_PREFIX_LEN]}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def ensure_keywords(cur, keywords: list[str]) -> dict[str, int]:
    unique_keywords = sorted(set(k.strip() for k in keywords if isinstance(k, str) and k.strip()))
    if not unique_keywords:
        raise ValueError("keywords_seed.json has no valid keywords")

    execute_values(
        cur,
        """
        INSERT INTO keywords (keyword)
        VALUES %s
        ON CONFLICT (keyword) DO NOTHING
        """,
        [(k,) for k in unique_keywords],
    )
    cur.execute(
        """
        SELECT id, keyword
        FROM keywords
        WHERE keyword = ANY(%s)
        """,
        (unique_keywords,),
    )
    rows = cur.fetchall()
    mapping = {keyword: int(keyword_id) for keyword_id, keyword in rows}
    missing = [k for k in unique_keywords if k not in mapping]
    if missing:
        raise RuntimeError(f"Failed to resolve keyword IDs for: {missing}")
    return mapping


def load_notice_rows(db_dir: Path, notice_keyword_map: dict[str, str], keyword_to_id: dict[str, int]):
    notice_rows = []
    for notice_path in sorted(db_dir.glob(NOTICE_FILE_PATTERN)):
        file_name = notice_path.name
        if file_name in {"keywords_seed.json", "notice_keyword_map.json"}:
            continue
        if file_name not in notice_keyword_map:
            raise ValueError(f"Missing keyword mapping for {file_name}")

        keyword = notice_keyword_map[file_name]
        if keyword not in keyword_to_id:
            raise ValueError(f"Keyword '{keyword}' for {file_name} is not seeded in keywords table")

        payload = load_json(notice_path)
        title = (payload.get("title") or "").strip()
        if not title:
            raise ValueError(f"title is required: {file_name}")

        preview = (payload.get("preview") or "").strip()
        body = payload.get("body")
        source = SOURCE_VALUE
        url = payload.get("url")
        published_at = parse_datetime_to_utc(payload.get("published_at"), "published_at")
        deadline = parse_deadline_to_date(payload.get("deadline"))
        notice_id = build_notice_id(file_name)
        row_hash = build_hash(title, published_at, body or "")

        notice_rows.append(
            {
                "id": str(uuid4()),
                "notice_id": notice_id,
                "keyword_id": keyword_to_id[keyword],
                "title": title,
                "preview": preview,
                "body": body,
                "source": source,
                "url": url,
                "hash": row_hash,
                "deadline": deadline,
                "published_at": published_at,
                "file_name": file_name,
                "keyword": keyword,
            }
        )

    if not notice_rows:
        raise ValueError(f"No notice files matched '{NOTICE_FILE_PATTERN}' in {db_dir}")

    return notice_rows


def upsert_notices(cur, notice_rows: list[dict[str, Any]]):
    inserted = 0
    updated = 0

    for row in notice_rows:
        cur.execute(
            """
            INSERT INTO notices (
                id, notice_id, keyword_id, title, preview, body, source, url, hash, deadline, published_at
            )
            VALUES (
                %(id)s, %(notice_id)s, %(keyword_id)s, %(title)s, %(preview)s, %(body)s, %(source)s, %(url)s,
                %(hash)s, %(deadline)s, %(published_at)s
            )
            ON CONFLICT (notice_id) DO UPDATE SET
                title = EXCLUDED.title,
                preview = EXCLUDED.preview,
                body = EXCLUDED.body,
                deadline = EXCLUDED.deadline,
                published_at = EXCLUDED.published_at,
                keyword_id = EXCLUDED.keyword_id,
                source = EXCLUDED.source,
                url = EXCLUDED.url,
                hash = EXCLUDED.hash
            RETURNING (xmax = 0) AS inserted
            """,
            row,
        )
        was_inserted = bool(cur.fetchone()[0])
        if was_inserted:
            inserted += 1
        else:
            updated += 1

    return inserted, updated


def main():
    args = parse_args()
    db_dir: Path = args.db_dir
    database_url = args.database_url

    if not database_url:
        raise SystemExit("DATABASE_URL is required (env or --database-url)")
    if not db_dir.exists():
        raise SystemExit(f"db dir not found: {db_dir}")

    keywords_path = db_dir / "keywords_seed.json"
    notice_map_path = db_dir / "notice_keyword_map.json"
    if not keywords_path.exists():
        raise SystemExit(f"missing file: {keywords_path}")
    if not notice_map_path.exists():
        raise SystemExit(f"missing file: {notice_map_path}")

    keywords = load_json(keywords_path)
    notice_keyword_map = load_json(notice_map_path)
    if not isinstance(keywords, list):
        raise SystemExit("keywords_seed.json must be a JSON array")
    if not isinstance(notice_keyword_map, dict):
        raise SystemExit("notice_keyword_map.json must be a JSON object")

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            keyword_to_id = ensure_keywords(cur, keywords)
            notice_rows = load_notice_rows(db_dir, notice_keyword_map, keyword_to_id)
            inserted, updated = upsert_notices(cur, notice_rows)

    print("Seed/Upsert completed")
    print(f"- db_dir: {db_dir}")
    print(f"- keywords seeded/verified: {len(keyword_to_id)}")
    print(f"- notices processed: {len(notice_rows)} (inserted={inserted}, updated={updated})")
    for row in notice_rows:
        print(
            f"  - {row['file_name']} -> notice_id={row['notice_id']} keyword={row['keyword']} keyword_id={row['keyword_id']}"
        )


if __name__ == "__main__":
    main()
