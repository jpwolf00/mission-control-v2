'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import { Plus, Trash2 } from 'lucide-react';

export default function CreateStoryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [criteria, setCriteria] = useState<string[]>(['']);

  const addCriteria = () => setCriteria([...criteria, '']);
  const removeCriteria = (index: number) => setCriteria(criteria.filter((_, i) => i !== index));
  const updateCriteria = (index: number, value: string) => {
    const updated = [...criteria];
    updated[index] = value;
    setCriteria(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const acceptanceCriteria = criteria.filter((c) => c.trim().length > 0);
      const response = await fetch('/api/v1/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create story');
      }

      router.push('/stories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold">Create New Story</Typography>
        <Typography variant="body2" color="text.secondary">Define a new story for the gate pipeline</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader title="Story Details" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
        <CardContent>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short descriptive title"
            size="small"
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this story accomplish?"
            size="small"
            fullWidth
            required
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            size="small"
            fullWidth
            select
            sx={{ mb: 3 }}
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </TextField>

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight={500}>Acceptance Criteria</Typography>
              <Button size="small" startIcon={<Plus size={16} />} onClick={addCriteria}>
                Add
              </Button>
            </Box>
            {criteria.map((c, i) => (
              <Box key={i} display="flex" gap={1} mb={1}>
                <TextField
                  value={c}
                  onChange={(e) => updateCriteria(i, e.target.value)}
                  placeholder={`Criteria ${i + 1}`}
                  size="small"
                  fullWidth
                />
                {criteria.length > 1 && (
                  <IconButton size="small" onClick={() => removeCriteria(i)} color="error">
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          <Box display="flex" gap={1.5} mt={3}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !description.trim()}
            >
              {submitting ? 'Creating...' : 'Create Story'}
            </Button>
            <Button variant="outlined" onClick={() => router.push('/stories')}>
              Cancel
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
