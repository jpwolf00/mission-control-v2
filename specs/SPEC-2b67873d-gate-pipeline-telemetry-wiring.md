# SPEC: Fix/Verify Gate Pipeline Dashboard Telemetry Wiring

**Story ID:** 2b67873d-e3df-45e0-abcc-88c90b43652e  
**Gate:** architect  
**Created:** 2026-03-09  
**Status:** Draft

---

## Problem Statement

The Mission Control v2 gate pipeline dashboard has incomplete telemetry wiring. The dashboard should reflect live agent telemetry like the OpenClaw monitor agent panel (showing: story being worked, last event, model, last message), but currently several key data points are missing or not properly connected.

### Current Issues

1. **Model/Provider showing as `null`** in runtime state API for active sessions
2. **No last event/message captured** from agent callbacks
3. **Gate timeline doesn't show agent telemetry** (pickedUpAt, finalMessage, artifacts)
4. **Dashboard pipeline view lacks live agent details**

### Expected Behavior (like OpenClaw Monitor)

The OpenClaw monitor shows:
- Story being worked
- Last event timestamp
- Model being used
- Last message from agent
- Session status

Mission Control dashboard should show similar telemetry per gate.

---

## Current State Analysis

### Existing Data Flow

```
Dispatch → triggerAgent() → OpenClaw /hooks/agent → Agent runs → Callback → saveGateCompletion()
     ↓
RunSession created with: id, storyId, gate, status, startedAt, provider=null, model=null
```

### Gap Analysis

| Telemetry Point | Current | Expected | Issue |
|-----------------|---------|----------|-------|
| `RunSession.model` | Always `null` | Actual model used | Not captured from OpenClaw response |
| `RunSession.provider` | Always `null` | Actual provider | Not captured from OpenClaw response |
| `StoryGate.pickedUpAt` | Captured | Displayed in UI | UI shows it, but verify wiring |
| `StoryGate.finalMessage` | Captured | Displayed in UI | UI shows it, but verify wiring |
| `StoryGate.artifacts` | Captured | Displayed in UI | UI shows it, but verify wiring |
| Runtime state `lastEvent` | Shows `startedAt` | Should show last activity | Needs heartbeat/activity tracking |

### Root Cause

The `triggerAgent()` function in `openclaw-client.ts` does not capture the model/provider from the OpenClaw `/hooks/agent` response. The webhook response likely contains this information, but it's being discarded.

---

## Technical Design

### 1. Capture Model/Provider from OpenClaw Response

**File:** `src/services/openclaw-client.ts`

The OpenClaw `/hooks/agent` endpoint returns session information including the model and provider being used. Update `triggerAgent()` to:

1. Parse the response JSON
2. Extract `model` and `provider` fields
3. Return them in the `TriggerResult`

```typescript
interface TriggerResult {
  success: boolean;
  agentId?: string;
  model?: string;      // NEW
  provider?: string;   // NEW
  error?: string;
}
```

**OpenClaw Response Format** (expected):
```json
{
  "sessionId": "...",
  "model": "alibaba/kimi-k2.5",
  "provider": "alibaba",
  "status": "dispatched"
}
```

### 2. Update Dispatch Service to Persist Model/Provider

**File:** `src/services/dispatch-service.ts`

Update `dispatchStory()` to:
1. Receive model/provider from `triggerAgent()` result
2. Update the `RunSession` record with these values

```typescript
// After successful trigger
if (triggerResult.success) {
  await prisma.runSession.update({
    where: { id: sessionId },
    data: {
      model: triggerResult.model,
      provider: triggerResult.provider,
    },
  });
}
```

### 3. Update Runtime State API

**File:** `src/app/api/v1/runtime/state/route.ts`

The runtime state API already queries `RunSession` and returns model/provider. Verify the query includes these fields:

```typescript
const activeSessions = await prisma.runSession.findMany({
  where: { status: 'active' },
  // model and provider should already be in the schema
});
```

**Current schema check:**
- `RunSession.model` exists ✓
- `RunSession.provider` exists ✓

The issue is they are never populated during dispatch.

### 4. Add Last Activity Tracking (Optional Enhancement)

For "last event" telemetry similar to OpenClaw monitor:

**Option A:** Use `lastHeartbeatAt` from `RunSession` (if OpenClaw updates it)
**Option B:** Track callback events as "last activity"

For now, use `startedAt` as `lastEvent` fallback, but update when callbacks are received.

**File:** `src/app/api/v1/agents/callback/route.ts`

Add update to `RunSession.lastHeartbeatAt` on each callback (completed, failed, heartbeat, invocation).

```typescript
// In callback handler
await prisma.runSession.update({
  where: { id: sessionId },
  data: { lastHeartbeatAt: new Date() },
});
```

### 5. Verify Gate Details UI Wiring

**File:** `src/components/gate-details.tsx`

The GateDetails component already displays:
- `pickedUpAt` ✓
- `completedAt` ✓
- `finalMessage` ✓
- `artifacts` ✓

Verify these are properly wired in the API response:

**File:** `src/services/story-store-db.ts` - `mapPrismaToDomain()`

Check that these fields are mapped:
- `pickedUpAt` → `StoryGateInfo.pickedUpAt`
- `finalMessage` → `StoryGateInfo.finalMessage`
- `artifacts` → `StoryGateInfo.artifacts`

### 6. Update Dashboard Pipeline View

**File:** `src/app/page.tsx`

The dashboard already shows:
- Active story title
- Session ID
- Model (but it's null currently)
- Started time

Once model/provider are populated, they will appear automatically.

---

## Implementation Tasks

### Task 1: Capture Model/Provider from OpenClaw Response
**Files:**
- `src/services/openclaw-client.ts`

**Changes:**
1. Update `TriggerResult` interface to include `model` and `provider`
2. Parse the `/hooks/agent` response JSON
3. Extract and return `model` and `provider` fields

### Task 2: Persist Model/Provider in RunSession
**Files:**
- `src/services/dispatch-service.ts`

**Changes:**
1. After successful `triggerAgent()` call, update the RunSession with model/provider

### Task 3: Add Heartbeat Tracking
**Files:**
- `src/app/api/v1/agents/callback/route.ts`

**Changes:**
1. Update `lastHeartbeatAt` on each callback event

### Task 4: Verify Gate Telemetry Wiring
**Files:**
- `src/services/story-store-db.ts`

**Changes:**
1. Verify `mapPrismaToDomain` correctly maps all gate telemetry fields
2. Ensure `pickedUpAt`, `finalMessage`, `artifacts` are properly typed and mapped

### Task 5: Test and Validate
**Verification steps:**
1. Dispatch a story to any gate
2. Check `/api/v1/runtime/state` - model/provider should be populated
3. Complete a gate with finalMessage and artifacts
4. Check story detail page - gate details should show telemetry
5. Verify dashboard pipeline view shows correct data

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Active sessions show model in runtime state API | `curl /api/v1/runtime/state` → `model` is not null |
| 2 | Active sessions show provider in runtime state API | `curl /api/v1/runtime/state` → `provider` is not null |
| 3 | Gate details show pickup timestamp | Story detail page shows "Pickup: [time]" |
| 4 | Gate details show completion timestamp | Completed gates show "Completed: [time]" |
| 5 | Gate details show final message | Expanded gate shows agent summary |
| 6 | Gate details show artifacts | Screenshots/logs appear as clickable chips |
| 7 | Dashboard pipeline shows model | Pipeline view shows model for active gates |
| 8 | Last activity is tracked | `lastHeartbeatAt` updates on callbacks |

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/services/openclaw-client.ts` | Modify | Capture model/provider from response |
| `src/services/dispatch-service.ts` | Modify | Persist model/provider to RunSession |
| `src/app/api/v1/agents/callback/route.ts` | Modify | Update lastHeartbeatAt on callbacks |
| `src/services/story-store-db.ts` | Verify | Confirm gate telemetry mapping |

---

## Out of Scope

- Real-time WebSocket updates (keep polling-based)
- Historical analytics/trends
- Agent performance metrics
- Cost tracking per gate (separate feature)

---

## Dependencies

- OpenClaw gateway must return model/provider in `/hooks/agent` response
- Database schema already has `model`, `provider`, `lastHeartbeatAt` fields

---

## Testing Plan

### Manual Test

```bash
# 1. Create and approve a test story
curl -X POST http://192.168.85.205:3004/api/v1/stories \
  -H "Content-Type: application/json" \
  -d '{"title":"Telemetry Test","description":"Test gate telemetry wiring"}'

# 2. Approve the story (get storyId from above)
curl -X PATCH http://192.168.85.205:3004/api/v1/stories/{id} \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}'

# 3. Dispatch to architect gate
curl -X POST http://192.168.85.205:3004/api/v1/orchestration/dispatch \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-$(date +%s)" \
  -d '{"storyId":"{id}","gate":"architect"}'

# 4. Check runtime state - model/provider should be populated
curl -s http://192.168.85.205:3004/api/v1/runtime/state | jq '.activeSessions[0] | {model, provider}'

# 5. Wait for completion, check story detail
curl -s http://192.168.85.205:3004/api/v1/stories/{id} | jq '.gates[0] | {pickedUpAt, finalMessage}'
```

---

## Completion Contract

```json
{
  "status": "complete",
  "storyId": "2b67873d-e3df-45e0-abcc-88c90b43652e",
  "gate": "architect",
  "deliverables": [
    "src/services/openclaw-client.ts",
    "src/services/dispatch-service.ts",
    "src/app/api/v1/agents/callback/route.ts"
  ],
  "verification": "Runtime state API returns model/provider; Gate details show telemetry; Dashboard pipeline displays agent info",
  "blockers": []
}
```

---

**End of Spec**
