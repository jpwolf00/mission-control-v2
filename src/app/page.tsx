'use client';

import React, { useState, useEffect } from 'react';
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

export default function DashboardPage() {
  const [counts, setCounts] = useState<StoryCount>({ total: 0, active: 0, draft: 0, completed: 0, blocked: 0 });
  const [health, setHealth] = useState<HealthStatus>({ status: 'checking' });

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
  }, []);

  const healthChip = health.status === 'healthy'
    ? { label: 'Healthy', bg: '#dcfce7', color: '#166534' }
    : health.status === 'checking'
    ? { label: 'Checking...', bg: '#dbeafe', color: '#1e40af' }
    : { label: 'Degraded', bg: '#fee2e2', color: '#991b1b' };

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
              <Link href="/stories" style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none' }}>
                View all
              </Link>
            }
            titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }}
          />
          <CardContent>
            {['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'].map((gate, i) => (
              <Box key={gate}>
                {i > 0 && <Divider sx={{ my: 1 }} />}
                <Box display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{gate}</Typography>
                  <Chip label="pipeline stage" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </Box>
              </Box>
            ))}
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
