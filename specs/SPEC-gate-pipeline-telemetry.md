# SPEC: Gate Pipeline Dashboard Telemetry Wiring

**Story ID:** bd7f8e97-0702-48d8-8f07-dabe6e7a2250  
**Gate:** architect  
**Date:** 2026-03-09

## Current State Analysis

### What's Working
1. **Database Schema**: Prisma schema includes `RunSession` model with fields:
   - `id`, `storyId`, `gate`, `status`
   - `provider`, `model` (populated on callback)
   - `startedAt`, `endedAt`, `lastHeartbeatAt`
   - `dispatchAttempts`, `estimatedInvocations`, `actualInvocations`

2. **Agent Callback**: `/api/v1/agents/callback` accepts and stores:
   - `model` and `provider` from agent
   - `pickedUpAt`, `finalMessage`, `artifacts`
   - Updates `runSession` with model/provider on completion

3. **Runtime State API**: `/api/v1/runtime/state` returns:
   - Pipeline state per gate (active/pending/idle)
   - Active sessions with model, provider, startedAt
   - Active agent count
   - Last event timestamps

4. **Dashboard UI** (`page.tsx`): Displays:
   - Gate pipeline with status
   - Active story title per gate
   - Model info and time ago
   - Active agents list

### What's Missing / Broken

1. **Live Agent Telemetry in Story Detail View**
   - `GateDetails` component only shows historical gate data from `StoryGate` table
   - Does NOT show live session info (model, last heartbeat, current agent)
   - No connection between `StoryGate` and active `RunSession`

2. **Session-to-Gate Linkage**
   - `StoryGate` table has no `sessionId` field
   - Cannot correlate active session with gate record
   - `RunSession.storyId` exists but no reverse lookup from gate

3. **Real-time Updates**
   - Dashboard and story pages don't auto-refresh
   - No WebSocket or polling for live telemetry

4. **Missing Telemetry Fields**
   - No `agentId` stored in `RunSession`
   - No `lastMessage` or progress updates during session
   - No estimated time remaining

## Design Decisions

### Decision 1: Add sessionId to StoryGate
**Rationale**: Need to link gate records to active sessions for live telemetry.

**Change**: Add `sessionId` field to `StoryGate` model, populated on dispatch.

### Decision 2: New API Endpoint for Story Telemetry
**Rationale**: Story detail page needs live session data merged with gate history.

**Endpoint**: `GET /api/v1/stories/{id}/telemetry`

**Returns**:
```typescript
{
  storyId: string;
  gates: Array<{
    gate: string;
    status: 'pending' | 'in_progress' | 'approved' | 'rejected';
    // Historical data from StoryGate
    pickedUpAt?: string;
    completedAt?: string;
    completedBy?: string;
    finalMessage?: string;
    artifacts?: GateArtifact[];
    // Live session data from RunSession (if active)
    session?: {
      id: string;
      agentId?: string;
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

### Decision 3: Update GateDetails Component
**Rationale**: Display live session telemetry when available.

**Changes**:
- Fetch telemetry data in addition to story data
- Show live session info (model, agent, heartbeat, invocations)
- Add visual indicator for active vs completed gates
- Display progress metrics (invocations used/estimated)

### Decision 4: Auto-refresh Pattern
**Rationale**: Keep telemetry fresh without WebSocket complexity.

**Implementation**: 
- 30-second polling interval for active stories
- Clear interval when story completes or page unmounts
- Visual "last updated" timestamp

## Implementation Plan

### Phase 1: Database Migration
1. Add `sessionId` to `StoryGate` model
2. Update `saveGateCompletion` to store sessionId
3. Update dispatch flow to set sessionId on gate

### Phase 2: API Endpoint
1. Create `/api/v1/stories/[id]/telemetry/route.ts`
2. Join `StoryGate` with `RunSession` for active gates
3. Return merged telemetry data

### Phase 3: UI Updates
1. Update `GateDetails` component to accept telemetry data
2. Add live session display section
3. Implement polling in story detail page

### Phase 4: Testing
1. Verify telemetry shows for active sessions
2. Verify historical data shows for completed gates
3. Test polling behavior

## Files to Modify

1. `prisma/schema.prisma` - Add sessionId to StoryGate
2. `src/services/story-store-db.ts` - Update saveGateCompletion
3. `src/services/dispatch-service.ts` - Set sessionId on dispatch
4. `src/app/api/v1/stories/[id]/telemetry/route.ts` - New endpoint
5. `src/components/gate-details.tsx` - Add live telemetry display
6. `src/app/stories/[id]/page.tsx` - Add polling for telemetry

## Verification Criteria

- [ ] Story detail page shows live model/provider for active gate
- [ ] Heartbeat timestamp updates every 30 seconds
- [ ] Completed gates show historical data (no session section)
- [ ] Gate telemetry matches OpenClaw monitor agent panel style
- [ ] No errors when story has no active session
