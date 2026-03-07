// API Route: DELETE /api/v1/stories/[id]/attachments/[attachmentId]
// MC2-E2-S1: Attachment support for stories

import { NextRequest, NextResponse } from 'next/server';
import { deleteAttachment, getAttachmentById } from '@/services/attachment-service';
import { getStoryByIdFromDB } from '@/services/story-store-db';

/**
 * DELETE /api/v1/stories/[id]/attachments/[attachmentId]
 * Delete an attachment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const storyId = params.id;
    const attachmentId = params.attachmentId;
    
    // Verify story exists
    const story = await getStoryByIdFromDB(storyId);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Verify attachment exists and belongs to this story
    const attachment = await getAttachmentById(attachmentId);
    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    if (attachment.storyId !== storyId) {
      return NextResponse.json(
        { error: 'Attachment does not belong to this story' },
        { status: 403 }
      );
    }

    // Delete attachment
    await deleteAttachment(attachmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
