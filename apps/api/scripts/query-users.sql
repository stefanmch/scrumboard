-- Query to list all dummy test users with their information
-- Run with: psql $DATABASE_URL -f scripts/query-users.sql
-- Or from psql: \i scripts/query-users.sql

\echo '👥 DUMMY TEST USERS'
\echo '=================='
\echo ''

SELECT
  '  ' || row_number() OVER (ORDER BY name) || '. ' ||
  rpad(name, 20) || ' | ' ||
  rpad(email, 42) || ' | ' ||
  rpad(role::text, 15) || ' | ID: ' || id as "User Info"
FROM users
WHERE email LIKE '%@scrumboard.dev'
ORDER BY name;

\echo ''
\echo '🔑 LOGIN CREDENTIALS'
\echo '===================='
\echo '   Password for all users: Password123!'
\echo ''
\echo '💡 USAGE TIPS'
\echo '============='
\echo '   1. Copy the User ID when adding members to teams'
\echo '   2. Login with any email above using password: Password123!'
\echo '   3. Alice Admin has ADMIN role for full access'
\echo ''
