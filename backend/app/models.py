from pydantic import BaseModel
from typing import List, Optional

class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class CodeImproveRequest(BaseModel):
    code: str
    prompt: str
    conversationHistory: Optional[List[ConversationMessage]] = None

class CodeImproveResponse(BaseModel):
    improvedCode: str
    explanation: str 