# Component Architecture & Planning

## 🏗️ Component Hierarchy Overview

This document defines the React component architecture for the scrumboard application, mapping our design system to a maintainable, scalable component structure.

---

## 📦 Component Organization

### Directory Structure
```
src/
├── components/
│   ├── ui/                    # Basic UI components (design system)
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Badge/
│   │   └── index.ts
│   ├── forms/                 # Form-specific components
│   │   ├── StoryForm/
│   │   ├── SearchForm/
│   │   └── index.ts
│   ├── navigation/            # Navigation components
│   │   ├── TopNavigation/
│   │   ├── Sidebar/
│   │   ├── MobileNavigation/
│   │   └── index.ts
│   ├── story/                 # Story-related components
│   │   ├── StoryCard/
│   │   ├── StoryList/
│   │   ├── StoryModal/
│   │   └── index.ts
│   ├── sprint/                # Sprint-related components
│   │   ├── SprintBoard/
│   │   ├── SprintHealthWidget/
│   │   ├── SprintPlanningPanel/
│   │   └── index.ts
│   ├── dashboard/             # Dashboard widgets
│   │   ├── DashboardGrid/
│   │   ├── TeamCapacityWidget/
│   │   ├── VelocityChart/
│   │   └── index.ts
│   └── layout/                # Layout components
│       ├── AppLayout/
│       ├── DashboardLayout/
│       ├── Container/
│       └── index.ts
├── pages/                     # Next.js pages
├── hooks/                     # Custom React hooks
├── contexts/                  # React contexts
├── utils/                     # Utility functions
├── types/                     # TypeScript type definitions
└── styles/                    # Global styles and design tokens
```

---

## 🧩 Core Component Specifications

### 1. UI Foundation Components

#### Button Component
```typescript
// components/ui/Button/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const buttonClasses = clsx(
    'button',
    `button-${variant}`,
    `button-${size}`,
    {
      'button-loading': loading,
      'button-full-width': fullWidth,
    },
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {!loading && leftIcon && <span className="button-icon-left">{leftIcon}</span>}
      <span className="button-content">{children}</span>
      {!loading && rightIcon && <span className="button-icon-right">{rightIcon}</span>}
    </button>
  );
};

export default Button;
```

#### Card Component
```typescript
// components/ui/Card/Card.tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'compact' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  selected?: boolean;
  dragging?: boolean;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  selected = false,
  dragging = false,
  children,
  className,
  ...props
}) => {
  const cardClasses = clsx(
    'card',
    `card-${variant}`,
    `card-padding-${padding}`,
    {
      'card-hoverable': hoverable,
      'card-selected': selected,
      'card-dragging': dragging,
    },
    className
  );

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;
```

### 2. Story Components

#### StoryCard Component
```typescript
// components/story/StoryCard/StoryCard.tsx
interface StoryCardProps {
  story: Story;
  variant?: 'standard' | 'compact' | 'expanded';
  draggable?: boolean;
  selected?: boolean;
  onEdit?: (story: Story) => void;
  onMove?: (storyId: string, newStatus: StoryStatus) => void;
  onClick?: (story: Story) => void;
  onTagClick?: (tag: string) => void;
}

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  variant = 'standard',
  draggable = false,
  selected = false,
  onEdit,
  onMove,
  onClick,
  onTagClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Drag and drop logic
  const [{ isDragging: dragState }, drag] = useDrag({
    type: 'STORY',
    item: { id: story.id, type: 'story' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Combine refs if draggable
  useEffect(() => {
    if (draggable && dragRef.current) {
      drag(dragRef.current);
    }
  }, [drag, draggable]);

  useEffect(() => {
    setIsDragging(dragState);
  }, [dragState]);

  const handleCardClick = () => {
    if (onClick) {
      onClick(story);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(story);
    }
  };

  return (
    <Card
      ref={dragRef}
      variant="interactive"
      hoverable
      selected={selected}
      dragging={isDragging}
      onClick={handleCardClick}
      className={clsx('story-card', `story-card-${variant}`)}
    >
      <StoryCardHeader story={story} onEdit={handleEditClick} />
      <StoryCardContent story={story} variant={variant} />
      <StoryCardMetadata story={story} />
      {variant === 'expanded' && (
        <StoryCardAcceptanceCriteria criteria={story.acceptanceCriteria} />
      )}
      <StoryCardFooter story={story} onTagClick={onTagClick} />
    </Card>
  );
};

export default StoryCard;
```

#### StoryCardHeader Component
```typescript
// components/story/StoryCard/StoryCardHeader.tsx
interface StoryCardHeaderProps {
  story: Story;
  onEdit?: () => void;
}

const StoryCardHeader: React.FC<StoryCardHeaderProps> = ({ story, onEdit }) => {
  return (
    <div className="story-card-header">
      <div className="story-id">
        <code>{story.id}</code>
      </div>
      <div className="story-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="story-action-button"
        >
          <EditIcon size={16} />
        </Button>
        <DropdownMenu
          trigger={
            <Button variant="ghost" size="sm" className="story-action-button">
              <MoreVerticalIcon size={16} />
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => console.log('Move to sprint')}>
            Move to Sprint
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log('Duplicate story')}>
            Duplicate Story
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => console.log('Delete story')}
            className="dropdown-item-danger"
          >
            Delete Story
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default StoryCardHeader;
```

### 3. Sprint Board Components

#### SprintBoard Component
```typescript
// components/sprint/SprintBoard/SprintBoard.tsx
interface SprintBoardProps {
  sprint: Sprint;
  stories: Story[];
  onStoryMove?: (storyId: string, newStatus: StoryStatus) => void;
  onStoryEdit?: (story: Story) => void;
  onStoryCreate?: (status: StoryStatus) => void;
}

const SprintBoard: React.FC<SprintBoardProps> = ({
  sprint,
  stories,
  onStoryMove,
  onStoryEdit,
  onStoryCreate,
}) => {
  const [boardColumns] = useState<BoardColumn[]>([
    { id: 'backlog', title: 'Backlog', status: 'backlog' },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress' },
    { id: 'review', title: 'Review', status: 'review' },
    { id: 'done', title: 'Done', status: 'done' },
  ]);

  const getStoriesForColumn = (status: StoryStatus) => {
    return stories.filter(story => story.status === status);
  };

  return (
    <div className="sprint-board">
      <SprintBoardHeader sprint={sprint} />
      <div className="sprint-board-columns">
        {boardColumns.map((column) => (
          <SprintBoardColumn
            key={column.id}
            column={column}
            stories={getStoriesForColumn(column.status)}
            onStoryMove={onStoryMove}
            onStoryEdit={onStoryEdit}
            onStoryCreate={() => onStoryCreate?.(column.status)}
          />
        ))}
      </div>
    </div>
  );
};

export default SprintBoard;
```

#### SprintBoardColumn Component
```typescript
// components/sprint/SprintBoard/SprintBoardColumn.tsx
interface SprintBoardColumnProps {
  column: BoardColumn;
  stories: Story[];
  onStoryMove?: (storyId: string, newStatus: StoryStatus) => void;
  onStoryEdit?: (story: Story) => void;
  onStoryCreate?: () => void;
}

const SprintBoardColumn: React.FC<SprintBoardColumnProps> = ({
  column,
  stories,
  onStoryMove,
  onStoryEdit,
  onStoryCreate,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'STORY',
    drop: (item: { id: string; type: string }) => {
      if (onStoryMove) {
        onStoryMove(item.id, column.status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const columnClasses = clsx('sprint-board-column', {
    'column-drop-target': isOver && canDrop,
    'column-drop-invalid': isOver && !canDrop,
  });

  return (
    <div ref={drop} className={columnClasses}>
      <SprintBoardColumnHeader column={column} storyCount={stories.length} />
      <div className="column-content">
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            variant="compact"
            draggable
            onEdit={onStoryEdit}
          />
        ))}
        <Button
          variant="ghost"
          fullWidth
          onClick={onStoryCreate}
          className="add-story-button"
        >
          <PlusIcon size={16} />
          Add Story
        </Button>
      </div>
    </div>
  );
};

export default SprintBoardColumn;
```

### 4. Dashboard Components

#### DashboardGrid Component
```typescript
// components/dashboard/DashboardGrid/DashboardGrid.tsx
interface DashboardGridProps {
  userRole: UserRole;
  widgets: DashboardWidget[];
  onWidgetAction?: (widgetId: string, action: string, data?: any) => void;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({
  userRole,
  widgets,
  onWidgetAction,
}) => {
  const getGridLayout = (role: UserRole) => {
    switch (role) {
      case 'scrum-master':
        return 'dashboard-grid-scrum-master';
      case 'product-owner':
        return 'dashboard-grid-product-owner';
      case 'developer':
        return 'dashboard-grid-developer';
      case 'team-lead':
        return 'dashboard-grid-team-lead';
      default:
        return 'dashboard-grid-default';
    }
  };

  return (
    <div className={clsx('dashboard-grid', getGridLayout(userRole))}>
      {widgets.map((widget) => (
        <DashboardWidget
          key={widget.id}
          widget={widget}
          onAction={(action, data) => onWidgetAction?.(widget.id, action, data)}
        />
      ))}
    </div>
  );
};

export default DashboardGrid;
```

#### SprintHealthWidget Component
```typescript
// components/dashboard/SprintHealthWidget/SprintHealthWidget.tsx
interface SprintHealthWidgetProps {
  sprint: Sprint;
  metrics: SprintMetrics;
  onViewDetails?: () => void;
  onStartStandup?: () => void;
}

const SprintHealthWidget: React.FC<SprintHealthWidgetProps> = ({
  sprint,
  metrics,
  onViewDetails,
  onStartStandup,
}) => {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card className="sprint-health-widget">
      <div className="widget-header">
        <h3 className="widget-title">Sprint {sprint.number} Health</h3>
        <Badge variant={getHealthColor(metrics.healthScore)}>
          {metrics.healthScore}% Health
        </Badge>
      </div>
      
      <div className="widget-content">
        <div className="sprint-goal">
          <span className="goal-icon">🎯</span>
          <span className="goal-text">{sprint.goal}</span>
        </div>
        
        <div className="sprint-summary">
          <span>⏰ {metrics.daysRemaining} days left</span>
          <span>📊 {metrics.completionPercentage}% complete</span>
        </div>
        
        <div className="metrics-grid">
          <div className="metric">
            <span className="metric-label">✅ Done</span>
            <span className="metric-value">{metrics.done}</span>
          </div>
          <div className="metric">
            <span className="metric-label">⚡ Active</span>
            <span className="metric-value">{metrics.inProgress}</span>
          </div>
          <div className="metric">
            <span className="metric-label">📋 Todo</span>
            <span className="metric-value">{metrics.todo}</span>
          </div>
          <div className="metric">
            <span className="metric-label">🔴 Blocked</span>
            <span className="metric-value">{metrics.blocked}</span>
          </div>
        </div>
        
        <ProgressChart data={metrics.progressData} />
      </div>
      
      <div className="widget-actions">
        <Button variant="outline" onClick={onViewDetails}>
          📊 View Details
        </Button>
        <Button variant="primary" onClick={onStartStandup}>
          ⚡ Daily Standup
        </Button>
      </div>
    </Card>
  );
};

export default SprintHealthWidget;
```

---

## 🔗 State Management Strategy

### Context Providers
```typescript
// contexts/AppContext.tsx
interface AppContextType {
  user: User | null;
  currentTeam: Team | null;
  currentSprint: Sprint | null;
  setCurrentSprint: (sprint: Sprint) => void;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Implementation...

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
```

### Data Fetching Hooks
```typescript
// hooks/useStories.ts
export const useStories = (sprintId?: string) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getStories(sprintId);
      setStories(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stories');
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const updateStory = useCallback(async (storyId: string, updates: Partial<Story>) => {
    try {
      const response = await api.updateStory(storyId, updates);
      setStories(prev => 
        prev.map(story => 
          story.id === storyId ? { ...story, ...response.data } : story
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update story');
    }
  }, []);

  const moveStory = useCallback(async (storyId: string, newStatus: StoryStatus) => {
    await updateStory(storyId, { status: newStatus });
  }, [updateStory]);

  return {
    stories,
    loading,
    error,
    updateStory,
    moveStory,
    refetch: fetchStories,
  };
};
```

---

## 📱 Page Components & Layouts

### AppLayout Component
```typescript
// components/layout/AppLayout/AppLayout.tsx
interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarCollapsed?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showSidebar = true,
  sidebarCollapsed = false,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!sidebarCollapsed);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="app-layout">
      <TopNavigation 
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        showMenuToggle={isMobile || showSidebar}
      />
      
      <div className="app-layout-body">
        {showSidebar && (
          <>
            {isMobile ? (
              <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            ) : (
              <Sidebar collapsed={!sidebarOpen} />
            )}
          </>
        )}
        
        <main className={clsx('app-main', {
          'app-main-with-sidebar': showSidebar && sidebarOpen,
          'app-main-full-width': !showSidebar || !sidebarOpen,
        })}>
          {children}
        </main>
      </div>
      
      {isMobile && <MobileNavigation />}
    </div>
  );
};

export default AppLayout;
```

### Dashboard Page Component
```typescript
// pages/dashboard.tsx
const DashboardPage: React.FC = () => {
  const { user, currentTeam, currentSprint } = useApp();
  const { data: widgets, loading } = useDashboardWidgets(user?.role);
  const { data: metrics } = useSprintMetrics(currentSprint?.id);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <AppLayout>
      <Container>
        <div className="dashboard-page">
          <DashboardHeader 
            user={user}
            team={currentTeam}
            sprint={currentSprint}
          />
          <DashboardGrid
            userRole={user?.role}
            widgets={widgets}
            onWidgetAction={handleWidgetAction}
          />
        </div>
      </Container>
    </AppLayout>
  );
};

export default DashboardPage;
```

---

## 🛠️ Development Workflow

### Component Development Process
1. **Design Token Integration** - Ensure all components use design system tokens
2. **TypeScript First** - Define interfaces before implementation
3. **Accessibility** - Include ARIA labels, keyboard navigation, focus management
4. **Testing** - Unit tests for logic, integration tests for user interactions
5. **Storybook** - Document each component with usage examples
6. **Performance** - Optimize for minimal re-renders and bundle size

### Testing Strategy
```typescript
// components/story/StoryCard/StoryCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import StoryCard from './StoryCard';

const mockStory: Story = {
  id: 'US-123',
  title: 'User Login System',
  description: 'As a user, I want to log into the system...',
  status: 'ready',
  points: 5,
  assignee: { id: '1', name: 'Alex Dev' },
  tags: ['authentication', 'security'],
  priority: 'high',
};

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  );
};

describe('StoryCard', () => {
  it('renders story information correctly', () => {
    renderWithDnd(<StoryCard story={mockStory} />);
    
    expect(screen.getByText('US-123')).toBeInTheDocument();
    expect(screen.getByText('User Login System')).toBeInTheDocument();
    expect(screen.getByText('5 pts')).toBeInTheDocument();
    expect(screen.getByText('Alex Dev')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    renderWithDnd(<StoryCard story={mockStory} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockStory);
  });

  it('shows dragging state when dragged', () => {
    renderWithDnd(<StoryCard story={mockStory} draggable />);
    // Test drag behavior...
  });
});
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up project structure and build tools
- [ ] Implement design system CSS custom properties
- [ ] Create base UI components (Button, Input, Card, Badge)
- [ ] Set up TypeScript interfaces and types
- [ ] Configure testing environment and Storybook

### Phase 2: Core Components (Week 3-4)
- [ ] Implement StoryCard component with variants
- [ ] Build navigation components (TopNavigation, Sidebar)
- [ ] Create form components and validation
- [ ] Implement drag-and-drop functionality
- [ ] Add responsive design patterns

### Phase 3: Feature Components (Week 5-6)
- [ ] Build SprintBoard with column layout
- [ ] Implement dashboard widgets
- [ ] Create story management forms
- [ ] Add sprint planning interface
- [ ] Implement search and filtering

### Phase 4: Integration (Week 7-8)
- [ ] Connect to API and state management
- [ ] Add real-time updates
- [ ] Implement user authentication
- [ ] Add error handling and loading states
- [ ] Performance optimization and testing

---

*This component architecture provides a clear roadmap for implementing the scrumboard application with maintainable, reusable, and well-tested React components.*
