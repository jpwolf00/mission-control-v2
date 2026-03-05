// Stalled derivation detection using explicit timestamps
// MC2-E4-S1: Stalled derivation logic with configurable timeout threshold (no timers)

import { getSession, type SessionRecord } from "./session-tracker.js";

export interface StalledDerivationConfig {
  timeoutThresholdMs: number;  // Configurable timeout threshold
  checkIntervalMs?: number;    // Optional: for periodic checking (not used for detection itself)
}

const DEFAULT_CONFIG: StalledDerivationConfig = {
  timeoutThresholdMs: 5 * 60 * 1000, // Default 5 minutes
};

export { DEFAULT_CONFIG };

export interface StalledCheckResult {
  isStalled: boolean;
  sessionId: string;
  storyId: string;
  lastHeartbeatAt: number;
  currentTime: number;
  thresholdMs: number;
  timeSinceHeartbeat: number;
}

/**
 * Check if a session is stalled based on explicit timestamps.
 * Uses configurable timeout threshold - no timers, just timestamp comparisons.
 * 
 * @param sessionId - The session to check
 * @param currentTime - Current timestamp (explicit input, not derived from Date.now() internally)
 * @param config - Optional configuration with timeout threshold
 * @returns Stalled check result
 */
export function checkStalledDerivation(
  sessionId: string,
  currentTime: number,
  config: StalledDerivationConfig = DEFAULT_CONFIG
): StalledCheckResult | null {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  const timeSinceHeartbeat = currentTime - session.lastHeartbeatAt;
  const isStalled = timeSinceHeartbeat > config.timeoutThresholdMs;

  return {
    isStalled,
    sessionId: session.id,
    storyId: session.storyId,
    lastHeartbeatAt: session.lastHeartbeatAt,
    currentTime,
    thresholdMs: config.timeoutThresholdMs,
    timeSinceHeartbeat
  };
}

/**
 * Check multiple sessions for stalled derivations.
 * 
 * @param sessionIds - Array of session IDs to check
 * @param currentTime - Current timestamp (explicit input)
 * @param config - Optional configuration
 * @returns Array of stalled session results
 */
export function checkMultipleStalled(
  sessionIds: string[],
  currentTime: number,
  config: StalledDerivationConfig = DEFAULT_CONFIG
): StalledCheckResult[] {
  const results: StalledCheckResult[] = [];

  for (const sessionId of sessionIds) {
    const result = checkStalledDerivation(sessionId, currentTime, config);
    if (result && result.isStalled) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Check all active sessions for stalled derivations.
 * 
 * @param currentTime - Current timestamp (explicit input)
 * @param config - Optional configuration
 * @returns Array of stalled session results
 */
export function checkAllStalled(
  currentTime: number,
  config: StalledDerivationConfig = DEFAULT_CONFIG
): StalledCheckResult[] {
  const results: StalledCheckResult[] = [];

  for (const session of getAllActiveSessions()) {
    const result = checkStalledDerivation(session.id, currentTime, config);
    if (result && result.isStalled) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Get all active sessions (helper for checking all)
 */
function getAllActiveSessions(): SessionRecord[] {
  const { getAllSessions } = require("./session-tracker.js");
  const all = getAllSessions() as SessionRecord[];
  return all.filter((s: SessionRecord) => s.status === "active");
}

/**
 * Determine if a session should be considered stalled based on explicit time inputs.
 * This is the pure function version for more flexible usage.
 * 
 * @param lastHeartbeatAt - Timestamp of last heartbeat
 * @param currentTime - Current timestamp to check against
 * @param thresholdMs - Timeout threshold in milliseconds
 * @returns true if the session is stalled
 */
export function isSessionStalled(
  lastHeartbeatAt: number,
  currentTime: number,
  thresholdMs: number = DEFAULT_CONFIG.timeoutThresholdMs
): boolean {
  return (currentTime - lastHeartbeatAt) > thresholdMs;
}
