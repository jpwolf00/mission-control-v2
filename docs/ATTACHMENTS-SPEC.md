# SPEC.md - Story Attachments Feature

**Story ID:** 0088c94d-c17d-4bcd-bb8b-44469f302f00  
**Gate:** Architect  
**Agent:** MC2-architect  
**Date:** 2026-03-07  
**Version:** 1.0

---

## Overview

Add the ability to attach files to stories for detailed requirements, background documents, and reference materials. Attachments are stored in both Google Drive (canonical) and local filesystem (cache/backup), and are ingested by agents when they take on a story.

---

## Design Decisions

### 1. Storage Strategy: Dual-Storage with Google Drive as Canonical

**Decision:** Store attachments in both Google Drive and local filesystem.

**Rationale:**
- **Google Drive** provides cloud backup, sharing capabilities, and integrates with Jason's existing Google Workspace setup (openwolfhal@gmail.com)
- **Local filesystem** provides fast access, offline capability, and serves as a cache
- Google Drive is the "source of truth"; local is a cached copy

**Implementation:**
- Upload: Write to both locations simultaneously
- Download: Serve from local cache, fallback to Google Drive
- Delete: Remove from both locations

### 2. Database Schema: New StoryAttachment Model

**Decision:** Create a separate `StoryAttachment` model related to Story via foreign key.

**Rationale:**
- One-to-many relationship (one story → many attachments)
- Keeps attachment metadata separate from core story data
- Enables querying attachments independently
- Follows existing Prisma schema patterns

### 3. File Storage Structure

**Decision:** Organize files by story ID for clarity and cleanup.

**Local Path:** `/Users/jpwolf00/.openclaw/workspace/mission-control-v2/attachments/{storyId}/{filename}`

**Google Drive:** Folder structure `Mission Control/Stories/{storyId}/`

**Rationale:**
- Story-based organization makes cleanup easy when stories are deleted
- Prevents filename collisions across stories
- Clear separation from other project files

### 4. API Design: RESTful Attachment Endpoints

**Decision:** Nest attachment endpoints under stories.

**Endpoints:**
- `POST /api/v1/stories/:storyId/attachments` - Upload attachment
- `GET /api/v1/stories/:storyId/attachments` - List attachments
- `GET /api/v1/stories/:storyId/attachments/:attachmentId` - Get attachment metadata
- `GET /api/v1/stories/:storyId/attachments/:attachmentId/download` - Download file
- `DELETE /api/v1/stories/:storyId/attachments/:attachmentId` - Delete attachment

**Rationale:**
- RESTful resource hierarchy
- Consistent with existing story API patterns
- Clear ownership (attachments belong to stories)

### 5. File Upload: Multipart Form Data

**Decision:** Use `multipart/form-data` for file uploads.

**Rationale:**
- Standard for file uploads
- Supports large files
- Built-in Next.js API route support
- No base64 encoding overhead

### 6. Agent Ingestion: Attachments in Dispatch Payload

**Decision:** Include attachment metadata and content in the agent dispatch payload.

**Implementation:**
- When dispatching a story to an agent, include `attachments` array in the prompt context
- For text files: Include full content in prompt
- For non-text files: Include metadata + Google Drive download link
- Agent can fetch full content via API if needed

**Rationale:**
- Agents get full context immediately
- Text files are directly readable in prompt
- Large/binary files accessible via link

### 7. Security: File Type Validation and Size Limits

**Decision:** Validate file types and enforce size limits.

**Constraints:**
- **Max file size:** 10MB per file
- **Allowed types:** 
  - Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.md`, `.rtf`
  - Spreadsheets: `.xls`, `.xlsx`, `.csv`, `.gsheet`
  - Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`
  - Code: `.js`, `.ts`, `.tsx`, `.py`, `.json`, `.yaml`, `.yml`, `.xml`
  - Archives: `.zip` (for multiple files)

**Rationale:**
- Prevents malicious file uploads
- Manages storage costs
- Focuses on practical use cases (requirements docs, specs, screenshots)

### 8. Google Drive Integration: Use Existing gog CLI

**Decision:** Leverage the existing `gog` CLI tool (already configured in TOOLS.md) for Google Drive operations.

**Rationale:**
- Already authenticated with openwolfhal@gmail.com
- No additional API setup required
- Consistent with existing workspace tooling
- Simpler than implementing Google Drive API from scratch

**Implementation:**
- Use `gog drive upload` for uploads
- Use `gog drive download` for downloads
- Use `gog drive list` for folder management

---

## Database Schema Changes

### New Model: StoryAttachment

```prisma
model StoryAttachment {
  id          String   @id @default(uuid())
  storyId     String   @map("story_id")
  filename    String   @map("filename")
  originalName String  @map("original_name")
  mimeType    String   @map("mime_type")
  size        Int      @map("size_bytes")
  
  // Storage locations
  localPath   String   @map("local_path")
  googleDriveFileId String @map("google_drive_file_id")
  googleDriveUrl String @map("google_drive_url")
  
  // Metadata
  uploadedBy  String?  @map("uploaded_by")
  description String?  @map("description")
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  story       Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  
  @@map("story_attachments")
  @@index([storyId])
}
```

### Migration Required

Yes - new table with foreign key to stories.

---

## API Contracts

### POST /api/v1/stories/:storyId/attachments

**Purpose:** Upload a new attachment to a story.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File object (required)
  - `description`: String (optional)

**Response (201 Created):**
```json
{
  "success": true,
  "attachment": {
    "id": "att_abc123",
    "storyId": "story_xyz789",
    "filename": "requirements-v2.pdf",
    "originalName": "Product Requirements v2.pdf",
    "mimeType": "application/pdf",
    "size": 245678,
    "localPath": "/workspace/mission-control-v2/attachments/story_xyz789/requirements-v2.pdf",
    "googleDriveFileId": "1a2b3c4d5e6f...",
    "googleDriveUrl": "https://drive.google.com/file/d/1a2b3c4d5e6f/view",
    "uploadedBy": "user_123",
    "description": "Updated requirements document",
    "createdAt": "2026-03-07T14:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid file type or size
- `404` - Story not found
- `500` - Upload failed

---

### GET /api/v1/stories/:storyId/attachments

**Purpose:** List all attachments for a story.

**Response (200 OK):**
```json
{
  "success": true,
  "attachments": [
    {
      "id": "att_abc123",
      "filename": "requirements-v2.pdf",
      "originalName": "Product Requirements v2.pdf",
      "mimeType": "application/pdf",
      "size": 245678,
      "googleDriveUrl": "https://drive.google.com/file/d/1a2b3c4d5e6f/view",
      "description": "Updated requirements document",
      "createdAt": "2026-03-07T14:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/v1/stories/:storyId/attachments/:attachmentId/download

**Purpose:** Download the attachment file.

**Response (200 OK):**
- Content-Type: Based on file mimeType
- Content-Disposition: `attachment; filename="{originalName}"`
- Body: File binary data

**Errors:**
- `404` - Attachment not found
- `500` - Download failed

---

### DELETE /api/v1/stories/:storyId/attachments/:attachmentId

**Purpose:** Delete an attachment from both local and Google Drive.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Attachment deleted successfully"
}
```

**Errors:**
- `404` - Attachment not found
- `500` - Deletion failed (partial deletion possible - log warning)

---

## File Structure

```
mission-control-v2/
├── src/
│   ├── domain/
│   │   ├── story.ts              # Add Attachment types
│   │   └── attachment.ts         # NEW: Attachment domain logic
│   ├── services/
│   │   ├── attachment-service.ts # NEW: Upload/download/delete
│   │   └── google-drive-service.ts # NEW: gog CLI wrapper
│   ├── app/
│   │   └── api/
│   │       └── v1/
│   │           └── stories/
│   │               ├── route.ts
│   │               └── [id]/
│   │                   ├── route.ts
│   │                   └── attachments/
│   │                       ├── route.ts           # NEW: List/Create
│   │                       └── [attachmentId]/
│   │                           ├── route.ts       # NEW: Get/Delete
│   │                           └── download/
│   │                               └── route.ts   # NEW: Download
│   └── components/
│       └── story-attachments.tsx  # NEW: UI component
├── attachments/                    # NEW: Local storage directory
│   └── .gitignore                 # Ignore all files in this dir
├── prisma/
│   └── schema.prisma              # Add StoryAttachment model
└── docs/
    └── ATTACHMENTS-SPEC.md        # This document
```

---

## Implementation Plan

### Phase 1: Database & Domain (Implementer)
1. Update Prisma schema with StoryAttachment model
2. Run Prisma migration
3. Create attachment domain types in `src/domain/attachment.ts`
4. Add attachment types to story domain

### Phase 2: Services (Implementer)
1. Create `google-drive-service.ts` - wrapper around gog CLI
2. Create `attachment-service.ts` - upload/download/delete logic
3. Implement file validation (type, size)
4. Implement dual-storage (local + Google Drive)

### Phase 3: API Routes (Implementer)
1. `POST /stories/:id/attachments` - Upload
2. `GET /stories/:id/attachments` - List
3. `GET /stories/:id/attachments/:id/download` - Download
4. `DELETE /stories/:id/attachments/:id` - Delete

### Phase 4: UI Components (Implementer)
1. Create `StoryAttachments` component
2. Add file upload drag-and-drop zone
3. Display attachment list with download/delete
4. Integrate into story detail view

### Phase 5: Agent Integration (Implementer)
1. Update dispatch payload to include attachments
2. Add attachment content to agent prompt
3. Handle text vs binary files appropriately

### Phase 6: Reviewer-A (QA)
1. Test file upload with various file types
2. Test file size limits
3. Verify dual-storage (check both local and Drive)
4. Test download functionality
5. Test deletion (both locations)
6. UI testing: upload, list, download, delete

### Phase 7: Operator (Deploy)
1. Deploy to 192.168.85.205:3001
2. Run database migrations
3. Create attachments directory with proper permissions
4. Verify Google Drive integration

### Phase 8: Reviewer-B (Production Validation)
1. Test upload in production environment
2. Verify Google Drive files appear in openwolfhal@gmail.com
3. Test agent receives attachments in dispatch
4. End-to-end workflow test

---

## Acceptance Criteria Verification

| Criteria | Implementation | Verification |
|----------|---------------|--------------|
| UI component to attach file | `StoryAttachments` component with drag-drop | Reviewer-A UI tests |
| Storage for attached files (Google Drive + local) | Dual-storage in attachment-service | Check both locations after upload |
| Agent ingests file as part of initial prompt | Dispatch payload includes attachments | Agent session logs show attachment content |

---

## Security Considerations

1. **File Type Validation:** Strict whitelist of allowed extensions and MIME types
2. **Size Limits:** 10MB max per file to prevent storage abuse
3. **Path Traversal Prevention:** Sanitize filenames, use story-based directories
4. **Authentication:** Require valid user session for all attachment operations
5. **Authorization:** Only allow attachment operations on stories user has access to
6. **Virus Scanning:** Future enhancement - integrate with ClamAV or similar

---

## Performance Considerations

1. **Large File Handling:** Stream uploads/downloads, don't load entire file into memory
2. **Concurrent Uploads:** Support multiple simultaneous uploads per story
3. **Cache Strategy:** Local files serve as cache; invalidate on delete
4. **Google Drive Rate Limits:** Implement exponential backoff on API calls

---

## Error Handling

1. **Partial Failures:** If Google Drive upload fails but local succeeds, log error and retry
2. **Rollback:** If local write fails after Drive upload, delete from Drive
3. **User Feedback:** Clear error messages for invalid file types/sizes
4. **Logging:** Log all attachment operations with story ID and user ID

---

## Future Enhancements (Out of Scope)

- Version history for attachments
- Attachment previews in UI
- Bulk upload/download
- Attachment comments/annotations
- Integration with other cloud storage (Dropbox, OneDrive)
- Virus scanning on upload

---

## Testing Strategy

### Unit Tests
- File validation logic
- Filename sanitization
- Storage path generation

### Integration Tests
- End-to-end upload flow
- Google Drive integration (mocked)
- Database operations

### Manual QA
- Upload various file types
- Test size limit enforcement
- Verify download works
- Test deletion cleanup

---

## Dependencies

1. **gog CLI:** Must be installed and authenticated (already configured in TOOLS.md)
2. **Google Drive API:** Enabled for openwolfhal@gmail.com (already set up)
3. **Multer or similar:** For multipart form handling in Next.js
4. **Prisma:** Already installed

---

## Rollback Plan

If issues arise:
1. Revert code changes via git
2. Rollback Prisma migration: `npx prisma migrate reset`
3. Delete attachments directory
4. Clean up Google Drive folder manually

---

## Success Metrics

- [ ] Files upload successfully to both local and Google Drive
- [ ] Downloads work from production environment
- [ ] Agents receive attachment context in dispatch
- [ ] UI is intuitive and functional
- [ ] No security vulnerabilities in file handling
- [ ] Performance acceptable (<5s for typical uploads)

---

**Architect Sign-off:** Ready for implementation  
**Next Gate:** Implementer
