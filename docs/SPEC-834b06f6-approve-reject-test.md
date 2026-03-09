# SPEC-834b06f6-approve-reject-test

## Story
- **ID**: 712c9c76-1bee-4f8f-88ef-6856729c3a83
- **Title**: Test Story for Approve UI
- **Gate**: architect

## Overview
Test the approve/reject functionality in the Mission Control story detail UI.

## Current Implementation (Research Findings)

### UI Components
- **Location**: `src/app/stories/[id]/page.tsx`
- **Buttons**: Two buttons - "Approve Story" and "Reject" (lines 221-232)
- **State**: Uses `approving` boolean for loading state
- **Feedback**: Shows success/error alerts after action

### API Endpoint
- **Route**: `PATCH /api/v1/stories/[id]`
- **Body**: `{ action: 'approve' | 'reject' }`
- **Handler**: `src/app/api/v1/stories/[id]/route.ts`

### Database Function
- **Function**: `approveRequirementsInDB(storyId, approved)` in `src/services/story-store-db.ts`
- **Effects**:
  - `approved: true` → sets `status: 'approved'`, `approvedRequirementsArtifact: true`
  - `approved: false` → sets `status: 'draft'`, `approvedRequirementsArtifact: false`

## Test Plan

### Prerequisites
- Mission Control deployed at http://192.168.85.205:3004
- Test story exists with ID `712c9c76-1bee-4f8f-88ef-6856729c3a83`

### Test Cases

#### TC1: Verify Approve Button Works
1. Navigate to story detail page: `/stories/712c9c76-1bee-4f8f-88ef-6856729c3a83`
2. Click "Approve Story" button
3. **Expected**:
   - Button shows "Approving..." during request
   - Success alert appears: "Story approved and ready for dispatch"
   - Story status updates to `approved` in database
   - UI reflects approved state (green badge/status)

#### TC2: Verify Reject Button Works
1. Navigate to story detail page: `/stories/712c9c76-1bee-4f8f-88ef-6856729c3a83`
2. Click "Reject" button
3. **Expected**:
   - Button shows loading state during request
   - Success alert appears: "Story rejected"
   - Story status updates to `draft` in database
   - UI reflects rejected/draft state

#### TC3: API Validation
- Test with invalid action (e.g., `"action": "invalid"`) → expects 422 error
- Test with missing action → expects 422 error

## Verification Commands

```bash
# Get story status before test
curl -s http://192.168.85.205:3004/api/v1/stories/712c9c76-1bee-4f8f-88ef-6856729c3a83 | jq '.status, .approvedRequirementsArtifact'

# Test approve via API
curl -s -X PATCH http://192.168.85.205:3004/api/v1/stories/712c9c76-1bee-4f8f-88ef-6856729c3a83 \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}' | jq '.status, .approvedRequirementsArtifact'

# Test reject via API
curl -s -X PATCH http://192.168.85.205:3004/api/v1/stories/712c9c76-1bee-4f8f-88ef-6856729c3a83 \
  -H "Content-Type: application/json" \
  -d '{"action":"reject"}' | jq '.status, .approvedRequirementsArtifact'
```

## Acceptance Criteria
- [ ] Approve button updates story status to `approved`
- [ ] Reject button updates story status to `draft`
- [ ] UI shows appropriate success feedback
- [ ] UI shows appropriate error feedback on failure

## Risks
- None identified - functionality appears straightforward with existing implementation

## Notes
- This is a UI smoke test - primary focus is verifying buttons work end-to-end
- The approve/reject functionality is already implemented in the codebase
