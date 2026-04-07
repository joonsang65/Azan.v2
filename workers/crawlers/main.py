import logging
from pathlib import Path

from .extractors import (
    extract_dates_from_body_summary,
    extract_tag_from_text,
    extract_article_no,
)
from .config import LIST_URL, CSV_PATH, LOG_PATH, now_kst_iso, DATA_DIR, LOG_DIR
from .http_client import fetch_html
from .parser_list import parse_list
from .parser_detail import parse_detail
from .dedupe import make_dedupe_hash, make_content_hash
from .models import NoticeRow
from .csv_store import ensure_csv_exists, upsert_by_url
from .cleaner import normalize_text, remove_title_echo
from .categorize import categorize
from .db_insert import upsert_notices  
from .parser_topik_pbt import crawl_topik_pbt
from .parser_topik_speaking import crawl_topik_speaking
from .parser_topik_schedule import parse_schedule_table
from .db_insert import upsert_topik_schedules

TOPIK_SCHEDULE_URL = "https://www.topik.go.kr/TWGUID/TWGUID0020.do" 

def setup_logger(log_path: Path) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("crawler")
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


def decide_published_at(
    published_raw_from_list: str | None,
    published_raw_from_body: str | None,
    inferred_from_body: str | None,
) -> tuple[str | None, str | None, str | None, str | None]:
    """
    반환:
      published_at_final, published_at_raw, published_at_inferred, confidence

    우선순위:
      1) 목록에서 가져온 raw
      2) body 라벨에서 가져온 raw
      3) body에서 추정한 inferred
    """
    if published_raw_from_list:
        return published_raw_from_list, published_raw_from_list, inferred_from_body, "high"

    if published_raw_from_body:
        return published_raw_from_body, published_raw_from_body, inferred_from_body, "high"

    if inferred_from_body:
        return inferred_from_body, None, inferred_from_body, "low"

    return None, None, None, "low"


def run_topik_schedule_pipeline(logger: logging.Logger) -> None:
    try:
        sample_path = DATA_DIR / "topik_schedule_sample.html"
        html = sample_path.read_text(encoding="utf-8")

        logger.info(f"TOPIK schedule sample HTML loaded: {sample_path}")
        logger.info(f"'table_list' in html: {'table_list' in html}")

        rows = parse_schedule_table(html)
        logger.info(f"TOPIK schedule parsed: {len(rows)} rows")

        if rows:
            logger.info(f"TOPIK first row: {rows[0]}")

        upsert_topik_schedules(rows)
        logger.info("TOPIK schedule DB saved")
    except Exception as e:
        logger.warning(f"TOPIK schedule pipeline failed: {e}")


   
        
def run() -> None:
    logger = setup_logger(LOG_PATH)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ensure_csv_exists(CSV_PATH)

    logger.info(f"Run started (KST): {now_kst_iso()}")
    logger.info(f"List URL: {LIST_URL}")

    # 1) 목록 수집
    list_html = fetch_html(LIST_URL)
    items = parse_list(list_html, LIST_URL)
    logger.info(f"List parsed: {len(items)} items")

    rows: list[dict] = []
    crawl_time = now_kst_iso()

    for it in items:
        url = it["url"]
        title_raw = it["title"]
        published_at_raw_list = it.get("published_at_raw")

        # 2) 상세 수집
        try:
            detail_html = fetch_html(url)
            body_raw = parse_detail(detail_html)
        except Exception as e:
            logger.warning(f"Detail fetch/parse failed: {url} | {e}")
            body_raw = ""

        # 3) 본문 정제
        title = normalize_text(title_raw)
        body = normalize_text(body_raw)

        notice_tag, body_wo_tag = extract_tag_from_text(body)
        body = body_wo_tag
        body = remove_title_echo(body, title)

        # 4) 날짜 추출
        pub_raw_body, deadline_at, inferred_body, deadline_text = extract_dates_from_body_summary(
            title + "\n" + body
        )

        published_at_final, published_at_raw, published_at_inferred, confidence = decide_published_at(
            published_raw_from_list=published_at_raw_list,
            published_raw_from_body=pub_raw_body,
            inferred_from_body=inferred_body,
        )

        # 5) 기타 메타 생성
        category_final, category_reason = categorize(title, body)
        source_notice_id = extract_article_no(url)
        dedupe_hash = make_dedupe_hash(url)
        content_hash = make_content_hash(title, body)

        notice = NoticeRow(
            source_type="university_portal",
            source_name="ajou_oia",
            source_url=url,
            source_notice_id=source_notice_id,
            title=title,
            body=body,
            published_at=published_at_final,
            deadline_at=deadline_at,
            dedupe_hash=dedupe_hash,
            is_processed=False,
            is_embedded=False,
            is_deleted=False,
            created_at=crawl_time,
            updated_at=crawl_time,
            published_at_raw=published_at_raw,
            published_at_inferred=published_at_inferred,
            published_at_final=published_at_final,
            published_at_confidence=confidence,
            notice_tag=notice_tag,
            category_final=category_final,
            category_reason=category_reason,
            deadline_text=deadline_text,
            content_hash=content_hash,
        )

        rows.append(notice.to_row())

    # 6) CSV 저장
    inserted, updated, total = upsert_by_url(CSV_PATH, rows)
    logger.info(f"CSV updated: inserted={inserted}, updated={updated}, total={total}, path={CSV_PATH}")

    try:
        db_processed, db_success = upsert_notices(rows)
        logger.info(f"Neon DB upserted: processed={db_processed}, success={db_success}")
    except Exception as e:
        logger.warning(f"Neon DB upsert failed: {e}")

        # 7) TOPIK 시험일정 파싱 + DB 저장
    run_topik_schedule_pipeline(logger)

    # 8) 기존 TOPIK JSON 생성 (필요 시 유지)
    try:
        topik_path = crawl_topik_pbt()
        logger.info(f"TOPIK PBT JSON saved: {topik_path}")
    except Exception as e:
        logger.warning(f"TOPIK PBT crawl failed: {e}")

    # 9) 기존 TOPIK 말하기 JSON 생성 (필요 시 유지)
    try:
        speaking_path = crawl_topik_speaking()
        logger.info(f"TOPIK speaking JSON saved: {speaking_path}")
    except Exception as e:
        logger.warning(f"TOPIK speaking crawl failed: {e}")

    logger.info("Run finished.")


if __name__ == "__main__":
    run()