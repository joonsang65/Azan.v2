# workers/

## 역할

AZAN 서비스의 백그라운드 작업 프로세스 패키지입니다. 공지사항 크롤링, RAG 챗봇 처리, 알림 발송 등의 비동기 작업을 담당합니다. 현재는 구조 설계(스텁) 단계이며 향후 구현 예정입니다.

## 디렉토리 구조

```
workers/
├── crawlers/       # 공지사항 웹 크롤러
├── rag/            # RAG(검색 증강 생성) 챗봇 워커
├── alarm/          # 알림 발송 워커
├── pyproject.toml  # 워커 패키지 의존성 (Python 3.11+)
└── Dockerfile      # 워커 컨테이너 정의
```

## 서브 모듈 역할

| 디렉토리 | 역할 |
|----------|------|
| `crawlers/` | 아주대 공지사항 게시판 크롤링 및 **Gemini 2.5 Flash를 이용한 자동 영어 번역** 저장 |
| `rag/` | 공지 데이터를 벡터 인덱싱하고 **Gemini 모델**을 활용한 챗봇 응답 제공 |
| `alarm/` | `alert_outbox` 테이블의 `pending` 항목을 처리하여 사용자에게 알림 발송 |

## 주요 기술

- **LLM**: Gemini 2.5 Flash (번역 및 챗봇)
- **Vector DB**: pgvector (PostgreSQL 확장)
- **Crawler**: BeautifulSoup4, HTTPX
- **Database**: PostgreSQL (Neon 클라우드), SQLAlchemy ORM

## 실행 방법

```bash
# 의존성 설치
pip install -e .

# 각 워커는 향후 개별 엔트리포인트로 실행 예정
```
