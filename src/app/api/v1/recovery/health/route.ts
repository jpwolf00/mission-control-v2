/**
 * GET /api/v1/recovery/health
 * 
 * Get recovery system health status
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getRecoveryHealth, runRecoveryMonitor, getMonitorState } from '@/lib/recovery-monitor';

export async function GET(request: Request) {
  // Validate authentication
  const authError = requireAuth(request as any);
  if (authError) {
    return authError;
  }

  try {
    const health = await getRecoveryHealth();
    const state = getMonitorState();

    return NextResponse.json({
      success: true,
      health,
      monitor: {
        lastRun: state.lastRun,
        lastEscalation: state.lastEscalation,
        totalAnomaliesDetected: state.anomaliesDetected,
        totalEscalationsSent: state.escalationsSent,
        totalPingsSent: state.pingsSent,
      },
    });
  } catch (error) {
    console.error('Failed to get recovery health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/recovery/health
 * 
 * Trigger an immediate recovery check run
 */
export async function POST(request: Request) {
  // Validate authentication
  const authError = requireAuth(request as any);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { escalate = false } = body as { escalate?: boolean };

    const result = await runRecoveryMonitor();

    return NextResponse.json({
      success: true,
      triggered: true,
      anomaliesDetected: result.anomaliesDetected,
      escalationsSent: result.escalationsSent,
      pingsSent: result.pingsSent,
      anomalies: result.anomalies.map(a => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        storyId: a.storyId,
        sessionId: a.sessionId,
        gate: a.gate,
        description: a.details.description,
        escalated: a.escalated,
      })),
    });
  } catch (error) {
    console.error('Failed to trigger recovery check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
