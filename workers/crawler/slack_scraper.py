"""
slack_scraper.py — Slack 채널 메시지를 공지 dict 목록으로 변환하는 모듈.

제공하는 함수:
  fetch_notices(channel_id, lookback_hours) — 지정된 Slack 채널의 최근 메시지를
    읽어 public.notices 테이블 스키마와 일치하는 dict 목록으로 반환한다.

필요한 환경변수:
  SLACK_BOT_TOKEN — Slack Bot OAuth 토큰 (xoxb-...)

필터링 규칙:
  - subtype 이 있는 메시지(편집·삭제·입장 등 시스템 메시지) 제외
  - bot_id 가 있는 봇 메시지 제외
  - text 가 비어있는 메시지 제외

Cloudflare R2 업로드 없음:
  Slack 첨부파일은 인증 없이 접근 불가하므로 image_urls 는 항상 빈 리스트.
"""

from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime, timedelta, timezone

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# 텍스트에서 마감일 날짜 패턴을 탐색하기 위한 정규식 (YYYY-MM-DD 또는 YYYY.MM.DD)
_DATE_RE = re.compile(r"(\d{4})[-./](\d{1,2})[-./](\d{1,2})")


def _parse_deadline(text: str) -> datetime | None:
    """
    텍스트에서 가장 첫 번째로 등장하는 날짜 패턴을 마감일로 파싱한다.

    Input:  text (str) — 메시지 본문
    Output: datetime (UTC-aware) 또는 None
    """
    m = _DATE_RE.search(text)
    if not m:
        return None
    try:
        return datetime(
            int(m.group(1)), int(m.group(2)), int(m.group(3)),
            tzinfo=timezone.utc,
        )
    except ValueError:
        return None


def fetch_notices(channel_id: str, lookback_hours: int = 25) -> list[dict]:
    """
    Slack 채널의 최근 메시지를 가져와 공지 dict 목록으로 반환한다.

    conversations_history API를 페이지네이션하며 호출해 lookback_hours 이내의
    모든 메시지를 수집한다. 필터링 후 각 메시지를 notices 테이블 스키마에 맞는
    dict로 변환한다.

    Input:
        channel_id     (str) — Slack 채널 ID (예: C0XXXXXXX)
        lookback_hours (int) — 조회 기간(시간). 기본값 25 (24h + 1h 버퍼)

    Output:
        list[dict] — 각 dict 는 다음 키를 포함:
            notice_id    (str)            — "slack-{channel_id}-{ts}" 형식
            title        (str)            — 첫 번째 비어있지 않은 줄, 최대 255자
            body         (str)            — 메시지 전체 텍스트
            source       (str)            — "slack" 고정
            hash         (str)            — SHA-256(text) hex digest
            url          (str)            — Slack 퍼머링크 URL
            published_at (datetime)       — UTC-aware datetime
            image_urls   (list[str])      — 항상 [] (Slack 첨부파일은 인증 필요)

    Raises:
        RuntimeError — SLACK_BOT_TOKEN 미설정 또는 Slack API 오류
    """
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        raise RuntimeError("SLACK_BOT_TOKEN is not set in environment")

    client = WebClient(token=token)
    oldest = (
        datetime.now(tz=timezone.utc) - timedelta(hours=lookback_hours)
    ).timestamp()

    raw_messages: list[dict] = []
    cursor: str | None = None

    while True:
        kwargs: dict = {
            "channel": channel_id,
            "oldest": str(oldest),
            "limit": 200,
        }
        if cursor:
            kwargs["cursor"] = cursor

        try:
            resp = client.conversations_history(**kwargs)
        except SlackApiError as exc:
            raise RuntimeError(
                f"Slack API error: {exc.response['error']}"
            ) from exc

        raw_messages.extend(resp.get("messages", []))

        if not resp.get("has_more"):
            break
        cursor = resp["response_metadata"]["next_cursor"]

    notices: list[dict] = []

    for msg in raw_messages:
        # 시스템 메시지(편집·삭제·채널 입장 등) 제외
        if msg.get("subtype"):
            continue
        # 봇 메시지 제외
        if msg.get("bot_id"):
            continue

        text = msg.get("text", "").strip()
        if not text:
            continue

        ts: str = msg["ts"]
        notice_id = f"slack-{channel_id}-{ts}"

        # 첫 번째 비어있지 않은 줄을 제목으로 사용
        first_line = next(
            (line.strip() for line in text.splitlines() if line.strip()),
            text,
        )
        title = first_line[:255]

        hash_val = hashlib.sha256(text.encode()).hexdigest()

        # Slack 퍼머링크: ts의 점(.)을 제거해 p{timestamp} 형식으로 변환
        url = (
            f"https://ajou-international.slack.com/archives"
            f"/{channel_id}/p{ts.replace('.', '')}"
        )

        published_at = datetime.fromtimestamp(float(ts), tz=timezone.utc)

        notices.append(
            {
                "notice_id": notice_id,
                "title": title,
                "body": text,
                "source": "slack",
                "hash": hash_val,
                "url": url,
                "published_at": published_at,
                "image_urls": [],
            }
        )

    return notices
