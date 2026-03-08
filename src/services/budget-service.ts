/**
 * Budget service - DB-backed invocation budget tracking and enforcement
 * Phase 3A.2: Budget windows and admission control
 */

import { prisma } from '@/lib/prisma';
import {
  BUDGET_WINDOWS,
  BUDGET_LIMITS,
  BUDGET_RECONCILIATION_THRESHOLD,
  DISPATCH_RETURN_CODES,
  BUDGET_SIGNALS,
  type BudgetCheckResult,
  type BudgetWindow,
  type BudgetSignalEvent,
  type ProviderDenylistEntry,
} from '@/domain/budget-types';

// In-memory cache for budget windows (reduces DB queries)
const windowCache = new Map<string, { count: number; expiresAt: number }>();

/**
 * Clear the window cache (useful for testing)
 */
export function clearWindowCache(): void {
  windowCache.clear();
}

/**
 * Get cache key for a window
 */
function getWindowCacheKey(windowType: '15m' | '1h' | '5h', windowStart: Date): string {
  return `${windowType}:${windowStart.toISOString()}`;
}

/**
 * Calculate window boundaries
 */
function getWindowBoundaries(windowType: '15m' | '1h' | '5h', now: Date = new Date()): { start: Date; end: Date } {
  const windowMs = windowType === '15m' 
    ? BUDGET_WINDOWS.FIFTEEN_MINUTES 
    : windowType === '1h' 
      ? BUDGET_WINDOWS.ONE_HOUR 
      : BUDGET_WINDOWS.FIVE_HOURS;
  
  // Round down to window boundary
  const timestamp = now.getTime();
  const windowStart = Math.floor(timestamp / windowMs) * windowMs;
  
  return {
    start: new Date(windowStart),
    end: new Date(windowStart + windowMs),
  };
}

/**
 * Count invocations in a time window using DB
 */
async function countInvocationsInWindow(
  start: Date,
  end: Date,
  storyId?: string
): Promise<number> {
  const where: Record<string, unknown> = {
    startedAt: {
      gte: start,
      lt: end,
    },
    status: {
      in: ['active', 'completed'],
    },
  };
  
  if (storyId) {
    where.storyId = storyId;
  }
  
  const result = await prisma.runSession.aggregate({
    where,
    _sum: {
      actualInvocations: true,
    },
  });
  
  return result._sum.actualInvocations || 0;
}

/**
 * Get or create budget window counter
 */
async function getBudgetWindow(
  windowType: '15m' | '1h' | '5h',
  now: Date = new Date()
): Promise<BudgetWindow> {
  const { start, end } = getWindowBoundaries(windowType, now);
  const cacheKey = getWindowCacheKey(windowType, start);
  
  // Check cache first
  const cached = windowCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      windowStart: start,
      windowEnd: end,
      windowType,
      invocationCount: cached.count,
      limit: windowType === '15m' 
        ? BUDGET_LIMITS.FIFTEEN_MINUTES 
        : windowType === '1h' 
          ? BUDGET_LIMITS.ONE_HOUR 
          : BUDGET_LIMITS.FIVE_HOURS,
    };
  }
  
  // Query DB for actual count
  const count = await countInvocationsInWindow(start, end);
  
  // Cache for 30 seconds
  windowCache.set(cacheKey, {
    count,
    expiresAt: Date.now() + 30000,
  });
  
  return {
    windowStart: start,
    windowEnd: end,
    windowType,
    invocationCount: count,
    limit: windowType === '15m' 
      ? BUDGET_LIMITS.FIFTEEN_MINUTES 
      : windowType === '1h' 
        ? BUDGET_LIMITS.ONE_HOUR 
        : BUDGET_LIMITS.FIVE_HOURS,
  };
}

/**
 * Check all budget windows for admission
 */
export async function checkBudgetWindows(storyId: string): Promise<BudgetCheckResult> {
  const now = new Date();
  
  // Check 15-minute window
  const window15m = await getBudgetWindow('15m', now);
  if (window15m.invocationCount >= BUDGET_LIMITS.FIFTEEN_MINUTES) {
    return {
      allowed: false,
      code: DISPATCH_RETURN_CODES.CAP_EXCEEDED,
      window: window15m,
      currentUsage: window15m.invocationCount,
      limit: BUDGET_LIMITS.FIFTEEN_MINUTES,
      message: `15-minute budget exceeded: ${window15m.invocationCount}/${BUDGET_LIMITS.FIFTEEN_MINUTES}`,
    };
  }
  
  // Soft limit warning at 80% for 15m window
  if (window15m.invocationCount >= BUDGET_LIMITS.FIFTEEN_MINUTES * 0.8) {
    await emitBudgetSignal({
      signal: BUDGET_SIGNALS.BUDGET_SOFT_LIMIT_WARNING,
      timestamp: now,
      payload: {
        windowType: '15m',
        currentUsage: window15m.invocationCount,
        limit: BUDGET_LIMITS.FIFTEEN_MINUTES,
        storyId,
      },
      severity: 'warning',
    });
  }
  
  // Check 1-hour window
  const window1h = await getBudgetWindow('1h', now);
  if (window1h.invocationCount >= BUDGET_LIMITS.ONE_HOUR) {
    return {
      allowed: false,
      code: DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT,
      window: window1h,
      currentUsage: window1h.invocationCount,
      limit: BUDGET_LIMITS.ONE_HOUR,
      message: `1-hour quota hard limit reached: ${window1h.invocationCount}/${BUDGET_LIMITS.ONE_HOUR}`,
    };
  }
  
  // Soft limit warning at 90% for 1h window
  if (window1h.invocationCount >= BUDGET_LIMITS.ONE_HOUR * 0.9) {
    await emitBudgetSignal({
      signal: BUDGET_SIGNALS.BUDGET_SOFT_LIMIT_WARNING,
      timestamp: now,
      payload: {
        windowType: '1h',
        currentUsage: window1h.invocationCount,
        limit: BUDGET_LIMITS.ONE_HOUR,
        storyId,
      },
      severity: 'warning',
    });
  }
  
  // Check 5-hour window
  const window5h = await getBudgetWindow('5h', now);
  if (window5h.invocationCount >= BUDGET_LIMITS.FIVE_HOURS) {
    return {
      allowed: false,
      code: DISPATCH_RETURN_CODES.QUOTA_BUDGET_EXCEEDED,
      window: window5h,
      currentUsage: window5h.invocationCount,
      limit: BUDGET_LIMITS.FIVE_HOURS,
      message: `5-hour budget exceeded: ${window5h.invocationCount}/${BUDGET_LIMITS.FIVE_HOURS}`,
    };
  }
  
  // Check per-story lifetime budget
  const storyTotal = await prisma.runSession.aggregate({
    where: { storyId },
    _sum: { actualInvocations: true },
  });
  const storyInvocations = storyTotal._sum.actualInvocations || 0;
  
  if (storyInvocations >= BUDGET_LIMITS.PER_STORY) {
    return {
      allowed: false,
      code: DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT,
      currentUsage: storyInvocations,
      limit: BUDGET_LIMITS.PER_STORY,
      message: `Per-story budget exceeded: ${storyInvocations}/${BUDGET_LIMITS.PER_STORY}`,
    };
  }
  
  // Soft limit at 90% for per-story budget
  if (storyInvocations >= BUDGET_LIMITS.PER_STORY * 0.9) {
    await emitBudgetSignal({
      signal: BUDGET_SIGNALS.BUDGET_SOFT_LIMIT_WARNING,
      timestamp: now,
      payload: {
        type: 'per-story',
        currentUsage: storyInvocations,
        limit: BUDGET_LIMITS.PER_STORY,
        storyId,
      },
      severity: 'warning',
    });
  }
  
  // Check global lifetime budget
  const globalTotal = await prisma.runSession.aggregate({
    _sum: { actualInvocations: true },
  });
  const globalInvocations = globalTotal._sum.actualInvocations || 0;
  
  if (globalInvocations >= BUDGET_LIMITS.LIFETIME) {
    return {
      allowed: false,
      code: DISPATCH_RETURN_CODES.CAP_EXCEEDED,
      currentUsage: globalInvocations,
      limit: BUDGET_LIMITS.LIFETIME,
      message: `Global lifetime budget exceeded: ${globalInvocations}/${BUDGET_LIMITS.LIFETIME}`,
    };
  }
  
  // All checks passed
  return {
    allowed: true,
    code: DISPATCH_RETURN_CODES.SUCCESS,
    message: 'Budget check passed',
  };
}

/**
 * Increment invocation count for a session
 */
export async function incrementInvocationCount(
  sessionId: string,
  count: number = 1
): Promise<void> {
  await prisma.runSession.update({
    where: { id: sessionId },
    data: {
      actualInvocations: {
        increment: count,
      },
    },
  });
  
  // Invalidate cache for all windows
  windowCache.clear();
  
  // Check for budget estimate reconciliation
  await checkBudgetReconciliation(sessionId);
}

/**
 * Check if actual invocations exceed estimated by threshold
 */
async function checkBudgetReconciliation(sessionId: string): Promise<void> {
  const session = await prisma.runSession.findUnique({
    where: { id: sessionId },
  });
  
  if (!session) return;
  
  const estimated = session.estimatedInvocations || 0;
  const actual = session.actualInvocations || 0;
  
  // Skip if no estimate or threshold not exceeded
  if (estimated === 0) return;
  
  const threshold = estimated * BUDGET_RECONCILIATION_THRESHOLD;
  
  if (actual > threshold) {
    await emitBudgetSignal({
      signal: BUDGET_SIGNALS.BUDGET_ESTIMATE_EXCEEDED,
      timestamp: new Date(),
      payload: {
        sessionId,
        storyId: session.storyId,
        gate: session.gate,
        estimatedInvocations: estimated,
        actualInvocations: actual,
        threshold: BUDGET_RECONCILIATION_THRESHOLD,
        exceededBy: actual - threshold,
      },
      severity: 'error',
    });
  }
}

/**
 * Set estimated invocations for a session
 */
export async function setEstimatedInvocations(
  sessionId: string,
  estimate: number
): Promise<void> {
  await prisma.runSession.update({
    where: { id: sessionId },
    data: {
      estimatedInvocations: estimate,
    },
  });
}

// In-memory provider denylist (would be DB-backed in production)
const providerDenylist = new Map<string, ProviderDenylistEntry>();
const providerFailures = new Map<string, { count: number; firstFailure: Date }[]>();

/**
 * Check if provider is denylisted
 */
export function checkProviderDenylist(provider: string, model?: string): {
  allowed: boolean;
  shadow?: boolean;
  reason?: string;
} {
  const key = model ? `${provider}:${model}` : provider;
  const entry = providerDenylist.get(key);
  
  if (!entry) {
    return { allowed: true };
  }
  
  const now = new Date();
  
  // Check if still in shadow mode
  if (entry.isShadow && entry.shadowUntil) {
    if (entry.shadowUntil > now) {
      return {
        allowed: true, // Allow but shadow (log/monitor)
        shadow: true,
        reason: `Provider ${key} in shadow mode until ${entry.shadowUntil.toISOString()}`,
      };
    }
    // Shadow period ended, move to hard deny
    entry.isShadow = false;
  }
  
  return {
    allowed: false,
    reason: `Provider ${key} is denylisted: ${entry.reason}`,
  };
}

/**
 * Record provider failure and potentially add to denylist
 */
export async function recordProviderFailure(
  provider: string,
  model: string | undefined,
  error: string
): Promise<void> {
  const key = model ? `${provider}:${model}` : provider;
  const now = new Date();
  
  // Get or initialize failure history
  let failures = providerFailures.get(key) || [];
  
  // Add new failure
  failures.push({
    count: 1,
    firstFailure: now,
  });
  
  // Clean up old failures outside the window
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000);
  failures = failures.filter(f => f.firstFailure > windowStart);
  
  providerFailures.set(key, failures);
  
  // Check if we should add to denylist
  const totalFailures = failures.reduce((sum, f) => sum + f.count, 0);
  
  if (totalFailures >= 5 && !providerDenylist.has(key)) {
    // Add to denylist in shadow mode first
    const shadowUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    
    providerDenylist.set(key, {
      provider,
      model,
      addedAt: now,
      reason: `Auto-denylisted after ${totalFailures} failures: ${error}`,
      failureCount: totalFailures,
      shadowUntil,
      isShadow: true,
    });
    
    // Emit shadow mode signal
    await emitBudgetSignal({
      signal: BUDGET_SIGNALS.PROVIDER_SHADOW_MODE,
      timestamp: now,
      payload: {
        provider,
        model,
        shadowUntil,
        failureCount: totalFailures,
        reason: error,
      },
      severity: 'warning',
    });
    
    // Schedule operator warning (2 hours before shadow ends)
    setTimeout(() => {
      emitBudgetSignal({
        signal: BUDGET_SIGNALS.OPERATOR_WARNING,
        timestamp: new Date(),
        payload: {
          provider,
          model,
          message: `Provider ${key} will be hard denylisted in 2 hours. Review and intervene if needed.`,
          shadowEndsAt: shadowUntil,
        },
        severity: 'warning',
      });
    }, 2 * 60 * 60 * 1000);
  }
}

/**
 * Remove provider from denylist (operator action)
 */
export function removeProviderFromDenylist(provider: string, model?: string): boolean {
  const key = model ? `${provider}:${model}` : provider;
  const existed = providerDenylist.has(key);
  providerDenylist.delete(key);
  providerFailures.delete(key);
  return existed;
}

/**
 * Get current denylist status
 */
export function getDenylistStatus(): ProviderDenylistEntry[] {
  return Array.from(providerDenylist.values());
}

/**
 * Emit budget signal event
 * In production, this would publish to an event bus or notification system
 */
async function emitBudgetSignal(event: BudgetSignalEvent): Promise<void> {
  // Log to console (replace with actual event emission)
  console.log(`[BUDGET_SIGNAL:${event.signal}] ${event.severity.toUpperCase()}:`, event.payload);
  
  // TODO: Publish to event bus, notification system, etc.
  // await eventBus.publish('budget.signals', event);
}

/**
 * Get current budget status for monitoring
 */
export async function getBudgetStatus(): Promise<{
  windows: {
    '15m': { current: number; limit: number; percentage: number };
    '1h': { current: number; limit: number; percentage: number };
    '5h': { current: number; limit: number; percentage: number };
  };
  global: { current: number; limit: number; percentage: number };
  denylist: ProviderDenylistEntry[];
}> {
  const now = new Date();
  
  const [window15m, window1h, window5h] = await Promise.all([
    getBudgetWindow('15m', now),
    getBudgetWindow('1h', now),
    getBudgetWindow('5h', now),
  ]);
  
  const globalTotal = await prisma.runSession.aggregate({
    _sum: { actualInvocations: true },
  });
  const globalInvocations = globalTotal._sum.actualInvocations || 0;
  
  return {
    windows: {
      '15m': {
        current: window15m.invocationCount,
        limit: BUDGET_LIMITS.FIFTEEN_MINUTES,
        percentage: (window15m.invocationCount / BUDGET_LIMITS.FIFTEEN_MINUTES) * 100,
      },
      '1h': {
        current: window1h.invocationCount,
        limit: BUDGET_LIMITS.ONE_HOUR,
        percentage: (window1h.invocationCount / BUDGET_LIMITS.ONE_HOUR) * 100,
      },
      '5h': {
        current: window5h.invocationCount,
        limit: BUDGET_LIMITS.FIVE_HOURS,
        percentage: (window5h.invocationCount / BUDGET_LIMITS.FIVE_HOURS) * 100,
      },
    },
    global: {
      current: globalInvocations,
      limit: BUDGET_LIMITS.LIFETIME,
      percentage: (globalInvocations / BUDGET_LIMITS.LIFETIME) * 100,
    },
    denylist: getDenylistStatus(),
  };
}
