# Gate Contracts (MC2-E6-S1)

Gate completion schema and evidence validators for story workflow management.

## Overview

Gate contracts define the completion criteria for each gate in the story workflow. Each gate has specific evidence requirements that must be satisfied before a story can progress to the next gate.

## Gate Types

| Gate | Description |
|------|-------------|
| `architect` | Architecture and design phase |
| `implementer` | Implementation and development phase |
| `reviewer-a` | First review pass |
| `operator` | Deployment and operations phase |
| `reviewer-b` | Final review pass |

## Completion Statuses

| Status | Description |
|--------|-------------|
| `pending` | Gate work has not yet been completed |
| `approved` | Gate requirements met and approved |
| `rejected` | Gate requirements not met |
| `needs_revision` | Changes requested before approval |

## Evidence Types

| Type | Description |
|------|-------------|
| `code_change` | Source code modifications |
| `test_result` | Test execution results |
| `documentation` | Documentation updates or additions |
| `review_comment` | Review feedback or approvals |
| `deployment_record` | Deployment artifacts or records |
| `api_call` | API interaction evidence |
| `manual_verification` | Manual testing or verification |

## Gate Requirements

Each gate has specific requirements for completion:

### architect

- **Required Evidence:** `documentation`, `code_change`
- **Minimum Evidence Count:** 2
- **Manual Override:** Allowed
- **Auto-Approve:** No

### implementer

- **Required Evidence:** `code_change`, `test_result`
- **Minimum Evidence Count:** 2
- **Manual Override:** Not Allowed
- **Auto-Approve:** Yes (when requirements met)

### reviewer-a

- **Required Evidence:** `review_comment`, `test_result`
- **Minimum Evidence Count:** 2
- **Manual Override:** Allowed
- **Auto-Approve:** No

### operator

- **Required Evidence:** `deployment_record`
- **Minimum Evidence Count:** 1
- **Manual Override:** Not Allowed
- **Auto-Approve:** Yes (when requirements met)

### reviewer-b

- **Required Evidence:** `review_comment`, `manual_verification`
- **Minimum Evidence Count:** 2
- **Manual Override:** Allowed
- **Auto-Approve:** No

## Validation Rules

### GateCompletion

A valid `GateCompletion` must include:

- `gate`: One of the defined gate types
- `status`: One of the completion statuses
- `storyId`: Non-empty string identifier
- `sessionId`: Non-empty string identifier
- `completedAt`: Positive number (timestamp)
- `evidence`: Array of evidence items (can be empty only for `pending` status)

### Evidence

A valid `GateEvidence` must include:

- `type`: One of the evidence types
- `description`: Non-empty string description
- `timestamp`: Positive number (timestamp)

Optional fields:

- `source`: String identifying the source
- `payload`: Object with additional data

### Status-Specific Rules

- `rejected` status requires `reviewerNotes`
- `needs_revision` status requires `reviewerNotes`
- Non-`pending` statuses require evidence that meets gate requirements

## Type Guards

```typescript
isGate(value: unknown): value is Gate
isCompletionStatus(value: unknown): value is CompletionStatus
isEvidenceType(value: unknown): value is EvidenceType
isGateCompletion(value: unknown): value is GateCompletion
isGateEvidence(value: unknown): value is GateEvidence
```

## Validation Functions

```typescript
validateGateCompletion(completion: unknown): 
  { valid: true } | { valid: false; error: string }

validateEvidence(evidence: unknown): 
  { valid: true } | { valid: false; error: string }
```

## Helper Functions

```typescript
getGateRequirements(gate: Gate): GateRequirements
canAutoApprove(gate: Gate, evidence: GateEvidence[]): boolean
createGateCompletion(
  gate: Gate,
  storyId: string,
  sessionId: string,
  status: CompletionStatus,
  evidence: GateEvidence[],
  options?: { reviewerNotes?: string; metadata?: Record<string, unknown> }
): GateCompletion
createGateEvidence(
  type: EvidenceType,
  description: string,
  options?: { source?: string; payload?: Record<string, unknown> }
): GateEvidence
```

## Example Usage

```typescript
import { 
  createGateCompletion, 
  createGateEvidence,
  validateGateCompletion,
  canAutoApprove
} from './domain/gate-contracts.js';

// Create evidence items
const codeEvidence = createGateEvidence('code_change', 'Added new API endpoint');
const testEvidence = createGateEvidence('test_result', 'All 42 tests passed');

// Create gate completion
const completion = createGateCompletion(
  'implementer',
  'story-123',
  'session-abc',
  'approved',
  [codeEvidence, testEvidence]
);

// Validate the completion
const validation = validateGateCompletion(completion);
if (validation.valid) {
  console.log('Completion is valid!');
}

// Check if auto-approve is possible
if (canAutoApprove('implementer', [codeEvidence, testEvidence])) {
  console.log('Can auto-approve this gate!');
}
```

## API Integration

When submitting gate completion via API:

1. Include `X-Idempotency-Key` header
2. Ensure all required evidence types are provided
3. For `rejected` or `needs_revision` status, include `reviewerNotes`
4. Validate locally before submission using `validateGateCompletion`

## Error Handling

Validation errors return descriptive messages:

- Missing required fields
- Invalid field types
- Insufficient evidence count
- Missing required evidence types
- Missing `reviewerNotes` for rejection statuses
