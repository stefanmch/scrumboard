/**
 * Test if the API can query the database the same way the service does
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 'cmf8q386j0001q3cybghgl357'

  console.log('\n🔍 Testing database query exactly like TeamsService does...\n')

  // This is EXACTLY what the teams service does
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      isActive: true,
    },
  })

  console.log('Query result:', user ? 'FOUND' : 'NOT FOUND')

  if (user) {
    console.log('\n✅ User found:')
    console.log(JSON.stringify(user, null, 2))
  } else {
    console.log('\n❌ User NOT found')
    console.log('\nThis is the exact same query the API uses.')
    console.log('If the user exists in other scripts but not here,')
    console.log('there may be a Prisma client issue.')
  }

  // Also check the database URL being used
  console.log('\n📊 Database Info:')
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'))

  // Count all users
  const count = await prisma.user.count()
  console.log('Total users in database:', count)

  console.log('')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
  })
  .finally(() => prisma.$disconnect())
