# SPEC.md - MiniMax Guarded Test 2026-03-08

## Story
- **ID**: 0cb28295-4f26-4c67-b44e-222a91fa72dc
- **Gate**: architect
- **Session**: 104eb16d-2e2c-45e7-8eb9-1ea0cd94eec4

## Acceptance Criteria
**No runaway sessions** - Sessions should not run indefinitely without proper lifecycle management.

## Problem Analysis

Based on code review of the Mission Control codebase, the session management system has these components:

### Current Architecture

1. **Session Tracker** (`src/domain/session-tracker.ts`)
   - In-memory session store with TTL (default 5 min)
   - Status states: `pending` → `active` → `completed`/`failed`/`timed_out`/`canceled`
   - Heartbeat updates extend TTL
   - `clearExpiredSessions()` marks stale active sessions as `timed_out`

2. **Stalled Derivation** (`src/domain/stalled-derivation.ts`)
   - Explicit timestamp-based stall detection
   - Configurable timeout threshold (default 5 min)
   - Pure function `isSessionStalled(lastHeartbeatAt, currentTime, thresholdMs)`

3. **Orphan Cleaner** (`src/lib/orphan-cleaner.ts`)
   - DB-level cleanup for sessions stale >30 min
   - Marks them as `orphaned` in the database
   - Cleans up expired dispatch locks

4. **Dispatch Service** (`src/services/dispatch-service.ts`)
   - TTL-based idempotency check (15 min default)
   - Lock acquisition before dispatch
   - Session status tracking in Prisma

### Potential Runaway Scenarios

1. **No heartbeat received** → Session stalls after TTL
2. **Heartbeat not extending TTL** → Stalled detection not triggering
3. **DB orphan not cleaning** → Orphaned sessions linger
4. **Lock not released** → Story stuck, cannot re-dispatch

## Validation Approach

### Test Strategy: Code Inspection + Smoke Test

Given this is a single-gate validation, we'll verify:

1. **Stalled Detection Logic** - Confirm `isSessionStalled()` correctly identifies stalled sessions
2. **Session Lifecycle** - Verify status transitions work correctly
3. **TTL Enforcement** - Confirm sessions expire properly

### Implementation

**Unit Tests for Core Functions:**

```typescript
// Tests to verify:
1. isSessionStalled returns true when heartbeat exceeded threshold
2. isSessionStalled returns false when within threshold  
3. Session status transitions correctly
4. clearExpiredSessions marks stalled sessions as timed_out
```

## Acceptance Verification

- [ ] Unit tests pass for `isSessionStalled()` with various thresholds
- [ ] Unit tests pass for status transitions (pending → active → completed)
- [ ] TTL expiration triggers correct status change
- [ ] No console errors or unhandled exceptions

## Deliverables

1. **SPEC.md** (this file) - Design document
2. **Unit tests** - `src/domain/__tests__/session-tracker.test.ts`
3. **Evidence** - Test run results proving no runaway scenarios

## Notes

- The MiniMax model is being tested - ensure it's properly handled in budget service
- This is a validation run to confirm the existing safeguards work correctly
