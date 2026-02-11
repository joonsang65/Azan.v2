# azan

Monorepo for the Ajou notice pipeline. It includes a FastAPI backend, a worker service, a RAG package skeleton, and a mobile client skeleton.

## Quick Start (Docker Compose)

```bash
cd infra/docker
docker compose up --build
```

Starts:
- `postgres` on `localhost:5432`
- `api` on `localhost:8000` (`GET /health`)
- `worker` stub service

## Run API Locally

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e .
PORT=8000 python -m app.main
```

## Run Worker Locally

```bash
cd apps/worker
python -m venv .venv && source .venv/bin/activate
pip install -e .
python -m worker.main
```

## Team Ownership

- `apps/api`: API/backend teammate
- `apps/worker`: background jobs teammate
- `apps/rag`: retrieval/LLM teammate
- `apps/mobile`: mobile/frontend teammate
