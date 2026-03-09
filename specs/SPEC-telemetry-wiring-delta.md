# SPEC: Gate Pipeline Telemetry Wiring (Delta)

**Story ID:** bd7f8e97-0702-48d8-8f07-dabe6e7a2250  
**Gate:** architect → implementer  
**Date:** 2026-03-09

## Verified Current State

### Working (No Changes Needed)
1. **Runtime State API** (`/api/v1/runtime/state`): Returns pipeline with active sessions, models, providers
2. **Agent Callback**: Accepts and stores `model`/`provider` in `RunSession` on completion
3. **Dispatch API**: Accepts `provider`/`model` in request body and stores on session creation
4. **Dashboard** (`page.tsx`): Displays gate pipeline with live session info

### Bug Found (Fix Required)
**Location**: `src/services/dispatch-service.ts` line ~275  
**Issue**: `autoDispatchNextGate()` calls `dispatchStory()` without passing `provider`/`model`:
```typescript
const dispatchResult = await dispatchStory(storyId, nextGate, idempotencyKey);
// Missing: { provider, model }
```
**Impact**: Auto-dispatched gates show `model: null` in runtime state

### Gap Confirmed (Implementation Required)
**Location**: Story detail view (`/stories/[id]/page.tsx`)  
**Issue**: `GateDetails` component only shows `StoryGate` data, not live `RunSession` telemetry  
**Missing**: No API to fetch live session data for a specific story's gates

## Delta Specification

### 1. Fix auto-dispatch model propagation
**File**: `src/services/dispatch-service.ts`

Add model/provider lookup from completed session and pass to next gate dispatch:
```typescript
// In autoDispatchNextGate(), before dispatchStory:
const completedSession = await prisma.runSession.findFirst({
  where: { storyId, gate: completedGate },
  orderBy: { startedAt: 'desc' },
});

const dispatchResult = await dispatchStory(storyId, nextGate, idempotencyKey, {
  provider: completedSession?.provider || undefined,
  model: completedSession?.model || undefined,
});
```

### 2. Add Story Telemetry API
**New File**: `src/app/api/v1/stories/[id]/telemetry/route.ts`

Returns merged gate history + live session data:
```typescript
interface StoryTelemetryResponse {
  storyId: string;
  gates: Array<{
    gate: string;
    status: string;
    // From StoryGate
    pickedUpAt?: string;
    completedAt?: string;
    completedBy?: string;
    finalMessage?: string;
    artifacts?: GateArtifact[];
    // From RunSession (if active)
    session?: {
      id: string;
      model?: string;
      provider?: string;
      startedAt: string;
      lastHeartbeatAt?: string;
      estimatedInvocations: number;
      actualInvocations: number;
    };
  }>;
}
```

### 3. Update GateDetails Component
**File**: `src/components/gate-details.tsx`

- Accept optional `telemetry` prop with live session data
- Display live session info when gate is active:
  - Model badge (e.g., "alibaba/kimi-k2.5")
  - Last heartbeat timestamp
  - Invocation count (actual/estimated)
- Maintain backward compatibility for completed gates

### 4. Add Polling to Story Detail Page
**File**: `src/app/stories/[id]/page.tsx`

- Fetch telemetry data alongside story data
- 30-second polling interval when story has `status === 'active'`
- Pass telemetry to `GateDetails` component

## Verification Checklist

- [ ] Auto-dispatched gates inherit model/provider from previous gate
- [ ] `GET /api/v1/stories/{id}/telemetry` returns merged gate+session data
- [ ] Story detail page shows live model badge for active gate
- [ ] Heartbeat timestamp updates with polling
- [ ] Completed gates show historical data only (no session section)
- [ ] No visual regression for stories without active sessions
