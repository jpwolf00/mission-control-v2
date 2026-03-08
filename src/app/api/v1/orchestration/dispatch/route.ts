import { NextRequest, NextResponse } from 'next/server';
import { dispatchStory } from '@/services/dispatch-service';
import { requireIdempotencyKey } from '@/api/v1/idempotency';
import { DISPATCH_RETURN_CODES } from '@/domain/budget-types';

export async function POST(request: NextRequest) {
  const idempotencyCheck = requireIdempotencyKey(request.headers);
  if (!idempotencyCheck.ok) {
    return NextResponse.json(
      { error: idempotencyCheck.error },
      { status: 400 }
    );
  }

  try {
    const { storyId, gate, provider, model, estimatedInvocations } = await request.json();

    if (!storyId || !gate) {
      return NextResponse.json(
        { error: 'Missing storyId or gate' },
        { status: 422 }
      );
    }

    const result = await dispatchStory(storyId, gate, idempotencyCheck.key!, {
      provider,
      model,
      estimatedInvocations,
    });

    if (!result.success) {
      // Handle specific return codes with appropriate HTTP status
      if (result.code === DISPATCH_RETURN_CODES.ALREADY_COMPLETED) {
        return NextResponse.json({
          status: 'already_completed',
          gate,
          storyId,
          code: result.code,
          message: result.error,
        });
      }

      // Map budget/quota return codes to HTTP status
      const status =
        result.code === DISPATCH_RETURN_CODES.CONFLICT ? 409 :
        result.code === DISPATCH_RETURN_CODES.GATEWAY_ERROR ? 502 :
        result.code === DISPATCH_RETURN_CODES.QUOTA_SOFT_LIMIT ? 429 :  // Too Many Requests
        result.code === DISPATCH_RETURN_CODES.QUOTA_HARD_LIMIT ? 429 :
        result.code === DISPATCH_RETURN_CODES.QUOTA_BUDGET_EXCEEDED ? 429 :
        result.code === DISPATCH_RETURN_CODES.CAP_EXCEEDED ? 503 :       // Service Unavailable
        422;

      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      sessionId: result.sessionId,
      status: 'dispatched',
      gate,
      idempotencyKey: idempotencyCheck.key,
      code: result.code,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
