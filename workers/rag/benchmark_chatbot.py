import asyncio
import logging
import os
import time
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List

import pytest

# 테스트 실행 시 src 패키지 임포트 경로 보정
CURRENT_PATH = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_PATH.parents[2] # 프로젝트 루트 (Ajou-International)

import sys

sys.path.append(str(CURRENT_PATH.parent))

from src.chatbot.service import AzanChatbotService

# 로깅 설정
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("benchmark_azan")

# test case 설정
QUESTIONS = [
    "아주대학교 국제학부 휴학 절차 알려줘",
    "외부 정보를 사용해서 알려줘",
    "어학 교환학생 지원 마감일이 언제야?",
    "외부 정보를 사용해서 알려줘",
    "외국인 유학생 보험 관련 공지가 있는지 알려줘",
    "외부 정보를 사용해서 알려줘",
]

# 환경변수 확인
def _check_env() -> None:
    """벤치마크 실행 전 필수 환경변수 확인."""
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY가 설정되지 않아 벤치마크를 건너뜁니다.")

# 벤치마크 스크립트 실행 - pytest는 비동기 함수를 지원하지 않기 때문에 asyncio.run을 사용해야 함
def test_benchmark_chatbot_basic():
    """
    간단한 질문 세트에 대해
    - 응답 성공 여부
    - 단계별 지연 시간
    을 측정하는 벤치마크 테스트.
    """
    _check_env()

    # 벤치마크 스크립트 실행 - 내부에서 비동기 함수 설정 후 asyncio.run을 통해 실행
    # AzanChatbotService의 aget_response 함수가 비동기 함수이기 때문에 비동기 함수 설정 후 asyncio.run을 통해 실행
    # 시간, 응답, 지연 시간, 컨텍스트 토큰 추정, 문서 개수, 상위 점수, 평균 점수, LLM 사용량 측정
    async def _run():
        """
        QUESTIONS 리스트를 순회하며 각 질문에 대해 벤치마크 실행
        - 시간, 응답, 지연 시간, 컨텍스트 토큰 추정, 문서 개수, 상위 점수, 평균 점수, LLM 사용량 측정
        """
        service = AzanChatbotService()

        per_question: List[Dict[str, Any]] = []

        for q in QUESTIONS:
            started = time.perf_counter()
            response = await service.aget_response(q)
            elapsed_ms = (time.perf_counter() - started) * 1000

            metrics = service.last_metrics or {}
            llm_usage = metrics.get("llm_usage") or {}
            context_text = metrics.get("context_text") or ""

            docs_count = metrics.get("docs_count")
            top_score = metrics.get("top_score")
            avg_score = metrics.get("avg_score")

            # context token 대략 추정 (문자 수 * 1.5) - 한글 기준
            context_tokens_est = max(1, int(len(context_text) * 1.5)) if context_text else 0

            logger.info("Q: %s", q)
            logger.info("Response : %s", response.replace("\n", " "))
            logger.info("Latency: %.1f ms", elapsed_ms)
            logger.info(
                "Docs=%s top_score=%s avg_score=%s usage=%s",
                docs_count,
                top_score,
                avg_score,
                llm_usage,
            )
            # 응답 형식 검증 - 문자열 형식 검증, 빈 문자열 검증
            assert isinstance(response, str)
            assert response.strip() != ""

            per_question.append(
                {
                    "question": q,
                    "response": response,
                    "latency_ms": elapsed_ms,
                    "docs_count": docs_count,
                    "top_score": top_score,
                    "avg_score": avg_score,
                    "llm_usage": llm_usage,
                    "context_tokens_est": context_tokens_est,
                }
            )

        # 결과 저장
        avg_latency = sum(item["latency_ms"] for item in per_question) / len(per_question)
        logger.info("=== Benchmark Summary ===")
        logger.info("Questions: %d", len(QUESTIONS))
        logger.info("Avg latency: %.1f ms", avg_latency)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        out_dir = CURRENT_PATH.parent / "benchmark_result"
        out_dir.mkdir(parents=True, exist_ok=True)

        html_path = out_dir / f"result_{timestamp}.html"

        # HTML 테이블 생성
        rows_html = []
        for item in per_question:
            q = item["question"]
            resp_preview = item["response"][:200].replace("\n", " ")
            latency = item["latency_ms"]
            docs_count = item["docs_count"]
            top_score = item["top_score"]
            avg_score = item["avg_score"]
            usage = item["llm_usage"]
            context_tokens_est = item["context_tokens_est"]

            # LLM 사용량 포맷팅
            usage_pretty = ""
            for key, value in usage.items():
                usage_pretty += f"<li>{key}: {value}</li>"
            usage_pretty += "</ul>"

            rows_html.append(
                "<tr>"
                f"<td>{q}</td>"
                f"<td>{latency:.1f} ms</td>"
                f"<td>{docs_count}</td>"
                f"<td>{top_score}</td>"
                f"<td>{avg_score}</td>"
                f"<td>{context_tokens_est}</td>"
                f"<td><pre>{usage_pretty}</pre></td>"
                f"<td><pre>{resp_preview}</pre></td>"
                "</tr>"
            )

        html = f"""
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Azan Chatbot Benchmark {timestamp}</title>
            <style>
              table {{ border-collapse: collapse; }}
              th, td {{ border: 1px solid #ccc; padding: 4px 8px; vertical-align: top; }}
              pre {{ white-space: pre-wrap; word-break: break-word; margin: 0; }}
            </style>
          </head>
          <body>
            <h1>Azan Chatbot Benchmark</h1>
            <p>Run at: {timestamp}</p>
            <p>Questions: {len(per_question)}</p>
            <p>Avg latency: {avg_latency:.1f} ms</p>
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Latency</th>
                  <th>Docs Count</th>
                  <th>Top Score</th>
                  <th>Avg Score</th>
                  <th>Context Tokens (est)</th>
                  <th>LLM Usage</th>
                  <th>Response (preview)</th>
                </tr>
              </thead>
              <tbody>
                {''.join(rows_html)}
              </tbody>
            </table>
          </body>
        </html>
        """

        html_path.write_text(html, encoding="utf-8")
        logger.info("Benchmark HTML saved to %s", html_path)

    # 벤치마크 스크립트 실행 - 비동기 함수이기 때문에 asyncio.run을 통해 실행
    asyncio.run(_run())