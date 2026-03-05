# Deploy Control Service - MC2-E7

## Overview

The Deploy Control Service provides enterprise-grade deployment management with operator approval workflows, rollback capabilities, and post-deploy verification checklists.

## Features

### 1. Deployment Record Model

Full lifecycle tracking for every deployment:

```typescript
interface DeploymentRecord {
  id: string;
  storyId: string;
  featureBranch: string;
  targetEnvironment: 'staging' | 'production';
  commitSha: string;
  commitMessage: string;
  initiatedBy: string;
  status: DeploymentStatus;
  
  // Approval fields
  approvedBy?: string;
  approvedAt?: string;
  approvalComment?: string;
  
  // Deployment fields
  deployedAt?: string;
  deployedBy?: string;
  
  // Rollback fields
  rolledBackAt?: string;
  rolledBackBy?: string;
  rollbackToSha?: string;
  rollbackReason?: string;
  
  // Verification fields
  verificationChecklist?: VerificationChecklist;
  verifiedAt?: string;
  verifiedBy?: string;
}
```

### 2. Operator Approval Flow

Production deployments require explicit operator approval:

```
pending-approval → approved → deploying → verifying → verified
                                    ↓              ↓
                              rolled-back     failed
```

**Key behaviors:**
- Staging deployments auto-approve (no approval required)
- Production deployments require operator role to approve
- Only `operator` role can approve/reject deployments
- Approval includes optional comment and reason for rejection

### 3. Rollback to SHA

Rollback capability for rapid incident response:

```typescript
// Initiate rollback to previous stable SHA
const rollback = initiateRollback({
  deploymentId: 'dep-123',
  requestedBy: 'operator-1',
  targetSha: 'abc123',  // Previous stable commit
  reason: 'Critical bug in payment flow'
});
```

**Features:**
- Can rollback from any active state (deploying, verifying, verified, failed)
- Tracks previous SHA for audit trail
- Records rollback reason and operator
- Status transitions to `rolled-back`

### 4. Post-Deploy Verification Checklist

Automated verification before marking deployment complete:

```typescript
interface VerificationChecklist {
  // Health checks
  healthEndpoint: boolean;
  healthEndpointDetails?: string;
  
  // Service-specific checks
  apiResponding: boolean;
  apiResponseTime?: number;
  
  // Database/migrations
  migrationsComplete: boolean;
  migrationsError?: string;
  
  // Error tracking
  errorRateAcceptable: boolean;
  errorRate?: number;
  errorRateThreshold: number;
  
  // Custom checks
  customChecks: Record<string, boolean>;
  
  // Summary
  allPassed: boolean;
  failedItems: string[];
  verifiedAt?: string;
}
```

**Verification results:**
- All checks pass → status becomes `verified`
- Any check fails → status becomes `failed`
- Failed items are tracked for debugging

## Usage Examples

### Creating a Deployment

```typescript
import { createDeployment, DEFAULT_DEPLOY_CONTROL_CONFIG } from './deploy-control';

const deployment = createDeployment({
  storyId: 'MC2-E7',
  featureBranch: 'feat/e7-deploy-control',
  targetEnvironment: 'production',  // Requires approval
  commitSha: 'abc123def',
  commitMessage: 'feat: add deploy control',
  initiatedBy: 'implementer-1',
  config: DEFAULT_DEPLOY_CONTROL_CONFIG
});
```

### Requesting Approval

```typescript
import { requestApproval } from './deploy-control';

const approval = requestApproval({
  deploymentId: deployment.id,
  requestedBy: 'implementer-1',
  comment: 'Ready for production deploy',
  riskAssessment: 'medium',
  rollbackPlan: 'Revert to previous SHA if issues'
});
```

### Approving (Operator Only)

```typescript
import { respondToApproval } from './deploy-control';

const response = respondToApproval({
  deploymentId: deployment.id,
  approved: true,
  approverRole: 'operator',  // Must be operator
  approverId: 'operator-1',
  comment: 'LGTM, proceed with deploy'
});
```

### Starting Deployment

```typescript
import { startDeployment } from './deploy-control';

const started = startDeployment({
  deploymentId: deployment.id,
  startedBy: 'operator-1'
});
```

### Running Verification

```typescript
import { runVerification } from './deploy-control';

const verified = runVerification({
  deploymentId: deployment.id,
  checklist: {
    healthEndpoint: true,
    healthEndpointDetails: 'All endpoints responding',
    apiResponding: true,
    apiResponseTime: 120,
    migrationsComplete: true,
    errorRateAcceptable: true,
    errorRate: 0.05,
    errorRateThreshold: 1.0,
    customChecks: {
      'database-connected': true,
      'cache-warming': true
    }
  },
  verifiedBy: 'operator-1'
});

if (verified.verificationChecklist?.allPassed) {
  console.log('Deployment verified successfully!');
} else {
  console.log('Failed checks:', verified.verificationChecklist?.failedItems);
}
```

### Rollback

```typescript
import { initiateRollback } from './deploy-control';

const rollback = initiateRollback({
  deploymentId: deployment.id,
  requestedBy: 'operator-1',
  targetSha: 'previous-stable-sha',
  reason: 'Critical bug detected in production'
});
```

## Configuration

```typescript
interface DeployControlConfig {
  /** Minimum approvers required (default: 1) */
  minApprovers: number;
  
  /** Allowed deployers (by role) */
  allowedDeployers: string[];
  
  /** Environments that require approval */
  requireApprovalFor: DeploymentEnvironment[];
  
  /** Verification timeout in ms */
  verificationTimeoutMs: number;
  
  /** Maximum deploy history to keep */
  maxHistorySize: number;
}

const DEFAULT_DEPLOY_CONTROL_CONFIG: DeployControlConfig = {
  minApprovers: 1,
  allowedDeployers: ['operator', 'system'],
  requireApprovalFor: ['production'],
  verificationTimeoutMs: 5 * 60 * 1000,  // 5 minutes
  maxHistorySize: 100
};
```

## API Reference

| Function | Description |
|----------|-------------|
| `createDeployment()` | Creates new deployment record |
| `requestApproval()` | Creates approval request for pending deployment |
| `respondToApproval()` | Operator approves/rejects deployment |
| `startDeployment()` | Transitions approved → deploying |
| `initiateRollback()` | Rolls back to specific SHA |
| `runVerification()` | Runs post-deploy verification checklist |
| `getDeployment()` | Gets deployment by ID |
| `getAllDeployments()` | Gets all deployments (sorted by date) |
| `getDeploymentsByStatus()` | Filters deployments by status |
| `getPendingApprovals()` | Gets all pending approval requests |

## Testing

Run tests with:

```bash
npm test -- src/services/deploy-control.test.ts
```

## Integration Points

- **Gate Contracts**: Deployment status integrates with gate completion workflow
- **Health Checks**: Verification checklist references health endpoint
- **Audit Trail**: All approval/rollback actions tracked with timestamps
