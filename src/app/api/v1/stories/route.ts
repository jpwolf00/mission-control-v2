import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoriesFromDB, createStoryInDB, approveRequirementsInDB, getStoryByIdFromDB } from '@/services/story-store-db';

const createStorySchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  requirementsArtifactId: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export async function GET() {
  try {
    const stories = await getStoriesFromDB();
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Failed to fetch stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createStorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 422 }
      );
    }

    const story = await createStoryInDB(validation.data);
    return NextResponse.json(story, { status: 201 });
  } catch (error) {
    console.error('Failed to create story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { storyId, approved } = await request.json();

    if (!storyId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing storyId or approved' },
        { status: 422 }
      );
    }

    const story = await approveRequirementsInDB(storyId, approved);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Failed to approve requirements:', error);
    return NextResponse.json(
      { error: 'Failed to approve requirements' },
      { status: 500 }
    );
  }
}