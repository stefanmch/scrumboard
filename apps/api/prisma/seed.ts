import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'admin@scrumboard.com',
      name: 'Admin User',
      password: 'password123', // In production, this should be hashed
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'developer@scrumboard.com',
      name: 'Developer User',
      password: 'password123', // In production, this should be hashed
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'designer@scrumboard.com',
      name: 'Designer User',
      password: 'password123', // In production, this should be hashed
    },
  });

  console.log('✅ Users created');

  // Create a team
  const team = await prisma.team.create({
    data: {
      name: 'Development Team',
      description: 'Main development team for the scrumboard application',
      creatorId: user1.id,
    },
  });

  console.log('✅ Team created');

  // Add team members
  await prisma.teamMember.createMany({
    data: [
      {
        userId: user1.id,
        teamId: team.id,
        role: 'ADMIN',
      },
      {
        userId: user2.id,
        teamId: team.id,
        role: 'MEMBER',
      },
      {
        userId: user3.id,
        teamId: team.id,
        role: 'MEMBER',
      },
    ],
  });

  console.log('✅ Team members added');

  // Create a project
  const project = await prisma.project.create({
    data: {
      name: 'Scrumboard MVP',
      description: 'Minimum viable product for the scrumboard application',
      teamId: team.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Project created');

  // Create tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Set up database schema',
        description: 'Create initial database schema with Prisma',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project.id,
        creatorId: user1.id,
        assigneeId: user2.id,
      },
      {
        title: 'Implement user authentication',
        description: 'Add JWT authentication for users',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project.id,
        creatorId: user1.id,
        assigneeId: user2.id,
      },
      {
        title: 'Design user interface',
        description: 'Create wireframes and mockups for the application',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: project.id,
        creatorId: user1.id,
        assigneeId: user3.id,
      },
      {
        title: 'Set up CI/CD pipeline',
        description: 'Configure automated testing and deployment',
        status: 'TODO',
        priority: 'LOW',
        projectId: project.id,
        creatorId: user1.id,
      },
    ],
  });

  console.log('✅ Tasks created');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
