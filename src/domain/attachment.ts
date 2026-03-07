// Story Attachment domain types and validation
// MC2-E2-S1: Attachment support for stories

/**
 * Supported file types for attachments
 */
export const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingmlprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/rtf': ['.rtf'],
  
  // Spreadsheets
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'application/vnd.google-apps.spreadsheet': ['.gsheet'],
  
  // Images
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Code
  'text/javascript': ['.js'],
  'application/typescript': ['.ts'],
  'text/typescript': ['.tsx'],
  'text/x-typescript': ['.tsx'],
  'text/x-python': ['.py'],
  'application/json': ['.json'],
  'application/x-yaml': ['.yaml', '.yml'],
  'text/yaml': ['.yaml', '.yml'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
} as const;

/**
 * Attachment configuration
 */
export const ATTACHMENT_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS_PER_STORY: 20,
} as const;

/**
 * Story attachment entity
 */
export interface StoryAttachment {
  id: string;
  storyId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  localPath: string;
  googleDriveFileId: string;
  googleDriveUrl: string;
  uploadedBy?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new attachment
 */
export interface CreateAttachmentInput {
  storyId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  uploadedBy?: string;
}

/**
 * Attachment metadata (without paths - for API responses)
 */
export interface AttachmentMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  googleDriveUrl: string;
  description?: string;
  createdAt: Date;
}

/**
 * Validation errors for attachment operations
 */
export interface AttachmentValidationError {
  field: string;
  message: string;
}

/**
 * Validates a file based on type and size
 */
export function validateAttachmentFile(
  mimeType: string,
  filename: string,
  size: number
): { valid: true } | { valid: false; errors: AttachmentValidationError[] } {
  const errors: AttachmentValidationError[] = [];

  // Check file size
  if (size > ATTACHMENT_CONFIG.MAX_FILE_SIZE) {
    errors.push({
      field: 'file',
      message: `File size (${formatFileSize(size)}) exceeds maximum allowed size (${formatFileSize(ATTACHMENT_CONFIG.MAX_FILE_SIZE)})`,
    });
  }

  // Check file extension
  const extension = getFileExtension(filename);
  if (!extension) {
    errors.push({
      field: 'filename',
      message: 'File must have a valid extension',
    });
  } else {
    // Check if extension is allowed
    const allowedExtensions = getAllowedExtensions();
    if (!allowedExtensions.includes(extension.toLowerCase())) {
      errors.push({
        field: 'filename',
        message: `File type "${extension}" is not allowed. Allowed types: ${allowedExtensions.join(', ')}`,
      });
    }
  }

  // Check MIME type (if provided)
  if (mimeType) {
    const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES);
    if (!allowedMimeTypes.includes(mimeType)) {
      errors.push({
        field: 'mimeType',
        message: `MIME type "${mimeType}" is not allowed`,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validates attachment count for a story
 */
export function validateAttachmentCount(
  currentCount: number
): { valid: true } | { valid: false; error: string } {
  if (currentCount >= ATTACHMENT_CONFIG.MAX_ATTACHMENTS_PER_STORY) {
    return {
      valid: false,
      error: `Maximum ${ATTACHMENT_CONFIG.MAX_ATTACHMENTS_PER_STORY} attachments per story reached`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a filename to prevent path traversal and other issues
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[\/\\]/).pop() || filename;
  
  // Remove special characters that could cause issues
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\s+/g, '_'); // Replace spaces with underscores
  
  // Ensure filename is not empty
  if (!sanitized || sanitized === '.') {
    return 'unnamed_file';
  }
  
  return sanitized;
}

/**
 * Generates a unique filename to prevent collisions
 */
export function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  
  const lastDotIndex = sanitized.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const name = sanitized.substring(0, lastDotIndex);
    const ext = sanitized.substring(lastDotIndex);
    return `${name}_${timestamp}_${random}${ext}`;
  }
  
  return `${sanitized}_${timestamp}_${random}`;
}

/**
 * Gets the file extension from a filename
 */
function getFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return null;
  }
  return filename.substring(lastDotIndex);
}

/**
 * Gets all allowed file extensions
 */
function getAllowedExtensions(): string[] {
  const extensions = new Set<string>();
  for (const exts of Object.values(ALLOWED_FILE_TYPES)) {
    exts.forEach((ext) => extensions.add(ext));
  }
  return Array.from(extensions);
}

/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes: number): string {
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

/**
 * Determines if a file is text-based (can be included in agent prompts)
 */
export function isTextFile(mimeType: string): boolean {
  const textTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
  ];
  
  return textTypes.some((type) => mimeType.startsWith(type));
}
