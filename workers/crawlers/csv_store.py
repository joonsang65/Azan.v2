from __future__ import annotations

from pathlib import Path
from typing import Tuple, List, Dict

import pandas as pd

CSV_COLUMNS = [
    # base (DB/기존)
    "source_type",
    "source_name",
    "source_url",
    "source_notice_id",
    "title",
    "body",
    "published_at",
    "deadline_at",
    "dedupe_hash",
    "is_processed",
    "is_embedded",
    "is_deleted",
    "created_at",
    "updated_at",

    # enriched
    "published_at_raw",
    "published_at_inferred",
    "published_at_final",
    "published_at_confidence",
    "notice_tag",
    "category_final",
    "category_reason",
    "deadline_text",
    "content_hash",
]


def ensure_csv_exists(csv_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    if not csv_path.exists():
        pd.DataFrame(columns=CSV_COLUMNS).to_csv(csv_path, index=False, encoding="utf-8-sig")


def load_existing(csv_path: Path) -> pd.DataFrame:
    ensure_csv_exists(csv_path)
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)  # 문자열로 읽고 NaN 최소화
    # 컬럼 누락 방어
    for col in CSV_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    return df[CSV_COLUMNS]


def upsert_by_url(csv_path: Path, new_rows: List[Dict]) -> Tuple[int, int, int]:
    """
    source_url 기준 UPSERT:
      - keep="last"로 최신 row가 덮어쓴다.
      - 반환: (inserted_count, updated_count, total_count)

    주의:
      - inserted: 기존에 없던 url이 새로 들어온 수
      - updated: 기존에 있던 url인데 내용이 바뀌어 덮어쓴 수(대략적으로 content_hash 기준)
    """
    df_old = load_existing(csv_path)
    df_new = pd.DataFrame(new_rows)

    # 컬럼 정렬/누락 방어
    for col in CSV_COLUMNS:
        if col not in df_new.columns:
            df_new[col] = ""
    df_new = df_new[CSV_COLUMNS].fillna("")

    # inserted / updated 계산을 위해 기존 key set 확보
    old_urls = set(df_old["source_url"].astype(str).tolist())

    # 업데이트 감지(선택): content_hash 기준 비교
    old_hash = {}
    if "content_hash" in df_old.columns:
        for _, r in df_old[["source_url", "content_hash"]].iterrows():
            old_hash[str(r["source_url"])] = str(r["content_hash"])

    inserted = 0
    updated = 0
    for _, r in df_new[["source_url", "content_hash"]].iterrows():
        u = str(r["source_url"])
        h = str(r["content_hash"])
        if u not in old_urls:
            inserted += 1
        else:
            if old_hash.get(u, "") != h:
                updated += 1

    merged = pd.concat([df_old, df_new], ignore_index=True)
    merged["source_url"] = merged["source_url"].astype(str)

    # ✅ 덮어쓰기 모드: 같은 URL이면 마지막 값을 유지
    merged = merged.drop_duplicates(subset=["source_url"], keep="last")

    # 원자적 저장(임시 파일 -> 교체): 중간 깨짐 방지
    tmp_path = csv_path.with_suffix(".tmp.csv")
    merged.to_csv(tmp_path, index=False, encoding="utf-8-sig")
    tmp_path.replace(csv_path)

    total = len(merged)
    return inserted, updated, total
