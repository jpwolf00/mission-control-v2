import { NextRequest, NextResponse } from 'next/server';
import { requireIdempotencyKey } from '@/api/v1/idempotency';
import { completeSession, getSession, autoDispatchNextGate } from '@/services/dispatch-service';
import { getStoryByIdFromDB, saveGateCompletion, updateStoryStatus } from '@/services/story-store-db';
import { incrementInvocationCount } from '@/services/budget-service';
import { requireAuth } from '@/lib/auth-middleware';
import type { Gate } from '@/domain/workflow-types';

type CallbackEvent = 'completed' | 'failed' | 'heartbeat' | 'invocation';

export async function POST(request: NextRequest) {
  // Step 1: Validate authentication
  const authError = requireAuth(request);
  if (authError) {
    return authError;
  }

  // Step 2: Validate idempotency key
  const idempotencyCheck = requireIdempotencyKey(request.headers);
  if (!idempotencyCheck.ok) {
    return NextResponse.json(
      { error: idempotencyCheck.error },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { sessionId, agentId, role, event, evidence, error: agentError, invocationCount, pickedUpAt, finalMessage, artifacts } = body as {
      sessionId: string;
      agentId: string;
      role: string;
      event: CallbackEvent;
      evidence?: unknown[];
      error?: string;
      invocationCount?: number;
      pickedUpAt?: number;         // Unix timestamp for when gate was picked up
      finalMessage?: string;      // Final agent output/summary
      artifacts?: {                // Screenshot/evidence artifacts
        type: 'screenshot' | 'log' | 'link';
        url: string;
        description?: string;
        timestamp?: number;
      }[];
    };

    if (!sessionId || !agentId || !role || !event) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, agentId, role, event' },
        { status: 422 }
      );
    }

    // Verify session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    switch (event) {
      case 'invocation': {
        // Track invocation count for budget reconciliation
        const count = invocationCount || 1;
        await incrementInvocationCount(sessionId, count);
        console.log(`[agent-callback] Invocation recorded for session ${sessionId}: +${count}`);
        return NextResponse.json({
          status: 'invocation_recorded',
          sessionId,
          count,
        });
      }

      case 'completed': {
        const story = await getStoryByIdFromDB(session.storyId);
        if (!story) {
          await completeSession(sessionId, 'failed');
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
          // Convert pickedUpAt from Unix timestamp to Date if provided
          const pickedUpDate = pickedUpAt ? new Date(pickedUpAt * 1000) : undefined;
          
          await saveGateCompletion({
            storyId: session.storyId,
            gate: session.gate,
            status: 'approved',
            evidence: callbackEvidence,
            completedBy: agentId,
            pickedUpAt: pickedUpDate,
            finalMessage: finalMessage,
            artifacts: artifacts,
          });

          if (session.gate === 'reviewer-b') {
            await updateStoryStatus(session.storyId, 'completed');
          } else if (story.status === 'approved') {
            await updateStoryStatus(session.storyId, 'active');
          }
        }

        // Auto-dispatch to next gate if not the final gate
        let autoDispatchResult: { attempted: boolean; success?: boolean; nextGate?: string; sessionId?: string; error?: string; reason?: string } = { attempted: false };

        if (!existingApproved) {
          const dispatchResult = await autoDispatchNextGate(session.storyId, session.gate as Gate);
          autoDispatchResult = {
            attempted: true,
            success: dispatchResult.success,
            ...(dispatchResult.nextGate && { nextGate: dispatchResult.nextGate }),
            ...(dispatchResult.sessionId && { sessionId: dispatchResult.sessionId }),
            ...(dispatchResult.error && { error: dispatchResult.error }),
            ...(dispatchResult.reason && { reason: dispatchResult.reason }),
          };
        }

        // Release lock/session state after persistence + auto-dispatch attempt.
        await completeSession(sessionId, 'completed');

        console.log(`[agent-callback] Session ${sessionId} completed by ${agentId} (${role}). Evidence items: ${evidence?.length || 0}. Auto-dispatch: ${autoDispatchResult.attempted ? JSON.stringify(autoDispatchResult) : 'skipped'}`);
        return NextResponse.json({
          status: 'completed',
          sessionId,
          storyId: session.storyId,
          gate: session.gate,
          message: existingApproved
            ? 'Session completed, gate already approved (idempotent)'
            : 'Session completed and gate approved',
          autoDispatch: autoDispatchResult,
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

        await completeSession(sessionId, 'failed');
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
