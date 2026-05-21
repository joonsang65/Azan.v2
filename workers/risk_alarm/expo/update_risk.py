"""
workers/risk_alarm/expo/update_risk.py

Calculates visa_risk and topik_risk for all eligible users, then populates
alert_outbox for users who meet the send-frequency threshold.

Risk calculation + outbox INSERT run in a single atomic transaction.

Env vars:
  DATABASE_URL  — Neon/PostgreSQL connection string
  FORCE_SEND    — set to "true" to bypass last_notified_at frequency gates
                  (useful for manual test runs)
"""

import json
import logging
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Allow sibling imports when run as a script
sys.path.insert(0, str(Path(__file__).parent))
from msg_templates import TOPIK_TEMPLATES, VISA_TEMPLATES

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# When True, skip last_notified_at frequency gates and queue alerts for all eligible users.
FORCE_SEND: bool = os.environ.get("FORCE_SEND", "").lower() in ("1", "true", "yes")

# D-2 visa admission deadline for TOPIK requirement
D2_DEADLINE = date(2026, 9, 1)


def _get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        log.error("DATABASE_URL is not set")
        sys.exit(1)
    return create_engine(url, future=True, pool_pre_ping=True)


# ---------------------------------------------------------------------------
# Risk calculators
# ---------------------------------------------------------------------------

def calc_visa_risk(days_left: int) -> int:
    if days_left > 90:
        return 1
    if days_left > 60:
        return 2
    if days_left > 40:
        return 3
    if days_left > 7:
        return 4
    return 5


def calc_topik_risk(topik_level: int | None, days_to_deadline: int) -> int:
    if topik_level is not None and topik_level >= 3:
        return 0  # Clear — no notification needed
    if days_to_deadline > 120:
        return 1
    if days_to_deadline > 90:
        return 2
    return 3


# ---------------------------------------------------------------------------
# Send-frequency gates
# ---------------------------------------------------------------------------

def _should_send_visa(
    risk: int,
    days_left: int,
    last_notified: date | None,
    today: date,
) -> bool:
    if last_notified is None:
        return True
    days_since = (today - last_notified).days
    if risk == 1:
        return days_since >= 30
    if risk in (2, 3):
        return days_since >= 7
    if risk == 4:
        # Force-send on exactly D-40 even if recently notified
        return days_since >= 3 or days_left == 40
    # risk == 5
    return days_since >= 1


def _should_send_topik(
    risk: int,
    last_notified: date | None,
    today: date,
) -> bool:
    if risk == 0:
        return False
    if last_notified is None:
        return True
    days_since = (today - last_notified).days
    if risk == 1:
        return days_since >= 30
    if risk == 2:
        return days_since >= 7
    # risk == 3
    return days_since >= 3


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    engine = _get_engine()
    today = date.today()
    days_to_deadline = (D2_DEADLINE - today).days

    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT
                    id,
                    visa_type,
                    visa_expiry_date,
                    topik_level,
                    visa_last_notified_at,
                    topik_last_notified_at
                FROM users
                WHERE visa_expiry_date IS NOT NULL
                   OR visa_type = 'D-4'
            """)).fetchall()

            if not rows:
                log.info("No eligible users found.")
                return

            if FORCE_SEND:
                log.info("FORCE_SEND=true — frequency gates are disabled for this run.")

            log.info("Evaluating %d user(s).", len(rows))

            # Fetch existing pending risk-alert rows to avoid duplicates
            pending_rows = conn.execute(text("""
                SELECT user_id::text, payload->>'alert_type' AS alert_type
                FROM alert_outbox
                WHERE status = 'pending' AND notice_id IS NULL
            """)).fetchall()
            pending_set: set[tuple[str, str]] = {
                (r.user_id, r.alert_type) for r in pending_rows
            }

            user_risk_updates: list[dict[str, Any]] = []
            outbox_inserts: list[dict[str, Any]] = []

            for row in rows:
                uid = str(row.id)
                visa_risk: int | None = None
                topik_risk: int | None = None

                # --- Visa risk ---
                if row.visa_expiry_date is not None:
                    days_left = (row.visa_expiry_date - today).days
                    visa_risk = calc_visa_risk(days_left)

                    if FORCE_SEND or _should_send_visa(visa_risk, days_left, row.visa_last_notified_at, today):
                        if (uid, "visa") not in pending_set:
                            msg = VISA_TEMPLATES[visa_risk]
                            if visa_risk == 2:
                                msg = msg.format(days_left=days_left)
                            outbox_inserts.append({
                                "user_id": uid,
                                "payload": json.dumps({
                                    "alert_type": "visa",
                                    "risk_level": visa_risk,
                                    "message": msg,
                                }),
                            })

                # --- TOPIK risk (D-4 visa holders only) ---
                if row.visa_type == "D-4":
                    topik_level_int: int | None = None
                    if row.topik_level is not None:
                        try:
                            topik_level_int = int(row.topik_level)
                        except (ValueError, TypeError):
                            log.warning(
                                "Cannot parse topik_level=%r for user %s — treating as None",
                                row.topik_level,
                                uid,
                            )

                    topik_risk = calc_topik_risk(topik_level_int, days_to_deadline)

                    if topik_risk > 0 and (FORCE_SEND or _should_send_topik(topik_risk, row.topik_last_notified_at, today)):
                        if (uid, "topik") not in pending_set:
                            outbox_inserts.append({
                                "user_id": uid,
                                "payload": json.dumps({
                                    "alert_type": "topik",
                                    "risk_level": topik_risk,
                                    "message": TOPIK_TEMPLATES[topik_risk],
                                }),
                            })

                user_risk_updates.append({
                    "id": uid,
                    "visa_risk": visa_risk,
                    "topik_risk": topik_risk,
                })

            # Bulk UPDATE risk scores (skipped in FORCE_SEND / test mode)
            if user_risk_updates and not FORCE_SEND:
                conn.execute(
                    text("""
                        UPDATE users
                        SET visa_risk  = :visa_risk,
                            topik_risk = :topik_risk
                        WHERE id = :id::uuid
                    """),
                    user_risk_updates,
                )
                log.info("Updated risk scores for %d user(s).", len(user_risk_updates))
            elif FORCE_SEND:
                log.info("FORCE_SEND=true — skipping visa_risk/topik_risk column update.")

            # Bulk INSERT outbox rows for users that meet send threshold
            if outbox_inserts:
                conn.execute(
                    text("""
                        INSERT INTO alert_outbox (user_id, status, try_count, payload)
                        VALUES (:user_id::uuid, 'pending', 0, :payload::jsonb)
                    """),
                    outbox_inserts,
                )
                log.info("Queued %d alert(s) in outbox.", len(outbox_inserts))
            else:
                log.info("No new alerts to queue.")

    except Exception:
        log.exception("update_risk failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
