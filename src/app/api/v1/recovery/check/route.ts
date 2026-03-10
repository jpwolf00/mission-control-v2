/**
 * POST /api/v1/recovery/check
 * 
 * Run all anomaly detection checks and return results.
 * Optionally escalate detected anomalies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import {
  runAllAnomalyChecks,
  escalateAnomaly,
  type AnomalyRecord,
} from '@/services/recovery-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  // Validate authentication
  const authError = requireAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { escalate = false, types } = body as {
      escalate?: boolean;
      types?: Array<'stale_session' | 'duplicate_run' | 'callback_timeout' | 'ghost_lock' | 'cascading_failure' | 'network_partition'>;
    };

    // Run all anomaly checks
    const anomalies = await runAllAnomalyChecks();

    // Filter by types if specified
    const filteredAnomalies = types
      ? anomalies.filter(a => types.includes(a.type))
      : anomalies;

    // Escalate if requested
    if (escalate) {
      for (const anomaly of filteredAnomalies) {
        if (!anomaly.escalated) {
          await escalateAnomaly(anomaly);
        }
      }
    }

    return NextResponse.json({
      success: true,
      anomaliesFound: filteredAnomalies.length,
      anomalies: filteredAnomalies.map(a => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        storyId: a.storyId,
        sessionId: a.sessionId,
        gate: a.gate,
        detectedAt: a.detectedAt,
        description: a.details.description,
        escalated: a.escalated,
        escalatedTo: a.escalatedTo,
      })),
      escalated: escalate ? filteredAnomalies.filter(a => a.escalated).length : 0,
    });
  } catch (error) {
    console.error('Failed to run recovery checks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/recovery/check
 * 
 * Get recent anomalies from the database
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authError = requireAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const unresolvedOnly = searchParams.get('unresolved') === 'true';

    // Get recent audit logs (anomaly detections)
    const recentAnomalies = await prisma.storyEvent.findMany({
      where: {
        eventType: 'audit_log',
        ...(unresolvedOnly ? {
          payload: {
            path: ['action'],
            equals: 'anomaly_detected',
          },
        } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 100),
      include: {
        story: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: recentAnomalies.length,
      anomalies: recentAnomalies.map(event => {
        const payload = event.payload as Record<string, unknown> | undefined;
        return {
          id: event.id,
          storyId: event.storyId,
          storyTitle: event.story?.title,
          type: payload?.type,
          severity: payload?.severity,
          action: payload?.action,
          timestamp: event.createdAt,
          details: payload,
        };
      }),
    });
  } catch (error) {
    console.error('Failed to fetch recent anomalies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
