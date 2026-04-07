from __future__ import annotations

import hashlib
from typing import Any

from .categorize import to_app_category
from .config import DATA_DIR, now_kst_iso
from .deadline_extractor import extract_deadline
from .http_client import fetch_html
from .json_store import save_json
from .parser_topik_notice_detail import parse_topik_notice_detail
from .parser_topik_notice_list import parse_topik_notice_list
from .parser_topik_schedule import parse_topik_schedule

TOPIK_NOTICE_URL = "https://www.topik.go.kr/TWINFO/TWINFO0010.do"
TOPIK_SCHEDULE_URL = "https://www.topik.go.kr/TWGUID/TWGUID0020.do"


def build_notice_id(url: str, item: dict[str, Any]) -> str:
    raw_id = item.get("ntt_id") or item.get("bbs_id")
    if raw_id:
        return f"topik-{raw_id}"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    return f"topik-{digest}"


def build_summary(body: str) -> str:
    compact = " ".join((body or "").split())
    if not compact:
        return "No summary available."
    if len(compact) <= 140:
        return compact
    return f"{compact[:137]}..."


def run_topik_notice() -> list[dict[str, Any]]:
    html = fetch_html(TOPIK_NOTICE_URL)
    items = parse_topik_notice_list(html)

    results: list[dict[str, Any]] = []

    for item in items:
        url = item.get("url")
        if not url:
            continue

        detail_html = fetch_html(url)
        detail = parse_topik_notice_detail(detail_html)

        payload = {
            "title": detail.get("title", ""),
            "raw_body": detail.get("raw_body", ""),
            "clean_body": detail.get("body", ""),
            "meta": detail.get("meta", {}),
        }

        deadline = extract_deadline(payload)
        published_at = detail.get("published_at", "") or item.get("published_at", "") or now_kst_iso()[:10]
        category = to_app_category("topik")

        results.append(
            {
                "id": build_notice_id(url, item),
                "title": detail.get("title", ""),
                "summary": build_summary(detail.get("body", "")),
                "description": detail.get("body", ""),
                "body": detail.get("body", ""),
                "raw_body": detail.get("raw_body", ""),
                "meta": detail.get("meta", {}),
                "deadline": deadline,
                "source": "topik_notice",
                "url": url,
                "link": url,
                "created_at": now_kst_iso(),
                "date": published_at,
                "published_at": published_at,
                "category": category,
                "category_final": "topik",
                "gubun": item.get("gubun", ""),
                "views": item.get("views", ""),
                "is_notice": item.get("is_notice", False),
                "isCritical": bool(deadline) or bool(item.get("is_notice", False)),
                "has_attachment": item.get("has_attachment", False),
                "bbs_id": item.get("bbs_id"),
                "ntt_id": item.get("ntt_id"),
            }
        )

    return results


def run_topik_schedule() -> list[dict[str, Any]]:
    html = fetch_html(TOPIK_SCHEDULE_URL)
    rows = parse_topik_schedule(html)

    results: list[dict[str, Any]] = []

    for row in rows:
        results.append(
            {
                "category": row.get("category", ""),
                "round": row.get("round", ""),
                "application_period": row.get("application_period", ""),
                "exam_date_kr": row.get("exam_date_kr", ""),
                "exam_date_other": row.get("exam_date_other", ""),
                "exam_date_asia": row.get("exam_date_asia", ""),
                "test_levels": row.get("test_levels", []),
                "reception_status": row.get("reception_status", ""),
                "result_date": row.get("result_date", ""),
                "notice_links": row.get("notice_links", []),
                "source": "topik_exam_schedule",
                "url": TOPIK_SCHEDULE_URL,
                "created_at": now_kst_iso(),
            }
        )

    return results


def main() -> None:
    notices = run_topik_notice()
    schedules = run_topik_schedule()

    save_json(DATA_DIR / "topik_notices.json", notices)
    save_json(DATA_DIR / "topik_exam_schedules.json", schedules)

    print("TOPIK notices:", len(notices))
    print("TOPIK schedules:", len(schedules))
    print("saved:", DATA_DIR / "topik_notices.json")
    print("saved:", DATA_DIR / "topik_exam_schedules.json")


if __name__ == "__main__":
    main()
