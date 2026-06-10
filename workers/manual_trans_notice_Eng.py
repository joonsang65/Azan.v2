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
                        eng_body  = COALESCE(eng_body,  %s)
                    WHERE id = %s
                    """,
                    (title_eng, eng_body, row_id),
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

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, title, body, title_eng, eng_body
                FROM notices
                WHERE title_eng IS NULL OR eng_body IS NULL
                ORDER BY published_at DESC
                LIMIT %s
                """,
                (BATCH_SIZE,),
            )
            rows = cur.fetchall()

        total = len(rows)
        logger.info(f"Found {total} notices to translate (batch limit: {BATCH_SIZE}).")

        if total == 0:
            logger.info("Nothing to do. Exiting.")
            return

        success = 0
        failed = 0

        for i, row in enumerate(rows, start=1):
            notice_id = str(row["id"])
            title = row["title"] or ""
            body = row["body"] or ""
            existing_title_eng = row["title_eng"]
            existing_eng_body = row["eng_body"]

            logger.info(
                f"[{i}/{total}] {notice_id} | "
                f"needs: title_eng={existing_title_eng is None}, eng_body={existing_eng_body is None}"
            )
            logger.info(f"  KR title: {title[:80]}")

            try:
                if DRY_RUN:
                    logger.info("  [dry-run] skipping API call and DB update.")
                    success += 1
                else:
                    need_title = existing_title_eng is None
                    need_body = existing_eng_body is None

                    # 필요한 필드만 Gemini 호출
                    if need_title and need_body:
                        title_eng, eng_body = translate_both(llm, title, body)
                        logger.info("  translated: title + body")
                    elif need_title:
                        title_eng = translate_title(llm, title)
                        eng_body = existing_eng_body   # 기존 값 유지
                        logger.info("  translated: title only (body already exists)")
                    else:
                        eng_body = translate_body(llm, body)
                        title_eng = existing_title_eng  # 기존 값 유지
                        logger.info("  translated: body only (title already exists)")

                    conn = _save(conn, row["id"], title_eng, eng_body)
                    logger.info(f"  EN title: {(title_eng or '')[:80]}")
                    success += 1

            except Exception as exc:
                _safe_rollback(conn)
                # reconnect so the next iteration has a live connection
                if conn.closed != 0:
                    conn = _reconnect(conn)
                logger.error(f"  FAILED: {exc}")
                failed += 1

            if i < total:
                time.sleep(REQUEST_DELAY)

        logger.info(
            f"\n{'='*60}\n"
            f"Translation complete.\n"
            f"  Total  : {total}\n"
            f"  Success: {success}\n"
            f"  Failed : {failed}\n"
            f"{'='*60}"
        )

        if failed > 0:
            raise SystemExit(1)

    finally:
        if conn.closed == 0:
            conn.close()


if __name__ == "__main__":
    main()
