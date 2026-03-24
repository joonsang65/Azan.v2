# apps/backend/src/schemas/chatbot.py

from pydantic import BaseModel


class ChatbotRequest(BaseModel):
    question: str


class ChatbotResponse(BaseModel):
    answer: str
