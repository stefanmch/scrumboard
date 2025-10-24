/**
 * Show users from the ACTUAL database the API is using (port 5433)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://scrumboard_user:scrumboard_password@localhost:5433/scrumboard?schema=public'
    }
  }
})

async function main() {
  console.log('\n' + '='.repeat(90))
  console.log('🧪 SCRUMBOARD TEST USERS (Port 5433 - ACTUAL API DATABASE)')
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
  console.log('  ✅ These are the ACTUAL user IDs from the API database (port 5433)')
  console.log('  ✅ Use THESE IDs when adding members to teams')
  console.log('')
  console.log('  To add a member to a team:')
  console.log('  1. Copy a User ID from above')
  console.log('  2. Click "Add Member" on your team')
  console.log('  3. Paste the User ID')
  console.log('  4. Select role and submit')
  console.log('')
  console.log('='.repeat(90) + '\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
