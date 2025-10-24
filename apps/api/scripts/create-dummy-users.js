/**
 * Script to create dummy users for testing
 * Run with: node scripts/create-dummy-users.js
 */

const API_URL = 'http://localhost:3001/api/v1'

const dummyUsers = [
  {
    email: 'alice.admin@scrumboard.dev',
    password: 'Password123!',
    name: 'Alice Admin',
    role: 'ADMIN'
  },
  {
    email: 'bob.scrummaster@scrumboard.dev',
    password: 'Password123!',
    name: 'Bob Martinez',
    role: 'SCRUM_MASTER'
  },
  {
    email: 'carol.po@scrumboard.dev',
    password: 'Password123!',
    name: 'Carol Chen',
    role: 'PRODUCT_OWNER'
  },
  {
    email: 'david.dev@scrumboard.dev',
    password: 'Password123!',
    name: 'David Kumar',
    role: 'DEVELOPER'
  },
  {
    email: 'emma.dev@scrumboard.dev',
    password: 'Password123!',
    name: 'Emma Thompson',
    role: 'DEVELOPER'
  },
  {
    email: 'frank.dev@scrumboard.dev',
    password: 'Password123!',
    name: 'Frank Wilson',
    role: 'DEVELOPER'
  },
  {
    email: 'grace.stakeholder@scrumboard.dev',
    password: 'Password123!',
    name: 'Grace Lee',
    role: 'STAKEHOLDER'
  },
  {
    email: 'henry.member@scrumboard.dev',
    password: 'Password123!',
    name: 'Henry Brown',
    role: 'MEMBER'
  }
]

async function createUser(userData) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Created user: ${userData.name} (${userData.email}) - Role: ${userData.role}`)
      return data
    } else {
      const error = await response.json()
      if (error.message?.includes('already exists')) {
        console.log(`⚠️  User already exists: ${userData.email}`)
      } else {
        console.error(`❌ Failed to create ${userData.email}:`, error.message)
      }
      return null
    }
  } catch (error) {
    console.error(`❌ Error creating ${userData.email}:`, error.message)
    return null
  }
}

async function createAllUsers() {
  console.log('🚀 Creating dummy users for testing...\n')
  console.log(`API URL: ${API_URL}\n`)

  let successCount = 0
  let existingCount = 0
  let errorCount = 0

  for (const user of dummyUsers) {
    const result = await createUser(user)
    if (result) {
      successCount++
    } else if (result === null && user.email) {
      existingCount++
    } else {
      errorCount++
    }
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Successfully created: ${successCount}`)
  console.log(`   ⚠️  Already existed: ${existingCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log(`   📝 Total users: ${dummyUsers.length}`)

  console.log('\n🔑 Login Credentials:')
  console.log('   Password for all users: Password123!')
  console.log('\n👥 Available Test Users:')
  dummyUsers.forEach(user => {
    console.log(`   • ${user.name.padEnd(20)} - ${user.email.padEnd(40)} [${user.role}]`)
  })

  console.log('\n💡 Tips:')
  console.log('   1. Use these users to test team creation and member management')
  console.log('   2. All users have the same password: Password123!')
  console.log('   3. User IDs are generated automatically - you\'ll need to fetch them from the database')
  console.log('   4. To get user IDs, check the database or use the /users endpoint')
}

// Run the script
createAllUsers()
  .then(() => {
    console.log('\n✨ Done!\n')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
