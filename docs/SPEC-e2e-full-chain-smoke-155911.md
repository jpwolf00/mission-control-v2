# SPEC: E2E Full-Chain Smoke Test

## Story
- **ID**: 65489771-5ab5-46af-b2ce-a3c42dddbad8
- **Title**: E2E full-chain smoke 155911

## Overview
This is a meta-test to validate the Mission Control orchestration pipeline end-to-end. The test verifies that a story can progress through all five gates in sequence: architect → implementer → reviewer-a → operator → reviewer-b.

## Test Approach

### What We're Validating
1. **Gate Handoff**: Each gate completes and triggers the next gate automatically
2. **No Orphaned Sessions**: Every dispatched session completes (success or failure) without hanging
3. **State Consistency**: Story status updates correctly at each gate
4. **Lock Management**: Session locks are properly acquired and released

### Test Execution
Since this is a pipeline validation test:

1. **Start**: Architect gate begins (current state)
2. **Dispatch**: Each gate auto-dispatches to the next via `autoDispatchNextGate()`
3. **Validation Points**:
   - Check `runSession` table for each gate: session should exist and transition from `active` → `completed`/`failed`
   - Verify no sessions stuck in `active` status beyond TTL (15 min)
   - Verify story `currentGate` advances correctly
   - Verify `gates` array in story updates with completed gates

### Success Criteria
- [ ] Architect gate completes and dispatches to implementer
- [ ] Implementer gate completes and dispatches to reviewer-a  
- [ ] Reviewer-a gate completes and dispatches to operator
- [ ] Operator gate completes and dispatches to reviewer-b
- [ ] Reviewer-b gate completes (final gate)
- [ ] No sessions left in `active` status after test completes
- [ ] Story status transitions correctly (approved → done or appropriate end state)

### Failure Modes to Detect
1. **Stuck Dispatch**: Next gate never gets triggered after current gate completes
2. **Orphaned Session**: Session stays `active` beyond TTL without completion
3. **Lock Conflict**: New dispatch fails due to stale lock
4. **API Error**: Dispatch endpoint returns error

## Implementation Notes
- Use existing `/api/v1/stories/:id/dispatch` endpoint to manually trigger gates if needed for testing
- Query `runSession` table directly to verify session states
- Use `/api/v1/stories/:id` to check story status progression

## Gate Sequence
```
architect → implementer → reviewer-a → operator → reviewer-b (done)
```

## Acceptance Criteria
- All gates handoff ✓
- No orphaned session ✓
