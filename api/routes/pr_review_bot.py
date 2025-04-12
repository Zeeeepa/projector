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

router = APIRouter(tags=["pr_review_bot"])
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

class PRReviewResponse(BaseModel):
    """PR Review response model."""
    pr_number: int
    repo: str
    status: str
    review_url: Optional[str] = None
    message: str

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

@router.get("/pr-review-bot/config")
async def get_pr_review_bot_config():
    """Get PR Review Bot configuration."""
    manager = get_pr_review_bot_manager()
    return manager.get_config()

@router.post("/pr-review-bot/config")
async def update_pr_review_bot_config(config: PRReviewBotConfig):
    """Update PR Review Bot configuration."""
    manager = get_pr_review_bot_manager()
    try:
        manager.update_config(config.dict())
        return {"status": "success", "message": "Configuration updated successfully"}
    except Exception as e:
        logger.error(f"Error updating PR Review Bot configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pr-review-bot/review/{repo}/{pr_number}")
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

@router.post("/pr-review-bot/setup-webhooks")
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

@router.get("/pr-review-bot/status")
async def get_pr_review_bot_status():
    """Get PR Review Bot status."""
    manager = get_pr_review_bot_manager()
    try:
        status = manager.get_status()
        return status
    except Exception as e:
        logger.error(f"Error getting PR Review Bot status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
