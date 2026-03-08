/**
 * Budget window types and constants for invocation budget guardrails
 * Phase 3A.2: Budget windows and admission control
 */

// Time windows in milliseconds
export const BUDGET_WINDOWS = {
  FIFTEEN_MINUTES: 15 * 60 * 1000,      // 15 minutes
  ONE_HOUR: 60 * 60 * 1000,              // 1 hour
  FIVE_HOURS: 5 * 60 * 60 * 1000,        // 5 hours
} as const;

// Budget limits per window
export const BUDGET_LIMITS = {
  // Per-window limits
  FIFTEEN_MINUTES: 50,    // Max invocations in 15 min window
  ONE_HOUR: 150,          // Max invocations in 1 hour window
  FIVE_HOURS: 400,        // Max invocations in 5 hour window
  
  // Per-story limit
  PER_STORY: 500,         // Max invocations per story lifetime
  
  // Global lifetime limit (safety valve)
  LIFETIME: 100000,       // Max total invocations across all time
} as const;

// Budget estimate reconciliation threshold
// Emit warning when actual > 1.5x estimated
export const BUDGET_RECONCILIATION_THRESHOLD = 1.5;

// Provider denylist configuration
export const PROVIDER_DENYLIST_CONFIG = {
  // Shadow mode duration before hard deny (4 hours)
  SHADOW_DURATION_MS: 4 * 60 * 60 * 1000,
  
  // Operator warning lead time (2 hours before shadow ends)
  OPERATOR_WARNING_LEAD_MS: 2 * 60 * 60 * 1000,
  
  // Max failures before adding to denylist
  MAX_FAILURES: 5,
  
  // Failure window for counting (15 minutes)
  FAILURE_WINDOW_MS: 15 * 60 * 1000,
} as const;

// Dispatch admission check return codes
export const DISPATCH_RETURN_CODES = {
  // Success
  SUCCESS: 'SUCCESS',
  
  // Quota/budget exceeded codes
  QUOTA_SOFT_LIMIT: 'QUOTA_SOFT_LIMIT',       // Approaching limit, warn but allow
  QUOTA_HARD_LIMIT: 'QUOTA_HARD_LIMIT',         // At limit, reject new dispatches
  QUOTA_BUDGET_EXCEEDED: 'QUOTA_BUDGET_EXCEEDED', // Budget exceeded
  CAP_EXCEEDED: 'CAP_EXCEEDED',                 // Hard cap exceeded
  
  // Other codes (existing)
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  CONFLICT: 'CONFLICT',
  GATEWAY_ERROR: 'GATEWAY_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  IDEMPOTENT: 'IDEMPOTENT',
} as const;

export type DispatchReturnCode = typeof DISPATCH_RETURN_CODES[keyof typeof DISPATCH_RETURN_CODES];

// Budget window counter type
export interface BudgetWindow {
  windowStart: Date;
  windowEnd: Date;
  windowType: '15m' | '1h' | '5h';
  invocationCount: number;
  limit: number;
}

// Budget check result
export interface BudgetCheckResult {
  allowed: boolean;
  code: DispatchReturnCode;
  window?: BudgetWindow;
  message?: string;
  currentUsage?: number;
  limit?: number;
}

// Provider denylist entry
export interface ProviderDenylistEntry {
  provider: string;
  model?: string;
  addedAt: Date;
  reason: string;
  failureCount: number;
  shadowUntil?: Date;  // If set, in shadow mode until this time
  isShadow: boolean;
}

// Budget estimate vs actual tracking
export interface BudgetReconciliation {
  sessionId: string;
  storyId: string;
  gate: string;
  estimatedInvocations: number;
  actualInvocations: number;
  exceededAt?: Date;
  threshold: number;
}

// Signal types for budget events
export const BUDGET_SIGNALS = {
  BUDGET_ESTIMATE_EXCEEDED: 'BUDGET_ESTIMATE_EXCEEDED',
  BUDGET_SOFT_LIMIT_WARNING: 'BUDGET_SOFT_LIMIT_WARNING',
  BUDGET_HARD_LIMIT_REACHED: 'BUDGET_HARD_LIMIT_REACHED',
  PROVIDER_SHADOW_MODE: 'PROVIDER_SHADOW_MODE',
  PROVIDER_DENYLISTED: 'PROVIDER_DENYLISTED',
  OPERATOR_WARNING: 'OPERATOR_WARNING',
} as const;

export type BudgetSignal = typeof BUDGET_SIGNALS[keyof typeof BUDGET_SIGNALS];

// Signal event structure
export interface BudgetSignalEvent {
  signal: BudgetSignal;
  timestamp: Date;
  payload: Record<string, unknown>;
  severity: 'warning' | 'error' | 'critical';
}
