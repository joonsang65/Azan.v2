"""
manual_trans_notice_Eng.py — Backfill title_eng and eng_body for all notices missing English translations.

Queries notices where title_eng IS NULL OR eng_body IS NULL, translates via Gemini,
and updates only the NULL fields (never overwrites existing translations).
"""

import json
import logging
import os
import time

import psycopg2
import psycopg2.extras
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("bulk-translate")

DATABASE_URL = os.environ["DATABASE_URL"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GENERATION_MODEL = os.environ.get("GENERATION_MODEL", "gemini-2.5-flash")
REQUEST_DELAY = float(os.environ.get("REQUEST_DELAY_SECONDS", "1.0"))
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "50"))

_PROMPT_BOTH = ChatPromptTemplate.from_template("""
You are a translator for Ajou University International Students.
Translate the following Korean notice into natural English.

Return ONLY a valid JSON object with exactly two keys:
- "title_eng": concise English translation of the title.
- "eng_body": natural, student-friendly English translation of the body.
  If the body is empty, return an empty string for "eng_body".

Korean Title: {title}
Korean Body: {body}
""")

_PROMPT_TITLE_ONLY = ChatPromptTemplate.from_template("""
You are a translator for Ajou University International Students.
Translate the following Korean notice title into concise, natural English.

Return ONLY a valid JSON object with exactly one key:
- "title_eng": English translation of the title.

Korean Title: {title}
""")

_PROMPT_BODY_ONLY = ChatPromptTemplate.from_template("""
You are a translator for Ajou University International Students.
Translate the following Korean notice body into natural, student-friendly English.

Return ONLY a valid JSON object with exactly one key:
- "eng_body": English translation of the body.
  If the body is empty, return an empty string for "eng_body".

Korean Body: {body}
""")

_PROMPT_DEADLINE = ChatPromptTemplate.from_template("""
You are an assistant for Ajou University International Students.
Analyze the following Korean notice and extract the most important date, if one clearly exists.

What counts as a deadline:
- Application / submission deadline: 신청 마감, 제출 기한, 접수 기간, 모집 기간, ~까지 등
- Event date: 행사 일시, 시행일, 개최일, 설명회 날짜 등 — if the notice is about an event on a specific date, use that date.
- In general, any explicitly stated date that a student should be aware of or act by.

Rules:
- Only return a date if it is EXPLICITLY written in the text. Do NOT guess or infer.
- If the notice contains both an application deadline and an event date, prefer the application deadline.
- If there is no explicit date at all, return null.

Return ONLY a valid JSON object with exactly one key:
- "deadline": the date in YYYY-MM-DD format, or null if no explicit date is found.

Korean Title: {title}
Korean Body: {body}
""")


# ── DB helpers ────────────────────────────────────────────────────────────────

def _make_conn() -> psycopg2.extensions.connection:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def _reconnect(conn: psycopg2.extensions.connection) -> psycopg2.extensions.connection:
    logger.warning("DB connection lost — reconnecting...")
    try:
        conn.close()
    except Exception:
        pass
    return _make_conn()


def _safe_rollback(conn: psycopg2.extensions.connection) -> None:
    if conn.closed != 0:
        return
    try:
        conn.rollback()
    except Exception as e:
        logger.warning(f"Rollback failed (ignored): {e}")


def _save(
    conn: psycopg2.extensions.connection,
    row_id,
    title_eng: str | None,
    eng_body: str | None,
    deadline: str | None = None,
) -> psycopg2.extensions.connection:
    """UPDATE the notice row, reconnecting once on OperationalError."""
    for attempt in range(2):
        try:
            if conn.closed != 0:
                conn = _reconnect(conn)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE notices
                    SET
                        title_eng = COALESCE(title_eng, %s),
                        eng_body  = COALESCE(eng_body,  %s),
                        deadline  = COALESCE(deadline,  %s::date)
                    WHERE id = %s
                    """,
                    (title_eng, eng_body, deadline, row_id),
                )
            conn.commit()
            return conn
        except psycopg2.OperationalError as e:
            if attempt == 0:
                logger.warning(f"OperationalError — reconnecting and retrying: {e}")
                conn = _reconnect(conn)
                continue
            raise
    return conn


# ── Gemini helpers ────────────────────────────────────────────────────────────

def _parse_response(raw) -> dict:
    if isinstance(raw, list):
        raw = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in raw
        )
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0]
    return json.loads(raw.strip())


def _str_or_none(value) -> str | None:
    return (value or "").strip() or None


def translate_both(llm, title: str, body: str) -> tuple[str | None, str | None]:
    """title_eng AND eng_body 둘 다 NULL일 때 — Gemini 1회 호출."""
    chain = _PROMPT_BOTH | llm
    response = chain.invoke({"title": title, "body": body or ""})
    data = _parse_response(response.content)
    return _str_or_none(data.get("title_eng")), _str_or_none(data.get("eng_body"))


def translate_title(llm, title: str) -> str | None:
    """title_eng 만 NULL일 때 — body 번역 생략."""
    chain = _PROMPT_TITLE_ONLY | llm
    response = chain.invoke({"title": title})
    data = _parse_response(response.content)
    return _str_or_none(data.get("title_eng"))


def translate_body(llm, body: str) -> str | None:
    """eng_body 만 NULL일 때 — title 번역 생략."""
    chain = _PROMPT_BODY_ONLY | llm
    response = chain.invoke({"body": body or ""})
    data = _parse_response(response.content)
    return _str_or_none(data.get("eng_body"))


def extract_deadline(llm, title: str, body: str) -> str | None:
    """deadline 이 NULL일 때 — title+body에서 마감일 추출."""
    chain = _PROMPT_DEADLINE | llm
    response = chain.invoke({"title": title, "body": body or ""})
    data = _parse_response(response.content)
    value = data.get("deadline")
    if not value or str(value).lower() in ("null", "none", ""):
        return None
    return str(value).strip()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if DRY_RUN:
        logger.info("DRY RUN mode — no DB writes will occur.")

    llm = ChatGoogleGenerativeAI(
        model=GENERATION_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.1,
        request_timeout=120,  # increased from 60 → 120 to handle slow Gemini responses
    )

    conn = _make_conn()
    grand_success = 0
    grand_failed = 0
    batch_num = 0
    # IDs where Gemini confirmed no deadline exists — excluded from future batches
    # to prevent infinite loops on notices that genuinely have no deadline.
    no_deadline_ids: set = set()

    try:
        while True:
            batch_num += 1
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                if no_deadline_ids:
                    # Exclude notices already confirmed to have no deadline
                    cur.execute(
                        """
                        SELECT id, title, body, title_eng, eng_body, deadline
                        FROM notices
                        WHERE (title_eng IS NULL OR eng_body IS NULL)
                           OR (deadline IS NULL AND id != ALL(%s))
                        ORDER BY published_at DESC
                        LIMIT %s
                        """,
                        (list(no_deadline_ids), BATCH_SIZE),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, title, body, title_eng, eng_body, deadline
                        FROM notices
                        WHERE title_eng IS NULL OR eng_body IS NULL OR deadline IS NULL
                        ORDER BY published_at DESC
                        LIMIT %s
                        """,
                        (BATCH_SIZE,),
                    )
                rows = cur.fetchall()

            total = len(rows)
            logger.info(f"[Batch {batch_num}] Found {total} notices to process (batch size: {BATCH_SIZE}).")

            if total == 0:
                logger.info("Nothing left to process. Done.")
                break

            success = 0
            failed = 0

            for i, row in enumerate(rows, start=1):
                notice_id = str(row["id"])
                title = row["title"] or ""
                body = row["body"] or ""
                existing_title_eng = row["title_eng"]
                existing_eng_body = row["eng_body"]
                existing_deadline = row["deadline"]

                need_title = existing_title_eng is None
                need_body = existing_eng_body is None
                need_deadline = existing_deadline is None

                logger.info(
                    f"[{i}/{total}] {notice_id} | "
                    f"needs: title_eng={need_title}, eng_body={need_body}, deadline={need_deadline}"
                )
                logger.info(f"  KR title: {title[:80]}")

                try:
                    if DRY_RUN:
                        logger.info("  [dry-run] skipping API call and DB update.")
                        success += 1
                    else:
                        # ── Translation ───────────────────────────────────────
                        if need_title and need_body:
                            title_eng, eng_body = translate_both(llm, title, body)
                            logger.info("  translated: title + body")
                        elif need_title:
                            title_eng = translate_title(llm, title)
                            eng_body = existing_eng_body
                            logger.info("  translated: title only (body already exists)")
                        elif need_body:
                            eng_body = translate_body(llm, body)
                            title_eng = existing_title_eng
                            logger.info("  translated: body only (title already exists)")
                        else:
                            title_eng = existing_title_eng
                            eng_body = existing_eng_body

                        # ── Deadline extraction ───────────────────────────────
                        if need_deadline:
                            deadline = extract_deadline(llm, title, body)
                            if deadline:
                                logger.info(f"  extracted deadline: {deadline}")
                            else:
                                logger.info("  no deadline found in notice — skipping in future batches")
                                no_deadline_ids.add(row["id"])
                        else:
                            deadline = None  # COALESCE will keep the existing DB value

                        conn = _save(conn, row["id"], title_eng, eng_body, deadline)
                        logger.info(f"  EN title: {(title_eng or '')[:80]}")
                        success += 1

                except Exception as exc:
                    _safe_rollback(conn)
                    if conn.closed != 0:
                        conn = _reconnect(conn)
                    logger.error(f"  FAILED: {exc}")
                    failed += 1

                if i < total:
                    time.sleep(REQUEST_DELAY)

            grand_success += success
            grand_failed += failed
            logger.info(
                f"[Batch {batch_num}] done — success: {success}, failed: {failed}"
            )

        logger.info(
            f"\n{'='*60}\n"
            f"All batches complete.\n"
            f"  Total processed : {grand_success + grand_failed}\n"
            f"  Success         : {grand_success}\n"
            f"  Failed          : {grand_failed}\n"
            f"{'='*60}"
        )

        if grand_failed > 0:
            raise SystemExit(1)

    finally:
        if conn.closed == 0:
            conn.close()


if __name__ == "__main__":
    main()
