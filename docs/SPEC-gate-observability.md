# MC2-ARCH-SPEC: Gate Pipeline Observability

**Story ID:** aa9201cd-745b-4ba6-a1cb-2bd14f602343  
**Gate:** architect  
**Created:** 2026-03-09

---

## Problem Statement

The current Mission Control gate pipeline lacks detailed run telemetry and artifact visibility. Users cannot see:

1. When each gate was picked up (started)
2. When each gate completed
3. The final agent message/summary from each gate
4. Visual evidence (screenshots) from reviewer/validate gates

This limits debugging ability and reduces visibility into gate execution quality.

---

## Current State Analysis

### Existing Data Model

| Model | Fields | Purpose |
|-------|--------|---------|
| `StoryGate` | `gate`, `status`, `evidence` (JSON), `completedAt`, `completedBy` | Gate completion record |
| `RunSession` | `startedAt`, `endedAt`, `status` | Session timing |
| `AgentSession` | `startedAt`, `endedAt`, `metadata` | Agent-level tracking |

### Gap Analysis

| Required Field | Current Availability | Location |
|----------------|---------------------|----------|
| Pickup timestamp | ✅ Exists | `RunSession.startedAt` |
| Completion timestamp | ✅ Exists | `StoryGate.completedAt` |
| Final agent message | ❌ Missing | N/A |
| Screenshot artifacts | ❌ Missing | N/A |

---

## Technical Design

### 1. Database Schema Changes

Add new fields to `StoryGate` model:

```prisma
model StoryGate {
  // ... existing fields
  pickedUpAt     DateTime?  @map("picked_up_at")      // When gate was dispatched/picked up
  finalMessage   String?    @map("final_message")    // Final agent output/summary
  artifacts      Json?      // Screenshot URLs, links, metadata
}
```

**Migration:** Add nullable columns to existing `story_gates` table.

### 2. Callback API Changes

Extend `/api/v1/agents/callback` to accept new fields in `completed` event:

```typescript
interface CallbackBody {
  // ... existing fields
  pickedUpAt?: number;        // Unix timestamp (optional, for backfill)
  finalMessage?: string;      // Agent's final summary output
  artifacts?: {               // Screenshot/evidence artifacts
    type: 'screenshot' | 'log' | 'link';
    url: string;
    description?: string;
    timestamp: number;
  }[];
}
```

**Validation:**
- `pickedUpAt`: If not provided, fallback to `RunSession.startedAt`
- `finalMessage`: Max 10,000 characters
- `artifacts`: Max 10 items per gate

### 3. Service Layer Changes

Update `saveGateCompletion` in `story-store-db.ts`:

```typescript
interface SaveGateCompletionInput {
  storyId: string;
  gate: string;
  status: string;
  evidence?: unknown[];
  completedBy?: string;
  pickedUpAt?: Date;    // NEW
  finalMessage?: string; // NEW
  artifacts?: unknown[]; // NEW
}
```

### 4. API Response Changes

Update `GET /api/v1/stories/[id]` to include gate details:

```typescript
interface StoryGateInfo {
  gate: string;
  status: string;
  pickedUpAt?: string | null;   // ISO timestamp
  completedAt?: string | null;  // ISO timestamp
  completedBy?: string | null;
  finalMessage?: string | null;
  artifacts?: {
    type: string;
    url: string;
    description?: string;
  }[];
}
```

### 5. UI Changes

#### A. Gate Details Panel (New Component)

Create `src/components/gate-details.tsx` that shows:

- **Header:** Gate name + status badge
- **Timing:** Pickup time → Completion time (duration calculated)
- **Summary:** Final agent message (collapsible if > 200 chars)
- **Artifacts:** Grid of screenshot thumbnails (for reviewer/validate gates)

#### B. Update Story Detail Page

Add expandable gate details below the GateTimeline:

```
┌─────────────────────────────────────────────────────┐
│  Gate Pipeline                                       │
│  [Design] → [UX] → [Build] → [Review] → [Deploy] → [Validate] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ▼ Gate Details                                      │
│                                                      │
│  ✓ architect (completed)                            │
│    Pickup: Mar 9, 9:21 AM → Completed: 9:35 AM     │
│    Duration: 14 min                                 │
│    Summary: "SPEC.md created with 4 acceptance..."  │
│                                                      │
│  ● reviewer-a (in progress)                         │
│    Pickup: Mar 9, 9:36 AM                          │
│    In progress...                                   │
└─────────────────────────────────────────────────────┘
```

#### C. Pipeline View Enhancement

Update main dashboard pipeline to show timestamps on hover:

```
Story: Feature X
[✓ Design 9:21] [✓ UX 9:35] [● Build 9:36▌] [○ Review] [○ Deploy] [○ Validate]
```

---

## Implementation Phases

### Phase 1: Backend (Architect → Implementer)

1. **Database migration** - Add new columns to StoryGate
2. **Callback update** - Accept new fields, persist to DB
3. **API response update** - Return new fields in story detail

### Phase 2: UI Components (Implementer)

4. **GateDetails component** - Create reusable component
5. **Story detail page integration** - Add below timeline
6. **Pipeline view enhancement** - Show timestamps

### Phase 3: Testing (Reviewer)

7. **Unit tests** - Service layer validation
8. **Integration tests** - Callback persistence
9. **UI tests** - Component rendering

---

## Acceptance Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Each gate shows pickup timestamp | Dispatch story, verify `pickedUpAt` populated |
| 2 | Each gate shows completion timestamp | Complete gate, verify `completedAt` populated |
| 3 | Each gate shows final agent message | Complete gate with `finalMessage`, verify in API |
| 4 | Reviewer gates show screenshot artifacts | Complete reviewer-a with screenshot, verify display |
| 5 | Data persists across page refreshes | Reload story detail, verify data intact |
| 6 | Pipeline view renders timestamps | View story in pipeline, hover for times |

---

## Dependencies

- **Prisma migration** - Must run before API changes
- **Story store DB** - Requires update to handle new fields
- **Existing evidence system** - Complements, does not replace

---

## Out of Scope

- Real-time updates (use polling or websockets in future story)
- Gate comparison analytics
- Export/csv download
- Slack/email notifications on gate completion

---

## File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add fields to StoryGate |
| `src/app/api/v1/agents/callback/route.ts` | Accept new fields |
| `src/services/story-store-db.ts` | Persist new fields |
| `src/app/api/v1/stories/[id]/route.ts` | Return new fields |
| `src/components/gate-details.tsx` | NEW - Gate details UI |
| `src/app/stories/[id]/page.tsx` | Integrate gate details |
| `src/app/page.tsx` | Update pipeline view |
