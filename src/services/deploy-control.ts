/**
 * Deploy Control Service - MC2-E7
 * 
 * Provides deployment control with:
 * - Deployment record model with full lifecycle tracking
 * - Operator approval flow (requires approval before deploy)
 * - Rollback to specific SHA functionality
 * - Post-deploy verification checklist
 */

// Simple ID generator
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Deployment status throughout lifecycle
 */
export type DeploymentStatus = 
  | 'pending-approval'
  | 'approved'
  | 'deploying'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'rolled-back';

/**
 * Environment types
 */
export type DeploymentEnvironment = 'staging' | 'production';

/**
 * A recorded deployment with full lifecycle
 */
export interface DeploymentRecord {
  id: string;
  storyId: string;
  featureBranch: string;
  targetEnvironment: DeploymentEnvironment;
  commitSha: string;
  commitMessage: string;
  initiatedBy: string;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt: string;
  
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
  
  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Post-deploy verification checklist items
 */
export interface VerificationChecklist {
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

/**
 * Approval request for a deployment
 */
export interface ApprovalRequest {
  deploymentId: string;
  requestedBy: string;
  requestedAt: string;
  comment?: string;
  storyId: string;
  featureBranch: string;
  targetEnvironment: DeploymentEnvironment;
  commitSha: string;
  commitMessage: string;
  riskAssessment: 'low' | 'medium' | 'high';
  rollbackPlan?: string;
}

/**
 * Approval response
 */
export interface ApprovalResponse {
  deploymentId: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  comment?: string;
  reason?: string;
}

/**
 * Rollback request
 */
export interface RollbackRequest {
  deploymentId: string;
  requestedBy: string;
  targetSha: string;
  reason: string;
  immediate?: boolean;
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean;
  deploymentId: string;
  previousSha: string;
  targetSha: string;
  rolledBackAt: string;
  rolledBackBy: string;
  message: string;
}

/**
 * Deploy control configuration
 */
export interface DeployControlConfig {
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

// ============================================================================
// In-Memory State
// ============================================================================

let deployments: Map<string, DeploymentRecord> = new Map();
let approvalRequests: Map<string, ApprovalRequest> = new Map();

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Creates a new deployment record (initiates deploy request)
 */
export function createDeployment(params: {
  storyId: string;
  featureBranch: string;
  targetEnvironment: DeploymentEnvironment;
  commitSha: string;
  commitMessage: string;
  initiatedBy: string;
  config: DeployControlConfig;
}): DeploymentRecord {
  const now = new Date().toISOString();
  const id = generateId();
  
  // Determine if approval is required
  const requiresApproval = params.config.requireApprovalFor.includes(params.targetEnvironment);
  
  const deployment: DeploymentRecord = {
    id,
    storyId: params.storyId,
    featureBranch: params.featureBranch,
    targetEnvironment: params.targetEnvironment,
    commitSha: params.commitSha,
    commitMessage: params.commitMessage,
    initiatedBy: params.initiatedBy,
    status: requiresApproval ? 'pending-approval' : 'approved',
    createdAt: now,
    updatedAt: now,
    metadata: {}
  };
  
  // Auto-approve if not required
  if (!requiresApproval) {
    deployment.approvedBy = 'system';
    deployment.approvedAt = now;
    deployment.approvalComment = 'Auto-approved: no approval required for this environment';
  }
  
  deployments.set(id, deployment);
  
  // Manage max history size
  pruneHistory(params.config.maxHistorySize);
  
  return deployment;
}

/**
 * Requests approval for a deployment
 */
export function requestApproval(params: {
  deploymentId: string;
  requestedBy: string;
  comment?: string;
  riskAssessment: 'low' | 'medium' | 'high';
  rollbackPlan?: string;
}): ApprovalRequest | null {
  const deployment = deployments.get(params.deploymentId);
  
  if (!deployment) {
    return null;
  }
  
  if (deployment.status !== 'pending-approval') {
    return null;
  }
  
  const request: ApprovalRequest = {
    deploymentId: params.deploymentId,
    requestedBy: params.requestedBy,
    requestedAt: new Date().toISOString(),
    comment: params.comment,
    storyId: deployment.storyId,
    featureBranch: deployment.featureBranch,
    targetEnvironment: deployment.targetEnvironment,
    commitSha: deployment.commitSha,
    commitMessage: deployment.commitMessage,
    riskAssessment: params.riskAssessment,
    rollbackPlan: params.rollbackPlan
  };
  
  approvalRequests.set(params.deploymentId, request);
  
  return request;
}

/**
 * Approves or rejects a deployment (operator approval flow)
 */
export function respondToApproval(params: {
  deploymentId: string;
  approved: boolean;
  approverRole: string;
  approverId: string;
  comment?: string;
  reason?: string;
}): ApprovalResponse | null {
  const deployment = deployments.get(params.deploymentId);
  
  if (!deployment) {
    return null;
  }
  
  if (deployment.status !== 'pending-approval') {
    return null;
  }
  
  // Check if approver is authorized
  if (!params.approverRole.includes('operator')) {
    return {
      deploymentId: params.deploymentId,
      approved: false,
      reason: 'Only operators can approve deployments'
    };
  }
  
  const now = new Date().toISOString();
  
  if (params.approved) {
    deployment.status = 'approved';
    deployment.approvedBy = params.approverId;
    deployment.approvedAt = now;
    deployment.approvalComment = params.comment;
    deployment.updatedAt = now;
  } else {
    deployment.status = 'failed';
    deployment.updatedAt = now;
  }
  
  deployments.set(params.deploymentId, deployment);
  
  return {
    deploymentId: params.deploymentId,
    approved: params.approved,
    approvedBy: params.approverId,
    approvedAt: params.approved ? now : undefined,
    comment: params.comment,
    reason: params.reason
  };
}

/**
 * Marks deployment as started (transitions from approved to deploying)
 */
export function startDeployment(params: {
  deploymentId: string;
  startedBy: string;
}): DeploymentRecord | null {
  const deployment = deployments.get(params.deploymentId);
  
  if (!deployment) {
    return null;
  }
  
  if (deployment.status !== 'approved') {
    return null;
  }
  
  const now = new Date().toISOString();
  deployment.status = 'deploying';
  deployment.deployedAt = now;
  deployment.deployedBy = params.startedBy;
  deployment.updatedAt = now;
  
  deployments.set(params.deploymentId, deployment);
  
  return deployment;
}

/**
 * Initiates rollback to a specific SHA
 */
export function initiateRollback(params: {
  deploymentId: string;
  requestedBy: string;
  targetSha: string;
  reason: string;
  immediate?: boolean;
}): RollbackResult | null {
  const deployment = deployments.get(params.deploymentId);
  
  if (!deployment) {
    return null;
  }
  
  // Can rollback from any active state
  if (!['deploying', 'verifying', 'verified', 'failed'].includes(deployment.status)) {
    return null;
  }
  
  const now = new Date().toISOString();
  
  // Store previous SHA for reference
  const previousSha = deployment.commitSha;
  
  // Update deployment with rollback info
  deployment.status = 'rolled-back';
  deployment.rolledBackAt = now;
  deployment.rolledBackBy = params.requestedBy;
  deployment.rollbackToSha = params.targetSha;
  deployment.rollbackReason = params.reason;
  deployment.updatedAt = now;
  
  deployments.set(params.deploymentId, deployment);
  
  return {
    success: true,
    deploymentId: params.deploymentId,
    previousSha,
    targetSha: params.targetSha,
    rolledBackAt: now,
    rolledBackBy: params.requestedBy,
    message: `Rollback to ${params.targetSha} initiated by ${params.requestedBy}`
  };
}

/**
 * Runs post-deploy verification checklist
 */
export function runVerification(params: {
  deploymentId: string;
  checklist: Partial<VerificationChecklist>;
  verifiedBy: string;
}): DeploymentRecord | null {
  const deployment = deployments.get(params.deploymentId);
  
  if (!deployment) {
    return null;
  }
  
  if (deployment.status !== 'deploying' && deployment.status !== 'verifying') {
    return null;
  }
  
  const now = new Date().toISOString();
  
  // Build complete checklist with defaults
  const fullChecklist: VerificationChecklist = {
    healthEndpoint: params.checklist.healthEndpoint ?? false,
    healthEndpointDetails: params.checklist.healthEndpointDetails,
    apiResponding: params.checklist.apiResponding ?? false,
    apiResponseTime: params.checklist.apiResponseTime,
    migrationsComplete: params.checklist.migrationsComplete ?? false,
    migrationsError: params.checklist.migrationsError,
    errorRateAcceptable: params.checklist.errorRateAcceptable ?? false,
    errorRate: params.checklist.errorRate,
    errorRateThreshold: params.checklist.errorRateThreshold ?? 1.0,
    customChecks: params.checklist.customChecks ?? {},
    allPassed: false,
    failedItems: [],
    verifiedAt: now
  };
  
  // Determine overall pass/fail
  const checks = [
    fullChecklist.healthEndpoint,
    fullChecklist.apiResponding,
    fullChecklist.migrationsComplete,
    fullChecklist.errorRateAcceptable
  ];
  
  // Check custom checks
  const customCheckValues = Object.values(fullChecklist.customChecks);
  const allCustomPassed = customCheckValues.length === 0 || customCheckValues.every(v => v);
  
  fullChecklist.allPassed = checks.every(c => c) && allCustomPassed;
  
  // Collect failed items
  if (!fullChecklist.healthEndpoint) fullChecklist.failedItems.push('Health endpoint check');
  if (!fullChecklist.apiResponding) fullChecklist.failedItems.push('API responding');
  if (!fullChecklist.migrationsComplete) fullChecklist.failedItems.push('Migrations complete');
  if (!fullChecklist.errorRateAcceptable) fullChecklist.failedItems.push('Error rate acceptable');
  
  for (const [key, passed] of Object.entries(fullChecklist.customChecks)) {
    if (!passed) fullChecklist.failedItems.push(`Custom check: ${key}`);
  }
  
  // Update deployment
  deployment.status = fullChecklist.allPassed ? 'verified' : 'failed';
  deployment.verificationChecklist = fullChecklist;
  deployment.verifiedAt = now;
  deployment.verifiedBy = params.verifiedBy;
  deployment.updatedAt = now;
  
  deployments.set(params.deploymentId, deployment);
  
  return deployment;
}

/**
 * Gets deployment by ID
 */
export function getDeployment(id: string): DeploymentRecord | undefined {
  return deployments.get(id);
}

/**
 * Gets all deployments
 */
export function getAllDeployments(): DeploymentRecord[] {
  return Array.from(deployments.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Gets deployments by status
 */
export function getDeploymentsByStatus(status: DeploymentStatus): DeploymentRecord[] {
  return Array.from(deployments.values())
    .filter(d => d.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Gets pending approvals for an operator
 */
export function getPendingApprovals(): ApprovalRequest[] {
  return Array.from(approvalRequests.values()).filter(req => {
    const deployment = deployments.get(req.deploymentId);
    return deployment?.status === 'pending-approval';
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Prunes old deployments to maintain max history size
 */
function pruneHistory(maxSize: number): void {
  if (deployments.size <= maxSize) {
    return;
  }
  
  const sorted = getAllDeployments();
  const toRemove = sorted.slice(maxSize);
  
  for (const dep of toRemove) {
    deployments.delete(dep.id);
    approvalRequests.delete(dep.id);
  }
}

/**
 * Clears all mock data (for testing)
 */
export function clearDeployments(): void {
  deployments.clear();
  approvalRequests.clear();
}

/**
 * Gets current deployment state (for testing)
 */
export function getDeploymentState(): {
  deployments: DeploymentRecord[];
  pendingApprovals: ApprovalRequest[];
} {
  return {
    deployments: getAllDeployments(),
    pendingApprovals: getPendingApprovals()
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_DEPLOY_CONTROL_CONFIG: DeployControlConfig = {
  minApprovers: 1,
  allowedDeployers: ['operator', 'system'],
  requireApprovalFor: ['production'],
  verificationTimeoutMs: 5 * 60 * 1000, // 5 minutes
  maxHistorySize: 100
};
