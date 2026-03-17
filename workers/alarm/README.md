# workers/alarm/

## 역할

`alert_outbox` 테이블에 쌓인 알림 항목을 처리하여 사용자에게 푸시 알림 또는 기타 채널로 알림을 발송하는 백그라운드 워커 모듈입니다. 현재는 스텁(구조 설계) 단계입니다.

## 예정 기능

- `alert_outbox` 테이블에서 `status = "pending"` 항목을 주기적으로 폴링
- 각 항목에 대해 대상 사용자에게 알림 발송 (푸시 알림 / 이메일 등)
- 발송 성공 시 `status = "sent"`, `sent_at` 업데이트
- 발송 실패 시 `status = "failed"`, `last_error` 기록, `try_count` 증가
- 최대 재시도 횟수 초과 시 영구 실패 처리

## 알림 흐름

```
POST /notices (공지 생성)
    ↓
_queue_alerts_for_notice() → alert_outbox 삽입
    ↓
alarm worker → pending 항목 감지 → 알림 발송 → status 업데이트
```

## 구현 시 참고 사항

- 푸시 알림은 Expo Push Notification API 또는 FCM(Firebase Cloud Messaging) 사용 예정
- 워커 스케줄링은 APScheduler 또는 Celery 사용 예정
- `alert_outbox` 스키마: `(id, user_id, notice_id, status, try_count, last_error, created_at, sent_at)`
