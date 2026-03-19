# 파일 기능: backend 서비스를 컨테이너로 빌드하기 위한 도커 이미지 정의다.
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml README.md alembic.ini ./
COPY alembic ./alembic
COPY app/seed_data ./app/seed_data
COPY app ./app

RUN pip install --no-cache-dir .

CMD ["python", "-m", "app.main"]
