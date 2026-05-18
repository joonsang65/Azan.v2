# apps/backend/src/schemas/chatbot.py

from pydantic import BaseModel
from typing import Optional


class ChatbotRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default_session"


class ChatbotResponse(BaseModel):
    answer: str
