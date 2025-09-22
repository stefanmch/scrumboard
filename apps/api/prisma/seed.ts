import { PrismaClient, Priority, StoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user
  const defaultUser = await prisma.user.upsert({
    where: { id: 'default-user' },
    update: {},
    create: {
      id: 'default-user',
      email: 'user@example.com',
      name: 'Default User',
      password: 'placeholder', // In production, this would be a hashed password
    },
  });

  console.log('✅ Default user created');

  // Create default team
  const defaultTeam = await prisma.team.upsert({
    where: { id: 'default-team' },
    update: {},
    create: {
      id: 'default-team',
      name: 'Default Team',
      description: 'Default team for development',
      creatorId: defaultUser.id,
    },
  });

  console.log('✅ Default team created');

  // Create default project
  const defaultProject = await prisma.project.upsert({
    where: { id: 'default-project' },
    update: {},
    create: {
      id: 'default-project',
      name: 'Default Project',
      description: 'Default project for development',
      teamId: defaultTeam.id,
    },
  });

  console.log('✅ Default project created');

  // Create sample stories
  const stories = await Promise.all([
    prisma.story.create({
      data: {
        title: 'User Authentication System',
        description: 'Implement secure login/logout functionality with JWT tokens',
        storyPoints: 8,
        status: StoryStatus.TODO,
        priority: Priority.HIGH,
        projectId: defaultProject.id,
        creatorId: defaultUser.id,
        rank: 1,
      },
    }),
    prisma.story.create({
      data: {
        title: 'Dashboard Analytics Widget',
        description: 'Create interactive charts showing user engagement metrics',
        storyPoints: 5,
        status: StoryStatus.TODO,
        priority: Priority.MEDIUM,
        projectId: defaultProject.id,
        creatorId: defaultUser.id,
        rank: 2,
      },
    }),
    prisma.story.create({
      data: {
        title: 'Mobile Responsive Design',
        description: 'Optimize the application layout for mobile devices',
        storyPoints: 3,
        status: StoryStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        projectId: defaultProject.id,
        creatorId: defaultUser.id,
        rank: 1,
      },
    }),
    prisma.story.create({
      data: {
        title: 'API Rate Limiting',
        description: 'Implement rate limiting to prevent API abuse',
        storyPoints: 2,
        status: StoryStatus.IN_PROGRESS,
        priority: Priority.LOW,
        projectId: defaultProject.id,
        creatorId: defaultUser.id,
        rank: 2,
      },
    }),
    prisma.story.create({
      data: {
        title: 'Email Notification System',
        description: 'Set up automated email notifications for important events',
        storyPoints: 4,
        status: StoryStatus.DONE,
        priority: Priority.MEDIUM,
        projectId: defaultProject.id,
        creatorId: defaultUser.id,
        rank: 1,
      },
    }),
  ]);

  console.log('✅ Sample stories created');

  console.log('🎉 Database seeding completed!');
  console.log('Created:');
  console.log(`- 1 user (${defaultUser.email})`);
  console.log(`- 1 team (${defaultTeam.name})`);
  console.log(`- 1 project (${defaultProject.name})`);
  console.log(`- ${stories.length} stories`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });