FROM python:3.11-slim

WORKDIR /app
COPY backend /app/backend

WORKDIR /app/backend
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers"]