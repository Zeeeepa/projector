"""
API routes for project management.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

# Initialize the router
router = APIRouter(prefix="/projects", tags=["projects"])

# Define models
class Project(BaseModel):
    id: str
    name: str
    description: str
    github_url: Optional[str] = None
    slack_channel: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: str
    github_url: Optional[str] = None
    slack_channel: Optional[str] = None

# Sample data
projects = []

@router.get("/")
async def get_projects():
    """Get all projects."""
    return projects

@router.post("/")
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

@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get a project by ID."""
    for project in projects:
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

@router.put("/{project_id}")
async def update_project(project_id: str, project_update: ProjectCreate):
    """Update a project."""
    for i, project in enumerate(projects):
        if project.id == project_id:
            updated_project = Project(
                id=project_id,
                name=project_update.name,
                description=project_update.description,
                github_url=project_update.github_url,
                slack_channel=project_update.slack_channel
            )
            projects[i] = updated_project
            return updated_project
    raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    for i, project in enumerate(projects):
        if project.id == project_id:
            del projects[i]
            return {"message": f"Project {project_id} deleted"}
    raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
