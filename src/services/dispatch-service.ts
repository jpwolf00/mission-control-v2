import { v4 as uuidv4 } from 'uuid';
import { getStoryByIdFromDB } from './story-store-db';
import { acquireLock, releaseLock } from './lock-service';
import { Gate } from '@/domain/workflow-types';
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
