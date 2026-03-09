# SPEC: E2E Final Test 171345

## Story
- **ID**: 3ef5ee0f-4c65-4cab-8201-78e79358a85c
- **Title**: E2E Final Test 171345
- **Gate**: architect

## Overview
This is a meta-test to validate the Mission Control orchestration pipeline end-to-end. The test verifies that a story can progress through all six gates in sequence: architect → ui-designer → implementer → reviewer-a → operator → reviewer-b.

## Context
- Story created: 2026-03-08T17:13:45Z
- Status: approved
- Current gate: architect
- Acceptance criteria: All 6 gates must execute

## What We're Validating

### 1. Gate Handoff
Each gate completes and triggers the next gate automatically via `autoDispatchNextGate()`.

### 2. No Orphaned Sessions
Every dispatched session completes (success or failure) without hanging beyond TTL (15 min).

### 3. State Consistency
- Story `status` updates correctly at each gate
- Story `currentGate` advances correctly
- Story `gates` array populates with completed gates

### 4. Lock Management
Session locks are properly acquired and released at each gate transition.

### 5. UI-Designer Integration
Validates the new 6-gate flow including the ui-designer gate between architect and implementer.

## Gate Sequence
```
architect → ui-designer → implementer → reviewer-a → operator → reviewer-b (done)
```

## Test Execution Plan

### Step 1: Architect Gate (current)
- Create this SPEC.md
- Callback with architect completion

### Step 2-7: Subsequent Gates
Each gate will:
1. Receive dispatch from Mission Control
2. Execute gate-specific work
3. Call `autoDispatchNextGate()` to trigger next gate
4. Complete with callback

### Validation Points
- Check `runSession` table: session transitions from `active` → `completed`/`failed`
- Verify no sessions stuck in `active` status beyond TTL
- Verify story `currentGate` advances correctly
- Verify `gates` array updates with completed gates

## Success Criteria
- [ ] Architect gate completes and dispatches to ui-designer
- [ ] UI-designer gate completes and dispatches to implementer
- [ ] Implementer gate completes and dispatches to reviewer-a
- [ ] Reviewer-a gate completes and dispatches to operator
- [ ] Operator gate completes and dispatches to reviewer-b
- [ ] Reviewer-b gate completes (final gate)
- [ ] No sessions left in `active` status after test completes
- [ ] Story status transitions correctly (approved → done)

## Failure Modes to Detect
1. **Stuck Dispatch**: Next gate never gets triggered after current gate completes
2. **Orphaned Session**: Session stays `active` beyond TTL without completion
3. **Lock Conflict**: New dispatch fails due to stale lock
4. **API Error**: Dispatch endpoint returns error
5. **UI-Designer Missing**: If ui-designer is not in the gate flow

## Technical Notes
- Use existing `/api/v1/stories/:id/dispatch` endpoint for manual testing if needed
- Query `runSession` table directly to verify session states
- Use `/api/v1/stories/:id` to check story status progression

## Acceptance Criteria
- All 6 gates execute in sequence ✓
- No orphaned sessions ✓
- UI-designer properly integrated into gate flow ✓
- State consistency maintained throughout ✓
