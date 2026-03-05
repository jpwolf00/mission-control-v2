/**
 * Orphan Session Cleaner - MC2-E4
 * 
 * Detects and cleans orphaned sessions (no heartbeat > timeout)
 * Runs on a schedule to find and clean up sessions that have been
 * inactive beyond the configured threshold.
 */

import { prisma } from './prisma';
import { promises as fs, type FSAccess } from 'fs';
import path from 'path';
import { homedir } from 'os';

// ============================================================================
// Injectable filesystem for testing
// ============================================================================

/** File system access abstraction for testability */
export type FileSystemAccess = {
  access: (path: string) => Promise<void>;
};

/** Default uses real fs */
let fsAccess: FileSystemAccess = {
  access: (filePath: string) => fs.access(filePath),
};

/**
 * Set custom filesystem (for testing)
 */
export function setFileSystemAccess(access: FileSystemAccess): void {
  fsAccess = access;
}

/**
 * Reset to default filesystem
 */
export function resetFileSystemAccess(): void {
  fsAccess = {
    access: (filePath: string) => fs.access(filePath),
  };
}

// Path to OpenClaw agents directory
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(homedir(), '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_DIR, 'agents');

// ============================================================================
// Configuration
// ============================================================================

export interface OrphanCleanerConfig {
  /** Timeout in milliseconds after which a session is considered orphaned */
  orphanTimeoutMs: number;
  /** How often to run the cleaner (in ms) */
  runIntervalMs: number;
  /** Whether to actually delete/archive sessions or just mark them */
  dryRun: boolean;
  /** Maximum sessions to process per run */
  batchSize: number;
}

export const DEFAULT_ORPHAN_CLEANER_CONFIG: OrphanCleanerConfig = {
  orphanTimeoutMs: 30 * 60 * 1000, // 30 minutes
  runIntervalMs: 5 * 60 * 1000,    // 5 minutes
  dryRun: true,                    // Default to dry-run for safety
  batchSize: 50,
};

// ============================================================================
// Types
// ============================================================================

export interface OrphanSession {
  sessionId: string;
  openclawSessionId: string | null;
  agentType: string;
  storyId: string | null;
  label: string | null;
  status: string;
  startedAt: Date;
  lastPingAt: Date;
  idleMs: number;
  fileExists: boolean;
}

export interface OrphanCleanerResult {
  success: boolean;
  checkedAt: string;
  config: OrphanCleanerConfig;
  stats: {
    totalScanned: number;
    orphansFound: number;
    sessionsCleaned: number;
    sessionsArchived: number;
    errors: number;
  };
  orphans: OrphanSession[];
  cleanedSessionIds: string[];
  errorMessages: string[];
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate how long a session has been idle (no heartbeat)
 */
function calculateIdleMs(lastPingAt: Date | null): number {
  if (!lastPingAt) {
    return Infinity; // Never pinged = definitely orphaned
  }
  return Date.now() - new Date(lastPingAt).getTime();
}

/**
 * Check if a session file still exists in the filesystem
 */
async function checkSessionFileExists(session: {
  sessionFilePath: string | null;
}): Promise<boolean> {
  if (!session.sessionFilePath) {
    return false;
  }
  try {
    await fsAccess.access(session.sessionFilePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find all active sessions that may be orphaned
 */
export async function findOrphanSessions(
  config: OrphanCleanerConfig
): Promise<OrphanSession[]> {
  // Get sessions that are in active states (not completed/error)
  const activeSessions = await prisma.agentSession.findMany({
    where: {
      status: {
        in: ['IDLE', 'WORKING', 'STALLED_WARNING', 'STALLED_CRITICAL'],
      },
    },
    take: config.batchSize,
    orderBy: {
      lastPingAt: 'asc', // Process oldest first
    },
  });

  const orphans: OrphanSession[] = [];

  for (const session of activeSessions) {
    const idleMs = calculateIdleMs(session.lastPingAt);
    const fileExists = await checkSessionFileExists(session);

    // A session is orphaned if:
    // 1. Its idle time exceeds the timeout threshold, OR
    // 2. The session file no longer exists but the DB record does
    // Only consider active sessions (not COMPLETED or ERROR)
    const isActiveSession = session.status !== 'COMPLETED' && session.status !== 'ERROR';
    if (isActiveSession && (idleMs > config.orphanTimeoutMs || !fileExists)) {
      orphans.push({
        sessionId: session.id,
        openclawSessionId: session.openclawSessionId,
        agentType: session.agentType,
        storyId: session.storyId,
        label: session.label,
        status: session.status,
        startedAt: session.startedAt,
        lastPingAt: session.lastPingAt,
        idleMs,
        fileExists,
      });
    }
  }

  return orphans;
}

/**
 * Clean up orphaned sessions
 * - Marks them as ERROR status
 * - Logs the cleanup event
 */
export async function cleanOrphanSessions(
  orphans: OrphanSession[],
  config: OrphanCleanerConfig
): Promise<{ cleaned: string[]; errors: string[] }> {
  const cleaned: string[] = [];
  const errors: string[] = [];

  for (const orphan of orphans) {
    try {
      if (config.dryRun) {
        // In dry-run mode, just log what would happen
        cleaned.push(orphan.sessionId);
        continue;
      }

      // Update session status to ERROR
      await prisma.agentSession.update({
        where: { id: orphan.sessionId },
        data: {
          status: 'ERROR',
          endedAt: new Date(),
        },
      });

      // Create an event to log the cleanup
      await prisma.agentEvent.create({
        data: {
          sessionId: orphan.sessionId,
          storyId: orphan.storyId,
          eventType: 'orphan_cleaned',
          message: `Session cleaned by orphan cleaner: idle for ${Math.round(orphan.idleMs / 60000)} minutes`,
          detail: JSON.stringify({
            idleMs: orphan.idleMs,
            previousStatus: orphan.status,
            fileExists: orphan.fileExists,
          }),
        },
      });

      cleaned.push(orphan.sessionId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to clean session ${orphan.sessionId}: ${errorMsg}`);
    }
  }

  return { cleaned, errors };
}

/**
 * Run the orphan cleaner with given config
 */
export async function runOrphanCleaner(
  config: OrphanCleanerConfig = DEFAULT_ORPHAN_CLEANER_CONFIG
): Promise<OrphanCleanerResult> {
  const result: OrphanCleanerResult = {
    success: true,
    checkedAt: new Date().toISOString(),
    config: { ...config },
    stats: {
      totalScanned: 0,
      orphansFound: 0,
      sessionsCleaned: 0,
      sessionsArchived: 0,
      errors: 0,
    },
    orphans: [],
    cleanedSessionIds: [],
    errorMessages: [],
  };

  try {
    // Find orphan sessions
    const orphans = await findOrphanSessions(config);
    result.orphans = orphans;
    result.stats.orphansFound = orphans.length;
    result.stats.totalScanned = config.batchSize;

    if (orphans.length > 0) {
      // Clean the orphaned sessions
      const { cleaned, errors } = await cleanOrphanSessions(orphans, config);
      result.cleanedSessionIds = cleaned;
      result.stats.sessionsCleaned = cleaned.length;
      result.stats.errors = errors.length;
      result.errorMessages = errors;
    }
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errorMessages.push(`Fatal error: ${errorMsg}`);
    result.stats.errors++;
  }

  return result;
}

// ============================================================================
// Scheduler
// ============================================================================

let cleanerIntervalId: NodeJS.Timeout | null = null;

/**
 * Start the orphan cleaner scheduler
 */
export function startOrphanCleanerScheduler(
  config: OrphanCleanerConfig = DEFAULT_ORPHAN_CLEANER_CONFIG,
  onResult?: (result: OrphanCleanerResult) => void
): void {
  if (cleanerIntervalId !== null) {
    console.log('[OrphanCleaner] Scheduler already running');
    return;
  }

  console.log(
    `[OrphanCleaner] Starting scheduler with interval: ${config.runIntervalMs}ms, timeout: ${config.orphanTimeoutMs}ms, dryRun: ${config.dryRun}`
  );

  // Run immediately on start
  runOrphanCleaner(config).then((result) => {
    if (onResult) {
      onResult(result);
    }
    if (result.stats.orphansFound > 0) {
      console.log(
        `[OrphanCleaner] Found ${result.stats.orphansFound} orphaned sessions`
      );
    }
  });

  // Then run on interval
  cleanerIntervalId = setInterval(async () => {
    try {
      const result = await runOrphanCleaner(config);
      if (onResult) {
        onResult(result);
      }
      if (result.stats.orphansFound > 0) {
        console.log(
          `[OrphanCleaner] Found ${result.stats.orphansFound} orphaned sessions, cleaned: ${result.stats.sessionsCleaned}`
        );
      }
    } catch (error) {
      console.error('[OrphanCleaner] Scheduler error:', error);
    }
  }, config.runIntervalMs);
}

/**
 * Stop the orphan cleaner scheduler
 */
export function stopOrphanCleanerScheduler(): void {
  if (cleanerIntervalId !== null) {
    clearInterval(cleanerIntervalId);
    cleanerIntervalId = null;
    console.log('[OrphanCleaner] Scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
export function isOrphanCleanerSchedulerRunning(): boolean {
  return cleanerIntervalId !== null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format idle time for display
 */
export function formatIdleTime(idleMs: number): string {
  if (idleMs === Infinity) return 'never';
  
  const minutes = Math.floor(idleMs / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

/**
 * Get a summary report of orphan sessions
 */
export async function getOrphanSummary(): Promise<{
  activeSessions: number;
  orphanedSessions: number;
  oldestOrphan: OrphanSession | null;
  byAgentType: Record<string, number>;
}> {
  const activeSessions = await prisma.agentSession.count({
    where: {
      status: {
        in: ['IDLE', 'WORKING', 'STALLED_WARNING', 'STALLED_CRITICAL'],
      },
    },
  });

  const config = DEFAULT_ORPHAN_CLEANER_CONFIG;
  const orphans = await findOrphanSessions(config);

  const byAgentType: Record<string, number> = {};
  for (const orphan of orphans) {
    byAgentType[orphan.agentType] = (byAgentType[orphan.agentType] || 0) + 1;
  }

  return {
    activeSessions,
    orphanedSessions: orphans.length,
    oldestOrphan: orphans.length > 0 ? orphans[0] : null,
    byAgentType,
  };
}
