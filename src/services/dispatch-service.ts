import { v4 as uuidv4 } from 'uuid';
import { getStoryByIdFromDB } from './story-store-db';
import { acquireLock, releaseLock } from './lock-service';
import { Gate, GATES } from '@/domain/workflow-types';
import { triggerAgent, gateToRole } from './openclaw-client';
import { prisma } from '@/lib/prisma';

interface DispatchResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  code?: string;
}

const ACTIVE_SESSION_TTL_MS = Number(process.env.ACTIVE_SESSION_TTL_MS || 15 * 60 * 1000);

export async function dispatchStory(
  storyId: string,
  gate: string,
  idempotencyKey: string
): Promise<DispatchResult> {
  // DB-backed idempotency: if we already saw this key, return existing session.
  const existingByKey = await prisma.runSession.findFirst({
    where: { idempotencyKey },
    orderBy: { createdAt: 'desc' },
  });

  if (existingByKey) {
    return {
      success: true,
      sessionId: existingByKey.id,
      code: 'IDEMPOTENT',
    };
  }

  // Also guard against active session for same story/gate in TTL window.
  const activeSameGate = await prisma.runSession.findFirst({
    where: {
      storyId,
      gate,
      status: 'active',
      startedAt: { gte: new Date(Date.now() - ACTIVE_SESSION_TTL_MS) },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (activeSameGate) {
    return {
      success: true,
      sessionId: activeSameGate.id,
      code: 'IDEMPOTENT',
    };
  }

  // Get story from database
  const story = await getStoryByIdFromDB(storyId);
  if (!story) {
    return {
      success: false,
      error: 'Story not found',
      code: 'NOT_FOUND',
    };
  }

  // Check preconditions
  if (!story.metadata.approvedRequirementsArtifact) {
    return {
      success: false,
      error: 'Requirements not approved',
      code: 'PRECONDITION_FAILED',
    };
  }

  // Server-side guard: do not dispatch already-approved gates
  const gateAlreadyApproved = (story.gates || []).some(
    (g) => g.gate === gate && g.status === 'approved'
  );
  if (gateAlreadyApproved) {
    return {
      success: false,
      error: `Gate already completed: ${gate}`,
      code: 'ALREADY_COMPLETED',
    };
  }

  // Generate session ID and acquire lock
  const sessionId = uuidv4();
  const gateTyped = gate as Gate;
  const lockResult = acquireLock(storyId, gateTyped, sessionId);
  if (!lockResult.ok) {
    return {
      success: false,
      error: 'Dispatch conflict: story already has active session',
      code: 'CONFLICT',
    };
  }

  // Persist session before external dispatch.
  await prisma.runSession.create({
    data: {
      id: sessionId,
      storyId,
      gate,
      status: 'active',
      startedAt: new Date(),
      idempotencyKey,
      dispatchAttempts: 1,
      metadata: {
        gateRole: gateToRole(gateTyped),
      },
    },
  });

  // Trigger Openclaw agent for this gate
  const triggerResult = await triggerAgent({
    storyId,
    gate: gateTyped,
    sessionId,
    role: gateToRole(gateTyped),
    context: { story },
  });

  if (!triggerResult.success) {
    // Roll back lock + mark session failed so it is visible in DB.
    releaseLock(storyId, gateTyped, sessionId);
    await prisma.runSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        endedAt: new Date(),
        metadata: {
          triggerError: triggerResult.error || 'Failed to trigger OpenClaw agent',
        },
      },
    });

    return {
      success: false,
      error: triggerResult.error || 'Failed to trigger OpenClaw agent',
      code: 'GATEWAY_ERROR',
    };
  }

  return {
    success: true,
    sessionId,
  };
}

export async function getSession(sessionId: string) {
  return prisma.runSession.findUnique({ where: { id: sessionId } });
}

export async function completeSession(sessionId: string, status: 'completed' | 'failed' | 'cancelled' = 'completed') {
  const session = await prisma.runSession.findUnique({ where: { id: sessionId } });
  if (session) {
    releaseLock(session.storyId, session.gate as Gate, sessionId);
    await prisma.runSession.update({
      where: { id: sessionId },
      data: {
        status,
        endedAt: new Date(),
      },
    });
  }
}

/**
 * Get the next gate in the workflow sequence.
 * Returns null if the current gate is the final gate (reviewer-b).
 */
export function getNextGate(currentGate: Gate): Gate | null {
  const idx = GATES.indexOf(currentGate);
  if (idx < 0 || idx === GATES.length - 1) {
    return null;
  }
  return GATES[idx + 1];
}

/**
 * Auto-dispatch to the next gate after a gate completes.
 * Returns the result of the dispatch attempt.
 */
export async function autoDispatchNextGate(
  storyId: string,
  completedGate: Gate
): Promise<{
  success: boolean;
  nextGate?: Gate;
  sessionId?: string;
  error?: string;
  reason?: string;
}> {
  const nextGate = getNextGate(completedGate);

  if (!nextGate) {
    // Final gate completed, no auto-dispatch needed
    return {
      success: true,
      reason: 'final_gate_completed',
    };
  }

  console.log(`[auto-dispatch] Story ${storyId}: ${completedGate} completed, dispatching ${nextGate}`);

  // Stable idempotency key for auto-dispatch.
  const idempotencyKey = `auto-dispatch-${storyId}-${nextGate}`;

  const dispatchResult = await dispatchStory(storyId, nextGate, idempotencyKey);

  if (!dispatchResult.success) {
    console.error(
      `[auto-dispatch] Story ${storyId}: failed to dispatch ${nextGate}: ${dispatchResult.error}`
    );
    return {
      success: false,
      nextGate,
      error: dispatchResult.error,
    };
  }

  console.log(
    `[auto-dispatch] Story ${storyId}: successfully dispatched ${nextGate} with session ${dispatchResult.sessionId}`
  );

  return {
    success: true,
    nextGate,
    sessionId: dispatchResult.sessionId,
  };
}
