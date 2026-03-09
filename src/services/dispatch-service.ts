import { v4 as uuidv4 } from 'uuid';
import { getStoryByIdFromDB } from './story-store-db';
import { acquireLock, releaseLock } from './lock-service';
import { Gate, GATES } from '@/domain/workflow-types';
import { triggerAgent, gateToRole } from './openclaw-client';
import { prisma } from '@/lib/prisma';
import {
  checkBudgetWindows,
  checkProviderDenylist,
  recordProviderFailure,
  setEstimatedInvocations,
} from './budget-service';
import { DISPATCH_RETURN_CODES, type DispatchReturnCode } from '@/domain/budget-types';

interface DispatchResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  code?: DispatchReturnCode;
}

// Default model/provider for dispatch when none specified
// These are fallbacks - the agent may use different values based on its config
const DEFAULT_MODEL = process.env.MC2_DEFAULT_MODEL || 'alibaba/qwen3.5-plus';
const DEFAULT_PROVIDER = process.env.MC2_DEFAULT_PROVIDER || 'alibaba';

/**
 * Get default model and provider for dispatch
 * Used when caller doesn't specify model/provider
 */
function getDefaultModelProvider(): { model: string; provider: string } {
  return {
    model: DEFAULT_MODEL,
    provider: DEFAULT_PROVIDER,
  };
}

// Hard guard: never create a second active run for the same story+gate.
// Previous TTL-based dedupe caused duplicate runs when long gates exceeded the TTL.

/**
 * Admission check for dispatch - validates budget, provider, and other constraints
 */
async function performAdmissionChecks(
  storyId: string,
  provider?: string,
  model?: string
): Promise<{ allowed: true } | { allowed: false; result: DispatchResult }> {
  // Check budget windows
  const budgetCheck = await checkBudgetWindows(storyId);
  if (!budgetCheck.allowed) {
    return {
      allowed: false,
      result: {
        success: false,
        error: budgetCheck.message || 'Budget check failed',
        code: budgetCheck.code,
      },
    };
  }

  // Check provider denylist
  if (provider) {
    const providerCheck = checkProviderDenylist(provider, model);
    if (!providerCheck.allowed) {
      return {
        allowed: false,
        result: {
          success: false,
          error: providerCheck.reason || 'Provider denylisted',
          code: DISPATCH_RETURN_CODES.CAP_EXCEEDED,
        },
      };
    }
  }

  return { allowed: true };
}

export async function dispatchStory(
  storyId: string,
  gate: string,
  idempotencyKey: string,
  options?: {
    provider?: string;
    model?: string;
    estimatedInvocations?: number;
  }
): Promise<DispatchResult> {
  // Use defaults if model/provider not specified
  const model = options?.model || getDefaultModelProvider().model;
  const provider = options?.provider || getDefaultModelProvider().provider;
  // DB-backed idempotency: if we already saw this key, return existing session.
  const existingByKey = await prisma.runSession.findFirst({
    where: { idempotencyKey },
    orderBy: { createdAt: 'desc' },
  });

  if (existingByKey) {
    return {
      success: true,
      sessionId: existingByKey.id,
      code: DISPATCH_RETURN_CODES.IDEMPOTENT,
    };
  }

  // Hard guard against duplicate active sessions for the same story+gate.
  // If one exists, always return it as idempotent (no TTL expiry-based redispatch).
  const activeSameGate = await prisma.runSession.findFirst({
    where: {
      storyId,
      gate,
      status: 'active',
    },
    orderBy: { startedAt: 'desc' },
  });

  if (activeSameGate) {
    console.log(
      `[dispatch] idempotent active run reuse story=${storyId} gate=${gate} session=${activeSameGate.id}`
    );
    return {
      success: true,
      sessionId: activeSameGate.id,
      code: DISPATCH_RETURN_CODES.IDEMPOTENT,
    };
  }

  // Get story from database
  const story = await getStoryByIdFromDB(storyId);
  if (!story) {
    return {
      success: false,
      error: 'Story not found',
      code: DISPATCH_RETURN_CODES.NOT_FOUND,
    };
  }

  // Check preconditions
  if (!story.metadata.approvedRequirementsArtifact) {
    return {
      success: false,
      error: 'Requirements not approved',
      code: DISPATCH_RETURN_CODES.PRECONDITION_FAILED,
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
      code: DISPATCH_RETURN_CODES.ALREADY_COMPLETED,
    };
  }

  // Perform admission checks (budget, provider denylist, etc.)
  const admissionCheck = await performAdmissionChecks(
    storyId,
    provider,
    model
  );
  if (!admissionCheck.allowed) {
    return admissionCheck.result;
  }

  // Generate session ID and acquire lock
  const sessionId = uuidv4();
  const gateTyped = gate as Gate;
  const lockResult = acquireLock(storyId, gateTyped, sessionId);
  if (!lockResult.ok) {
    return {
      success: false,
      error: 'Dispatch conflict: story already has active session',
      code: DISPATCH_RETURN_CODES.CONFLICT,
    };
  }

  // Persist session before external dispatch.
  // Set model/provider - these will be updated later if OpenClaw reports different values
  await prisma.runSession.create({
    data: {
      id: sessionId,
      storyId,
      gate,
      status: 'active',
      startedAt: new Date(),
      idempotencyKey,
      dispatchAttempts: 1,
      provider,
      model,
      estimatedInvocations: options?.estimatedInvocations || 0,
      metadata: {
        gateRole: gateToRole(gateTyped),
      },
    },
  });

  // Set estimated invocations if provided
  if (options?.estimatedInvocations) {
    await setEstimatedInvocations(sessionId, options.estimatedInvocations);
  }

  // Trigger Openclaw agent for this gate
  // Pass model/provider (will use defaults if not specified)
  const triggerResult = await triggerAgent({
    storyId,
    gate: gateTyped,
    sessionId,
    role: gateToRole(gateTyped),
    context: { story },
    model,
    provider,
  });

  if (!triggerResult.success) {
    // Record provider failure if applicable
    if (provider) {
      await recordProviderFailure(
        provider,
        model,
        triggerResult.error || 'Unknown trigger error'
      );
    }

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
      code: DISPATCH_RETURN_CODES.GATEWAY_ERROR,
    };
  }

  // Update session with model/provider if captured from OpenClaw response
  if (triggerResult.model || triggerResult.provider) {
    await prisma.runSession.update({
      where: { id: sessionId },
      data: {
        ...(triggerResult.model && { model: triggerResult.model }),
        ...(triggerResult.provider && { provider: triggerResult.provider }),
      },
    });
  }

  return {
    success: true,
    sessionId,
    code: DISPATCH_RETURN_CODES.SUCCESS,
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
