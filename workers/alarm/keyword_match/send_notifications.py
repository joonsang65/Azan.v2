"""
workers/alarm/keyword_match/send_notifications.py

Fetches the most recent notices for each user's subscribed keywords
and sends push notifications via the Expo Push API.

Env vars required:
  DATABASE_URL  — Neon (or any PostgreSQL) connection string
"""

import os
import sys
from collections import defaultdict

import psycopg2
from psycopg2.extras import RealDictCursor
import requests

DATABASE_URL = os.environ.get("DATABASE_URL")
MAX_NOTICES_PER_USER = 3
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def fetch_user_notices(conn: psycopg2.extensions.connection) -> dict:
    """
    Returns { user_id: [row, ...] } where each list contains at most
    MAX_NOTICES_PER_USER rows, sorted by published_at DESC.
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                u.id            AS user_id,
                u.expo_push_token,
                n.id            AS notice_id,
                n.title,
                n.preview,
                k.keyword,
                n.published_at
            FROM users u
            JOIN user_keywords uk ON uk.user_id = u.id
            JOIN notices n        ON n.keyword_id = uk.keyword_id
            JOIN keywords k       ON k.id = n.keyword_id
            WHERE u.expo_push_token IS NOT NULL
              AND u.expo_push_token != ''
            ORDER BY u.id, n.published_at DESC
        """)
        rows = cur.fetchall()

    user_notices: dict = defaultdict(list)
    for row in rows:
        uid = str(row["user_id"])
        if len(user_notices[uid]) < MAX_NOTICES_PER_USER:
            user_notices[uid].append(dict(row))

    return user_notices


def build_messages(user_notices: dict) -> list:
    messages = []
    for uid, notices in user_notices.items():
        token = notices[0]["expo_push_token"]
        if not token or not token.startswith("ExponentPushToken"):
            print(f"[SKIP] user {uid}: invalid token format")
            continue

        if len(notices) == 1:
            n = notices[0]
            title = f"[{n['keyword']}] 새 공지사항"
            body = n["title"]
        else:
            count = len(notices)
            keywords = list(dict.fromkeys(n["keyword"] for n in notices))
            title = f"새 공지사항 {count}건 — {', '.join(keywords)}"
            body = notices[0]["title"]

        messages.append({
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "data": {
                "notice_ids": [str(n["notice_id"]) for n in notices],
            },
        })
    return messages


def send_messages(messages: list) -> None:
    if not messages:
        print("No messages to send.")
        return

    # Expo accepts up to 100 messages per request
    for i in range(0, len(messages), 100):
        batch = messages[i : i + 100]
        resp = requests.post(
            EXPO_PUSH_URL,
            json=batch,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        result = resp.json()
        print(f"[Batch {i // 100 + 1}] Sent {len(batch)} message(s): {result}")


def main() -> None:
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        user_notices = fetch_user_notices(conn)
        print(f"Found {len(user_notices)} user(s) with push tokens and keyword subscriptions.")

        messages = build_messages(user_notices)
        print(f"Sending {len(messages)} push notification(s)...")
        send_messages(messages)
        print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
