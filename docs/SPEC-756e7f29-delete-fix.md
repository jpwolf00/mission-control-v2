# SPEC - Fix archive/delete story actions (reviewer-a bugfix)

## Story ID
756e7f29-22e4-4119-9e76-39120067022e

## Problem Statement
Reviewer-a found that the Delete button in the UI calls the wrong endpoint:
- **Current (wrong):** `POST /api/v1/stories/:id/delete`
- **Expected (correct):** `DELETE /api/v1/stories/:id`

The Archive action should continue to work (likely via PATCH with action: 'archive').

## Root Cause
The `/api/v1/stories/[id]/route.ts` API route only implements GET and PATCH methods. There is no DELETE handler. The frontend may be calling a non-existent `/delete` sub-route or the wrong HTTP method.

## Solution

### 1. Add DELETE endpoint to API
File: `src/app/api/v1/stories/[id]/route.ts`
- Add DELETE method handler that calls the new `deleteStoryFromDB` service function
- Returns 204 No Content on success
- Returns 404 if story not found

### 2. Add deleteStoryFromDB service function
File: `src/services/story-store-db.ts`
- Add `deleteStoryFromDB(id: string): Promise<boolean>` function
- Uses Prisma to delete the story by ID
- Returns true if deleted, false if not found
- Handles errors gracefully

### 3. Archive action
Verify that archive functionality works via PATCH:
- PATCH `/api/v1/stories/:id` with `{ action: 'archive' }` should set status to 'archived'
- This should already work via the existing `updateStoryStatus` function

### 4. UI verification
- Verify the UI calls DELETE /api/v1/stories/:id (not POST /api/v1/stories/:id/delete)
- If delete button doesn't exist in UI, add it to story detail page

## Files to Modify

1. `src/app/api/v1/stories/[id]/route.ts` - Add DELETE method
2. `src/services/story-store-db.ts` - Add deleteStoryFromDB function

## Acceptance Criteria

- [ ] Delete action calls DELETE /api/v1/stories/:id
- [ ] Archive action still works (PATCH with action: archive sets status to archived)
- [ ] Reviewer-a passes after fix
- [ ] Unit tests pass for new DELETE endpoint
- [ ] Regression check: verify other story operations still work

## Testing

### Manual Test
1. Create a test story
2. Try to delete it - should call DELETE /api/v1/stories/:id
3. Verify story is removed from database
4. Try to archive a story - should still work

### API Test
```bash
# Test DELETE endpoint
curl -X DELETE http://localhost:3000/api/v1/stories/{story-id}

# Test archive (should already work)
curl -X PATCH http://localhost:3000/api/v1/stories/{story-id} \
  -H "Content-Type: application/json" \
  -d '{"action": "archive"}'
```
