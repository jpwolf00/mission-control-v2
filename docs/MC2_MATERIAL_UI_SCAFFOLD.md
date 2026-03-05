# Material UI Component Scaffold for Mission Control v2

## Design System

Based on Google Material Design 3 with operational dashboard adaptations.

### Color Palette

```css
:root {
  /* Primary - Deep Indigo */
  --md-sys-color-primary: #4f46e5;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #e0e7ff;
  --md-sys-color-on-primary-container: #1e1b4b;

  /* Secondary - Slate */
  --md-sys-color-secondary: #64748b;
  --md-sys-color-on-secondary: #ffffff;
  --md-sys-color-secondary-container: #f1f5f9;
  --md-sys-color-on-secondary-container: #1e293b;

  /* Tertiary - Teal */
  --md-sys-color-tertiary: #0d9488;
  --md-sys-color-on-tertiary: #ffffff;

  /* Status Colors */
  --md-sys-color-success: #22c55e;
  --md-sys-color-warning: #f59e0b;
  --md-sys-color-error: #ef4444;
  --md-sys-color-info: #3b82f6;

  /* Background */
  --md-sys-color-surface: #ffffff;
  --md-sys-color-surface-variant: #f8fafc;
  --md-sys-color-background: #f1f5f9;

  /* Text */
  --md-sys-color-on-surface: #0f172a;
  --md-sys-color-on-surface-variant: #64748b;
}
```

### Typography

```css
:root {
  --md-sys-typescale-display-large: 3.5rem/4rem 400;
  --md-sys-typescale-display-medium: 2.5rem/3rem 400;
  --md-sys-typescale-headline-large: 2rem/2.5rem 500;
  --md-sys-typescale-headline-medium: 1.75rem/2.25rem 500;
  --md-sys-typescale-title-large: 1.25rem/1.75rem 500;
  --md-sys-typescale-title-medium: 1rem/1.5rem 500;
  --md-sys-typescale-body-large: 1rem/1.5rem 400;
  --md-sys-typescale-body-medium: 0.875rem/1.25rem 400;
  --md-sys-typescale-label-large: 0.875rem/1.25rem 500;
  --md-sys-typescale-label-medium: 0.75rem/1rem 500;
}
```

### Elevation (Shadows)

```css
:root {
  --md-sys-elevation-1: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14);
  --md-sys-elevation-2: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
  --md-sys-elevation-3: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10);
  --md-sys-elevation-4: 0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05);
}
```

### Shape (Border Radius)

```css
:root {
  --md-sys-shape-corner-small: 4px;
  --md-sys-shape-corner-medium: 8px;
  --md-sys-shape-corner-large: 12px;
  --md-sys-shape-corner-extra-large: 16px;
  --md-sys-shape-corner-full: 50%;
}
```

## Component Inventory

### Layout Components

| Component | Purpose | States |
|-----------|---------|--------|
| `AppShell` | Main layout wrapper | - |
| `NavRail` | Side navigation | collapsed, expanded |
| `TopAppBar` | Header with actions | scrolled, default |
| `PageContainer` | Content wrapper | - |

### Data Display Components

| Component | Purpose | States |
|-----------|---------|--------|
| `StoryCard` | Story summary in kanban | idle, active, blocked, completed |
| `GateTimeline` | Visual gate progression | pending, current, completed, failed |
| `StatusChip` | Status indicator | success, warning, error, info |
| `AgentBadge` | Agent role indicator | architect, implementer, reviewer, operator |
| `MetricsCard` | SLO metric display | - |
| `AlertBanner` | System alerts | info, warning, error |

### Input Components

| Component | Purpose | States |
|-----------|---------|--------|
| `StoryForm` | Create/edit story | pristine, dirty, submitting |
| `GateApprovalDialog` | Approve gate completion | open, processing |
| `RollbackDialog` | Deploy rollback | open, confirming |
| `SearchField` | Filter/search | empty, filled |

### Feedback Components

| Component | Purpose | States |
|-----------|---------|--------|
| `ProgressBar` | Operation progress | indeterminate, determinate |
| `LoadingSpinner` | Loading state | - |
| `Toast` | Notifications | entering, showing, exiting |
| `EmptyState` | No data display | - |

## Responsive Breakpoints

```css
/* Mobile first */
.sm { /* >= 640px */ }
.md { /* >= 768px */ }
.lg { /* >= 1024px */ }
.xl { /* >= 1280px */ }
.2xl { /* >= 1536px */ }
```

## Animation Standards

```css
/* Micro-interactions */
--md-sys-motion-duration-fast: 150ms;
--md-sys-motion-duration-medium: 250ms;
--md-sys-motion-duration-slow: 350ms;

/* Easing */
--md-sys-motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
--md-sys-motion-easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
--md-sys-motion-easing-accelerate: cubic-bezier(0.4, 0, 1, 1);
```

## Implementation Notes

- Use CSS custom properties for theming
- Prefer CSS Grid for layouts
- Use Flexbox for component internals
- Support prefers-reduced-motion
- Test at all breakpoints
- Maintain WCAG 2.1 AA contrast ratios
