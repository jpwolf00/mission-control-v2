import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createStory, getStories, approveRequirements } from '@/services/story-store';
import { validateStoryInput } from '@/domain/story';
import { requireIdempotencyKey } from '@/api/v1/idempotency';

const createStorySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requirementsArtifactId: z.string().uuid().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export async function GET() {
  const stories = getStories();
  return NextResponse.json({ stories });
}

export async function POST(request: NextRequest) {
  // Validate idempotency
  const idempotencyCheck = requireIdempotencyKey(request.headers);
  if (!idempotencyCheck.ok) {
    return NextResponse.json(
      { error: idempotencyCheck.error },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateStoryInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 422 }
      );
    }

    // Create story
    const story = createStory(body);
    
    return NextResponse.json(
      { story, idempotencyKey: idempotencyCheck.key },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const idempotencyCheck = requireIdempotencyKey(request.headers);
  if (!idempotencyCheck.ok) {
    return NextResponse.json(
      { error: idempotencyCheck.error },
      { status: 400 }
    );
  }

  try {
    const { storyId, approved } = await request.json();
    
    if (!storyId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing storyId or approved status' },
        { status: 422 }
      );
    }

    const story = approveRequirements(storyId, approved);
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ story });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
