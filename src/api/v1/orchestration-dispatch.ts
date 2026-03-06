import type { Gate } from "../../domain/workflow-types.js";
import { storyStore } from "../../services/story-store.js";
import { LockService } from "../../services/lock-service.js";
import { requireIdempotencyKey, type IdempotencyResult } from "./idempotency.js";
import { 
  validateDispatchPreconditions, 
  type Story 
} from "../../domain/story.js";
import type { LockAcquireResult } from "../../domain/dispatch-lock.js";

/**
 * Input for the dispatch story handler
 */
export type DispatchInput = {
  storyId: string;
  gate: Gate;
  sessionId: string;
  headers: Headers;
};

/**
 * Result of a dispatch operation
 */
export type DispatchResult =
  | { ok: true; story: Story; idempotencyKey: string; lock: LockAcquireResult }
  | { ok: false; error: string; reason: "idempotency" | "not_found" | "precondition" | "lock_conflict" };

/**
 * Deterministic status object for dispatch operations
 */
export type DispatchStatus = {
  storyId: string;
  gate: Gate;
  sessionId: string;
  idempotencyKey: string;
  dispatchedAt: number;
  lockAcquired: boolean;
  lockSessionId?: string;
  lockExpiresAt?: number;
};

/**
 * Create a deterministic status object from dispatch result
 */
function createDispatchStatus(
  storyId: string,
  gate: Gate,
  sessionId: string,
  idempotencyKey: string,
  lockResult: LockAcquireResult
): DispatchStatus {
  return {
    storyId,
    gate,
    sessionId,
    idempotencyKey,
    dispatchedAt: Date.now(),
    lockAcquired: lockResult.ok,
    lockSessionId: lockResult.ok ? lockResult.lock.sessionId : undefined,
    lockExpiresAt: lockResult.ok ? lockResult.lock.lockExpiresAt.getTime() : undefined
  };
}

/**
 * Main dispatch handler for story orchestration.
 * 
 * Validates:
 * 1. Idempotency key is present
 * 2. Story exists in store
 * 3. Dispatch preconditions are met
 * 4. Lock can be acquired
 * 
 * Returns deterministic status object on success.
 */
export function dispatchStoryHandler(input: DispatchInput): DispatchResult {
  const { storyId, gate, sessionId, headers } = input;

  // Step 1: Validate idempotency key
  const idempotencyResult: IdempotencyResult = requireIdempotencyKey(headers);
  if (!idempotencyResult.ok) {
    return {
      ok: false,
      error: idempotencyResult.error || "Idempotency validation failed",
      reason: "idempotency"
    };
  }

  const idempotencyKey = idempotencyResult.key!;

  // Step 2: Validate story exists in store
  const story = storyStore.get(storyId);
  if (!story) {
    return {
      ok: false,
      error: `Story not found: ${storyId}`,
      reason: "not_found"
    };
  }

  // Step 3: Run dispatch preconditions from story domain
  const preconditionResult = validateDispatchPreconditions(story);
  if (!preconditionResult.valid) {
    return {
      ok: false,
      error: preconditionResult.error || "Dispatch preconditions not satisfied",
      reason: "precondition"
    };
  }

  // Step 4: Acquire lock via lock-service
  const lockService = new LockService();
  const lockResult = lockService.acquire(storyId, gate, sessionId);

  if (!lockResult.ok) {
    return {
      ok: false,
      error: `Lock conflict: ${lockResult.reason}`,
      reason: "lock_conflict"
    };
  }

  // Success: return deterministic status object
  return {
    ok: true,
    story,
    idempotencyKey,
    lock: lockResult
  };
}

/**
 * Get the status object from a successful dispatch result
 */
export function getDispatchStatus(result: DispatchResult): DispatchStatus | null {
  if (!result.ok) return null;
  
  // TypeScript narrowing - result.lock exists only when ok is true
  const lockResult = result.lock;
  if (!lockResult.ok) return null;
  
  return createDispatchStatus(
    result.story.id,
    ((result.story.status as { gate?: string }).gate || "architect") as Gate,
    lockResult.lock.sessionId,
    result.idempotencyKey,
    lockResult
  );
}
