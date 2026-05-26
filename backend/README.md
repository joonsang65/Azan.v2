<!-- 파일 기능: backend 서비스의 설치/실행/마이그레이션 가이드를 제공한다. -->

# azan API

FastAPI service for health and MVP auth endpoints.

## Quickstart

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e .
cp .env.example .env
```

Edit `.env` and set at least:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/azan
JWT_SECRET=dev-secret
GEMINI_API_KEY=your-gemini-api-key-here  # Required for English translation in workers
```

If you want Postgres via docker-compose (from repo root):

```bash
cd ../infra/docker
docker compose up -d postgres
```

Start API locally:

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
# Quick health check (local)
curl http://localhost:8000/health

# Quick health check (production)
curl https://ajou-international-2phq.onrender.com/health
```

## DB Migrations (Alembic)

Migration files are stored in:

- `backend/alembic/versions/`

Create a revision:

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "add eng_body to notices"
```

Apply migrations:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

## Backend Smoke Test (Mac)

```bash
# Quick health check (local)
curl http://localhost:8000/health

# Quick health check (production)
curl https://ajou-international-2phq.onrender.com/health
curl http://localhost:8000/db/ping
```

Register:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@ajou.ac.kr","full_name":"Test2","password":"helloworld1234"}'
```

Login:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@ajou.ac.kr","password":"helloworld1234"}'
```

Me:

```bash
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

Keywords:

```bash
curl http://localhost:8000/keywords
```

Notices & English Translation:

```bash
# List notices
curl http://localhost:8000/notices?keyword_id=13

# Get notice detail (Check if 'eng_body' is included)
curl http://localhost:8000/notices/<NOTICE_UUID_HERE>
```

## iPhone (Expo Go)

- Confirm `frontend/.env` uses your Mac LAN IP (for local) or the production URL, for example:
  - `http://172.30.1.51:8000`
  - `https://ajou-international-2phq.onrender.com`
- In the app: Signup -> Login -> Home.
- Home should show your `email` and `full_name` from `/auth/me`.

## DATABASE_URL examples

- Local Postgres on same Mac:
  - `postgresql+psycopg2://postgres:postgres@localhost:5432/azan`
- Postgres in docker-compose with host port mapping:
  - `postgresql+psycopg2://postgres:postgres@localhost:5432/azan`
- API running inside Docker network and Postgres service name is `db`:
  - `postgresql+psycopg2://postgres:postgres@db:5432/azan`

## Troubleshooting

- If you see `invalid literal for int() with base 10: '<PORT>'`, your `DATABASE_URL` still has placeholders. Replace `<PORT>` with a real port like `5432`.
- If API says `DATABASE_URL is missing` or `JWT_SECRET is missing`, confirm `backend/.env` exists and has both values.
- If `uvicorn` is not found, run `python -m uvicorn ...` from an activated virtualenv.
