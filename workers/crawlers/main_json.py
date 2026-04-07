from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from .categorize import categorize, to_app_category
from .cleaner import clean_notice_body, normalize_text
from .config import DATA_DIR, LIST_URL, LOG_PATH, now_kst_iso
from .deadline_extractor import extract_deadline, normalize_deadline_text
from .http_client import fetch_html
from .json_store import save_json
from .parser_detail import parse_detail
from .parser_list import parse_list


def setup_logger(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("crawler_json")
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        fmt = logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s")

        fh = logging.FileHandler(log_path, encoding="utf-8")
        fh.setFormatter(fmt)
        logger.addHandler(fh)

        sh = logging.StreamHandler()
        sh.setFormatter(fmt)
        logger.addHandler(sh)

    return logger


def build_notice_id(url: str, index: int) -> str:
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    return f"oia-{index}-{digest}"


def build_summary(body: str) -> str:
    compact = " ".join((body or "").split())
    if not compact:
        return "No summary available."
    if len(compact) <= 140:
        return compact
    return f"{compact[:137]}..."


def run() -> None:
    logger = setup_logger(LOG_PATH)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    logger.info(f"Run started (KST): {now_kst_iso()}")
    logger.info(f"List URL: {LIST_URL}")

    list_html = fetch_html(LIST_URL)
    items = parse_list(list_html, LIST_URL)

    logger.info(f"List parsed: {len(items)} items")

    results: list[dict] = []

    for index, item in enumerate(items, start=1):
        url = item["url"]
        title_raw = item["title"]

        try:
            detail_html = fetch_html(url)
            body_raw = parse_detail(detail_html)
        except Exception as error:
            logger.warning(f"Detail failed: {url} | {error}")
            body_raw = ""

        title = normalize_text(title_raw)
        cleaned = clean_notice_body(body_raw, title)
        payload_for_deadline = {
            "title": title,
            "raw_body": cleaned["raw_body"],
            "clean_body": cleaned["clean_body"],
            "meta": cleaned["meta"],
        }

        deadline = extract_deadline(payload_for_deadline)
        category_final, category_reason = categorize(title, cleaned["clean_body"])
        app_category = to_app_category(category_final)
        published_at = item.get("published_at_raw") or now_kst_iso()[:10]

        logger.info(f"title={title}")
        logger.info(f"period_texts={cleaned['meta'].get('period_texts')}")
        for period_text in cleaned["meta"].get("period_texts", []):
            logger.info(f"normalized_period={normalize_deadline_text(period_text)}")
        logger.info(f"normalized_title={normalize_deadline_text(title)}")
        logger.info(f"deadline={deadline}")
        logger.info(f"clean_body_sample={cleaned['clean_body'][:300]}")

        notice = {
            "id": build_notice_id(url, index),
            "title": title,
            "summary": build_summary(cleaned["clean_body"]),
            "description": cleaned["clean_body"],
            "body": cleaned["clean_body"],
            "raw_body": cleaned["raw_body"],
            "meta": cleaned["meta"],
            "category": app_category,
            "category_final": category_final,
            "category_reason": category_reason,
            "date": published_at,
            "published_at": published_at,
            "deadline": deadline,
            "deadline_text": deadline,
            "isCritical": bool(deadline),
            "source": "ajou_oia",
            "url": url,
            "link": url,
            "created_at": now_kst_iso(),
        }
        results.append(notice)

    save_json(DATA_DIR / "oia_notices_all.json", results)
    valid_notices = [notice for notice in results if notice["deadline"] is not None]
    save_json(DATA_DIR / "oia_notices_valid.json", valid_notices)

    logger.info(f"JSON saved: {len(results)} items")
    logger.info("Run finished.")


if __name__ == "__main__":
    run()
