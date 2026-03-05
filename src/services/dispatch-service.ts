import { v4 as uuidv4 } from 'uuid';
import { getStoryById } from './story-store';
import { acquireLock, releaseLock } from './lock-service';
import { Gate } from '@/domain/workflow-types';

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

export function dispatchStory(
  storyId: string,
  gate: string,
  idempotencyKey: string
): DispatchResult {
  // Check for existing session with same idempotency key
  for (const [sessionId, session] of activeSessions) {
    if (session.idempotencyKey === idempotencyKey) {
      return {
        success: true,
        sessionId,
        code: 'IDEMPOTENT',
      };
    }
  }

  // Get story
  const story = getStoryById(storyId);
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
