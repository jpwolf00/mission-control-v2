import { NextRequest, NextResponse } from 'next/server';
import { getStoryByIdFromDB } from '@/services/story-store-db';

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
