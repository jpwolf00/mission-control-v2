import { NextRequest, NextResponse } from 'next/server';
import {
  validateGateCompletion,
  createGateCompletion,
  createGateEvidence,
  isGate,
  isCompletionStatus,
  type GateEvidence,
} from '@/domain/gate-contracts';
import { getStoryByIdFromDB } from '@/services/story-store-db';
import { requireIdempotencyKey } from '@/api/v1/idempotency';
import { releaseLock } from '@/services/lock-service';
import type { Gate } from '@/domain/workflow-types';

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
    const { gate, storyId, sessionId, status, evidence, reviewerNotes } = body;

    // Validate required fields
    if (!gate || !storyId || !sessionId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: gate, storyId, sessionId, status' },
        { status: 422 }
      );
    }

    if (!isGate(gate)) {
      return NextResponse.json(
        { error: `Invalid gate: ${gate}` },
        { status: 422 }
      );
    }

    if (!isCompletionStatus(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 422 }
      );
    }

    // Verify story exists
    const story = await getStoryByIdFromDB(storyId);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Build evidence array
    const gateEvidence: GateEvidence[] = (evidence || []).map(
      (e: { type: string; description: string; source?: string; payload?: Record<string, unknown> }) =>
        createGateEvidence(e.type as GateEvidence['type'], e.description, {
          source: e.source,
          payload: e.payload,
        })
    );

    // Create gate completion
    const completion = createGateCompletion(
      gate,
      storyId,
      sessionId,
      status,
      gateEvidence,
      { reviewerNotes }
    );

    // Validate the completion
    const validation = validateGateCompletion(completion);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 422 }
      );
    }

    // On approved completion, release the dispatch lock
    if (status === 'approved') {
      releaseLock(storyId, gate as Gate, sessionId);
    }

    return NextResponse.json(completion);
  } catch (error) {
    console.error('Failed to complete gate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
