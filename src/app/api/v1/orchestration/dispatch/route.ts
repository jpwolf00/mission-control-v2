import { NextRequest, NextResponse } from 'next/server';
import { dispatchStory } from '@/services/dispatch-service';
import { requireIdempotencyKey } from '@/api/v1/idempotency';

export async function POST(request: NextRequest) {
  const idempotencyCheck = requireIdempotencyKey(request.headers);
  if (!idempotencyCheck.ok) {
    return NextResponse.json(
      { error: idempotencyCheck.error },
      { status: 400 }
    );
  }

  try {
    const { storyId, gate } = await request.json();

    if (!storyId || !gate) {
      return NextResponse.json(
        { error: 'Missing storyId or gate' },
        { status: 422 }
      );
    }

    const result = await dispatchStory(storyId, gate, idempotencyCheck.key!);

    if (!result.success) {
      const status =
        result.code === 'CONFLICT' ? 409 :
        result.code === 'GATEWAY_ERROR' ? 502 :
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
