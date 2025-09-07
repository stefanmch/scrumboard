# Wireframes - Core User Interfaces

## 🎯 Wireframe Overview

These wireframes focus on the core user flows identified in our journey mapping:
1. **Dashboard** - Role-based landing pages
2. **Sprint Board** - Active sprint kanban view  
3. **Story Refinement** - Guided story breakdown
4. **Sprint Planning** - Story selection and capacity planning
5. **Mobile Views** - Key mobile interactions

---

## 📱 Mobile-First Wireframes

### Mobile Dashboard (Developer View)
```
┌─────────────────────────────────────┐
│ ≡  🏠 Dashboard           🔔 [👤] │ ← Header
├─────────────────────────────────────┤
│                                     │
│ 📋 My Tasks (3)                     │ ← Quick stats
│ ⏰ Sprint 23 - 4 days left          │
│                                     │
│ ┌─ In Progress ─────────────────┐   │
│ │ US-123: User Login           │   │ ← Current task
│ │ ⏱️ 2h logged today           │   │
│ │ 🔄 Update Status            │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─ To Do (2) ───────────────────┐   │
│ │ US-124: Dashboard Layout     │   │ ← Next tasks
│ │ US-125: API Integration      │   │
│ └─────────────────────────────┘   │
│                                     │
│ 📊 Team Activity                    │ ← Team context
│ • Sarah updated Sprint Goal         │
│ • Marcus refined 3 stories          │
│                                     │
│ [⚡ Quick Actions]                  │ ← Action button
├─────────────────────────────────────┤
│ 🏠 📋 👥 📊 ⚙️                      │ ← Bottom nav
└─────────────────────────────────────┘
```

### Mobile Sprint Board
```
┌─────────────────────────────────────┐
│ ← Sprint Board                🔄 ⋮  │ ← Header with actions
├─────────────────────────────────────┤
│ Sprint 23 | 🎯 Improve User Auth    │ ← Sprint context
│ 4 days left | 23/30 points done    │
├─────────────────────────────────────┤
│                                     │
│ [📋 To Do] [⚡ In Progress] [✅ Done] │ ← Column tabs
│                                     │
│ ┌─ US-123 ─────────────────────┐   │
│ │ 👤 User Login System        │   │ ← Story card
│ │ 📊 5 pts | 👨‍💻 Alex          │   │
│ │ 🟡 Needs Review            │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─ US-124 ─────────────────────┐   │
│ │ 📱 Responsive Dashboard     │   │
│ │ 📊 3 pts | 👩‍💻 Sarah        │   │
│ │ 🟢 Ready                   │   │
│ └─────────────────────────────┘   │
│                                     │
│ [+ Add Task]                        │ ← Add action
├─────────────────────────────────────┤
│ 🏠 📋 👥 📊 ⚙️                      │ ← Bottom nav
└─────────────────────────────────────┘
```

---

## 💻 Desktop Wireframes

### Desktop Dashboard (Scrum Master View)
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [🏠 Logo] [🔍 Search...] [Sprint 23 ▼] [🔔 3] [👤 Sarah ▼]                        │ ← Top nav
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 🏠 Dashboard    │                                                   │ Sprint Context │
│ 🚀 Sprint       │ ┌─ Sprint 23 Overview ─────────────────────────┐  │ ┌─ Team ────┐ │
│ 📚 Backlog      │ │ 🎯 Goal: Improve user authentication         │  │ │ Alex ✅    │ │
│ 📋 Planning     │ │ ⏰ 4 days left | 23/30 points | 77% complete │  │ │ Marcus ✅  │ │
│ 👥 Team         │ │ 📊 Health Score: 85% (Good)                  │  │ │ Emily ⚠️   │ │
│ 📊 Reports      │ └───────────────────────────────────────────────┘  │ └────────────┘ │
│ 🔄 Retros       │                                                   │                │
│ ⚙️ Settings     │ ┌─ Team Capacity ───────────┐ ┌─ Sprint Progress ─┐ │ Quick Actions  │
│                │ │ Capacity: 120h            │ │     Burndown      │ │ ┌────────────┐ │
│                │ │ Committed: 100h           │ │    /\             │ │ │ Daily      │ │
│                │ │ Actual: 78h (↗️ +5h)      │ │   /  \            │ │ │ Standup    │ │
│                │ │                           │ │  /    \           │ │ └────────────┘ │
│                │ │ 🟢 Alex: 80% loaded       │ │ /      \___       │ │ ┌────────────┐ │
│                │ │ 🟡 Emily: 110% loaded     │ │/           \___   │ │ │ Plan Next  │ │
│                │ │ 🟢 Marcus: 60% loaded     │ │             ___\  │ │ │ Sprint     │ │
│                │ └───────────────────────────┘ └───────────────────┘ │ └────────────┘ │
│                │                                                   │                │
│                │ ┌─ Impediments & Risks ────────────────────────────┐ │ 📋 Recent      │
│                │ │ 🔴 US-123: Waiting for API approval (3 days)    │ │ Activity       │
│                │ │ 🟡 Server deployment delayed (1 day)            │ │                │
│                │ │ 🟢 Database migration complete                   │ │ • Story US-126 │
│                │ │                                                  │ │   completed    │
│                │ │ [🚨 Add Impediment] [📊 View All]              │ │ • Emily raised │
│                │ └──────────────────────────────────────────────────┘ │   concern      │
├─────────────────┴─────────────────────────────────────────────────────┴────────────────┤
│ Sprint 23 | 4 days left | Next: Sprint Planning (Mon 9/9)                              │ ← Status bar
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Sprint Board (Kanban View)
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [🏠 Logo] [🔍 Search...] [Sprint 23 ▼] [🔔 3] [👤 Sarah ▼]                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 🏠 Dashboard    │ Sprint 23 Board                                   │ Sprint Context │
│ 🚀 Sprint       │ 🎯 Goal: Improve user authentication             │ ┌─ Stats ────┐ │
│ 📚 Backlog      │ [📊 Analytics] [👥 Team] [⚙️ Settings] [⋮ More]  │ │ 23/30 pts  │ │
│ 📋 Planning     │                                                   │ │ 4 days left│ │
│ 👥 Team         │ ┌─ 📋 Backlog ─┐ ┌─ ⚡ In Progress ─┐ ┌─ 👀 Review ─┐ ┌─ ✅ Done ─┐ │ │ 5 stories  │ │
│ 📊 Reports      │ │ (3 stories)  │ │ (2 stories)     │ │ (1 story)   │ │ (4 stories)│ │ └────────────┘ │
│ 🔄 Retros       │ │              │ │                 │ │             │ │            │ │                │
│ ⚙️ Settings     │ │ ┌──────────┐ │ │ ┌─────────────┐ │ │ ┌─────────┐ │ │ ┌────────┐ │ │ Quick Filters  │
│                │ │ │ US-126   │ │ │ │ US-123      │ │ │ │ US-124  │ │ │ │ US-121 │ │ │ ┌────────────┐ │
│                │ │ │ 📱 Mobile│ │ │ │ 👤 Login    │ │ │ │ 📊 Stats│ │ │ │ 🔐 Auth │ │ │ │ ☑️ My Tasks │ │
│                │ │ │ Design   │ │ │ │ System      │ │ │ │ Page    │ │ │ │ API     │ │ │ └────────────┘ │
│                │ │ │ 📊 8 pts │ │ │ │ 📊 5 pts    │ │ │ │ 📊 3pts │ │ │ │ 📊 5pts │ │ │ ┌────────────┐ │
│                │ │ │ 👨‍💻 Alex  │ │ │ │ 👨‍💻 Alex    │ │ │ │ 👩‍💻 Sarah│ │ │ │ 👨‍💻 Marcus│ │ │ │ ⚠️ Blocked  │ │
│                │ │ │          │ │ │ │ ⏱️ 2 days   │ │ │ │ 🟡 Ready │ │ │ │ ✅ Done │ │ │ └────────────┘ │
│                │ │ └──────────┘ │ │ └─────────────┘ │ │ └─────────┘ │ │ └────────┘ │ │                │
│                │ │              │ │                 │ │             │ │            │ │ Team Members   │
│                │ │ [+ Add]      │ │ [+ Add]         │ │ [+ Add]     │ │ [+ Add]    │ │ ┌────────────┐ │
│                │ └──────────────┘ └─────────────────┘ └─────────────┘ └────────────┘ │ │ 👨‍💻 Alex     │ │
│                │                                                   │ │ 👩‍💻 Sarah    │ │
│                │                                                   │ │ 👨‍💻 Marcus   │ │
│                │                                                   │ │ 👩‍💻 Emily    │ │
│                │                                                   │ └────────────┘ │
├─────────────────┴─────────────────────────────────────────────────────┴────────────────┤
│ Drag stories between columns | [🔄 Refresh] | Last updated: 2 min ago                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Story Refinement Wizard
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [🏠 Logo] [🔍 Search...] [Sprint 23 ▼] [🔔 3] [👤 Marcus ▼]                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 🏠 Dashboard    │ Story Refinement Wizard                           │ Refinement     │
│ 🚀 Sprint       │ ← Back to Backlog                                 │ Progress       │
│ 📚 Backlog      │                                                   │ ┌────────────┐ │
│ 📋 Planning     │ ┌─ Epic: User Management System ─────────────────┐ │ │ Step 2 of 4│ │
│ 👥 Team         │ │ Current Size: XL (Too large for sprint)        │ │ │ ████████░░ │ │
│ 📊 Reports      │ │ Estimated: 21+ story points                     │ │ │    80%     │ │
│ 🔄 Retros       │ │ Status: 🔴 Needs Refinement                     │ │ └────────────┘ │
│ ⚙️ Settings     │ └─────────────────────────────────────────────────┘ │                │
│                │                                                   │ Suggested      │
│                │ Step 2: Choose Breakdown Pattern                  │ Patterns       │
│                │                                                   │ ┌────────────┐ │
│                │ ┌─ Recommended Patterns ────────────────────────┐ │ │ 🔀 Workflow │ │
│                │ │                                               │ │ │ 👤 User Role│ │
│                │ │ ⭐ [🔀] By User Workflow (Recommended)         │ │ │ 📱 Platform │ │
│                │ │   • User Registration                         │ │ │ 🔧 Technical│ │
│                │ │   • User Login                               │ │ └────────────┘ │
│                │ │   • User Profile Management                   │ │                │
│                │ │   • Password Recovery                         │ │ Quick Actions  │
│                │ │                                               │ │ ┌────────────┐ │
│                │ │ [👤] By User Role                             │ │ │ 💾 Save     │ │
│                │ │   • Admin User Management                     │ │ │ Draft       │ │
│                │ │   • Regular User Management                   │ │ └────────────┘ │
│                │ │   • Guest User Management                     │ │ ┌────────────┐ │
│                │ │                                               │ │ │ 📋 Load     │ │
│                │ │ [📱] By Platform                              │ │ │ Template    │ │
│                │ │   • Web User Management                       │ │ └────────────┘ │
│                │ │   • Mobile User Management                    │ │                │
│                │ │   • API User Management                       │ │ Need Help?     │
│                │ └───────────────────────────────────────────────┘ │ 📚 Refinement  │
│                │                                                   │ Best Practices │
│                │ [❌ Cancel] [← Previous] [Continue →]              │                │
├─────────────────┴─────────────────────────────────────────────────────┴────────────────┤
│ 💡 Tip: Most successful stories are completed within 1-2 sprints                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Sprint Planning Interface
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [🏠 Logo] [🔍 Search...] [Sprint 24 Planning ▼] [🔔 3] [👤 Sarah ▼]               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 🏠 Dashboard    │ Sprint 24 Planning                                │ Sprint Setup   │
│ 🚀 Sprint       │ Planning Session: Mon 9/9 2:00 PM               │ ┌────────────┐ │
│ 📚 Backlog      │                                                   │ │ Duration   │ │
│ 📋 Planning     │ ┌─ Sprint Goal ────────────────────────────────┐  │ │ 2 weeks    │ │
│ 👥 Team         │ │ 🎯 Complete user authentication and improve  │  │ │            │ │
│ 📊 Reports      │ │    mobile responsiveness for better UX      │  │ │ Start Date │ │
│ 🔄 Retros       │ └──────────────────────────────────────────────┘  │ │ 9/9/2025   │ │
│ ⚙️ Settings     │                                                   │ │            │ │
│                │ ┌─ Available Stories ──────┐ ┌─ Sprint Backlog ───┐ │ │ Capacity   │ │
│                │ │ Product Backlog          │ │ Sprint 24 (0/30)   │ │ │ 120 hours  │ │
│                │ │ Priority Order           │ │ 0 story points     │ │ └────────────┘ │
│                │ │                          │ │                    │ │                │
│                │ │ ┌─ US-130 ─────────────┐ │ │                    │ │ Team Capacity  │
│                │ │ │ 🔐 Two-factor Auth   │ │ │ [Drag stories here]│ │ ┌────────────┐ │
│                │ │ │ 📊 8 pts | High      │ │ │                    │ │ │ Alex: 40h  │ │
│                │ │ │ ✅ Ready             │ │ │                    │ │ │ Sarah: 35h │ │
│                │ │ └─────────────────────┘ │ │                    │ │ │ Marcus: 30h│ │
│                │ │                          │ │                    │ │ │ Emily: 15h │ │
│                │ │ ┌─ US-131 ─────────────┐ │ │                    │ │ │ (50% this  │ │
│                │ │ │ 📱 Mobile Login      │ │ │                    │ │ │ sprint)    │ │
│                │ │ │ 📊 5 pts | High      │ │ │                    │ │ └────────────┘ │
│                │ │ │ ✅ Ready             │ │ │                    │ │                │
│                │ │ └─────────────────────┘ │ │                    │ │ Velocity       │
│                │ │                          │ │                    │ │ ┌────────────┐ │
│                │ │ ┌─ US-132 ─────────────┐ │ │                    │ │ │ Last 3:    │ │
│                │ │ │ 🎨 Dashboard Theme   │ │ │                    │ │ │ 28, 25, 30 │ │
│                │ │ │ 📊 3 pts | Medium    │ │ │                    │ │ │ Avg: 27.7  │ │
│                │ │ │ ⚠️ Needs Review      │ │ │                    │ │ │ Target: 30 │ │
│                │ │ └─────────────────────┘ │ │                    │ │ └────────────┘ │
│                │ └──────────────────────────┘ └────────────────────┘ │                │
│                │                                                   │                │
│                │ ⚖️ Capacity: 120h | Committed: 0h | Available: 120h  │ [Start Sprint] │
├─────────────────┴─────────────────────────────────────────────────────┴────────────────┤
│ 💡 Drag stories from backlog to sprint | Target: 25-30 story points                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Interaction Patterns

### Drag & Drop Behavior
```
Story Cards:
┌─────────────────┐    Drag     ┌─────────────────┐
│ US-123          │ ==========> │ US-123          │
│ 👤 Login System │             │ 👤 Login System │ (Highlighted)
│ 📊 5 pts        │             │ 📊 5 pts        │
│ 👨‍💻 Alex        │             │ 👨‍💻 Alex        │
└─────────────────┘             └─────────────────┘

Drop Zones:
┌─ In Progress ────────────┐
│ [Drop Zone Active]       │ (Blue border, subtle shadow)
│ Drop story here...       │
└──────────────────────────┘
```

### Modal/Dialog Patterns
```
Story Detail Modal:
┌─────────────────────────────────────────┐
│ US-123: User Login System          [✕] │ ← Header with close
├─────────────────────────────────────────┤
│ [📝 Edit] [💬 Comments] [📊 History]    │ ← Tab navigation
├─────────────────────────────────────────┤
│ Description:                            │
│ As a user, I want to log into the       │ ← Main content
│ system so that I can access my...       │
│                                         │
│ Acceptance Criteria:                    │
│ ☑️ Login form with email/password       │
│ ☑️ Remember me functionality            │ ← Checklist items
│ ☐ Password validation                   │
├─────────────────────────────────────────┤
│          [Cancel] [Save Changes]        │ ← Action buttons
└─────────────────────────────────────────┘
```

### Loading States
```
Card Loading:
┌─────────────────┐
│ ░░░░░░░░░░░░░░░ │ ← Skeleton loading
│ ░░░░░░░░ ░░░░░░ │
│ ░░░░ ░░░░░░░░░░ │
└─────────────────┘

List Loading:
Loading stories...
[████████████░░░░] 75%
```

---

## 📐 Layout Grid System

### Desktop Grid (12 columns)
```
Main Layout:
[Nav: 2 cols] [Content: 8 cols] [Context: 2 cols]

Dashboard Layout:
[Nav: 2] [Overview: 4] [Charts: 4] [Context: 2]

Board Layout:
[Nav: 2] [Column: 2.5] [Column: 2.5] [Column: 2.5] [Column: 2.5]
```

### Responsive Breakpoints
```
Mobile:    320px - 767px   (1 column)
Tablet:    768px - 1199px  (2-3 columns)  
Desktop:   1200px+         (4+ columns)
```

---

*These wireframes provide the structural foundation for our visual design and development phases.*
