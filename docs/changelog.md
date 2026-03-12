## 2026-03-12

- DB 스키마: `categories` 제거, `keywords` 단순화(`keyword`만 유지), `notices.keyword_id` FK 도입
- 마이그레이션: `b12d9c3e7a01`, `c3f2a6d8b1c0` 추가 및 런타임 DDL 제거
- API: 카테고리 기반 필터/응답 제거, 키워드 ID 기반 매칭으로 정리
- 프론트: 키워드 ID 캐시/설정/필터로 전환, UI는 `keyword` 표시
- 정리: 시드/튜토리얼/레거시 DB 스크립트 관련 파일 정리
