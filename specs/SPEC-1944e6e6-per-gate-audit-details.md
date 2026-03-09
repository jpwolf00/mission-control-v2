# SPEC: Expand Per-Gate Audit Details in Pipeline UI

**Story ID:** 1944e6e6-523c-4712-a116-195874155a2c  
**Gate:** architect  
**Created:** 2026-03-09  
**Status:** Draft

---

## Problem Statement

The Mission Control v2 pipeline UI currently shows basic gate status (pending, in_progress, approved, rejected) but lacks detailed audit information that would help users understand:
1. **When** each gate was picked up and completed
2. **What** the agent's final completion message was
3. **What evidence** (screenshots, logs) was captured during the gate

The `gate-details.tsx` component already has partial support for these fields, but the data may not be fully populated or properly displayed.

### Current State

The `StoryGateInfo` interface includes:
- `pickedUpAt` - When gate was dispatched/picked up
- `completedAt` - When gate completed
- `completedBy` - Agent ID that completed
- `finalMessage` - Final agent output/summary
- `artifacts` - Screenshots, logs, evidence links

The `gate-details.tsx` component already renders:
- Pickup timestamp ✓
- Completion timestamp ✓
- Duration calculation ✓
- Final message (collapsed) ✓
- Artifacts as clickable chips ✓

### Gap Analysis

| Feature | Current | Expected | Status |
|---------|---------|----------|--------|
| Pickup timestamp display | Implemented | Verified working | Need to verify |
| Completion timestamp display | Implemented | Verified working | Need to verify |
| Duration calculation | Implemented | Verified working | Need to verify |
| Final message display | Implemented | Show agent completion message | Need to verify |
| Screenshot artifacts | Implemented | Clickable screenshot links | Need to verify |
| Reviewer gate validation | Partial | Screenshot artifact required | NEW |

The key **new requirement** is: **Reviewer gates (reviewer-a, reviewer-b) should require screenshot artifacts as part of completion evidence.**

---

## Technical Design

### 1. Verify Existing Telemetry Wiring

**Files to verify:**
- `src/services/story-store-db.ts` - `mapPrismaToDomain()` function
- `src/components/gate-details.tsx` - UI rendering

**Verification checklist:**
- [ ] `pickedUpAt` maps correctly from Prisma to domain
- [ ] `completedAt` maps correctly from Prisma to domain
- [ ] `finalMessage` maps correctly from Prisma to domain
- [ ] `artifacts` maps correctly from Prisma to domain
- [ ] UI displays all fields correctly

### 2. Add Screenshot Artifact Validation for Reviewer Gates

**File:** `src/domain/gate-contracts.ts`

Add validation logic to require screenshot artifacts for reviewer gates:

```typescript
// Add to GateRequirements
export interface GateRequirements {
  requiredEvidence: EvidenceType[];
  minimumEvidenceCount: number;
  manualOverride: boolean;
  autoApprove: boolean;
  requiredArtifacts?: ArtifactType[]; // NEW
}

// Artifact types
export type ArtifactType = 'screenshot' | 'log' | 'link';

// Update gate requirements
export const GATE_REQUIREMENTS: Record<Gate, GateRequirements> = {
  // ... other gates
  'reviewer-a': {
    requiredEvidence: ['review_comment', 'test_result'],
    minimumEvidenceCount: 2,
    manualOverride: true,
    autoApprove: false,
    requiredArtifacts: ['screenshot'], // NEW: Reviewer must include screenshot
  },
  'reviewer-b': {
    requiredEvidence: ['review_comment', 'manual_verification'],
    minimumEvidenceCount: 2,
    manualOverride: true,
    autoApprove: false,
    requiredArtifacts: ['screenshot'], // NEW: Reviewer must include screenshot
  },
};
```

**File:** `src/domain/gate-contracts.ts`

Add validation function:

```typescript
export function validateGateArtifacts(
  gate: Gate,
  artifacts: GateArtifact[]
): { valid: true } | { valid: false; error: string } {
  const requirements = GATE_REQUIREMENTS[gate];
  if (!requirements?.requiredArtifacts?.length) {
    return { valid: true };
  }

  for (const requiredType of requirements.requiredArtifacts) {
    const hasArtifact = artifacts.some(a => a.type === requiredType);
    if (!hasArtifact) {
      return {
        valid: false,
        error: `Gate "${gate}" requires at least one "${requiredType}" artifact`
      };
    }
  }

  return { valid: true };
}
```

### 3. Update Gate Completion API to Validate Artifacts

**File:** `src/app/api/v1/gates/complete/route.ts` (or modify callback route)

Add artifact validation before completing gate:

```typescript
import { validateGateArtifacts } from '@/domain/gate-contracts';

// In the completion handler
if (artifacts && artifacts.length > 0) {
  const artifactValidation = validateGateArtifacts(gate, artifacts);
  if (!artifactValidation.valid) {
    return NextResponse.json(
      { error: artifactValidation.error },
      { status: 422 }
    );
  }
}
```

**Note:** The completion currently happens via `/api/v1/agents/callback/route.ts`. The validation should be added there.

### 4. Enhance Gate Details UI

**File:** `src/components/gate-details.tsx`

While the component already displays telemetry, verify and enhance:

1. **Better empty state handling** - Show "No artifacts captured" when reviewer gate lacks screenshots
2. **Artifact type badges** - Show artifact type (screenshot/log/link) more prominently
3. **Validation warnings** - Show warning if reviewer gate completed without required screenshots

```typescript
// Add validation warning in GateDetails component
function getGateValidationWarning(gateInfo: StoryGateInfo): string | null {
  if ((gateInfo.gate === 'reviewer-a' || gateInfo.gate === 'reviewer-b') 
      && gateInfo.status === 'approved'
      && (!gateInfo.artifacts || !gateInfo.artifacts.some(a => a.type === 'screenshot'))) {
    return 'Reviewer gate approved without screenshot evidence';
  }
  return null;
}
```

### 5. Update Story Detail API Response

**File:** `src/services/story-store-db.ts`

Ensure `mapPrismaToDomain` correctly maps all telemetry fields:

```typescript
function mapPrismaToDomain(prismaStory: PrismaStoryWithGates): Story {
  const gateInfos: StoryGateInfo[] = (prismaStory.gates || []).map((g) => ({
    gate: g.gate,
    status: g.status,
    pickedUpAt: g.pickedUpAt,
    completedAt: g.completedAt,
    completedBy: g.completedBy,
    finalMessage: g.finalMessage || undefined,
    artifacts: (g.artifacts as unknown as StoryGateInfo['artifacts']) || undefined,
  }));
  // ... rest of mapping
}
```

---

## Implementation Tasks

### Task 1: Verify Existing Telemetry Wiring
**Files:**
- `src/services/story-store-db.ts`
- `src/components/gate-details.tsx`

**Verification steps:**
1. Check that `mapPrismaToDomain` correctly maps `pickedUpAt`, `completedAt`, `finalMessage`, `artifacts`
2. Verify UI renders all fields correctly
3. Test with a story that has gate telemetry data

### Task 2: Add Artifact Requirements to Gate Contracts
**Files:**
- `src/domain/gate-contracts.ts`

**Changes:**
1. Add `ArtifactType` type definition
2. Add `requiredArtifacts` to `GateRequirements` interface
3. Update `GATE_REQUIREMENTS` for reviewer-a and reviewer-b
4. Add `validateGateArtifacts()` function

### Task 3: Integrate Artifact Validation into Callback Handler
**Files:**
- `src/app/api/v1/agents/callback/route.ts`

**Changes:**
1. Import `validateGateArtifacts`
2. Before saving gate completion, validate artifacts for reviewer gates
3. Return 422 error if validation fails
4. Log validation warnings for monitoring

### Task 4: Enhance Gate Details UI
**Files:**
- `src/components/gate-details.tsx`

**Changes:**
1. Add validation warning display for missing screenshots
2. Improve empty state messaging
3. Add artifact count badge
4. Ensure proper formatting of timestamps

### Task 5: Update Prisma Schema (if needed)
**Files:**
- `prisma/schema.prisma`

**Verification:**
- Confirm `StoryGate` model has all required fields:
  - `pickedUpAt` ✓
  - `completedAt` ✓
  - `completedBy` ✓
  - `finalMessage` ✓
  - `artifacts` ✓

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Gate details show pickup timestamp | Story detail page shows "Pickup: [time]" for completed gates |
| 2 | Gate details show completion timestamp | Story detail page shows "Completed: [time]" for completed gates |
| 3 | Gate details show duration | Story detail page shows duration (e.g., "5m 30s") |
| 4 | Gate details show final message | Expanded gate shows agent completion message |
| 5 | Gate details show artifacts | Screenshots/logs appear as clickable chips with proper icons |
| 6 | Reviewer gates require screenshots | Callback returns 422 if reviewer-a/b completes without screenshot |
| 7 | Missing screenshot warning | UI shows warning badge if reviewer gate lacks screenshot |
| 8 | Backward compatibility | Non-reviewer gates work without screenshots |

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/domain/gate-contracts.ts` | Modify | Add artifact validation types and functions |
| `src/app/api/v1/agents/callback/route.ts` | Modify | Add artifact validation before completion |
| `src/components/gate-details.tsx` | Modify | Add validation warnings and improve display |
| `src/services/story-store-db.ts` | Verify | Confirm telemetry field mapping |

---

## API Contract Changes

### Agent Callback Request (no changes)

```json
{
  "sessionId": "...",
  "agentId": "...",
  "role": "reviewer-a",
  "event": "completed",
  "evidence": [...],
  "finalMessage": "...",
  "artifacts": [
    {
      "type": "screenshot",
      "url": "...",
      "description": "..."
    }
  ]
}
```

### Agent Callback Response (new error case)

```json
// 422 Validation Error
{
  "error": "Gate \"reviewer-a\" requires at least one \"screenshot\" artifact"
}
```

---

## Testing Plan

### Manual Test: Verify Telemetry Display

```bash
# 1. Get a story with gate telemetry
STORY_ID="..."
curl -s http://192.168.85.205:3004/api/v1/stories/$STORY_ID | jq '.gates'

# Expected: gates array with pickedUpAt, completedAt, finalMessage, artifacts
```

### Manual Test: Reviewer Gate Screenshot Validation

```bash
# 1. Create a test story and dispatch to reviewer-a
# 2. Attempt callback WITHOUT screenshot artifact

curl -X POST http://192.168.85.205:3004/api/v1/agents/callback \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-$(date +%s)" \
  -d '{
    "sessionId": "...",
    "agentId": "test-agent",
    "role": "reviewer-a",
    "event": "completed",
    "evidence": [],
    "artifacts": []  // No screenshot!
  }'

# Expected: 422 error "Gate "reviewer-a" requires at least one "screenshot" artifact"

# 3. Attempt callback WITH screenshot

curl -X POST http://192.168.85.205:3004/api/v1/agents/callback \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-$(date +%s)" \
  -d '{
    "sessionId": "...",
    "agentId": "test-agent",
    "role": "reviewer-a",
    "event": "completed",
    "evidence": [],
    "artifacts": [
      {
        "type": "screenshot",
        "url": "http://example.com/screenshot.png",
        "description": "UI validation screenshot"
      }
    ]
  }'

# Expected: 200 success
```

### UI Verification

1. Open story detail page for a completed story
2. Expand gate details for each gate
3. Verify:
   - Pickup timestamp displayed
   - Completion timestamp displayed
   - Duration calculated correctly
   - Final message shown (if available)
   - Artifacts shown as clickable chips
4. For reviewer gates without screenshots:
   - Warning badge should appear
   - "No artifacts captured" message should show

---

## Completion Contract

```json
{
  "status": "complete",
  "storyId": "1944e6e6-523c-4712-a116-195874155a2c",
  "gate": "architect",
  "deliverables": [
    "src/domain/gate-contracts.ts",
    "src/app/api/v1/agents/callback/route.ts",
    "src/components/gate-details.tsx"
  ],
  "verification": "Gate details display pickup/completion timestamps, duration, final message, and artifacts; Reviewer gates require screenshot artifacts for completion",
  "blockers": []
}
```

---

**End of Spec**
