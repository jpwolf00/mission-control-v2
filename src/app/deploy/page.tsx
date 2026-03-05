'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Deployment {
  id: string;
  version: string;
  commitSha: string;
  environment: 'qa' | 'prod';
  status: 'success' | 'failed' | 'rolling_back';
  deployedAt: string;
  deployedBy: string;
}

const mockDeployments: Deployment[] = [
  {
    id: 'deploy-1',
    version: 'v2.1.0',
    commitSha: 'a1b2c3d',
    environment: 'prod',
    status: 'success',
    deployedAt: '2026-03-05T10:00:00Z',
    deployedBy: 'operator-agent',
  },
  {
    id: 'deploy-2',
    version: 'v2.1.1',
    commitSha: 'e4f5g6h',
    environment: 'qa',
    status: 'success',
    deployedAt: '2026-03-05T14:00:00Z',
    deployedBy: 'operator-agent',
  },
  {
    id: 'deploy-3',
    version: 'v2.1.2',
    commitSha: 'i7j8k9l',
    environment: 'prod',
    status: 'failed',
    deployedAt: '2026-03-05T16:00:00Z',
    deployedBy: 'operator-agent',
  },
];

export default function DeployPage() {
  const [selectedSha, setSelectedSha] = useState('');
  const [targetEnv, setTargetEnv] = useState('prod');

  const statusColors: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    rolling_back: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deploy & Rollback</h1>
        <p className="text-muted-foreground">Manage deployments across environments</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v2.1.0</div>
            <Badge className="bg-green-100 text-green-800 mt-2">Healthy</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">QA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v2.1.2</div>
            <Badge className="bg-green-100 text-green-800 mt-2">Healthy</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dev</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Latest</div>
            <Badge className="bg-blue-100 text-blue-800 mt-2">Active</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Deployment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Environment</label>
              <Select value={targetEnv} onValueChange={setTargetEnv}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qa">QA</SelectItem>
                  <SelectItem value="prod">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Commit SHA</label>
              <Select value={selectedSha} onValueChange={setSelectedSha}>
                <SelectTrigger>
                  <SelectValue placeholder="Select commit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="i7j8k9l">i7j8k9l - feat: auth flow</SelectItem>
                  <SelectItem value="m0n1o2p">m0n1o2p - fix: session bug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button disabled={!selectedSha}>Deploy to {targetEnv.toUpperCase()}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockDeployments.map((deploy) => (
              <div
                key={deploy.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="font-medium">{deploy.version}</div>
                  <div className="text-sm text-muted-foreground">
                    {deploy.commitSha} • {deploy.environment}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[deploy.status]}>{deploy.status}</Badge>
                  
                  {deploy.status === 'failed' && (
                    <Button size="sm" variant="outline">Rollback</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
