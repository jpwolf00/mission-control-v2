import type { Gate } from "../domain/workflow-types";
import type { DispatchLock, LockAcquireResult, LockReleaseResult } from "../domain/dispatch-lock";
import { isLockActive, isLockExpired } from "../domain/dispatch-lock";

/**
 * In-memory store for dispatch locks.
 * In production, this would be backed by Redis or similar.
 */
type LockStore = Map<string, DispatchLock>;

/**
 * Pure TypeScript lock service for managing dispatch locks.
 * Implements story+gate lock semantics with idempotency key behavior.
 */
export class LockService {
  private locks: LockStore;
  private defaultTtlMs: number;

  /**
   * @param defaultTtlMs Default time-to-live for locks in milliseconds (default: 5 minutes)
   */
  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    this.locks = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Generate a composite key for story+gate combination
   */
  private getLockKey(storyId: string, gate: Gate): string {
    return `${storyId}:${gate}`;
  }

  /**
   * Acquire a lock on a story+gate combination.
   *
   * Idempotency behavior:
   * - If the same sessionId already holds the lock, returns success (idempotent)
   * - If a different session holds an active lock, returns conflict
   * - If the existing lock has expired, allows acquisition
   *
   * @param storyId The story to lock
   * @param gate The gate to lock
   * @param sessionId The session requesting the lock
   * @param ttlMs Optional custom TTL in milliseconds
   */
  acquire(
    storyId: string,
    gate: Gate,
    sessionId: string,
    ttlMs?: number
  ): LockAcquireResult {
    const key = this.getLockKey(storyId, gate);
    const existingLock = this.locks.get(key);

    // Idempotency: same session already holds the lock
    if (existingLock && existingLock.sessionId === sessionId && isLockActive(existingLock)) {
      return { ok: true, lock: existingLock };
    }

    // Conflict: different session holds active lock
    if (existingLock && isLockActive(existingLock)) {
      return { ok: false, reason: "conflict", existingLock };
    }

    // Either no lock exists, or existing lock has expired - allow acquisition
    const now = new Date();
    const ttl = ttlMs ?? this.defaultTtlMs;
    const lockExpiresAt = new Date(now.getTime() + ttl);

    const newLock: DispatchLock = {
      storyId,
      gate,
      sessionId,
      lockedAt: now,
      lockExpiresAt,
      releasedAt: null,
      releaseReason: null,
    };

    this.locks.set(key, newLock);
    return { ok: true, lock: newLock };
  }

  /**
   * Release a lock on a story+gate combination.
   *
   * @param storyId The story to unlock
   * @param gate The gate to unlock
   * @param sessionId The session releasing the lock
   * @param releaseReason Reason for release: 'released' | 'superseded'
   */
  release(
    storyId: string,
    gate: Gate,
    sessionId: string,
    releaseReason: "released" | "superseded" = "released"
  ): LockReleaseResult {
    const key = this.getLockKey(storyId, gate);
    const existingLock = this.locks.get(key);

    if (!existingLock) {
      return { ok: false, reason: "not_found" };
    }

    // Check if lock is still active
    if (!isLockActive(existingLock)) {
      return { ok: false, reason: "not_found" };
    }

    // Only the lock owner can release
    if (existingLock.sessionId !== sessionId) {
      return { ok: false, reason: "not_owner" };
    }

    // Release the lock
    const releasedLock: DispatchLock = {
      ...existingLock,
      releasedAt: new Date(),
      releaseReason,
    };

    this.locks.set(key, releasedLock);
    return { ok: true, lock: releasedLock };
  }

  /**
   * Check if a story+gate combination has an active conflict.
   *
   * @param storyId The story to check
   * @param gate The gate to check
   * @returns The conflicting lock if one exists, null otherwise
   */
  checkConflict(storyId: string, gate: Gate): DispatchLock | null {
    const key = this.getLockKey(storyId, gate);
    const existingLock = this.locks.get(key);

    if (existingLock && isLockActive(existingLock)) {
      return existingLock;
    }

    return null;
  }

  /**
   * Get the current lock for a story+gate combination (including expired/released).
   */
  getLock(storyId: string, gate: Gate): DispatchLock | null {
    const key = this.getLockKey(storyId, gate);
    return this.locks.get(key) ?? null;
  }

  /**
   * Force-cleanup expired locks (for maintenance/scheduled tasks).
   * Returns the number of locks cleaned up.
   */
  cleanupExpired(): number {
    let cleaned = 0;
    for (const [key, lock] of this.locks.entries()) {
      if (isLockExpired(lock)) {
        const expiredLock: DispatchLock = {
          ...lock,
          releasedAt: new Date(),
          releaseReason: "expired",
        };
        this.locks.set(key, expiredLock);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// Singleton instance for use across the application
const lockService = new LockService();

/**
 * Acquire a lock on a story+gate combination.
 * Wrapper around LockService.acquire for convenience.
 */
export function acquireLock(
  storyId: string,
  gate: Gate,
  sessionId: string,
  ttlMs?: number
): LockAcquireResult {
  return lockService.acquire(storyId, gate, sessionId, ttlMs);
}

/**
 * Release a lock on a story+gate combination.
 * Wrapper around LockService.release for convenience.
 */
export function releaseLock(
  storyId: string,
  gate: Gate,
  sessionId: string,
  reason?: string
): LockReleaseResult {
  return lockService.release(storyId, gate, sessionId, reason);
}
