import { v4 as uuidv4 } from 'uuid';
import { getStoryByIdFromDB } from './story-store-db';
import { acquireLock, releaseLock } from './lock-service';
import { Gate, GATES } from '@/domain/workflow-types';
import { triggerAgent, gateToRole } from './openclaw-client';

interface DispatchResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  code?: string;
}

const activeSessions = new Map<string, {
  storyId: string;
  gate: string;
  startedAt: Date;
  idempotencyKey: string;
}>();

const ACTIVE_SESSION_TTL_MS = Number(process.env.ACTIVE_SESSION_TTL_MS || 15 * 60 * 1000);

export async function dispatchStory(
  storyId: string,
  gate: string,
  idempotencyKey: string
): Promise<DispatchResult> {
  // Check for existing session with same idempotency key.
  // If it is stale, expire and allow fresh dispatch.
  for (const [sessionId, session] of activeSessions) {
    if (session.idempotencyKey !== idempotencyKey) continue;

    const ageMs = Date.now() - session.startedAt.getTime();
    if (ageMs > ACTIVE_SESSION_TTL_MS) {
      console.warn(
        `[dispatch] Expiring stale session ${sessionId} for story=${session.storyId} gate=${session.gate} ageMs=${ageMs}`
      );
      completeSession(sessionId);
      continue;
    }

    return {
      success: true,
      sessionId,
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

  // Create session
  activeSessions.set(sessionId, {
    storyId,
    gate,
    startedAt: new Date(),
    idempotencyKey,
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
    // Roll back lock + in-memory session so dispatch does not report false success
    releaseLock(storyId, gateTyped, sessionId);
    activeSessions.delete(sessionId);

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

export function getSession(sessionId: string) {
  return activeSessions.get(sessionId);
}

export function completeSession(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (session) {
    releaseLock(session.storyId, session.gate as Gate, sessionId);
    activeSessions.delete(sessionId);
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

  // Generate idempotency key for auto-dispatch
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
