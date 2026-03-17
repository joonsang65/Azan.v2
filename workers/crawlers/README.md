# workers/crawlers/

## 역할

아주대학교 공지사항 게시판을 주기적으로 크롤링하여 `notices` 테이블에 저장하는 백그라운드 워커 모듈입니다. 현재는 스텁(구조 설계) 단계입니다.

## 예정 기능

- 키워드별 공지사항 URL 순회 크롤링
- HTML 파싱 및 공지 제목, 본문, 발행일, URL 추출
- `hash` 필드를 이용한 중복 공지 감지
- 신규 공지 DB 삽입 후 `alert_outbox` 큐 자동 삽입 트리거

## 구현 시 참고 사항

- 공지 삽입은 `POST /notices` API 또는 직접 SQLAlchemy ORM을 통해 수행
- 크롤링 주기는 cron 또는 APScheduler 등을 사용하여 스케줄링 예정
- `notice_id` 필드를 외부 게시판 ID로 사용하여 중복 방지
