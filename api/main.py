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
from .routes import models, projects, chat, github, slack

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
