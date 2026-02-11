FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY worker ./worker

RUN pip install --no-cache-dir .

CMD ["python", "-m", "worker.main"]
