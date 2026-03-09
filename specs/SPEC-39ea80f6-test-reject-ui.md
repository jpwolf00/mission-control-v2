# SPEC - Test Reject UI

**Story ID:** 39ea80f6-d30d-43cb-b3c3-7a404a850a59  
**Gate:** architect  
**Created:** 2026-03-09

---

## Overview

Test and verify the story rejection functionality in the Mission Control UI.

## Current Reject Functionality

### 1. Story-Level Reject (Story Detail Page)

**Location:** `src/app/stories/[id]/page.tsx`

**UI Elements:**
- Reject button appears when `story.status === 'draft' || story.status === 'pending_approval'`
- Button style: `variant="outlined" color="error"`
- Calls `PATCH /api/v1/stories/{id}` with `{ action: 'reject' }`

**API Endpoint:** `src/app/api/v1/stories/[id]/route.ts` (PATCH)

**Backend Behavior:**
- Sets `approvedRequirementsArtifact: false`
- Sets `status: 'draft'`
- Returns updated story

### 2. Gate-Level Reject (Gate Completion)

**Location:** `src/app/api/v1/gates/complete/route.ts`

**API Endpoint:** `POST /api/v1/gates/complete`

**Request Body:**
```json
{
  "gate": "architect",
  "storyId": "...",
  "sessionId": "...",
  "status": "rejected",
  "reviewerNotes": "Reason for rejection"
}
```

**Backend Behavior:**
- Sets gate status to 'rejected'
- Sets story status to 'blocked'
- Releases dispatch lock

---

## Acceptance Criteria

### Test Reject Button

- [ ] **TC1:** Navigate to a story with status `draft` or `pending_approval`
- [ ] **TC2:** Verify the "Reject" button is visible and styled correctly (outlined, error color)
- [ ] **TC3:** Click the "Reject" button
- [ ] **TC4:** Verify success message appears: "Story rejected"
- [ ] **TC5:** Verify story status changes to `draft` (story-level reject)
- [ ] **TC6:** Verify the UI updates to show the new state

### Gate Reject (if applicable)

- [ ] **TC7:** Complete a gate with status "rejected" via API
- [ ] **TC8:** Verify story status changes to `blocked`
- [ ] **TC9:** Verify gate timeline shows the rejected gate

---

## Test Scenarios

### Positive Tests

1. **Story Reject Flow:**
   - Create or use existing story in `draft` status
   - Click Reject button
   - Confirm story returns to `draft` status
   - Confirm success message

2. **Gate Reject Flow:**
   - Dispatch story to a gate (e.g., architect)
   - Complete gate with `status: 'rejected'`
   - Confirm story status becomes `blocked`

### Edge Cases

1. Reject button should NOT appear for stories with status `approved`, `active`, `completed`, `blocked`, or `archived`
2. Reject should work for both `draft` and `pending_approval` statuses

---

## Verification Commands

```bash
# Check story status after reject
curl http://192.168.85.205:3004/api/v1/stories/{storyId}

# Check gate status
curl http://192.168.85.205:3004/api/v1/stories/{storyId} | jq '.gates'
```

---

## Next Gate

**implementer** or **reviewer-a** - Execute test scenarios and verify reject functionality works as expected.
