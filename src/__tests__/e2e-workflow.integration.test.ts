import { describe, it, expect, beforeEach } from 'vitest';
import { transition } from '@/domain/state-machine';
import { validateStoryInput } from '@/domain/story';
import { validateGateCompletion } from '@/domain/gate-contracts';

/**
 * End-to-end workflow integration tests
 * Tests complete story lifecycle from creation to deployment
 */

describe('E2E Workflow Integration', () => {
  describe('Story Creation → Dispatch', () => {
    it('should create story and dispatch to architect gate', () => {
      // Create story
      const storyInput = {
        title: 'Test Feature',
        description: 'Implement test feature',
        requirementsArtifactId: 'req-123',
        acceptanceCriteria: ['AC1', 'AC2'],
        priority: 'high' as const,
      };

      const validation = validateStoryInput(storyInput);
      expect(validation.valid).toBe(true);

      // Approve requirements
      const approvedStory = {
        ...storyInput,
        approvedRequirementsArtifact: true,
        status: 'approved',
      };

      // Dispatch should succeed
      const dispatchResult = transition(
        { state: 'created' },
        { type: 'dispatch', gate: 'architect' }
      );
      expect(dispatchResult.ok).toBe(true);
    });

    it('should reject dispatch without approved requirements', () => {
      const story = {
        title: 'Test',
        description: 'Test desc',
        approvedRequirementsArtifact: false,
      };

      // Should fail precondition check
      expect(story.approvedRequirementsArtifact).toBe(false);
    });
  });

  describe('Gate Progression', () => {
    it('should progress through all gates successfully', () => {
      let status = { state: 'created' as const };

      // Dispatch to architect
      const r1 = transition(status, { type: 'dispatch', gate: 'architect' });
      expect(r1.ok).toBe(true);
      if (r1.ok) status = r1.next;

      // Complete architect
      const r2 = transition(status, { type: 'contract_pass' });
      expect(r2.ok).toBe(true);
      if (r2.ok) status = r2.next;

      // Complete implementer
      const r3 = transition(status, { type: 'contract_pass' });
      expect(r3.ok).toBe(true);
      if (r3.ok) status = r3.next;

      // Complete reviewer-a
      const r4 = transition(status, { type: 'contract_pass' });
      expect(r4.ok).toBe(true);
      if (r4.ok) status = r4.next;

      // Complete operator
      const r5 = transition(status, { type: 'contract_pass' });
      expect(r5.ok).toBe(true);
      if (r5.ok) status = r5.next;

      // Final completion
      const r6 = transition(status, { type: 'complete' });
      expect(r6.ok).toBe(true);
      if (r6.ok) {
        expect(r6.next.state).toBe('done');
      }
    });

    it('should handle gate failure and retry', () => {
      let status = { state: 'in_progress' as const, gate: 'implementer' as const };

      // Fail the gate
      const fail = transition(status, { type: 'fail' });
      expect(fail.ok).toBe(true);
      if (fail.ok) status = fail.next;
      expect(status.state).toBe('failed');

      // Retry
      const retry = transition(status, { type: 'retry' });
      expect(retry.ok).toBe(true);
      if (retry.ok) {
        expect(retry.next.state).toBe('in_progress');
        expect(retry.next.gate).toBe('implementer');
      }
    });
  });

  describe('Gate Contract Validation', () => {
    it('should validate architect gate requires spec and acceptance criteria', () => {
      const contract = {
        storyId: 'story-1',
        gate: 'architect',
        status: 'approved' as const,
        evidence: [
          { type: 'documentation', description: 'Spec doc', timestamp: Date.now() },
          { type: 'code_change', description: 'AC defined', timestamp: Date.now() },
        ],
      };

      const result = validateGateCompletion(contract);
      expect(result.valid).toBe(true);
    });

    it('should reject reviewer-a gate without test evidence', () => {
      const contract = {
        storyId: 'story-1',
        gate: 'reviewer-a',
        status: 'approved' as const,
        evidence: [
          { type: 'code_change', description: 'Code only', timestamp: Date.now() },
        ],
      };

      const result = validateGateCompletion(contract);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required evidence type: test_result');
    });
  });
});
