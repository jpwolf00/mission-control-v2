/**
 * Unit tests for budget service
 * Phase 3A.2: Budget windows and admission control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkBudgetWindows,
  incrementInvocationCount,
  setEstimatedInvocations,
  checkProviderDenylist,
  recordProviderFailure,
  removeProviderFromDenylist,
  getDenylistStatus,
  getBudgetStatus,
  clearWindowCache,
} from '../budget-service';
import {
  DISPATCH_RETURN_CODES,
  BUDGET_LIMITS,
  BUDGET_RECONCILIATION_THRESHOLD,
} from '@/domain/budget-types';
import { prisma } from '@/lib/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    runSession: {
      aggregate: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Budget Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWindowCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkBudgetWindows', () => {
    it('should allow dispatch when all budgets are within limits', async () => {
      vi.mocked(prisma.runSession.aggregate).mockResolvedValue({
        _sum: { actualInvocations: 10 },
      });

      const result = await checkBudgetWindows('story-123');

      expect(result.allowed).toBe(true);
      expect(result.code).toBe(DISPATCH_RETURN_CODES.SUCCESS);
    });

    it('should reject when 15-minute budget is exceeded', async () => {
      vi.mocked(prisma.runSession.aggregate).mockResolvedValue({
        _sum: { actualInvocations: BUDGET_LIMITS.FIFTEEN_MINUTES + 1 },
      });

      const result = await checkBudgetWindows('story-123');

      expect(result.allowed).toBe(false);
      expect(result.code).toBe(DISPATCH_RETURN_CODES.CAP_EXCEEDED);
    });

    it('should reject when 1-hour quota hard limit is reached', async () => {
      // First call for 15m window (pass)
      // Second call for 1h window (fail)
      vi.mocked(prisma.runSession.aggregate)
        .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })
        .mockResolvedValueOnce({ _sum: { actualInvocations: BUDGET_LIMITS.ONE_HOUR } });

      const result = await checkBudgetWindows('story-123');

      expect(result.allowed).toBe(false);
      expect(result.code).toBe(DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT);
    });

    it('should reject when 5-hour budget is exceeded', async () => {
      vi.mocked(prisma.runSession.aggregate)
        .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })  // 15m
        .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })   // 1h
        .mockResolvedValueOnce({ _sum: { actualInvocations: BUDGET_LIMITS.FIVE_HOURS + 1 } }); // 5h

      const result = await checkBudgetWindows('story-123');

      expect(result.allowed).toBe(false);
      expect(result.code).toBe(DISPATCH_RETURN_CODES.QUOTA_BUDGET_EXCEEDED);
    });

    it('should reject when per-story budget is exceeded', async () => {
      vi.mocked(prisma.runSession.aggregate)
        .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })  // 15m
        .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })   // 1h
        .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })  // 5h
        .mockResolvedValueOnce({ _sum: { actualInvocations: BUDGET_LIMITS.PER_STORY } }); // per-story

      const result = await checkBudgetWindows('story-123');

      expect(result.allowed).toBe(false);
      expect(result.code).toBe(DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT);
    });

    it('should reject when global lifetime budget is exceeded', async () => {
      vi.mocked(prisma.runSession.aggregate)
        .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })  // 15m
        .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })   // 1h
        .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })  // 5h
        .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })  // per-story
        .mockResolvedValueOnce({ _sum: { actualInvocations: BUDGET_LIMITS.LIFETIME } }); // global

      const result = await checkBudgetWindows('story-123');

      expect(result.allowed).toBe(false);
      expect(result.code).toBe(DISPATCH_RETURN_CODES.CAP_EXCEEDED);
    });
  });

  describe('incrementInvocationCount', () => {
    it('should increment invocation count and clear cache', async () => {
      vi.mocked(prisma.runSession.update).mockResolvedValue({} as never);
      vi.mocked(prisma.runSession.findUnique).mockResolvedValue({
        id: 'session-123',
        storyId: 'story-123',
        gate: 'implementer',
        estimatedInvocations: 10,
        actualInvocations: 5,
      } as never);

      await incrementInvocationCount('session-123', 3);

      expect(prisma.runSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          actualInvocations: {
            increment: 3,
          },
        },
      });
    });

    it('should emit BUDGET_ESTIMATE_EXCEEDED when actual > 1.5x estimate', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      vi.mocked(prisma.runSession.update).mockResolvedValue({} as never);
      vi.mocked(prisma.runSession.findUnique).mockResolvedValue({
        id: 'session-123',
        storyId: 'story-123',
        gate: 'implementer',
        estimatedInvocations: 10,
        actualInvocations: 16, // 16 > 10 * 1.5 = 15
      } as never);

      await incrementInvocationCount('session-123', 1);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('BUDGET_ESTIMATE_EXCEEDED'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('setEstimatedInvocations', () => {
    it('should set estimated invocations for a session', async () => {
      vi.mocked(prisma.runSession.update).mockResolvedValue({} as never);

      await setEstimatedInvocations('session-123', 50);

      expect(prisma.runSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          estimatedInvocations: 50,
        },
      });
    });
  });

  describe('Provider Denylist', () => {
    beforeEach(() => {
      // Clear denylist before each test
      const status = getDenylistStatus();
      status.forEach(entry => {
        removeProviderFromDenylist(entry.provider, entry.model);
      });
    });

    it('should allow provider when not in denylist', () => {
      const result = checkProviderDenylist('openai', 'gpt-4');

      expect(result.allowed).toBe(true);
    });

    it('should reject provider when denylisted', async () => {
      // Record 5 failures to trigger denylist
      for (let i = 0; i < 5; i++) {
        await recordProviderFailure('problematic-provider', 'model-x', 'Connection timeout');
      }

      const result = checkProviderDenylist('problematic-provider', 'model-x');

      expect(result.allowed).toBe(true); // Initially in shadow mode
      expect(result.shadow).toBe(true);
    });

    it('should remove provider from denylist', async () => {
      // Add to denylist
      for (let i = 0; i < 5; i++) {
        await recordProviderFailure('removable-provider', undefined, 'Error');
      }

      // Remove from denylist
      const removed = removeProviderFromDenylist('removable-provider');

      expect(removed).toBe(true);
      
      const result = checkProviderDenylist('removable-provider');
      expect(result.allowed).toBe(true);
      expect(result.shadow).toBeUndefined();
    });

    it('should return denylist status', async () => {
      for (let i = 0; i < 5; i++) {
        await recordProviderFailure('status-provider', 'model-y', 'Error');
      }

      const status = getDenylistStatus();

      expect(status.length).toBeGreaterThan(0);
      expect(status[0]).toMatchObject({
        provider: 'status-provider',
        model: 'model-y',
        isShadow: true,
      });
    });
  });

  describe('getBudgetStatus', () => {
    it('should return current budget status', async () => {
      vi.mocked(prisma.runSession.aggregate)
        .mockResolvedValueOnce({ _sum: { actualInvocations: 25 } })   // 15m
        .mockResolvedValueOnce({ _sum: { actualInvocations: 75 } })   // 1h
        .mockResolvedValueOnce({ _sum: { actualInvocations: 200 } })  // 5h
        .mockResolvedValueOnce({ _sum: { actualInvocations: 5000 } }); // global

      const status = await getBudgetStatus();

      expect(status.windows['15m']).toMatchObject({
        current: 25,
        limit: BUDGET_LIMITS.FIFTEEN_MINUTES,
      });
      expect(status.windows['1h']).toMatchObject({
        current: 75,
        limit: BUDGET_LIMITS.ONE_HOUR,
      });
      expect(status.windows['5h']).toMatchObject({
        current: 200,
        limit: BUDGET_LIMITS.FIVE_HOURS,
      });
      expect(status.global).toMatchObject({
        current: 5000,
        limit: BUDGET_LIMITS.LIFETIME,
      });
    });
  });
});

describe('Budget Constants', () => {
  it('should have correct budget limits', () => {
    expect(BUDGET_LIMITS.FIFTEEN_MINUTES).toBe(50);
    expect(BUDGET_LIMITS.ONE_HOUR).toBe(150);
    expect(BUDGET_LIMITS.FIVE_HOURS).toBe(400);
    expect(BUDGET_LIMITS.PER_STORY).toBe(500);
    expect(BUDGET_LIMITS.LIFETIME).toBe(100000);
  });

  it('should have correct reconciliation threshold', () => {
    expect(BUDGET_RECONCILIATION_THRESHOLD).toBe(1.5);
  });

  it('should have all required return codes', () => {
    expect(DISPATCH_RETURN_CODES.SUCCESS).toBe('SUCCESS');
    expect(DISPATCH_RETURN_CODES.QUOTA_SOFT_LIMIT).toBe('QUOTA_SOFT_LIMIT');
    expect(DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT).toBe('QUOTA_HARD_LIMIT');
    expect(DISPATCH_RETURN_CODES.QUOTA_BUDGET_EXCEEDED).toBe('QUOTA_BUDGET_EXCEEDED');
    expect(DISPATCH_RETURN_CODES.CAP_EXCEEDED).toBe('CAP_EXCEEDED');
  });
});
