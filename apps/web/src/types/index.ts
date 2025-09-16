export interface Story {
  id: string;
  title: string;
  description: string;
  points?: number;
  status: 'todo' | 'in-progress' | 'done';
  assignee?: string;
  rank: number; // Position within the column (1 = highest priority)
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  stories: Story[];
}
