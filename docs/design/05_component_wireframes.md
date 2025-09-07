# Component Wireframes & UI Patterns

## 🧩 Core Components

### Story Card Component
```
Standard Story Card:
┌─────────────────────────────────┐
│ US-123                     [⋮]  │ ← Story ID + Actions menu
├─────────────────────────────────┤
│ 👤 User Login System            │ ← Story title with icon
├─────────────────────────────────┤
│ As a user, I want to login to   │ ← Description preview
│ the system so that I can...     │
├─────────────────────────────────┤
│ 📊 5 pts  👨‍💻 Alex  🟢 Ready     │ ← Metadata row
├─────────────────────────────────┤
│ 🏷️ authentication 🏷️ security   │ ← Tags/Labels
└─────────────────────────────────┘

Compact Story Card:
┌─────────────────────┐
│ US-123         [⋮]  │
│ 👤 User Login       │
│ 📊 5pts 👨‍💻 Alex    │
│ 🟢 Ready            │
└─────────────────────┘

Expanded Story Card:
┌─────────────────────────────────┐
│ US-123                     [⋮]  │
├─────────────────────────────────┤
│ 👤 User Login System            │
├─────────────────────────────────┤
│ As a user, I want to login to   │
│ the system so that I can access │
│ my personal dashboard and...     │
├─────────────────────────────────┤
│ ✅ Acceptance Criteria:          │
│ • Email/password validation     │
│ • Remember me functionality     │
│ • Password recovery link        │
├─────────────────────────────────┤
│ 📊 5 pts  👨‍💻 Alex  🟢 Ready     │
├─────────────────────────────────┤
│ 🏷️ authentication 🏷️ security   │
├─────────────────────────────────┤
│ 💬 3 comments  📎 2 attachments │
└─────────────────────────────────┘
```

### Navigation Components

#### Top Navigation Bar
```
Desktop Navigation:
┌─────────────────────────────────────────────────────────────────────────────┐
│ [🏠 ScrumBoard]  [🔍 Search stories, tasks, people...]  [Sprint 23 ▼]       │
│                                                        [🔔 3] [👤 User ▼]  │
└─────────────────────────────────────────────────────────────────────────────┘

Mobile Navigation:
┌─────────────────────────────────────────┐
│ ≡  🏠 ScrumBoard           🔔 [👤]      │
└─────────────────────────────────────────┘
```

#### Left Sidebar Navigation
```
Expanded Sidebar (Desktop):
┌─────────────────────┐
│ 🏠 Dashboard         │ ← Current page highlighted
│ 🚀 Active Sprint     │
│ 📚 Product Backlog   │
│ 📋 Sprint Planning   │
│ 👥 Team              │
│ 📊 Reports           │
│ 🔄 Retrospectives    │
│ ⚙️ Settings          │
└─────────────────────┘

Collapsed Sidebar (Tablet):
┌─────┐
│ 🏠  │
│ 🚀  │
│ 📚  │
│ 📋  │
│ 👥  │
│ 📊  │
│ 🔄  │
│ ⚙️  │
└─────┘

Mobile Bottom Navigation:
┌─────────────────────────────────────┐
│ 🏠     📋     👥     📊     ⚙️     │
│ Home  Sprint  Team  Reports Settings│
└─────────────────────────────────────┘
```

### Form Components

#### Story Creation Form
```
Story Form:
┌─────────────────────────────────────────────────────────────┐
│ Create New Story                                       [✕] │
├─────────────────────────────────────────────────────────────┤
│ Story ID: [US-___] (auto-generated)                        │
│                                                             │
│ Title: [_________________________________]                 │
│                                                             │
│ Story Template:                                             │
│ ┌─ As a [user type] ────────────────────────────────────┐  │
│ │ I want to [action/goal]                               │  │
│ │ So that [benefit/value]                               │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Description:                                                │
│ [____________________________________________]              │
│ [                                            ]              │
│ [                                            ]              │
│                                                             │
│ Acceptance Criteria:                                        │
│ ┌─ Criteria 1 ──────────────────────────────────────────┐  │
│ │ [✓] Email validation required                         │  │
│ │ [✓] Password strength indicator                       │  │
│ │ [○] Remember me functionality                         │  │
│ │ [+ Add Criteria]                                      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Story Points: [Estimate ▼] Priority: [High ▼]              │
│ Assignee: [Select team member ▼] Sprint: [Backlog ▼]       │
│                                                             │
│ Tags: [authentication] [security] [+ Add Tag]               │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel] [Save Draft] [Create] │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Widgets

#### Sprint Health Widget
```
Sprint Health Dashboard Widget:
┌─ Sprint 23 Health ────────────────────────────┐
│ 🎯 Goal: Improve user authentication          │
│ ⏰ 4 days remaining | 77% complete            │
├────────────────────────────────────────────────┤
│ Health Score: 85% 🟢                          │
│                                                │
│ ┌─ Metrics ─────┐ ┌─ Progress ──────────────┐ │
│ │ ✅ 7 Done     │ │ Done    ████████░░ 80% │ │
│ │ ⚡ 2 Active   │ │ Active  ██░░░░░░░░ 20% │ │
│ │ 📋 1 Todo     │ │ Todo    █░░░░░░░░░ 10% │ │
│ │ 🔴 0 Blocked  │ │ Blocked ░░░░░░░░░░  0% │ │
│ └───────────────┘ └─────────────────────────┘ │
├────────────────────────────────────────────────┤
│ [📊 View Details] [⚡ Daily Standup]          │
└────────────────────────────────────────────────┘
```

#### Team Capacity Widget
```
Team Capacity Widget:
┌─ Team Capacity (Sprint 23) ───────────────────┐
│ Overall: 78h used / 120h capacity (65%)       │
│                                                │
│ 👨‍💻 Alex     ████████░░ 32h/40h (80%) 🟢      │
│ 👩‍💻 Sarah    ████████▓▓ 38h/35h (109%) 🟡     │
│ 👨‍💻 Marcus   ████░░░░░░ 16h/30h (53%) 🟢      │
│ 👩‍💻 Emily    ██░░░░░░░░ 8h/15h (53%) 🟢       │
│                                                │
│ 🟡 Sarah is over-allocated                     │
│ 💡 Consider redistributing work                │
├────────────────────────────────────────────────┤
│ [⚖️ Rebalance] [👥 View Team]                  │
└────────────────────────────────────────────────┘
```

### Interactive Elements

#### Drag & Drop Visual Feedback
```
During Drag:
┌─ Story Being Dragged ──────────┐
│ US-123 👤 User Login System    │ ← Semi-transparent, elevated
│ 📊 5 pts 👨‍💻 Alex              │
│ 🟢 Ready                       │
└────────────────────────────────┘

Drop Target (Active):
┌─ In Progress ──────────────────┐
│ ┌─ Drop Zone ───────────────┐  │ ← Blue dashed border
│ │ Drop story here...        │  │   Blue background tint
│ │                           │  │
│ └───────────────────────────┘  │
└────────────────────────────────┘

Drop Target (Invalid):
┌─ Done ─────────────────────────┐
│ ┌─ Invalid Drop ────────────┐  │ ← Red dashed border
│ │ Cannot drop here          │  │   Red background tint
│ │ Story not ready           │  │
│ └───────────────────────────┘  │
└────────────────────────────────┘
```

#### Button States
```
Primary Button States:
[  Start Sprint  ] ← Default
[  Start Sprint  ] ← Hover (darker)
[  Start Sprint  ] ← Active (pressed)
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓] ← Loading
[      ✓       ] ← Success

Secondary Button States:
[ Cancel ] ← Default (outline)
[ Cancel ] ← Hover (background)
[ Cancel ] ← Disabled (grayed)
```

#### Loading States
```
Card Skeleton Loading:
┌─────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░ │ ← Animated shimmer
│ ░░░░░░░░░░ ░░░░░░░░ │
│ ░░░░ ░░░░░░ ░░░░░░░ │
└─────────────────────┘

List Loading:
┌─ Loading Stories... ─────────────┐
│ [████████████░░░░] 75%           │
│ Fetching 23 stories from server  │
└──────────────────────────────────┘

Inline Loading:
Saving... [⟳] ← Spinning icon
Saved ✓       ← Success state
```

### Modal & Dialog Patterns

#### Confirmation Dialog
```
Confirmation Modal:
┌─────────────────────────────────────┐
│ Delete Story                   [✕] │
├─────────────────────────────────────┤
│ ⚠️ Are you sure you want to delete  │
│    "US-123: User Login System"?    │
│                                     │
│    This action cannot be undone.    │
│    All comments and history will    │
│    be permanently lost.             │
├─────────────────────────────────────┤
│           [Cancel] [Delete Story]   │
└─────────────────────────────────────┘
```

#### Story Detail Modal
```
Story Detail Modal:
┌─────────────────────────────────────────────────────────────────┐
│ US-123: User Login System                                  [✕] │
├─────────────────────────────────────────────────────────────────┤
│ [📝 Details] [💬 Comments] [📊 History] [⚙️ Settings]           │
├─────────────────────────────────────────────────────────────────┤
│ Status: 🟢 Ready         Points: 5         Priority: High       │
│ Assignee: 👨‍💻 Alex       Sprint: 23        Tags: auth, security │
├─────────────────────────────────────────────────────────────────┤
│ Description:                                                    │
│ As a user, I want to log into the system so that I can access  │
│ my personal dashboard and manage my account settings.           │
│                                                                 │
│ Acceptance Criteria:                                            │
│ ✅ User can enter email and password                           │
│ ✅ System validates credentials                                │
│ ✅ User redirected to dashboard on success                     │
│ ⏳ Password recovery link available                            │
│ ⏳ Remember me checkbox functionality                          │
│                                                                 │
│ Attachments:                                                    │
│ 📎 login-mockup.png (234 KB)                                   │
│ 📎 auth-flow.pdf (89 KB)                                       │
├─────────────────────────────────────────────────────────────────┤
│ Created: Sep 1, 2025 by Marcus | Updated: Sep 6, 2025 by Alex  │
│                                                                 │
│                          [Edit Story] [Move to Sprint]         │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

#### Card Layouts
```
Desktop (3-4 cards per row):
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4 │
└────────┘ └────────┘ └────────┘ └────────┘

Tablet (2 cards per row):
┌────────────────┐ ┌────────────────┐
│     Card 1     │ │     Card 2     │
└────────────────┘ └────────────────┘

Mobile (1 card per row):
┌──────────────────────────────────┐
│            Card 1                │
└──────────────────────────────────┘
```

#### Navigation Breakpoints
```
Desktop Navigation:
[Logo] [Search____________] [Sprint▼] [🔔] [User▼]

Tablet Navigation:
[≡] [Logo] [Search____] [🔔] [User▼]

Mobile Navigation:
[≡] [Logo]           [🔔] [User▼]
[🏠] [📋] [👥] [📊] [⚙️]  ← Bottom tabs
```

---

## 🎨 Visual Guidelines

### Color Usage
- **Primary Blue (#0066CC)**: Main actions, links, selected states
- **Success Green (#00AA44)**: Completed items, positive indicators
- **Warning Orange (#FF8800)**: Attention needed, pending items  
- **Error Red (#CC0000)**: Blocked items, critical issues
- **Neutral Gray (#666666)**: Text, borders, inactive states

### Typography
- **Headers**: 24px-32px, Bold, for page titles
- **Subheaders**: 18px-20px, Semibold, for sections
- **Body Text**: 14px-16px, Regular, for content
- **Meta Text**: 12px, Regular, for timestamps/labels

### Spacing
- **Component Padding**: 16px standard, 8px compact
- **Element Margins**: 8px-24px based on hierarchy
- **Grid Gutters**: 16px between cards/columns

---

*These component wireframes establish the UI patterns and interactions that will guide our development and visual design phases.*
