# apps/backend/src/routers/chatbot.py

from fastapi import APIRouter, HTTPException, Depends
from ..schemas.chatbot import ChatbotRequest, ChatbotResponse
import logging
from typing import Optional
from uuid import UUID as UUIDType
from sqlalchemy.orm import Session

# Assuming the service is accessible
from workers.rag.src.chatbot.service import AzanChatbotService
from .auth import _parse_user_id
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/chatbot", tags=["chatbot"])
logger = logging.getLogger("azan.chatbot")



# Initialize the chatbot service globally or use a dependency if stateful
# For simplicity, initializing globally here. Consider dependency injection for more complex scenarios.
chatbot_service = AzanChatbotService()

@router.post("", response_model=ChatbotResponse)
async def get_chatbot_response(
    request: ChatbotRequest,
    user_uuid: UUIDType = Depends(_parse_user_id),
    db: Session = Depends(get_db)
):
    """
    챗봇에게 질문하고 답변을 받습니다.
    인증된 사용자의 정보를 바탕으로 개인화된 답변을 제공합니다.
    """
    try:
        # 사용자 정보 조회 및 포맷팅
        current_user = db.get(User, user_uuid)
        user_info = "정보 없음"
        if current_user:
            info_parts = [
                f"- 이름: {current_user.full_name}",
                f"- 학과: {current_user.desired_major or '미정'}",
                f"- 비자: {current_user.visa_type or '정보 없음'} (만료일: {current_user.visa_expiry_date or '정보 없음'})",
                f"- TOPIK: {current_user.topik_level or '정보 없음'}급 (목표: {current_user.topik_target_level or '정보 없음'}급)",
                f"- 선호 언어: {current_user.preferred_language}",
            ]
            user_info = "\n".join(info_parts)

        answer = await chatbot_service.aget_response(
            question=request.question, 
            session_id=request.session_id,
            user_info=user_info
        )
        return ChatbotResponse(answer=answer)
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail="챗봇 응답 처리 중 오류가 발생했습니다.")
