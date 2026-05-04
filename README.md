# azan monorepo

Ajou International 공지/키워드 기반 알림 서비스를 위한 모노레포입니다.
FastAPI 백엔드, React Native(Expo) 앱, 그리고 워커/배치 구성요소를 포함합니다.
DB 스키마 관리는 Alembic 마이그레이션으로만 수행합니다.

## 폴더 구조 (트리)

```text
.
├─ backend/                 # FastAPI 백엔드
│  ├─ app/                  # 앱 본체
│  │  ├─ main.py             # FastAPI 엔트리포인트, 라우터 등록
│  │  ├─ database.py         # DB 연결/세션 관리
│  │  ├─ models.py           # ORM 모델 정의
│  │  ├─ db_errors.py        # DB 오류 처리 유틸
│  │  └─ routers/            # API 라우터
│  │     ├─ auth.py          # 회원가입/로그인/JWT
│  │     ├─ keywords.py      # 키워드 구독/조회
│  │     └─ notices.py       # 공지 조회/생성
│  ├─ alembic/               # 마이그레이션
│  │  ├─ env.py              # Alembic 환경 설정
│  │  └─ versions/           # 마이그레이션 리비전
│  ├─ alembic.ini            # Alembic 설정
│  ├─ pyproject.toml         # 백엔드 의존성/패키지
│  └─ Dockerfile             # 백엔드 컨테이너
├─ frontend/                # React Native(Expo) 앱
│  ├─ App.js                 # 앱 엔트리
│  └─ src/
│     ├─ api.js              # 백엔드 API 호출
│     ├─ config.js           # API 베이스 URL
│     └─ screens/            # 주요 화면들
├─ workers/                 # 워커/배치 (현재는 최소 스텁)
│  ├─ Dockerfile
│  └─ pyproject.toml
├─ infra/                   # 인프라 설정
│  └─ docker/
│     └─ docker-compose.yml  # 로컬 Postgres/서버 실행용
├─ legacy_db/               # 레거시 SQL 덤프 (참고용)
└─ docs/                    # 문서 (아키텍처/정책/변경기록)
```

> 참고: `backend/.venv`, `frontend/node_modules`, `frontend/.expo` 등은 로컬 생성물입니다.

## 핵심 기능 요약

- **Backend**: 인증(JWT), 키워드 기반 공지 조회/등록 API 제공
- **Frontend**: 모바일 앱(로그인/공지/설정 화면) 제공
- **DB**: Alembic 마이그레이션 기반 스키마 관리 (`eng_body` 컬럼 추가)
- **Workers**: 
    - **공지 크롤링**: 아주대학교 국제교류팀 공지사항 자동 수집
    - **자동 번역**: **Gemini 2.5 Flash** 모델을 연동하여 수집된 한국어 공지 본문을 영어로 자동 번역하여 저장
    - **알림/배치**: 키워드 매칭 및 알림 서비스 확장용

## 빠른 시작 — Docker (팀원 공통 환경)

> **로컬 PostgreSQL 없이** Neon 클라우드 DB 에 직접 연결합니다.
> Docker Desktop 만 설치되어 있으면 됩니다.

### 1단계 — 저장소 클론

```bash
git clone https://github.com/<org>/azan.git
cd azan
```

### 2단계 — 환경변수 설정

```bash
make setup        # .env 파일 자동 생성
# 이후 .env 를 열어 아래 두 값을 입력하세요
#   DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST/DBNAME?sslmode=require
#   JWT_SECRET=<팀에서 공유하는 시크릿>
```

Neon DB URL 확인: [Neon 콘솔](https://console.neon.tech) → 프로젝트 → Connection Details → **Connection string**
`postgres://` → `postgresql+psycopg2://` 로 앞부분을 바꿔 입력하세요.

### 3단계 — 실행

```bash
make up           # 이미지 빌드 → DB 마이그레이션 → API 서버 시작
```

API 서버가 `http://localhost:8000` 에서 실행됩니다.
`GET http://localhost:8000/health` 로 정상 여부를 확인하세요.

### 자주 쓰는 명령어

| 명령어 | 설명 |
|--------|------|
| `make up` | 빌드 후 백그라운드 실행 |
| `make down` | 컨테이너 종료 |
| `make logs` | API 로그 실시간 확인 |
| `make migrate` | 마이그레이션만 단독 실행 |
| `make restart` | API 서비스만 재시작 |

### 프론트엔드 (별도 실행)

Expo 는 Docker 에 포함되지 않습니다. 별도 터미널에서 실행하세요.

```bash
cd frontend
npm install
npx expo start
```

> `frontend/src/config.js` 의 `API_BASE_URL` 이 Render 배포 서버를 가리킵니다.
> 로컬 API 서버를 사용하려면 `http://localhost:8000` 으로 변경하세요.

---

## 빠른 시작 — 로컬 직접 실행 (Docker 없이)

백엔드:

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

프론트엔드:

```bash
cd frontend
npm install
npm run start
```

상세 설치/환경 설정은 `backend/README.md`를 참고하세요.

## DB & 마이그레이션 (Alembic-only)

스키마 변경은 Alembic 마이그레이션만 사용합니다.

```bash
cd backend
alembic upgrade head
```

## 배포/환경변수 (간단)

필수 환경변수:

- `DATABASE_URL` 또는 `DATABASE_URL_POOLER`
- `JWT_SECRET`

선택:

- `DB_REQUIRE_SSL=true`
- `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE`
