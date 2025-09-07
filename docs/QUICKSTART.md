# 🚀 Quick Start Guide - Get Visible Results in 2 Days

This guide prioritizes getting a working scrumboard visible as quickly as possible, then iteratively improving it.

---

## 🎯 Day 1 Goal: Basic Scrumboard Running

### Step 1: Project Setup (15 minutes)

```bash
# Create Next.js project
npx create-next-app@latest scrumboard --typescript --app --src-dir --tailwind
cd scrumboard

# Install minimal dependencies for immediate results
npm install clsx lucide-react

# Start development server
npm run dev
```

### Step 2: Create Basic Structure (30 minutes)

```bash
# Create component directories
mkdir -p src/components/{ui,board,story}
mkdir -p src/lib
mkdir -p src/types
```

Create the basic types:

```typescript
// src/types/index.ts
export interface Story {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  points?: number;
  createdAt: Date;
}

export interface Column {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  stories: Story[];
}
```

### Step 3: Mock Data (10 minutes)

```typescript
// src/lib/mockData.ts
import { Story, Column } from '@/types';

export const mockStories: Story[] = [
  {
    id: '1',
    title: 'User Authentication',
    description: 'Implement login and signup functionality',
    status: 'todo',
    priority: 'high',
    assignee: 'John Doe',
    points: 5,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Dashboard Design',
    description: 'Create responsive dashboard layout',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Jane Smith',
    points: 3,
    createdAt: new Date('2024-01-16'),
  },
  {
    id: '3',
    title: 'API Integration',
    description: 'Connect frontend with backend API',
    status: 'done',
    priority: 'high',
    assignee: 'Bob Johnson',
    points: 8,
    createdAt: new Date('2024-01-14'),
  },
];

export const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    status: 'todo',
    stories: mockStories.filter(story => story.status === 'todo'),
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    status: 'in-progress',
    stories: mockStories.filter(story => story.status === 'in-progress'),
  },
  {
    id: 'done',
    title: 'Done',
    status: 'done',
    stories: mockStories.filter(story => story.status === 'done'),
  },
];
```

### Step 4: Basic Story Card (45 minutes)

```typescript
// src/components/story/StoryCard.tsx
import { Story } from '@/types';
import { User, Clock, Flag } from 'lucide-react';
import clsx from 'clsx';

interface StoryCardProps {
  story: Story;
  onEdit?: (story: Story) => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function StoryCard({ story, onEdit }: StoryCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onEdit?.(story)}
      draggable
    >
      {/* Priority Badge */}
      <div className="flex justify-between items-start mb-2">
        <span
          className={clsx(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            priorityColors[story.priority]
          )}
        >
          <Flag className="w-3 h-3 mr-1" />
          {story.priority}
        </span>
        {story.points && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
            {story.points} pts
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {story.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
        {story.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {story.assignee && (
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            <span className="truncate">{story.assignee}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-gray-400">
          <Clock className="w-3 h-3 mr-1" />
          <span>{story.createdAt.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Board Column (30 minutes)

```typescript
// src/components/board/BoardColumn.tsx
import { Column } from '@/types';
import { StoryCard } from '@/components/story/StoryCard';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  column: Column;
  onAddStory?: () => void;
  onEditStory?: (story: any) => void;
}

export function BoardColumn({ column, onAddStory, onEditStory }: BoardColumnProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 w-80 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h2 className="font-semibold text-gray-800">{column.title}</h2>
          <span className="ml-2 bg-gray-200 text-gray-600 text-sm px-2 py-1 rounded-full">
            {column.stories.length}
          </span>
        </div>
        <button
          onClick={onAddStory}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Stories */}
      <div className="space-y-3 min-h-[200px]">
        {column.stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onEdit={onEditStory}
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 6: Main Board Component (30 minutes)

```typescript
// src/components/board/Board.tsx
'use client';

import { useState } from 'react';
import { BoardColumn } from './BoardColumn';
import { initialColumns } from '@/lib/mockData';

export function Board() {
  const [columns, setColumns] = useState(initialColumns);

  const handleAddStory = () => {
    // Placeholder for adding new story
    console.log('Add new story');
  };

  const handleEditStory = (story: any) => {
    // Placeholder for editing story
    console.log('Edit story:', story);
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-6 p-6 min-w-max">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            onAddStory={handleAddStory}
            onEditStory={handleEditStory}
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 7: Update Main Page (15 minutes)

```typescript
// src/app/page.tsx
import { Board } from '@/components/board/Board';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ScrumBoard</h1>
              <span className="ml-3 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                Sprint 1
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                New Story
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Board />
      </main>
    </div>
  );
}
```

### Step 8: Add Custom CSS (15 minutes)

```css
/* src/app/globals.css - Add these utilities */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  
  .line-clamp-3 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}
```

---

## 🎉 End of Day 1 Result

You now have:
- ✅ A fully functional scrumboard interface
- ✅ Three columns: To Do, In Progress, Done
- ✅ Story cards with priority, assignee, and points
- ✅ Responsive design with Tailwind CSS
- ✅ Mock data to see the interface in action
- ✅ Clean, professional appearance

**Next: Day 2 will add drag-and-drop, story editing, and deployment!**

---

## 🚀 Day 2 Goal: Interactive Features

### Step 1: Add Basic Drag and Drop (60 minutes)

```bash
# Install react-dnd for professional drag-and-drop
npm install react-dnd react-dnd-html5-backend
```

### Step 2: Story Modal/Drawer (45 minutes)
- Add story editing functionality
- Form validation
- Save/cancel actions

### Step 3: Add/Delete Stories (30 minutes)
- New story creation
- Story deletion
- Local state management

### Step 4: Deploy to Vercel (15 minutes)
```bash
# Deploy immediately for sharing
vercel --prod
```

---

## 📈 Results Timeline

**Day 1 (3 hours):** Working scrumboard with static data
**Day 2 (3 hours):** Interactive features + live deployment
**Week 1:** Polish, animations, design system
**Week 2:** Data persistence, authentication
**Week 3-4:** Advanced features, testing

This approach ensures you have something impressive to show immediately, while building a solid foundation for future enhancements!
