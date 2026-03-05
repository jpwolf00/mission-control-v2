'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GateTimeline } from '@/components/gate-timeline';
import { Story } from '@/domain/story';

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = params.id as string;
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with API call
    const mockStory: Story = {
      id: storyId,
      status: 'active',
      metadata: {
        title: 'Implement user authentication',
        description: 'Add OAuth2 authentication flow with Google and GitHub providers',
        requirementsArtifactId: 'req-auth-001',
        approvedRequirementsArtifact: true,
        acceptanceCriteria: [
          'User can login with Google',
          'User can login with GitHub',
          'Session persists across page reloads',
        ],
        priority: 'high',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setStory(mockStory);
    setLoading(false);
  }, [storyId]);

  if (loading) return <div>Loading...</div>;
  if (!story) return <div>Story not found</div>;

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100',
    approved: 'bg-blue-100',
    active: 'bg-green-100',
    completed: 'bg-purple-100',
    archived: 'bg-gray-100',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{story.metadata.title}</h1>
          <p className="text-muted-foreground mt-1">{story.metadata.description}</p>
          <div className="flex gap-2 mt-3">
            <Badge className={statusColors[story.status]}>{story.status}</Badge>
            <Badge variant="outline">{story.metadata.priority?.toUpperCase()}</Badge>
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
            <ul className="space-y-2">
              {story.metadata.acceptanceCriteria?.map((criteria, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Story created</span>
                <span className="text-muted-foreground">2h ago</span>
              </div>
              <div className="flex justify-between">
                <span>Requirements approved</span>
                <span className="text-muted-foreground">1h ago</span>
              </div>
              <div className="flex justify-between">
                <span>Dispatched to architect</span>
                <span className="text-muted-foreground">30m ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
