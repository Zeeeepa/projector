"""
PR Review Bot API routes for the Projector application.
"""
import os
import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

# Import PR Review Bot manager
from backend.pr_review_bot_manager import PRReviewBotManager

# Initialize the router with a prefix
router = APIRouter(prefix="/pr_review_bot", tags=["pr_review_bot"])
logger = logging.getLogger(__name__)

# Models
class PRReviewBotConfig(BaseModel):
    """PR Review Bot configuration model."""
    webhook_secret: str
    github_token: str
    auto_review: bool = True
    monitor_branches: bool = True
    setup_all_repos_webhooks: bool = True
    validate_documentation: bool = True
    documentation_files: List[str] = ["STRUCTURE.md", "STEP-BY-STEP.md"]
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    slack_bot_token: Optional[str] = None
    slack_channel: Optional[str] = None
    instructions: Optional[str] = None

class PRReviewResponse(BaseModel):
    """PR Review response model."""
    pr_number: int
    repo: str
    status: str
    review_url: Optional[str] = None
    message: str

class PRStatus(BaseModel):
    """PR status model."""
    repo: str
    number: int
    title: str
    status: str
    url: str

class PRStatusUpdate(BaseModel):
    """PR status update model."""
    prs: List[PRStatus]

class BotConnectionStatus(BaseModel):
    """Bot connection status model."""
    status: str

# PR Review Bot manager instance
_pr_review_bot_manager = None

def get_pr_review_bot_manager():
    """
    Get or create a PR Review Bot manager instance.
    
    Returns:
        PRReviewBotManager instance
    """
    global _pr_review_bot_manager
    if _pr_review_bot_manager is None:
        _pr_review_bot_manager = PRReviewBotManager()
    return _pr_review_bot_manager

@router.get("/config")
async def get_pr_review_bot_config():
    """Get PR Review Bot configuration."""
    manager = get_pr_review_bot_manager()
    return manager.get_config()

@router.post("/config")
async def update_pr_review_bot_config(config: PRReviewBotConfig):
    """Update PR Review Bot configuration."""
    manager = get_pr_review_bot_manager()
    try:
        manager.update_config(config.dict())
        return {"status": "success", "message": "Configuration updated successfully"}
    except Exception as e:
        logger.error(f"Error updating PR Review Bot configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/review/{repo}/{pr_number}")
async def trigger_pr_review(repo: str, pr_number: int, x_github_token: Optional[str] = Header(None)):
    """Trigger a PR review manually."""
    manager = get_pr_review_bot_manager()
    try:
        # Use provided token or the one from config
        token = x_github_token or manager.get_config().get("github_token")
        if not token:
            raise HTTPException(status_code=400, detail="GitHub token is required")
        
        result = manager.review_pr(repo, pr_number, token)
        return PRReviewResponse(
            pr_number=pr_number,
            repo=repo,
            status="success",
            review_url=result.get("review_url"),
            message="PR review completed successfully"
        )
    except Exception as e:
        logger.error(f"Error reviewing PR {pr_number} in {repo}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/setup-webhooks")
async def setup_webhooks(repos: Optional[List[str]] = None):
    """Set up webhooks for repositories."""
    manager = get_pr_review_bot_manager()
    try:
        result = manager.setup_webhooks(repos)
        return {
            "status": "success", 
            "message": "Webhooks set up successfully",
            "details": result
        }
    except Exception as e:
        logger.error(f"Error setting up webhooks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_pr_review_bot_status():
    """Get PR Review Bot status."""
    manager = get_pr_review_bot_manager()
    try:
        status = manager.get_status()
        return status
    except Exception as e:
        logger.error(f"Error getting PR Review Bot status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start")
async def start_pr_review_bot():
    """Start the PR Review Bot."""
    manager = get_pr_review_bot_manager()
    try:
        result = manager.start_pr_review_bot()
        return result
    except Exception as e:
        logger.error(f"Error starting PR Review Bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_pr_review_bot():
    """Stop the PR Review Bot."""
    manager = get_pr_review_bot_manager()
    try:
        result = manager.stop_pr_review_bot()
        return result
    except Exception as e:
        logger.error(f"Error stopping PR Review Bot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notify-connected")
async def notify_connected(status: BotConnectionStatus):
    """Notify that the PR Review Bot is connected."""
    try:
        logger.info(f"PR Review Bot connected: {status.status}")
        # Update the manager status
        manager = get_pr_review_bot_manager()
        manager.set_connection_status("connected")
        return {"status": "success", "message": "Connection status updated"}
    except Exception as e:
        logger.error(f"Error updating connection status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notify-disconnected")
async def notify_disconnected(status: BotConnectionStatus):
    """Notify that the PR Review Bot is disconnected."""
    try:
        logger.info(f"PR Review Bot disconnected: {status.status}")
        # Update the manager status
        manager = get_pr_review_bot_manager()
        manager.set_connection_status("disconnected")
        return {"status": "success", "message": "Connection status updated"}
    except Exception as e:
        logger.error(f"Error updating connection status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-status")
async def update_pr_status(status_update: PRStatusUpdate):
    """Update PR status."""
    try:
        logger.info(f"Updating PR status: {len(status_update.prs)} PRs")
        # Update the manager with PR status
        manager = get_pr_review_bot_manager()
        manager.update_pr_status(status_update.prs)
        return {"status": "success", "message": "PR status updated"}
    except Exception as e:
        logger.error(f"Error updating PR status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
