# backend/app/routers/

## 역할

FastAPI 라우터 모듈 디렉토리입니다. API 엔드포인트를 기능 단위로 분리하여 관리합니다.

## 파일 구조

```
routers/
├── auth.py      # 인증 API (회원가입, 로그인, 내 정보 조회)
├── keywords.py  # 키워드 CRUD 및 사용자 구독 관리 API
├── notices.py   # 공지사항 CRUD 및 알림 큐 API
└── __init__.py
```

---

## 파일별 상세 설명

### auth.py — 인증 API

JWT 기반 회원가입, 로그인, 사용자 정보 조회 엔드포인트를 제공합니다.

**Pydantic 모델 (요청 스키마)**

| 클래스 | 필드 | 설명 |
|--------|------|------|
| `RegisterRequest` | `email: str`, `full_name: str`, `password: str` | 회원가입 요청 본문 |
| `LoginRequest` | `email: str`, `password: str` | 로그인 요청 본문 |

**내부 헬퍼 함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `_validate_email(email)` | `str` | `str` | 이메일 정규화 및 형식 검증, 잘못된 형식이면 HTTP 422 발생 |
| `_create_access_token(user_id)` | `UUID` | `str` | HS256 알고리즘으로 JWT 생성, 유효기간 7일 |
| `_decode_bearer_token(auth_header)` | `str` | `str` | Authorization 헤더에서 Bearer 토큰 추출 및 검증 |
| `_parse_user_id(user_id_str)` | `str` | `UUID` | 토큰 subject 문자열을 UUID로 변환 |

**엔드포인트**

| 메서드 | 경로 | 입력 | 출력 | 설명 |
|--------|------|------|------|------|
| `POST` | `/auth/register` | `RegisterRequest` | `{id, email}` | 사용자 등록, 비밀번호 bcrypt 해싱 후 DB 저장 |
| `POST` | `/auth/login` | `LoginRequest` | `{access_token, token_type}` | 자격증명 검증 후 JWT 반환 |
| `GET` | `/auth/me` | `Authorization: Bearer <token>` | `{id, email, full_name}` | 인증된 사용자 프로필 반환 |

---

### keywords.py — 키워드 API

전체 키워드 목록 조회 및 사용자별 키워드 구독 관리 API를 제공합니다.

**Pydantic 모델**

| 클래스 | 필드 | 설명 |
|--------|------|------|
| `UserKeywordUpsertRequest` | `keyword_ids?: list[int]` | 키워드 추가(upsert) 요청 |
| `UserMyKeywordsUpdateRequest` | `enabled: list[int]` | 내 키워드 전체 업데이트 요청 |

**내부 헬퍼 함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `_user_keywords_payload(user, db)` | `User, Session` | `list[{id, keyword}]` | 사용자의 현재 구독 키워드 목록 반환 |

**엔드포인트**

| 메서드 | 경로 | 입력 | 출력 | 설명 |
|--------|------|------|------|------|
| `GET` | `/keywords` | — | `list[{id, keyword}]` | 전체 키워드 목록 조회 |
| `GET` | `/users/me/keywords` | Bearer 토큰 | `{enabled: list[int]}` | 내 구독 키워드 ID 목록 조회 |
| `PUT` | `/users/me/keywords` | Bearer 토큰, `{enabled: list[int]}` | `{enabled: list[int]}` | 내 구독 키워드 전체 교체 |
| `GET` | `/users/{user_id}/keywords` | `user_id: UUID` | `list[{id, keyword}]` | 특정 사용자의 구독 키워드 조회 |
| `POST` | `/users/{user_id}/keywords` | `user_id: UUID`, `UserKeywordUpsertRequest` | `list[...]` | 사용자에게 키워드 추가 (중복 제외) |
| `DELETE` | `/users/{user_id}/keywords/{keyword_id}` | `user_id: UUID`, `keyword_id: int` | `{status}` | 특정 키워드 구독 해제 |

---

### notices.py — 공지사항 API

공지사항 목록 조회, 생성, 상세 조회 및 알림 큐 삽입 API를 제공합니다.

**Pydantic 모델**

| 클래스 | 필드 | 설명 |
|--------|------|------|
| `NoticeCreateRequest` | `notice_id?`, `keyword_id?`, `title`, `body`, `eng_body?`, `preview?`, `source?`, `url?`, `hash?`, `is_processed?`, `deadline?`, `published_at?` | 공지 생성 요청 본문 |

**내부 헬퍼 함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `_preview_from_body(body)` | `str` | `str` | 본문 앞 140자를 미리보기 텍스트로 추출 |
| `_queue_alerts_for_notice(db, notice_uuid)` | `Session, UUID` | `int` | 해당 공지의 키워드를 구독 중인 모든 사용자에게 알림 큐(`alert_outbox`) 삽입, 삽입된 행 수 반환 |

**엔드포인트**

| 메서드 | 경로 | 입력 | 출력 | 설명 |
|--------|------|------|------|------|
| `GET` | `/notices` | `keyword_id?`, `q?`, `limit`, `offset` | `{items: list, total, limit, offset}` | 공지 목록 조회. 키워드 필터 및 제목/미리보기/본문 전문 검색 지원 |
| `POST` | `/notices` | `NoticeCreateRequest` | `{id, notice_id, title, keyword_id, keyword, queued_alerts}` | 공지 생성 후 구독자에게 알림 큐 삽입 |
| `GET` | `/notices/{notice_id}` | `notice_id: UUID` | `{id, title, body, eng_body, preview, url, keyword_id, keyword, published_at}` | 공지 상세 조회 |

**쿼리 파라미터 (`GET /notices`)**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `keyword_id` | `int?` | — | 특정 키워드로 필터 |
| `q` | `str?` | — | 제목/미리보기/본문 검색어 (PostgreSQL `ILIKE`) |
| `limit` | `int` | 20 (1~100) | 페이지당 항목 수 |
| `offset` | `int` | 0 | 오프셋 페이지네이션 |
