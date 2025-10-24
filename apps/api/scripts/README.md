# Testing Scripts for Scrumboard

## 🎯 Quick Reference

### Show All Available Users (RECOMMENDED)
```bash
npx tsx scripts/show-test-users.ts
```
This displays all users with their IDs in an easy-to-read format.

## 📋 Available Scripts

### `show-test-users.ts`
**Purpose**: Display all users with their User IDs for testing

**Usage**:
```bash
npx tsx scripts/show-test-users.ts
```

**Output**: Lists all users with:
- Name
- Email
- Role
- User ID (for adding to teams)
- Active status

---

### `check-users.ts`
**Purpose**: Quick list of all users in database

**Usage**:
```bash
npx tsx scripts/check-users.ts
```

**Output**: Simple numbered list of users

---

### `get-user-ids.ts`
**Purpose**: Get IDs for dummy test users (emails ending in @scrumboard.dev)

**Usage**:
```bash
npx tsx scripts/get-user-ids.ts
```

**Note**: Only shows users created by the `create-dummy-users.js` script

---

### `create-dummy-users.js`
**Purpose**: Create 8 dummy users for testing

**Usage**:
```bash
node scripts/create-dummy-users.js
```

**Creates**:
- Alice Admin (ADMIN)
- Bob Martinez (SCRUM_MASTER)
- Carol Chen (PRODUCT_OWNER)
- David Kumar (DEVELOPER)
- Emma Thompson (DEVELOPER)
- Frank Wilson (DEVELOPER)
- Grace Lee (STAKEHOLDER)
- Henry Brown (MEMBER)

**Password**: `Password123!` for all users

**Note**: Subject to rate limiting (5 registrations per minute)

---

### `list-users.js`
**Purpose**: Fetch users via API (requires authentication)

**Usage**:
```bash
node scripts/list-users.js [email] [password]
```

**Example**:
```bash
node scripts/list-users.js admin@scrumboard.com MyPassword123
```

**Note**: Requires valid login credentials

---

### `query-users.sql`
**Purpose**: SQL query to list users

**Usage** (if psql is available):
```bash
psql $DATABASE_URL -f scripts/query-users.sql
```

## 🔑 Current Test Users

Based on the database, you currently have these users available:

1. **Admin User**
   - Email: `admin@scrumboard.com`
   - ID: `cmf8q386b0000q3cyh449c6q5`

2. **Developer User**
   - Email: `developer@scrumboard.com`
   - ID: `cmf8q386j0001q3cybghgl357`

3. **Designer User**
   - Email: `designer@scrumboard.com`
   - ID: `cmf8q386l0002q3cyayf6sj9g`

4. **Default User**
   - Email: `user@example.com`
   - ID: `default-user`

## 💡 Common Tasks

### Adding a User to a Team
1. Run `npx tsx scripts/show-test-users.ts`
2. Copy the User ID of the person you want to add
3. In the app, click "Add Member" on a team
4. Paste the User ID
5. Select role and submit

### Creating More Users
If you need more test users:
```bash
node scripts/create-dummy-users.js
```

Wait 1 minute between runs if you hit rate limits.

### Checking User Credentials
All users created by scripts use password: `Password123!`

Existing users may have different passwords - check with your team.

## 🛠️ Database Access

### Using Prisma Studio
```bash
npx prisma studio
```

Opens at http://localhost:5555 for visual database inspection.

### Direct Database Access
Database connection details are in `.env`:
- Host: localhost
- Port: 5432
- Database: scrumboard
- User: scrumboard_user
- Password: scrumboard_password

## 📚 Related Documentation

- Main testing guide: `/TESTING-GUIDE.md`
- Database schema: `/prisma/schema.prisma`
- API documentation: http://localhost:3001/api/v1/docs
