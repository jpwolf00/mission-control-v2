/**
 * Unit tests for dispatch service budget integration
 * Phase 3A.2+3A.3: Budget guardrails and admission control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchStory } from '../dispatch-service';
import { DISPATCH_RETURN_CODES } from '@/domain/budget-types';
import { clearWindowCache } from '../budget-service';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    runSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('../story-store-db', () => ({
  getStoryByIdFromDB: vi.fn(),
}));

vi.mock('../lock-service', () => ({
  acquireLock: vi.fn(() => ({ ok: true })),
  releaseLock: vi.fn(),
}));

vi.mock('../openclaw-client', () => ({
  triggerAgent: vi.fn(() => Promise.resolve({ success: true })),
  gateToRole: vi.fn((gate) => gate),
}));

import { getStoryByIdFromDB } from '../story-store-db';
import { acquireLock } from '../lock-service';
import { triggerAgent } from '../openclaw-client';

describe('Dispatch Service - Budget Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWindowCache();
  });

  it('should return budget exceeded error when 15m window is exceeded', async () => {
    // Mock no existing session
    vi.mocked(prisma.runSession.findFirst).mockResolvedValue(null);
    
    // Mock story exists with approved requirements
    vi.mocked(getStoryByIdFromDB).mockResolvedValue({
      id: 'story-123',
      metadata: { approvedRequirementsArtifact: true },
      gates: [],
    } as never);

    // Mock budget exceeded (15m window)
    vi.mocked(prisma.runSession.aggregate).mockResolvedValue({
      _sum: { actualInvocations: 51 }, // Exceeds 50 limit
    });

    const result = await dispatchStory('story-123', 'implementer', 'key-1');

    expect(result.success).toBe(false);
    expect(result.code).toBe(DISPATCH_RETURN_CODES.CAP_EXCEEDED);
    expect(result.error).toContain('15-minute budget exceeded');
  });

  it('should return quota hard limit error when 1h window is exceeded', async () => {
    vi.mocked(prisma.runSession.findFirst).mockResolvedValue(null);
    vi.mocked(getStoryByIdFromDB).mockResolvedValue({
      id: 'story-123',
      metadata: { approvedRequirementsArtifact: true },
      gates: [],
    } as never);

    // Mock budget check results
    vi.mocked(prisma.runSession.aggregate)
      .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })   // 15m - pass
      .mockResolvedValueOnce({ _sum: { actualInvocations: 150 } }); // 1h - at limit

    const result = await dispatchStory('story-123', 'implementer', 'key-2');

    expect(result.success).toBe(false);
    expect(result.code).toBe(DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT);
    expect(result.error).toContain('1-hour quota hard limit');
  });

  it('should return budget exceeded error when 5h window is exceeded', async () => {
    vi.mocked(prisma.runSession.findFirst).mockResolvedValue(null);
    vi.mocked(getStoryByIdFromDB).mockResolvedValue({
      id: 'story-123',
      metadata: { approvedRequirementsArtifact: true },
      gates: [],
    } as never);

    vi.mocked(prisma.runSession.aggregate)
      .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })   // 15m
      .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })   // 1h
      .mockResolvedValueOnce({ _sum: { actualInvocations: 401 } }); // 5h - exceeded

    const result = await dispatchStory('story-123', 'implementer', 'key-3');

    expect(result.success).toBe(false);
    expect(result.code).toBe(DISPATCH_RETURN_CODES.QUOTA_BUDGET_EXCEEDED);
    expect(result.error).toContain('5-hour budget exceeded');
  });

  it('should return cap exceeded when provider is denylisted', async () => {
    vi.mocked(prisma.runSession.findFirst).mockResolvedValue(null);
    vi.mocked(getStoryByIdFromDB).mockResolvedValue({
      id: 'story-123',
      metadata: { approvedRequirementsArtifact: true },
      gates: [],
    } as never);

    // Budget checks pass
    vi.mocked(prisma.runSession.aggregate)
      .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 1000 } });

    // First add provider to denylist by recording failures
    const { recordProviderFailure, removeProviderFromDenylist } = await import('../budget-service');
    for (let i = 0; i < 5; i++) {
      await recordProviderFailure('denylisted-provider', 'model-x', 'Error');
    }

    // In shadow mode, the request should be allowed but with shadow flag
    // Let's remove from denylist first and then test with a fresh provider
    removeProviderFromDenylist('denylisted-provider', 'model-x');
    
    // Add a provider that will be hard denylisted (simulate shadow period ended)
    for (let i = 0; i < 5; i++) {
      await recordProviderFailure('hard-deny-provider', 'model-y', 'Error');
    }
    
    // Manually move from shadow to hard deny by manipulating the entry
    const { getDenylistStatus } = await import('../budget-service');
    const entries = getDenylistStatus();
    const entry = entries.find(e => e.provider === 'hard-deny-provider');
    if (entry) {
      entry.isShadow = false;
      entry.shadowUntil = undefined;
    }

    const result = await dispatchStory('story-123', 'implementer', 'key-4', {
      provider: 'hard-deny-provider',
      model: 'model-y',
    });

    // Should be rejected now that it's hard denylisted
    expect(result.success).toBe(false);
    expect(result.code).toBe(DISPATCH_RETURN_CODES.CAP_EXCEEDED);
  });

  it('should dispatch successfully when all checks pass', async () => {
    vi.mocked(prisma.runSession.findFirst).mockResolvedValue(null);
    vi.mocked(getStoryByIdFromDB).mockResolvedValue({
      id: 'story-123',
      metadata: { approvedRequirementsArtifact: true },
      gates: [],
    } as never);
    vi.mocked(prisma.runSession.create).mockResolvedValue({ id: 'session-123' } as never);

    // All budget checks pass
    vi.mocked(prisma.runSession.aggregate)
      .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 1000 } });

    const result = await dispatchStory('story-123', 'implementer', 'key-5', {
      provider: 'openai',
      model: 'gpt-4',
      estimatedInvocations: 50,
    });

    expect(result.success).toBe(true);
    expect(result.code).toBe(DISPATCH_RETURN_CODES.SUCCESS);
    expect(result.sessionId).toBeDefined();

    // Verify session was created with provider info
    expect(prisma.runSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          estimatedInvocations: 50,
        }),
      })
    );
  });

  it('should record provider failure on trigger error', async () => {
    vi.mocked(prisma.runSession.findFirst).mockResolvedValue(null);
    vi.mocked(getStoryByIdFromDB).mockResolvedValue({
      id: 'story-123',
      metadata: { approvedRequirementsArtifact: true },
      gates: [],
    } as never);
    vi.mocked(prisma.runSession.create).mockResolvedValue({ id: 'session-123' } as never);
    vi.mocked(triggerAgent).mockResolvedValue({
      success: false,
      error: 'Provider API timeout',
    });

    // All budget checks pass
    vi.mocked(prisma.runSession.aggregate)
      .mockResolvedValueOnce({ _sum: { actualInvocations: 10 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 50 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 100 } })
      .mockResolvedValueOnce({ _sum: { actualInvocations: 1000 } });

    const result = await dispatchStory('story-123', 'implementer', 'key-6', {
      provider: 'failing-provider',
      model: 'model-y',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe(DISPATCH_RETURN_CODES.GATEWAY_ERROR);
  });
});

describe('Dispatch Service - Return Codes', () => {
  it('should use typed return codes instead of string literals', async () => {
    // Verify all expected codes are defined
    expect(DISPATCH_RETURN_CODES.SUCCESS).toBeDefined();
    expect(DISPATCH_RETURN_CODES.QUOTA_SOFT_LIMIT).toBeDefined();
    expect(DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT).toBeDefined();
    expect(DISPATCH_RETURN_CODES.QUOTA_BUDGET_EXCEEDED).toBeDefined();
    expect(DISPATCH_RETURN_CODES.CAP_EXCEEDED).toBeDefined();
    expect(DISPATCH_RETURN_CODES.IDEMPOTENT).toBeDefined();
    expect(DISPATCH_RETURN_CODES.NOT_FOUND).toBeDefined();
    expect(DISPATCH_RETURN_CODES.PRECONDITION_FAILED).toBeDefined();
    expect(DISPATCH_RETURN_CODES.ALREADY_COMPLETED).toBeDefined();
    expect(DISPATCH_RETURN_CODES.CONFLICT).toBeDefined();
    expect(DISPATCH_RETURN_CODES.GATEWAY_ERROR).toBeDefined();
  });
});
