#!/usr/bin/env pwsh
# Frontend Deployment Script for Projector

# Configuration
$NODE_VERSION = "18"
$LOG_FILE = "./frontend_deploy.log"
$DIST_DIR = "./dist"
$ENV_FILE = "./.env"

# Create log file
New-Item -Path $LOG_FILE -ItemType File -Force | Out-Null
function Write-Log {
    param (
        [string]$Message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LOG_FILE -Append
}

Write-Log "Starting frontend deployment process..."

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Log "Node.js detected: $nodeVersion"
} catch {
    Write-Log "ERROR: Node.js not found. Please install Node.js $NODE_VERSION or later."
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Log "npm detected: $npmVersion"
} catch {
    Write-Log "ERROR: npm not found. Please install npm."
    exit 1
}

# Install dependencies
Write-Log "Installing dependencies..."
npm install
if (-not $?) {
    Write-Log "ERROR: Failed to install dependencies."
    exit 1
}

# Check for environment file
if (-not (Test-Path -Path $ENV_FILE)) {
    Write-Log "Creating sample .env file..."
    @"
# Frontend Environment Variables
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Projector
VITE_DEFAULT_MODEL=gpt-4
"@ | Out-File -FilePath $ENV_FILE
    Write-Log "Created sample .env file. Please update with your actual configuration."
}

# Build the frontend
Write-Log "Building the frontend..."
npm run build
if (-not $?) {
    Write-Log "ERROR: Failed to build the frontend."
    exit 1
}

# Check if the build was successful
if (-not (Test-Path -Path $DIST_DIR)) {
    Write-Log "ERROR: Build directory not found. Build may have failed."
    exit 1
}

# Serve the frontend for testing
Write-Log "Starting development server..."
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "run dev" -PassThru -NoNewWindow

Write-Log "Frontend development server started with PID: $($serverProcess.Id)"
Write-Log "Frontend is now available at http://localhost:5173"
Write-Log "To stop the server, press Ctrl+C or kill process $($serverProcess.Id)"

# Keep the script running until manually terminated
try {
    Wait-Process -Id $serverProcess.Id
} catch {
    Write-Log "Frontend server process terminated."
}

Write-Log "Frontend deployment completed."

# Optional: Deploy to production server
# Uncomment and modify the following section for production deployment

<#
Write-Log "Deploying to production server..."

# Example: Copy to a web server directory
# Copy-Item -Path "$DIST_DIR/*" -Destination "/var/www/html/projector" -Recurse -Force

# Example: Deploy to AWS S3
# aws s3 sync $DIST_DIR s3://your-bucket-name/ --delete

# Example: Deploy to Azure Static Web Apps
# az staticwebapp deploy --source $DIST_DIR --app-name your-app-name

Write-Log "Production deployment completed."
#>
