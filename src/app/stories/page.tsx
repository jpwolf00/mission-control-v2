'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StoryCard } from '@/components/story-card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, PageLoader } from '@/components/loading';
import { ErrorMessage } from '@/components/error-message';
import { Story } from '@/domain/story';

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/stories');
      if (!response.ok) throw new Error('Failed to fetch stories');
      const data = await response.json();
      setStories(data.stories);
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

  const storiesByStatus = {
    draft: stories.filter((s) => s.status === 'draft'),
    approved: stories.filter((s) => s.status === 'approved'),
    active: stories.filter((s) => s.status === 'active'),
    completed: stories.filter((s) => s.status === 'completed'),
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stories</h1>
        <Link href="/stories/new">
          <Button>Create Story</Button>
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['draft', 'approved', 'active', 'completed'] as const).map((status) => (
          <div key={status} className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold capitalize">{status}</h3>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {storiesByStatus[status].length}
              </span>
            </div>
            <div className="space-y-3">
              {storiesByStatus[status].map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}