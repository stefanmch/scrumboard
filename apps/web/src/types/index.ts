export type StoryStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export interface Story {
  id: string;
  title: string;
  description?: string;
  storyPoints?: number;
  status: StoryStatus;
  assigneeId?: string;
  assignee?: { id: string; name: string; email: string };
  rank: number; // Position within the column (1 = highest priority)
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Column {
  id: string;
  title: string;
  status: StoryStatus;
  stories: Story[];
}
