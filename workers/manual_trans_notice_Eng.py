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

_PROMPT = ChatPromptTemplate.from_template("""
You are a translator for Ajou University International Students.
Translate the following Korean notice into natural English.

Return ONLY a valid JSON object with exactly two keys:
- "title_eng": concise English translation of the title.
- "eng_body": natural, student-friendly English translation of the body.
  If the body is empty, return an empty string for "eng_body".

Korean Title: {title}
Korean Body: {body}
""")


def _parse_response(raw) -> dict:
    if isinstance(raw, list):
        raw = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in raw
        )
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0]
    return json.loads(raw.strip())


def translate(llm, title: str, body: str) -> tuple[str | None, str | None]:
    chain = _PROMPT | llm
    response = chain.invoke({"title": title, "body": body or ""})
    data = _parse_response(response.content)

    title_eng = (data.get("title_eng") or "").strip() or None
    eng_body = (data.get("eng_body") or "").strip() or None
    return title_eng, eng_body


def main():
    if DRY_RUN:
        logger.info("DRY RUN mode — no DB writes will occur.")

    llm = ChatGoogleGenerativeAI(
        model=GENERATION_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.1,
        request_timeout=60,
    )

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT id, title, body, title_eng, eng_body
                FROM notices
                WHERE title_eng IS NULL OR eng_body IS NULL
                ORDER BY published_at DESC
                """
            )
            rows = cur.fetchall()

        total = len(rows)
        logger.info(f"Found {total} notices to translate.")

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
                    title_eng, eng_body = translate(llm, title, body)

                    with conn.cursor() as cur:
                        # COALESCE keeps any pre-existing value; only fills NULLs
                        cur.execute(
                            """
                            UPDATE notices
                            SET
                                title_eng = COALESCE(title_eng, %s),
                                eng_body  = COALESCE(eng_body,  %s)
                            WHERE id = %s
                            """,
                            (title_eng, eng_body, row["id"]),
                        )
                    conn.commit()

                    logger.info(f"  EN title: {(title_eng or '')[:80]}")
                    success += 1

            except Exception as exc:
                conn.rollback()
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
        conn.close()


if __name__ == "__main__":
    main()
