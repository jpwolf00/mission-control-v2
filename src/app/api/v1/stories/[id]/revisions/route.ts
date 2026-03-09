import { NextRequest, NextResponse } from 'next/server';
import { getRevisionsForStory, acceptFinalStory, requestRevision } from '@/services/story-store-db';

/**
 * GET /api/v1/stories/[id]/revisions - Get all revisions for a story
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const revisions = await getRevisionsForStory(storyId);
    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('Failed to fetch revisions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revisions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/stories/[id]/revisions - Accept final or request revision
 * Body: { action: 'accept_final' | 'request_revision', targetGate?: string, description?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { action, targetGate, description } = body;

    if (!action || !['accept_final', 'request_revision'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept_final" or "request_revision".' },
        { status: 422 }
      );
    }

    let result;
    if (action === 'accept_final') {
      result = await acceptFinalStory(storyId);
    } else {
      // Default to implementer if no targetGate specified
      const gate = targetGate || 'implementer';
      result = await requestRevision(storyId, gate, description);
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: action === 'accept_final' 
        ? 'Story accepted and archived' 
        : 'Revision requested, story sent back to ' + (targetGate || 'implementer'),
      story: result,
    });
  } catch (error) {
    console.error('Failed to process revision:', error);
    return NextResponse.json(
      { error: 'Failed to process revision' },
      { status: 500 }
    );
  }
}
