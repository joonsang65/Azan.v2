# apps/rag/src/chatbot/service.py

import asyncio
import logging
from typing import Any, Dict, List

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate

from .prompts import CONDENSE_QUESTION_PROMPT, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from ..rag.RAG_config import settings
from ..rag.vectorstore import VectorStore

logger = logging.getLogger("AzanService")


class AzanChatbotService:
    def __init__(self):
        """챗봇 서비스 초기화 (VectorStore, LLM, 세션 메모리 저장소 설정)"""
        try:
            self.vector_store = VectorStore()
            self.llm = ChatGoogleGenerativeAI(
                model=settings.GENERATION_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=settings.TEMPERATURE,
            )

            # 세션별 메모리를 저장할 딕셔너리 (메모리 릭 방지를 위해 실제 상용에서는 Redis/DB 권장)
            self.sessions: Dict[str, InMemoryChatMessageHistory] = {}

            self.condense_prompt = ChatPromptTemplate.from_template(CONDENSE_QUESTION_PROMPT)
            self.answer_prompt = ChatPromptTemplate.from_template(USER_PROMPT_TEMPLATE)

            logger.info("[System] Azan Service with Session-based Memory Initialized.")

        except Exception as e:
            logger.error(f"Initialization Failed: {e}")
            raise e

    def _get_session_memory(self, session_id: str) -> InMemoryChatMessageHistory:
        """세션 ID에 해당하는 메모리 객체 반환 (없으면 생성)"""
        if session_id not in self.sessions:
            self.sessions[session_id] = InMemoryChatMessageHistory()
        return self.sessions[session_id]

    def _format_to_toon(self, docs):
        """Format retrieved documents without truncating structured information."""
        if not docs:
            return "관련된 정보가 없습니다."

        blocks = []

        for doc in docs:
            meta = doc.metadata
            source_type = meta.get("source_type", "N/A")
            title = meta.get("title", "No Title")
            deadline = meta.get("deadline_at") or meta.get("deadline") or "N/A"
            content = doc.page_content.replace("\n", " ")

            blocks.append(
                "\n".join(
                    [
                        f"[{source_type}] {title}",
                        f"Deadline: {deadline}",
                        "Content:",
                        content,
                    ]
                )
            )

        return "\n\n---\n\n".join(blocks)

    async def aget_response(self, question: str, session_id: str = "default_session") -> str:
        """
        비동기 버전 응답 함수. 세션 ID별로 독립된 대화 기록을 유지함.
        """
        try:
            loop = asyncio.get_running_loop()
            started = loop.time()

            # 1. 세션 전용 메모리 추출
            memory = self._get_session_memory(session_id)
            messages = memory.messages
            chat_history = "\n".join(
                [f"{'User' if msg.type == 'human' else 'Azan'}: {msg.content}" for msg in messages]
            )

            # 2. 질문 재구성 (Condense Question)
            t0 = loop.time()
            if chat_history:
                condense_chain = self.condense_prompt | self.llm
                condense_result = await condense_chain.ainvoke(
                    {"chat_history": chat_history, "question": question}
                )
                standalone_question = getattr(condense_result, "content", str(condense_result))
                logger.info(f"[Session: {session_id}] [Step 1] Condensing: '{question}' -> '{standalone_question}'")
            else:
                standalone_question = question
                logger.info(f"[Session: {session_id}] [Step 1] No chat history. Using original question.")
            t_condense = loop.time() - t0

            # 3. DB 검색 (Retrieval)
            t1 = loop.time()
            retrieved_docs = await asyncio.to_thread(
                self.vector_store.similarity_search,
                standalone_question,
                settings.RETRIEVER_TOP_K,
            )
            retrieved_docs = self._prioritize_intent_docs(standalone_question, retrieved_docs)
            t_search = loop.time() - t1

            # 검색 결과 상세 로깅
            if retrieved_docs:
                logger.info(f"[Session: {session_id}] [Step 2] Retrieval Success: {len(retrieved_docs)} docs found.")
                for i, doc in enumerate(retrieved_docs):
                    meta = doc.metadata
                    snippet = doc.page_content.replace("\n", " ")[:100]
                    logger.info(
                        f"  - Doc {i+1} [{meta.get('source_type')}]: {meta.get('title')} (Score: {meta.get('score', 'N/A'):.4f}) | Snippet: {snippet}..."
                    )
            else:
                logger.warning(f"[Session: {session_id}] [Step 2] Retrieval Failed: No documents found.")

            context_text = self._format_to_toon(retrieved_docs) if retrieved_docs else "정보 없음"

            # 4. 최종 답변 생성 (Generation)
            t2 = loop.time()
            answer_chain = self.answer_prompt | self.llm
            answer_result = await answer_chain.ainvoke(
                {
                    "system_instruction": SYSTEM_PROMPT,
                    "chat_history": chat_history,
                    "context": context_text,
                    "question": question,
                }
            )
            t_answer = loop.time() - t2

            response_text = getattr(answer_result, "content", str(answer_result))

            total_elapsed = loop.time() - started

            # 메트릭 로깅 (멤버 변수가 아닌 로컬 변수로 로그만 남김)
            logger.info(
                "[Session: %s] total=%.1fms (condense=%.1fms search=%.1fms answer=%.1fms) docs=%d",
                session_id, total_elapsed * 1000, t_condense * 1000, t_search * 1000, t_answer * 1000, len(retrieved_docs or [])
            )

            # 5. 메모리에 현재 대화 저장
            memory.add_user_message(question)
            memory.add_ai_message(response_text)

            return response_text

        except Exception as e:
            logger.error(f"[Session: {session_id}] Error: {e}")
            return "오류가 발생했습니다."

    def get_response(self, question: str) -> str:
        """
        기존 동기 인터페이스 유지용 래퍼.
        (CLI 테스트 등에서는 이 함수를 그대로 사용)
        """
        return asyncio.run(self.aget_response(question))

    def _prioritize_intent_docs(self, question: str, docs: List[Any]) -> List[Any]:
        if not docs:
            return docs

        normalized = question.lower()
        schedule_terms = ("일정", "시험일", "접수기간", "성적발표", "성적 발표", "schedule", "date")
        is_schedule_question = any(term in normalized for term in schedule_terms)
        if not is_schedule_question:
            return docs

        schedule_docs = [
            doc for doc in docs if "schedule" in (doc.metadata.get("title") or "").lower()
        ]
        return schedule_docs or docs
