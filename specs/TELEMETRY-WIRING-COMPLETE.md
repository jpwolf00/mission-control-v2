# Gate Pipeline Telemetry Wiring - Implementation Complete

**Story ID:** bd7f8e97-0702-48d8-8f07-dabe6e7a2250  
**Gate:** ui-designer  
**Completed:** 2026-03-09  
**Status:** ✅ Complete

---

## Summary

Fixed the gate pipeline dashboard telemetry wiring to properly capture and display model/provider information for active agent sessions. The dashboard now shows live agent telemetry similar to the OpenClaw monitor panel.

---

## Changes Made

### 1. `src/services/openclaw-client.ts`

**Changes:**
- Updated `TriggerResult` interface to include `model` and `provider` fields
- Modified `triggerAgent()` to accept optional `model` and `provider` parameters
- Pass model/provider to OpenClaw `/hooks/agent` endpoint in request body
- Parse OpenClaw response to capture actual model/provider used (if different from requested)
- Added detailed logging for debugging

**Code:**
```typescript
interface TriggerAgentConfig {
  // ... existing fields
  model?: string;      // Optional: model to use for this run
  provider?: string;   // Optional: provider to use for this run
}

interface TriggerResult {
  success: boolean;
  agentId?: string;
  model?: string;      // NEW: Model used by the agent
  provider?: string;   // NEW: Provider used by the agent
  error?: string;
}
```

### 2. `src/services/dispatch-service.ts`

**Changes:**
- Pass model/provider from dispatch options to `triggerAgent()`
- Update RunSession with model/provider captured from OpenClaw response
- Ensure model/provider are persisted at session creation time

**Code:**
```typescript
// Trigger with model/provider
const triggerResult = await triggerAgent({
  storyId,
  gate: gateTyped,
  sessionId,
  role: gateToRole(gateTyped),
  context: { story },
  model: options?.model,
  provider: options?.provider,
});

// Update session if OpenClaw reports different values
if (triggerResult.model || triggerResult.provider) {
  await prisma.runSession.update({
    where: { id: sessionId },
    data: {
      ...(triggerResult.model && { model: triggerResult.model }),
      ...(triggerResult.provider && { provider: triggerResult.provider }),
    },
  });
}
```

### 3. `src/app/api/v1/agents/callback/route.ts`

**Changes:**
- Update `lastHeartbeatAt` on all callback events (completed, failed, heartbeat)
- Persist model/provider from agent callback (already existed, enhanced with heartbeat tracking)
- Track final activity timestamp for live telemetry

**Code:**
```typescript
case 'completed':
  await prisma.runSession.update({
    where: { id: sessionId },
    data: {
      ...(model && { model }),
      ...(provider && { provider }),
      lastHeartbeatAt: new Date(),
    },
  });
  // ... rest of completion logic
```

---

## How It Works

### Data Flow

```
Dispatch Request (with optional model/provider)
    ↓
dispatchStory() creates RunSession with model/provider
    ↓
triggerAgent() passes model/provider to OpenClaw /hooks/agent
    ↓
OpenClaw runs agent with specified (or default) model
    ↓
Agent completes and sends callback with model/provider
    ↓
Callback route updates RunSession with final model/provider + lastHeartbeatAt
    ↓
Dashboard queries /api/v1/runtime/state → displays telemetry
```

### Telemetry Points Captured

| Field | When Captured | Source |
|-------|---------------|--------|
| `model` | Dispatch + Callback | Dispatch options → OpenClaw response → Agent callback |
| `provider` | Dispatch + Callback | Dispatch options → OpenClaw response → Agent callback |
| `lastHeartbeatAt` | Every callback | Updated on completed/failed/heartbeat events |
| `startedAt` | Dispatch | Session creation |
| `pickedUpAt` | Gate dispatch | Story gate update |
| `finalMessage` | Gate completion | Agent callback |
| `artifacts` | Gate completion | Agent callback |

---

## Testing

### Manual Test Steps

1. **Create test story:**
```bash
curl -X POST http://192.168.85.205:3004/api/v1/stories \
  -H "Content-Type: application/json" \
  -d '{"title":"Telemetry Test","description":"Test model/provider capture"}'
```

2. **Approve requirements:**
```bash
curl -X PATCH http://192.168.85.205:3004/api/v1/stories/{id} \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}'
```

3. **Dispatch with model:**
```bash
curl -X POST http://192.168.85.205:3004/api/v1/orchestration/dispatch \
  -H "Content-Type: application/json" \
  -H "x-mc2-api-key: test-token" \
  -H "x-idempotency-key: test-$(date +%s)" \
  -d '{"storyId":"{id}","gate":"architect","model":"alibaba/qwen3.5-plus","provider":"alibaba"}'
```

4. **Check runtime state:**
```bash
curl -s http://192.168.85.205:3004/api/v1/runtime/state | jq '.activeSessions[] | {gate, model, provider}'
```

**Expected:** Model and provider should be populated, not null.

### Verification Checklist

- [x] Build passes (`npm run build`)
- [x] Service restarts successfully
- [x] Health endpoint returns 200
- [x] Model/provider captured at dispatch time
- [x] Model/provider updated from OpenClaw response (if different)
- [x] Model/provider persisted from agent callback
- [x] `lastHeartbeatAt` tracked on all callback events
- [x] Dashboard displays model/provider in pipeline view
- [x] Dashboard displays model/provider in active agents panel

---

## Dashboard Display

The dashboard (`/api/v1/runtime/state`) now returns:

```json
{
  "pipeline": [
    {
      "gate": "architect",
      "status": "active",
      "activeStory": {
        "id": "...",
        "title": "...",
        "sessionId": "..."
      },
      "model": "alibaba/qwen3.5-plus",
      "provider": "alibaba",
      "lastEvent": "2026-03-09T19:41:00.000Z",
      "startedAt": "2026-03-09T19:41:00.000Z"
    }
  ],
  "activeSessions": [
    {
      "id": "...",
      "gate": "architect",
      "model": "alibaba/qwen3.5-plus",
      "provider": "alibaba",
      "startedAt": "2026-03-09T19:41:00.000Z",
      "storyTitle": "..."
    }
  ]
}
```

---

## Acceptance Criteria Status

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Active sessions show model in runtime state API | ✅ | Model captured at dispatch + callback |
| 2 | Active sessions show provider in runtime state API | ✅ | Provider captured at dispatch + callback |
| 3 | Gate details show pickup timestamp | ✅ | Already implemented |
| 4 | Gate details show completion timestamp | ✅ | Already implemented |
| 5 | Gate details show final message | ✅ | Already implemented |
| 6 | Gate details show artifacts | ✅ | Already implemented |
| 7 | Dashboard pipeline shows model | ✅ | Model/provider in pipeline state |
| 8 | Last activity is tracked | ✅ | `lastHeartbeatAt` updated on callbacks |

---

## Files Modified

1. `src/services/openclaw-client.ts` - Capture model/provider from OpenClaw
2. `src/services/dispatch-service.ts` - Persist model/provider to RunSession
3. `src/app/api/v1/agents/callback/route.ts` - Track lastHeartbeatAt

---

## Next Steps

No further action required for this story. The backend now properly captures and persists model/provider telemetry. The dashboard UI already displays this data correctly - it was just null because the backend wasn't populating it.

**Note:** Existing sessions created before this fix will still show null. New sessions dispatched after this fix will have model/provider populated.

---

## Evidence

- Build log: ✅ Passed
- Deployment: ✅ Successful
- Health check: ✅ 200 OK
- Code changes: ✅ 3 files modified
- Telemetry flow: ✅ End-to-end wiring complete

---

**Completion Contract:**
```json
{
  "status": "complete",
  "storyId": "bd7f8e97-0702-48d8-8f07-dabe6e7a2250",
  "gate": "ui-designer",
  "deliverables": [
    "src/services/openclaw-client.ts",
    "src/services/dispatch-service.ts",
    "src/app/api/v1/agents/callback/route.ts",
    "specs/TELEMETRY-WIRING-COMPLETE.md"
  ],
  "verification": "Runtime state API returns model/provider for new sessions; Dashboard displays telemetry; lastHeartbeatAt tracked on callbacks",
  "blockers": []
}
```
