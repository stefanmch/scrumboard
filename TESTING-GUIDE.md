# Testing Guide - Scrumboard Application

## 🔐 Available Test Users

The following users are available for testing the application:

| Name | Email | Password | Role | Status |
|------|-------|----------|------|--------|
| Admin User | admin@scrumboard.com | *(check with team)* | MEMBER | ✅ Active |
| Developer User | developer@scrumboard.com | *(check with team)* | MEMBER | ✅ Active |
| Designer User | designer@scrumboard.com | *(check with team)* | MEMBER | ✅ Active |
| Default User | user@example.com | *(check with team)* | MEMBER | ✅ Active |

## 📝 Getting User IDs

To add members to teams, you'll need their User IDs. Run this script:

```bash
cd apps/api
npx tsx scripts/check-users.ts
```

This will show all users with their IDs.

## 🧪 Testing Team Management

### 1. Create a Team
1. Login with any user above
2. Navigate to the Teams page
3. Click "Create Team"
4. Fill in team name and description
5. You'll automatically be added as ADMIN

### 2. Add Team Members
1. Navigate to your team's page
2. Click "Add Member"
3. Enter the **User ID** (not email) of the user you want to add
4. Select their role (MEMBER or ADMIN)
5. Click "Add Member"

**Note**: The Add Member modal now works correctly - you can click on inputs and buttons without them being blocked by the background.

### 3. View Team Projects
1. Click the "View" button on any team card
2. This will show all projects for that team
3. You can create projects, manage tasks, etc.

## 🐛 Recently Fixed Issues

### ✅ Modal Click-Through Issue
- **Problem**: Clicks on "Add Member" modal were being captured by the background
- **Fix**: Added `pointer-events-auto` and `z-10` CSS classes
- **Location**: `/apps/web/src/components/team/AddMemberModal.tsx`

### ✅ Team Creation Error
- **Problem**: "Internal server error" when creating teams
- **Fix**: Updated auth guard to use `user.sub` instead of `user.userId`
- **Affected Files**:
  - `/apps/api/src/auth/guards/simple-jwt-auth.guard.ts`
  - `/apps/api/src/teams/services/teams.service.ts`
  - `/apps/api/src/projects/projects.controller.ts`

### ✅ Projects View Error
- **Problem**: Error when clicking "View" button on teams
- **Fix**: Updated all controller methods to use `user.sub` instead of `user.id`
- **Location**: `/apps/api/src/projects/projects.controller.ts`

## 🔧 Utility Scripts

All scripts are located in `/apps/api/scripts/`:

### Check All Users
```bash
npx tsx scripts/check-users.ts
```
Lists all users in the database with their IDs.

### Get User IDs
```bash
npx tsx scripts/get-user-ids.ts
```
Lists dummy test users (emails ending in @scrumboard.dev) with their IDs.

### Create Dummy Users (if needed)
```bash
node scripts/create-dummy-users.js
```
Attempts to create 8 dummy test users with different roles.

**Note**: Rate limiting is enabled (5 registrations per minute), so some users may fail to create on the first run.

## 💡 Tips

1. **Adding Members**: You must use the User ID (CUID format like `clxxx...`), not the email address
2. **Roles**: Team members can have MEMBER or ADMIN roles
3. **Permissions**: Only ADMIN members can:
   - Add/remove members
   - Update team settings
   - Delete the team
4. **Last Admin**: Cannot remove or change role of the last admin in a team

## 🚀 Quick Start Testing Flow

1. Login as `admin@scrumboard.com`
2. Create a new team: "Engineering Team"
3. Get the User ID of `developer@scrumboard.com` by running the check-users script
4. Add developer to your team using their User ID
5. Create a project in the team
6. Test the project management features

## 📊 Database Access

If you need direct database access:

```bash
cd apps/api
npx prisma studio
```

This opens Prisma Studio at http://localhost:5555 where you can:
- View all users and their IDs
- Inspect teams and members
- Check projects and tasks
- Manually edit data if needed

## 🆘 Troubleshooting

### Can't Click Modal Elements
- **Fixed**: This was caused by missing `pointer-events-auto` CSS class
- Should work now in the latest version

### Getting "User ID is missing" Error
- Make sure you're copying the full User ID (starts with `cl...`)
- User IDs are NOT the same as emails
- Run `npx tsx scripts/check-users.ts` to get correct IDs

### Rate Limiting Errors
- Registration endpoint: 5 per minute
- Login endpoint: 5 per 15 minutes per email
- Wait for the time period to reset

### Server Errors
- Check server logs for detailed error messages
- Rebuild the API: `npm run build` in `/apps/api`
- Restart the dev server if needed

## 📚 Additional Resources

- API Documentation: http://localhost:3001/api/v1/docs (if Swagger is enabled)
- Database Schema: `/apps/api/prisma/schema.prisma`
- API Routes: Check controllers in `/apps/api/src/`
