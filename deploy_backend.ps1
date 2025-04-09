#!/usr/bin/env pwsh
# Backend deployment script for Projector

# Function to log messages with timestamp
function Log-Message {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "$timestamp - $message"
}

# Check if Python is installed
$pythonVersion = $null
$pythonCmd = $null
try {
    $pythonVersion = python --version
    Log-Message "Python detected: $pythonVersion"
    $pythonCmd = "python"
} catch {
    try {
        $pythonVersion = python3 --version
        Log-Message "Python detected: $pythonVersion"
        $pythonCmd = "python3"
    } catch {
        Log-Message "ERROR: Python is not installed. Please install Python 3.8 or later before continuing."
        exit 1
    }
}

# Set up virtual environment
$VENV_NAME = "projector-env"
Log-Message "Creating virtual environment: $VENV_NAME"

# Create virtual environment
& $pythonCmd -m venv $VENV_NAME

# Activate virtual environment based on OS
Log-Message "Activating virtual environment..."
if ($IsWindows -or $env:OS -match "Windows") {
    $activateScript = Join-Path -Path $VENV_NAME -ChildPath "Scripts\Activate.ps1"
    if (Test-Path $activateScript) {
        & $activateScript
    } else {
        Log-Message "WARNING: Could not find activation script at $activateScript"
        Log-Message "Continuing with system Python installation..."
    }
} else {
    $activateScript = Join-Path -Path $VENV_NAME -ChildPath "bin/activate.ps1"
    if (Test-Path $activateScript) {
        & $activateScript
    } else {
        Log-Message "WARNING: Could not find activation script at $activateScript"
        Log-Message "Continuing with system Python installation..."
    }
}

# Install required packages
Log-Message "Installing required packages..."
& $pythonCmd -m pip install fastapi uvicorn python-dotenv pydantic sqlalchemy

# Create requirements.txt for future deployments
& $pythonCmd -m pip freeze > ./requirements.txt
Log-Message "Created ./requirements.txt for future deployments."

# Create sample .env file if it doesn't exist
if (-not (Test-Path -Path "./.env")) {
    Log-Message "Creating sample .env file..."
    @"
# Backend Environment Variables
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
"@ | Out-File -FilePath "./.env" -Encoding utf8
    Log-Message "Created sample .env file. Please update with your actual configuration."
}

# Set up database
Log-Message "Setting up database..."
if (-not (Test-Path -Path "./api")) {
    New-Item -Path "./api" -ItemType Directory
}

if (-not (Test-Path -Path "./api/models.py")) {
    @"
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    github_url = Column(String(255), nullable=True)
    slack_channel = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    features = relationship("Feature", back_populates="project")

class Feature(Base):
    __tablename__ = "features"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    project_id = Column(Integer, ForeignKey("projects.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="features")
    tasks = relationship("Task", back_populates="feature")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    feature_id = Column(Integer, ForeignKey("features.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    feature = relationship("Feature", back_populates="tasks")

print("Database models initialized")
"@ | Out-File -FilePath "./api/models.py" -Encoding utf8
}

if (-not (Test-Path -Path "./api/main.py")) {
    @"
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="Projector API", description="API for Projector application")

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from api.models import Base, Project, Feature, Task

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for API
class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    progress: int = 0
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: int
    feature_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class FeatureBase(BaseModel):
    name: str
    description: Optional[str] = None
    progress: int = 0
    completed: bool = False

class FeatureCreate(FeatureBase):
    pass

class FeatureResponse(FeatureBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    tasks: List[TaskResponse] = []

    class Config:
        orm_mode = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    github_url: Optional[str] = None
    slack_channel: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    features: List[FeatureResponse] = []

    class Config:
        orm_mode = True

# API Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to Projector API"}

@app.get("/projects", response_model=List[ProjectResponse])
def get_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects

@app.post("/projects", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.post("/projects/{project_id}/features", response_model=FeatureResponse)
def create_feature(project_id: int, feature: FeatureCreate, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_feature = Feature(**feature.dict(), project_id=project_id)
    db.add(db_feature)
    db.commit()
    db.refresh(db_feature)
    return db_feature

@app.post("/features/{feature_id}/tasks", response_model=TaskResponse)
def create_task(feature_id: int, task: TaskCreate, db: Session = Depends(get_db)):
    db_feature = db.query(Feature).filter(Feature.id == feature_id).first()
    if db_feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    db_task = Task(**task.dict(), feature_id=feature_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task
"@ | Out-File -FilePath "./api/main.py" -Encoding utf8
}

# Create __init__.py file to make the api directory a proper Python package
if (-not (Test-Path -Path "./api/__init__.py")) {
    @"
# API package initialization
"@ | Out-File -FilePath "./api/__init__.py" -Encoding utf8
    Log-Message "Created ./api/__init__.py file."
}

# Start the backend server
Log-Message "Starting backend server..."
$serverProcess = Start-Process -FilePath $pythonCmd -ArgumentList "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--reload" -PassThru -NoNewWindow
Log-Message "Backend server started with PID: $($serverProcess.Id)"
Log-Message "API is now available at http://localhost:8000"
Log-Message "API documentation is available at http://localhost:8000/docs"
Log-Message "To stop the server, press Ctrl+C or kill process $($serverProcess.Id)"
