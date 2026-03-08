// Attachment Service - MC2-E2-S1
// Handles file uploads to local storage and Google Drive

import { prisma } from '@/lib/prisma';
import { 
  StoryAttachment, 
  CreateAttachmentInput, 
  AttachmentMetadata,
  validateAttachmentFile,
  validateAttachmentCount,
  generateUniqueFilename,
  sanitizeFilename,
  ATTACHMENT_CONFIG,
  isTextFile,
} from '@/domain/attachment';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Local storage path for attachments
const LOCAL_STORAGE_PATH = process.env.ATTACHMENT_STORAGE_PATH || '/tmp/mission-control-attachments';

/**
 * Initialize local storage directory
 */
async function ensureStorageDirectory(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
  } catch (error) {
    console.error('[attachment-service] Failed to create storage directory:', error);
    throw new Error('Failed to initialize attachment storage');
  }
}

/**
 * Upload file to Google Drive using gog CLI (optional, graceful degradation)
 */
async function uploadToGoogleDrive(
  localPath: string,
  filename: string,
  mimeType: string
): Promise<{ fileId: string; fileUrl: string } | null> {
  try {
    // Skip if gog CLI is not available (e.g., in Docker container)
    try {
      await execAsync('which gog');
    } catch {
      console.log('[attachment-service] gog CLI not available, skipping Google Drive upload');
      return null;
    }

    // Use gog CLI to upload file
    const { stdout } = await execAsync(
      `gog drive upload "${localPath}" --name "${sanitizeFilename(filename)}" --json`
    );

    const result = JSON.parse(stdout);

    // Extract file ID and construct URL
    const fileId = result.id || result.fileId;
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

    return { fileId, fileUrl };
  } catch (error) {
    console.error('[attachment-service] Google Drive upload failed:', error);
    // Graceful degradation: return null so local-only storage works
    return null;
  }
}

/**
 * Save file to local storage
 */
async function saveToLocalStorage(
  fileBuffer: Buffer,
  uniqueFilename: string
): Promise<string> {
  const filePath = join(LOCAL_STORAGE_PATH, uniqueFilename);
  await fs.writeFile(filePath, fileBuffer);
  return filePath;
}

/**
 * Delete file from local storage
 */
async function deleteFromLocalStorage(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('[attachment-service] Failed to delete local file:', filePath, error);
  }
}

/**
 * Delete file from Google Drive
 */
async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  try {
    await execAsync(`gog drive delete "${fileId}" --force`);
  } catch (error) {
    console.warn('[attachment-service] Failed to delete Google Drive file:', fileId, error);
  }
}

/**
 * Create a new attachment for a story
 */
export async function createAttachment(
  input: CreateAttachmentInput,
  fileBuffer: Buffer
): Promise<StoryAttachment> {
  // Validate file
  const validation = validateAttachmentFile(input.mimeType, input.originalName, input.size);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => e.message).join(', ');
    throw new Error(`Invalid file: ${errorMessages}`);
  }

  // Check attachment count
  const existingCount = await prisma.storyAttachment.count({
    where: { storyId: input.storyId },
  });
  
  const countValidation = validateAttachmentCount(existingCount);
  if (!countValidation.valid) {
    throw new Error(countValidation.error);
  }

  // Ensure storage directory exists
  await ensureStorageDirectory();

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(input.originalName);
  
  // Save to local storage
  const localPath = await saveToLocalStorage(fileBuffer, uniqueFilename);

  // Upload to Google Drive (optional, graceful degradation)
  const driveResult = await uploadToGoogleDrive(
    localPath,
    input.originalName,
    input.mimeType
  );

  const fallbackFileId = `local:${uniqueFilename}`;
  const fallbackFileUrl = 'local://stored';

  // Create database record (always provide a URL; use local fallback if Drive unavailable)
  const attachment = await prisma.storyAttachment.create({
    data: {
      id: uuidv4(),
      storyId: input.storyId,
      filename: uniqueFilename,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
      localPath,
      googleDriveFileId: driveResult?.fileId || fallbackFileId,
      googleDriveUrl: driveResult?.fileUrl || fallbackFileUrl,
      uploadedBy: input.uploadedBy,
      description: input.description,
    },
  });

  return mapPrismaToDomain(attachment);
}

/**
 * Get all attachments for a story
 */
export async function getAttachmentsByStoryId(storyId: string): Promise<AttachmentMetadata[]> {
  const attachments = await prisma.storyAttachment.findMany({
    where: { storyId },
    orderBy: { createdAt: 'asc' },
  });

  return attachments.map(mapPrismaToMetadata);
}

/**
 * Get a single attachment by ID
 */
export async function getAttachmentById(attachmentId: string): Promise<StoryAttachment | null> {
  const attachment = await prisma.storyAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) return null;
  return mapPrismaToDomain(attachment);
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const attachment = await getAttachmentById(attachmentId);
  
  if (!attachment) {
    throw new Error('Attachment not found');
  }

  // Delete from Google Drive
  await deleteFromGoogleDrive(attachment.googleDriveFileId);
  
  // Delete from local storage
  await deleteFromLocalStorage(attachment.localPath);
  
  // Delete from database
  await prisma.storyAttachment.delete({
    where: { id: attachmentId },
  });
}

/**
 * Read attachment file content (for text files - to include in agent prompts)
 */
export async function readAttachmentContent(attachmentId: string): Promise<string | null> {
  const attachment = await getAttachmentById(attachmentId);
  
  if (!attachment) return null;
  
  // Only read text files
  if (!isTextFile(attachment.mimeType)) {
    return null;
  }

  try {
    const content = await fs.readFile(attachment.localPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('[attachment-service] Failed to read attachment content:', error);
    return null;
  }
}

/**
 * Get all text attachments for a story (for agent prompts)
 */
export async function getTextAttachmentsForStory(storyId: string): Promise<
  Array<{ filename: string; content: string }>
> {
  const attachments = await prisma.storyAttachment.findMany({
    where: { storyId },
  });

  const textAttachments: Array<{ filename: string; content: string }> = [];

  for (const attachment of attachments) {
    if (isTextFile(attachment.mimeType)) {
      try {
        const content = await fs.readFile(attachment.localPath, 'utf-8');
        textAttachments.push({
          filename: attachment.originalName,
          content,
        });
      } catch (error) {
        console.warn('[attachment-service] Failed to read text attachment:', attachment.filename, error);
      }
    }
  }

  return textAttachments;
}

/**
 * Map Prisma attachment to domain entity
 */
function mapPrismaToDomain(prismaAttachment: any): StoryAttachment {
  return {
    id: prismaAttachment.id,
    storyId: prismaAttachment.storyId,
    filename: prismaAttachment.filename,
    originalName: prismaAttachment.originalName,
    mimeType: prismaAttachment.mimeType,
    size: prismaAttachment.size,
    localPath: prismaAttachment.localPath,
    googleDriveFileId: prismaAttachment.googleDriveFileId,
    googleDriveUrl: prismaAttachment.googleDriveUrl,
    uploadedBy: prismaAttachment.uploadedBy,
    description: prismaAttachment.description,
    createdAt: prismaAttachment.createdAt,
    updatedAt: prismaAttachment.updatedAt,
  };
}

/**
 * Map Prisma attachment to metadata (for API responses - excludes paths)
 */
function mapPrismaToMetadata(prismaAttachment: any): AttachmentMetadata {
  const isLocalOnly = String(prismaAttachment.googleDriveFileId || '').startsWith('local:');
  return {
    id: prismaAttachment.id,
    filename: prismaAttachment.filename,
    originalName: prismaAttachment.originalName,
    mimeType: prismaAttachment.mimeType,
    size: prismaAttachment.size,
    googleDriveUrl: isLocalOnly ? undefined : (prismaAttachment.googleDriveUrl ?? undefined),
    description: prismaAttachment.description,
    createdAt: prismaAttachment.createdAt,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
