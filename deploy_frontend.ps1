#!/usr/bin/env pwsh
# Frontend deployment script for Projector

# Function to log messages with timestamp
function Log-Message {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "$timestamp - $message"
}

# Check if Node.js is installed
$nodeVersion = $null
try {
    $nodeVersion = node -v
    Log-Message "Node.js detected: $nodeVersion"
} catch {
    Log-Message "ERROR: Node.js is not installed. Please install Node.js before continuing."
    exit 1
}

# Check if npm is installed
$npmVersion = $null
try {
    $npmVersion = npm -v
    Log-Message "npm detected: $npmVersion"
} catch {
    Log-Message "ERROR: npm is not installed. Please install npm before continuing."
    exit 1
}

# Start the deployment process
Log-Message "Starting frontend deployment process..."

# Install dependencies
Log-Message "Installing dependencies..."
npm install

# Build the frontend
Log-Message "Building the frontend..."
npm run build

# Check if build was successful
if ($LASTEXITCODE -ne 0) {
    Log-Message "ERROR: Failed to build the frontend."
    exit 1
}

# Success message with clear instructions
Log-Message "Frontend built successfully!"
Log-Message "To start the development server, run: npm run dev"
Log-Message "To preview the production build, run: npm run preview or npm run start"
Log-Message "  - Development server (npm run dev): http://localhost:5173"
Log-Message "  - Production preview (npm run preview/start): http://localhost:4173"

# Success message
Log-Message "Frontend deployment completed successfully!"
