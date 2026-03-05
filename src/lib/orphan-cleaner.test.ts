/**
 * Orphan Session Cleaner Tests - MC2-E4
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import {
  runOrphanCleaner,
  findOrphanSessions,
  cleanOrphanSessions,
  startOrphanCleanerScheduler,
  stopOrphanCleanerScheduler,
  isOrphanCleanerSchedulerRunning,
  formatIdleTime,
  getOrphanSummary,
  setFileSystemAccess,
  resetFileSystemAccess,
  DEFAULT_ORPHAN_CLEANER_CONFIG,
  type OrphanCleanerConfig,
  type OrphanSession,
} from './orphan-cleaner';
import { prisma } from './prisma';

// Mock the prisma client
vi.mock('./prisma', () => ({
  prisma: {
    agentSession: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    agentEvent: {
      create: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  agentSession: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  agentEvent: {
    create: ReturnType<typeof vi.fn>;
  };
};

describe('Orphan Session Cleaner', () => {
  let config: OrphanCleanerConfig;
  let mockFsAccess: { access: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    // Stop any running scheduler
    stopOrphanCleanerScheduler();
    // Reset filesystem access mock
    resetFileSystemAccess();
    mockFsAccess = { access: vi.fn() };
    setFileSystemAccess(mockFsAccess);
    config = { ...DEFAULT_ORPHAN_CLEANER_CONFIG };
  });

  afterEach(() => {
    stopOrphanCleanerScheduler();
    resetFileSystemAccess();
  });

  describe('formatIdleTime', () => {
    it('should format minutes correctly', () => {
      expect(formatIdleTime(60000)).toBe('1m');
      expect(formatIdleTime(300000)).toBe('5m');
      expect(formatIdleTime(1800000)).toBe('30m');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatIdleTime(3600000)).toBe('1h 0m');
      expect(formatIdleTime(3660000)).toBe('1h 1m');
      expect(formatIdleTime(7200000)).toBe('2h 0m');
    });

    it('should handle never pinged', () => {
      expect(formatIdleTime(Infinity)).toBe('never');
    });
  });

  describe('findOrphanSessions', () => {
    it('should find sessions that exceed idle timeout', async () => {
      const oldDate = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
      
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'WORKING',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          lastPingAt: oldDate,
          sessionFilePath: '/fake/path/session.jsonl',
        },
      ] as any);

      mockFsAccess.access.mockResolvedValue();

      const orphans = await findOrphanSessions(config);

      expect(orphans).toHaveLength(1);
      expect(orphans[0].sessionId).toBe('session-1');
      expect(orphans[0].idleMs).toBeGreaterThan(40 * 60 * 1000);
    });

    it('should not find active sessions within timeout', async () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'WORKING',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          lastPingAt: recentDate,
          sessionFilePath: '/fake/path/session.jsonl',
        },
      ] as any);

      mockFsAccess.access.mockResolvedValue();

      const orphans = await findOrphanSessions(config);

      expect(orphans).toHaveLength(0);
    });

    it('should find sessions with missing files', async () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000);
      
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'WORKING',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          lastPingAt: recentDate,
          sessionFilePath: '/fake/path/missing-session.jsonl',
        },
      ] as any);

      mockFsAccess.access.mockRejectedValue(new Error('ENOENT'));

      const orphans = await findOrphanSessions(config);

      expect(orphans).toHaveLength(1);
      expect(orphans[0].fileExists).toBe(false);
    });

    it('should find sessions that never pinged', async () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          openclawSessionId: null,
          agentType: 'architect',
          storyId: null,
          label: null,
          status: 'IDLE',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          lastPingAt: null,
          sessionFilePath: null,
        },
      ] as any);

      const orphans = await findOrphanSessions(config);

      expect(orphans).toHaveLength(1);
      expect(orphans[0].idleMs).toBe(Infinity);
    });

    it('should exclude completed and error sessions', async () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'COMPLETED',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          sessionFilePath: '/fake/path/session.jsonl',
        },
        {
          id: 'session-2',
          openclawSessionId: 'oc-session-2',
          agentType: 'reviewer',
          storyId: 'story-2',
          label: 'mission-control:story-2',
          status: 'ERROR',
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          sessionFilePath: '/fake/path/session2.jsonl',
        },
      ] as any);

      mockFsAccess.access.mockResolvedValue();

      const orphans = await findOrphanSessions(config);

      expect(orphans).toHaveLength(0);
    });
  });

  describe('cleanOrphanSessions', () => {
    it('should clean orphans in dry-run mode without updating DB', async () => {
      const dryRunConfig = { ...config, dryRun: true };
      
      const orphans: OrphanSession[] = [
        {
          sessionId: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'WORKING',
          startedAt: new Date(),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          idleMs: 45 * 60 * 1000,
          fileExists: true,
        },
      ];

      const { cleaned, errors } = await cleanOrphanSessions(orphans, dryRunConfig);

      expect(cleaned).toHaveLength(1);
      expect(errors).toHaveLength(0);
      expect(mockPrisma.agentSession.update).not.toHaveBeenCalled();
    });

    it('should update session status in non-dry-run mode', async () => {
      const nonDryRunConfig = { ...config, dryRun: false };
      
      const orphans: OrphanSession[] = [
        {
          sessionId: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'WORKING',
          startedAt: new Date(),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          idleMs: 45 * 60 * 1000,
          fileExists: true,
        },
      ];

      vi.mocked(mockPrisma.agentSession.update).mockResolvedValue({
        id: 'session-1',
        status: 'ERROR',
      } as any);
      
      vi.mocked(mockPrisma.agentEvent.create).mockResolvedValue({
        id: 'event-1',
      } as any);

      const { cleaned, errors } = await cleanOrphanSessions(orphans, nonDryRunConfig);

      expect(cleaned).toHaveLength(1);
      expect(mockPrisma.agentSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'ERROR',
          endedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.agentEvent.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const nonDryRunConfig = { ...config, dryRun: false };
      
      const orphans: OrphanSession[] = [
        {
          sessionId: 'session-1',
          openclawSessionId: 'oc-session-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mission-control:story-1',
          status: 'WORKING',
          startedAt: new Date(),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          idleMs: 45 * 60 * 1000,
          fileExists: true,
        },
      ];

      vi.mocked(mockPrisma.agentSession.update).mockRejectedValue(new Error('DB error'));

      const { cleaned, errors } = await cleanOrphanSessions(orphans, nonDryRunConfig);

      expect(cleaned).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Failed to clean session');
    });
  });

  describe('runOrphanCleaner', () => {
    it('should return comprehensive result', async () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([]);
      
      const result = await runOrphanCleaner(config);

      expect(result.success).toBe(true);
      expect(result.checkedAt).toBeDefined();
      expect(result.stats.totalScanned).toBe(config.batchSize);
      expect(result.stats.orphansFound).toBe(0);
      expect(result.stats.sessionsCleaned).toBe(0);
      expect(result.stats.errors).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockRejectedValue(new Error('DB connection failed'));
      
      const result = await runOrphanCleaner(config);

      expect(result.success).toBe(false);
      expect(result.stats.errors).toBeGreaterThan(0);
      expect(result.errorMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Scheduler', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout'] });
    });

    afterEach(() => {
      vi.useRealTimers();
      stopOrphanCleanerScheduler();
    });

    it('should start and stop scheduler', () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([]);

      expect(isOrphanCleanerSchedulerRunning()).toBe(false);
      
      startOrphanCleanerScheduler(config);
      
      // Advance timers to let initial run complete
      vi.advanceTimersByTimeAsync(100);
      
      expect(isOrphanCleanerSchedulerRunning()).toBe(true);
      
      stopOrphanCleanerScheduler();
      
      expect(isOrphanCleanerSchedulerRunning()).toBe(false);
    });

    it('should run immediately on start', () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([]);
      
      const callback = vi.fn();
      
      startOrphanCleanerScheduler(config, callback);

      // Advance timers to trigger initial run (setTimeout(0))
      vi.advanceTimersByTime(0);

      expect(mockPrisma.agentSession.findMany).toHaveBeenCalled();
    });

    it('should not start multiple schedulers', () => {
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([]);
      
      startOrphanCleanerScheduler(config);
      vi.advanceTimersByTimeAsync(100);
      
      startOrphanCleanerScheduler(config); // Should not start another
      vi.advanceTimersByTimeAsync(100);

      expect(isOrphanCleanerSchedulerRunning()).toBe(true);
    });
  });

  describe('getOrphanSummary', () => {
    it('should return summary with counts', async () => {
      vi.mocked(mockPrisma.agentSession.count).mockResolvedValue(5);
      vi.mocked(mockPrisma.agentSession.findMany).mockResolvedValue([
        {
          id: 'session-1',
          openclawSessionId: 'oc-1',
          agentType: 'implementer',
          storyId: 'story-1',
          label: 'mc:story-1',
          status: 'WORKING',
          startedAt: new Date(),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          idleMs: 45 * 60 * 1000,
          fileExists: true,
          sessionFilePath: '/path',
        },
        {
          id: 'session-2',
          openclawSessionId: 'oc-2',
          agentType: 'implementer',
          storyId: 'story-2',
          label: 'mc:story-2',
          status: 'WORKING',
          startedAt: new Date(),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          idleMs: 45 * 60 * 1000,
          fileExists: true,
          sessionFilePath: '/path',
        },
        {
          id: 'session-3',
          openclawSessionId: 'oc-3',
          agentType: 'architect',
          storyId: 'story-3',
          label: 'mc:story-3',
          status: 'WORKING',
          startedAt: new Date(),
          lastPingAt: new Date(Date.now() - 45 * 60 * 1000),
          idleMs: 45 * 60 * 1000,
          fileExists: true,
          sessionFilePath: '/path',
        },
      ] as any);

      mockFsAccess.access.mockResolvedValue();

      const summary = await getOrphanSummary();

      expect(summary.activeSessions).toBe(5);
      expect(summary.orphanedSessions).toBe(3);
      expect(summary.byAgentType).toEqual({
        implementer: 2,
        architect: 1,
      });
      expect(summary.oldestOrphan).not.toBeNull();
    });
  });
});
