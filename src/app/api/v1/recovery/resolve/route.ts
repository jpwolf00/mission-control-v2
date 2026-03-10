/**
 * POST /api/v1/recovery/resolve
 * 
 * Resolve a detected anomaly (manual intervention)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { resolveAnomaly } from '@/services/recovery-service';
import { prisma } from '@/lib/prisma';
import { releaseLock } from '@/services/lock-service';
import { Gate } from '@/domain/workflow-types';

export async function POST(request: NextRequest) {
  // Validate authentication
  const authError = requireAuth(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { anomalyId, resolution, action } = body as {
      anomalyId: string;
      resolution: string;
      action?: 'resolve_only' | 'release_lock' | 'restart_session' | 'cancel_session';
    };

    if (!anomalyId || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: anomalyId, resolution' },
        { status: 422 }
      );
    }

    // Get the anomaly details from audit log
    const anomalyEvent = await prisma.storyEvent.findFirst({
      where: {
        id: anomalyId,
        eventType: 'audit_log',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!anomalyEvent) {
      return NextResponse.json(
        { error: 'Anomaly not found' },
        { status: 404 }
      );
    }

    const storyId = anomalyEvent.storyId;
    const payload = anomalyEvent.payload as Record<string, unknown> | undefined;
    const sessionId = payload?.sessionId as string | undefined;
    const gate = payload?.gate as Gate | undefined;

    // Perform additional action if specified
    if (action) {
      switch (action) {
        case 'release_lock':
          if (storyId && gate) {
            await releaseLock(storyId, gate, sessionId || 'unknown');
            console.log(`[RecoveryAPI] Released lock for story ${storyId} gate ${gate}`);
          }
          break;

        case 'restart_session':
          // Mark current session as failed and create new one
          if (sessionId) {
            const existingSession = await prisma.runSession.findUnique({
              where: { id: sessionId },
            });
            const existingMetadata = existingSession?.metadata as Record<string, unknown> || {};
            await prisma.runSession.update({
              where: { id: sessionId },
              data: {
                status: 'canceled',
                endedAt: new Date(),
                metadata: {
                  ...existingMetadata,
                  canceledForRestart: true,
                  canceledReason: resolution,
                },
              },
            });
            console.log(`[RecoveryAPI] Canceled session ${sessionId} for restart`);
          }
          break;

        case 'cancel_session':
          if (sessionId) {
            await prisma.runSession.update({
              where: { id: sessionId },
              data: {
                status: 'canceled',
                endedAt: new Date(),
              },
            });
            if (storyId && gate) {
              await releaseLock(storyId, gate, sessionId);
            }
            console.log(`[RecoveryAPI] Canceled session ${sessionId}`);
          }
          break;
      }
    }

    // Log the resolution
    await resolveAnomaly(anomalyId, resolution);

    return NextResponse.json({
      success: true,
      message: 'Anomaly resolved',
      anomalyId,
      action: action || 'resolve_only',
    });
  } catch (error) {
    console.error('Failed to resolve anomaly:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
