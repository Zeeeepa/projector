"""
FastAPI backend for the Projector application.
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

# Import routes
from .routes import models, projects, chat, github, slack, pr_review_bot

# Import managers
from backend.github_manager import GitHubManager
from backend.slack_manager import SlackManager
from backend.project_database import ProjectDatabase
from backend.ai_user_agent import AIUserAgent
from backend.pr_review_bot_manager import PRReviewBotManager

# Load environment variables with explicit encoding
try:
    load_dotenv(encoding="utf-8")
except Exception as e:
    print(f"Error loading .env file: {e}")
    # Create a default .env file if it doesn't exist or has encoding issues
    with open(".env", "w", encoding="utf-8") as f:
        f.write("# API Configuration\n")
        f.write("API_PORT=8000\n")
        f.write("API_HOST=0.0.0.0\n")
        f.write("DEBUG=True\n")
    # Try loading again
    load_dotenv(encoding="utf-8")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Projector API",
    description="API for the Projector application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manager instances
_github_manager = None
_slack_manager = None
_project_database = None
_ai_user_agent = None
_pr_review_bot_manager = None

def get_github_manager():
    """
    Get or create a GitHub manager instance.
    
    Returns:
        GitHubManager instance
    """
    global _github_manager
    if _github_manager is None:
        _github_manager = GitHubManager()
    return _github_manager

def get_slack_manager():
    """
    Get or create a Slack manager instance.
    
    Returns:
        SlackManager instance
    """
    global _slack_manager
    if _slack_manager is None:
        slack_token = os.getenv("SLACK_TOKEN")
        default_channel = os.getenv("SLACK_DEFAULT_CHANNEL", "general")
        _slack_manager = SlackManager(slack_token, default_channel)
    return _slack_manager

def get_project_database():
    """
    Get or create a project database instance.
    
    Returns:
        ProjectDatabase instance
    """
    global _project_database
    if _project_database is None:
        _project_database = ProjectDatabase()
    return _project_database

def get_ai_user_agent():
    """
    Get or create an AI user agent instance.
    
    Returns:
        AIUserAgent instance
    """
    global _ai_user_agent
    if _ai_user_agent is None:
        slack_manager = get_slack_manager()
        github_manager = get_github_manager()
        project_database = get_project_database()
        
        # Initialize AI user agent
        _ai_user_agent = AIUserAgent(
            slack_manager=slack_manager,
            github_manager=github_manager,
            project_database=project_database
        )
    return _ai_user_agent

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

# Include routers
app.include_router(models.router, prefix="/api")
try:
    app.include_router(projects.router, prefix="/api")
except ImportError:
    logger.warning("Projects router not found, skipping")

try:
    app.include_router(chat.router, prefix="/api")
except ImportError:
    logger.warning("Chat router not found, skipping")

try:
    app.include_router(github.router, prefix="/api")
except ImportError:
    logger.warning("GitHub router not found, skipping")

try:
    app.include_router(slack.router, prefix="/api")
except ImportError:
    logger.warning("Slack router not found, skipping")

try:
    app.include_router(pr_review_bot.router, prefix="/api")
except ImportError:
    logger.warning("PR Review Bot router not found, skipping")

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to the Projector API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
