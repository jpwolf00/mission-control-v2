'use client';

import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';

interface Deployment {
  id: string;
  storyId: string;
  featureBranch: string;
  targetEnvironment: string;
  commitSha: string;
  commitMessage: string;
  status: string;
  initiatedBy: string;
  createdAt?: string;
  deployedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

const statusChipColors: Record<string, { bg: string; color: string }> = {
  'pending-approval': { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dbeafe', color: '#1e40af' },
  deploying: { bg: '#f3e8ff', color: '#6b21a8' },
  verifying: { bg: '#e0e7ff', color: '#3730a3' },
  verified: { bg: '#dcfce7', color: '#166534' },
  failed: { bg: '#fee2e2', color: '#991b1b' },
  'rolled-back': { bg: '#ffedd5', color: '#9a3412' },
};

export default function DeployPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  const [storyId, setStoryId] = useState('');
  const [featureBranch, setFeatureBranch] = useState('');
  const [targetEnv, setTargetEnv] = useState('staging');
  const [commitSha, setCommitSha] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  const fetchDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/deployments');
      if (!response.ok) throw new Error('Failed to fetch deployments');
      const data = await response.json();
      setDeployments(data.deployments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleDeploy = async () => {
    if (!storyId || !featureBranch || !commitSha || !commitMessage) return;
    setDeploying(true);
    try {
      const response = await fetch('/api/v1/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          featureBranch,
          targetEnvironment: targetEnv,
          commitSha,
          commitMessage,
          initiatedBy: 'operator',
        }),
      });
      if (!response.ok) throw new Error('Failed to create deployment');
      await fetchDeployments();
      setStoryId('');
      setFeatureBranch('');
      setCommitSha('');
      setCommitMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  const handleAction = async (deploymentId: string, action: string, params: Record<string, string> = {}) => {
    try {
      const response = await fetch(`/api/v1/deployments/${deploymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
      if (!response.ok) throw new Error(`Failed to ${action} deployment`);
      await fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Action failed: ${action}`);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDeployments} />;

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold">Deploy & Rollback</Typography>
        <Typography variant="body2" color="text.secondary">Manage deployments across environments</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="New Deployment" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            <TextField
              label="Story ID"
              value={storyId}
              onChange={(e) => setStoryId(e.target.value)}
              placeholder="story_xxx"
              size="small"
              fullWidth
            />
            <TextField
              label="Feature Branch"
              value={featureBranch}
              onChange={(e) => setFeatureBranch(e.target.value)}
              placeholder="feat/my-feature"
              size="small"
              fullWidth
            />
            <TextField
              label="Environment"
              value={targetEnv}
              onChange={(e) => setTargetEnv(e.target.value)}
              size="small"
              fullWidth
              select
            >
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </TextField>
            <TextField
              label="Commit SHA"
              value={commitSha}
              onChange={(e) => setCommitSha(e.target.value)}
              placeholder="abc123"
              size="small"
              fullWidth
            />
          </Box>
          <TextField
            label="Commit Message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="feat: add new feature"
            size="small"
            fullWidth
            sx={{ mt: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleDeploy}
            disabled={deploying || !storyId || !featureBranch || !commitSha || !commitMessage}
            sx={{ mt: 2 }}
          >
            {deploying ? 'Deploying...' : `Deploy to ${targetEnv}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Deployment History" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
        <CardContent>
          {deployments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
              No deployments yet
            </Typography>
          ) : (
            <Box>
              {deployments.map((deploy, i) => {
                const chipColors = statusChipColors[deploy.status] || { bg: '#f1f5f9', color: '#475569' };
                return (
                  <Box key={deploy.id}>
                    {i > 0 && <Divider sx={{ my: 1.5 }} />}
                    <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{deploy.commitMessage}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {deploy.commitSha.slice(0, 7)} &bull; {deploy.targetEnvironment} &bull; {deploy.featureBranch}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Chip
                          label={deploy.status}
                          size="small"
                          sx={{ bgcolor: chipColors.bg, color: chipColors.color }}
                        />
                        {deploy.status === 'pending-approval' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleAction(deploy.id, 'approve', {
                              approverId: 'operator',
                              approverRole: 'operator',
                            })}
                          >
                            Approve
                          </Button>
                        )}
                        {deploy.status === 'approved' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleAction(deploy.id, 'start', {
                              startedBy: 'operator',
                            })}
                          >
                            Start Deploy
                          </Button>
                        )}
                        {(deploy.status === 'verified' || deploy.status === 'failed') && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAction(deploy.id, 'rollback', {
                              requestedBy: 'operator',
                              targetSha: 'previous',
                              reason: 'Manual rollback',
                            })}
                          >
                            Rollback
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
