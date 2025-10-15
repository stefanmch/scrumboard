# PowerShell script to start all services

# Colors for output
function Write-Info {
    param($Message)
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Function to wait for PostgreSQL
function Wait-ForPostgres {
    Write-Info "Waiting for PostgreSQL to be ready..."
    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        try {
            docker compose exec -T postgres pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "PostgreSQL is ready!"
                return $true
            }
        } catch {}

        $attempt++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-Error "PostgreSQL failed to become ready after 60 seconds"
    return $false
}

# Function to wait for backend API
function Wait-ForBackend {
    Write-Info "Waiting for backend API to be ready..."
    $maxAttempts = 30
    $attempt = 0
    $port = if ($env:PORT) { $env:PORT } else { "3001" }

    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend API is ready!"
                return $true
            }
        } catch {
            # Try simple TCP connection check
            try {
                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $tcpClient.Connect("localhost", [int]$port)
                $tcpClient.Close()
                Write-Success "Backend API is ready!"
                return $true
            } catch {}
        }

        $attempt++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-Error "Backend API failed to become ready after 60 seconds"
    return $false
}

# Parse command line arguments
param(
    [switch]$StopDb,
    [switch]$SkipInstall,
    [switch]$SkipMigrations,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\start-all.ps1 [options]"
    Write-Host "Options:"
    Write-Host "  -StopDb          Stop database when script exits (default: keeps running)"
    Write-Host "  -SkipInstall     Skip pnpm install step"
    Write-Host "  -SkipMigrations  Skip database migrations"
    Write-Host "  -Help            Show this help message"
    exit 0
}

# Main script
Write-Info "Starting Scrumboard Application Stack"
Write-Host "========================================"

# Check for required tools
Write-Info "Checking required tools..."

if (-not (Test-Command docker)) {
    Write-Error "Docker is not installed. Please install Docker first."
    exit 1
}

if (-not (Test-Command pnpm)) {
    Write-Error "pnpm is not installed. Please install pnpm first."
    exit 1
}

if (-not (Test-Command node)) {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

Write-Success "All required tools are available"

# Load environment variables
if (Test-Path .env) {
    Write-Info "Loading environment variables from .env file..."
    Get-Content .env | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
} else {
    Write-Warning ".env file not found. Using default values."
}

# Set default values if not set
if (-not $env:POSTGRES_DB) { $env:POSTGRES_DB = "scrumboard" }
if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = "scrumboard_user" }
if (-not $env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD = "scrumboard_password" }
if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = "5433" }
if (-not $env:PORT) { $env:PORT = "3001" }

# Install dependencies
if (-not $SkipInstall) {
    Write-Info "Installing dependencies..."
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    Write-Success "Dependencies installed"
} else {
    Write-Info "Skipping dependency installation"
}

# Start database
Write-Info "Starting PostgreSQL database..."
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start database"
    exit 1
}

# Wait for database to be ready
if (-not (Wait-ForPostgres)) {
    Write-Error "Database is not responding"
    docker compose logs postgres
    exit 1
}

# Run database migrations
if (-not $SkipMigrations) {
    Write-Info "Running database migrations..."
    Push-Location apps/api
    pnpm prisma generate
    pnpm prisma db push
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Database migrations might have failed. Check the logs above."
    } else {
        Write-Success "Database migrations completed"
    }
    Pop-Location
} else {
    Write-Info "Skipping database migrations"
}

# Store process jobs
$jobs = @()

# Start backend
Write-Info "Starting backend API server..."
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location apps/api
    pnpm start:dev
}
$jobs += $backendJob

# Wait for backend to be ready
if (-not (Wait-ForBackend)) {
    Write-Error "Backend API is not responding"
    $jobs | Stop-Job | Remove-Job
    exit 1
}

# Start frontend
Write-Info "Starting frontend application..."
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location apps/web
    pnpm dev
}
$jobs += $frontendJob

# Print access information
Write-Host ""
Write-Host "========================================"
Write-Success "All services are running!"
Write-Host ""
Write-Host "Access the application at:"
Write-Host "  Frontend:  " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Blue
Write-Host "  Backend:   " -NoNewline; Write-Host "http://localhost:$env:PORT" -ForegroundColor Blue
Write-Host "  Database:  " -NoNewline; Write-Host "localhost:$env:POSTGRES_PORT" -ForegroundColor Blue
Write-Host ""
Write-Host "Database credentials:"
Write-Host "  Database:  $env:POSTGRES_DB"
Write-Host "  User:      $env:POSTGRES_USER"
Write-Host "  Password:  $env:POSTGRES_PASSWORD"
Write-Host ""
Write-Host "Press Ctrl+C to stop all services"
Write-Host "========================================"

# Register cleanup
try {
    # Keep showing logs from background jobs
    while ($true) {
        $jobs | ForEach-Object {
            Receive-Job -Job $_ -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Info "Shutting down services..."

    # Stop background jobs
    $jobs | Stop-Job | Remove-Job

    # Stop database if requested
    if ($StopDb) {
        Write-Info "Stopping database..."
        docker compose down
    } else {
        Write-Info "Database will continue running. Use 'pnpm db:down' to stop it."
    }

    Write-Success "Cleanup complete"
}