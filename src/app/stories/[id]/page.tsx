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
import { GateTimeline } from '@/components/gate-timeline';
import { PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';
import { Story } from '@/domain/story';

const statusChipColors: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#f1f5f9', color: '#475569' },
  pending_approval: { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dbeafe', color: '#1e40af' },
  active: { bg: '#dcfce7', color: '#166534' },
  completed: { bg: '#f3e8ff', color: '#6b21a8' },
  blocked: { bg: '#fee2e2', color: '#991b1b' },
  archived: { bg: '#f1f5f9', color: '#475569' },
};

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = params.id as string;
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStory();
  }, [storyId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchStory} />;
  if (!story) return <ErrorMessage message="Story not found" />;

  const chipColors = statusChipColors[story.status] || statusChipColors.draft;

  return (
    <Box sx={{ p: 3 }}>
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
          {story.status === 'approved' && (
            <Button variant="contained">Dispatch to Architect</Button>
          )}
          {story.status === 'active' && (
            <Button variant="outlined">Pause</Button>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Gate Pipeline" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
        <CardContent>
          <GateTimeline
            currentGate="architect"
            completedGates={[]}
            failedGates={[]}
          />
        </CardContent>
      </Card>

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
    </Box>
  );
}
