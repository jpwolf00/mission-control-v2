# MC2 Remediation Spec — Agent Task List

**Purpose:** Prescriptive, file-level tasks to bring MC2 from scaffold to working multi-agent orchestration platform. Each task is self-contained with explicit inputs, outputs, and verification steps.

**Rules for agents executing this spec:**
1. Read existing files before modifying them.
2. Import from the paths specified — do NOT create new stores or duplicates.
3. Verify each task works before marking it complete (run the verification step).
4. Do not add features beyond what is specified in each task.

---

## PRIORITY 1 — Core Workflow (must work end-to-end)

### Task 1.1: Delete Dead Code

**What:** Remove orphaned in-memory stores that are not used by any active code path.

**Files to delete:**
- `src/services/story-store.ts` — Replaced by `src/services/story-store-db.ts`. No active code imports from this file anymore.
- `src/api/v1/stories.ts` — Has its own private in-memory store. The actual API route (`src/app/api/v1/stories/route.ts`) uses `story-store-db.ts` directly. This file is dead code.

**Verification:**
```bash
# Must return zero results:
grep -r "from.*story-store'" src/ --include='*.ts' --include='*.tsx'
grep -r "from.*api/v1/stories'" src/ --include='*.ts' --include='*.tsx'
# The app/api/v1/stories/route.ts should NOT match because it imports from story-store-db
```

---

### Task 1.2: Add Story Detail API Route

**What:** The story detail page (`src/app/stories/[id]/page.tsx`) currently uses hardcoded mock data. Wire it to a real API endpoint.

**File to create:** `src/app/api/v1/stories/[id]/route.ts`

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getStoryByIdFromDB } from '@/services/story-store-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const story = await getStoryByIdFromDB(id);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Failed to fetch story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}
```

**File to modify:** `src/app/stories/[id]/page.tsx`

Replace the hardcoded mock data `useEffect` with a real API fetch:
```typescript
useEffect(() => {
  fetch(`/api/v1/stories/${id}`)
    .then(res => res.json())
    .then(data => { setStory(data); setLoading(false); })
    .catch(err => { setError(err.message); setLoading(false); });
}, [id]);
```

**Verification:** Navigate to `/stories/{id}` with a real story ID from the database. Page should render story data, not mock data.

---

### Task 1.3: Add Gate Completion API Route

**What:** There is no API endpoint for submitting gate completions. This is required for the agent workflow — after an agent finishes work at a gate, it must submit evidence and advance the pipeline.

**File to create:** `src/app/api/v1/gates/complete/route.ts`

**Inputs:** Use the existing `validateGateCompletion` and `createGateCompletion` from `src/domain/gate-contracts.ts`. Use `requireIdempotencyKey` from `src/api/v1/idempotency.ts`.

**Contract:**
- Method: `POST`
- Headers: `X-Idempotency-Key` (required)
- Body: `{ gate, storyId, sessionId, status, evidence: [...], reviewerNotes? }`
- Success: 200 with the `GateCompletion` object
- Validation failure: 422 with `{ error, details }`
- Story not found: 404

**Implementation notes:**
- Import `validateGateCompletion`, `createGateCompletion`, `createGateEvidence` from `@/domain/gate-contracts`
- Import `getStoryByIdFromDB` from `@/services/story-store-db`
- Import `requireIdempotencyKey` from `@/api/v1/idempotency`
- Import `releaseLock` from `@/services/lock-service`
- On successful completion with status `approved`, release the dispatch lock for that story+gate
- Do NOT create a new store — gate completions should be persisted via Prisma (add to schema if needed) or returned directly for now

**Verification:**
```bash
curl -X POST http://localhost:3000/api/v1/gates/complete \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-gate-complete-001" \
  -d '{
    "gate": "architect",
    "storyId": "<real-story-id>",
    "sessionId": "test-session",
    "status": "approved",
    "evidence": [
      { "type": "documentation", "description": "SPEC.md created" }
    ]
  }'
# Should return 200 with GateCompletion object
```

---

### Task 1.4: Wire Deploy Page to Service Layer

**What:** `src/app/deploy/page.tsx` has non-functional buttons and hardcoded data. Wire it to the existing `deploy-control.ts` service via API routes.

**File to create:** `src/app/api/v1/deployments/route.ts`

**Methods:**
- `GET` — List deployments. Call `getAllDeployments()` from `@/services/deploy-control`.
- `POST` — Create deployment. Call `createDeployment()` from `@/services/deploy-control`. Body: `{ storyId, featureBranch, targetEnvironment, commitSha, commitMessage, initiatedBy }`.

**File to create:** `src/app/api/v1/deployments/[id]/route.ts`

**Methods:**
- `GET` — Get deployment by ID. Call `getDeployment()` from `@/services/deploy-control`.
- `PATCH` — Update deployment status. Body: `{ action: 'approve' | 'start' | 'rollback' | 'verify', ...params }`. Route to appropriate service function (`respondToApproval`, `startDeployment`, `initiateRollback`, `runVerification`).

**File to modify:** `src/app/deploy/page.tsx`

- Add `useEffect` to fetch deployments from `/api/v1/deployments` on mount.
- Add `onClick` handlers to Deploy and Rollback buttons that POST/PATCH to the API.
- Replace hardcoded environment cards and deployment history with API data.

**Verification:** Navigate to `/deploy`. Click "Deploy" with a story selected. Deployment should appear in history list. Click "Rollback" on a deployment. Status should change.

---

### Task 1.5: Fix Stories Page Status Columns

**What:** `src/app/stories/page.tsx` only renders 4 columns (draft, approved, active, completed) but the `StoryStatus` type has 7 values. Stories with status `pending_approval`, `archived`, or `blocked` are silently dropped.

**File to modify:** `src/app/stories/page.tsx`

**Changes:**
- Add `pending_approval` to the kanban columns (between draft and approved).
- Add a `blocked` indicator — blocked stories should show in their current column with a red "Blocked" badge overlay, OR as a separate column.
- `archived` stories can be excluded from the kanban (they are terminal state) but add a filter toggle to show/hide them.

**Verification:** Create stories with different statuses via the API. All non-archived stories should appear in the correct column.

---

## PRIORITY 2 — Navigation & Route Structure

### Task 2.1: Add Kanban Route

**What:** The UX spec (`docs/ux/MC2_UX_IA_NAVIGATION.md`) specifies `/kanban` as the development board route. Currently, `/stories` serves this purpose but doesn't match the spec.

**Option A (recommended):** Add a redirect from `/kanban` to `/stories` in `next.config.js`:
```javascript
module.exports = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/kanban', destination: '/stories', permanent: true },
    ];
  },
};
```

**Option B:** Rename the stories page to kanban and update all references.

**Also update:** `src/components/navigation.tsx` — add "Kanban" link pointing to `/kanban` (or update "Stories" label to "Dev Board" to match spec).

---

### Task 2.2: Update Navigation to Match Spec

**What:** Navigation currently shows [Dashboard, Stories, Deploy]. The spec calls for [Dashboard, Mission Control, Development].

**File to modify:** `src/components/navigation.tsx`

**Changes:**
- Rename "Stories" to "Dev Board" or "Development"
- Rename "Deploy" to "Operations" or keep as-is (deploy is under operations in the spec)
- Add route for future pages as disabled/greyed-out links (optional)

---

## PRIORITY 3 — Agent Integration Points

### Task 3.1: Fix RBAC Client Endpoints

**What:** `src/lib/rbac-client.ts` calls API endpoints (`/api/v1/files/read`, `/api/v1/exec`, etc.) that do not exist.

**Decision required:** Either:

**Option A (recommended):** Remove the tool-proxying methods from `rbac-client.ts`. The RBAC client's job is only to CHECK permissions via `/api/v1/rbac/check`. Actual tool execution happens outside MC2 (in the Openclaw agent runtime). Simplify to:

```typescript
// Only export permission checking
export async function checkPermission(
  agentId: string,
  role: string,
  tool: string,
  params: Record<string, unknown>
): Promise<{ allowed: boolean; reason?: string }> {
  const res = await fetch('/api/v1/rbac/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, role, tool, params }),
  });
  return res.json();
}
```

**Option B:** Create the missing API routes (`/api/v1/files/read`, `/api/v1/exec`, etc.) as proxies. This is significantly more work and creates security surface area.

**Verification:** After simplification, ensure no code imports the removed methods. `grep -r "createRBACAgent\|withRBAC" src/` should return zero results (or only the definition in rbac-client.ts).

---

### Task 3.2: Add Webhook/Event Endpoint for Agent Callbacks

**What:** When an Openclaw agent completes work, it needs a way to report back to MC2. Currently there is no inbound event endpoint.

**File to create:** `src/app/api/v1/agents/callback/route.ts`

**Contract:**
- Method: `POST`
- Headers: `X-Idempotency-Key` (required)
- Body: `{ sessionId, agentId, role, event: 'completed' | 'failed' | 'heartbeat', evidence?: [...], error?: string }`
- On `completed`: Validate evidence, submit gate completion, advance pipeline
- On `failed`: Record failure, release lock, notify
- On `heartbeat`: Update session timestamp

**Implementation notes:**
- Import `validateGateCompletion` from `@/domain/gate-contracts`
- Import `completeSession` from `@/services/dispatch-service`
- Import session types from `@/domain/runtime-types`
- Use `requireIdempotencyKey` from `@/api/v1/idempotency`

---

### Task 3.3: Add Dispatch Trigger for Openclaw

**What:** When a story is dispatched to a gate, MC2 needs to actually trigger an Openclaw agent. Currently dispatch just acquires a lock and records a session — it doesn't start any work.

**File to create:** `src/services/openclaw-client.ts`

**Implementation:**
- Export `triggerAgent(config: { storyId, gate, sessionId, role, context })` function
- For now, implement as a stub that logs the trigger and returns success
- Include a comment showing where the Openclaw API call would go
- Read agent configuration (model, tools, system prompt) from the role definitions in `src/services/role-permissions.ts`

**File to modify:** `src/services/dispatch-service.ts`

After successful lock acquisition and session creation, call `triggerAgent()`:
```typescript
// After activeSessions.set(sessionId, ...)
await triggerAgent({
  storyId,
  gate,
  sessionId,
  role: gateToRole(gate), // architect, implementer, etc.
  context: { story }
});
```

**Verification:** Dispatch a story via API. Check server logs for the trigger log message.

---

## PRIORITY 4 — UI Polish

### Task 4.1: Apply Material Design 3 CSS Tokens

**What:** `src/app/globals.css` uses generic shadcn CSS variables. The spec (`docs/MC2_MATERIAL_UI_SCAFFOLD.md`) defines specific MD3 tokens.

**File to modify:** `src/app/globals.css`

Add the MD3 CSS custom properties from the scaffold doc:
```css
:root {
  --md-sys-color-primary: #4f46e5;
  --md-sys-color-on-primary: #ffffff;
  /* ... rest from MC2_MATERIAL_UI_SCAFFOLD.md */
}
```

Map the shadcn variables to use these tokens:
```css
:root {
  --primary: var(--md-sys-color-primary);
  --primary-foreground: var(--md-sys-color-on-primary);
  --background: var(--md-sys-color-background);
  --foreground: var(--md-sys-color-on-surface);
  /* etc. */
}
```

**Verification:** Dashboard should render with the indigo/slate color scheme defined in the scaffold, not generic shadcn gray.

---

### Task 4.2: Add Missing UI Components

**What:** The scaffold doc specifies components that don't exist yet.

**Components to create (one file each in `src/components/`):**

| Component | File | Purpose | Complexity |
|-----------|------|---------|------------|
| `StatusChip` | `status-chip.tsx` | Colored status pill (success/warning/error/info) | Low — styled span with variant prop |
| `AgentBadge` | `agent-badge.tsx` | Shows agent role with icon | Low — Badge variant with role-specific color |
| `EmptyState` | `empty-state.tsx` | "No items" placeholder with icon + message | Low — centered div with icon |
| `AlertBanner` | `alert-banner.tsx` | System alert bar at top of page | Medium — dismissible banner with severity variants |

**Do NOT create yet** (these require more context and should wait for the core workflow to work):
- `StoryForm` — depends on finalized story creation flow
- `GateApprovalDialog` — depends on gate completion API
- `RollbackDialog` — depends on deployment API

**Implementation notes:**
- Follow the existing shadcn component pattern (use `cva` for variants, `cn` for class merging)
- Export from individual files, not a barrel `index.ts`
- Use Tailwind classes, not inline styles

---

### Task 4.3: Dashboard Page — Replace Hardcoded Data

**What:** `src/app/page.tsx` has all hardcoded metric values. Wire to real data.

**File to modify:** `src/app/page.tsx`

**Changes:**
- Convert to client component (`"use client"`)
- Fetch story counts by status from `/api/v1/stories` on mount
- Compute metrics from real data:
  - "Active Stories" = count of stories with status `active`
  - "System Status" = fetch from `/api/v1/health`
- Keep "Success Rate" and "Avg Gate Time" as placeholder values with a "No data yet" note until metrics collection is implemented

**Verification:** Dashboard metrics should update when stories are created/dispatched.

---

## PRIORITY 5 — Cleanup & Hardening

### Task 5.1: Guard Against Missing DATABASE_URL

**What:** `src/lib/env.ts` calls `envSchema.parse(process.env)` at module load time. If `DATABASE_URL` is missing, the entire app crashes on first import.

**File to modify:** `src/lib/env.ts`

**Change:** Use lazy validation instead of eager parsing:
```typescript
let _env: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
```

This way the validation only runs when `getEnv()` is first called, not on import.

---

### Task 5.2: Add Error Boundaries to Pages

**What:** Server-side rendering errors cascade up uncaught. If the database is down, the entire app white-screens.

**Files to create:**
- `src/app/stories/error.tsx` — Error boundary for stories page
- `src/app/deploy/error.tsx` — Error boundary for deploy page

**Implementation:** Standard Next.js error boundary pattern:
```typescript
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded">
        Try again
      </button>
    </div>
  );
}
```

---

### Task 5.3: Fix Inconsistent Import Styles

**What:** Domain files use `"./workflow-types.js"` (with `.js` extension) while everything else uses `@/domain/workflow-types` (path alias, no extension). Both work but the inconsistency creates confusion for agents.

**Files to modify:** All files in `src/domain/` that use `.js` extension imports.

**Change:** Replace all `"./foo.js"` imports with `@/domain/foo` to match the rest of the codebase.

**Example:**
```typescript
// Before
import { GATES, type Gate, type WorkflowStatus } from "./workflow-types.js";

// After
import { GATES, type Gate, type WorkflowStatus } from "@/domain/workflow-types";
```

**Files affected:**
- `src/domain/state-machine.ts`
- `src/domain/story.ts`
- `src/domain/gate-contracts.ts`
- `src/domain/dispatch-lock.ts`
- `src/domain/stalled-derivation.ts`
- `src/domain/runtime-types.ts` (check for relative imports)

**Verification:**
```bash
grep -r '\.js"' src/domain/ --include='*.ts'
# Should return zero results
```

---

## Task Execution Order

Agents should execute tasks in this order:

1. **1.1** (delete dead code) — removes confusion about which store to use
2. **5.3** (fix imports) — prevents build errors in subsequent tasks
3. **1.2** (story detail API) — first real API wiring
4. **1.3** (gate completion API) — enables agent workflow
5. **1.4** (deploy page wiring) — second major feature
6. **1.5** (fix status columns) — UI correctness
7. **3.1** (RBAC client cleanup) — remove broken code
8. **3.2** (agent callback endpoint) — enables agent-to-MC2 communication
9. **3.3** (Openclaw trigger stub) — enables MC2-to-agent dispatch
10. **5.1** (env guard) — prevents startup crashes
11. **5.2** (error boundaries) — prevents white pages
12. **2.1, 2.2** (navigation) — cosmetic alignment with spec
13. **4.1, 4.2, 4.3** (UI polish) — visual improvements
14. **Task 3.1** simplified RBAC client — last because it's least critical to core flow

---

## What This Spec Does NOT Cover

These are out of scope for this remediation pass:

- **Real Openclaw SDK integration** — Task 3.3 creates a stub. Real integration requires Openclaw API docs and credentials.
- **WebSocket/SSE for real-time updates** — The UI currently polls. Real-time push is a future enhancement.
- **Authentication** — PROJECT_STATUS.md notes this is needed. It's a separate workstream.
- **Server monitoring pages** (`/server`, `/server/[id]`, `/usage`) — These are in the UX spec but are a separate product feature, not part of the agent orchestration core.
- **Drag-and-drop kanban** — Nice to have but not required for agent workflow (agents dispatch via API, not drag-and-drop).
- **Prisma schema additions** — Gate completions and deployment records should eventually be persisted in the database. For now, the in-memory services work for single-instance deployments.
