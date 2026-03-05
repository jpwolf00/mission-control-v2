import React from 'react';
import { StoryCard } from '@/components/story-card';
import { GateTimeline } from '@/components/gate-timeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Story, StoryStatus } from '@/domain/story';

// Mock data - replace with API call
const mockStories: Story[] = [
  {
    id: 'story-1',
    status: 'active',
    metadata: {
      title: 'Implement dispatch endpoint',
      description: 'Add orchestration dispatch API with lock integration',
      approvedRequirementsArtifact: true,
      priority: 'high',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'story-2',
    status: 'approved',
    metadata: {
      title: 'Add SLO metrics dashboard',
      description: 'Weekly SLO report generator and metrics emitter',
      approvedRequirementsArtifact: true,
      priority: 'medium',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'story-3',
    status: 'draft',
    metadata: {
      title: 'UI component library',
      description: 'Material Design component scaffold for MC2',
      approvedRequirementsArtifact: false,
      priority: 'low',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const columns: { status: StoryStatus; title: string }[] = [
  { status: 'draft', title: 'Draft' },
  { status: 'approved', title: 'Ready' },
  { status: 'active', title: 'In Progress' },
  { status: 'completed', title: 'Done' },
];

export default function StoryBoardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Story Board</h1>
          <p className="text-muted-foreground">Manage and track development stories</p>
        </div>
        <Button>Create Story</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">{column.title}</h2>
              <Badge variant="secondary">
                {mockStories.filter((s) => s.status === column.status).length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {mockStories
                .filter((story) => story.status === column.status)
                .map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onClick={() => console.log('Open story:', story.id)}
                    onDispatch={
                      story.status === 'approved'
                        ? () => console.log('Dispatch:', story.id)
                        : undefined
                    }
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t">
        <h3 className="text-sm font-medium mb-4">Gate Pipeline Overview</h3>
        <GateTimeline
          currentGate="implementer"
          completedGates={['architect']}
          failedGates={[]}
        />
      </div>
    </div>
  );
}
