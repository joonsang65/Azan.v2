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
- **DB**: Alembic 마이그레이션 기반 스키마 관리
- **Workers**: 향후 배치/알림/크롤링 작업 확장용

## 빠른 시작 (요약)

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
