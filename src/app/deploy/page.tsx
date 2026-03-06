'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const statusColors: Record<string, string> = {
  'pending-approval': 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  deploying: 'bg-purple-100 text-purple-800',
  verifying: 'bg-indigo-100 text-indigo-800',
  verified: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  'rolled-back': 'bg-orange-100 text-orange-800',
};

export default function DeployPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  // Form state
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deploy & Rollback</h1>
        <p className="text-muted-foreground">Manage deployments across environments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Deployment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Story ID</label>
              <input
                type="text"
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                placeholder="story_xxx"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Feature Branch</label>
              <input
                type="text"
                value={featureBranch}
                onChange={(e) => setFeatureBranch(e.target.value)}
                placeholder="feat/my-feature"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment</label>
              <select
                value={targetEnv}
                onChange={(e) => setTargetEnv(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commit SHA</label>
              <input
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="abc123"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="feat: add new feature"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <Button
            onClick={handleDeploy}
            disabled={deploying || !storyId || !featureBranch || !commitSha || !commitMessage}
          >
            {deploying ? 'Deploying...' : `Deploy to ${targetEnv}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No deployments yet</p>
          ) : (
            <div className="space-y-3">
              {deployments.map((deploy) => (
                <div
                  key={deploy.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{deploy.commitMessage}</div>
                    <div className="text-xs text-muted-foreground">
                      {deploy.commitSha.slice(0, 7)} &bull; {deploy.targetEnvironment} &bull; {deploy.featureBranch}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[deploy.status] || 'bg-gray-100'}>
                      {deploy.status}
                    </Badge>

                    {deploy.status === 'pending-approval' && (
                      <Button
                        size="sm"
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
                        size="sm"
                        onClick={() => handleAction(deploy.id, 'start', {
                          startedBy: 'operator',
                        })}
                      >
                        Start Deploy
                      </Button>
                    )}

                    {(deploy.status === 'verified' || deploy.status === 'failed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(deploy.id, 'rollback', {
                          requestedBy: 'operator',
                          targetSha: 'previous',
                          reason: 'Manual rollback',
                        })}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
