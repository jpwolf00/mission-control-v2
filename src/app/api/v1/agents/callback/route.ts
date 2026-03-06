import { NextRequest, NextResponse } from 'next/server';
import { requireIdempotencyKey } from '@/api/v1/idempotency';
import { completeSession, getSession } from '@/services/dispatch-service';

type CallbackEvent = 'completed' | 'failed' | 'heartbeat';

export async function POST(request: NextRequest) {
  const idempotencyCheck = requireIdempotencyKey(request.headers);
  if (!idempotencyCheck.ok) {
    return NextResponse.json(
      { error: idempotencyCheck.error },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { sessionId, agentId, role, event, evidence, error: agentError } = body as {
      sessionId: string;
      agentId: string;
      role: string;
      event: CallbackEvent;
      evidence?: unknown[];
      error?: string;
    };

    if (!sessionId || !agentId || !role || !event) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, agentId, role, event' },
        { status: 422 }
      );
    }

    // Verify session exists
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    switch (event) {
      case 'completed':
        completeSession(sessionId);
        console.log(`[agent-callback] Session ${sessionId} completed by ${agentId} (${role}). Evidence items: ${evidence?.length || 0}`);
        return NextResponse.json({
          status: 'completed',
          sessionId,
          message: 'Session completed, lock released',
        });

      case 'failed':
        completeSession(sessionId);
        console.log(`[agent-callback] Session ${sessionId} failed. Agent: ${agentId}, Error: ${agentError}`);
        return NextResponse.json({
          status: 'failed',
          sessionId,
          message: 'Session failed, lock released',
          error: agentError,
        });

      case 'heartbeat':
        console.log(`[agent-callback] Heartbeat from ${agentId} for session ${sessionId}`);
        return NextResponse.json({
          status: 'heartbeat_received',
          sessionId,
        });

      default:
        return NextResponse.json(
          { error: `Unknown event: ${event}` },
          { status: 422 }
        );
    }
  } catch (error) {
    console.error('Failed to process agent callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
