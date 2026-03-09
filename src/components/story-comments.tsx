'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { StoryComment } from '@/domain/story';

interface StoryCommentsProps {
  storyId: string;
  refreshTrigger?: number;
  onCommentAdded?: () => void;
}

export function StoryComments({ storyId, refreshTrigger, onCommentAdded }: StoryCommentsProps) {
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/stories/${storyId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      // Don't show error for missing endpoint - just show empty
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [storyId, refreshTrigger]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/stories/${storyId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      const comment = await response.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      onCommentAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

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

  const getAuthorInitials = (author: string) => {
    return author.charAt(0).toUpperCase();
  };

  const getAuthorColor = (author: string) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const index = author.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardHeader 
        title="Comments" 
        titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
        action={
          <Chip 
            label={`${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`} 
            size="small" 
            variant="outlined"
          />
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {/* Comment input */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            size="small"
            sx={{ mb: 1 }}
          />
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <Button
              variant="contained"
              size="small"
              disabled={!newComment.trim() || submitting}
              onClick={handleSubmit}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </Box>
          {error && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {error}
            </Typography>
          )}
        </Box>

        {/* Comments list */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No comments yet. Be the first to add one!
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {comments.map((comment) => (
              <Box 
                key={comment.id} 
                sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 1 
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    fontSize: '0.875rem',
                    bgcolor: getAuthorColor(comment.author),
                  }}
                >
                  {getAuthorInitials(comment.author)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {comment.author === 'user' ? 'You' : comment.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(comment.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
