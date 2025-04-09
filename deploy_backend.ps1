#!/usr/bin/env pwsh
# Backend Deployment Script for Projector

# Configuration
$PYTHON_VERSION = "3.10"
$VENV_NAME = "projector-env"
$BACKEND_DIR = "./api"
$REQUIREMENTS_FILE = "./requirements.txt"
$LOG_FILE = "./backend_deploy.log"

# Create log file
New-Item -Path $LOG_FILE -ItemType File -Force | Out-Null
function Write-Log {
    param (
        [string]$Message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LOG_FILE -Append
}

Write-Log "Starting backend deployment process..."

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Log "Python detected: $pythonVersion"
} catch {
    Write-Log "ERROR: Python not found. Please install Python $PYTHON_VERSION or later."
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path -Path $VENV_NAME)) {
    Write-Log "Creating virtual environment: $VENV_NAME"
    python -m venv $VENV_NAME
    if (-not $?) {
        Write-Log "ERROR: Failed to create virtual environment."
        exit 1
    }
} else {
    Write-Log "Virtual environment already exists: $VENV_NAME"
}

# Activate virtual environment
Write-Log "Activating virtual environment..."
if ($IsWindows) {
    & "./$VENV_NAME/Scripts/Activate.ps1"
} else {
    & "./$VENV_NAME/bin/Activate.ps1"
}

# Install or update dependencies
if (Test-Path -Path $REQUIREMENTS_FILE) {
    Write-Log "Installing dependencies from $REQUIREMENTS_FILE"
    pip install -r $REQUIREMENTS_FILE
    if (-not $?) {
        Write-Log "ERROR: Failed to install dependencies."
        exit 1
    }
} else {
    Write-Log "Installing required packages..."
    pip install fastapi uvicorn python-dotenv pydantic sqlalchemy
    if (-not $?) {
        Write-Log "ERROR: Failed to install required packages."
        exit 1
    }
    
    # Create requirements.txt for future use
    pip freeze > $REQUIREMENTS_FILE
    Write-Log "Created $REQUIREMENTS_FILE for future deployments."
}

# Check for environment file
$ENV_FILE = "./.env"
if (-not (Test-Path -Path $ENV_FILE)) {
    Write-Log "Creating sample .env file..."
    @"
# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
DEBUG=True

# Database Configuration
DATABASE_URL=sqlite:///./projector.db

# GitHub Configuration
GITHUB_TOKEN=your_github_token

# Slack Configuration
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_SIGNING_SECRET=your_slack_signing_secret

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4
"@ | Out-File -FilePath $ENV_FILE
    Write-Log "Created sample .env file. Please update with your actual configuration."
}

# Run database migrations if needed
Write-Log "Setting up database..."
if (Test-Path -Path "$BACKEND_DIR/models") {
    python -c "from api.models import *; print('Database models initialized')"
    if (-not $?) {
        Write-Log "WARNING: Failed to initialize database models."
    }
}

# Start the backend server
Write-Log "Starting backend server..."
$serverProcess = Start-Process -FilePath "python" -ArgumentList "-m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000" -PassThru -NoNewWindow

Write-Log "Backend server started with PID: $($serverProcess.Id)"
Write-Log "API is now available at http://localhost:8000"
Write-Log "API documentation is available at http://localhost:8000/docs"
Write-Log "To stop the server, press Ctrl+C or kill process $($serverProcess.Id)"

# Keep the script running until manually terminated
try {
    Wait-Process -Id $serverProcess.Id
} catch {
    Write-Log "Backend server process terminated."
}

Write-Log "Backend deployment completed."
