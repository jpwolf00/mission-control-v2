# Architect Completion Report: Revision Loop Finalization

**Story ID:** 639fe85b-c964-4c5d-9b1d-e281e1552cff  
**Gate:** architect  
**Session ID:** fff4d02a-7c82-444f-acb2-178142f01fcb  
**Completed:** 2026-03-09  
**Architect:** MC2-architect

---

## Summary

Architectural analysis complete for the "Add revision loop with comments (accept or send back)" story. The core revision loop infrastructure is already implemented in Mission Control v2. This work identified 3 gaps that need to be addressed by the implementer.

---

## Current Implementation Status

### ✅ Already Complete (No Work Required)

| Component | Location | Status |
|-----------|----------|--------|
| Database Schema | `prisma/schema.prisma` | `StoryComment`, `StoryRevision` models exist |
| Domain Types | `src/domain/story.ts` | Interfaces defined |
| Comments API | `src/app/api/v1/stories/[id]/comments/route.ts` | GET + POST endpoints working |
| Revisions API | `src/app/api/v1/stories/[id]/revisions/route.ts` | GET + POST endpoints working |
| Comment Service | `src/services/story-store-db.ts` | `addCommentToStory`, `getCommentsForStory` |
| Revision Service | `src/services/story-store-db.ts` | `createRevision`, `getRevisionsForStory`, `acceptFinalStory`, `requestRevision` |
| Story Comments UI | `src/components/story-comments.tsx` | Full comment thread UI |
| Revision History UI | `src/components/revision-history.tsx` | Revision history display |
| Revision Actions UI | `src/components/revision-actions.tsx` | Accept Final / Request Revisions buttons |
| Story Detail Integration | `src/app/stories/[id]/page.tsx` | All components integrated |

---

## ⚠️ Gaps Identified (Implementer Work)

### Gap 1: Downstream Gate Clearing (CRITICAL)

**File:** `src/services/story-store-db.ts`  
**Function:** `requestRevision`

**Current Behavior:** Only the target gate is reset to `pending`.

**Required Behavior:** Target gate AND all downstream gates should be cleared.

**Implementation:**
```typescript
const gateOrder = ['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'];
const targetIndex = gateOrder.indexOf(targetGate);
const gatesToReset = gateOrder.slice(targetIndex);

for (const gate of gatesToReset) {
  await prisma.storyGate.upsert({
    where: { storyId_gate: { storyId, gate } },
    update: {
      status: 'pending',
      completedAt: null,
      completedBy: null,
      pickedUpAt: null,
      finalMessage: null,
      artifacts: null,
    },
    create: { id: uuidv4(), storyId, gate, status: 'pending' },
  });
}
```

---

### Gap 2: Auto-Dispatch After Revision (CRITICAL)

**File:** `src/app/api/v1/stories/[id]/revisions/route.ts`

**Current Behavior:** Story status changes to `active`, but user must manually dispatch.

**Required Behavior:** Auto-dispatch to target gate after successful revision request.

**Implementation:**
```typescript
import { dispatchStory } from '@/services/dispatch-service';
import { v4 as uuidv4 } from 'uuid';

// After successful requestRevision:
const idempotencyKey = `revision-${storyId}-${Date.now()}-${uuidv4().slice(0, 8)}`;
const dispatchResult = await dispatchStory(storyId, gate, idempotencyKey);
```

---

### Gap 3: Status Validation (Minor)

**File:** `src/app/api/v1/stories/[id]/revisions/route.ts`

**Current Behavior:** No validation on story status.

**Required Behavior:** Only allow revision requests when story status is `completed`.

**Implementation:**
```typescript
const story = await getStoryByIdFromDB(storyId);
if (!story || story.status !== 'completed') {
  return NextResponse.json(
    { error: 'Revisions can only be requested for completed stories' },
    { status: 422 }
  );
}
```

---

## Deliverables

1. **SPEC-639fe85b-revision-loop-finalize.md** - Full specification with implementation details
2. **ARCHITECT-COMPLETE-639fe85b.md** - This completion report

---

## Handoff to Implementer

**Next Gate:** implementer

**Files to Modify:**
1. `src/services/story-store-db.ts` - Update `requestRevision` function
2. `src/app/api/v1/stories/[id]/revisions/route.ts` - Add validation and auto-dispatch

**Testing Checklist:**
- [ ] Add comments to completed stories
- [ ] Request revision to `implementer` - verify downstream gates cleared
- [ ] Verify auto-dispatch creates new session
- [ ] Verify status validation rejects non-completed stories
- [ ] Accept final - verify story archived

---

## Evidence

- Specification document: `specs/SPEC-639fe85b-revision-loop-finalize.md`
- Completion report: `specs/ARCHITECT-COMPLETE-639fe85b.md`
- Analysis of existing codebase confirming implementation status
- Gap identification with specific code changes required
