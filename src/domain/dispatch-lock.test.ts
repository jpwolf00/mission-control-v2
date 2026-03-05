import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { LockService } from "../services/lock-service.js";
import { isLockActive, isLockExpired } from "../domain/dispatch-lock.js";

describe("LockService", () => {
  let lockService: LockService;

  beforeEach(() => {
    // Use short TTL for tests (1 second)
    lockService = new LockService(1000);
  });

  describe("acquire", () => {
    it("should successfully acquire a lock", () => {
      const result = lockService.acquire("story-1", "architect", "session-1");

      assert.strictEqual(result.ok, true);
      assert.ok(result.lock);
      assert.strictEqual(result.lock.storyId, "story-1");
      assert.strictEqual(result.lock.gate, "architect");
      assert.strictEqual(result.lock.sessionId, "session-1");
      assert.strictEqual(result.lock.releasedAt, null);
      assert.strictEqual(result.lock.releaseReason, null);
    });

    it("should allow same session to re-acquire (idempotent)", () => {
      // First acquire
      const first = lockService.acquire("story-1", "architect", "session-1");
      assert.strictEqual(first.ok, true);

      // Same session acquires again - should be idempotent
      const second = lockService.acquire("story-1", "architect", "session-1");
      assert.strictEqual(second.ok, true);
      assert.strictEqual(second.lock.sessionId, "session-1");
    });

    it("should conflict when different session holds active lock", () => {
      // Session 1 acquires
      lockService.acquire("story-1", "architect", "session-1");

      // Session 2 tries to acquire - should fail
      const result = lockService.acquire("story-1", "architect", "session-2");

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, "conflict");
      assert.ok(result.existingLock);
      assert.strictEqual(result.existingLock.sessionId, "session-1");
    });

    it("should allow acquire after lock expiry", async () => {
      // Use very short TTL
      const fastService = new LockService(50);

      // Acquire and wait for expiry
      fastService.acquire("story-1", "architect", "session-1");
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should now be able to acquire with different session
      const result = fastService.acquire("story-1", "architect", "session-2");

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.lock.sessionId, "session-2");
    });
  });

  describe("release", () => {
    it("should successfully release a lock", () => {
      lockService.acquire("story-1", "architect", "session-1");

      const result = lockService.release("story-1", "architect", "session-1", "released");

      assert.strictEqual(result.ok, true);
      assert.ok(result.lock.releasedAt instanceof Date);
      assert.strictEqual(result.lock.releaseReason, "released");
    });

    it("should track release reason correctly", () => {
      lockService.acquire("story-1", "architect", "session-1");

      const result = lockService.release("story-1", "architect", "session-1", "superseded");

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.lock.releaseReason, "superseded");
    });

    it("should fail to release non-existent lock", () => {
      const result = lockService.release("story-1", "architect", "session-1");

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, "not_found");
    });

    it("should fail to release lock owned by different session", () => {
      lockService.acquire("story-1", "architect", "session-1");

      const result = lockService.release("story-1", "architect", "session-2");

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, "not_owner");
    });
  });

  describe("checkConflict", () => {
    it("should return null when no conflict", () => {
      const conflict = lockService.checkConflict("story-1", "architect");
      assert.strictEqual(conflict, null);
    });

    it("should return conflicting lock when active", () => {
      lockService.acquire("story-1", "architect", "session-1");

      const conflict = lockService.checkConflict("story-1", "architect");

      assert.ok(conflict);
      assert.strictEqual(conflict?.sessionId, "session-1");
    });
  });

  describe("cleanupExpired", () => {
    it("should mark expired locks", async () => {
      const fastService = new LockService(50);

      fastService.acquire("story-1", "architect", "session-1");
      await new Promise((resolve) => setTimeout(resolve, 60));

      const cleaned = fastService.cleanupExpired();

      assert.strictEqual(cleaned, 1);

      const lock = fastService.getLock("story-1", "architect");
      assert.strictEqual(lock?.releaseReason, "expired");
    });
  });
});

describe("dispatch-lock helpers", () => {
  describe("isLockActive", () => {
    it("should return true for active lock", () => {
      const lock = {
        storyId: "story-1",
        gate: "architect" as const,
        sessionId: "session-1",
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() + 60000),
        releasedAt: null,
        releaseReason: null,
      };

      assert.strictEqual(isLockActive(lock), true);
    });

    it("should return false for released lock", () => {
      const lock = {
        storyId: "story-1",
        gate: "architect" as const,
        sessionId: "session-1",
        lockedAt: new Date(),
        lockExpiresAt: new Date(Date.now() + 60000),
        releasedAt: new Date(),
        releaseReason: "released" as const,
      };

      assert.strictEqual(isLockActive(lock), false);
    });
  });

  describe("isLockExpired", () => {
    it("should return true for expired lock", () => {
      const lock = {
        storyId: "story-1",
        gate: "architect" as const,
        sessionId: "session-1",
        lockedAt: new Date(Date.now() - 120000),
        lockExpiresAt: new Date(Date.now() - 60000),
        releasedAt: null,
        releaseReason: null,
      };

      assert.strictEqual(isLockExpired(lock), true);
    });
  });
});
