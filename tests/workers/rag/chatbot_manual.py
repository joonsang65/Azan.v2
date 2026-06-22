# apps/rag/test_azan.py

import sys
import logging
from pathlib import Path

current_path = Path(__file__).resolve()
sys.path.append(str(current_path.parent))

from env_utils import RAG_SRC_PATH, assert_neon_connection, require_gemini_api_key

sys.path.append(str(RAG_SRC_PATH))

# 로깅 설정
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

def main():
    print("\n" + "="*50)
    print("Azan Chatbot Integration Test")
    print("="*50 + "\n")

    try:
        require_gemini_api_key()
        assert_neon_connection()
        from src.chatbot.service import AzanChatbotService

        # 1. 챗봇 서비스 인스턴스 생성
        chatbot = AzanChatbotService()
        print("Service Initialized Successfully.\n")

        while True:
            try:
                # 2. 사용자 입력
                user_input = input("🗣️ 질문 (종료: q): ").strip()
                
                if user_input.lower() in ['q', 'quit', 'exit']:
                    print("👋 챗봇을 종료합니다.")
                    break
                
                if not user_input:
                    continue

                # 3. 답변 요청
                print("\n🤖 Azan이 생각 중입니다...")
                response = chatbot.get_response(user_input)
                
                # 4. 결과 출력
                print("-" * 50)
                print(f"💬 답변:\n{response}")
                print("-" * 50 + "\n")

            except KeyboardInterrupt:
                print("\n\n⚠️ 사용자에 의해 챗봇을 강제 종료합니다. (Ctrl+C)")
                break

    except Exception as e:
        print(f"\n [Error] 테스트 중 오류 발생: {e}")

if __name__ == "__main__":
    main()
