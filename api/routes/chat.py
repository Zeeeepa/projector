"""
API routes for chat functionality.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from projector.backend.project_database import ProjectDatabase
from projector.backend.ai_user_agent import AIUserAgent
from projector.api.main import get_project_database, get_ai_user_agent

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    """Model for a chat message."""
    role: str
    content: str

class ChatRequest(BaseModel):
    """Model for a chat request."""
    message: str
    chat_history: Optional[List[ChatMessage]] = None
    provider_id: str
    model: str
    api_key: str
    custom_endpoint: Optional[str] = None
    project_id: Optional[str] = None

class ChatResponse(BaseModel):
    """Model for a chat response."""
    response: str
    chat_history: List[ChatMessage]

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and return a response."""
    try:
        # Add the user message to the chat history
        chat_history = request.chat_history or []
        chat_history.append(ChatMessage(role="user", content=request.message))
        
        # In a real implementation, this would call the AI provider
        # For now, we'll just echo the message back
        response = f"Echo: {request.message}"
        
        # Add the assistant response to the chat history
        chat_history.append(ChatMessage(role="assistant", content=response))
        
        return {
            "response": response,
            "chat_history": chat_history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
