/**
 * Script to get all dummy user IDs for testing
 * Run with: npx tsx scripts/get-user-ids.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('👥 Fetching dummy test users...\n')

  const users = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@scrumboard.dev'
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  if (users.length === 0) {
    console.log('⚠️  No dummy users found!')
    console.log('   Run: node scripts/create-dummy-users.js')
    return
  }

  console.log(`📋 Found ${users.length} dummy users:\n`)

  users.forEach((user, index) => {
    const status = user.isActive ? '✅' : '❌'
    console.log(
      `${(index + 1).toString().padStart(2)}. ${status} ${user.name.padEnd(20)} | ` +
      `${user.email.padEnd(42)} | ${user.role.padEnd(15)} | ID: ${user.id}`
    )
  })

  console.log('\n🔑 LOGIN CREDENTIALS')
  console.log('=' .repeat(80))
  console.log('   Password for all users: Password123!')

  console.log('\n📋 USER IDS (for copying)')
  console.log('='.repeat(80))
  users.forEach(user => {
    console.log(`   ${user.name.padEnd(20)}: ${user.id}`)
  })

  console.log('\n💡 USAGE TIPS')
  console.log('='.repeat(80))
  console.log('   1. Copy a User ID from above when adding members to teams')
  console.log('   2. Login with any email using password: Password123!')
  console.log('   3. Alice Admin has ADMIN role for full system access')
  console.log('   4. Try creating teams and adding these users as members!')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
