# SPEC: Add Revision Loop with Comments (Accept or Send Back)

**Story ID:** 2d556127-ce8b-403c-aae7-dd4ee970e558  
**Gate:** architect  
**Created:** 2026-03-09  
**Architect:** MC2-architect

---

## 1. Overview

Enhance the existing revision loop feature to support comment threading and proper downstream gate clearing when revisions are requested.

### Current State (Verified)
- ✅ `StoryComment` model exists (flat comments, no threading)
- ✅ `StoryRevision` model exists with `commentId` field
- ✅ API endpoints: `/api/v1/stories/[id]/comments` (GET, POST), `/api/v1/stories/[id]/revisions` (GET, POST)
- ✅ UI components: `RevisionActions`, `StoryComments`, `RevisionHistory`
- ✅ Service functions: `addCommentToStory`, `getCommentsForStory`, `createRevision`, `requestRevision`, `acceptFinalStory`

### Delta Required
1. **Comment threading** - Add `parentId` to `StoryComment` for reply support
2. **Downstream gate clearing** - When requesting revisions, clear ALL gates after target
3. **Accept status** - Change `acceptFinalStory` from `archived` to new `accepted` status

---

## 2. Database Changes

### 2.1 StoryComment Model - Add Threading

```prisma
model StoryComment {
  id        String   @id @default(uuid())
  storyId   String   @map("story_id")
  author    String   @default("user")
  content   String
  
  // NEW: Threading support
  parentId  String?  @map("parent_id")
  
  // Relations
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  parent    StoryComment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies   StoryComment[] @relation("CommentReplies")
  revisions StoryRevision[]
  
  createdAt DateTime @default(now()) @map("created_at")

  @@map("story_comments")
  @@index([storyId])
  @@index([parentId])  // NEW
}
```

### 2.2 Story Status - Add Accepted

```typescript
// src/domain/story.ts
export const STORY_STATUSES = [
  "draft", 
  "pending_approval", 
  "approved", 
  "active", 
  "completed", 
  "accepted",  // NEW - final accepted state
  "archived", 
  "blocked"
] as const;
```

---

## 3. Service Layer Changes

### 3.1 Enhanced Comment Functions

```typescript
// src/services/story-store-db.ts

// Update addCommentToStory to support parentId
export async function addCommentToStory(
  storyId: string,
  content: string,
  author: string = 'user',
  parentId?: string  // NEW parameter
): Promise<StoryComment>

// Update getCommentsForStory to return threaded structure
export async function getCommentsForStory(
  storyId: string
): Promise<StoryComment[]>  // Return flat list with parentId, UI handles threading
```

### 3.2 Enhanced requestRevision - Clear Downstream Gates

```typescript
// src/services/story-store-db.ts

// Update requestRevision to clear downstream gates
export async function requestRevision(
  storyId: string,
  targetGate: string = 'implementer',
  description?: string,
  commentId?: string  // Already supported
): Promise<Story | null> {
  // Existing: Create revision record
  // Existing: Update story status to 'active'
  // Existing: Reset target gate to 'pending'
  
  // NEW: Clear ALL downstream gates (gates after targetGate in pipeline)
  const gateOrder = ['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'];
  const targetIndex = gateOrder.indexOf(targetGate);
  const downstreamGates = gateOrder.slice(targetIndex + 1);
  
  // For each downstream gate, reset status to 'pending', clear completedAt/completedBy
  await prisma.storyGate.updateMany({
    where: { storyId, gate: { in: downstreamGates } },
    data: { status: 'pending', completedAt: null, completedBy: null }
  });
}
```

### 3.3 Enhanced acceptFinalStory - Use Accepted Status

```typescript
// src/services/story-store-db.ts

// Update acceptFinalStory to use 'accepted' instead of 'archived'
export async function acceptFinalStory(storyId: string): Promise<Story | null> {
  // Change: status: 'archived' → status: 'accepted'
  const story = await prisma.story.update({
    where: { id: storyId },
    data: { status: 'accepted' },  // CHANGED from 'archived'
    include: { gates: true },
  });
  
  await createRevision(storyId, 'accept_final');
  return mapPrismaToDomain(story);
}
```

---

## 4. API Changes

### 4.1 Comments API - Add ParentId Support

```typescript
// POST /api/v1/stories/[id]/comments
// Request body:
{
  content: string;
  author?: string;
  parentId?: string;  // NEW - for replies
}

// Response (StoryComment):
{
  id: string;
  storyId: string;
  author: string;
  content: string;
  parentId?: string;  // NEW
  createdAt: string;
}
```

### 4.2 Revisions API - Already Supports commentId

```typescript
// POST /api/v1/stories/[id]/revisions
// Request body (existing):
{
  action: 'request_revision';
  targetGate: string;
  description?: string;
  commentId?: string;  // Already supported
}
```

---

## 5. Frontend Changes

### 5.1 StoryComments Component - Add Threading UI

**File:** `src/components/story-comments.tsx`

- Add reply button to each comment
- Show threaded replies with indentation
- Support `parentId` in comment submission
- Max nesting depth: 3 levels

### 5.2 Story Detail Page - Add Accepted Status Chip

**File:** `src/app/stories/[id]/page.tsx`

```typescript
const statusChipColors: Record<string, { bg: string; color: string }> = {
  // ... existing
  accepted: { bg: '#dcfce7', color: '#166534' },  // NEW
};
```

### 5.3 RevisionActions Component - Link to Comments

**File:** `src/components/revision-actions.tsx`

- Optional: Allow linking revision request to existing comment
- Pass `commentId` to revision request API

---

## 6. Migration

```bash
# Generate migration for StoryComment.parentId
npx prisma migrate dev --name add_comment_threading
```

---

## 7. Acceptance Criteria

- [ ] **AC-1:** User can add threaded comments (reply to existing comments via `parentId`)
- [ ] **AC-2:** Comments display with threaded indentation (max 3 levels)
- [ ] **AC-3:** Requesting revisions clears all downstream gates after target
- [ ] **AC-4:** Accepting final sets status to `accepted` (not `archived`)
- [ ] **AC-5:** `accepted` status displays with green chip styling
- [ ] **AC-6:** Existing flat comments remain functional (backward compatibility)

---

## 8. Definition of Done

1. Database migration applied (`StoryComment.parentId`)
2. Service functions updated (`addCommentToStory`, `requestRevision`, `acceptFinalStory`)
3. API endpoints support `parentId` parameter
4. Frontend shows threaded comments
5. Downstream gates clear on revision request
6. All acceptance criteria verified

---

## 9. Handoff to Implementer

**Next Gate:** implementer

**Files to Modify:**
1. `prisma/schema.prisma` - Add `parentId` field to `StoryComment`
2. `src/services/story-store-db.ts` - Update comment/revision functions
3. `src/domain/story.ts` - Add `accepted` to `STORY_STATUSES`
4. `src/app/api/v1/stories/[id]/comments/route.ts` - Support `parentId`
5. `src/components/story-comments.tsx` - Threading UI
6. `src/app/stories/[id]/page.tsx` - Add `accepted` status chip

**Notes:**
- Ensure backward compatibility for existing comments (no parentId)
- Use Prisma self-referential relation for threading
- Gate order for downstream clearing: `['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b']`
