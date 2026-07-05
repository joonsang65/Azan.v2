# 개발 순서 0. 프로젝트 이해하기

이 문서는 Azan.v2 프로젝트를 처음 보는 팀원이 전체 구조를 빠르게 이해하기 위한 온보딩 문서다.

코드를 바로 수정하기 전에 먼저 이 문서를 읽고, "이 프로젝트가 어떤 문제를 해결하는지", "backend, frontend, workers가 각각 무슨 역할을 하는지", "내가 맡을 수 있는 작업이 어디에 있는지"를 이해하는 것이 목표다.

## 0. 한 문장으로 이해하기

Azan.v2는 아주대학교 외국인 유학생을 위한 모바일 서비스다.

학교 공지와 생활 정보를 모아서 번역하고, 사용자의 관심사와 비자/TOPIK 상태에 맞춰 알림을 보내며, 챗봇으로 필요한 행정 정보를 물어볼 수 있게 만든다.

## 1. 사용자는 무엇을 하게 되는가

사용자 입장에서 보면 서비스는 아래 흐름으로 동작한다.

```text
1. 앱을 켠다.
2. 회원가입 또는 로그인을 한다.
3. 내 프로필을 입력한다.
   - 비자 종류
   - 비자 만료일
   - TOPIK 등급
   - 관심 키워드
   - 선호 언어
4. 학교 공지 목록을 본다.
5. 공지 상세 내용을 확인한다.
6. 관심 있는 키워드의 새 공지가 올라오면 push 알림을 받는다.
7. 비자나 TOPIK 위험 상태가 있으면 risk 알림을 받는다.
8. 궁금한 내용은 챗봇에 질문한다.
```

즉, 이 앱의 핵심은 단순 공지 앱이 아니라 "외국인 유학생에게 필요한 정보를 놓치지 않게 도와주는 개인화 정보 서비스"다.

## 2. 전체 구조

프로젝트는 하나의 repository 안에 여러 영역이 함께 있는 monorepo 구조다.

```text
Azan.v2/
  backend/        FastAPI 기반 API 서버
  frontend/       Expo Router 기반 React Native 모바일 앱
  workers/        공지 수집, 번역, 임베딩, 알림, RAG 챗봇 관련 배치 작업
  infra/          Docker Compose 기반 로컬 인프라 설정
  legacy_db/      이전 DB dump 또는 참고 SQL
  tests/          backend와 worker 테스트
  .github/        GitHub Actions 자동 실행 workflow
  docs/           프로젝트 분석, 개선 방향, 개발 계획 문서
```

처음에는 모든 폴더를 깊게 볼 필요가 없다. 신규 팀원은 우선 `frontend/`, `docs/`, 그리고 backend API가 어떤 응답을 주는지만 이해하면 된다.

## 3. 각 영역의 역할

### 3.1 Frontend

`frontend/`는 사용자가 직접 보는 모바일 앱이다.

사용 기술:

- React Native
- Expo
- Expo Router
- TypeScript

주요 역할:

- 로그인/회원가입 화면
- 프로필 입력 화면
- 공지 목록 화면
- 공지 상세 화면
- 챗봇 화면
- 알림/설정 화면

중요한 위치:

```text
frontend/app/
  _layout.tsx              앱 전체 라우팅과 로그인 상태 처리
  (tabs)/                  메인 탭 화면
  auth/                    로그인, 회원가입, 프로필 설정
  settings/                설정, 프로필, 언어, 알림 설정
  notices/[id].tsx         공지 상세 화면
  alerts.tsx               알림 화면
  topic/[topicKey].tsx     생활 정보 상세 화면
  services/                backend API 호출 코드
  context/AppContext.tsx   앱 전체 상태 관리
  components/              공통 UI 컴포넌트
  data/                    mock data 또는 정적 데이터
```

프론트엔드 작업을 맡는 팀원이 주로 보게 될 곳은 `frontend/app/services`, 화면 파일, UI 컴포넌트다.

### 3.2 Backend

`backend/`는 모바일 앱이 데이터를 요청하는 API 서버다.

사용 기술:

- FastAPI
- SQLAlchemy
- Pydantic
- PostgreSQL
- JWT 인증

주요 역할:

- 회원가입/로그인
- 현재 사용자 정보 조회와 수정
- 키워드 구독 관리
- 공지 목록/상세 조회
- 챗봇 질문 처리
- 알림 outbox 생성
- 생활 정보 메뉴 저장과 임베딩 처리

중요한 위치:

```text
backend/app/
  main.py           FastAPI 앱 시작점, router 등록, health check
  database.py       DB 연결 설정
  core/config.py    환경변수와 설정
  models/           DB table과 연결되는 SQLAlchemy model
  schemas/          API request/response 형태를 정의하는 Pydantic schema
  routers/          실제 API endpoint
  services/         비즈니스 로직
```

신규 팀원이 backend 코드를 직접 많이 수정할 필요는 없다. 다만 frontend 작업을 하려면 API가 어떤 request와 response를 주고받는지는 알아야 한다.

### 3.3 Workers

`workers/`는 사용자가 앱을 보고 있지 않아도 백그라운드에서 돌아가는 작업들이다.

예를 들어, 매일 학교 공지를 가져오고, Gemini로 번역하고, embedding을 만들고, push 알림을 보내는 작업이 여기에 있다.

중요한 위치:

```text
workers/
  crawler/          아주대 공지와 Slack 공지 수집
  rag/              RAG 챗봇, vector search, Gemini embedding
  alarm/            키워드 기반 push 알림 발송
  risk_alarm/       비자/TOPIK risk 계산과 알림
  daily_pipeline.py 하루 단위 전체 pipeline 실행
```

처음에는 worker 내부 로직을 모두 이해할 필요는 없다. 다만 아래 정도만 기억하면 된다.

- `crawler`: 공지를 가져온다.
- `processor`: 공지를 번역하고 분류한다.
- `embedding`: 검색과 챗봇을 위해 vector를 만든다.
- `alarm`: 사용자에게 push 알림을 보낸다.
- `risk_alarm`: 비자/TOPIK 위험 알림을 만든다.
- `rag`: 챗봇이 답변을 만들 때 필요한 검색과 LLM 호출을 담당한다.

### 3.4 Database

DB는 PostgreSQL을 사용하고, 일부 검색 기능에는 pgvector를 사용한다.

핵심 table:

```text
users
  사용자 계정, 프로필, push token, 비자/TOPIK 상태

keywords
  공지 카테고리와 관심 키워드

user_keywords
  사용자가 구독한 키워드 연결

notices
  수집된 학교 공지, 번역된 제목/본문, deadline, source URL, embedding

user_notice_reads
  사용자가 어떤 공지를 읽었는지 기록

alert_outbox
  아직 보내지 않았거나 이미 보낸 push 알림 큐

information_menu_parts
  비자, TOPIK, 장학금, 학교 생활 정보 조각과 embedding

risk_msg
  risk 알림에 사용할 다국어 메시지 template
```

처음에는 table 이름과 역할만 이해하면 충분하다.

## 4. 주요 API 흐름

frontend는 backend API를 호출해서 데이터를 가져온다.

중요한 endpoint:

```text
/auth/register
  회원가입

/auth/login
  로그인하고 JWT token을 받음

/auth/me
  현재 로그인한 사용자 정보 조회/수정

/auth/push-token
  Expo push token 저장

/keywords
  전체 키워드 목록 조회

/users/me/keywords
  내가 구독한 키워드 조회/수정

/notices
  공지 목록 조회

/notices/{notice_id}
  공지 상세 조회와 읽음 기록 저장

/chatbot
  챗봇 질문 전송

/information-menu/parts
  생활 정보 메뉴 저장과 embedding 생성
```

frontend 작업을 할 때는 `frontend/app/services/` 아래 파일을 먼저 보면 된다.

```text
frontend/app/services/
  api.ts             공통 API client
  auth.ts            로그인, 회원가입, 사용자 프로필
  notices.ts         공지 목록/상세 조회
  keywords.ts        키워드 구독 관리
  chatbot.ts         챗봇 API
  informationMenu.ts 생활 정보 메뉴 API
```

## 5. 서비스 전체 동작 흐름

아래 흐름을 이해하면 프로젝트의 큰 그림을 잡을 수 있다.

```text
사용자 앱 흐름

사용자가 앱 실행
-> 로그인 또는 회원가입
-> JWT token 저장
-> /auth/me로 내 프로필 조회
-> /keywords로 키워드 목록 조회
-> /users/me/keywords로 내 관심 키워드 동기화
-> /notices로 공지 목록 조회
-> /notices/{id}로 공지 상세 조회
-> /chatbot으로 질문 전송
```

```text
백그라운드 작업 흐름

GitHub Actions 또는 worker 실행
-> crawler가 학교 공지 수집
-> processor가 Gemini로 번역/분류/deadline 추출
-> embedding service가 pgvector embedding 생성
-> 새 공지에 맞는 사용자에게 alert_outbox 생성
-> alarm worker가 Expo push 알림 발송
-> risk_alarm worker가 비자/TOPIK 위험 알림 생성 및 발송
```

## 6. 챗봇은 어떻게 동작하는가

챗봇은 단순히 Gemini에게 바로 질문을 보내는 구조가 아니다.

대략적인 흐름:

```text
1. 사용자가 질문한다.
2. backend의 /chatbot API가 요청을 받는다.
3. RAG service가 관련 문서를 검색한다.
   - notices
   - information_menu_parts
4. 검색된 문서를 context로 Gemini에게 전달한다.
5. Gemini가 답변을 만든다.
6. backend가 답변을 frontend에 내려준다.
7. frontend가 챗봇 화면에 답변을 표시한다.
```

현재 개선 계획에서는 챗봇 답변에 `sources`, `confidence`, `needs_office_verification` 같은 정보를 추가할 예정이다.

프론트엔드 담당자가 맡을 수 있는 작업은 backend가 내려주는 `sources`를 챗봇 화면에 표시하는 것이다.

## 7. 알림은 어떻게 동작하는가

알림은 바로 발송하지 않고 `alert_outbox`라는 queue table을 거친다.

```text
새 공지 생성
-> backend가 해당 키워드를 구독한 사용자 찾기
-> alert_outbox에 pending 알림 생성
-> alarm worker가 pending 알림 조회
-> Expo push notification 발송
-> 성공하면 sent, 실패하면 failed 처리
```

이 구조를 outbox pattern이라고 부를 수 있다.

지금은 retry, backoff, dead letter 처리가 부족해서 이후 개선 대상이다.

## 8. 신규 팀원이 먼저 보면 좋은 파일

처음부터 backend와 workers를 모두 이해하려고 하면 어렵다. 아래 순서로 보는 것이 좋다.

```text
1. docs/04-development-roadmap-and-task-split.md
   전체 개발 순서와 역할 분배

2. frontend/app/services/api.ts
   API 호출이 공통으로 어떻게 처리되는지

3. frontend/app/services/auth.ts
   로그인과 프로필 API 구조

4. frontend/app/services/notices.ts
   공지 목록/상세 API 구조

5. frontend/app/services/chatbot.ts
   챗봇 API 구조

6. frontend/app/_layout.tsx
   로그인 여부에 따라 화면이 어떻게 이동하는지

7. frontend/app/(tabs)/
   사용자가 보는 메인 화면들
```

backend는 아래 파일만 먼저 확인하면 된다.

```text
1. backend/app/main.py
   API 서버 시작점

2. backend/app/routers/auth.py
   로그인, 회원가입, 내 정보 API

3. backend/app/routers/notices.py
   공지 목록/상세 API

4. backend/app/routers/chatbot.py
   챗봇 API

5. backend/app/schemas/
   API request/response 형태
```

## 9. 신규 팀원에게 적합한 작업

개발 경험이 많지 않은 팀원은 처음에는 결과가 눈에 보이고 수정 범위가 좁은 작업을 맡는 것이 좋다.

추천 작업:

```text
1. README와 실행 가이드 정리
2. frontend profile type/API 연동
3. chatbot source/citation UI 추가
4. loading/error/empty state 정리
5. mock fallback 제거 또는 dev-only 처리
6. 알림 worker 수동 실행 가이드 작성
7. RAG evaluation dataset 질문 후보 수집
8. 문서 오탈자와 스크린샷 정리
```

처음에는 아래 작업은 맡지 않는 것이 좋다.

```text
1. DB migration 작성
2. 인증/권한 로직 수정
3. worker retry/backoff 설계
4. outbox 중복 발송 방지 로직
5. RAG ranking score 설계
6. prompt와 evaluation metric 동시 수정
```

이 작업들은 실수했을 때 영향 범위가 크고, 면접에서 깊게 설명해야 하는 부분이라 노준상이 직접 맡는 것이 좋다.

## 10. 자주 나오는 용어

```text
API
  frontend가 backend에 데이터를 요청하는 통로

JWT
  로그인한 사용자인지 확인하기 위한 token

Worker
  사용자가 앱을 보고 있지 않아도 백그라운드에서 실행되는 작업

Crawler
  웹사이트에서 공지 데이터를 가져오는 코드

Embedding
  문장을 vector로 바꿔서 검색할 수 있게 만드는 값

pgvector
  PostgreSQL에서 vector similarity search를 하기 위한 확장

RAG
  관련 문서를 먼저 검색하고, 그 문서를 근거로 LLM이 답변하게 하는 구조

Outbox
  알림을 바로 보내지 않고 DB queue에 쌓아두는 구조

Migration
  DB table 구조를 변경하는 작업

Schema
  API request/response 또는 DB 데이터 형태를 정의한 것
```

## 11. 프로젝트를 이해했는지 확인하는 질문

신규 팀원은 이 문서를 읽고 아래 질문에 답할 수 있으면 된다.

- Azan.v2는 어떤 사용자를 위한 서비스인가?
- frontend, backend, workers는 각각 어떤 역할을 하는가?
- 공지는 어디서 수집되고, 어디에 저장되고, 앱에는 어떻게 표시되는가?
- 챗봇은 왜 RAG 구조를 사용하는가?
- `alert_outbox`는 왜 필요한가?
- 내가 맡을 수 있는 frontend 작업은 어떤 것인가?
- backend schema가 바뀌면 frontend type도 왜 같이 확인해야 하는가?

## 12. 다음 단계

이 문서를 읽은 다음에는 `docs/04-development-roadmap-and-task-split.md`의 작업 순서를 보면 된다.

실제 개발 순서는 아래처럼 진행한다.

```text
0. 프로젝트 이해하기
1. 실행 가능 상태 복구
2. API 계약과 프로필 모델 정리
3. 인증, 권한, 내부 API 보호
4. notice 처리 상태와 worker pipeline 정리
5. 알림 outbox 안정화
6. RAG 응답 구조화와 citation 도입
7. RAG 평가 pipeline 구축
8. 개인화 ranking과 risk alert 고도화
9. frontend UX 정리
10. 운영 문서와 포트폴리오 정리
```

신규 팀원은 0번을 먼저 완료한 뒤, 1번의 README/실행 가이드 정리부터 시작하는 것이 가장 안전하다.
