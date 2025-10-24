/**
 * Verify a specific user exists in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = process.argv[2] || 'cmf8q386j0001q3cybghgl357'

  console.log(`\n🔍 Looking for user with ID: ${userId}\n`)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    }
  })

  if (user) {
    console.log('✅ User FOUND:\n')
    console.log(`   Name:      ${user.name}`)
    console.log(`   Email:     ${user.email}`)
    console.log(`   Role:      ${user.role}`)
    console.log(`   Active:    ${user.isActive ? 'Yes' : 'No'}`)
    console.log(`   ID:        ${user.id}`)
    console.log(`   Created:   ${user.createdAt}`)
  } else {
    console.log('❌ User NOT FOUND\n')
    console.log('   This user ID does not exist in the database.')
    console.log('   Run: npx tsx scripts/show-test-users.ts')
    console.log('   to see all available users.')
  }

  console.log('')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
