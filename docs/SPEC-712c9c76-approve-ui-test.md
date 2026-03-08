# SPEC: Test Story for Approve UI

**Story ID:** 712c9c76-1bee-4f8f-88ef-6856729c3a83  
**Gate:** architect  
**Created:** 2026-03-07  
**Architect:** MC2-architect

---

## 1. Overview

This story tests the approve/reject functionality in Mission Control's story detail UI. The goal is to verify that:
1. The approve button correctly transitions a story from `draft`/`pending_approval` to `approved` status
2. The reject button correctly handles story rejection
3. UI state updates properly after each action

---

## 2. Current Implementation Analysis

### 2.1 Frontend Components

**Location:** `/src/app/stories/[id]/page.tsx`

The story detail page implements approve/reject functionality:

- **State Management:**
  - `approving` - Loading state during API call
  - `approveError` - Error message display
  - `approveSuccess` - Success confirmation

- **UI Elements:**
  - "Approve Story" button (contained, success color) - visible when status is `draft` or `pending_approval`
  - "Reject" button (outlined, error color) - visible when status is `draft` or `pending_approval`
  - Both buttons disabled during `approving` state
  - CircularProgress spinner shown during operation

- **API Call:**
  ```typescript
  PATCH /api/v1/stories/${storyId}
  Body: { action: 'approve' | 'reject' }
  ```

### 2.2 Backend API

**Location:** `/src/app/api/v1/stories/[id]/route.ts`

The PATCH handler:
1. Validates action is either 'approve' or 'reject'
2. Calls `approveRequirementsInDB(storyId, approved)`
3. Returns updated story object

**Location:** `/src/services/story-store-db.ts`

The `approveRequirementsInDB` function:
1. Updates `approvedRequirementsArtifact` boolean
2. Sets status to 'approved' if approved=true, 'draft' if approved=false
3. Returns mapped Story object

### 2.3 Component Hierarchy

```
StoryDetailPage (page.tsx)
├── Alert (error/success messages)
├── Header (title, description, status chip)
├── Action Buttons (Approve/Reject)
├── GateTimeline
├── Acceptance Criteria
├── Details
└── Attachments
```

---

## 3. Test Strategy

### 3.1 Test Cases

| Test Case | Initial State | Action | Expected Result |
|-----------|---------------|--------|-----------------|
| TC-1 | Story status = `draft` | Click "Approve Story" | Status changes to `approved`, success alert shown, buttons hidden |
| TC-2 | Story status = `draft` | Click "Reject" | Status changes to `draft` (rejected), appropriate feedback shown |
| TC-3 | Story status = `pending_approval` | Click "Approve Story" | Status changes to `approved` |
| TC-4 | Story status = `approved` | - | Approve/Reject buttons hidden, "Dispatch" button shown |
| TC-5 | Any state | API error | Error alert displayed, buttons remain enabled |

### 3.2 UI Behavior Specifications

**Approve Button:**
- Variant: `contained`
- Color: `success`
- Disabled during: `approving` state
- Icon: CircularProgress when loading
- Visible when: `story.status === 'draft' \|\| story.status === 'pending_approval'`

**Reject Button:**
- Variant: `outlined`
- Color: `error`
- Disabled during: `approving` state
- Visible when: `story.status === 'draft' \|\| story.status === 'pending_approval'`

**Success Alert:**
- Severity: `success`
- Message: "Story approved and ready for dispatch" (approve) or "Story rejected" (reject)
- Auto-closable: Yes (onClose handler)

**Error Alert:**
- Severity: `error`
- Message: Error from API or "Failed to update story"
- Auto-closable: Yes (onClose handler)

---

## 4. Implementation Notes

### 4.1 No Code Changes Required

This is a **testing-only story**. The approve/reject functionality is already implemented. The implementer's task is to:

1. Create a test story in the system
2. Navigate to the story detail page
3. Execute the test cases above
4. Document results

### 4.2 Test Execution Steps

1. **Setup:**
   - Ensure Mission Control is running at `http://192.168.85.205:3004`
   - Access the stories list page
   - Create a new test story (or use existing)

2. **Execute TC-1 (Approve Flow):**
   - Navigate to story detail page
   - Verify story status is `draft` or `pending_approval`
   - Verify both Approve and Reject buttons are visible
   - Click "Approve Story"
   - Verify loading state (spinner appears)
   - Verify success alert appears
   - Verify story status updates to `approved`
   - Verify Approve/Reject buttons are hidden
   - Verify "Dispatch" button appears

3. **Execute TC-2 (Reject Flow):**
   - Create new test story
   - Click "Reject"
   - Verify appropriate feedback
   - Verify story remains in `draft` status

4. **Execute TC-5 (Error Handling):**
   - Simulate error condition (optional: temporarily break API)
   - Verify error alert displays
   - Verify buttons remain functional after error

---

## 5. Acceptance Criteria

- [ ] **AC-1:** Approve button is visible for stories in `draft` status
- [ ] **AC-2:** Approve button is visible for stories in `pending_approval` status
- [ ] **AC-3:** Clicking Approve transitions story to `approved` status
- [ ] **AC-4:** Success message is displayed after approval
- [ ] **AC-5:** Reject button is visible for stories in `draft`/`pending_approval` status
- [ ] **AC-6:** Clicking Reject provides appropriate feedback
- [ ] **AC-7:** Buttons show loading state during API call
- [ ] **AC-8:** Error state is handled gracefully with user feedback
- [ ] **AC-9:** After approval, Dispatch button becomes visible
- [ ] **AC-10:** UI state updates correctly without page refresh

---

## 6. Definition of Done

1. All test cases (TC-1 through TC-5) executed
2. All acceptance criteria (AC-1 through AC-10) verified
3. Test results documented in evidence
4. No console errors during testing
5. UI responsive during all operations

---

## 7. Handoff to Implementer

**Next Gate:** implementer

**Deliverables:**
- This SPEC.md file
- Test story created in system
- Test execution results

**Notes for Implementer:**
- This is a testing task, not a coding task
- Focus on UI/UX verification
- Capture screenshots as evidence
- Report any bugs found during testing
