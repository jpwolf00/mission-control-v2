// API Route: GET /api/v1/stories/[id]/attachments/[attachmentId]/download
// MC2-E2-S1: Attachment download endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getAttachmentById } from '@/services/attachment-service';
import { getStoryByIdFromDB } from '@/services/story-store-db';
import { promises as fs } from 'fs';

/**
 * GET /api/v1/stories/[id]/attachments/[attachmentId]/download
 * Download an attachment file
 */
export async function GET(
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

    // Read file from local storage
    try {
      const fileBuffer = await fs.readFile(attachment.localPath);
      
      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': attachment.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
          'Content-Length': attachment.size.toString(),
        },
      });
    } catch (error) {
      console.error('[download] Failed to read local file, attempting Google Drive fallback:', error);
      
      // Fallback: Return Google Drive URL for redirect
      // Note: In production, you might want to proxy through Google Drive API instead
      return NextResponse.redirect(attachment.googleDriveUrl);
    }
  } catch (error) {
    console.error('Failed to download attachment:', error);
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    );
  }
}
