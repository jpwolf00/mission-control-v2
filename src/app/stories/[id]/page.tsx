'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GateTimeline } from '@/components/gate-timeline';
import { PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';
import { Story } from '@/domain/story';

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

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100',
    pending_approval: 'bg-yellow-100',
    approved: 'bg-blue-100',
    active: 'bg-green-100',
    completed: 'bg-purple-100',
    blocked: 'bg-red-100',
    archived: 'bg-gray-100',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{story.metadata.title}</h1>
          <p className="text-muted-foreground mt-1">{story.metadata.description}</p>
          <div className="flex gap-2 mt-3">
            <Badge className={statusColors[story.status] || 'bg-gray-100'}>{story.status}</Badge>
            {story.metadata.priority && (
              <Badge variant="outline">{story.metadata.priority.toUpperCase()}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {story.status === 'approved' && (
            <Button>Dispatch to Architect</Button>
          )}
          {story.status === 'active' && (
            <Button variant="outline">Pause</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gate Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <GateTimeline
            currentGate="architect"
            completedGates={[]}
            failedGates={[]}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Acceptance Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            {story.metadata.acceptanceCriteria && story.metadata.acceptanceCriteria.length > 0 ? (
              <ul className="space-y-2">
                {story.metadata.acceptanceCriteria.map((criteria, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" readOnly />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No acceptance criteria defined</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Story ID</dt>
                <dd className="font-mono text-xs">{story.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Requirements Approved</dt>
                <dd>{story.metadata.approvedRequirementsArtifact ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(story.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(story.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
