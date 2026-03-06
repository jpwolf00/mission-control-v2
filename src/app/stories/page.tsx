'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StoryCard } from '@/components/story-card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';
import { Story } from '@/domain/story';

const COLUMNS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'completed', label: 'Completed' },
] as const;

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/stories');
      if (!response.ok) throw new Error('Failed to fetch stories');
      const data = await response.json();
      setStories(data.stories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchStories} />;

  const storiesByStatus = Object.fromEntries(
    COLUMNS.map(({ key }) => [key, stories.filter((s) => s.status === key)])
  );

  const archivedStories = stories.filter((s) => s.status === 'archived');

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dev Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stories.length} stories total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {archivedStories.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Hide' : 'Show'} Archived ({archivedStories.length})
            </Button>
          )}
          <Link href="/stories/new">
            <Button>Create Story</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {COLUMNS.map(({ key, label }) => (
          <div key={key} className="rounded-lg border bg-card p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{label}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {storiesByStatus[key]?.length || 0}
              </span>
            </div>
            <div className="space-y-2">
              {storiesByStatus[key]?.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
              {(!storiesByStatus[key] || storiesByStatus[key].length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No stories
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showArchived && archivedStories.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Archived</h3>
          <div className="grid grid-cols-3 gap-3">
            {archivedStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
