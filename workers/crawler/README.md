# Ajou Notice Crawler

아주대학교 공지사항 웹 페이지를 크롤링하여 Neon DB의 `notices` 테이블에 저장하는 워커.

## 실행 방법

```bash
cd workers/
python -m crawler.main
```

옵션 (`run.py` 사용 시):
```bash
python workers/crawler/run.py --pages 5
python workers/crawler/run.py --source 일반공지
python workers/crawler/run.py --pages 1 --dry-run
```

---

## Slack Crawler

`#ajou-전체공지방` Slack 채널을 매일 08:00 KST (UTC 23:00)에 GitHub Actions로 크롤링한다.

### Required Secrets (GitHub Actions)

| Secret | Description |
|--------|-------------|
| `SLACK_BOT_TOKEN` | Bot token from api.slack.com/apps (xoxb-...) |
| `NEON_PROD_DATABASE_URL` | Neon production DB connection string |
| `SLACK_CHANNEL_ID` | Slack channel ID (right-click channel → Copy ID) |

### Required Slack Bot Scopes

- `channels:history`
- `channels:read`

The bot must be invited to `#ajou-전체공지방`.

### Local testing

```bash
export SLACK_BOT_TOKEN=xoxb-...
export DATABASE_URL=postgresql://...
export SLACK_CHANNEL_ID=C0XXXXXXX
python workers/crawler/slack_main.py
```
