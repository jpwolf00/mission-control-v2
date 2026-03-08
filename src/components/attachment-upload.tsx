'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Description as TextFileIcon,
  Image as ImageIcon,
  TableChart as SpreadsheetIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  googleDriveUrl: string;
  description?: string;
  createdAt: string;
}

interface AttachmentUploadProps {
  storyId: string;
  attachments?: Attachment[];
  onUpload?: (attachment: Attachment) => void;
  onDelete?: (attachmentId: string) => void;
  readOnly?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return <SpreadsheetIcon />;
  }
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('word')) {
    return <TextFileIcon />;
  }
  return <FileIcon />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUpload({
  storyId,
  attachments = [],
  onUpload,
  onDelete,
  readOnly = false,
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File size exceeds maximum allowed size (10MB)`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/v1/stories/${storyId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload attachment');
      }

      const result = await response.json();
      setUploadSuccess(`Successfully uploaded ${file.name}`);
      
      if (onUpload) {
        onUpload(result);
      }

      // Reset form
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Clear success message after 5 seconds
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!attachmentToDelete) return;

    try {
      const response = await fetch(
        `/api/v1/stories/${storyId}/attachments/${attachmentToDelete}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete attachment');
      }

      if (onDelete) {
        onDelete(attachmentToDelete);
      }

      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to delete attachment');
    }
  };

  const openDeleteDialog = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      {/* Upload Section */}
      {!readOnly && (
        <Box sx={{ mb: 3 }}>
          <Card sx={{ bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Upload Attachment
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Supported formats: PDF, DOC, DOCX, TXT, MD, XLS, XLSX, CSV, PNG, JPG, GIF, JSON, YAML, XML, JS, TS, PY
                <br />
                Maximum file size: 10MB
              </Typography>

              {uploadError && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setUploadError(null)}>
                  {uploadError}
                </Alert>
              )}

              {uploadSuccess && (
                <Alert severity="success" sx={{ mt: 2 }} onClose={() => setUploadSuccess(null)}>
                  {uploadSuccess}
                </Alert>
              )}

              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    Uploading... {uploadProgress}%
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                    placeholder="Brief description of this attachment"
                  />
                </Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.rtf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.js,.ts,.tsx,.py,.json,.yaml,.yml,.xml"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button
                  variant="contained"
                  component="span"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  startIcon={<UploadIcon />}
                >
                  Choose File
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Attachments List */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Attachments ({attachments.length})
        </Typography>

        {attachments.length === 0 ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
            }}
          >
            <FileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No attachments yet
            </Typography>
            {!readOnly && (
              <Typography variant="caption" color="text.secondary">
                Upload files to provide additional context for agents
              </Typography>
            )}
          </Box>
        ) : (
          <List>
            {attachments.map((attachment) => (
              <ListItem
                key={attachment.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ mr: 2, color: 'text.secondary' }}>
                  {getFileIcon(attachment.mimeType)}
                </Box>
                <ListItemText
                  primary={attachment.originalName}
                  secondary={
                    <>
                      <Typography variant="caption" component="span">
                        {formatFileSize(attachment.size)} • {attachment.mimeType}
                      </Typography>
                      {attachment.description && (
                        <Typography variant="caption" component="span" display="block">
                          {attachment.description}
                        </Typography>
                      )}
                      <Typography variant="caption" component="span" display="block">
                        Uploaded {new Date(attachment.createdAt).toLocaleDateString()}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {attachment.googleDriveUrl ? (
                      <IconButton
                        edge="end"
                        size="small"
                        href={attachment.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Google Drive"
                      >
                        <LinkIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        edge="end"
                        size="small"
                        href={`/api/v1/stories/${storyId}/attachments/${attachment.id}/download`}
                        title="Download file"
                      >
                        <FileIcon />
                      </IconButton>
                    )}
                    {!readOnly && (
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() => openDeleteDialog(attachment.id)}
                        title="Delete attachment"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Attachment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this attachment? This will remove it from both local
            storage and Google Drive.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Simple Card component wrapper since we're importing from @mui/material
function Card({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Box
      sx={{
        ...sx,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

function CardContent({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return <Box sx={{ p: 2, ...sx }}>{children}</Box>;
}
