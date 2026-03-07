// API Route: GET/POST /api/v1/stories/[id]/attachments
// MC2-E2-S1: Attachment support for stories

import { NextRequest, NextResponse } from 'next/server';
import { getAttachmentsByStoryId, createAttachment } from '@/services/attachment-service';
import { getStoryByIdFromDB } from '@/services/story-store-db';

/**
 * GET /api/v1/stories/[id]/attachments
 * List all attachments for a story
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;
    
    // Verify story exists
    const story = await getStoryByIdFromDB(storyId);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const attachments = await getAttachmentsByStoryId(storyId);
    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/stories/[id]/attachments
 * Upload a new attachment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;
    
    // Verify story exists
    const story = await getStoryByIdFromDB(storyId);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string | null;
    const uploadedBy = formData.get('uploadedBy') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size (10MB)` },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create attachment
    const attachment = await createAttachment({
      storyId,
      filename: file.name,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      description: description || undefined,
      uploadedBy: uploadedBy || undefined,
    }, buffer);

    return NextResponse.json(
      {
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        googleDriveUrl: attachment.googleDriveUrl,
        description: attachment.description,
        createdAt: attachment.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    
    if (error instanceof Error && error.message.includes('Invalid file')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('Maximum')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}
