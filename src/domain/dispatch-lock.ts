import type { Gate } from "./workflow-types.js";

/**
 * DispatchLock represents a temporary exclusive lock on a story+gate combination.
 * Used to prevent concurrent dispatch operations to the same gate.
 */
export type DispatchLock = {
  /** Unique identifier for the story being locked */
  storyId: string;
  /** The gate this lock is held on */
  gate: Gate;
  /** Session ID that acquired this lock */
  sessionId: string;
  /** Timestamp when the lock was acquired */
  lockedAt: Date;
  /** Timestamp when the lock expires (auto-release) */
  lockExpiresAt: Date;
  /** Timestamp when the lock was released (null if still active) */
  releasedAt: Date | null;
  /** Reason for release: 'expired' | 'released' | 'superseded' | null */
  releaseReason: "expired" | "released" | "superseded" | null;
};

/**
 * Result of a lock acquisition attempt
 */
export type LockAcquireResult =
  | { ok: true; lock: DispatchLock }
  | { ok: false; reason: "conflict" | "expired"; existingLock?: DispatchLock };

/**
 * Result of a lock release attempt
 */
export type LockReleaseResult =
  | { ok: true; lock: DispatchLock }
  | { ok: false; reason: "not_found" | "not_owner" };

/**
 * Check if a lock is currently active (not released and not expired)
 */
export function isLockActive(lock: DispatchLock): boolean {
  const now = new Date();
  return lock.releasedAt === null && now < lock.lockExpiresAt;
}

/**
 * Check if a lock has expired (not released but past expiry time)
 */
export function isLockExpired(lock: DispatchLock): boolean {
  const now = new Date();
  return lock.releasedAt === null && now >= lock.lockExpiresAt;
}
