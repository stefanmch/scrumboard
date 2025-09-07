# Implementation Guide & Technical Setup

## 🚀 Development Environment Setup

This guide provides step-by-step instructions for implementing the scrumboard application using our component architecture and design system.

---

## 📦 Technology Stack

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "react-dnd": "^16.0.0",
    "react-dnd-html5-backend": "^16.0.0",
    "clsx": "^2.0.0",
    "framer-motion": "^10.0.0",
    "react-hook-form": "^7.0.0",
    "zustand": "^4.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    "lucide-react": "^0.290.0"
  },
  "devDependencies": {
    "@testing-library/react": "^13.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@storybook/react": "^7.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

### Project Configuration Files

#### Next.js Configuration
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 🎨 Design System Implementation

### CSS Custom Properties Setup
```css
/* src/styles/design-tokens.css */
:root {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Typography */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */

  /* Spacing */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-outline: 0 0 0 3px rgba(59, 130, 246, 0.1);

  /* Border radius */
  --border-radius-sm: 0.125rem;  /* 2px */
  --border-radius-md: 0.25rem;   /* 4px */
  --border-radius-lg: 0.5rem;    /* 8px */
  --border-radius-xl: 0.75rem;   /* 12px */
}

/* Dark theme overrides */
[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
}
```

### Global Styles
```css
/* src/styles/globals.css */
@import './design-tokens.css';
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-family: var(--font-family-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-bg-primary, #ffffff);
  color: var(--color-text-primary, #111827);
}

/* Focus styles for accessibility */
*:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🧩 Component Implementation Examples

### Base Button Component
```typescript
// src/components/ui/Button/Button.tsx
import React from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const buttonClasses = clsx(
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    {
      [styles['button--loading']]: loading,
      [styles['button--full-width']]: fullWidth,
    },
    className
  );

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {!loading && leftIcon && (
        <span className={styles['icon-left']}>{leftIcon}</span>
      )}
      <span className={styles.content}>{children}</span>
      {!loading && rightIcon && (
        <span className={styles['icon-right']}>{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
```

### Button CSS Module
```css
/* src/components/ui/Button/Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-primary);
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  white-space: nowrap;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Sizes */
.button--sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
}

.button--md {
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
}

.button--lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-base);
}

/* Variants */
.button--primary {
  background-color: var(--color-primary-500);
  color: white;
}

.button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
}

.button--primary:focus-visible {
  box-shadow: var(--shadow-outline);
}

.button--secondary {
  background-color: var(--color-gray-100);
  color: var(--color-gray-700);
}

.button--secondary:hover:not(:disabled) {
  background-color: var(--color-gray-200);
}

.button--outline {
  background-color: transparent;
  color: var(--color-primary-600);
  border: 1px solid var(--color-primary-300);
}

.button--outline:hover:not(:disabled) {
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

.button--ghost {
  background-color: transparent;
  color: var(--color-gray-600);
}

.button--ghost:hover:not(:disabled) {
  background-color: var(--color-gray-100);
}

.button--danger {
  background-color: var(--color-error-500);
  color: white;
}

.button--danger:hover:not(:disabled) {
  background-color: var(--color-error-600);
}

/* Modifiers */
.button--full-width {
  width: 100%;
}

.button--loading {
  position: relative;
  color: transparent;
}

.spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon-left,
.icon-right {
  display: flex;
  align-items: center;
}

.content {
  display: flex;
  align-items: center;
}
```

### Component Export
```typescript
// src/components/ui/Button/index.ts
export { default } from './Button';
export type { ButtonProps } from './Button';
```

---

## 🏗️ Next.js App Structure

### App Router Layout
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/components/providers/AppProviders';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScrumBoard - Agile Project Management',
  description: 'Modern scrum board for agile teams',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
```

### App Providers
```typescript
// src/components/providers/AppProviders.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { useState } from 'react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DndProvider backend={HTML5Backend}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </DndProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Dashboard Page Implementation
```typescript
// src/app/dashboard/page.tsx
import { DashboardView } from '@/components/dashboard/DashboardView';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardView />
    </AppLayout>
  );
}
```

---

## 🔧 Development Tools Setup

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "prefer-const": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.test.tsx"],
      "env": {
        "jest": true
      }
    }
  ]
}
```

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Storybook Configuration
```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

---

## 📋 Implementation Phases (Rapid Prototyping Approach)

### 🚀 Phase 1: Immediate Visual Impact (Day 1-2)
**Goal: Get a working scrumboard visible in 2 days**

```bash
# Quick project setup
npx create-next-app@latest scrumboard --typescript --app --src-dir
cd scrumboard

# Minimal dependencies for immediate results
npm install clsx lucide-react

# Create basic structure
mkdir -p src/components/{ui,layout,board}
mkdir -p src/styles
```

**Day 1 Deliverables:**
- Basic Next.js app running
- Simple card layout with mock data
- Basic drag-and-drop (HTML5 API)
- Visible scrumboard with 3 columns

**Day 2 Deliverables:**
- Styled cards with story information
- Add/edit story functionality
- Column headers and basic navigation
- Deploy to Vercel for immediate sharing

### 🎨 Phase 2: Polish & Design System (Week 1)
**Goal: Apply design system and improve UX**

```bash
# Add design system dependencies
npm install react-dnd react-dnd-html5-backend framer-motion
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog
```

**Week 1 Deliverables:**
- Implement design tokens and CSS custom properties
- Upgrade to react-dnd for smooth drag-and-drop
- Add animations and micro-interactions
- Responsive design implementation
- Story detail modal/drawer

### 🧩 Phase 3: Core Features (Week 2)
**Goal: Complete essential scrumboard functionality**

```bash
# Add state management and data
npm install @tanstack/react-query zustand
npm install @prisma/client prisma
```

**Week 2 Deliverables:**
- User authentication
- Data persistence (local storage → database)
- Sprint management
- User assignment to stories
- Story status tracking
- Search and filtering

### 🔧 Phase 4: Advanced Features (Week 3-4)
**Goal: Professional features and optimization**

```bash
# Add testing and documentation
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @storybook/react @storybook/addon-essentials
```

**Week 3-4 Deliverables:**
- Burndown charts and reporting
- Team collaboration features
- Performance optimization
- Testing suite
- Storybook documentation
- Advanced drag-and-drop features

### Development Scripts
```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 🚀 Deployment Considerations

### Environment Variables
```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/scrumboard"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# .env.example
DATABASE_URL="postgresql://username:password@localhost:5432/scrumboard"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### Build Optimization
```typescript
// next.config.ts additions
const nextConfig: NextConfig = {
  // ... existing config
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  bundlePagesExternals: false,
  optimizeFonts: true,
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};
```

---

*This implementation guide provides the technical foundation and step-by-step approach for building the scrumboard application using our component architecture and design system.*
