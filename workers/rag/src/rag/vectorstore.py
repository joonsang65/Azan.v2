# 백엔드 notices 테이블(embedding 컬럼)을 읽기 전용으로 조회한다. 적재는 backend/ingest_rag.py에서 수행.

import logging
from typing import List

import psycopg2
from langchain_core.documents import Document

from .RAG_config import settings
from .embedder import Embedder

logger = logging.getLogger("RAG")


class VectorStore:
    def __init__(self):
        try:
            self.embeddings = Embedder().get_embedding_function()
        except Exception as e:
            logger.error("임베딩 모델 초기화 실패: %s", e)
            raise

    def get_connection(self):
        """백엔드와 동일한 DB 연결 (RAG_config에서 backend/.env 기반으로 설정)."""
        try:
            conn = psycopg2.connect(**settings.DB_PARAMS)
            return conn
        except Exception as e:
            logger.error("DB 연결 실패: %s", e)
            raise

    def similarity_search(self, query: str, k: int = 3) -> List[Document]:
        """질문과 유사한 공지 검색. 백엔드 notices 테이블 컬럼명(title, body, url) 사용."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            query_embedding = self.embeddings.embed_query(query)
            # 백엔드 스키마: title, body, url, deadline, embedding (NULL 제외)
            search_query = """
                SELECT title, body, url, deadline, 1 - (embedding <=> %s::vector) AS similarity
                FROM notices
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
            """
            cursor.execute(search_query, (query_embedding, query_embedding, k))
            rows = cursor.fetchall()
            return [
                Document(
                    page_content=row[1] or "",
                    metadata={
                        "title": row[0] or "",
                        "source_url": row[2],
                        "url": row[2],
                        "deadline": row[3],
                        "deadline_at": row[3],  # 챗봇 포맷 호환
                        "score": row[4],
                    },
                )
                for row in rows
            ]
        except Exception as e:
            logger.error("Search failed: %s", e)
            return []
        finally:
            cursor.close()
            conn.close()
