"""
workers/risk_alarm/expo/send_risk_alerts.py

Reads pending risk-alert rows from alert_outbox (notice_id IS NULL)
and delivers them via the Expo Push API in batches of 100.

On success: status → 'sent', sent_at = now
  - Normal mode:    visa_last_notified_at / topik_last_notified_at also updated
  - FORCE_SEND=true (test mode): last_notified_at columns NOT touched
On failure: status → 'failed', try_count += 1

Env vars:
  DATABASE_URL       — Neon/PostgreSQL connection string
  EXPO_ACCESS_TOKEN  — (optional) Expo access token for enhanced delivery
  FORCE_SEND         — set "true" to skip last_notified_at updates (test mode)
"""

import logging
import os
import sys
from datetime import date, datetime, timezone

import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_BATCH_SIZE = 100
FORCE_SEND: bool = os.environ.get("FORCE_SEND", "").lower() in ("1", "true", "yes")


def _get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        log.error("DATABASE_URL is not set")
        sys.exit(1)
    return create_engine(url, future=True, pool_pre_ping=True)


def _expo_headers() -> dict:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    token = os.environ.get("EXPO_ACCESS_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _send_batch(messages: list[dict]) -> bool:
    try:
        resp = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers=_expo_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        log.info("Expo batch (%d msg): %s", len(messages), resp.json())
        return True
    except Exception as exc:
        log.error("Expo API error: %s", exc)
        return False


def main() -> None:
    engine = _get_engine()
    today = date.today()

    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT
                    ao.id              AS outbox_id,
                    ao.user_id,
                    ao.payload,
                    u.expo_push_token
                FROM alert_outbox ao
                JOIN users u ON u.id = ao.user_id
                WHERE ao.status      = 'pending'
                  AND ao.notice_id   IS NULL
                  AND u.expo_push_token IS NOT NULL
                  AND u.expo_push_token != ''
                ORDER BY ao.created_at
            """)).fetchall()

        if not rows:
            log.info("No pending risk alerts.")
            return

        log.info("Processing %d pending alert(s).", len(rows))

        valid_rows = []
        messages = []
        for row in rows:
            token = row.expo_push_token
            if not token.startswith("ExponentPushToken["):
                log.warning("[SKIP] user %s: invalid token format", row.user_id)
                continue

            payload: dict = row.payload  # JSONB auto-deserialized by psycopg2
            messages.append({
                "to": token,
                "title": "AZAN Risk Alert",
                "body": payload["message"],
                "sound": "default",
                "data": {
                    "alert_type": payload["alert_type"],
                    "risk_level": payload["risk_level"],
                },
            })
            valid_rows.append(row)

        sent_rows: list = []
        failed_rows: list = []

        for i in range(0, len(messages), EXPO_BATCH_SIZE):
            batch_msgs = messages[i : i + EXPO_BATCH_SIZE]
            batch_rows = valid_rows[i : i + EXPO_BATCH_SIZE]
            if _send_batch(batch_msgs):
                sent_rows.extend(batch_rows)
            else:
                failed_rows.extend(batch_rows)

        now = datetime.now(timezone.utc)

        with engine.begin() as conn:
            if sent_rows:
                conn.execute(
                    text("UPDATE alert_outbox SET status = 'sent', sent_at = :now WHERE id = :id"),
                    [{"now": now, "id": r.outbox_id} for r in sent_rows],
                )

                if FORCE_SEND:
                    log.info("FORCE_SEND=true — skipping visa_last_notified_at / topik_last_notified_at update.")
                else:
                    visa_updates = [
                        {"today": today, "uid": str(r.user_id)}
                        for r in sent_rows
                        if r.payload["alert_type"] == "visa"
                    ]
                    if visa_updates:
                        conn.execute(
                            text("UPDATE users SET visa_last_notified_at = :today WHERE id = :uid::uuid"),
                            visa_updates,
                        )

                    topik_updates = [
                        {"today": today, "uid": str(r.user_id)}
                        for r in sent_rows
                        if r.payload["alert_type"] == "topik"
                    ]
                    if topik_updates:
                        conn.execute(
                            text("UPDATE users SET topik_last_notified_at = :today WHERE id = :uid::uuid"),
                            topik_updates,
                        )

                log.info("Sent %d alert(s) successfully.", len(sent_rows))

            if failed_rows:
                conn.execute(
                    text("""
                        UPDATE alert_outbox
                        SET status    = 'failed',
                            try_count = try_count + 1
                        WHERE id = :id
                    """),
                    [{"id": r.outbox_id} for r in failed_rows],
                )
                log.warning("%d alert(s) failed to send.", len(failed_rows))

    except Exception:
        log.exception("send_risk_alerts failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
