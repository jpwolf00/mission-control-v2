import { NextRequest, NextResponse } from 'next/server';
import { addCommentToStory, getCommentsForStory } from '@/services/story-store-db';

/**
 * GET /api/v1/stories/[id]/comments - Get all comments for a story
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const comments = await getCommentsForStory(storyId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/stories/[id]/comments - Add a comment to a story
 * Body: { content: string, author?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { content, author } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 422 }
      );
    }

    const comment = await addCommentToStory(storyId, content.trim(), author);
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
