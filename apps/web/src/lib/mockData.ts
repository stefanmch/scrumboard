import { Story, Column } from '@/types';

export const mockStories: Story[] = [
  {
    id: '1',
    title: 'User Authentication System',
    description: 'Implement secure login/logout functionality with JWT tokens and password reset capabilities.',
    points: 8,
    status: 'todo',
    assignee: 'Alex Chen',
    rank: 1,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Dashboard Analytics Widget',
    description: 'Create interactive charts showing user engagement metrics and performance KPIs.',
    points: 5,
    status: 'todo',
    assignee: 'Sarah Kim',
    rank: 2,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: '3',
    title: 'Mobile App Responsive Design',
    description: 'Optimize the application layout for mobile devices and tablets with touch-friendly interfaces.',
    points: 3,
    status: 'in-progress',
    assignee: 'Marcus Rodriguez',
    rank: 1,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '4',
    title: 'API Rate Limiting',
    description: 'Implement rate limiting to prevent API abuse and ensure fair usage across all users.',
    points: 2,
    status: 'in-progress',
    assignee: 'Alex Chen',
    rank: 2,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: '5',
    title: 'Email Notification System',
    description: 'Set up automated email notifications for important user actions and system updates.',
    points: 4,
    status: 'done',
    assignee: 'Sarah Kim',
    rank: 1,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-14'),
  },
];

export const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    status: 'todo',
    stories: mockStories
      .filter(story => story.status === 'todo')
      .sort((a, b) => a.rank - b.rank), // Sort by rank ascending (1 = top)
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'in-progress',
    stories: mockStories
      .filter(story => story.status === 'in-progress')
      .sort((a, b) => a.rank - b.rank),
  },
  {
    id: 'done',
    title: 'Done',
    status: 'done',
    stories: mockStories
      .filter(story => story.status === 'done')
      .sort((a, b) => a.rank - b.rank),
  },
];
