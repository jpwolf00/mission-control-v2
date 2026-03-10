/**
 * Tests for Recovery Service - Anomaly Detection and Escalation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GATE_HEARTBEAT_CONFIGS,
  detectStaleSessions,
  detectDuplicateRuns,
  detectCallbackTimeouts,
  detectGhostLocks,
  detectCascadingFailures,
} from '../recovery-service';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    runSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    storyEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    story: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  sendSlackNotification: vi.fn(),
  sendEmailNotification: vi.fn(),
}));

describe('Recovery Service', () => {
  describe('GATE_HEARTBEAT_CONFIGS', () => {
    it('should have config for all gates', () => {
      const gates = ['architect', 'implementer', 'reviewer-a', 'operator', 'reviewer-b', 'ui-designer'];
      
      for (const gate of gates) {
        expect(GATE_HEARTBEAT_CONFIGS[gate as keyof typeof GATE_HEARTBEAT_CONFIGS]).toBeDefined();
      }
    });

    it('should give operator longer threshold than other gates', () => {
      const operatorThreshold = GATE_HEARTBEAT_CONFIGS.operator.thresholdMs;
      const implementerThreshold = GATE_HEARTBEAT_CONFIGS.implementer.thresholdMs;
      const reviewerThreshold = GATE_HEARTBEAT_CONFIGS['reviewer-a'].thresholdMs;

      expect(operatorThreshold).toBeGreaterThan(implementerThreshold);
      expect(operatorThreshold).toBeGreaterThan(reviewerThreshold);
    });

    it('should have warning threshold at 80% of main threshold', () => {
      for (const config of Object.values(GATE_HEARTBEAT_CONFIGS)) {
        const expectedWarning = config.thresholdMs * 0.8;
        expect(config.warningThresholdMs).toBeCloseTo(expectedWarning, 0);
      }
    });
  });



  describe('detectStaleSessions', () => {
    it('should detect sessions with no heartbeat', async () => {
      const { detectStaleSessions } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.runSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          storyId: 'story-1',
          gate: 'implementer',
          status: 'active',
          startedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
          lastHeartbeatAt: null,
          story: {
            id: 'story-1',
            title: 'Test Story',
            gates: [],
          },
        },
      ]);

      const anomalies = await detectStaleSessions();
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('stale_session');
      expect(anomalies[0].sessionId).toBe('session-1');
    });

    it('should detect sessions with old heartbeat', async () => {
      const { detectStaleSessions } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.runSession.findMany).mockResolvedValue([
        {
          id: 'session-2',
          storyId: 'story-2',
          gate: 'reviewer-a',
          status: 'active',
          startedAt: new Date(Date.now() - 30 * 60 * 1000),
          lastHeartbeatAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          story: {
            id: 'story-2',
            title: 'Test Story 2',
            gates: [],
          },
        },
      ]);

      const anomalies = await detectStaleSessions();
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('stale_session');
      expect(anomalies[0].severity).toBe('high');
    });

    it('should not detect recent heartbeats as stale', async () => {
      const { detectStaleSessions } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.runSession.findMany).mockResolvedValue([
        {
          id: 'session-3',
          storyId: 'story-3',
          gate: 'implementer',
          status: 'active',
          startedAt: new Date(Date.now() - 10 * 60 * 1000),
          lastHeartbeatAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
          story: {
            id: 'story-3',
            title: 'Test Story 3',
            gates: [],
          },
        },
      ]);

      const anomalies = await detectStaleSessions();
      
      expect(anomalies.length).toBe(0);
    });

    it('should give operator sessions longer leash', async () => {
      const { detectStaleSessions } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      // Operator session with 25 minute old heartbeat (should NOT be stale - threshold is 30 min)
      // Implementer session with 25 minute old heartbeat (SHOULD be stale - threshold is 20 min)
      vi.mocked(prisma.runSession.findMany).mockResolvedValue([
        {
          id: 'session-operator',
          storyId: 'story-operator',
          gate: 'operator',
          status: 'active',
          startedAt: new Date(Date.now() - 40 * 60 * 1000),
          lastHeartbeatAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          story: {
            id: 'story-operator',
            title: 'Operator Story',
            gates: [],
          },
        },
        {
          id: 'session-implementer',
          storyId: 'story-implementer',
          gate: 'implementer',
          status: 'active',
          startedAt: new Date(Date.now() - 40 * 60 * 1000),
          lastHeartbeatAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          story: {
            id: 'story-implementer',
            title: 'Implementer Story',
            gates: [],
          },
        },
      ]);

      const anomalies = await detectStaleSessions();
      
      // Only implementer should be flagged (25 min > 20 min threshold)
      // Operator should NOT be flagged (25 min < 30 min threshold)
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].gate).toBe('implementer');
    });
  });

  describe('detectDuplicateRuns', () => {
    it('should detect duplicate active sessions for same story+gate', async () => {
      const { detectDuplicateRuns } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          story_id: 'story-1',
          gate: 'implementer',
          count: 2,
          session_ids: ['session-1', 'session-2'],
        },
      ]);

      const anomalies = await detectDuplicateRuns();
      
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].type).toBe('duplicate_run');
      expect(anomalies[0].storyId).toBe('story-1');
      expect(anomalies[0].details.duplicateSessionIds).toEqual(['session-1', 'session-2']);
    });

    it('should not flag single sessions', async () => {
      const { detectDuplicateRuns } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const anomalies = await detectDuplicateRuns();
      
      expect(anomalies.length).toBe(0);
    });
  });

  describe('detectCallbackTimeouts', () => {
    it('should detect sessions running too long without callback', async () => {
      const { detectCallbackTimeouts } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      
      vi.mocked(prisma.runSession.findMany).mockResolvedValue([
        {
          id: 'session-long',
          storyId: 'story-long',
          gate: 'implementer',
          status: 'active',
          startedAt: new Date(Date.now() - 50 * 60 * 1000), // 50 minutes ago
          lastHeartbeatAt: null,
          story: {
            id: 'story-long',
            title: 'Long Running Story',
          },
        },
      ]);

      const anomalies = await detectCallbackTimeouts();
      
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].type).toBe('callback_timeout');
      expect(anomalies[0].severity).toBe('critical');
    });

    it('should not flag recent sessions', async () => {
      const { detectCallbackTimeouts } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      // When database query finds no sessions older than 45 min, return empty array
      // (the WHERE clause filters out recent sessions at the DB level)
      
      vi.mocked(prisma.runSession.findMany).mockResolvedValue([]);

      const anomalies = await detectCallbackTimeouts();
      
      expect(anomalies.length).toBe(0);
    });
  });

  describe('detectGhostLocks', () => {
    it('should detect locks without active sessions', async () => {
      const { detectGhostLocks } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          story_id: 'story-ghost',
          gate: 'reviewer-a',
          session_id: 'session-dead',
          locked_at: new Date(Date.now() - 60 * 60 * 1000),
        },
      ]);

      const anomalies = await detectGhostLocks();
      
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].type).toBe('ghost_lock');
      expect(anomalies[0].storyId).toBe('story-ghost');
    });
  });

  describe('detectCascadingFailures', () => {
    it('should detect multiple failures in short time', async () => {
      const { detectCascadingFailures } = await import('../recovery-service');
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.runSession.findMany).mockResolvedValue([
        {
          id: 'session-fail-1',
          storyId: 'story-fail',
          gate: 'implementer',
          status: 'failed',
          endedAt: new Date(Date.now() - 30 * 60 * 1000),
          story: {
            id: 'story-fail',
            title: 'Failing Story',
            sessions: [
              {
                id: 'session-fail-1',
                gate: 'implementer',
                endedAt: new Date(Date.now() - 30 * 60 * 1000),
                provider: 'alibaba',
                model: 'qwen3.5-plus',
              },
              {
                id: 'session-fail-2',
                gate: 'implementer',
                endedAt: new Date(Date.now() - 45 * 60 * 1000),
                provider: 'minimax',
                model: 'minimax-m2.5',
              },
            ],
          },
        },
      ]);

      const anomalies = await detectCascadingFailures();
      
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].type).toBe('cascading_failure');
      expect(anomalies[0].severity).toBe('critical');
    });
  });
});
