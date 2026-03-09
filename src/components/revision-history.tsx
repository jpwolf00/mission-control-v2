'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import { StoryRevision } from '@/domain/story';

interface RevisionHistoryProps {
  storyId: string;
  refreshTrigger?: number;
}

export function RevisionHistory({ storyId, refreshTrigger }: RevisionHistoryProps) {
  const [revisions, setRevisions] = useState<StoryRevision[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/stories/${storyId}/revisions`);
      if (!response.ok) {
        throw new Error('Failed to fetch revisions');
      }
      const data = await response.json();
      setRevisions(data.revisions || []);
    } catch (err) {
      console.error('Failed to fetch revisions:', err);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, [storyId, refreshTrigger]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRevisionInfo = (revision: StoryRevision) => {
    if (revision.revisionType === 'accept_final') {
      return {
        icon: <CheckCircleIcon sx={{ color: '#10b981' }} />,
        label: 'Accepted Final',
        color: '#10b981',
        bgColor: '#ecfdf5',
      };
    } else {
      return {
        icon: <ReplayIcon sx={{ color: '#f59e0b' }} />,
        label: `Revision: ${revision.targetGate || 'implementer'}`,
        color: '#f59e0b',
        bgColor: '#fffbeb',
      };
    }
  };

  if (loading) {
    return (
      <Card sx={{ mt: 3 }}>
        <CardHeader 
          title="Revision History" 
          titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
        />
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  if (revisions.length === 0) {
    return (
      <Card sx={{ mt: 3 }}>
        <CardHeader 
          title="Revision History" 
          titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
        />
        <CardContent sx={{ py: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} color="text.secondary">
            <HistoryIcon sx={{ fontSize: 20 }} />
            <Typography variant="body2">
              No revision history yet
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 3 }}>
      <CardHeader 
        title="Revision History" 
        titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
        action={
          <Chip 
            label={`${revisions.length} ${revisions.length === 1 ? 'action' : 'actions'}`}
            size="small"
            variant="outlined"
          />
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <List disablePadding>
          {revisions.map((revision, index) => {
            const info = getRevisionInfo(revision);
            const isLast = index === 0;
            
            return (
              <ListItem 
                key={revision.id}
                sx={{ 
                  px: 2, 
                  py: 1.5,
                  bgcolor: info.bgColor,
                  borderRadius: 1,
                  mb: 1,
                  border: '1px solid',
                  borderColor: isLast ? info.color : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {info.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600}>
                        {info.label}
                      </Typography>
                      {isLast && (
                        <Chip 
                          label="Latest" 
                          size="small" 
                          sx={{ height: 18, fontSize: '0.65rem', bgcolor: info.color, color: 'white' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(revision.createdAt)} • by {revision.createdBy}
                      </Typography>
                      {revision.description && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {revision.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
