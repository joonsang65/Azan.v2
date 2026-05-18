# apps/backend/src/routers/chatbot.py

from fastapi import APIRouter, HTTPException
from ..schemas.chatbot import ChatbotRequest, ChatbotResponse
import logging

# Assuming the service is accessible
from workers.rag.src.chatbot.service import AzanChatbotService

router = APIRouter(prefix="/chatbot", tags=["chatbot"])
logger = logging.getLogger("azan.chatbot")



# Initialize the chatbot service globally or use a dependency if stateful
# For simplicity, initializing globally here. Consider dependency injection for more complex scenarios.
chatbot_service = AzanChatbotService()

@router.post("", response_model=ChatbotResponse)
async def get_chatbot_response(request: ChatbotRequest):
    """
    챗봇에게 질문하고 답변을 받습니다.
    입력 : request (사용자가 입력한 요청 - 질문, 세션 ID)
    출력 : answer (사용자 요청에 대한 답변)
    """
    try:
        answer = await chatbot_service.aget_response(
            question=request.question, 
            session_id=request.session_id
        )
        return ChatbotResponse(answer=answer)
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail="챗봇 응답 처리 중 오류가 발생했습니다.")
