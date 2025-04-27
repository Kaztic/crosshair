from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class CodeEdit(BaseModel):
    startLine: int
    endLine: int
    filepath: str
    code: str

class DiffInfo(BaseModel):
    """Information about differences between original and improved code"""
    additions: int  # Number of lines added
    deletions: int  # Number of lines deleted
    changes: int    # Number of lines changed
    diff: Optional[str] = None  # Optional unified diff format

class CodeImproveRequest(BaseModel):
    code: str
    prompt: str
    conversationHistory: Optional[List[ConversationMessage]] = None
    wholeFile: Optional[bool] = False  # Flag to indicate whole file editing

class CodeImproveResponse(BaseModel):
    improvedCode: str
    explanation: str
    preciseEdits: Optional[List[CodeEdit]] = None 
    diffInfo: Optional[DiffInfo] = None  # Add diff information to the response 