/**
 * Script to list all users with their IDs
 * Run with: node scripts/list-users.js
 *
 * Usage: node scripts/list-users.js [email] [password]
 * Example: node scripts/list-users.js alice.admin@scrumboard.dev Password123!
 */

const API_URL = 'http://localhost:3001/api/v1'

async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    })

    if (response.ok) {
      const data = await response.json()
      return data.accessToken
    } else {
      const error = await response.json()
      console.error(`❌ Login failed:`, error.message)
      return null
    }
  } catch (error) {
    console.error(`❌ Error logging in:`, error.message)
    return null
  }
}

async function listUsers(accessToken) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    if (response.ok) {
      const users = await response.json()
      return users
    } else {
      const error = await response.json()
      console.error(`❌ Failed to fetch users:`, error.message)
      return null
    }
  } catch (error) {
    console.error(`❌ Error fetching users:`, error.message)
    return null
  }
}

async function main() {
  const email = process.argv[2] || 'alice.admin@scrumboard.dev'
  const password = process.argv[3] || 'Password123!'

  console.log('🔐 Logging in as:', email)
  const token = await login(email, password)

  if (!token) {
    console.log('\n💡 Usage: node scripts/list-users.js [email] [password]')
    console.log('   Default: alice.admin@scrumboard.dev Password123!')
    return
  }

  console.log('✅ Login successful!\n')

  console.log('👥 Fetching users...')
  const users = await listUsers(token)

  if (!users || users.length === 0) {
    console.log('⚠️  No users found')
    return
  }

  console.log(`\n📋 Found ${users.length} users:\n`)

  const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name))

  sortedUsers.forEach((user, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${user.name.padEnd(20)} | ${user.email.padEnd(40)} | ${user.role.padEnd(15)} | ID: ${user.id}`)
  })

  console.log('\n💡 To add a member to a team, copy their User ID from above')
  console.log('   Example: To add Bob Martinez, use ID:', sortedUsers.find(u => u.email.includes('bob'))?.id || '[user-id]')
}

main()
  .then(() => {
    console.log('\n✨ Done!\n')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
