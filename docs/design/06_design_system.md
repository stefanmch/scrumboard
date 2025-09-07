# Design System Foundation

## 🎨 Visual Identity

### Brand Principles
- **Clarity**: Clean, uncluttered interfaces that focus on user tasks
- **Efficiency**: Streamlined workflows that minimize cognitive load
- **Collaboration**: Visual cues that promote team communication
- **Professionalism**: Trustworthy appearance suitable for business environments
- **Accessibility**: Inclusive design that works for all team members

---

## 🌈 Color Palette

### Primary Colors
```css
/* Primary Blue - Main brand color, primary actions */
--color-primary-50:  #eff6ff;   /* Very light blue background */
--color-primary-100: #dbeafe;   /* Light blue accent */
--color-primary-200: #bfdbfe;   /* Soft blue hover states */
--color-primary-300: #93c5fd;   /* Medium blue secondary actions */
--color-primary-400: #60a5fa;   /* Blue interactive elements */
--color-primary-500: #3b82f6;   /* Main primary blue */
--color-primary-600: #2563eb;   /* Dark blue hover */
--color-primary-700: #1d4ed8;   /* Darker blue active */
--color-primary-800: #1e40af;   /* Deep blue text */
--color-primary-900: #1e3a8a;   /* Darkest blue headings */
```

### Status Colors
```css
/* Success Green - Completed items, positive feedback */
--color-success-50:  #f0fdf4;   /* Very light green background */
--color-success-100: #dcfce7;   /* Light green accent */
--color-success-200: #bbf7d0;   /* Soft green hover */
--color-success-300: #86efac;   /* Medium green */
--color-success-400: #4ade80;   /* Green interactive */
--color-success-500: #22c55e;   /* Main success green */
--color-success-600: #16a34a;   /* Dark green hover */
--color-success-700: #15803d;   /* Darker green active */
--color-success-800: #166534;   /* Deep green text */
--color-success-900: #14532d;   /* Darkest green */

/* Warning Orange - Attention needed, pending items */
--color-warning-50:  #fffbeb;   /* Very light orange background */
--color-warning-100: #fef3c7;   /* Light orange accent */
--color-warning-200: #fde68a;   /* Soft orange hover */
--color-warning-300: #fcd34d;   /* Medium orange */
--color-warning-400: #fbbf24;   /* Orange interactive */
--color-warning-500: #f59e0b;   /* Main warning orange */
--color-warning-600: #d97706;   /* Dark orange hover */
--color-warning-700: #b45309;   /* Darker orange active */
--color-warning-800: #92400e;   /* Deep orange text */
--color-warning-900: #78350f;   /* Darkest orange */

/* Error Red - Critical issues, blocked items */
--color-error-50:   #fef2f2;    /* Very light red background */
--color-error-100:  #fee2e2;    /* Light red accent */
--color-error-200:  #fecaca;    /* Soft red hover */
--color-error-300:  #fca5a5;    /* Medium red */
--color-error-400:  #f87171;    /* Red interactive */
--color-error-500:  #ef4444;    /* Main error red */
--color-error-600:  #dc2626;    /* Dark red hover */
--color-error-700:  #b91c1c;    /* Darker red active */
--color-error-800:  #991b1b;    /* Deep red text */
--color-error-900:  #7f1d1d;    /* Darkest red */
```

### Neutral Colors
```css
/* Gray Scale - Text, borders, backgrounds */
--color-gray-50:   #f9fafb;     /* Lightest background */
--color-gray-100:  #f3f4f6;     /* Light background */
--color-gray-200:  #e5e7eb;     /* Border color */
--color-gray-300:  #d1d5db;     /* Disabled elements */
--color-gray-400:  #9ca3af;     /* Placeholder text */
--color-gray-500:  #6b7280;     /* Secondary text */
--color-gray-600:  #4b5563;     /* Primary text */
--color-gray-700:  #374151;     /* Dark text */
--color-gray-800:  #1f2937;     /* Darker text */
--color-gray-900:  #111827;     /* Darkest text */
```

### Role-Based Accent Colors
```css
/* Scrum Master - Purple */
--color-scrum-master: #8b5cf6;  /* Purple for Scrum Master features */

/* Product Owner - Teal */
--color-product-owner: #14b8a6; /* Teal for Product Owner features */

/* Developer - Indigo */
--color-developer: #6366f1;     /* Indigo for Developer features */

/* Team Lead - Amber */
--color-team-lead: #f59e0b;     /* Amber for Team Lead features */
```

---

## 📝 Typography System

### Font Stack
```css
/* Primary Font - Inter (Clean, modern, highly readable) */
--font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace Font - JetBrains Mono (Code, IDs, technical content) */
--font-family-mono: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Cascadia Code', monospace;
```

### Typography Scale
```css
/* Font Sizes */
--font-size-xs:   0.75rem;   /* 12px - Small metadata, labels */
--font-size-sm:   0.875rem;  /* 14px - Body text, form inputs */
--font-size-base: 1rem;      /* 16px - Standard body text */
--font-size-lg:   1.125rem;  /* 18px - Large body text */
--font-size-xl:   1.25rem;   /* 20px - Small headings */
--font-size-2xl:  1.5rem;    /* 24px - Section headings */
--font-size-3xl:  1.875rem;  /* 30px - Page headings */
--font-size-4xl:  2.25rem;   /* 36px - Large headings */

/* Line Heights */
--line-height-tight: 1.25;   /* Headings */
--line-height-snug:  1.375;  /* Large text */
--line-height-normal: 1.5;   /* Body text */
--line-height-relaxed: 1.625; /* Reading text */

/* Font Weights */
--font-weight-normal:   400;  /* Regular text */
--font-weight-medium:   500;  /* Emphasized text */
--font-weight-semibold: 600;  /* Subheadings */
--font-weight-bold:     700;  /* Headings */
--font-weight-extrabold: 800; /* Display text */
```

### Text Styles
```css
/* Display Text - Large page headers */
.text-display {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-gray-900);
}

/* Page Headings - Main section headers */
.text-h1 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-gray-900);
}

/* Section Headings */
.text-h2 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-gray-800);
}

/* Subsection Headings */
.text-h3 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-snug);
  color: var(--color-gray-800);
}

/* Card Titles */
.text-h4 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-snug);
  color: var(--color-gray-700);
}

/* Body Text */
.text-body {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-gray-600);
}

/* Small Text */
.text-small {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-gray-500);
}

/* Metadata */
.text-meta {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-gray-400);
}

/* Code/Technical */
.text-code {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  background-color: var(--color-gray-100);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
```

---

## 📐 Spacing System

### Spacing Scale
```css
/* Spacing tokens based on 4px grid */
--space-0:   0;       /* 0px */
--space-1:   0.25rem; /* 4px */
--space-2:   0.5rem;  /* 8px */
--space-3:   0.75rem; /* 12px */
--space-4:   1rem;    /* 16px */
--space-5:   1.25rem; /* 20px */
--space-6:   1.5rem;  /* 24px */
--space-8:   2rem;    /* 32px */
--space-10:  2.5rem;  /* 40px */
--space-12:  3rem;    /* 48px */
--space-16:  4rem;    /* 64px */
--space-20:  5rem;    /* 80px */
--space-24:  6rem;    /* 96px */
```

### Spacing Usage
```css
/* Component Internal Spacing */
--spacing-xs:  var(--space-1);  /* 4px - Tight spacing */
--spacing-sm:  var(--space-2);  /* 8px - Small spacing */
--spacing-md:  var(--space-4);  /* 16px - Standard spacing */
--spacing-lg:  var(--space-6);  /* 24px - Large spacing */
--spacing-xl:  var(--space-8);  /* 32px - Extra large spacing */

/* Layout Spacing */
--layout-gap-sm:  var(--space-4);  /* 16px - Small grid gaps */
--layout-gap-md:  var(--space-6);  /* 24px - Standard grid gaps */
--layout-gap-lg:  var(--space-8);  /* 32px - Large grid gaps */

/* Container Padding */
--container-padding-sm: var(--space-4);  /* 16px - Mobile padding */
--container-padding-md: var(--space-6);  /* 24px - Tablet padding */
--container-padding-lg: var(--space-8);  /* 32px - Desktop padding */
```

---

## 🎯 Component Design Tokens

### Border Radius
```css
--border-radius-none: 0;
--border-radius-sm:   0.125rem; /* 2px - Small elements */
--border-radius-md:   0.25rem;  /* 4px - Buttons, inputs */
--border-radius-lg:   0.5rem;   /* 8px - Cards, modals */
--border-radius-xl:   0.75rem;  /* 12px - Large cards */
--border-radius-full: 9999px;   /* Circular elements */
```

### Shadows
```css
/* Elevation shadows */
--shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05);                    /* Subtle */
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1);                  /* Cards */
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1);                /* Modals */
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1);                /* Drawers */

/* Interactive shadows */
--shadow-outline: 0 0 0 3px rgba(59, 130, 246, 0.1);              /* Focus */
--shadow-outline-error: 0 0 0 3px rgba(239, 68, 68, 0.1);         /* Error focus */
```

### Borders
```css
--border-width-thin: 1px;
--border-width-thick: 2px;

--border-color-light: var(--color-gray-200);
--border-color-medium: var(--color-gray-300);
--border-color-dark: var(--color-gray-400);
```

---

## 🧩 Component Styles

### Buttons
```css
/* Primary Button */
.button-primary {
  background-color: var(--color-primary-500);
  color: white;
  border: none;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease-in-out;
}

.button-primary:hover {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
}

.button-primary:focus {
  outline: none;
  box-shadow: var(--shadow-outline);
}

.button-primary:disabled {
  background-color: var(--color-gray-300);
  color: var(--color-gray-500);
  cursor: not-allowed;
}

/* Secondary Button */
.button-secondary {
  background-color: transparent;
  color: var(--color-primary-600);
  border: var(--border-width-thin) solid var(--color-primary-300);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease-in-out;
}

.button-secondary:hover {
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-400);
}

/* Button Sizes */
.button-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
}

.button-lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-base);
}
```

### Cards
```css
.card {
  background-color: white;
  border: var(--border-width-thin) solid var(--border-color-light);
  border-radius: var(--border-radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease-in-out;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-medium);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

/* Card variants */
.card-compact {
  padding: var(--space-3);
}

.card-spacious {
  padding: var(--space-6);
}
```

### Form Elements
```css
.input {
  width: 100%;
  padding: var(--space-3);
  border: var(--border-width-thin) solid var(--border-color-medium);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  transition: all 0.2s ease-in-out;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: var(--shadow-outline);
}

.input:invalid {
  border-color: var(--color-error-400);
  box-shadow: var(--shadow-outline-error);
}

.input::placeholder {
  color: var(--color-gray-400);
}

/* Select dropdown */
.select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='5'><path fill='%236b7280' d='m0 1 2 2 2-2z'/></svg>");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: var(--space-3);
  padding-right: var(--space-8);
}

/* Label */
.label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}
```

### Status Indicators
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1;
}

.status-ready {
  background-color: var(--color-success-100);
  color: var(--color-success-800);
}

.status-in-progress {
  background-color: var(--color-primary-100);
  color: var(--color-primary-800);
}

.status-blocked {
  background-color: var(--color-error-100);
  color: var(--color-error-800);
}

.status-review {
  background-color: var(--color-warning-100);
  color: var(--color-warning-800);
}

.status-done {
  background-color: var(--color-success-100);
  color: var(--color-success-800);
}
```

---

## 📊 Data Visualization Colors

### Chart Colors
```css
/* Primary chart colors */
--chart-color-1: var(--color-primary-500);   /* Blue */
--chart-color-2: var(--color-success-500);   /* Green */
--chart-color-3: var(--color-warning-500);   /* Orange */
--chart-color-4: var(--color-error-500);     /* Red */
--chart-color-5: #8b5cf6;                    /* Purple */
--chart-color-6: #14b8a6;                    /* Teal */

/* Background colors for charts */
--chart-bg-1: var(--color-primary-50);
--chart-bg-2: var(--color-success-50);
--chart-bg-3: var(--color-warning-50);
--chart-bg-4: var(--color-error-50);
```

---

## 🌙 Dark Mode Support

### Dark Theme Colors
```css
[data-theme="dark"] {
  /* Dark backgrounds */
  --color-bg-primary: #0f172a;     /* Dark blue background */
  --color-bg-secondary: #1e293b;   /* Card backgrounds */
  --color-bg-tertiary: #334155;    /* Elevated surfaces */
  
  /* Dark text */
  --color-text-primary: #f1f5f9;   /* Primary text */
  --color-text-secondary: #cbd5e1; /* Secondary text */
  --color-text-tertiary: #94a3b8;  /* Tertiary text */
  
  /* Dark borders */
  --color-border-primary: #334155;
  --color-border-secondary: #475569;
}
```

---

## ♿ Accessibility Guidelines

### Color Contrast Requirements
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio  
- **UI components**: Minimum 3:1 contrast ratio
- **Focus indicators**: Highly visible with minimum 3:1 contrast

### Focus Management
```css
/* High visibility focus indicator */
.focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

*This design system provides the visual foundation for implementing consistent, accessible, and beautiful interfaces across the scrumboard application.*
