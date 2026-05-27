"""
workers/alarm/keyword_match/send_notifications.py

Fetches pending notices from alert_outbox and sends push notifications
via the Expo Push API using an adaptive algorithm:
  1. Golden Time (Activity-Aware): Only sends between 08:00-22:00 KST.
  2. Interest-Driven Aggregation:
     - High interest (based on read history): Individual detailed alerts.
     - Low interest: Grouped/Aggregated alerts.

Env vars:
  DATABASE_URL  — Neon (or any PostgreSQL) connection string
"""

import os
import sys
from collections import defaultdict
from datetime import datetime, timezone, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor
import requests

DATABASE_URL = os.environ.get("DATABASE_URL")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Adaptive Config
GOLDEN_TIME_START = 8  # 08:00 KST
GOLDEN_TIME_END = 22   # 22:00 KST
HIGH_INTEREST_THRESHOLD = 2  # Reads >= 2
MAX_PENDING_PER_USER = 10
MAX_AGGREGATED_NOTICES = 5


def is_golden_time() -> bool:
    """Checks if current time is within 08:00-22:00 KST."""
    kst = timezone(timedelta(hours=9))
    now_kst = datetime.now(timezone.utc).astimezone(kst)
    return GOLDEN_TIME_START <= now_kst.hour < GOLDEN_TIME_END


def fetch_user_notices(conn: psycopg2.extensions.connection) -> dict:
    """
    Returns { user_id: [row, ...] } where each list contains pending notices.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                ao.id           AS outbox_id,
                u.id            AS user_id,
                u.expo_push_token,
                n.id            AS notice_id,
                n.title,
                n.preview,
                k.keyword,
                k.id            AS keyword_id,
                n.published_at
            FROM alert_outbox ao
            JOIN users u          ON u.id = ao.user_id
            JOIN notices n        ON n.id = ao.notice_id
            JOIN keywords k       ON k.id = n.keyword_id
            WHERE ao.status = 'pending'
              AND ao.notice_id IS NOT NULL
              AND u.expo_push_token IS NOT NULL
              AND u.expo_push_token != ''
            ORDER BY u.id, n.published_at DESC
        """)
        rows = cur.fetchall()

    user_notices: dict = defaultdict(list)
    for row in rows:
        uid = str(row["user_id"])
        if len(user_notices[uid]) < MAX_PENDING_PER_USER:
            user_notices[uid].append(dict(row))

    return user_notices


def fetch_user_keyword_interests(conn: psycopg2.extensions.connection, user_ids: list) -> dict:
    """
    Returns { user_id: { keyword_id: read_count } }
    """
    if not user_ids:
        return {}
    
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                unr.user_id,
                n.keyword_id,
                COUNT(*) as read_count
            FROM user_notice_reads unr
            JOIN notices n ON n.id = unr.notice_id
            WHERE unr.user_id = ANY(%s)
            GROUP BY unr.user_id, n.keyword_id
        """, (user_ids,))
        rows = cur.fetchall()
    
    interests = defaultdict(lambda: defaultdict(int))
    for row in rows:
        uid = str(row["user_id"])
        kid = row["keyword_id"]
        interests[uid][kid] = row["read_count"]
    return interests


def build_messages(user_notices: dict, user_interests: dict) -> list:
    """
    Adaptive message building:
    - High Interest: Individual notifications.
    - Low Interest: Aggregated notifications.
    """
    results = []
    for uid, notices in user_notices.items():
        token = notices[0]["expo_push_token"]
        if not token or not token.startswith("ExponentPushToken"):
            continue

        interests = user_interests.get(uid, {})
        
        high_interest = []
        low_interest = []
        
        for n in notices:
            read_count = interests.get(n["keyword_id"], 0)
            if read_count >= HIGH_INTEREST_THRESHOLD:
                high_interest.append(n)
            else:
                low_interest.append(n)
        
        # 1. Handle High Interest: One notification per notice
        for n in high_interest:
            results.append({
                "message": {
                    "to": token,
                    "title": f"[{n['keyword']}] {n['title']}",
                    "body": n["preview"][:120] + "...",
                    "sound": "default",
                    "data": {"notice_ids": [str(n["notice_id"])]},
                },
                "outbox_ids": [n["outbox_id"]]
            })
            
        # 2. Handle Low Interest: Aggregated notification
        if low_interest:
            # Limit low interest aggregation to MAX_AGGREGATED_NOTICES
            to_aggregate = low_interest[:MAX_AGGREGATED_NOTICES]
            outbox_ids = [n["outbox_id"] for n in to_aggregate]
            
            if len(to_aggregate) == 1:
                n = to_aggregate[0]
                title = f"[{n['keyword']}] 새 공지사항"
                body = n["title"]
            else:
                count = len(to_aggregate)
                keywords = list(dict.fromkeys(n["keyword"] for n in to_aggregate))
                title = f"새 공지사항 {count}건 — {', '.join(keywords)}"
                body = to_aggregate[0]["title"]

            results.append({
                "message": {
                    "to": token,
                    "title": title,
                    "body": body,
                    "sound": "default",
                    "data": {
                        "notice_ids": [str(n["notice_id"]) for n in to_aggregate],
                    },
                },
                "outbox_ids": outbox_ids
            })
            
    return results


def send_messages(conn: psycopg2.extensions.connection, message_data: list) -> None:
    if not message_data:
        print("No messages to send.")
        return

    for i in range(0, len(message_data), 100):
        batch_data = message_data[i : i + 100]
        batch_msgs = [d["message"] for d in batch_data]
        
        sent_ids = []
        failed_ids = []
        
        try:
            resp = requests.post(
                EXPO_PUSH_URL,
                json=batch_msgs,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            for d in batch_data:
                sent_ids.extend(d["outbox_ids"])
            print(f"[Batch {i // 100 + 1}] Sent {len(batch_msgs)} message(s)")
        except Exception as exc:
            print(f"[Batch {i // 100 + 1}] Failed: {exc}")
            for d in batch_data:
                failed_ids.extend(d["outbox_ids"])

        with conn.cursor() as cur:
            if sent_ids:
                cur.execute("UPDATE alert_outbox SET status = 'sent', sent_at = NOW() WHERE id = ANY(%s)", (sent_ids,))
            if failed_ids:
                cur.execute("UPDATE alert_outbox SET status = 'failed', try_count = try_count + 1 WHERE id = ANY(%s)", (failed_ids,))
        conn.commit()


def main() -> None:
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL is not set.", file=sys.stderr)
        sys.exit(1)

    if not is_golden_time():
        print(f"Outside golden time ({GOLDEN_TIME_START}:00-{GOLDEN_TIME_END}:00 KST). Deferred.")
        return

    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        user_notices = fetch_user_notices(conn)
        if not user_notices:
            print("No pending notices.")
            return

        user_ids = list(user_notices.keys())
        user_interests = fetch_user_keyword_interests(conn, user_ids)
        
        message_data = build_messages(user_notices, user_interests)
        print(f"Sending {len(message_data)} adaptive notifications...")
        send_messages(conn, message_data)
        print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
