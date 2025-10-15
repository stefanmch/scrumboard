#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
    print_info "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U ${POSTGRES_USER:-scrumboard_user} -d ${POSTGRES_DB:-scrumboard} >/dev/null 2>&1; then
            print_success "PostgreSQL is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo ""
    print_error "PostgreSQL failed to become ready after 60 seconds"
    return 1
}

# Function to wait for the backend API to be ready
wait_for_backend() {
    print_info "Waiting for backend API to be ready..."
    local max_attempts=30
    local attempt=0
    local port=${API_PORT:-${PORT:-3001}}

    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:${port}/health >/dev/null 2>&1 || nc -z localhost ${port} 2>/dev/null; then
            print_success "Backend API is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo ""
    print_error "Backend API failed to become ready after 60 seconds"
    return 1
}

# Function to cleanup on exit
cleanup() {
    print_info "Shutting down services..."

    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi

    # Stop database if requested
    if [ "$STOP_DB_ON_EXIT" = "true" ]; then
        print_info "Stopping database..."
        docker compose down
    else
        print_info "Database will continue running. Use 'pnpm db:down' to stop it."
    fi

    print_success "Cleanup complete"
    exit 0
}

# Trap signals for cleanup
trap cleanup INT TERM EXIT

# Main script
main() {
    print_info "Starting Scrumboard Application Stack"
    echo "========================================"

    # Check for required tools
    print_info "Checking required tools..."

    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command_exists pnpm; then
        print_error "pnpm is not installed. Please install pnpm first."
        exit 1
    fi

    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    print_success "All required tools are available"

    # Load environment variables
    if [ -f .env ]; then
        print_info "Loading environment variables from .env file..."
        export $(cat .env | grep -v '^#' | xargs)
    else
        print_warning ".env file not found. Using default values."
    fi

    # Parse command line arguments
    STOP_DB_ON_EXIT="false"
    SKIP_INSTALL="false"
    SKIP_DB_MIGRATIONS="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --stop-db)
                STOP_DB_ON_EXIT="true"
                shift
                ;;
            --skip-install)
                SKIP_INSTALL="true"
                shift
                ;;
            --skip-migrations)
                SKIP_DB_MIGRATIONS="true"
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --stop-db          Stop database when script exits (default: keeps running)"
                echo "  --skip-install     Skip pnpm install step"
                echo "  --skip-migrations  Skip database migrations"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                print_warning "Unknown option: $1"
                shift
                ;;
        esac
    done

    # Install dependencies
    if [ "$SKIP_INSTALL" = "false" ]; then
        print_info "Installing dependencies..."
        pnpm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            exit 1
        fi
        print_success "Dependencies installed"
    else
        print_info "Skipping dependency installation"
    fi

    # Start database
    print_info "Starting PostgreSQL database..."
    docker compose up -d postgres
    if [ $? -ne 0 ]; then
        print_error "Failed to start database"
        exit 1
    fi

    # Wait for database to be ready
    if ! wait_for_postgres; then
        print_error "Database is not responding"
        docker compose logs postgres
        exit 1
    fi

    # Run database migrations
    if [ "$SKIP_DB_MIGRATIONS" = "false" ]; then
        print_info "Running database migrations..."
        cd apps/api
        pnpm prisma generate
        pnpm prisma db push
        if [ $? -ne 0 ]; then
            print_warning "Database migrations might have failed. Check the logs above."
        else
            print_success "Database migrations completed"
        fi
        cd ../..
    else
        print_info "Skipping database migrations"
    fi

    # Start backend
    print_info "Starting backend API server..."
    cd apps/api
    API_PORT=${API_PORT:-${PORT:-3001}} pnpm start:dev &
    BACKEND_PID=$!
    cd ../..

    # Wait for backend to be ready
    if ! wait_for_backend; then
        print_error "Backend API is not responding"
        exit 1
    fi

    # Start frontend
    print_info "Starting frontend application..."
    cd apps/web
    PORT=${FRONTEND_PORT:-3000} pnpm dev &
    FRONTEND_PID=$!
    cd ../..

    # Print access information
    echo ""
    echo "========================================"
    print_success "All services are running!"
    echo ""
    echo "Access the application at:"
    echo "  Frontend:  ${BLUE}http://localhost:${FRONTEND_PORT:-3000}${NC}"
    echo "  Backend:   ${BLUE}http://localhost:${API_PORT:-${PORT:-3001}}${NC}"
    echo "  Database:  ${BLUE}localhost:${POSTGRES_PORT:-5433}${NC}"
    echo ""
    echo "Database credentials:"
    echo "  Database:  ${POSTGRES_DB:-scrumboard}"
    echo "  User:      ${POSTGRES_USER:-scrumboard_user}"
    echo "  Password:  ${POSTGRES_PASSWORD:-scrumboard_password}"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo "========================================"

    # Keep script running
    wait
}

# Run main function
main "$@"