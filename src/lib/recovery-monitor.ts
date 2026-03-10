/**
 * Recovery Monitor - Periodic anomaly detection
 * 
 * Runs anomaly detection checks on a schedule and escalates critical issues.
 * Designed to be called by a cron job or heartbeat mechanism.
 */

import {
  runAllAnomalyChecks,
  escalateAnomaly,
  sendHeartbeatPing,
  GATE_HEARTBEAT_CONFIGS,
  type AnomalyRecord,
  type AnomalySeverity,
} from '@/services/recovery-service';
import { prisma } from '@/lib/prisma';
import { Gate } from '@/domain/workflow-types';

/**
 * Monitor state (in-memory, can be replaced with Redis for multi-instance)
 */
interface MonitorState {
  lastRun: Date | null;
  lastEscalation: Date | null;
  anomaliesDetected: number;
  escalationsSent: number;
  pingsSent: number;
}

const monitorState: MonitorState = {
  lastRun: null,
  lastEscalation: null,
  anomaliesDetected: 0,
  escalationsSent: 0,
  pingsSent: 0,
};

/**
 * Configuration for the recovery monitor
 */
export interface RecoveryMonitorConfig {
  checkIntervalMs: number;        // How often to run checks (default: 5 minutes)
  escalationCooldownMs: number;   // Minimum time between escalations for same anomaly (default: 30 minutes)
  pingBeforeEscalate: boolean;    // Send heartbeat ping before escalating (default: true)
  autoResolveGhostLocks: boolean; // Automatically resolve ghost locks (default: false)
}

const DEFAULT_CONFIG: RecoveryMonitorConfig = {
  checkIntervalMs: 5 * 60 * 1000,  // 5 minutes
  escalationCooldownMs: 30 * 60 * 1000,  // 30 minutes
  pingBeforeEscalate: true,
  autoResolveGhostLocks: false,
};

/**
 * Run the recovery monitor
 * This should be called periodically (e.g., every 5 minutes)
 */
export async function runRecoveryMonitor(config: RecoveryMonitorConfig = DEFAULT_CONFIG): Promise<{
  anomaliesDetected: number;
  escalationsSent: number;
  pingsSent: number;
  anomalies: AnomalyRecord[];
}> {
  console.log('[RecoveryMonitor] Starting anomaly detection run...');
  monitorState.lastRun = new Date();

  // Run all anomaly checks
  const anomalies = await runAllAnomalyChecks();
  monitorState.anomaliesDetected += anomalies.length;

  console.log(`[RecoveryMonitor] Detected ${anomalies.length} anomalies`);

  // Process each anomaly
  for (const anomaly of anomalies) {
    // Check if we should escalate
    if (shouldEscalate(anomaly, config)) {
      // Send ping first if configured and anomaly is stale session
      if (config.pingBeforeEscalate && anomaly.type === 'stale_session' && anomaly.sessionId) {
        console.log(`[RecoveryMonitor] Sending heartbeat ping to session ${anomaly.sessionId}`);
        await sendHeartbeatPing(anomaly.sessionId);
        monitorState.pingsSent++;
        
        // Wait a bit to see if agent responds
        await new Promise(resolve => setTimeout(resolve, 10000));  // 10 seconds
        
        // Re-check if session is still stale
        const stillStale = await isSessionStillStale(anomaly.sessionId, anomaly.gate as Gate);
        if (!stillStale) {
          console.log(`[RecoveryMonitor] Session ${anomaly.sessionId} recovered after ping, skipping escalation`);
          continue;
        }
      }

      // Escalate the anomaly
      console.log(`[RecoveryMonitor] Escalating anomaly ${anomaly.id} (${anomaly.type}) to ${anomaly.severity}`);
      await escalateAnomaly(anomaly);
      monitorState.escalationsSent++;
      monitorState.lastEscalation = new Date();
    }

    // Auto-resolve ghost locks if configured
    if (config.autoResolveGhostLocks && anomaly.type === 'ghost_lock' && anomaly.storyId && anomaly.gate) {
      console.log(`[RecoveryMonitor] Auto-resolving ghost lock for story ${anomaly.storyId} gate ${anomaly.gate}`);
      // This would call a cleanup function
    }
  }

  // Log summary
  console.log(`[RecoveryMonitor] Run complete: ${anomalies.length} anomalies, ${monitorState.escalationsSent} escalations, ${monitorState.pingsSent} pings`);

  return {
    anomaliesDetected: anomalies.length,
    escalationsSent: monitorState.escalationsSent,
    pingsSent: monitorState.pingsSent,
    anomalies,
  };
}

/**
 * Determine if an anomaly should be escalated
 */
function shouldEscalate(anomaly: AnomalyRecord, config: RecoveryMonitorConfig): boolean {
  // Don't escalate if already escalated
  if (anomaly.escalated) {
    return false;
  }

  // Always escalate critical severity
  if (anomaly.severity === 'critical') {
    return true;
  }

  // For high severity, escalate immediately
  if (anomaly.severity === 'high') {
    return true;
  }

  // For medium severity, check cooldown
  if (anomaly.severity === 'medium') {
    if (!monitorState.lastEscalation) {
      return true;
    }
    const timeSinceLastEscalation = Date.now() - monitorState.lastEscalation.getTime();
    return timeSinceLastEscalation > config.escalationCooldownMs;
  }

  // Low severity: don't auto-escalate
  return false;
}

/**
 * Check if a session is still stale (helper for ping-then-check flow)
 */
async function isSessionStillStale(sessionId: string, gate: Gate): Promise<boolean> {
  const session = await prisma.runSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || !session.lastHeartbeatAt) {
    return true;
  }

  const config = GATE_HEARTBEAT_CONFIGS[gate];
  if (!config) {
    return true;
  }

  const timeSinceHeartbeat = Date.now() - session.lastHeartbeatAt.getTime();
  return timeSinceHeartbeat > config.thresholdMs;
}

/**
 * Get monitor state
 */
export function getMonitorState(): MonitorState {
  return { ...monitorState };
}

/**
 * Reset monitor state (for testing or manual reset)
 */
export function resetMonitorState(): void {
  monitorState.lastRun = null;
  monitorState.lastEscalation = null;
  monitorState.anomaliesDetected = 0;
  monitorState.escalationsSent = 0;
  monitorState.pingsSent = 0;
}

/**
 * Get recovery health summary
 */
export async function getRecoveryHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  activeSessions: number;
  staleSessions: number;
  recentAnomalies: number;
  recentEscalations: number;
  lastCheck: Date | null;
}> {
  const now = new Date();
  
  // Count active sessions
  const activeSessions = await prisma.runSession.count({
    where: { status: 'active' },
  });

  // Count stale sessions (no heartbeat in last 10 minutes)
  const staleSessions = await prisma.runSession.count({
    where: {
      status: 'active',
      lastHeartbeatAt: {
        lt: new Date(now.getTime() - 10 * 60 * 1000),
      },
    },
  });

  // Count recent anomalies (last hour)
  const recentAnomalies = await prisma.storyEvent.count({
    where: {
      eventType: 'audit_log',
      createdAt: {
        gte: new Date(now.getTime() - 60 * 60 * 1000),
      },
      payload: {
        path: ['action'],
        equals: 'anomaly_detected',
      },
    },
  });

  // Count recent escalations (last hour)
  const recentEscalations = await prisma.storyEvent.count({
    where: {
      eventType: 'audit_log',
      createdAt: {
        gte: new Date(now.getTime() - 60 * 60 * 1000),
      },
      payload: {
        path: ['action'],
        equals: 'escalation_sent',
      },
    },
  });

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
  
  if (staleSessions > 3 || recentEscalations > 5) {
    status = 'critical';
  } else if (staleSessions > 0 || recentAnomalies > 2) {
    status = 'degraded';
  }

  return {
    status,
    activeSessions,
    staleSessions,
    recentAnomalies,
    recentEscalations,
    lastCheck: monitorState.lastRun,
  };
}
