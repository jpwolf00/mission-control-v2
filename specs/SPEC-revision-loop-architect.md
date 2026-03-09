# SPEC: Revision Loop - Comments + Send-Back Flow

**Story ID:** 4a04c0d7-b8b5-4faa-be9b-832262330d38  
**Gate:** architect  
**Created:** 2026-03-09  
**Architect:** MC2-architect

---

## 1. Overview

This story adds user comment/revision workflow to Mission Control, enabling completed stories to receive feedback and be sent back for revisions without creating new stories.

### Goals
- Allow users to add comments on completed/reviewed stories
- Provide "Accept Final" or "Request Revisions" actions
- Route "Request Revisions" back to the appropriate gate (default: implementer)
- Preserve revision history on the same story

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

### ⚠️ Partially Implemented / Needs Review

| Component | Status | Notes |
|-----------|--------|-------|
| Downstream Gate Clearing | ⚠️ Missing | When requesting revision to a gate, downstream gates should be cleared |
| Auto-Dispatch After Revision | ⚠️ Missing | After requesting revision, should auto-dispatch to target gate |
| Status Validation | ⚠️ Incomplete | Should validate story is `completed` before allowing revision actions |
| Revision Numbering | ⚠️ Missing | No revision number tracking in current implementation |

---

## 3. Data Model

### 3.1 Database Schema (Already Exists)

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

### 3.2 Domain Types (Already Exists)

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

## 4. API Design (Already Implemented)

### 4.1 Comments API

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

### 4.2 Revisions API

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
  story: Story 
}
```

---

## 5. Frontend UI (Already Implemented)

### 5.1 Components

| Component | File | Purpose |
|-----------|------|---------|
| `StoryComments` | `src/components/story-comments.tsx` | Comment thread with add functionality |
| `RevisionHistory` | `src/components/revision-history.tsx` | Display revision history with icons |
| `RevisionActions` | `src/components/revision-actions.tsx` | Accept Final / Request Revisions buttons |

### 5.2 Story Detail Page Integration

```tsx
// In src/app/stories/[id]/page.tsx
{(story.status === 'completed' || story.status === 'active') && (
  <RevisionActions
    storyId={storyId}
    currentGate={story.currentGate}
    onRevisionRequested={() => {
      setRefreshTrigger((prev) => prev + 1);
      fetchStory();
    }}
  />
)}

<RevisionHistory storyId={storyId} refreshTrigger={refreshTrigger} />
<StoryComments storyId={storyId} refreshTrigger={refreshTrigger} onCommentAdded={...} />
```

---

## 6. Service Layer Implementation (Already Exists)

### 6.1 Key Functions in `src/services/story-store-db.ts`

```typescript
// Add a comment to a story
export async function addCommentToStory(
  storyId: string,
  content: string,
  author: string = 'user'
): Promise<StoryComment>

// Get all comments for a story
export async function getCommentsForStory(storyId: string): Promise<StoryComment[]>

// Create a revision record
export async function createRevision(
  storyId: string,
  revisionType: 'accept_final' | 'request_revision',
  options?: {
    targetGate?: string;
    commentId?: string;
    description?: string;
    createdBy?: string;
  }
): Promise<StoryRevision>

// Get all revisions for a story
export async function getRevisionsForStory(storyId: string): Promise<StoryRevision[]>

// Mark story as accepted final
export async function acceptFinalStory(storyId: string): Promise<Story | null>

// Request revisions for a story
export async function requestRevision(
  storyId: string,
  targetGate: string = 'implementer',
  description?: string
): Promise<Story | null>
```

---

## 7. Identified Gaps & Recommendations

### Gap 1: Downstream Gate Clearing

**Current Behavior:** When requesting revision to a gate, only that gate is reset to `pending`.

**Expected Behavior:** All gates downstream from the target gate should also be cleared.

**Fix Required in `requestRevision`:**
```typescript
// After resetting target gate, clear all downstream gates
const gateOrder = ['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'];
const targetIndex = gateOrder.indexOf(targetGate);

for (let i = targetIndex + 1; i < gateOrder.length; i++) {
  await prisma.storyGate.updateMany({
    where: { storyId, gate: gateOrder[i] },
    data: { 
      status: 'pending',
      completedAt: null,
      completedBy: null,
    },
  });
}
```

### Gap 2: Status Validation

**Current Behavior:** API accepts revision requests for any story status.

**Expected Behavior:** Should only allow revision actions when story status is `completed`.

**Fix Required in API route:**
```typescript
// In POST handler for /api/v1/stories/[id]/revisions
const story = await getStoryByIdFromDB(storyId);
if (!story || story.status !== 'completed') {
  return NextResponse.json(
    { error: 'Revisions can only be requested for completed stories' },
    { status: 422 }
  );
}
```

### Gap 3: Auto-Dispatch After Revision

**Current Behavior:** Story status changes to `active`, but user must manually dispatch.

**Expected Behavior:** After requesting revision, story should be automatically dispatched to the target gate.

**Fix Required:** Call dispatch service after successful revision request.

### Gap 4: Revision Numbering

**Current Behavior:** No revision number tracking.

**Expected Behavior:** Each revision cycle should have an incrementing revision number.

**Fix Required:** Add `revisionNumber` field to `StoryRevision` model and compute on creation.

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
- [ ] **AC-10:** Revision numbering tracks multiple cycles

---

## 9. Definition of Done

1. ✅ Backend API endpoints implemented
2. ✅ Frontend UI implemented with all actions
3. ✅ Revision history properly preserved
4. ⚠️ Downstream gate clearing implemented
5. ⚠️ Status validation enforced
6. ✅ All acceptance criteria verified
7. ✅ No console errors
8. ✅ Works on both desktop and mobile layouts

---

## 10. Handoff to Implementer

**Next Gate:** implementer

**Deliverables:**
- This SPEC.md
- Gap fixes for downstream gate clearing
- Gap fixes for status validation
- Optional: Auto-dispatch after revision
- Optional: Revision numbering

**Notes for Implementer:**
- The core feature is already implemented and functional
- Focus on the gaps identified in Section 7
- Test with existing completed story
- Ensure gate clearing logic handles all gate types correctly
- Consider edge cases: requesting revision to already-pending gate, etc.
