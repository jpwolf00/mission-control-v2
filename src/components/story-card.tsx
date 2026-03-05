import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Story, StoryStatus } from '@/domain/story';
import { cn } from '@/lib/utils';

interface StoryCardProps {
  story: Story;
  onClick?: () => void;
  onDispatch?: () => void;
}

const statusColors: Record<StoryStatus, string> = {
  draft: 'bg-slate-100 text-slate-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-800',
  blocked: 'bg-red-100 text-red-800',
};

export function StoryCard({ story, onClick, onDispatch }: StoryCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        story.status === 'active' && "border-l-4 border-l-green-500",
        story.status === 'blocked' && "border-l-4 border-l-red-500"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {story.metadata.title}
          </CardTitle>
          <Badge className={cn("text-xs", statusColors[story.status])}>
            {story.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {story.metadata.description}
        </p>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            {story.metadata.priority?.toUpperCase() || 'MEDIUM'}
          </span>
          {story.status === 'approved' && onDispatch && (
            <Button size="sm" variant="outline" onClick={(e) => {
              e.stopPropagation();
              onDispatch();
            }}>
              Dispatch
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
