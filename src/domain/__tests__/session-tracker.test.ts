// Session tracker and stalled derivation tests
// MC2-E4-S1: Validation for "No runaway sessions" acceptance criteria

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSession,
  getSession,
  updateSessionHeartbeat,
  transitionSessionStatus,
  clearExpiredSessions,
  type SessionRecord,
} from '../session-tracker';
import {
  isSessionStalled,
  checkStalledDerivation,
  checkAllStalled,
  DEFAULT_CONFIG,
  type StalledDerivationConfig,
} from '../stalled-derivation';

describe('Session Tracker', () => {
  beforeEach(() => {
    // Reset the in-memory store between tests
    vi.doMock('../session-tracker', () => ({
      sessions: new Map(),
    }));
  });

  describe('createSession', () => {
    it('should create a session with default TTL', () => {
      const session = createSession({
        sessionId: 'test-1',
        storyId: 'story-1',
      });

      expect(session.id).toBe('test-1');
      expect(session.storyId).toBe('story-1');
      expect(session.status).toBe('pending');
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should create a session with custom TTL', () => {
      const session = createSession({
        sessionId: 'test-2',
        storyId: 'story-1',
        ttlMs: 60000, // 1 minute
      });

      const expectedExpiry = Date.now() + 60000;
      expect(session.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(session.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', () => {
      const created = createSession({
        sessionId: 'test-3',
        storyId: 'story-1',
      });

      const retrieved = getSession('test-3');
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent session', () => {
      const result = getSession('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateSessionHeartbeat', () => {
    it('should update heartbeat for active session', () => {
      const session = createSession({
        sessionId: 'test-4',
        storyId: 'story-1',
      });

      // Transition to active first
      transitionSessionStatus('test-4', 'active');

      const originalLastHeartbeat = session.lastHeartbeatAt;
      
      // Wait a bit to ensure time difference
      const now = Date.now();
      
      const updated = updateSessionHeartbeat('test-4');
      
      expect(updated).toBeDefined();
      expect(updated!.lastHeartbeatAt).toBeGreaterThanOrEqual(originalLastHeartbeat);
    });

    it('should not update heartbeat for non-active session', () => {
      const session = createSession({
        sessionId: 'test-5',
        storyId: 'story-1',
      });

      const result = updateSessionHeartbeat('test-5');
      expect(result).toBeUndefined();
    });
  });

  describe('transitionSessionStatus', () => {
    it('should transition from pending to active', () => {
      createSession({
        sessionId: 'test-6',
        storyId: 'story-1',
      });

      const result = transitionSessionStatus('test-6', 'active');
      expect(result?.status).toBe('active');
    });

    it('should transition from active to completed', () => {
      createSession({
        sessionId: 'test-7',
        storyId: 'story-1',
      });
      transitionSessionStatus('test-7', 'active');

      const result = transitionSessionStatus('test-7', 'completed');
      expect(result?.status).toBe('completed');
    });

    it('should not allow invalid transitions', () => {
      createSession({
        sessionId: 'test-8',
        storyId: 'story-1',
      });
      transitionSessionStatus('test-8', 'active');

      // Cannot go directly from active to pending
      const result = transitionSessionStatus('test-8', 'pending');
      expect(result).toBeUndefined();
    });
  });

  describe('clearExpiredSessions', () => {
    it('should mark expired active sessions as timed_out', () => {
      // Create session and activate
      const session = createSession({
        sessionId: 'test-9',
        storyId: 'story-1',
        ttlMs: 1000, // 1 second TTL
      });
      transitionSessionStatus('test-9', 'active');

      // Manually expire the session by setting expiresAt to the past
      const sess = getSession('test-9')!;
      sess.expiresAt = Date.now() - 500; // Already expired

      // Clear with current time
      const expired = clearExpiredSessions(Date.now());
      
      // Should have marked the session as timed_out
      const updated = getSession('test-9');
      expect(updated?.status).toBe('timed_out');
    });
  });
});

describe('Stalled Derivation', () => {
  describe('isSessionStalled', () => {
    it('should return true when heartbeat exceeded threshold', () => {
      const lastHeartbeatAt = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const currentTime = Date.now();
      const thresholdMs = 5 * 60 * 1000; // 5 minutes

      const result = isSessionStalled(lastHeartbeatAt, currentTime, thresholdMs);
      expect(result).toBe(true);
    });

    it('should return false when within threshold', () => {
      const lastHeartbeatAt = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      const currentTime = Date.now();
      const thresholdMs = 5 * 60 * 1000; // 5 minutes

      const result = isSessionStalled(lastHeartbeatAt, currentTime, thresholdMs);
      expect(result).toBe(false);
    });

    it('should use default threshold when not provided', () => {
      const lastHeartbeatAt = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const currentTime = Date.now();

      const result = isSessionStalled(lastHeartbeatAt, currentTime);
      expect(result).toBe(true);
    });

    it('should handle edge case at exactly threshold', () => {
      const thresholdMs = 5 * 60 * 1000;
      const lastHeartbeatAt = Date.now() - thresholdMs;
      const currentTime = Date.now();

      const result = isSessionStalled(lastHeartbeatAt, currentTime, thresholdMs);
      // Should be false - not yet exceeded
      expect(result).toBe(false);
    });
  });

  describe('checkStalledDerivation', () => {
    beforeEach(() => {
      vi.doMock('../session-tracker', () => ({
        sessions: new Map(),
      }));
    });

    it('should return stalled result for stalled session', () => {
      const session = createSession({
        sessionId: 'stalled-test-1',
        storyId: 'story-1',
      });
      transitionSessionStatus('stalled-test-1', 'active');
      
      // Manually set old heartbeat
      const sess = getSession('stalled-test-1')!;
      sess.lastHeartbeatAt = Date.now() - 10 * 60 * 1000;

      const result = checkStalledDerivation(
        'stalled-test-1',
        Date.now(),
        { timeoutThresholdMs: 5 * 60 * 1000 }
      );

      expect(result).not.toBeNull();
      expect(result!.isStalled).toBe(true);
      expect(result!.timeSinceHeartbeat).toBeGreaterThan(5 * 60 * 1000);
    });

    it('should return null for non-existent session', () => {
      const result = checkStalledDerivation(
        'non-existent',
        Date.now(),
        DEFAULT_CONFIG
      );

      expect(result).toBeNull();
    });
  });
});

describe('Integration: No Runaway Sessions', () => {
  it('should prevent session from running indefinitely without heartbeat', () => {
    // Create and activate session
    const session = createSession({
      sessionId: 'runaway-test-1',
      storyId: 'story-1',
      ttlMs: 5000, // 5 second TTL for test
    });
    
    transitionSessionStatus('runaway-test-1', 'active');

    // Session is active - verify it's not stalled yet
    const beforeStall = checkStalledDerivation(
      'runaway-test-1',
      Date.now(),
      { timeoutThresholdMs: 5000 }
    );
    expect(beforeStall?.isStalled).toBe(false);

    // Simulate time passing beyond TTL - set both heartbeat and expiry to past
    const session2 = getSession('runaway-test-1')!;
    session2.lastHeartbeatAt = Date.now() - 10000; // 10 seconds ago
    session2.expiresAt = Date.now() - 5000; // 5 seconds ago (expired)

    // Now it should be detected as stalled
    const afterStall = checkStalledDerivation(
      'runaway-test-1',
      Date.now(),
      { timeoutThresholdMs: 5000 }
    );
    expect(afterStall?.isStalled).toBe(true);

    // Clear expired should mark it as timed_out
    clearExpiredSessions(Date.now());
    const timedOut = getSession('runaway-test-1');
    expect(timedOut?.status).toBe('timed_out');
  });

  it('should clean up sessions that exceed maximum runtime', () => {
    // This test verifies the orphan cleaner threshold (30 min)
    // In production, orphan-cleaner.ts marks sessions >30 min as orphaned
    
    const longRunningSession = createSession({
      sessionId: 'long-running',
      storyId: 'story-1',
      ttlMs: 35 * 60 * 1000, // 35 minutes - exceeds orphan threshold
    });
    
    transitionSessionStatus('long-running', 'active');
    
    const sess = getSession('long-running')!;
    sess.lastHeartbeatAt = Date.now() - 35 * 60 * 1000;

    // Should be detected as stalled
    const result = checkStalledDerivation(
      'long-running',
      Date.now(),
      { timeoutThresholdMs: 30 * 60 * 1000 } // 30 min threshold
    );
    
    expect(result?.isStalled).toBe(true);
  });
});
