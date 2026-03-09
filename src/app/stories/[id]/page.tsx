'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { GateTimeline } from '@/components/gate-timeline';
import { GateDetails } from '@/components/gate-details';
import { PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';
import { AttachmentUpload } from '@/components/attachment-upload';
import { Story } from '@/domain/story';

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

const statusChipColors: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#f1f5f9', color: '#475569' },
  pending_approval: { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dbeafe', color: '#1e40af' },
  active: { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#f3e8ff', color: '#6b21a8' },
  blocked: { bg: '#fee2e2', color: '#991b1b' },
  archived: { bg: '#f1f5f9', color: '#475569' },
};

function generateIdempotencyKey(): string {
  return `dispatch-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = params.id as string;
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const fetchStory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/stories/${storyId}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Story not found');
        throw new Error('Failed to fetch story');
      }
      const data = await response.json();
      setStory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    setAttachmentsLoading(true);
    try {
      const response = await fetch(`/api/v1/stories/${storyId}/attachments`);
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleAttachmentUpload = (attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const handleAttachmentDelete = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const handleDispatch = async (gate: string) => {
    setDispatching(true);
    setDispatchError(null);
    setDispatchSuccess(null);
    try {
      const response = await fetch('/api/v1/orchestration/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': generateIdempotencyKey(),
        },
        body: JSON.stringify({ storyId, gate }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch story');
      }
      setDispatchSuccess(`Dispatched to ${gate} — Session: ${data.sessionId}`);
      // Refetch story to reflect new status
      await fetchStory();
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : 'Failed to dispatch');
    } finally {
      setDispatching(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    setApproving(true);
    setApproveError(null);
    setApproveSuccess(null);
    try {
      const response = await fetch(`/api/v1/stories/${storyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: approve ? 'approve' : 'reject' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update story');
      }
      setApproveSuccess(approve ? 'Story approved and ready for dispatch' : 'Story rejected');
      // Refetch story to reflect new status
      await fetchStory();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Failed to update story');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchStory();
    fetchAttachments();
  }, [storyId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchStory} />;
  if (!story) return <ErrorMessage message="Story not found" />;

  const chipColors = statusChipColors[story.status] || statusChipColors.draft;

  // Determine the next gate to dispatch to
  const nextGate = story.currentGate || 'architect';

  return (
    <Box sx={{ p: 3 }}>
      {approveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApproveError(null)}>
          {approveError}
        </Alert>
      )}
      {approveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setApproveSuccess(null)}>
          {approveSuccess}
        </Alert>
      )}
      {dispatchError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDispatchError(null)}>
          {dispatchError}
        </Alert>
      )}
      {dispatchSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDispatchSuccess(null)}>
          {dispatchSuccess}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">{story.metadata.title}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {story.metadata.description}
          </Typography>
          <Box display="flex" gap={1} mt={1.5}>
            <Chip
              label={story.status}
              size="small"
              sx={{ bgcolor: chipColors.bg, color: chipColors.color }}
            />
            {story.metadata.priority && (
              <Chip
                label={story.metadata.priority.toUpperCase()}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          {(story.status === 'draft' || story.status === 'pending_approval') && (
            <>
              <Button
                variant="contained"
                color="success"
                disabled={approving}
                onClick={() => handleApprove(true)}
                startIcon={approving ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {approving ? 'Approving...' : 'Approve Story'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                disabled={approving}
                onClick={() => handleApprove(false)}
              >
                Reject
              </Button>
            </>
          )}
          {story.status === 'approved' && (
            <Button
              variant="contained"
              disabled={dispatching}
              onClick={() => handleDispatch(nextGate)}
              startIcon={dispatching ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {dispatching ? 'Dispatching...' : `Dispatch to ${nextGate.charAt(0).toUpperCase() + nextGate.slice(1)}`}
            </Button>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Gate Pipeline" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
        <CardContent>
          <GateTimeline
            currentGate={(story.currentGate || 'architect') as 'architect' | 'ui-designer' | 'implementer' | 'reviewer-a' | 'operator' | 'reviewer-b'}
            completedGates={(story.gates || []).filter(g => g.status === 'approved').map(g => g.gate) as ('architect' | 'ui-designer' | 'implementer' | 'reviewer-a' | 'operator' | 'reviewer-b')[]}
            failedGates={(story.gates || []).filter(g => g.status === 'rejected').map(g => g.gate) as ('architect' | 'ui-designer' | 'implementer' | 'reviewer-a' | 'operator' | 'reviewer-b')[]}
          />
        </CardContent>
      </Card>

      <GateDetails
        gates={story.gates || []}
        currentGate={(story.currentGate || 'architect') as 'architect' | 'ui-designer' | 'implementer' | 'reviewer-a' | 'operator' | 'reviewer-b'}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
        <Card>
          <CardHeader title="Acceptance Criteria" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
          <CardContent>
            {story.metadata.acceptanceCriteria && story.metadata.acceptanceCriteria.length > 0 ? (
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {story.metadata.acceptanceCriteria.map((criteria, i) => (
                  <Box key={i} component="li" display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Checkbox size="small" readOnly sx={{ p: 0.5 }} />
                    <Typography variant="body2">{criteria}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No acceptance criteria defined</Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Details" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
          <CardContent>
            <Box component="dl" sx={{ m: 0 }}>
              {[
                { label: 'Story ID', value: <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">{story.id}</Typography> },
                { label: 'Requirements Approved', value: story.metadata.approvedRequirementsArtifact ? 'Yes' : 'No' },
                { label: 'Created', value: new Date(story.createdAt).toLocaleDateString() },
                { label: 'Updated', value: new Date(story.updatedAt).toLocaleDateString() },
              ].map((item, i) => (
                <Box key={i} display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography component="dt" variant="body2" color="text.secondary">{item.label}</Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                    {typeof item.value === 'string' ? item.value : item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Attachments Section */}
      <Card sx={{ mt: 3 }}>
        <CardHeader title="Attachments" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
        <CardContent>
          {attachmentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <AttachmentUpload
              storyId={storyId}
              attachments={attachments}
              onUpload={handleAttachmentUpload}
              onDelete={handleAttachmentDelete}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
