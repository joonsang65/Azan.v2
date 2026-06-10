"""
test_random2.py — 프로토타입 시연용 랜덤 공지 푸시 알람

각 사용자의 구독 키워드(user_keywords)를 읽어,
키워드별로 랜덤 2개 공지를 선택해 Expo Push API로 발송.

환경변수:
  DATABASE_URL — NeonDB 연결 문자열
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

DATABASE_URL = os.environ.get("DATABASE_URL")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
NOTICES_PER_KEYWORD = 2


def fetch_users_with_keywords(conn):
    """expo_push_token이 있는 사용자와 구독 키워드, 선호 언어 조회"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT
                u.id                AS user_id,
                u.expo_push_token,
                u.preferred_language,
                k.id                AS keyword_id,
                k.keyword
            FROM users u
            JOIN user_keywords uk ON uk.user_id = u.id
            JOIN keywords k       ON k.id = uk.keyword_id
            WHERE u.expo_push_token IS NOT NULL
              AND u.expo_push_token != ''
              AND u.expo_push_token LIKE 'ExponentPushToken%'
            ORDER BY u.id, k.keyword
        """)
        return cur.fetchall()


def fetch_random_notices(conn, keyword_id, prefer_english=False, limit=NOTICES_PER_KEYWORD):
    """키워드 ID에 해당하는 공지 랜덤 N개 조회 (eng_body 포함)"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if prefer_english:
            # eng_body 있는 공지 우선, 부족하면 나머지로 채움
            cur.execute("""
                (
                    SELECT id, title, preview, eng_body
                    FROM notices
                    WHERE keyword_id = %s
                      AND title IS NOT NULL
                      AND body IS NOT NULL
                      AND eng_body IS NOT NULL
                      AND eng_body != ''
                    ORDER BY RANDOM()
                    LIMIT %s
                )
                UNION ALL
                (
                    SELECT id, title, preview, eng_body
                    FROM notices
                    WHERE keyword_id = %s
                      AND title IS NOT NULL
                      AND body IS NOT NULL
                      AND (eng_body IS NULL OR eng_body = '')
                    ORDER BY RANDOM()
                    LIMIT %s
                )
                LIMIT %s
            """, (keyword_id, limit, keyword_id, limit, limit))
        else:
            cur.execute("""
                SELECT id, title, preview, eng_body
                FROM notices
                WHERE keyword_id = %s
                  AND title IS NOT NULL
                  AND body IS NOT NULL
                ORDER BY RANDOM()
                LIMIT %s
            """, (keyword_id, limit))
        return cur.fetchall()


def build_messages(rows, conn):
    """(user, keyword) 조합별로 랜덤 공지 2개씩 메시지 생성"""
    messages = []

    # (user_id, keyword_id) 단위로 그룹핑
    seen = set()
    for row in rows:
        key = (str(row["user_id"]), row["keyword_id"])
        if key in seen:
            continue
        seen.add(key)

        token = row["expo_push_token"]
        keyword = row["keyword"]
        keyword_id = row["keyword_id"]
        is_english = (row.get("preferred_language") or "").lower() == "english"

        notices = fetch_random_notices(conn, keyword_id, prefer_english=is_english)
        if not notices:
            print(f"  [{keyword}] 해당 공지 없음, 건너뜀")
            continue

        for notice in notices:
            title_text = (notice["title"] or "새 공지사항")[:60]

            if is_english and notice.get("eng_body"):
                body_text = notice["eng_body"][:120]
            else:
                body_text = (notice["preview"] or title_text)[:120]

            messages.append({
                "to": token,
                "title": f"[{keyword}] {title_text}",
                "body": body_text,
                "sound": "default",
                "data": {"notice_id": str(notice["id"])},
            })
            print(f"  [{keyword}] {'(EN)' if is_english else '(KO)'} {title_text[:40]}...")

    return messages


def send_messages(messages):
    if not messages:
        print("보낼 메시지가 없습니다.")
        return

    print(f"\n총 {len(messages)}개 알람 발송 중...")
    for i in range(0, len(messages), 100):
        batch = messages[i : i + 100]
        try:
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
            tickets = result.get("data", [])
            errors = [(j, t) for j, t in enumerate(tickets) if t.get("status") == "error"]
            ok_count = len(tickets) - len(errors)
            print(f"[Batch {i // 100 + 1}] 성공: {ok_count}개, 실패: {len(errors)}개")
            for j, ticket in errors:
                print(f"  ❌ [{j}] {ticket.get('message')} | details: {ticket.get('details')}")
        except Exception as exc:
            print(f"[Batch {i // 100 + 1}] 발송 실패: {exc}")


def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL이 설정되지 않았습니다.", file=sys.stderr)
        sys.exit(1)

    print("DB 연결 중...")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        rows = fetch_users_with_keywords(conn)
        if not rows:
            print("푸시 토큰이 있는 구독 사용자가 없습니다.")
            return

        user_count = len({str(r["user_id"]) for r in rows})
        print(f"대상 사용자: {user_count}명, 구독 (user×keyword) 쌍: {len(rows)}개\n")

        messages = build_messages(rows, conn)
        send_messages(messages)
        print("\n완료.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
