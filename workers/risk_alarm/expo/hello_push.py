"""
workers/risk_alarm/expo/hello_push.py

모든 유저에게 즉시 테스트 푸시 알림을 발송한다.

로컬 실행:
  1) workers/risk_alarm/.env 파일에 DATABASE_URL 을 설정
     DATABASE_URL=postgresql://...  (dev: NEON_DEV_DATABASE_URL 값)
  2) python workers/risk_alarm/expo/hello_push.py

GitHub Actions:
  dev  브랜치 → secrets.NEON_DEV_DATABASE_URL
  prod 브랜치 → secrets.NEON_PROD_DATABASE_URL

Env vars:
  DATABASE_URL       — Neon/PostgreSQL connection string (필수)
  EXPO_ACCESS_TOKEN  — (optional) Expo access token
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from psycopg2.extras import RealDictCursor
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
BATCH_SIZE = 100
MESSAGE = "안녕! 난 AZAN 이야!"


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        log.error("DATABASE_URL 이 설정되지 않음")
        sys.exit(1)

    payload = json.dumps({"alert_type": "hello", "risk_level": 0, "message": MESSAGE})
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if expo_token := os.environ.get("EXPO_ACCESS_TOKEN"):
        headers["Authorization"] = f"Bearer {expo_token}"

    conn = psycopg2.connect(url)
    conn.autocommit = False
    try:
        # ── 1. 유저 조회 ─────────────────────────────────────────────────────
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, expo_push_token, preferred_language
                FROM users
                WHERE expo_push_token IS NOT NULL AND expo_push_token != ''
            """)
            users = cur.fetchall()

        if not users:
            log.info("푸시 토큰이 등록된 유저 없음.")
            return
        log.info("대상 유저 %d명 발견.", len(users))

        # ── 2. alert_outbox INSERT ────────────────────────────────────────────
        with conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO alert_outbox (user_id, notice_id, status, try_count, payload)
                VALUES %s
                RETURNING id, user_id
                """,
                [(str(u["id"]), None, "pending", 0, payload) for u in users],
                template="(%s::uuid, %s, %s, %s, %s::jsonb)",
            )
            inserted = cur.fetchall()  # [(outbox_id, user_id), ...]
        conn.commit()
        log.info("alert_outbox 에 %d행 INSERT 완료.", len(inserted))

        outbox_by_uid = {str(r[1]): r[0] for r in inserted}

        # ── 3. 메시지 빌드 ────────────────────────────────────────────────────
        HELLO_BODY: dict[str, str] = {
            "Korean": "안녕! 난 AZAN 이야!",
            "English": "Hello, I'm AZAN! How can I help you?",
        }
        valid_users, messages = [], []
        for u in users:
            token = u["expo_push_token"]
            if not token.startswith("ExponentPushToken["):
                log.warning("[SKIP] user %s: 토큰 형식 오류", u["id"])
                continue
            lang = u.get("preferred_language") or "English"
            body = HELLO_BODY.get(lang, MESSAGE)
            messages.append({
                "to": token,
                "title": "AZAN",
                "body": body,
                "sound": "default",
                "badge": 1,
                "data": {
                    "alert_type": "hello",
                    "risk_level": 0,
                    "message": body,
                },
            })
            valid_users.append(u)

        # ── 4. Expo 배치 전송 ────────────────────────────────────────────────
        sent_uids, failed_uids = [], []
        ticket_id_by_uid: dict[str, str] = {}  # uid → Expo ticket id (for receipt check)
        for i in range(0, len(messages), BATCH_SIZE):
            batch_msgs  = messages[i : i + BATCH_SIZE]
            batch_users = valid_users[i : i + BATCH_SIZE]
            try:
                resp = requests.post(EXPO_PUSH_URL, json=batch_msgs, headers=headers, timeout=15)
                resp.raise_for_status()
                body = resp.json()
                tickets = body.get("data", [])
                log.info("배치 %d HTTP 200 수신 (%d건) | 전체 응답: %s", i // BATCH_SIZE + 1, len(batch_msgs), json.dumps(body, ensure_ascii=False))
                for j, ticket in enumerate(tickets):
                    if j >= len(batch_users):
                        break
                    uid = str(batch_users[j]["id"])
                    if ticket.get("status") == "ok":
                        tid = ticket.get("id", "")
                        log.info("  ✓ user %s → ticket_id=%s", uid, tid)
                        sent_uids.append(uid)
                        if tid:
                            ticket_id_by_uid[uid] = tid
                    else:
                        err_code = ticket.get("details", {}).get("error", "unknown")
                        err_msg  = ticket.get("message", "")
                        log.error("  ✗ user %s → %s: %s", uid, err_code, err_msg)
                        failed_uids.append(uid)
                for j in range(len(tickets), len(batch_users)):
                    uid = str(batch_users[j]["id"])
                    log.error("  ✗ user %s → 응답 ticket 없음", uid)
                    failed_uids.append(uid)
            except Exception as exc:
                log.error("배치 %d 전송 실패: %s", i // BATCH_SIZE + 1, exc)
                failed_uids.extend(str(u["id"]) for u in batch_users)

        # ── 4-1. Expo 영수증 확인 (APNS/FCM 실제 전달 여부) ─────────────────
        if ticket_id_by_uid:
            log.info("━━ Expo 영수증 확인 (20초 대기 중...) ━━")
            time.sleep(20)
            try:
                r = requests.post(
                    EXPO_RECEIPTS_URL,
                    json={"ids": list(ticket_id_by_uid.values())},
                    headers=headers,
                    timeout=15,
                )
                r.raise_for_status()
                receipts = r.json().get("data", {})
                for uid, tid in ticket_id_by_uid.items():
                    receipt = receipts.get(tid)
                    if receipt is None:
                        log.warning("  [영수증 없음] uid=%s ticket=%s (아직 처리 중일 수 있음)", uid, tid)
                    elif receipt.get("status") == "error":
                        err  = receipt.get("details", {}).get("error", "?")
                        msg  = receipt.get("message", "")
                        log.error("  [배달 실패] uid=%s error=%s — %s", uid, err, msg)
                    else:
                        log.info("  [배달 성공] uid=%s ticket=%s", uid, tid)
            except Exception as exc:
                log.warning("영수증 확인 실패: %s", exc)

        # ── 5. alert_outbox status 업데이트 ──────────────────────────────────
        now = datetime.now(timezone.utc)
        with conn.cursor() as cur:
            if sent_uids:
                sent_ids = [outbox_by_uid[uid] for uid in sent_uids if uid in outbox_by_uid]
                cur.execute(
                    "UPDATE alert_outbox SET status = 'sent', sent_at = %s WHERE id = ANY(%s)",
                    (now, sent_ids),
                )
            if failed_uids:
                fail_ids = [outbox_by_uid[uid] for uid in failed_uids if uid in outbox_by_uid]
                cur.execute(
                    "UPDATE alert_outbox SET status = 'failed', try_count = try_count + 1 WHERE id = ANY(%s)",
                    (fail_ids,),
                )
        conn.commit()
        log.info("완료. 성공 %d명 / 실패 %d명", len(sent_uids), len(failed_uids))

    except Exception:
        conn.rollback()
        log.exception("hello_push 실패")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
