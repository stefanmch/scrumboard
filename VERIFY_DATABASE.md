# Database Setup Verification Guide

This guide shows you how to verify that the database setup is working correctly.

## ✅ Verification Methods

### 1. Automatic Verification Script

Run the comprehensive verification script:

```bash
cd apps/api
npx ts-node verify-database.ts
```

This script will check:
- ✅ Database connection
- ✅ All tables exist and have data
- ✅ Relationships work correctly
- ✅ Enum values are functioning
- ✅ Data integrity constraints

### 2. Docker Services Status

Check that PostgreSQL is running:

```bash
docker compose ps
```

Expected output:
```
NAME                  IMAGE                STATUS
scrumboard-postgres   postgres:15-alpine   Up X minutes (healthy)
```

### 3. Direct Database Queries

Test Prisma client directly:

```bash
cd apps/api
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  console.log('Users:', count);
  prisma.\$disconnect();
});
"
```

### 4. Prisma Studio (Visual Interface)

Open the database browser:

```bash
pnpm db:studio
```

Then open: http://localhost:5555

### 5. NestJS API Health Check

Start the API and test the health endpoint:

```bash
# Terminal 1: Start API
pnpm --filter api start:dev

# Terminal 2: Test health endpoint
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "data": {
    "users": 3,
    "tasks": 4,
    "teams": 1,
    "projects": 1
  },
  "timestamp": "2025-09-06T..."
}
```

### 6. Database Schema Validation

Check the actual database schema:

```bash
docker compose exec postgres psql -U scrumboard_user -d scrumboard -c "\\dt"
```

Expected tables:
- users
- teams  
- team_members
- projects
- tasks

### 7. Sample Data Verification

Check that seed data was created:

```bash
docker compose exec postgres psql -U scrumboard_user -d scrumboard -c "
SELECT u.name, COUNT(tm.id) as team_count, COUNT(t.id) as created_tasks
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN tasks t ON u.id = t.creator_id
GROUP BY u.id, u.name;
"
```

## 🛠 Troubleshooting

### Database Connection Issues

1. **Check if PostgreSQL is running:**
   ```bash
   docker compose ps
   ```

2. **Restart PostgreSQL:**
   ```bash
   pnpm db:down
   pnpm db:up
   ```

3. **Check logs:**
   ```bash
   pnpm db:logs
   ```

### Prisma Client Issues

1. **Regenerate client:**
   ```bash
   pnpm db:generate
   ```

2. **Reset and reseed:**
   ```bash
   pnpm db:reset
   pnpm db:seed
   ```

### Port Conflicts

If you encounter port conflicts:

1. **Check what's using the port:**
   ```bash
   lsof -i :3001
   lsof -i :5432
   ```

2. **Kill conflicting processes:**
   ```bash
   pkill -f "nest start"
   ```

## 📊 Expected Data

After successful setup, you should have:

- **3 Users**: Admin, Developer, Designer
- **1 Team**: Development Team
- **3 Team Members**: All users in the team
- **1 Project**: Scrumboard MVP
- **4 Tasks**: Various statuses (TODO, IN_PROGRESS, DONE)

## 🔧 Available Commands

```bash
# Database management
pnpm db:up          # Start database
pnpm db:down        # Stop database
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Sync schema (development)
pnpm db:migrate     # Run migrations (production)
pnpm db:seed        # Seed database
pnpm db:reset       # Reset and reseed
pnpm db:studio      # Open Prisma Studio
pnpm db:logs        # View database logs

# Application
pnpm dev            # Start both web and api
pnpm --filter api start:dev    # Start only API
pnpm --filter web dev          # Start only web
```
