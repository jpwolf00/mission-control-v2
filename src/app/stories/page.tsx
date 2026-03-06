'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { StoryCard } from '@/components/story-card';
import { PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';
import { Story } from '@/domain/story';

const COLUMNS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'completed', label: 'Completed' },
] as const;

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/stories');
      if (!response.ok) throw new Error('Failed to fetch stories');
      const data = await response.json();
      setStories(data.stories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchStories} />;

  const storiesByStatus = Object.fromEntries(
    COLUMNS.map(({ key }) => [key, stories.filter((s) => s.status === key)])
  );

  const archivedStories = stories.filter((s) => s.status === 'archived');

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Dev Board</Typography>
          <Typography variant="body2" color="text.secondary">
            {stories.length} stories total
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1.5}>
          {archivedStories.length > 0 && (
            <Button variant="outlined" size="small" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Hide' : 'Show'} Archived ({archivedStories.length})
            </Button>
          )}
          <Button component={Link} href="/stories/new" variant="contained">
            Create Story
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.5 }}>
        {COLUMNS.map(({ key, label }) => (
          <Paper key={key} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="body2" fontWeight={600}>{label}</Typography>
              <Chip label={storiesByStatus[key]?.length || 0} size="small" sx={{ height: 22, fontSize: '0.75rem' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {storiesByStatus[key]?.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
              {(!storiesByStatus[key] || storiesByStatus[key].length === 0) && (
                <Typography variant="caption" color="text.secondary" textAlign="center" py={2}>
                  No stories
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {showArchived && archivedStories.length > 0 && (
        <Box mt={3}>
          <Typography variant="body2" fontWeight={600} mb={1.5}>Archived</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            {archivedStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
