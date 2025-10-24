/**
 * Show all available test users with their IDs for easy copy-paste
 */

import { PrismaClient } from '@prisma/client'

// Use the same database as the API (check root .env for DATABASE_URL)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://scrumboard_user:scrumboard_password@localhost:5433/scrumboard?schema=public'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
})

async function main() {
  console.log('\n' + '='.repeat(90))
  console.log('🧪 SCRUMBOARD TEST USERS')
  console.log('='.repeat(90) + '\n')

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: {
      name: 'asc'
    }
  })

  if (allUsers.length === 0) {
    console.log('⚠️  No users found in database!\n')
    return
  }

  console.log(`📋 Available Users (${allUsers.length} total):\n`)

  allUsers.forEach((user, index) => {
    const status = user.isActive ? '✅' : '❌'
    console.log(`${(index + 1).toString().padStart(2)}. ${status} ${user.name}`)
    console.log(`    Email: ${user.email}`)
    console.log(`    Role:  ${user.role}`)
    console.log(`    ID:    ${user.id}`)
    console.log('')
  })

  console.log('=' .repeat(90))
  console.log('💡 USAGE TIPS')
  console.log('='.repeat(90))
  console.log('')
  console.log('  To add a member to a team:')
  console.log('  1. Copy the User ID from above (the long string starting with "cl...")')
  console.log('  2. Click "Add Member" on your team')
  console.log('  3. Paste the User ID in the "User ID or Email" field')
  console.log('  4. Select the role (MEMBER or ADMIN)')
  console.log('  5. Click "Add Member"')
  console.log('')
  console.log('  Example: To add "Developer User", copy this ID:')
  const devUser = allUsers.find(u => u.email.includes('developer'))
  if (devUser) {
    console.log(`  ${devUser.id}`)
  }
  console.log('')
  console.log('='.repeat(90) + '\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
