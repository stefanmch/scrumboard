/**
 * Check all users in database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`Total users in database: ${allUsers.length}\n`)

  allUsers.forEach((user, i) => {
    console.log(`${i+1}. ${user.name} - ${user.email} (${user.role})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
