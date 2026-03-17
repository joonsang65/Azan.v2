# apps/rag/src/chatbot/service.py

import asyncio
import logging
from typing import Any, Dict, List

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate

from src.chatbot.prompts import CONDENSE_QUESTION_PROMPT, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from src.rag.RAG_config import settings
from src.rag.vectorstore import VectorStore

logger = logging.getLogger("AzanService")


class AzanChatbotService:
    def __init__(self):
        """챗봇 서비스 초기화 (VectorStore, LLM, Memory 설정)"""
        try:
            # 마지막 호출에 대한 메트릭 저장용
            self.last_metrics: Dict[str, Any] | None = None

            self.vector_store = VectorStore()
            self.llm = ChatGoogleGenerativeAI(
                model=settings.GENERATION_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=settings.TEMPERATURE,
            )

            # 최신 표준(langchain_core) 메모리 사용
            self.memory = InMemoryChatMessageHistory()

            self.condense_prompt = ChatPromptTemplate.from_template(CONDENSE_QUESTION_PROMPT)
            self.answer_prompt = ChatPromptTemplate.from_template(USER_PROMPT_TEMPLATE)

            logger.info("[System] Azan Service with Modern Memory Initialized.")

        except Exception as e:
            logger.error(f"Initialization Failed: {e}")
            raise e

    def _format_to_toon(self, docs):
        """
        검색된 문서들을 LLM이 이해하기 쉬운 Table(TOON) 형식으로 변환
        """
        if not docs:
            return "관련된 공지사항 정보가 없습니다."

        toon_text = "| Title | Deadline | Content Summary |\n"
        toon_text += "|---|---|---|\n"

        for doc in docs:
            meta = doc.metadata
            title = meta.get("title", "No Title")
            deadline = meta.get("deadline_at", "N/A")
            content = doc.page_content.replace("\n", " ")[:200]

            row = f"| {title} | {deadline} | {content}... |\n"
            toon_text += row

        return toon_text

    async def aget_response(self, question: str) -> str:
        """
        비동기 버전 응답 함수.
        FastAPI 등에서 await으로 직접 호출하는 용도.
        호출당 메트릭은 self.last_metrics에 저장된다.
        """
        try:
            loop = asyncio.get_running_loop()
            started = loop.time()

            # 1. 대화 기록 추출
            messages = self.memory.messages
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
                logger.info(f"Standalone Question: {standalone_question}")
                # 과도한 호출 방지를 위해 약간의 지연
                await asyncio.sleep(1.5)
            else:
                standalone_question = question
            t_condense = loop.time() - t0

            # 3. DB 검색 (Retrieval) - 동기 코드를 별도 스레드에서 실행
            t1 = loop.time()
            retrieved_docs = await asyncio.to_thread(
                self.vector_store.similarity_search,
                standalone_question,
                settings.RETRIEVER_TOP_K,
            )
            t_search = loop.time() - t1
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

            # answer_result에서 텍스트와 usage 메타데이터 추출
            response_text = getattr(answer_result, "content", None)
            if response_text is None:
                response_text = str(answer_result)

            usage: Dict[str, Any] | None = None
            for key in ("usage_metadata", "response_metadata"):
                meta = getattr(answer_result, key, None)
                if meta:
                    usage = meta
                    break

            # retrieval 메트릭 계산
            scores: List[float] = []
            for d in retrieved_docs or []:
                score = d.metadata.get("score")
                if isinstance(score, (int, float)):
                    scores.append(float(score))
            docs_count = len(retrieved_docs or [])
            top_score = max(scores) if scores else None
            avg_score = sum(scores) / len(scores) if scores else None

            total_elapsed = loop.time() - started

            # 메트릭 저장
            self.last_metrics = {
                "question": question,
                "standalone_question": standalone_question,
                "docs_count": docs_count,
                "top_score": top_score,
                "avg_score": avg_score,
                "llm_usage": usage,
                "context_text": context_text,
                "t_condense_ms": t_condense * 1000,
                "t_search_ms": t_search * 1000,
                "t_answer_ms": t_answer * 1000,
                "t_total_ms": total_elapsed * 1000,
            }

            logger.info(
                "chat metrics | condense=%.1fms search=%.1fms answer=%.1fms total=%.1fms "
                "docs=%d top_score=%s avg_score=%s",
                self.last_metrics["t_condense_ms"],
                self.last_metrics["t_search_ms"],
                self.last_metrics["t_answer_ms"],
                self.last_metrics["t_total_ms"],
                docs_count,
                top_score,
                avg_score,
            )

            # 5. 메모리에 현재 대화 저장
            self.memory.add_user_message(question)
            self.memory.add_ai_message(response_text)

            return response_text

        except Exception as e:
            logger.error(f"Error: {e}")
            self.last_metrics = None
            return "오류가 발생했습니다."

    def get_response(self, question: str) -> str:
        """
        기존 동기 인터페이스 유지용 래퍼.
        (CLI 테스트 등에서는 이 함수를 그대로 사용)
        """
        return asyncio.run(self.aget_response(question))