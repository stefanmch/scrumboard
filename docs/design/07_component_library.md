# Component Library Specification

## 🧩 Component Implementation Guide

This document specifies how to implement the design system components for the scrumboard application using React and CSS modules.

---

## 📋 Story Card Components

### StoryCard Base Component
```typescript
interface StoryCardProps {
  story: {
    id: string;
    title: string;
    description: string;
    points: number;
    status: 'backlog' | 'ready' | 'in-progress' | 'review' | 'done' | 'blocked';
    assignee?: User;
    tags: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  variant?: 'standard' | 'compact' | 'expanded';
  draggable?: boolean;
  onEdit?: () => void;
  onMove?: (newStatus: string) => void;
  onClick?: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ 
  story, 
  variant = 'standard',
  draggable = false,
  onEdit,
  onMove,
  onClick 
}) => {
  // Implementation
};
```

### CSS Module Structure
```css
/* StoryCard.module.css */
.card {
  background-color: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--border-radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-gray-300);
  transform: translateY(-1px);
}

.cardDragging {
  opacity: 0.8;
  transform: rotate(2deg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
}

/* Variants */
.compact {
  padding: var(--space-3);
}

.compact .title {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-snug);
}

.expanded {
  padding: var(--space-6);
}

/* Story header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-3);
}

.storyId {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  font-weight: var(--font-weight-medium);
}

.actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.card:hover .actions {
  opacity: 1;
}

/* Story content */
.title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-800);
  line-height: var(--line-height-snug);
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
  line-height: var(--line-height-normal);
  margin-bottom: var(--space-3);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Metadata */
.metadata {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.points {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-600);
}

.assignee {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
}

/* Status and Priority */
.status {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1;
}

.statusReady {
  background-color: var(--color-success-100);
  color: var(--color-success-800);
}

.statusInProgress {
  background-color: var(--color-primary-100);
  color: var(--color-primary-800);
}

.statusBlocked {
  background-color: var(--color-error-100);
  color: var(--color-error-800);
}

.statusReview {
  background-color: var(--color-warning-100);
  color: var(--color-warning-800);
}

.statusDone {
  background-color: var(--color-success-100);
  color: var(--color-success-800);
}

/* Priority indicators */
.priority {
  width: 4px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  border-radius: var(--border-radius-lg) 0 0 var(--border-radius-lg);
}

.priorityHigh {
  background-color: var(--color-warning-400);
}

.priorityCritical {
  background-color: var(--color-error-400);
}

/* Tags */
.tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.tag {
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-gray-100);
  color: var(--color-gray-700);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
```

---

## 🎛️ Navigation Components

### TopNavigation Component
```typescript
interface TopNavigationProps {
  currentSprint?: Sprint;
  onSprintChange?: (sprintId: string) => void;
  onSearch?: (query: string) => void;
  user: User;
  notifications: Notification[];
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  currentSprint,
  onSprintChange,
  onSearch,
  user,
  notifications
}) => {
  // Implementation
};
```

### CSS for Navigation
```css
/* TopNavigation.module.css */
.navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-6);
  background-color: white;
  border-bottom: 1px solid var(--color-gray-200);
  height: 64px;
}

.left {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-600);
  text-decoration: none;
}

.search {
  position: relative;
  min-width: 320px;
}

.searchInput {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-10);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-sm);
  background-color: var(--color-gray-50);
  transition: all 0.2s ease-in-out;
}

.searchInput:focus {
  outline: none;
  background-color: white;
  border-color: var(--color-primary-400);
  box-shadow: var(--shadow-outline);
}

.searchIcon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-gray-400);
  width: 16px;
  height: 16px;
}

.right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.sprintSelector {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius-md);
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.sprintSelector:hover {
  border-color: var(--color-gray-400);
}

.notifications {
  position: relative;
  padding: var(--space-2);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.notifications:hover {
  background-color: var(--color-gray-100);
}

.notificationBadge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: var(--color-error-500);
  color: white;
  border-radius: var(--border-radius-full);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .navigation {
    padding: var(--space-3) var(--space-4);
  }
  
  .search {
    display: none;
  }
  
  .logo {
    font-size: var(--font-size-base);
  }
}
```

---

## 📊 Dashboard Widgets

### SprintHealthWidget Component
```typescript
interface SprintHealthWidgetProps {
  sprint: {
    id: string;
    name: string;
    goal: string;
    daysRemaining: number;
    progress: {
      done: number;
      inProgress: number;
      todo: number;
      blocked: number;
    };
    healthScore: number;
  };
  onViewDetails?: () => void;
  onStartStandup?: () => void;
}

const SprintHealthWidget: React.FC<SprintHealthWidgetProps> = ({
  sprint,
  onViewDetails,
  onStartStandup
}) => {
  // Implementation
};
```

### Widget CSS
```css
/* SprintHealthWidget.module.css */
.widget {
  background-color: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--border-radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.header {
  margin-bottom: var(--space-4);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-gray-900);
  margin-bottom: var(--space-2);
}

.goal {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
  margin-bottom: var(--space-1);
}

.summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.healthScore {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.scoreValue {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.scoreGood {
  color: var(--color-success-600);
}

.scoreWarning {
  color: var(--color-warning-600);
}

.scorePoor {
  color: var(--color-error-600);
}

.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2);
  border-radius: var(--border-radius-md);
  background-color: var(--color-gray-50);
}

.metricLabel {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}

.metricValue {
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-900);
}

.progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.progressBar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.progressLabel {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
  min-width: 60px;
}

.progressTrack {
  flex: 1;
  height: 8px;
  background-color: var(--color-gray-200);
  border-radius: var(--border-radius-full);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: var(--border-radius-full);
  transition: width 0.3s ease-in-out;
}

.progressDone {
  background-color: var(--color-success-500);
}

.progressInProgress {
  background-color: var(--color-primary-500);
}

.progressTodo {
  background-color: var(--color-gray-400);
}

.progressBlocked {
  background-color: var(--color-error-500);
}

.progressPercent {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  min-width: 40px;
  text-align: right;
}

.actions {
  display: flex;
  gap: var(--space-3);
}

.actionButton {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-primary-300);
  background-color: transparent;
  color: var(--color-primary-600);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.actionButton:hover {
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.actionButtonPrimary {
  background-color: var(--color-primary-500);
  color: white;
  border-color: var(--color-primary-500);
}

.actionButtonPrimary:hover {
  background-color: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .content {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
}
```

---

## 🎨 Form Components

### Input Component
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'search';
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  className,
  ...props
}) => {
  // Implementation
};
```

### Form CSS
```css
/* Input.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

.inputContainer {
  position: relative;
  display: flex;
  align-items: center;
}

.input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  transition: all 0.2s ease-in-out;
  background-color: white;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: var(--shadow-outline);
}

.input:invalid {
  border-color: var(--color-error-400);
}

.input::placeholder {
  color: var(--color-gray-400);
}

.input:disabled {
  background-color: var(--color-gray-100);
  color: var(--color-gray-500);
  cursor: not-allowed;
}

.inputWithIcon {
  padding-left: var(--space-10);
}

.inputWithRightIcon {
  padding-right: var(--space-10);
}

.leftIcon {
  position: absolute;
  left: var(--space-3);
  color: var(--color-gray-400);
  width: 16px;
  height: 16px;
}

.rightIcon {
  position: absolute;
  right: var(--space-3);
  color: var(--color-gray-400);
  width: 16px;
  height: 16px;
}

.error {
  font-size: var(--font-size-xs);
  color: var(--color-error-600);
}

.hint {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

/* Variants */
.search {
  background-color: var(--color-gray-50);
  border-color: var(--color-gray-200);
}

.search:focus {
  background-color: white;
}

/* Error state */
.hasError {
  border-color: var(--color-error-400);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

---

## 📱 Responsive Design Patterns

### Breakpoint System
```css
/* breakpoints.css */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Media query mixins for CSS-in-JS */
.responsive {
  /* Mobile first approach */
  
  /* Small devices (landscape phones, 640px and up) */
  @media (min-width: 640px) {
    /* sm: styles */
  }
  
  /* Medium devices (tablets, 768px and up) */
  @media (min-width: 768px) {
    /* md: styles */
  }
  
  /* Large devices (desktops, 1024px and up) */
  @media (min-width: 1024px) {
    /* lg: styles */
  }
  
  /* Extra large devices (large desktops, 1280px and up) */
  @media (min-width: 1280px) {
    /* xl: styles */
  }
}
```

### Container System
```css
/* Container.module.css */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
    padding-left: var(--space-6);
    padding-right: var(--space-6);
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
    padding-left: var(--space-8);
    padding-right: var(--space-8);
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}

@media (min-width: 1536px) {
  .container {
    max-width: 1536px;
  }
}
```

---

## 🎯 Usage Guidelines

### Implementation Checklist
- [ ] Install design tokens as CSS custom properties
- [ ] Create base component library with TypeScript interfaces
- [ ] Implement responsive breakpoint system
- [ ] Add accessibility features (focus management, ARIA labels)
- [ ] Set up CSS modules or styled-components
- [ ] Create Storybook for component documentation
- [ ] Add dark mode support
- [ ] Implement animation and transition system

### Development Best Practices
1. **Use design tokens** - Always reference CSS custom properties instead of hardcoded values
2. **Mobile-first** - Start with mobile styles and enhance for larger screens
3. **Accessibility** - Include proper ARIA labels, keyboard navigation, and focus management
4. **Performance** - Optimize for minimal CSS bundle size and fast rendering
5. **Consistency** - Follow the established patterns for spacing, colors, and typography

---

*This component library specification provides the implementation details needed to build a consistent, accessible, and maintainable UI component system.*
