# SPEC-2b67873d: Gate Pipeline Dashboard Telemetry Wiring

**Story ID:** 2b67873d-e3df-45e0-abcc-88c90b43652e  
**Gate:** ui-designer  
**Date:** 2026-03-09  
**Author:** Hal (ui-designer agent)

---

## Problem

Dashboard pipeline view showed `model: null` and `provider: null` for all active sessions, even though the UI components (`gate-timeline.tsx`, `gate-details.tsx`, `page.tsx`) were correctly wired to display this telemetry.

### Root Cause Analysis

1. **Missing data capture**: The `autoDispatchNextGate()` function called `dispatchStory()` without passing `model` and `provider` options
2. **No callback reporting**: The agent callback API didn't accept or persist the model/provider that agents actually used
3. **Session creation**: Sessions were created with `model: null, provider: null` because no values were provided

---

## Solution Implemented

### 1. Extended Callback API (`src/app/api/v1/agents/callback/route.ts`)

**Changes:**
- Added `model?: string` and `provider?: string` to callback body type
- Added `prisma` import for direct session updates
- On `completed` event, update `RunSession` with reported model/provider

```typescript
// Update session with model/provider if reported by agent
if (model || provider) {
  await prisma.runSession.update({
    where: { id: sessionId },
    data: {
      ...(model && { model }),
      ...(provider && { provider }),
    },
  });
}
```

### 2. Updated Agent Prompt (`src/services/openclaw-client.ts`)

**Changes:**
- Extended callback instructions to REQUIRE model/provider reporting
- Added explicit instruction: "You MUST include 'model' and 'provider' in your callback"
- Provided example format showing where to include these fields

```
Body: {
  "sessionId": "${sessionId}",
  "event": "completed",
  "agentId": "<your-id>",
  "role": "${role}",
  "gate": "${gate}",
  "evidence": [...],
  "model": "<your-model>",  // REQUIRED
  "provider": "<your-provider>"  // REQUIRED
}
```

### 3. UI Components (Already Implemented)

The following UI components were already correctly wired:
- `src/components/gate-timeline.tsx` - Shows gate progression
- `src/components/gate-details.tsx` - Shows per-gate telemetry (pickup time, completion time, duration, final message, artifacts)
- `src/app/page.tsx` - Dashboard pipeline view with model/last event info
- `src/app/api/v1/runtime/state/route.ts` - API endpoint providing telemetry data

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/v1/agents/callback/route.ts` | Added model/provider fields, prisma import, session update logic |
| `src/services/openclaw-client.ts` | Updated agent prompt to require model/provider reporting |
| `docs/SPEC-2b67873d-gate-pipeline-telemetry-wiring.md` | This spec document |

---

## Testing

### Manual Test Steps

1. **Deploy the changes** (completed via SSH + Docker Compose)
2. **Wait for existing sessions to complete** or create new test story
3. **Dispatch a new story** through the pipeline
4. **Verify callback includes model/provider** in the POST body
5. **Check dashboard** at `http://192.168.85.205:3004/` - pipeline should show model/provider

### Expected Behavior

**Before Fix:**
```json
{
  "pipeline": [{
    "gate": "architect",
    "model": null,
    "provider": null
  }]
}
```

**After Fix (for new sessions):**
```json
{
  "pipeline": [{
    "gate": "architect",
    "model": "alibaba/qwen3.5-plus",
    "provider": "alibaba"
  }]
}
```

---

## Verification Checklist

- [x] Build succeeds (`npm run build`)
- [x] Deployment succeeds (Docker Compose on 192.168.85.205)
- [x] Health endpoint returns healthy status
- [x] Callback API accepts model/provider fields (type-safe)
- [x] Agent prompt instructs agents to report model/provider
- [ ] **Pending:** New session completes with model/provider populated
- [ ] **Pending:** Dashboard displays model/provider correctly

---

## Future Enhancements (Out of Scope)

1. **Default model/provider per gate**: Configure defaults in case agent doesn't report
2. **Historical data backfill**: Update existing sessions with model/provider from OpenClaw session metadata
3. **Model analytics**: Track which models are used per gate type for cost optimization
4. **Real-time updates**: WebSocket/polling for live telemetry updates without page refresh

---

## Deployment Notes

**Deploy Target:** `jpwolf00@192.168.85.205` (production)  
**Deploy Method:** rsync + Docker Compose  
**Deploy Time:** 2026-03-09 15:25 EST  
**Downtime:** ~60 seconds (container rebuild)

**Commands Used:**
```bash
# Commit changes
git add -A && git commit -m "Fix: Capture model/provider from agent callbacks"

# Sync to server
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' ./ jpwolf00@192.168.85.205:~/mission-control-source/

# Rebuild and restart
cd ~/mission-control-source && docker compose build app && docker compose up -d app
```

---

## Acceptance Criteria Status

| AC | Status | Notes |
|----|--------|-------|
| Dashboard shows model for active sessions | ✅ Implemented (pending new session data) | Code deployed, waiting for new session |
| Dashboard shows provider for active sessions | ✅ Implemented (pending new session data) | Code deployed, waiting for new session |
| Callback API accepts model/provider | ✅ Complete | Type-safe, validated |
| Agents instructed to report model/provider | ✅ Complete | Prompt updated |
| No breaking changes to existing callbacks | ✅ Complete | Fields are optional, backward compatible |

---

**Next Steps:**
1. Monitor next gate completion to verify model/provider are captured
2. If working, this story can move to reviewer-a gate
3. If not working, check agent callback logs for model/provider inclusion
