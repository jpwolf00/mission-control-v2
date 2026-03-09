'use client';

import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

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

interface PipelineGate {
  gate: string;
  status: 'active' | 'pending' | 'idle';
  activeStory: {
    id: string;
    title: string;
    sessionId?: string;
  } | null;
  lastEvent: string | null;
  model: string | null;
  provider: string | null;
  startedAt: string | null;
  pickedUpAt: string | null;
  finalMessage: string | null;
  invocations: number;
  lastHeartbeatAt: string | null;
}

interface RuntimeState {
  pipeline: PipelineGate[];
  activeSessions: Array<{
    id: string;
    storyId: string;
    gate: string;
    model: string | null;
    provider: string | null;
    startedAt: string | null;
    lastHeartbeatAt: string | null;
    invocations: number;
    storyTitle: string;
  }>;
  activeAgentCount: number;
  updatedAt: string;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<StoryCount>({ total: 0, active: 0, draft: 0, completed: 0, blocked: 0 });
  const [health, setHealth] = useState<HealthStatus>({ status: 'checking' });
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [emergencyStopping, setEmergencyStopping] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<{success: boolean; message: string} | null>(null);

  const handleEmergencyStop = async () => {
    if (!confirm('EMERGENCY STOP: Kill all active sessions? This will halt all running agent tasks.')) return;
    setEmergencyStopping(true);
    setEmergencyResult(null);
    try {
      const res = await fetch('/api/v1/agents/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      setEmergencyResult({ success: res.ok, message: data.message || JSON.stringify(data) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setEmergencyResult({ success: false, message: msg });
    }
    setEmergencyStopping(false);
  };

  useEffect(() => {
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

    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'error' }));

    // Fetch runtime state
    fetch('/api/v1/runtime/state')
      .then((res) => res.json())
      .then((data) => {
        setRuntimeState(data);
        setRuntimeLoading(false);
      })
      .catch(() => setRuntimeLoading(false));
  }, []);

  const healthChip = health.status === 'healthy'
    ? { label: 'Healthy', bg: '#dcfce7', color: '#166534' }
    : health.status === 'checking'
    ? { label: 'Checking...', bg: '#dbeafe', color: '#1e40af' }
    : { label: 'Degraded', bg: '#fee2e2', color: '#991b1b' };

  // Helper to format time ago
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#3b82f6';
      case 'pending': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  // Get status bg
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return '#dbeafe';
      case 'pending': return '#fef3c7';
      default: return '#f1f5f9';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">System overview and key metrics</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <StatCard title="Total Stories" value={counts.total} subtitle={`${counts.active} active, ${counts.draft} draft`} />
        <StatCard title="Active Stories" value={counts.active} valueColor="#3b82f6" subtitle="In gate pipeline" />
        <StatCard title="Completed" value={counts.completed} valueColor="#22c55e" subtitle="Through all gates" />
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>System Status</Typography>
            <Chip label={healthChip.label} size="small" sx={{ bgcolor: healthChip.bg, color: healthChip.color, mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              {health.database === 'connected' ? 'DB connected' : 'DB status unknown'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {counts.blocked > 0 && (
        <Card sx={{ borderColor: '#fecaca', mb: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, '&:last-child': { pb: 2 } }}>
            <Chip label={`${counts.blocked} Blocked`} size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b' }} />
            <Typography variant="body2" color="text.secondary">Stories need attention</Typography>
            <Link href="/stories" style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '0.875rem' }}>
              View stories
            </Link>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Card>
          <CardHeader
            title="Gate Pipeline"
            action={
              runtimeState ? (
                <Chip 
                  label={`${runtimeState.activeAgentCount} active`} 
                  size="small" 
                  sx={{ bgcolor: runtimeState.activeAgentCount > 0 ? '#dbeafe' : '#f1f5f9', color: runtimeState.activeAgentCount > 0 ? '#1e40af' : '#64748b' }}
                />
              ) : null
            }
            titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
          />
          <CardContent>
            {runtimeLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : runtimeState?.pipeline.map((gate) => (
              <Box key={gate.gate}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: gate.status === 'active' ? 600 : 400 }}>
                    {gate.gate}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {gate.activeStory && (
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {gate.activeStory.title}
                      </Typography>
                    )}
                    <Chip 
                      label={gate.status} 
                      size="small" 
                      sx={{ 
                        fontSize: '0.7rem',
                        bgcolor: getStatusBg(gate.status),
                        color: getStatusColor(gate.status),
                        textTransform: 'capitalize'
                      }} 
                    />
                  </Box>
                </Box>
                {gate.status === 'active' && (
                  <Box sx={{ pl: 2, py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {gate.model || 'No model'} · Started {formatTimeAgo(gate.startedAt)}
                      {gate.invocations > 0 && ` · ${gate.invocations} inv`}
                      {gate.lastHeartbeatAt && ` · Heartbeat ${formatTimeAgo(gate.lastHeartbeatAt)}`}
                    </Typography>
                  </Box>
                )}
                {gate.lastEvent && gate.status !== 'active' && (
                  <Box sx={{ pl: 2, py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Last: {formatTimeAgo(gate.lastEvent)} {gate.model && `· ${gate.model}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
            {!runtimeLoading && !runtimeState && (
              <Typography variant="body2" color="text.secondary">
                No pipeline data available
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Active Agents" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
          <CardContent sx={{ pt: 0, maxHeight: 300, overflow: 'auto' }}>
            {runtimeLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : runtimeState?.activeSessions && runtimeState.activeSessions.length > 0 ? (
              runtimeState.activeSessions.map((session) => (
                <Box key={session.id} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={500}>
                      {session.gate}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {session.invocations > 0 && (
                        <Chip label={`${session.invocations} inv`} size="small" sx={{ fontSize: '0.6rem', bgcolor: '#f0fdf4', color: '#166534' }} />
                      )}
                      <Chip label="active" size="small" sx={{ fontSize: '0.65rem', bgcolor: '#dbeafe', color: '#1e40af' }} />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {session.storyTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {session.model || 'No model'} · Started {formatTimeAgo(session.startedAt)}
                    {session.lastHeartbeatAt && ` · Heartbeat ${formatTimeAgo(session.lastHeartbeatAt)}`}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No active agents
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Quick Actions" titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} />
          <CardContent sx={{ pt: 0 }}>
            <List disablePadding>
              <ListItemButton component={Link} href="/stories" sx={{ borderRadius: 1, mb: 1 }}>
                <ListItemText primary="View Dev Board" primaryTypographyProps={{ variant: 'body2' }} />
                <Typography color="text.secondary">&rarr;</Typography>
              </ListItemButton>
              <ListItemButton component={Link} href="/deploy" sx={{ borderRadius: 1 }}>
                <ListItemText primary="Manage Deployments" primaryTypographyProps={{ variant: 'body2' }} />
                <Typography color="text.secondary">&rarr;</Typography>
              </ListItemButton>
            </List>
            <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
              {emergencyResult && (
                <Alert severity={emergencyResult.success ? 'success' : 'error'} sx={{ mb: 1 }}>
                  {emergencyResult.message}
                </Alert>
              )}
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                onClick={handleEmergencyStop}
                disabled={emergencyStopping}
                startIcon={emergencyStopping ? <CircularProgress size={14} color="inherit" /> : null}
              >
                {emergencyStopping ? 'Stopping...' : '🛑 Emergency Stop All'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function StatCard({ title, value, valueColor, subtitle }: { title: string; value: number; valueColor?: string; subtitle: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h4" fontWeight="bold" sx={{ color: valueColor }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </CardContent>
    </Card>
  );
}
