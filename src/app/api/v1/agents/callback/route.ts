import { NextRequest, NextResponse } from 'next/server';
import { requireIdempotencyKey } from '@/api/v1/idempotency';
import { completeSession, getSession } from '@/services/dispatch-service';
import { getStoryByIdFromDB, saveGateCompletion, updateStoryStatus } from '@/services/story-store-db';

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
      case 'completed': {
        const story = await getStoryByIdFromDB(session.storyId);
        if (!story) {
          completeSession(sessionId);
          return NextResponse.json(
            { error: `Story not found for session: ${session.storyId}` },
            { status: 404 }
          );
        }

        // Idempotent guard: if this gate is already approved, do not re-persist.
        const existingApproved = (story.gates || []).find(
          (g) => g.gate === session.gate && g.status === 'approved'
        );

        if (!existingApproved) {
          const callbackEvidence = Array.isArray(evidence) ? evidence : [];
          await saveGateCompletion({
            storyId: session.storyId,
            gate: session.gate,
            status: 'approved',
            evidence: callbackEvidence,
            completedBy: agentId,
          });

          if (session.gate === 'reviewer-b') {
            await updateStoryStatus(session.storyId, 'completed');
          } else if (story.status === 'approved') {
            await updateStoryStatus(session.storyId, 'active');
          }
        }

        // Always release lock/session state after callback processing.
        completeSession(sessionId);

        console.log(`[agent-callback] Session ${sessionId} completed by ${agentId} (${role}). Evidence items: ${evidence?.length || 0}`);
        return NextResponse.json({
          status: 'completed',
          sessionId,
          storyId: session.storyId,
          gate: session.gate,
          message: existingApproved
            ? 'Session completed, gate already approved (idempotent)'
            : 'Session completed and gate approved',
          // NOTE: auto-dispatch intentionally not performed here to avoid recursive dispatch loops.
          autoDispatch: { attempted: false, reason: 'disabled-in-callback-safety' },
        });
      }

      case 'failed': {
        const story = await getStoryByIdFromDB(session.storyId);
        const alreadyApproved = !!(story?.gates || []).find(
          (g) => g.gate === session.gate && g.status === 'approved'
        );

        // Do not regress already-approved gates to blocked state on late/duplicate failed callbacks.
        if (!alreadyApproved) {
          await updateStoryStatus(session.storyId, 'blocked');
        }

        completeSession(sessionId);
        console.log(`[agent-callback] Session ${sessionId} failed. Agent: ${agentId}, Error: ${agentError}`);
        return NextResponse.json({
          status: 'failed',
          sessionId,
          storyId: session.storyId,
          gate: session.gate,
          message: alreadyApproved
            ? 'Session failed callback ignored (gate already approved), lock released'
            : 'Session failed, story blocked, lock released',
          error: agentError,
        });
      }

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
