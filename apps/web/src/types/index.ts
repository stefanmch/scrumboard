export type StoryStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  storyId: string;
  assigneeId?: string;
  creatorId?: string;
}

export interface Comment {
  id: string;
  content: string;
  type: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  storyId: string;
  authorId: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: string;
  status: StoryStatus;
  type?: string;
  refinementStatus?: string;
  tags?: string[];
  businessValue?: number;
  rank: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  projectId?: string;
  sprintId?: string;
  assigneeId?: string;
  creatorId?: string;
  parentId?: string;
  // Relations
  assignee?: { id: string; name: string; email: string } | null;
  creator?: { id: string; name: string; email: string } | null;
  parent?: Story | null;
  children?: Story[];
  project?: { id: string; name: string } | null;
  sprint?: { id: string; name: string } | null;
  tasks?: Task[];
  comments?: Comment[];
}

export interface Column {
  id: string;
  title: string;
  status: StoryStatus;
  stories: Story[];
}

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string | Date;
  endDate: string | Date;
  status: SprintStatus;
  capacity?: number;
  projectId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  stories?: Story[];
}

export interface SprintMetrics {
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  completionPercentage: number;
  storiesCount: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
  };
  velocity?: number;
  burndownData: BurndownDataPoint[];
}

export interface BurndownDataPoint {
  date: string;
  remainingPoints: number;
  idealRemaining: number;
}
