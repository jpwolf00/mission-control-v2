/**
 * Deploy Control Service Tests - MC2-E7
 */

import {
  createDeployment,
  requestApproval,
  respondToApproval,
  startDeployment,
  initiateRollback,
  runVerification,
  getDeployment,
  getAllDeployments,
  getDeploymentsByStatus,
  getPendingApprovals,
  clearDeployments,
  getDeploymentState,
  DEFAULT_DEPLOY_CONTROL_CONFIG,
  DeploymentRecord,
  DeployControlConfig
} from './deploy-control';

describe('Deploy Control Service', () => {
  let config: DeployControlConfig;

  beforeEach(() => {
    clearDeployments();
    config = { ...DEFAULT_DEPLOY_CONTROL_CONFIG };
  });

  describe('createDeployment', () => {
    it('should create a deployment for staging without approval', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      expect(deployment.id).toBeDefined();
      expect(deployment.storyId).toBe('MC2-E7');
      expect(deployment.status).toBe('approved');
      expect(deployment.approvedBy).toBe('system');
      expect(deployment.approvedAt).toBeDefined();
    });

    it('should create a deployment for production requiring approval', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      expect(deployment.status).toBe('pending-approval');
      expect(deployment.approvedBy).toBeUndefined();
    });

    it('should auto-approve when config says no approval needed', () => {
      const configNoApproval = { ...config, requireApprovalFor: [] as any };
      
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config: configNoApproval
      });

      expect(deployment.status).toBe('approved');
    });
  });

  describe('requestApproval', () => {
    it('should create an approval request for pending deployment', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const approval = requestApproval({
        deploymentId: deployment.id,
        requestedBy: 'implementer-1',
        comment: 'Ready for review',
        riskAssessment: 'low',
        rollbackPlan: 'Revert to previous SHA'
      });

      expect(approval).toBeDefined();
      expect(approval?.deploymentId).toBe(deployment.id);
      expect(approval?.riskAssessment).toBe('low');
    });

    it('should return null for non-pending deployment', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const approval = requestApproval({
        deploymentId: deployment.id,
        requestedBy: 'implementer-1',
        riskAssessment: 'low'
      });

      expect(approval).toBeNull();
    });
  });

  describe('respondToApproval', () => {
    it('should approve a deployment with operator role', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const response = respondToApproval({
        deploymentId: deployment.id,
        approved: true,
        approverRole: 'operator',
        approverId: 'operator-1',
        comment: 'LGTM'
      });

      expect(response?.approved).toBe(true);
      expect(response?.approvedBy).toBe('operator-1');
      
      const updated = getDeployment(deployment.id);
      expect(updated?.status).toBe('approved');
      expect(updated?.approvedBy).toBe('operator-1');
    });

    it('should reject deployment from non-operator', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const response = respondToApproval({
        deploymentId: deployment.id,
        approved: true,
        approverRole: 'implementer',
        approverId: 'implementer-1',
        comment: 'Self-approved'
      });

      expect(response?.approved).toBe(false);
      expect(response?.reason).toContain('Only operators');
    });

    it('should reject when approval flag is false', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const response = respondToApproval({
        deploymentId: deployment.id,
        approved: false,
        approverRole: 'operator',
        approverId: 'operator-1',
        reason: 'Missing tests'
      });

      expect(response?.approved).toBe(false);
      
      const updated = getDeployment(deployment.id);
      expect(updated?.status).toBe('failed');
    });
  });

  describe('startDeployment', () => {
    it('should transition approved deployment to deploying', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const started = startDeployment({
        deploymentId: deployment.id,
        startedBy: 'operator-1'
      });

      expect(started?.status).toBe('deploying');
      expect(started?.deployedAt).toBeDefined();
      expect(started?.deployedBy).toBe('operator-1');
    });

    it('should return null for non-approved deployment', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const started = startDeployment({
        deploymentId: deployment.id,
        startedBy: 'operator-1'
      });

      expect(started).toBeNull();
    });
  });

  describe('initiateRollback', () => {
    it('should rollback to a specific SHA', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      startDeployment({ deploymentId: deployment.id, startedBy: 'operator-1' });

      const rollback = initiateRollback({
        deploymentId: deployment.id,
        requestedBy: 'operator-1',
        targetSha: 'xyz789',
        reason: 'Critical bug found'
      });

      expect(rollback?.success).toBe(true);
      expect(rollback?.targetSha).toBe('xyz789');
      expect(rollback?.previousSha).toBe('abc123');
      
      const updated = getDeployment(deployment.id);
      expect(updated?.status).toBe('rolled-back');
      expect(updated?.rollbackToSha).toBe('xyz789');
      expect(updated?.rollbackReason).toBe('Critical bug found');
    });

    it('should return null for non-existent deployment', () => {
      const rollback = initiateRollback({
        deploymentId: 'non-existent',
        requestedBy: 'operator-1',
        targetSha: 'xyz789',
        reason: 'Test'
      });

      expect(rollback).toBeNull();
    });
  });

  describe('runVerification', () => {
    it('should mark deployment as verified when all checks pass', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      startDeployment({ deploymentId: deployment.id, startedBy: 'operator-1' });

      const verified = runVerification({
        deploymentId: deployment.id,
        checklist: {
          healthEndpoint: true,
          healthEndpointDetails: 'OK',
          apiResponding: true,
          apiResponseTime: 150,
          migrationsComplete: true,
          errorRateAcceptable: true,
          errorRate: 0.1,
          customChecks: { 'database-connected': true }
        },
        verifiedBy: 'operator-1'
      });

      expect(verified?.status).toBe('verified');
      expect(verified?.verificationChecklist?.allPassed).toBe(true);
      expect(verified?.verificationChecklist?.failedItems).toHaveLength(0);
    });

    it('should mark deployment as failed when checks fail', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      startDeployment({ deploymentId: deployment.id, startedBy: 'operator-1' });

      const verified = runVerification({
        deploymentId: deployment.id,
        checklist: {
          healthEndpoint: false,
          apiResponding: false,
          migrationsComplete: true,
          errorRateAcceptable: true,
          customChecks: { 'database-connected': false }
        },
        verifiedBy: 'operator-1'
      });

      expect(verified?.status).toBe('failed');
      expect(verified?.verificationChecklist?.allPassed).toBe(false);
      expect(verified?.verificationChecklist?.failedItems).toContain('Health endpoint check');
      expect(verified?.verificationChecklist?.failedItems).toContain('API responding');
      expect(verified?.verificationChecklist?.failedItems).toContain('Custom check: database-connected');
    });

    it('should track error rate correctly', () => {
      const deployment = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'staging',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      startDeployment({ deploymentId: deployment.id, startedBy: 'operator-1' });

      // Error rate above threshold should fail
      const verified = runVerification({
        deploymentId: deployment.id,
        checklist: {
          healthEndpoint: true,
          apiResponding: true,
          migrationsComplete: true,
          errorRateAcceptable: false,
          errorRate: 5.0,
          errorRateThreshold: 1.0
        },
        verifiedBy: 'operator-1'
      });

      expect(verified?.verificationChecklist?.failedItems).toContain('Error rate acceptable');
    });
  });

  describe('getDeploymentsByStatus', () => {
    it('should filter deployments by status', () => {
      createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      createDeployment({
        storyId: 'MC2-E6',
        featureBranch: 'feat/e6-other',
        targetEnvironment: 'staging',
        commitSha: 'def456',
        commitMessage: 'feat: other feature',
        initiatedBy: 'implementer-1',
        config
      });

      const pending = getDeploymentsByStatus('pending-approval');
      const approved = getDeploymentsByStatus('approved');

      expect(pending).toHaveLength(1);
      expect(pending[0].storyId).toBe('MC2-E7');
      expect(approved).toHaveLength(1);
      expect(approved[0].storyId).toBe('MC2-E6');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return all pending approval requests', () => {
      const dep1 = createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      const dep2 = createDeployment({
        storyId: 'MC2-E8',
        featureBranch: 'feat/e8-other',
        targetEnvironment: 'production',
        commitSha: 'def456',
        commitMessage: 'feat: other',
        initiatedBy: 'implementer-2',
        config
      });

      requestApproval({
        deploymentId: dep1.id,
        requestedBy: 'implementer-1',
        riskAssessment: 'low'
      });

      const pending = getPendingApprovals();
      expect(pending).toHaveLength(1);
      expect(pending[0].storyId).toBe('MC2-E7');
    });
  });

  describe('clearDeployments', () => {
    it('should clear all deployment data', () => {
      createDeployment({
        storyId: 'MC2-E7',
        featureBranch: 'feat/e7-deploy-control',
        targetEnvironment: 'production',
        commitSha: 'abc123',
        commitMessage: 'feat: add deploy control',
        initiatedBy: 'implementer-1',
        config
      });

      clearDeployments();

      const all = getAllDeployments();
      expect(all).toHaveLength(0);
    });
  });
});
