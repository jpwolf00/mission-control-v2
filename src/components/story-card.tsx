'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Story, StoryStatus } from '@/domain/story';

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
  onDispatch?: () => void;
  onApprove?: () => void;
}

const statusChipColors: Record<StoryStatus, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#475569' },
  pending_approval: { bg: '#fef9c3', text: '#854d0e' },
  approved: { bg: '#dbeafe', text: '#1e40af' },
  active: { bg: '#dcfce7', text: '#166534' },
  completed: { bg: '#f3e8ff', text: '#6b21a8' },
  archived: { bg: '#f3f4f6', text: '#374151' },
  blocked: { bg: '#fee2e2', text: '#991b1b' },
};

export function StoryCard({ story, onClick, onDispatch, onApprove }: StoryCardProps) {
  const chipColor = statusChipColors[story.status] || statusChipColors.draft;
  const implementerApproved = (story.gates || []).some((g) => g.gate === 'implementer' && g.status === 'approved');
  const reviewerAApproved = (story.gates || []).some((g) => g.gate === 'reviewer-a' && g.status === 'approved');

  let phaseLabel: string | null = null;
  if (story.status === 'active' && implementerApproved && !reviewerAApproved) {
    phaseLabel = 'Implemented, pending review';
  } else if (story.status === 'active' && story.currentGate === 'operator') {
    phaseLabel = 'Approved in review, pending operator deploy';
  } else if (story.status === 'active' && story.currentGate === 'reviewer-b') {
    phaseLabel = 'Deployed, pending final production verification';
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
        ...(story.status === 'active' && { borderLeft: '4px solid #22c55e' }),
        ...(story.status === 'blocked' && { borderLeft: '4px solid #ef4444' }),
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {story.metadata.title}
          </Typography>
          <Chip
            label={story.status.replace('_', ' ')}
            size="small"
            sx={{
              bgcolor: chipColor.bg,
              color: chipColor.text,
              fontSize: '0.7rem',
              height: 22,
              flexShrink: 0,
            }}
          />
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1.5,
          }}
        >
          {story.metadata.description}
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: phaseLabel ? 0.75 : 0 }}>
          <Typography variant="caption" color="text.secondary">
            {story.metadata.priority?.toUpperCase() || 'MEDIUM'}
          </Typography>
           <Typography variant="caption" color="text.secondary">
            Gate: {story.currentGate || '-'}
          </Typography>
          <Box display="flex" gap={0.5}>
            {(story.status === 'draft' || story.status === 'pending_approval') && onApprove && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
              >
                Approve
              </Button>
            )}
            {story.status === 'approved' && onDispatch && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  onDispatch();
                }}
              >
                Dispatch
              </Button>
            )}
          </Box>
        </Box>
        {phaseLabel && (
          <Typography variant="caption" sx={{ color: '#0f766e', fontWeight: 600 }}>
            {phaseLabel}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
