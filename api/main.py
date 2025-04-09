"""
FastAPI backend for the Projector application.
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

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

# Define models
class Project(BaseModel):
    id: str
    name: str
    description: str
    github_url: str = None
    slack_channel: str = None

class ProjectCreate(BaseModel):
    name: str
    description: str
    github_url: str = None
    slack_channel: str = None

# Sample data
projects = []

# API Routes
@app.get("/api/projects")
async def get_projects():
    """Get all projects."""
    return projects

@app.post("/api/projects")
async def create_project(project: ProjectCreate):
    """Create a new project."""
    new_project = Project(
        id=f"proj_{len(projects) + 1}",
        name=project.name,
        description=project.description,
        github_url=project.github_url,
        slack_channel=project.slack_channel
    )
    projects.append(new_project)
    return new_project

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
