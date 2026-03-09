# SPEC: Expand Per-Gate Audit Details in Pipeline UI

**Story ID:** db916522-3d15-4e80-9695-005490490910  
**Gate:** architect  
**Created:** 2026-03-09  
**Author:** Hal (architect agent)

---

## Problem Statement

Per-story gate audit details (pickup timestamp, completion timestamp, final message, artifacts) are already persisted and displayed. The remaining requirement is to **enforce screenshot artifacts for reviewer gates** (`reviewer-a`, `reviewer-b`) and surface validation status in the UI.

---

## Current State (Verified)

| Component | Status |
|-----------|--------|
| `StoryGate` schema with `pickedUpAt`, `finalMessage`, `artifacts` | ✅ Implemented |
| Callback API accepts `artifacts` array | ✅ Implemented |
| `GateArtifact` type in `domain/story.ts` | ✅ Implemented |
| `GateDetails` component displays telemetry | ✅ Implemented |
| **Artifact validation for reviewer gates** | ❌ **Missing** |
| **UI warning for missing screenshots** | ❌ **Missing** |

---

## Delta: Required Changes

### 1. Add Artifact Requirements to Gate Contracts

**File:** `src/domain/gate-contracts.ts`

```typescript
// Add to existing file
export const ARTIFACT_TYPES = ["screenshot", "log", "link"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

// Extend GateRequirements interface
export interface GateRequirements {
  requiredEvidence: EvidenceType[];
  minEvidenceCount: number;
  allowManualOverride: boolean;
  autoApproveOnComplete?: boolean;
  requiredArtifacts?: ArtifactType[]; // NEW
}

// Update GATE_REQUIREMENTS for reviewer gates
export const GATE_REQUIREMENTS: Record<Gate, GateRequirements> = {
  // ... other gates unchanged
  "reviewer-a": {
    requiredEvidence: ["review_comment", "test_result"],
    minEvidenceCount: 2,
    allowManualOverride: true,
    autoApproveOnComplete: false,
    requiredArtifacts: ["screenshot"], // NEW
  },
  "reviewer-b": {
    requiredEvidence: ["review_comment", "manual_verification"],
    minEvidenceCount: 2,
    allowManualOverride: true,
    autoApproveOnComplete: false,
    requiredArtifacts: ["screenshot"], // NEW
  },
};

// Add artifact validation function
export function validateGateArtifacts(
  gate: Gate,
  artifacts: { type: string; url: string }[]
): { valid: true } | { valid: false; error: string } {
  const requirements = GATE_REQUIREMENTS[gate];
  if (!requirements?.requiredArtifacts?.length) {
    return { valid: true };
  }

  for (const requiredType of requirements.requiredArtifacts) {
    const hasArtifact = artifacts.some((a) => a.type === requiredType);
    if (!hasArtifact) {
      return {
        valid: false,
        error: `Gate "${gate}" requires at least one "${requiredType}" artifact`,
      };
    }
  }

  return { valid: true };
}
```

### 2. Integrate Artifact Validation into Callback Handler

**File:** `src/app/api/v1/agents/callback/route.ts`

```typescript
import { validateGateArtifacts } from "@/domain/gate-contracts";

// In the 'completed' case, before saveGateCompletion:
if (artifacts && artifacts.length > 0) {
  const artifactValidation = validateGateArtifacts(session.gate as Gate, artifacts);
  if (!artifactValidation.valid) {
    return NextResponse.json(
      { error: artifactValidation.error },
      { status: 422 }
    );
  }
}
```

### 3. Add UI Warning for Missing Screenshots

**File:** `src/components/gate-details.tsx`

```typescript
// Add helper function
function getGateValidationWarning(gateInfo: StoryGateInfo): string | null {
  if (
    (gateInfo.gate === "reviewer-a" || gateInfo.gate === "reviewer-b") &&
    gateInfo.status === "approved" &&
    (!gateInfo.artifacts || !gateInfo.artifacts.some((a) => a.type === "screenshot"))
  ) {
    return "Reviewer gate approved without screenshot evidence";
  }
  return null;
}

// In the gate row rendering, add warning chip:
const validationWarning = gateInfo ? getGateValidationWarning(gateInfo) : null;
{validationWarning && (
  <Tooltip title={validationWarning}>
    <Chip
      label="Missing Screenshot"
      size="small"
      color="warning"
      sx={{ ml: 1, fontSize: "0.65rem", height: 18 }}
    />
  </Tooltip>
)}
```

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Reviewer-a requires screenshot | Callback without screenshot returns 422 |
| 2 | Reviewer-b requires screenshot | Callback without screenshot returns 422 |
| 3 | UI shows warning for missing screenshot | Warning chip appears on reviewer gates lacking screenshots |
| 4 | Non-reviewer gates work without artifacts | Architect/implementer complete successfully |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/domain/gate-contracts.ts` | Add artifact types, extend GateRequirements, add validateGateArtifacts() |
| `src/app/api/v1/agents/callback/route.ts` | Import and call validateGateArtifacts for completed gates |
| `src/components/gate-details.tsx` | Add getGateValidationWarning() and warning chip UI |

---

## Completion Contract

```json
{
  "status": "complete",
  "storyId": "db916522-3d15-4e80-9695-005490490910",
  "gate": "architect",
  "deliverables": [
    "src/domain/gate-contracts.ts",
    "src/app/api/v1/agents/callback/route.ts",
    "src/components/gate-details.tsx"
  ],
  "verification": "Reviewer gates require screenshot artifacts; UI warns when missing; non-reviewer gates unaffected",
  "blockers": []
}
```
