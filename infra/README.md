# infra/

## 역할

인프라 구성 파일 디렉토리입니다. 로컬 개발 환경과 서비스 오케스트레이션을 위한 Docker Compose 설정을 포함합니다.

## 파일 구조

```
infra/
└── docker/
    └── docker-compose.yml   # 로컬 PostgreSQL + API 서버 오케스트레이션
```

---

## 파일별 설명

### docker/docker-compose.yml — Docker Compose 설정

로컬 개발 환경에서 PostgreSQL 데이터베이스와 백엔드 API 서버를 함께 실행하기 위한 컨테이너 구성 파일입니다.

**주요 서비스**

| 서비스 | 역할 |
|--------|------|
| `db` | PostgreSQL 데이터베이스 컨테이너 |
| `api` | FastAPI 백엔드 서버 컨테이너 |

---

## 로컬 실행 방법

```bash
# infra/docker/ 디렉토리에서 실행
docker-compose up -d

# 서비스 중지
docker-compose down

# 볼륨(DB 데이터) 포함 완전 삭제
docker-compose down -v
```
