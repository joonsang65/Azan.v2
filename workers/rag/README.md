# workers/rag/

## 역할

RAG(Retrieval-Augmented Generation, 검색 증강 생성) 기반 챗봇 워커 모듈입니다. 공지사항 데이터를 벡터 인덱스로 변환하고, 사용자의 자연어 질문에 관련 공지를 검색하여 LLM 응답을 생성합니다. 현재는 스텁(구조 설계) 단계입니다.

## 예정 기능

- `notices` 테이블의 공지 본문을 임베딩 벡터로 변환
- 벡터 DB(예: pgvector, Chroma 등)에 인덱스 저장
- 사용자 쿼리 수신 → 유사 공지 검색 → LLM에 컨텍스트 주입 → 응답 생성
- 프론트엔드 `ChatbotScreen`과 연동 예정

## 구현 시 참고 사항

- LLM 연동은 Anthropic Claude API 또는 OpenAI API 사용 예정
- 임베딩 모델은 sentence-transformers 또는 API 기반 임베딩 사용 예정
- `ChatbotScreen.js`는 현재 플레이스홀더이며, 이 워커 구현 후 API 연동 예정
