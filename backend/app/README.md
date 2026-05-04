# backend/app/

## 역할

FastAPI 백엔드 애플리케이션의 핵심 패키지입니다. DB 연결, ORM 모델 정의, API 라우터 등록, 예외 처리 등 서버의 주요 로직이 이 디렉토리에 구현되어 있습니다.

## 파일 구조

```
app/
├── main.py        # FastAPI 앱 진입점, 미들웨어, 라우터 등록
├── database.py    # SQLAlchemy ORM 설정, DB 연결 풀, 세션 팩토리
├── models.py      # SQLAlchemy ORM 모델 (5개 테이블)
├── db_errors.py   # DB 에러 정제(sanitize) 및 로깅 유틸리티
└── routers/       # API 엔드포인트 그룹
```

---

## 파일별 상세 설명

### main.py — FastAPI 앱 진입점

FastAPI 애플리케이션을 초기화하고 CORS 미들웨어, 라우터, 전역 예외 핸들러를 등록합니다.

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `on_startup()` | — | `None` | 앱 시작 시 DB 연결 테스트 실행 |
| `health()` | — | `dict` | `GET /health` — `{"status": "ok"}` 반환 |
| `health_db()` | — | `dict \| JSONResponse` | `GET /health/db` — DB 연결 상태 확인, 실패 시 HTTP 500 반환 |
| `sqlalchemy_error_handler(req, exc)` | `Request, Exception` | `JSONResponse` | SQLAlchemy 예외를 전역으로 처리하여 JSON 에러 응답 반환 |

**등록된 라우터**

- `/auth` — 인증 (auth.py)
- `/` — 키워드 및 공지 (keywords.py, notices.py)

---

### database.py — ORM 및 DB 설정

환경변수 기반의 DB URL 구성, 연결 풀 설정, SQLAlchemy 세션 관리를 담당합니다.

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `_load_env_file()` | — | `None` | `backend/.env` 및 루트 `.env` 파일 로드 |
| `_validate_database_url(url)` | `str` | `None` | DATABASE_URL 형식 검증, 잘못된 경우 `ValueError` 발생 |
| `_read_bool(name, default)` | `str, bool` | `bool` | 환경변수를 bool로 파싱 |
| `_base_database_url()` | — | `str` | `DATABASE_URL` 또는 `DATABASE_URL_POOLER` 반환 |
| `_is_neon_host(url)` | `str` | `bool` | Neon 클라우드 DB 호스트 여부 확인 |
| `_ensure_sslmode_require(url)` | `str` | `str` | 클라우드 DB URL에 `sslmode=require` 파라미터 추가 |
| `get_db()` | — | `Session` (Generator) | FastAPI 의존성 주입용 DB 세션 생성기, 예외 시 rollback |

**전역 변수**

| 변수 | 타입 | 설명 |
|------|------|------|
| `engine` | `Engine` | 연결 풀 설정이 적용된 SQLAlchemy 엔진 |
| `SessionLocal` | `sessionmaker` | 엔진에 바인딩된 세션 팩토리 |
| `Base` | `DeclarativeBase` | ORM 모델의 기본 클래스 |

**관련 환경변수**

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (필수) |
| `DATABASE_URL_POOLER` | 풀링용 연결 문자열 (선택) |
| `DB_REQUIRE_SSL` | SSL 강제 여부 (Neon 사용 시 자동 활성화) |
| `DB_POOL_SIZE` | 연결 풀 크기 (기본: 5) |
| `DB_MAX_OVERFLOW` | 풀 초과 허용 연결 수 (기본: 10) |
| `DB_POOL_TIMEOUT` | 풀 연결 대기 제한 시간(초) |
| `DB_POOL_RECYCLE` | 연결 재사용 주기(초) |

---

### models.py — SQLAlchemy ORM 모델

5개의 데이터베이스 테이블에 대응하는 ORM 클래스를 정의합니다.

#### 클래스: `User` (테이블: `users`)

사용자 계정 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` (PK) | 사용자 고유 식별자 |
| `email` | `str` (unique) | 이메일 주소 |
| `full_name` | `str` | 이름 |
| `password_hash` | `str` | bcrypt 해시 비밀번호 |
| `created_at` | `datetime` | 가입 시각 |

관계: `keyword_subscriptions` → `UserKeyword`

---

#### 클래스: `Notice` (테이블: `notices`)

크롤링된 공지사항 데이터를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `UUID` (PK) | 내부 공지 ID |
| `notice_id` | `str` (unique) | 크롤러가 부여한 외부 ID |
| `keyword_id` | `BigInteger` (FK) | 연결된 키워드 ID |
| `title` | `str` | 공지 제목 |
| `preview` | `str` | 미리보기 텍스트 |
| `body` | `Text` (nullable) | 공지 본문 (한국어) |
| `eng_body` | `Text` (nullable) | 공지 본문 (영어 번역본, Gemini 2.5 Flash 생성) |
| `source` | `str` (nullable) | 출처 |
| `hash` | `str` (nullable) | 중복 방지용 해시 |
| `is_processed` | `bool` | 처리 완료 여부 |
| `deadline` | `date` (nullable) | 마감일 |
| `url` | `str` (nullable) | 원문 URL |
| `published_at` | `datetime` (indexed) | 공지 발행 시각 |
| `created_at` | `datetime` | DB 삽입 시각 |

인덱스: `(keyword_id, published_at)`, `title` (gin_trgm), `preview` (gin_trgm)

---

#### 클래스: `Keyword` (테이블: `keywords`)

구독 가능한 공지 카테고리 키워드 목록입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `BigInteger` (PK) | 키워드 ID |
| `keyword` | `str` (unique) | 키워드 문자열 (예: "학사공지", "입시공지") |

---

#### 클래스: `UserKeyword` (테이블: `user_keywords`)

사용자와 키워드 간의 구독 관계를 나타내는 중간 테이블입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | `UUID` (PK, FK) | 사용자 ID |
| `keyword_id` | `BigInteger` (PK, FK) | 키워드 ID |
| `created_at` | `datetime` | 구독 등록 시각 |

---

#### 클래스: `AlertOutbox` (테이블: `alert_outbox`)

사용자에게 발송해야 할 알림 큐 테이블입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `BigInteger` (PK) | 알림 항목 ID |
| `user_id` | `UUID` (FK) | 수신 사용자 ID |
| `notice_id` | `UUID` (FK) | 대상 공지 ID |
| `status` | `str` | 상태: `"pending"`, `"sent"`, `"failed"` |
| `try_count` | `int` | 발송 시도 횟수 |
| `last_error` | `Text` (nullable) | 마지막 에러 메시지 |
| `created_at` | `datetime` | 큐 삽입 시각 |
| `sent_at` | `datetime` (nullable) | 실제 발송 시각 |

유니크 제약: `(user_id, notice_id)` (중복 알림 방지)
인덱스: `(status, created_at)`

---

### db_errors.py — DB 에러 처리 유틸리티

DB 연결 에러 메시지를 정제하고 로깅하는 함수를 제공합니다.

**함수**

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `sanitize_db_error(exc)` | `Exception` | `str` | 에러 메시지에서 인증정보(비밀번호 등)를 마스킹, 최대 240자 반환 |
| `log_db_exception(context, exc)` | `str, Exception` | `str` | 정제된 에러를 컨텍스트와 함께 로깅, 정제 문자열 반환 |
| `db_connection_failed_response(exc)` | `Exception` | `JSONResponse` | HTTP 500 JSON 응답 반환 (`{"detail": "...", "error": "..."}`) |
