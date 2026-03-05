# Mission Control v2 - UX IA & Navigation Spec

**Version:** 2.0  
**Design Baseline:** Material Design 3  
**Last Updated:** 2026-03-05

---

## 1. Personas

### Operator
- **Role:** Deploys stories, manages infrastructure
- **Primary Job:** Execute deployments, verify health, manage gate progression
- **Permissions:** Deploy, rollback, health check, gate advancement
- **Key Flows:** Deploy → Verify → Advance Gate

### Reviewer
- **Role:** Quality assurance, manual verification
- **Primary Job:** Review UI/UX, verify acceptance criteria, test edge cases
- **Permissions:** Read-only code access, screenshot capture, approval/rejection
- **Key Flows:** Review → Test → Approve/Reject

---

## 2. Primary Jobs to Be Done

| Job | Actor | Trigger | Outcome |
|-----|-------|---------|---------|
| Create story | Architect | New feature requirement | Story in Backlog |
| Dispatch for implementation | Architect | Story spec complete | Story moved to In Progress |
| Implement feature | Implementer | Story assigned | Code committed |
| Review code/tests | Reviewer-A | PR created | Tests verified |
| Deploy to staging | Operator | Reviewer-A approved | Build deployed |
| Verify UI/UX | Reviewer-B | Staging deployed | Feature verified |
| Promote to production | Operator | Reviewer-B approved | Live in production |

---

## 3. Information Architecture

```
Mission Control v2
├── Dashboard (/)
│   ├── Widgets: Clock, Weather, Server Health, Reminders, News
│   └── Quick Actions: Recent Stories, Gate Status
├── Mission Control (/server)
│   ├── Server Grid: All monitored servers
│   ├── Server Detail (/server/[id]): Individual server metrics
│   └── Usage (/usage): Resource usage trends
├── Development (/kanban)
│   ├── Board: Kanban columns (Backlog, In Progress, Review, Done)
│   ├── Story Card: Title, description, gate status, assignee
│   └── Story Detail (modal): Full story, tasks, comments, gate history
└── Gate Panel (component)
    ├── Current Gate indicator
    ├── Gate Actions: Advance, Reject, Request Changes
    └── Gate History: Timeline of gate transitions
```

---

## 4. Navigation Map

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Home Hub | Dashboard | Mission Control | Development │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ /           │  │ /server     │  │ /kanban     │         │
│  │ Dashboard   │  │ Server Grid │  │ Dev Board   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│       │               │                  │                   │
│       └───────────────┴────────┬─────────┘                   │
│                                │                              │
│                    ┌───────────▼───────────┐                  │
│                    │ /server/[id]          │                  │
│                    │ Server Detail         │                  │
│                    └───────────────────────┘                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /usage                                                │    │
│  │ Usage Trends                                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Top-Level Routes

| Route | Page | Purpose | Auth |
|-------|------|---------|------|
| `/` | Dashboard | Home hub display, widgets, quick status | Public (wall display) |
| `/server` | Server Grid | Monitor all servers, quick health overview | Public |
| `/server/[id]` | Server Detail | Single server deep-dive, metrics history | Public |
| `/usage` | Usage | Resource usage trends, capacity planning | Public |
| `/kanban` | Development Board | Story management, gate workflow | Required |

---

## 6. Page Purpose & Components

### Dashboard (`/`)
- **Purpose:** Glanceable overview for wall display
- **Components:** Clock, Weather, ServerHealthBar, ReminderWidget, NewsTicker
- **Design:** Dark-first, glassmorphism cards, large typography (readable at 10ft)
- **Responsive:** Optimized for 1920x1080, scales down to mobile

### Server Grid (`/server`)
- **Purpose:** Infrastructure monitoring at a glance
- **Components:** ServerCard grid, HealthSummary, QuickFilters (All/Healthy/Warning/Critical)
- **States:** Loading skeleton, empty state, error state per card

### Server Detail (`/server/[id]`)
- **Purpose:** Deep-dive into single server metrics
- **Components:** MetricBar (CPU/RAM/Disk/Network), MetricHistoryChart, ProcessList, LogViewer
- **Interactions:** Time range selector, metric toggle, export data

### Usage (`/usage`)
- **Purpose:** Capacity planning, trend analysis
- **Components:** UsageCharts (line/bar), PeriodSelector (24h/7d/30d/90d), ComparisonTable

### Development Board (`/kanban`)
- **Purpose:** Story lifecycle management, gate workflow
- **Components:** KanbanBoard, Column (Backlog/In Progress/Review/Done), StoryCard, GateBadge
- **Interactions:** Drag-drop between columns, create story modal, story detail drawer
- **Gate States:** Architect → Implementer → Reviewer-A → Operator → Reviewer-B → Done

---

## 7. Key User Flows

### Story Create → Dispatch
```
1. Architect clicks "New Story" in Kanban header
2. Create Story Modal opens
3. Architect fills: Title, Description, Acceptance Criteria, Estimated Gate
4. Architect clicks "Create"
5. Story appears in Backlog column
6. Architect drags story to "In Progress" (dispatches to Implementer)
7. Implementer receives notification
```

### Implement → Review-A
```
1. Implementer claims story from "In Progress"
2. Implementer writes code, commits with story ID in commit message
3. Implementer runs tests, ensures all pass
4. Implementer marks "Ready for Review"
5. Story moves to "Review" column
6. Reviewer-A notified, sees story in Review column
7. Reviewer-A verifies: code quality, test coverage, acceptance criteria alignment
8. Reviewer-A clicks "Approve" or "Request Changes"
```

### Deploy → Review-B
```
1. If Reviewer-A approves, Operator sees story in "Ready to Deploy"
2. Operator runs deployment script (scripts/safe-deploy.sh)
3. Operator verifies health endpoint returns 200
4. Operator clicks "Deployed" → story moves to "Staging Verified"
5. Reviewer-B notified for final QA
6. Reviewer-B opens staging URL, tests all acceptance criteria
7. Reviewer-B captures screenshot evidence
8. Reviewer-B clicks "Approve" or "Reject"
```

### Production Release
```
1. If Reviewer-B approves, Operator promotes to production
2. Operator runs production deployment
3. Operator verifies production health
4. Story moves to "Done"
5. Gate contract auto-completed with all artifacts
```

---

## 8. Gate Panel (Component)

### Location
- Fixed bottom bar on Kanban board, or
- Slide-out panel from right edge

### Elements
- **Current Gate Badge:** Shows active gate with icon (Architect/Implementer/Reviewer-A/Operator/Reviewer-B)
- **Gate Progress:** Horizontal stepper showing completed gates
- **Actions:**
  - Advance Gate (if permissions allow)
  - Reject (with reason)
  - Request Changes (comment)
- **History:** Collapsible timeline of gate transitions with timestamps and actors

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Navigation | Layout |
|------------|-------|------------|--------|
| Mobile | < 768px | Bottom nav bar | Single column, stacked cards |
| Tablet | 768-1024px | Side rail | 2-column grid |
| Desktop | 1024-1920px | Top header | 3-4 column grid |
| Wall Display | > 1920px | Auto-hide nav | Full dashboard, large widgets |

---

## 10. Material Design 3 Baseline

### Tokens Used
- **Primary:** `#0ea5e9` (Sky 500)
- **Secondary:** `#8b5cf6` (Violet 500)
- **Surface:** `rgba(30, 41, 59, 0.8)` (Slate 800, 80% opacity)
- **On Surface:** `#f8fafc` (Slate 50)
- **Error:** `#ef4444` (Red 500)
- **Success:** `#22c55e` (Green 500)

### Component Patterns
- **Cards:** Rounded-xl (12px), elevation-2, backdrop-filter blur
- **Buttons:** Filled (primary), Outlined (secondary), Text (tertiary)
- **FAB:** Extended FAB for primary actions (New Story, Deploy)
- **Navigation:** Top app bar + bottom nav (mobile), rail (tablet), bar (desktop)
- **Chips:** Filter chips for status, input chips for tags

### Interaction States
- Default → Hover (lift + brighten) → Focus (ring) → Active (press) → Disabled (50% opacity)

---

## 11. Accessibility Requirements

- All interactive elements keyboard navigable
- Color status indicators have icon + text (not color-only)
- Focus visible rings on all focusable elements
- ARIA labels on icons and buttons
- Skip to main content link
- Minimum contrast 4.5:1 for text
