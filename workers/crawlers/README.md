# workers/crawlers/

## 역할

아주대학교 국제교류팀(OIA) 공지사항을 주기적으로 크롤링하고, **Gemini 2.5 Flash**를 사용하여 본문을 영어로 번역하여 DB에 저장하는 백그라운드 워커 모듈입니다.

## 주요 기능

- **공지 수집**: 아주대 OIA 공지사항 게시판 HTML 파싱 및 데이터 추출
- **텍스트 정제**: 공지 태그(학점, 학적 등) 추출 및 제목 메아리 제거
- **날짜 추론**: 본문 텍스트 내에서 작성일 및 마감일(Deadline) 자동 추출
- **자동 번역**: 수집된 한국어 본문을 **Gemini 2.5 Flash** 모델을 통해 영어로 자동 번역 (`eng_body` 컬럼에 저장)
- **중복 방지**: URL 및 본문 해시를 이용한 중복 공지 감지 및 업서트(Upsert) 로직

## 실행 방법

### 메인 크롤러 실행
```bash
python -m workers.crawlers.main
```

### 과거 데이터 번역 마이그레이션
`eng_body`가 비어있는 과거 공지사항들을 찾아 일괄 번역하여 채워 넣습니다.
```bash
python workers/crawlers/fill_eng_body.py
```

## 구성 요소

- `main.py`: 전체 크롤링 및 번역, DB 저장 워크플로우 제어
- `translate.py`: Gemini API 연동 및 재시도 로직이 포함된 번역 유틸리티
- `db_insert.py`: PostgreSQL(Neon) DB 직접 연결 및 업서트 처리
- `extractors.py`: 날짜, 태그 등 메타데이터 추출 정규식 로직
- `fill_eng_body.py`: 과거 데이터 일괄 번역 마이그레이션 도구

## 환경 변수

번역 기능을 사용하기 위해 아래 환경 변수가 필요합니다.
- `GEMINI_API_KEY`: Google Generative AI API 키
- `DATABASE_URL`: PostgreSQL 접속 URL
