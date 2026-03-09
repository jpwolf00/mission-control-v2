# SPEC.md - auth-fix smoke

## Story ID
a5a2f797-4c12-429f-b7ca-73e72e5fa663

## Overview
Smoke test for authentication-related fixes in the Mission Control dispatch system. Validate that auth-aware dispatch scenarios work correctly.

## Problem Statement

The story was dispatched with minimal context ("dispatch" as acceptance criteria). This SPEC interprets "auth-fix-smoke" as a validation story to ensure authentication/authorization flows in the dispatch system work correctly.

## Requirements

### 1. Auth Flow Validation (P0)
- Validate that authenticated dispatch requests work correctly
- Ensure role-based access control is functioning
- Test that unauthenticated requests are properly rejected

### 2. Dispatch Smoke Tests (P1)
- Successful dispatch with valid auth context
- Dispatch with invalid/missing auth (should fail gracefully)
- Role-based gate access validation

### 3. Session Auth Validation (P1)
- Ensure session-based authentication is preserved across gate handoffs
- Validate auth context propagation

## Technical Implementation

### Files to Review/Modify (if needed)
- `src/services/auth-service.ts` - Auth validation logic
- `src/services/dispatch-service.ts` - Auth in dispatch
- `src/middleware/auth.ts` - Auth middleware

### Test Scenarios
1. **Valid auth dispatch** - Dispatch with proper auth should succeed
2. **Missing auth rejection** - Request without auth should be rejected with 401
3. **Invalid role handling** - Request with wrong role should get 403
4. **Session persistence** - Auth should persist across gate transitions

## Acceptance Criteria

- [ ] Auth validation in dispatch service works
- [ ] Unauthenticated requests are properly rejected
- [ ] Role-based access enforced at gate boundaries
- [ ] Smoke tests pass for auth scenarios
- [ ] No regressions in existing dispatch functionality

## Test Plan

```bash
# Run existing tests
npm test

# Run auth-specific tests
npm test -- auth
```

## Dependencies
- None (uses existing auth infrastructure)
- Requires running database for full integration tests

## Notes
- Story was dispatched with minimal context. This SPEC interprets the requirements based on the story name "auth-fix-smoke".
- If specific auth issues need to be addressed, they should be added to this SPEC.
