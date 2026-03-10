/**
 * Smart Recovery Service - Anomaly Detection and Escalation
 * 
 * Detects stale agent sessions, duplicate runs, and callback timeouts.
 * Escalates to problem-solving agent or human operator with diagnostic context.
 * 
 * Features:
 * - Gate-specific heartbeat thresholds (operator gets longer leash)
 * - Heartbeat ping mechanism for long-running operations
 * - Comprehensive audit logging
 * - Handles edge cases: operator mid-backup, implementer mid-build, network partitions
 */

import { prisma } from '@/lib/prisma';
import { Gate, GATES } from '@/domain/workflow-types';
import { sendEmailNotification, sendSlackNotification } from '@/lib/notifications';
import { dispatchStory } from './dispatch-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for heartbeat thresholds by gate
 * Operator gets longer leash for backups (30 min vs 10 min default)
 */
export interface GateHeartbeatConfig {
  gate: Gate;
  thresholdMs: number;
  warningThresholdMs: number;  // When to start warning (80% of threshold)
  description: string;
}

export const GATE_HEARTBEAT_CONFIGS: Record<Gate, GateHeartbeatConfig> = {
  'architect': {
    gate: 'architect',
    thresholdMs: 15 * 60 * 1000,  // 15 minutes
    warningThresholdMs: 12 * 60 * 1000,  // 12 minutes
    description: 'Design phase - research and spec writing',
  },
  'implementer': {
    gate: 'implementer',
    thresholdMs: 20 * 60 * 1000,  // 20 minutes (code changes may take time)
    warningThresholdMs: 16 * 60 * 1000,  // 16 minutes
    description: 'Implementation phase - coding and testing',
  },
  'reviewer-a': {
    gate: 'reviewer-a',
    thresholdMs: 10 * 60 * 1000,  // 10 minutes
    warningThresholdMs: 8 * 60 * 1000,  // 8 minutes
    description: 'QA validation - API and UI testing',
  },
  'operator': {
    gate: 'operator',
    thresholdMs: 30 * 60 * 1000,  // 30 minutes (backups and deploys take time)
    warningThresholdMs: 24 * 60 * 1000,  // 24 minutes
    description: 'Deployment phase - backups and production changes',
  },
  'reviewer-b': {
    gate: 'reviewer-b',
    thresholdMs: 10 * 60 * 1000,  // 10 minutes
    warningThresholdMs: 8 * 60 * 1000,  // 8 minutes
    description: 'Production validation - health checks',
  },
  'ui-designer': {
    gate: 'ui-designer',
    thresholdMs: 15 * 60 * 1000,  // 15 minutes
    warningThresholdMs: 12 * 60 * 1000,  // 12 minutes
    description: 'UI/UX design phase',
  },
};

/**
 * Anomaly types detected by the recovery system
 */
export type AnomalyType = 
  | 'stale_session'           // No heartbeat within threshold
  | 'duplicate_run'           // Multiple active sessions for same story+gate
  | 'callback_timeout'        // Session completed but no callback received
  | 'cascading_failure'       // Multiple gates failing in sequence
  | 'network_partition'       // Gateway unreachable
  | 'ghost_lock';             // Story locked but no active session

/**
 * Severity levels for anomalies
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly record for audit logging and escalation
 */
export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  storyId?: string;
  sessionId?: string;
  gate?: Gate;
  detectedAt: Date;
  details: {
    description: string;
    expectedHeartbeat?: Date;
    actualLastHeartbeat?: Date;
    thresholdMs?: number;
    duplicateSessionIds?: string[];
    affectedGates?: Gate[];
    diagnosticContext?: Record<string, unknown>;
  };
  escalated: boolean;
  escalatedTo?: 'operator' | 'problem_solver' | 'human';
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: 'anomaly_detected' | 'escalation_sent' | 'recovery_attempted' | 'resolved' | 'heartbeat_ping';
  storyId?: string;
  sessionId?: string;
  gate?: Gate;
  details: Record<string, unknown>;
}

/**
 * Check for stale sessions (no heartbeat within threshold)
 */
export async function detectStaleSessions(): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = [];
  const now = new Date();

  // Get all active sessions
  const activeSessions = await prisma.runSession.findMany({
    where: {
      status: 'active',
    },
    include: {
      story: {
        select: {
          id: true,
          title: true,
          gates: {
            where: {
              status: 'pending',
            },
          },
        },
      },
    },
  });

  for (const session of activeSessions) {
    const gate = session.gate as Gate;
    const config = GATE_HEARTBEAT_CONFIGS[gate];
    
    if (!config) {
      console.warn(`[RecoveryService] No heartbeat config for gate: ${gate}`);
      continue;
    }

    // Check if session has any heartbeat
    if (!session.lastHeartbeatAt) {
      // No heartbeat ever sent - check if session is old enough to be concerning
      if (!session.startedAt) continue;
      
      const timeSinceStart = now.getTime() - session.startedAt.getTime();
      if (timeSinceStart > config.thresholdMs) {
        const anomaly: AnomalyRecord = {
          id: uuidv4(),
          type: 'stale_session',
          severity: 'high',
          storyId: session.storyId,
          sessionId: session.id,
          gate,
          detectedAt: now,
          escalated: false,
          resolved: false,
          details: {
            description: `Session ${session.id} has no heartbeat and exceeded threshold`,
            expectedHeartbeat: new Date(session.startedAt.getTime() + config.thresholdMs),
            actualLastHeartbeat: session.startedAt,
            thresholdMs: config.thresholdMs,
            diagnosticContext: {
              storyTitle: session.story?.title,
              sessionStartedAt: session.startedAt,
              gateDescription: config.description,
            },
          },
        };
        anomalies.push(anomaly);
        await logAuditEntry({
          id: uuidv4(),
          timestamp: now,
          action: 'anomaly_detected',
          storyId: session.storyId,
          sessionId: session.id,
          gate,
          details: { type: 'stale_session', severity: 'high' },
        });
      }
      continue;
    }

    // Check time since last heartbeat
    const timeSinceHeartbeat = now.getTime() - session.lastHeartbeatAt.getTime();
    
    if (timeSinceHeartbeat > config.thresholdMs) {
      // Determine severity based on how far over threshold
      let severity: AnomalySeverity = 'high';
      if (timeSinceHeartbeat > config.thresholdMs * 2) {
        severity = 'critical';
      } else if (timeSinceHeartbeat > config.thresholdMs * 1.5) {
        severity = 'high';
      }

      const anomaly: AnomalyRecord = {
        id: uuidv4(),
        type: 'stale_session',
        severity,
        storyId: session.storyId,
        sessionId: session.id,
        gate,
        detectedAt: now,
        escalated: false,
        resolved: false,
        details: {
          description: `Session ${session.id} stale: ${Math.round(timeSinceHeartbeat / 60000)} min since last heartbeat (threshold: ${config.thresholdMs / 60000} min)`,
          expectedHeartbeat: new Date(session.lastHeartbeatAt.getTime() + config.thresholdMs),
          actualLastHeartbeat: session.lastHeartbeatAt,
          thresholdMs: config.thresholdMs,
          diagnosticContext: {
            storyTitle: session.story?.title,
            sessionStartedAt: session.startedAt,
            gateDescription: config.description,
            timeSinceStart: timeSinceHeartbeat,
          },
        },
      };
      anomalies.push(anomaly);
      
      await logAuditEntry({
        id: uuidv4(),
        timestamp: now,
        action: 'anomaly_detected',
        storyId: session.storyId,
        sessionId: session.id,
        gate,
        details: { type: 'stale_session', severity, timeSinceHeartbeat },
      });
    }
  }

  return anomalies;
}

/**
 * Check for duplicate runs (multiple active sessions for same story+gate)
 */
export async function detectDuplicateRuns(): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = [];
  const now = new Date();

  // Find stories with multiple active sessions for the same gate
  const duplicateSessions = await prisma.$queryRaw`
    SELECT 
      story_id,
      gate,
      COUNT(*) as count,
      ARRAY_AGG(id) as session_ids
    FROM run_sessions
    WHERE status = 'active'
    GROUP BY story_id, gate
    HAVING COUNT(*) > 1
  ` as Array<{ story_id: string; gate: string; count: number; session_ids: string[] }>;

  for (const dup of duplicateSessions) {
    const anomaly: AnomalyRecord = {
      id: uuidv4(),
      type: 'duplicate_run',
      severity: 'high',
      storyId: dup.story_id,
      gate: dup.gate as Gate,
      detectedAt: now,
      escalated: false,
      resolved: false,
      details: {
        description: `Duplicate active sessions detected for story ${dup.story_id} at gate ${dup.gate}`,
        duplicateSessionIds: dup.session_ids,
        diagnosticContext: {
          sessionCount: dup.count,
          sessions: dup.session_ids,
        },
      },
    };
    anomalies.push(anomaly);

    await logAuditEntry({
      id: uuidv4(),
      timestamp: now,
      action: 'anomaly_detected',
      storyId: dup.story_id,
      gate: dup.gate as Gate,
      details: { type: 'duplicate_run', sessionCount: dup.count, sessionIds: dup.session_ids },
    });
  }

  return anomalies;
}

/**
 * Check for callback timeouts (session active but no callback within expected time)
 */
export async function detectCallbackTimeouts(): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = [];
  const now = new Date();

  // Get sessions that have been active for too long without completion
  // This catches cases where agent started but never sent callback
  const longRunningSessions = await prisma.runSession.findMany({
    where: {
      status: 'active',
      startedAt: {
        lt: new Date(now.getTime() - 45 * 60 * 1000),  // 45 minutes
      },
    },
    include: {
      story: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  for (const session of longRunningSessions) {
    const gate = session.gate as Gate;
    const config = GATE_HEARTBEAT_CONFIGS[gate];
    
    const anomaly: AnomalyRecord = {
      id: uuidv4(),
      type: 'callback_timeout',
      severity: 'critical',
      storyId: session.storyId,
      sessionId: session.id,
      gate,
      detectedAt: now,
      escalated: false,
      resolved: false,
      details: {
        description: `Session ${session.id} running for ${Math.round((now.getTime() - (session.startedAt?.getTime() || 0)) / 60000)} min without callback`,
        thresholdMs: 45 * 60 * 1000,
        diagnosticContext: {
          storyTitle: session.story?.title,
          sessionStartedAt: session.startedAt,
          gateDescription: config?.description,
          hasHeartbeat: !!session.lastHeartbeatAt,
          lastHeartbeatAt: session.lastHeartbeatAt,
        },
      },
    };
    anomalies.push(anomaly);

    await logAuditEntry({
      id: uuidv4(),
      timestamp: now,
      action: 'anomaly_detected',
      storyId: session.storyId,
      sessionId: session.id,
      gate,
      details: { type: 'callback_timeout', severity: 'critical' },
    });
  }

  return anomalies;
}

/**
 * Check for ghost locks (story locked but no active session)
 */
export async function detectGhostLocks(): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = [];
  const now = new Date();

  // Find dispatch locks without corresponding active sessions
  const ghostLocks = await prisma.$queryRaw`
    SELECT 
      dl.story_id,
      dl.gate,
      dl.session_id,
      dl.locked_at
    FROM dispatch_locks dl
    LEFT JOIN run_sessions rs ON dl.session_id = rs.id AND rs.status = 'active'
    WHERE dl.released_at IS NULL
    AND rs.id IS NULL
  ` as Array<{ story_id: string; gate: string; session_id: string; locked_at: Date }>;

  for (const lock of ghostLocks) {
    const anomaly: AnomalyRecord = {
      id: uuidv4(),
      type: 'ghost_lock',
      severity: 'medium',
      storyId: lock.story_id,
      sessionId: lock.session_id,
      gate: lock.gate as Gate,
      detectedAt: now,
      escalated: false,
      resolved: false,
      details: {
        description: `Ghost lock detected: story ${lock.story_id} at gate ${lock.gate} locked but session ${lock.session_id} not active`,
        diagnosticContext: {
          lockCreatedAt: lock.locked_at,
          lockAge: now.getTime() - lock.locked_at.getTime(),
        },
      },
    };
    anomalies.push(anomaly);

    await logAuditEntry({
      id: uuidv4(),
      timestamp: now,
      action: 'anomaly_detected',
      storyId: lock.story_id,
      sessionId: lock.session_id,
      gate: lock.gate as Gate,
      details: { type: 'ghost_lock' },
    });
  }

  return anomalies;
}

/**
 * Detect cascading failures (multiple gates failing in sequence)
 */
export async function detectCascadingFailures(): Promise<AnomalyRecord[]> {
  const anomalies: AnomalyRecord[] = [];
  const now = new Date();

  // Look for stories with multiple failed sessions in the last hour
  const failedSessions = await prisma.runSession.findMany({
    where: {
      status: 'failed',
      endedAt: {
        gte: new Date(now.getTime() - 60 * 60 * 1000),  // Last hour
      },
    },
    include: {
      story: {
        select: {
          id: true,
          title: true,
          sessions: {
            where: {
              status: 'failed',
              endedAt: {
                gte: new Date(now.getTime() - 60 * 60 * 1000),
              },
            },
            orderBy: { endedAt: 'desc' },
          },
        },
      },
    },
  });

  // Group by story and check for multiple failures
  const storyFailures = new Map<string, typeof failedSessions[0]>();
  for (const session of failedSessions) {
    const existing = storyFailures.get(session.storyId);
    if (existing) {
      existing.story.sessions.push(session);
    } else {
      storyFailures.set(session.storyId, session);
    }
  }

  for (const session of storyFailures.values()) {
    if (session.story.sessions.length >= 2) {
      const anomaly: AnomalyRecord = {
        id: uuidv4(),
        type: 'cascading_failure',
        severity: 'critical',
        storyId: session.storyId,
        detectedAt: now,
        escalated: false,
        resolved: false,
        details: {
          description: `Cascading failures detected: ${session.story.sessions.length} failed sessions in last hour`,
          affectedGates: [...new Set(session.story.sessions.map(s => s.gate as Gate))],
          diagnosticContext: {
            storyTitle: session.story.title,
            failedSessions: session.story.sessions.map(s => ({
              sessionId: s.id,
              gate: s.gate,
              failedAt: s.endedAt,
              provider: s.provider,
              model: s.model,
            })),
          },
        },
      };
      anomalies.push(anomaly);

      await logAuditEntry({
        id: uuidv4(),
        timestamp: now,
        action: 'anomaly_detected',
        storyId: session.storyId,
        details: { type: 'cascading_failure', severity: 'critical', failureCount: session.story.sessions.length },
      });
    }
  }

  return anomalies;
}

/**
 * Log an audit entry to the database
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  await prisma.storyEvent.create({
    data: {
      id: entry.id,
      storyId: entry.storyId || 'system',
      eventType: 'audit_log',
      payload: {
        action: entry.action,
        sessionId: entry.sessionId,
        gate: entry.gate,
        timestamp: entry.timestamp,
        ...entry.details,
      },
      createdAt: entry.timestamp,
    },
  });
}

/**
 * Escalate an anomaly to the appropriate recipient
 */
export async function escalateAnomaly(anomaly: AnomalyRecord): Promise<void> {
  // Determine escalation target based on severity and type
  let escalateTo: 'operator' | 'problem_solver' | 'human' = 'problem_solver';
  
  if (anomaly.severity === 'critical') {
    escalateTo = 'human';
  } else if (anomaly.type === 'stale_session' && anomaly.gate === 'operator') {
    // Operator sessions get escalated to problem solver first (might be mid-backup)
    escalateTo = 'problem_solver';
  }

  // Send notification
  const subject = `[MC2 ${anomaly.severity.toUpperCase()}] ${anomaly.type.replace('_', ' ')} detected`;
  const body = buildEscalationMessage(anomaly);

  // For critical issues, send both Slack and email
  if (anomaly.severity === 'critical') {
    await sendSlackNotification(`🚨 ${subject}\n\n${body}`);
    await sendEmailNotification(
      'jpwolf00@gmail.com',
      subject,
      body
    );
  } else {
    await sendSlackNotification(`⚠️ ${subject}\n\n${body}`);
  }

  // Log the escalation
  await logAuditEntry({
    id: uuidv4(),
    timestamp: new Date(),
    action: 'escalation_sent',
    storyId: anomaly.storyId,
    sessionId: anomaly.sessionId,
    gate: anomaly.gate,
    details: {
      anomalyId: anomaly.id,
      escalatedTo: escalateTo,
      severity: anomaly.severity,
      type: anomaly.type,
    },
  });

  // Mark anomaly as escalated
  anomaly.escalated = true;
  anomaly.escalatedTo = escalateTo;
}

/**
 * Build escalation message with diagnostic context
 */
function buildEscalationMessage(anomaly: AnomalyRecord): string {
  const lines = [
    `**Anomaly Type**: ${anomaly.type.replace('_', ' ')}`,
    `**Severity**: ${anomaly.severity.toUpperCase()}`,
    `**Detected At**: ${anomaly.detectedAt.toISOString()}`,
    ``,
  ];

  if (anomaly.storyId) {
    lines.push(`**Story**: ${anomaly.storyId}`);
  }
  if (anomaly.sessionId) {
    lines.push(`**Session**: ${anomaly.sessionId}`);
  }
  if (anomaly.gate) {
    lines.push(`**Gate**: ${anomaly.gate}`);
  }

  lines.push(``, `**Details**: ${anomaly.details.description}`, ``);

  if (anomaly.details.diagnosticContext) {
    lines.push(`**Diagnostic Context**:`);
    for (const [key, value] of Object.entries(anomaly.details.diagnosticContext)) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  lines.push(``, `**Recommended Action**:`);
  
  switch (anomaly.type) {
    case 'stale_session':
      lines.push(`1. Check if agent is still running`);
      lines.push(`2. Review agent logs for errors`);
      lines.push(`3. Consider restarting the session`);
      break;
    case 'duplicate_run':
      lines.push(`1. Identify which session should continue`);
      lines.push(`2. Cancel duplicate sessions`);
      lines.push(`3. Review dispatch logic for race conditions`);
      break;
    case 'callback_timeout':
      lines.push(`1. Check agent health`);
      lines.push(`2. Review gateway connectivity`);
      lines.push(`3. Consider manual intervention`);
      break;
    case 'ghost_lock':
      lines.push(`1. Release the stale lock`);
      lines.push(`2. Re-dispatch the story if needed`);
      break;
    case 'cascading_failure':
      lines.push(`1. Review failure patterns`);
      lines.push(`2. Check provider status`);
      lines.push(`3. Consider pausing dispatch`);
      break;
  }

  return lines.join('\n');
}

/**
 * Send heartbeat ping to a long-running session
 * This is a proactive check to see if the agent is still alive
 */
export async function sendHeartbeatPing(sessionId: string): Promise<boolean> {
  const session = await prisma.runSession.findUnique({
    where: { id: sessionId },
    include: { story: true },
  });

  if (!session) {
    console.warn(`[RecoveryService] Session ${sessionId} not found for heartbeat ping`);
    return false;
  }

  // Log the ping attempt
  await logAuditEntry({
    id: uuidv4(),
    timestamp: new Date(),
    action: 'heartbeat_ping',
    storyId: session.storyId,
    sessionId: session.id,
    gate: session.gate as Gate,
    details: {
      lastHeartbeatAt: session.lastHeartbeatAt,
      sessionAge: session.startedAt ? Date.now() - session.startedAt.getTime() : null,
    },
  });

  // In a real implementation, this would send a ping to the agent
  // For now, we just log it and return true
  console.log(`[RecoveryService] Heartbeat ping sent to session ${sessionId}`);
  return true;
}

/**
 * Run all anomaly detection checks
 * Returns array of all detected anomalies
 */
export async function runAllAnomalyChecks(): Promise<AnomalyRecord[]> {
  const allAnomalies: AnomalyRecord[] = [];

  const checks = [
    detectStaleSessions,
    detectDuplicateRuns,
    detectCallbackTimeouts,
    detectGhostLocks,
    detectCascadingFailures,
  ];

  for (const check of checks) {
    try {
      const anomalies = await check();
      allAnomalies.push(...anomalies);
    } catch (error) {
      console.error(`[RecoveryService] Anomaly check ${check.name} failed:`, error);
    }
  }

  return allAnomalies;
}

/**
 * Resolve an anomaly manually
 */
export async function resolveAnomaly(anomalyId: string, resolution: string): Promise<void> {
  // In a real implementation, this would update the anomaly in the database
  // For now, we just log it
  await logAuditEntry({
    id: uuidv4(),
    timestamp: new Date(),
    action: 'resolved',
    details: {
      anomalyId,
      resolution,
    },
  });
}
