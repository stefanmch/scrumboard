/**
 * Compare what the script sees vs what might be in another database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('\n🔍 Checking Database Connection\n')
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'))

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`\n📋 Total users found: ${allUsers.length}\n`)

  allUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.name} (${user.email})`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Created: ${user.createdAt}`)
    console.log('')
  })

  // Check the specific user ID you're trying to add
  const targetUserId = 'cmf8q386j0001q3cybghgl357'
  console.log(`\n🎯 Looking for specific user: ${targetUserId}`)

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId }
  })

  if (targetUser) {
    console.log('✅ User FOUND:', targetUser.email)
  } else {
    console.log('❌ User NOT FOUND in this database')
    console.log('\n💡 The user IDs starting with "cmf8q386..." appear to be from an old database state.')
    console.log('   The current users have IDs starting with "cmh..."')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
