'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StoryCount {
  total: number;
  active: number;
  draft: number;
  completed: number;
  blocked: number;
}

interface HealthStatus {
  status: string;
  database?: string;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<StoryCount>({ total: 0, active: 0, draft: 0, completed: 0, blocked: 0 });
  const [health, setHealth] = useState<HealthStatus>({ status: 'checking' });

  useEffect(() => {
    // Fetch story counts
    fetch('/api/v1/stories')
      .then((res) => res.json())
      .then((data) => {
        const stories = data.stories || [];
        setCounts({
          total: stories.length,
          active: stories.filter((s: { status: string }) => s.status === 'active').length,
          draft: stories.filter((s: { status: string }) => s.status === 'draft').length,
          completed: stories.filter((s: { status: string }) => s.status === 'completed').length,
          blocked: stories.filter((s: { status: string }) => s.status === 'blocked').length,
        });
      })
      .catch(() => setCounts({ total: 0, active: 0, draft: 0, completed: 0, blocked: 0 }));

    // Fetch health
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'error' }));
  }, []);

  const healthColor = health.status === 'healthy' ? 'bg-green-100 text-green-800' :
    health.status === 'checking' ? 'bg-blue-100 text-blue-800' :
    'bg-red-100 text-red-800';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">System overview and key metrics</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
            <p className="text-xs text-muted-foreground">{counts.active} active, {counts.draft} draft</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{counts.active}</div>
            <p className="text-xs text-muted-foreground">In gate pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{counts.completed}</div>
            <p className="text-xs text-muted-foreground">Through all gates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={healthColor}>
              {health.status === 'healthy' ? 'Healthy' : health.status === 'checking' ? 'Checking...' : 'Degraded'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {health.database === 'connected' ? 'DB connected' : 'DB status unknown'}
            </p>
          </CardContent>
        </Card>
      </div>

      {counts.blocked > 0 && (
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">{counts.blocked} Blocked</Badge>
              <span className="text-sm text-muted-foreground">
                Stories need attention
              </span>
              <Link href="/stories" className="text-sm text-blue-600 hover:underline ml-auto">
                View stories
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Gate Pipeline</span>
              <Link href="/stories" className="text-sm font-normal text-blue-600 hover:underline">
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['architect', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'].map((gate) => (
                <div key={gate} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{gate}</span>
                  <Badge variant="outline" className="text-xs">pipeline stage</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/stories"
                className="block p-3 rounded-lg border hover:bg-muted/50 text-sm"
              >
                View Dev Board &rarr;
              </Link>
              <Link
                href="/deploy"
                className="block p-3 rounded-lg border hover:bg-muted/50 text-sm"
              >
                Manage Deployments &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
