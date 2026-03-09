'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import { StoryRevision } from '@/domain/story';

interface RevisionActionsProps {
  storyId: string;
  currentGate?: string | null;
  onRevisionRequested?: () => void;
}

const gateOptions = [
  { value: 'architect', label: 'Design (Architect)' },
  { value: 'ui-designer', label: 'UX Review (UI Designer)' },
  { value: 'implementer', label: 'Build (Implementer)' },
  { value: 'reviewer-a', label: 'Review (Reviewer A)' },
  { value: 'operator', label: 'Deploy (Operator)' },
  { value: 'reviewer-b', label: 'Validate (Reviewer B)' },
];

export function RevisionActions({ storyId, currentGate, onRevisionRequested }: RevisionActionsProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Revision dialog state
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [targetGate, setTargetGate] = useState('implementer');
  const [revisionDescription, setRevisionDescription] = useState('');

  const handleAcceptFinal = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/v1/stories/${storyId}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'accept_final' }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept final');
      }
      
      setSuccess('Story accepted and archived successfully!');
      onRevisionRequested?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept final');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/v1/stories/${storyId}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'request_revision',
          targetGate,
          description: revisionDescription.trim() || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request revision');
      }
      
      setSuccess(`Revision requested! Story sent back to ${targetGate}.`);
      setRevisionDialogOpen(false);
      setRevisionDescription('');
      onRevisionRequested?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request revision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card sx={{ mt: 3, border: '1px solid', borderColor: 'primary.main' }}>
      <CardHeader 
        title="Review Actions" 
        titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
        subheader="Accept this story as complete or send it back for revisions"
      />
      <CardContent sx={{ pt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handleAcceptFinal}
            disabled={submitting}
          >
            Accept Final
          </Button>
          
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ReplayIcon />}
            onClick={() => setRevisionDialogOpen(true)}
            disabled={submitting}
          >
            Request Revisions
          </Button>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Current gate: {currentGate || 'None (story may be complete)'}
        </Typography>

        {/* Revision Request Dialog */}
        <Dialog 
          open={revisionDialogOpen} 
          onClose={() => setRevisionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Request Revisions</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Specify which gate should handle the revisions and provide details about what needs to be changed.
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Send back to</InputLabel>
              <Select
                value={targetGate}
                label="Send back to"
                onChange={(e) => setTargetGate(e.target.value)}
              >
                {gateOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
            

              fullWidth
              multiline
              rows={3}
              label="Revision notes (optional)"
              placeholder="Describe what needs to be revised..."
              value={revisionDescription}
              onChange={(e) => setRevisionDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRevisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="warning"
              onClick={handleRequestRevision}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? 'Submitting...' : 'Request Revisions'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
