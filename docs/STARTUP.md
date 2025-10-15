# Scrumboard Application Startup Guide

## Quick Start

The application consists of three main components:
- **PostgreSQL Database** (Docker container)
- **Backend API** (NestJS on port 3001)
- **Frontend Web App** (Next.js on port 3000)

## Starting All Services

### Option 1: Using npm scripts (Recommended)

**Linux/Mac:**
```bash
pnpm start:all
```

**Windows:**
```bash
pnpm start:all:win
```

### Option 2: Using scripts directly

**Linux/Mac:**
```bash
./scripts/start-all.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\start-all.ps1
```

## Script Options

The startup scripts support several command-line options:

- `--stop-db` - Stop the database when the script exits (default: database keeps running)
- `--skip-install` - Skip the `pnpm install` step if dependencies are already installed
- `--skip-migrations` - Skip database migrations if they've already been run
- `--help` - Show help message

### Examples:

```bash
# Start everything and stop database on exit
./scripts/start-all.sh --stop-db

# Quick start without installing dependencies
./scripts/start-all.sh --skip-install

# Start without running migrations (useful for development)
./scripts/start-all.sh --skip-migrations
```

## Manual Start (Step by Step)

If you prefer to start services individually:

### 1. Start the Database
```bash
pnpm db:up
```

### 2. Run Database Migrations
```bash
pnpm db:push
# or
pnpm db:migrate
```

### 3. Start the Backend API
```bash
cd apps/api
pnpm start:dev
```

### 4. Start the Frontend (in a new terminal)
```bash
cd apps/web
pnpm dev
```

## Accessing the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5433

## Database Management

### View database logs:
```bash
pnpm db:logs
```

### Access Prisma Studio (database GUI):
```bash
pnpm db:studio
```

### Reset database:
```bash
pnpm db:reset
```

### Stop database:
```bash
pnpm db:down
```

## Troubleshooting

### Port Already in Use

If you get an error about ports being in use, you can:

1. Check what's using the port:
   ```bash
   # Linux/Mac
   lsof -i :3000  # Frontend
   lsof -i :3001  # Backend
   lsof -i :5433  # Database

   # Windows
   netstat -ano | findstr :3000
   ```

2. Kill the process or change the port in `.env`

### Database Connection Issues

1. Check if Docker is running:
   ```bash
   docker ps
   ```

2. Check database logs:
   ```bash
   docker compose logs postgres
   ```

3. Verify environment variables in `.env` file

### Backend Not Starting

1. Check Node.js version (should be 18+):
   ```bash
   node --version
   ```

2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules apps/*/node_modules
   pnpm install
   ```

3. Check backend logs for specific errors

## Environment Variables

The application uses the following environment variables (defined in `.env`):

```env
# Database
DATABASE_URL=postgresql://scrumboard_user:scrumboard_password@localhost:5433/scrumboard?schema=public
POSTGRES_DB=scrumboard
POSTGRES_USER=scrumboard_user
POSTGRES_PASSWORD=scrumboard_password
POSTGRES_PORT=5433

# Backend
NODE_ENV=development
PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Prerequisites

Make sure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **Docker** and **Docker Compose**

### Installation Commands:

```bash
# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm

# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# For other systems, visit: https://docs.docker.com/get-docker/
```

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload in development mode
2. **Database GUI**: Use `pnpm db:studio` to visually inspect and modify your database
3. **Keep Database Running**: The database container persists data between restarts
4. **Clean Start**: Use `pnpm db:reset` to clear all data and start fresh

## Support

If you encounter issues not covered here, please check:
1. The `.env.example` file for required environment variables
2. The application logs for specific error messages
3. The project's issue tracker for known problems