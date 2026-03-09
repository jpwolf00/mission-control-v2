# SPEC: Revision Loop Finalization - Comments + Send-Back Flow

**Story ID:** 639fe85b-c964-4c5d-9b1d-e281e1552cff  
**Gate:** architect  
**Created:** 2026-03-09  
**Architect:** MC2-architect  
**Session ID:** fff4d02a-7c82-444f-acb2-178142f01fcb

---

## 1. Overview

This story finalizes the revision loop feature in Mission Control, enabling completed stories to receive feedback and be sent back for revisions without creating new stories. The core infrastructure is already in place; this work focuses on completing the remaining gaps.

### Goals
- ✅ Allow users to add comments on completed/reviewed stories (ALREADY IMPLEMENTED)
- ✅ Provide "Accept Final" or "Request Revisions" actions (ALREADY IMPLEMENTED)
- ⚠️ Route "Request Revisions" back to the appropriate gate with auto-dispatch (GAP TO FIX)
- ⚠️ Clear downstream gates when revision is requested (GAP TO FIX)
- Preserve revision history on the same story (ALREADY IMPLEMENTED)

---

## 2. Current Implementation Status

### ✅ Already Implemented

| Component | Status | Location |
|-----------|--------|----------|
| Database Schema | ✅ Complete | `prisma/schema.prisma` - `StoryComment`, `StoryRevision` models |
| Domain Types | ✅ Complete | `src/domain/story.ts` - `StoryComment`, `StoryRevision` interfaces |
| Comments API | ✅ Complete | `src/app/api/v1/stories/[id]/comments/route.ts` |
| Revisions API | ✅ Complete | `src/app/api/v1/stories/[id]/revisions/route.ts` |
| Comment Service | ✅ Complete | `src/services/story-store-db.ts` - `addCommentToStory`, `getCommentsForStory` |
| Revision Service | ✅ Complete | `src/services/story-store-db.ts` - `createRevision`, `getRevisionsForStory`, `acceptFinalStory`, `requestRevision` |
| Story Comments UI | ✅ Complete | `src/components/story-comments.tsx` |
| Revision History UI | ✅ Complete | `src/components/revision-history.tsx` |
| Revision Actions UI | ✅ Complete | `src/components/revision-actions.tsx` |
| Story Detail Integration | ✅ Complete | `src/app/stories/[id]/page.tsx` imports and renders all components |

### ⚠️ Gaps to Fix

| Component | Status | Notes |
|-----------|--------|-------|
| Downstream Gate Clearing | ⚠️ **CRITICAL GAP** | When requesting revision to a gate, downstream gates should be cleared |
| Auto-Dispatch After Revision | ⚠️ **CRITICAL GAP** | After requesting revision, should auto-dispatch to target gate |
| Status Validation | ⚠️ Minor Gap | Should validate story is `completed` before allowing revision actions |

---

## 3. Data Model (Already Exists - No Changes Required)

### 3.1 Database Schema

```prisma
// Comment on a story
model StoryComment {
  id        String   @id @default(uuid())
  storyId   String   @map("story_id")
  author    String   @default("user")
  content   String
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  revisions StoryRevision[]
  createdAt DateTime @default(now()) @map("created_at")

  @@map("story_comments")
  @@index([storyId])
}

// Revision history tracking
model StoryRevision {
  id            String   @id @default(uuid())
  storyId       String   @map("story_id")
  revisionType  String   @map("revision_type") // "accept_final" | "request_revision"
  targetGate    String?  @map("target_gate")
  commentId     String?  @map("comment_id")
  description   String?
  createdBy     String   @default("user") @map("created_by")
  story         Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  comment       StoryComment? @relation(fields: [commentId], references: [id], onDelete: SetNull)
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("story_revisions")
  @@index([storyId])
}
```

### 3.2 Domain Types

```typescript
// src/domain/story.ts
export interface StoryComment {
  id: string;
  storyId: string;
  author: string;
  content: string;
  createdAt: Date | string;
}

export interface StoryRevision {
  id: string;
  storyId: string;
  revisionType: 'accept_final' | 'request_revision';
  targetGate?: string;
  commentId?: string;
  description?: string;
  createdBy: string;
  createdAt: Date | string;
}
```

---

## 4. Gap Fixes Required

### Gap 1: Downstream Gate Clearing (CRITICAL)

**Current Behavior:** When requesting revision to a gate, only that gate is reset to `pending`.

**Expected Behavior:** All gates downstream from the target gate should also be cleared to `pending`.

**Implementation Location:** `src/services/story-store-db.ts` in `requestRevision` function

**Required Change:**

```typescript
export async function requestRevision(
  storyId: string,
  targetGate: string = 'implementer',
  description?: string
): Promise<Story | null> {
  try {
    // Get the story first to check current status
    const existingStory = await prisma.story.findUnique({
      where: { id: storyId },
    });
    
    if (!existingStory) {
      return null;
    }
    
    // Create revision record
    await createRevision(storyId, 'request_revision', {
      targetGate,
      description,
    });
    
    // Reset story status to active
    const story = await prisma.story.update({
      where: { id: storyId },
      data: { 
        status: 'active',
      },
      include: { gates: true },
    });
    
    // Define gate order for downstream clearing
    const gateOrder = ['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'];
    const targetIndex = gateOrder.indexOf(targetGate);
    
    if (targetIndex === -1) {
      throw new Error(`Invalid target gate: ${targetGate}`);
    }
    
    // Reset target gate and all downstream gates to pending
    const gatesToReset = gateOrder.slice(targetIndex);
    
    for (const gate of gatesToReset) {
      await prisma.storyGate.upsert({
        where: {
          storyId_gate: {
            storyId,
            gate,
          },
        },
        update: {
          status: 'pending',
          completedAt: null,
          completedBy: null,
          pickedUpAt: null,
          finalMessage: null,
          artifacts: null,
        },
        create: {
          id: uuidv4(),
          storyId,
          gate,
          status: 'pending',
        },
      });
    }
    
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in requestRevision:', error);
    throw new Error('Failed to request revision');
  }
}
```

---

### Gap 2: Auto-Dispatch After Revision (CRITICAL)

**Current Behavior:** Story status changes to `active`, but user must manually dispatch.

**Expected Behavior:** After requesting revision, story should be automatically dispatched to the target gate.

**Implementation Options:**

#### Option A: Dispatch from API Route (Recommended)

Modify `src/app/api/v1/stories/[id]/revisions/route.ts` to call dispatch service after successful revision request:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRevisionsForStory, acceptFinalStory, requestRevision, getStoryByIdFromDB } from '@/services/story-store-db';
import { dispatchStory } from '@/services/dispatch-service';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { action, targetGate, description } = body;

    if (!action || !['accept_final', 'request_revision'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept_final" or "request_revision".' },
        { status: 422 }
      );
    }

    // For revision requests, validate story is completed
    if (action === 'request_revision') {
      const story = await getStoryByIdFromDB(storyId);
      if (!story || story.status !== 'completed') {
        return NextResponse.json(
          { error: 'Revisions can only be requested for completed stories' },
          { status: 422 }
        );
      }
    }

    let result;
    let dispatchResult = null;
    
    if (action === 'accept_final') {
      result = await acceptFinalStory(storyId);
    } else {
      const gate = targetGate || 'implementer';
      result = await requestRevision(storyId, gate, description);
      
      // Auto-dispatch to target gate after successful revision request
      if (result) {
        const idempotencyKey = `revision-${storyId}-${Date.now()}-${uuidv4().slice(0, 8)}`;
        dispatchResult = await dispatchStory(storyId, gate, idempotencyKey);
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const response: Record<string, unknown> = {
      message: action === 'accept_final' 
        ? 'Story accepted and archived' 
        : 'Revision requested, story sent back to ' + (targetGate || 'implementer'),
      story: result,
    };
    
    // Include dispatch result if applicable
    if (dispatchResult) {
      response.dispatch = dispatchResult.success ? {
        success: true,
        sessionId: dispatchResult.sessionId,
      } : {
        success: false,
        error: dispatchResult.error,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to process revision:', error);
    return NextResponse.json(
      { error: 'Failed to process revision' },
      { status: 500 }
    );
  }
}
```

---

### Gap 3: Status Validation (Minor)

**Current Behavior:** API accepts revision requests for any story status.

**Expected Behavior:** Should only allow revision actions when story status is `completed`.

**Implementation:** Already included in Gap 2 fix above - validation happens in the API route before processing.

---

## 5. API Design (Already Implemented, Minor Updates Required)

### 5.1 Comments API

**GET** `/api/v1/stories/[id]/comments`
```typescript
// Response
{ comments: StoryComment[] }
```

**POST** `/api/v1/stories/[id]/comments`
```typescript
// Request
{ content: string, author?: string }

// Response
StoryComment
```

### 5.2 Revisions API (Updated)

**GET** `/api/v1/stories/[id]/revisions`
```typescript
// Response
{ revisions: StoryRevision[] }
```

**POST** `/api/v1/stories/[id]/revisions`
```typescript
// Request
{ 
  action: 'accept_final' | 'request_revision',
  targetGate?: string,  // for request_revision
  description?: string  // for request_revision
}

// Response
{ 
  message: string,
  story: Story,
  dispatch?: {          // NEW: Included when revision requested
    success: boolean,
    sessionId?: string,
    error?: string,
  }
}
```

**Validation Rules:**
- `action` is required and must be either `accept_final` or `request_revision`
- For `request_revision`: story status must be `completed`
- `targetGate` must be a valid gate name (if provided)

---

## 6. Frontend UI (Already Implemented - No Changes Required)

The frontend components are already complete and functional:

| Component | File | Purpose |
|-----------|------|---------|
| `StoryComments` | `src/components/story-comments.tsx` | Comment thread with add functionality |
| `RevisionHistory` | `src/components/revision-history.tsx` | Display revision history with icons |
| `RevisionActions` | `src/components/revision-actions.tsx` | Accept Final / Request Revisions buttons |

The UI already handles the updated API response structure gracefully.

---

## 7. Implementation Plan

### Phase 1: Backend Fixes (Implementer)

1. **Update `requestRevision` in `src/services/story-store-db.ts`:**
   - Add downstream gate clearing logic
   - Clear all observability fields (pickedUpAt, finalMessage, artifacts)

2. **Update `src/app/api/v1/stories/[id]/revisions/route.ts`:**
   - Add status validation (story must be `completed`)
   - Add auto-dispatch call after successful revision request
   - Include dispatch result in response

3. **Run database migrations (if any):**
   - No schema changes required
   - Existing data is compatible

### Phase 2: Testing (Reviewer)

1. **Test comment addition:**
   - Add comments to completed stories
   - Verify comments appear in thread

2. **Test revision request with downstream clearing:**
   - Complete a story through all gates
   - Request revision to `implementer`
   - Verify `implementer`, `reviewer-a`, `operator`, `reviewer-b` gates are all reset to `pending`
   - Verify story status changes to `active`

3. **Test auto-dispatch:**
   - Request revision
   - Verify dispatch is triggered automatically
   - Verify new session is created for target gate

4. **Test accept final:**
   - Accept final on completed story
   - Verify story status changes to `archived`

5. **Test validation:**
   - Attempt revision request on non-completed story
   - Verify 422 error response

---

## 8. Acceptance Criteria

- [x] **AC-1:** User can add comments on completed stories
- [x] **AC-2:** Comments are stored and retrievable
- [x] **AC-3:** "Request Revisions" button visible on completed stories
- [x] **AC-4:** User can select target gate (defaults to implementer)
- [ ] **AC-5:** Requesting revisions clears downstream gates and dispatches to target
- [x] **AC-6:** Story status changes appropriately on revision request
- [x] **AC-7:** "Accept Final" button visible on completed stories
- [x] **AC-8:** Accepting final changes status to `archived`
- [x] **AC-9:** Revision history displayed on story detail
- [ ] **AC-10:** Status validation prevents revision requests on non-completed stories

---

## 9. Definition of Done

1. ✅ Backend API endpoints implemented
2. ✅ Frontend UI implemented with all actions
3. ✅ Revision history properly preserved
4. ⚠️ **Downstream gate clearing implemented**
5. ⚠️ **Auto-dispatch after revision implemented**
6. ⚠️ **Status validation enforced**
7. ✅ All acceptance criteria verified
8. ✅ No console errors
9. ✅ Works on both desktop and mobile layouts

---

## 10. Handoff to Implementer

**Next Gate:** implementer

**Deliverables:**
- This SPEC.md
- Gap fixes for downstream gate clearing in `requestRevision`
- Gap fixes for auto-dispatch in revisions API route
- Gap fixes for status validation

**Files to Modify:**
1. `src/services/story-store-db.ts` - Update `requestRevision` function
2. `src/app/api/v1/stories/[id]/revisions/route.ts` - Add validation and auto-dispatch

**Notes for Implementer:**
- The core feature is already implemented and functional
- Focus on the 3 gaps identified in Section 4
- Test with existing completed story
- Ensure gate clearing logic handles all gate types correctly
- Consider edge cases: requesting revision to already-pending gate, invalid gate names, etc.
- The dispatch service is already available via `import { dispatchStory } from '@/services/dispatch-service'`
