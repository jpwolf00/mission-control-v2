import { NextRequest, NextResponse } from 'next/server';
import { getStoryByIdFromDB, approveRequirementsInDB } from '@/services/story-store-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const story = await getStoryByIdFromDB(id);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Failed to fetch story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/stories/[id] - Approve or reject a story
 * Body: { action: 'approve' | 'reject' }
 * Transitions story from draft/pending_approval to approved (or back to draft)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 422 }
      );
    }

    const approved = action === 'approve';
    const story = await approveRequirementsInDB(id, approved);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Failed to update story:', error);
    return NextResponse.json(
      { error: 'Failed to update story' },
      { status: 500 }
    );
  }
}
