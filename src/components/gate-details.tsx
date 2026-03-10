'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MemoryIcon from '@mui/icons-material/Memory';
import CloudIcon from '@mui/icons-material/Cloud';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CircularProgress from '@mui/material/CircularProgress';
import { StoryGateInfo } from '@/domain/story';
import { Gate } from '@/domain/workflow-types';
import { isMissingRequiredScreenshot } from '@/domain/gate-contracts';

interface GateDetailsProps {
  gates: StoryGateInfo[];
  currentGate?: Gate | null;
}

// Gate status colors
const statusColors: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  approved: { 
    bg: '#dcfce7', 
    color: '#166534',
    icon: <CheckCircleIcon sx={{ fontSize: 16 }} />
  },
  rejected: { 
    bg: '#fee2e2', 
    color: '#991b1b',
    icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#991b1b' }} />
  },
  pending: { 
    bg: '#fef9c3', 
    color: '#854d0e',
    icon: <RadioButtonUncheckedIcon sx={{ fontSize: 16 }} />
  },
  in_progress: { 
    bg: '#dbeafe', 
    color: '#1e40af',
    icon: <CircularProgress size={14} sx={{ color: '#1e40af' }} />
  },
};

const gateLabels: Record<string, string> = {
  architect: 'Design',
  'ui-designer': 'UX Review',
  implementer: 'Build',
  'reviewer-a': 'Review',
  operator: 'Deploy',
  'reviewer-b': 'Validate',
};

// All gates in order
const allGates: Gate[] = ['architect', 'ui-designer', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'];

function formatDuration(start?: Date | string | null, end?: Date | string | null): string {
  if (!start || !end) return '-';
  
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diffMs = endTime - startTime;
  
  if (diffMs < 0) return '-';
  
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatTime(date?: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateTime(date?: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeAgo(date?: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function getArtifactIcon(type?: string) {
  switch (type) {
    case 'screenshot':
      return <ScreenshotMonitorIcon sx={{ fontSize: 16 }} />;
    case 'log':
      return <DescriptionIcon sx={{ fontSize: 16 }} />;
    case 'link':
      return <LinkIcon sx={{ fontSize: 16 }} />;
    default:
      return <DescriptionIcon sx={{ fontSize: 16 }} />;
  }
}

export function GateDetails({ gates, currentGate }: GateDetailsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const toggleExpand = (gate: string) => {
    setExpanded(prev => ({ ...prev, [gate]: !prev[gate] }));
  };

  // Build a map of gate info by gate name
  const gateMap = new Map<string, StoryGateInfo>();
  gates.forEach(g => gateMap.set(g.gate, g));

  // Check if a gate is missing required screenshot artifact
  const isMissingScreenshot = (gateInfo: StoryGateInfo): boolean => {
    return isMissingRequiredScreenshot(gateInfo.gate as Gate, gateInfo.artifacts);
  };

  // Check if we have any telemetry data
  const hasTelemetry = gates.some(g => 
    g.pickedUpAt || 
    g.finalMessage || 
    (g.artifacts && g.artifacts.length > 0) ||
    g.model ||
    g.provider ||
    g.invocations ||
    g.lastHeartbeatAt
  );

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          Gate Details
          {hasTelemetry && (
            <Chip label="Telemetry" size="small" sx={{ ml: 1, bgcolor: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }} />
          )}
        </Typography>

        <Table size="small">
          <TableBody>
            {allGates.map((gateName) => {
              const gateInfo = gateMap.get(gateName);
              const status = gateInfo?.status || (currentGate === gateName ? 'in_progress' : 'pending');
              const colors = statusColors[status] || statusColors.pending;
              const isExpanded = expanded[gateName] || false;
              const hasDetails = gateInfo?.pickedUpAt || gateInfo?.finalMessage || (gateInfo?.artifacts && gateInfo.artifacts.length > 0) || gateInfo?.model || gateInfo?.provider || gateInfo?.invocations;
              const hasTelemetryData = gateInfo?.model || gateInfo?.provider || gateInfo?.invocations || gateInfo?.lastHeartbeatAt;
              const isCurrent = currentGate === gateName;

              return (
                <React.Fragment key={gateName}>
                  <TableRow 
                    sx={{ 
                      cursor: hasDetails ? 'pointer' : 'default',
                      '&:hover': hasDetails ? { bgcolor: 'action.hover' } : {},
                    }}
                    onClick={() => hasDetails && toggleExpand(gateName)}
                  >
                    <TableCell sx={{ borderBottom: 0, py: 1, width: 40 }}>
                      {hasDetails ? (
                        <IconButton size="small" sx={{ p: 0 }}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ borderBottom: 0, py: 1, width: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {colors.icon}
                        <Typography variant="body2" fontWeight={500}>
                          {gateLabels[gateName] || gateName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: 0, py: 1, width: 100 }}>
                      <Chip 
                        label={status === 'in_progress' ? 'In Progress' : status} 
                        size="small"
                        sx={{ 
                          bgcolor: colors.bg, 
                          color: colors.color,
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: 0, py: 1, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {gateInfo?.pickedUpAt && (
                          <Tooltip title="Pickup time">
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Pickup: {formatTime(gateInfo.pickedUpAt)}
                            </Typography>
                          </Tooltip>
                        )}
                        {gateInfo?.pickedUpAt && gateInfo?.completedAt && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            →
                          </Typography>
                        )}
                        {gateInfo?.completedAt && (
                          <Tooltip title="Completion time">
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Completed: {formatTime(gateInfo.completedAt)}
                            </Typography>
                          </Tooltip>
                        )}
                        {gateInfo?.pickedUpAt && gateInfo?.completedAt && (
                          <Chip 
                            label={formatDuration(gateInfo.pickedUpAt, gateInfo.completedAt)} 
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 18, ml: 1 }}
                          />
                        )}
                        {isCurrent && !gateInfo?.completedAt && (
                          <Typography variant="body2" color="primary" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                            In progress...
                          </Typography>
                        )}
                        {/* Show warning if reviewer gate is missing required screenshot */}
                        {gateInfo && gateInfo.status === 'approved' && isMissingScreenshot(gateInfo) && (
                          <Tooltip title="Reviewer gate approved without required screenshot evidence">
                            <Chip
                              label="Missing Screenshot"
                              size="small"
                              color="warning"
                              sx={{ fontSize: '0.65rem', height: 18, ml: 1, bgcolor: '#fff7ed', color: '#c2410c' }}
                            />
                          </Tooltip>
                        )}
                        {/* Show telemetry badge if available */}
                        {hasTelemetryData && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                            {gateInfo?.model && (
                              <Tooltip title="Model">
                                <Chip 
                                  icon={<MemoryIcon sx={{ fontSize: '12px !important' }} />}
                                  label={gateInfo.model.split('/').pop() || gateInfo.model}
                                  size="small"
                                  sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#f0f9ff', color: '#0369a1' }}
                                />
                              </Tooltip>
                            )}
                            {gateInfo?.provider && (
                              <Tooltip title="Provider">
                                <Chip 
                                  icon={<CloudIcon sx={{ fontSize: '12px !important' }} />}
                                  label={gateInfo.provider}
                                  size="small"
                                  sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#f0fdf4', color: '#166534' }}
                                />
                              </Tooltip>
                            )}
                            {gateInfo?.invocations && gateInfo.invocations > 0 && (
                              <Tooltip title="Invocations">
                                <Chip 
                                  icon={<SpeedIcon sx={{ fontSize: '12px !important' }} />}
                                  label={`${gateInfo.invocations} inv`}
                                  size="small"
                                  sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#fef3c7', color: '#92400e' }}
                                />
                              </Tooltip>
                            )}
                            {gateInfo?.lastHeartbeatAt && isCurrent && (
                              <Tooltip title="Last heartbeat">
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                  ♥ {formatTimeAgo(gateInfo.lastHeartbeatAt)}
                                </Typography>
                              </Tooltip>
                            )}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded details */}
                  {hasDetails && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 0, borderBottom: 1, borderColor: 'divider' }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, pl: 4 }}>
                            {/* Final Message */}
                            {gateInfo?.finalMessage && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  Summary
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                  bgcolor: 'grey.50', 
                                  p: 1.5, 
                                  borderRadius: 1,
                                  fontSize: '0.8rem',
                                  maxHeight: 150,
                                  overflow: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'monospace',
                                }}>
                                  {gateInfo.finalMessage.length > 500 
                                    ? `${gateInfo.finalMessage.substring(0, 500)}...` 
                                    : gateInfo.finalMessage}
                                </Typography>
                              </Box>
                            )}
                            
                            {/* Artifacts */}
                            {gateInfo?.artifacts && gateInfo.artifacts.length > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                  Evidence & Artifacts
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {gateInfo.artifacts.map((artifact, idx) => (
                                    <Tooltip 
                                      key={idx} 
                                      title={artifact.description || artifact.url}
                                    >
                                      <Chip
                                        icon={getArtifactIcon(artifact.type)}
                                        label={artifact.type === 'screenshot' ? `Screenshot ${idx + 1}` : artifact.type}
                                        size="small"
                                        component="a"
                                        href={artifact.url}
                                        target="_blank"
                                        clickable
                                        sx={{ 
                                          bgcolor: '#f0f9ff',
                                          color: '#0369a1',
                                          '&:hover': { bgcolor: '#e0f2fe' },
                                        }}
                                      />
                                    </Tooltip>
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {!hasTelemetry && gates.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic', textAlign: 'center' }}>
            Gate telemetry will appear here as stories progress through the pipeline.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
