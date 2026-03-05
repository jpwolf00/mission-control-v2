/**
 * Notification Service - MC2-E5
 * 
 * Provides configurable notification system for:
 * - Gate completion alerts
 * - Gate failure alerts
 * - Stuck run detection (>30 minutes)
 * 
 * Supports Slack webhooks and email notifications.
 */

import { prisma } from './prisma';
import { Gate } from './orchestration/state-machine';

// ============================================================
// Configuration Types
// ============================================================

export interface NotificationConfig {
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
  };
  email?: {
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    fromEmail?: string;
    toEmails?: string[];
  };
  rules: NotificationRule[];
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  eventType: NotificationEventType;
  gate?: Gate;
  severity?: 'info' | 'warning' | 'critical';
  channels: ('slack' | 'email')[];
  cooldownMinutes?: number;
}

export type NotificationEventType = 
  | 'gate_completed' 
  | 'gate_failed' 
  | 'run_stuck'
  | 'budget_warning'
  | 'stall_detected';

// ============================================================
// Default Configuration
// ============================================================

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  slack: {
    enabled: false,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: '#mission-control',
  },
  email: {
    enabled: false,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.EMAIL_FROM || 'mission-control@localhost',
    toEmails: process.env.EMAIL_TO?.split(',').map(e => e.trim()),
  },
  rules: [
    {
      id: 'gate-completed',
      name: 'Gate Completed',
      enabled: true,
      eventType: 'gate_completed',
      severity: 'info',
      channels: ['slack', 'email'],
      cooldownMinutes: 5,
    },
    {
      id: 'gate-failed',
      name: 'Gate Failed',
      enabled: true,
      eventType: 'gate_failed',
      severity: 'warning',
      channels: ['slack', 'email'],
      cooldownMinutes: 0, // No cooldown for failures - always notify
    },
    {
      id: 'run-stuck',
      name: 'Run Stuck (>30 min)',
      enabled: true,
      eventType: 'run_stuck',
      severity: 'warning',
      channels: ['slack', 'email'],
      cooldownMinutes: 15,
    },
    {
      id: 'budget-warning',
      name: 'Budget Warning',
      enabled: true,
      eventType: 'budget_warning',
      severity: 'warning',
      channels: ['slack', 'email'],
      cooldownMinutes: 60,
    },
    {
      id: 'stall-detected',
      name: 'Stall Detected',
      enabled: true,
      eventType: 'stall_detected',
      severity: 'critical',
      channels: ['slack', 'email'],
      cooldownMinutes: 5,
    },
  ],
};

// ============================================================
// Notification Payloads
// ============================================================

export interface GateCompletedNotification {
  eventType: 'gate_completed';
  storyId: string;
  storyTitle: string;
  gate: Gate;
  agentType: string;
  summary: string;
  duration?: number;
}

export interface GateFailedNotification {
  eventType: 'gate_failed';
  storyId: string;
  storyTitle: string;
  gate: Gate;
  agentType: string;
  failureReason: string;
  duration?: number;
}

export interface StuckRunNotification {
  eventType: 'run_stuck';
  storyId: string;
  storyTitle: string;
  gate: Gate;
  agentType: string;
  stuckDurationMinutes: number;
  lastActivity?: string;
}

export interface BudgetWarningNotification {
  eventType: 'budget_warning';
  agentType: string;
  tokensUsed: number;
  tokensLimit: number;
  percentageUsed: number;
}

export interface StallDetectedNotification {
  eventType: 'stall_detected';
  storyId: string;
  storyTitle: string;
  agentType: string;
  stallType: 'network' | 'process' | 'session';
  severity: 'warning' | 'critical';
  detail: string;
}

export type NotificationPayload = 
  | GateCompletedNotification 
  | GateFailedNotification 
  | StuckRunNotification
  | BudgetWarningNotification
  | StallDetectedNotification;

// ============================================================
// Notification Service Implementation
// ============================================================

/**
 * Send notification through configured channels
 */
export async function sendNotification(
  payload: NotificationPayload,
  config: NotificationConfig = DEFAULT_NOTIFICATION_CONFIG
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Find matching rules
  const matchingRules = config.rules.filter(
    rule => rule.enabled && rule.eventType === payload.eventType
  );
  
  if (matchingRules.length === 0) {
    return { success: true, errors: [] };
  }
  
  // Send to each channel for each matching rule
  for (const rule of matchingRules) {
    for (const channel of rule.channels) {
      try {
        if (channel === 'slack' && config.slack?.enabled) {
          await sendSlackNotification(payload, config.slack, rule);
        } else if (channel === 'email' && config.email?.enabled) {
          await sendEmailNotification(payload, config.email, rule);
        }
      } catch (error) {
        errors.push(`${channel}: ${(error as Error).message}`);
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
  payload: NotificationPayload,
  slackConfig: NonNullable<NotificationConfig['slack']>,
  rule: NotificationRule
): Promise<void> {
  if (!slackConfig.webhookUrl) {
    throw new Error('Slack webhook URL not configured');
  }
  
  const message = formatSlackMessage(payload, rule);
  
  const response = await fetch(slackConfig.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Format notification payload as Slack message
 */
function formatSlackMessage(
  payload: NotificationPayload,
  rule: NotificationRule
): SlackMessage {
  const { eventType } = payload;
  const color = getSeverityColor(rule.severity || 'info');
  
  let title: string;
  let text: string;
  let fields: SlackField[] = [];
  
  switch (eventType) {
    case 'gate_completed': {
      const p = payload as GateCompletedNotification;
      title = `✅ Gate Completed: ${p.gate}`;
      text = p.summary.substring(0, 200);
      fields = [
        { title: 'Story', value: truncate(p.storyTitle, 50), short: true },
        { title: 'Agent', value: p.agentType, short: true },
        { title: 'Duration', value: p.duration ? formatDuration(p.duration) : 'N/A', short: true },
      ];
      break;
    }
    case 'gate_failed': {
      const p = payload as GateFailedNotification;
      title = `❌ Gate Failed: ${p.gate}`;
      text = p.failureReason.substring(0, 200);
      fields = [
        { title: 'Story', value: truncate(p.storyTitle, 50), short: true },
        { title: 'Agent', value: p.agentType, short: true },
        { title: 'Duration', value: p.duration ? formatDuration(p.duration) : 'N/A', short: true },
      ];
      break;
    }
    case 'run_stuck': {
      const p = payload as StuckRunNotification;
      title = `⚠️ Run Stuck: ${p.gate}`;
      text = `No activity for ${p.stuckDurationMinutes} minutes`;
      fields = [
        { title: 'Story', value: truncate(p.storyTitle, 50), short: true },
        { title: 'Agent', value: p.agentType, short: true },
        { title: 'Stuck Duration', value: `${p.stuckDurationMinutes} min`, short: true },
      ];
      break;
    }
    case 'budget_warning': {
      const p = payload as BudgetWarningNotification;
      title = `💰 Budget Warning`;
      text = `${p.percentageUsed}% of daily budget used`;
      fields = [
        { title: 'Agent', value: p.agentType, short: true },
        { title: 'Used', value: formatNumber(p.tokensUsed), short: true },
        { title: 'Limit', value: formatNumber(p.tokensLimit), short: true },
      ];
      break;
    }
    case 'stall_detected': {
      const p = payload as StallDetectedNotification;
      title = `🚨 Stall Detected: ${p.stallType}`;
      text = p.detail;
      fields = [
        { title: 'Story', value: truncate(p.storyTitle, 50), short: true },
        { title: 'Agent', value: p.agentType, short: true },
        { title: 'Severity', value: p.severity.toUpperCase(), short: true },
      ];
      break;
    }
  }
  
  return {
    attachments: [{
      color,
      title,
      text,
      fields,
      footer: 'Mission Control',
      ts: Math.floor(Date.now() / 1000),
    }],
  };
}

interface SlackMessage {
  attachments: Array<{
    color: string;
    title: string;
    text: string;
    fields: SlackField[];
    footer: string;
    ts: number;
  }>;
}

interface SlackField {
  title: string;
  value: string;
  short: boolean;
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  payload: NotificationPayload,
  emailConfig: NonNullable<NotificationConfig['email']>,
  rule: NotificationRule
): Promise<void> {
  if (!emailConfig.toEmails?.length) {
    throw new Error('Email recipients not configured');
  }
  
  const { subject, html, text } = formatEmailMessage(payload, rule);
  
  // For development/testing, log the email instead of sending
  // In production, use nodemailer or similar
  if (!emailConfig.smtpHost) {
    console.log('[Email Notification]', { subject, text });
    return;
  }
  
  // Simple SMTP send (can be replaced with nodemailer)
  const response = await fetch(`smtp://${emailConfig.smtpHost}:${emailConfig.smtpPort}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailConfig.fromEmail,
      to: emailConfig.toEmails,
      subject,
      text,
      html,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Email send failed: ${response.status}`);
  }
}

/**
 * Format notification payload as email message
 */
function formatEmailMessage(
  payload: NotificationPayload,
  rule: NotificationRule
): { subject: string; html: string; text: string } {
  const { eventType } = payload;
  let title: string;
  let body: string;
  
  switch (eventType) {
    case 'gate_completed': {
      const p = payload as GateCompletedNotification;
      title = `Gate Completed: ${p.gate}`;
      body = `
        <h2>✅ ${title}</h2>
        <p><strong>Story:</strong> ${p.storyTitle}</p>
        <p><strong>Gate:</strong> ${p.gate}</p>
        <p><strong>Agent:</strong> ${p.agentType}</p>
        <p><strong>Summary:</strong> ${p.summary}</p>
        ${p.duration ? `<p><strong>Duration:</strong> ${formatDuration(p.duration)}</p>` : ''}
      `;
      break;
    }
    case 'gate_failed': {
      const p = payload as GateFailedNotification;
      title = `Gate Failed: ${p.gate}`;
      body = `
        <h2>❌ ${title}</h2>
        <p><strong>Story:</strong> ${p.storyTitle}</p>
        <p><strong>Gate:</strong> ${p.gate}</p>
        <p><strong>Agent:</strong> ${p.agentType}</p>
        <p><strong>Failure Reason:</strong> ${p.failureReason}</p>
        ${p.duration ? `<p><strong>Duration:</strong> ${formatDuration(p.duration)}</p>` : ''}
      `;
      break;
    }
    case 'run_stuck': {
      const p = payload as StuckRunNotification;
      title = `Run Stuck: ${p.gate}`;
      body = `
        <h2>⚠️ ${title}</h2>
        <p><strong>Story:</strong> ${p.storyTitle}</p>
        <p><strong>Gate:</strong> ${p.gate}</p>
        <p><strong>Agent:</strong> ${p.agentType}</p>
        <p><strong>Stuck Duration:</strong> ${p.stuckDurationMinutes} minutes</p>
        ${p.lastActivity ? `<p><strong>Last Activity:</strong> ${p.lastActivity}</p>` : ''}
      `;
      break;
    }
    case 'budget_warning': {
      const p = payload as BudgetWarningNotification;
      title = `Budget Warning: ${p.percentageUsed}% used`;
      body = `
        <h2>💰 ${title}</h2>
        <p><strong>Agent:</strong> ${p.agentType}</p>
        <p><strong>Tokens Used:</strong> ${formatNumber(p.tokensUsed)}</p>
        <p><strong>Token Limit:</strong> ${formatNumber(p.tokensLimit)}</p>
        <p><strong>Percentage Used:</strong> ${p.percentageUsed}%</p>
      `;
      break;
    }
    case 'stall_detected': {
      const p = payload as StallDetectedNotification;
      title = `🚨 Stall Detected: ${p.stallType}`;
      body = `
        <h2>${title}</h2>
        <p><strong>Story:</strong> ${p.storyTitle}</p>
        <p><strong>Agent:</strong> ${p.agentType}</p>
        <p><strong>Stall Type:</strong> ${p.stallType}</p>
        <p><strong>Severity:</strong> ${p.severity.toUpperCase()}</p>
        <p><strong>Detail:</strong> ${p.detail}</p>
      `;
      break;
    }
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${body}
        <div class="footer">
          <p>This is an automated notification from Mission Control.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Strip HTML for plain text version
  const text = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  return { subject: `[Mission Control] ${title}`, html, text };
}

// ============================================================
// Helper Functions
// ============================================================

function getSeverityColor(severity: 'info' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'warning': return '#ff9800';
    case 'critical': return '#f44336';
    default: return '#4caf50';
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

// ============================================================
// High-Level Notification Functions
// ============================================================

/**
 * Notify gate completion
 */
export async function notifyGateCompleted(
  storyId: string,
  gate: Gate,
  summary: string,
  duration?: number
): Promise<{ success: boolean; errors: string[] }> {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) {
    return { success: false, errors: ['Story not found'] };
  }
  
  const session = await prisma.agentSession.findFirst({
    where: { storyId },
    orderBy: { startedAt: 'desc' },
  });
  
  const payload: GateCompletedNotification = {
    eventType: 'gate_completed',
    storyId,
    storyTitle: story.title,
    gate,
    agentType: session?.agentType || gate,
    summary,
    duration,
  };
  
  return sendNotification(payload);
}

/**
 * Notify gate failure
 */
export async function notifyGateFailed(
  storyId: string,
  gate: Gate,
  failureReason: string,
  duration?: number
): Promise<{ success: boolean; errors: string[] }> {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story) {
    return { success: false, errors: ['Story not found'] };
  }
  
  const session = await prisma.agentSession.findFirst({
    where: { storyId },
    orderBy: { startedAt: 'desc' },
  });
  
  const payload: GateFailedNotification = {
    eventType: 'gate_failed',
    storyId,
    storyTitle: story.title,
    gate,
    agentType: session?.agentType || gate,
    failureReason,
    duration,
  };
  
  return sendNotification(payload);
}

/**
 * Check for stuck runs and notify
 * Runs are considered stuck if no activity for >30 minutes
 */
export async function checkAndNotifyStuckRuns(
  stuckThresholdMinutes: number = 30
): Promise<{ storiesChecked: number; stuckFound: number; errors: string[] }> {
  const errors: string[] = [];
  
  // Find all active sessions
  const activeSessions = await prisma.agentSession.findMany({
    where: {
      status: { in: ['WORKING', 'IDLE', 'STALLED_WARNING', 'STALLED_CRITICAL'] },
      endedAt: null,
    },
    include: {
      story: true,
    },
  });
  
  let stuckFound = 0;
  const now = new Date();
  
  for (const session of activeSessions) {
    const lastPing = session.lastPingAt || session.startedAt;
    const idleMinutes = Math.floor((now.getTime() - lastPing.getTime()) / 60000);
    
    if (idleMinutes >= stuckThresholdMinutes) {
      stuckFound++;
      
      // Get gate, defaulting to 'architect' if unknown
      const gateValue = session.story?.currentGate;
      const gate: Gate = (gateValue && ['architect', 'implementer', 'reviewer-a', 'operator', 'reviewer-b', 'done'].includes(gateValue)) 
        ? gateValue as Gate 
        : 'architect';
      
      const payload: StuckRunNotification = {
        eventType: 'run_stuck',
        storyId: session.storyId || 'unknown',
        storyTitle: session.story?.title || 'Unknown Story',
        gate,
        agentType: session.agentType,
        stuckDurationMinutes: idleMinutes,
        lastActivity: session.lastTool || undefined,
      };
      
      const result = await sendNotification(payload);
      if (!result.success) {
        errors.push(...result.errors);
      }
    }
  }
  
  return {
    storiesChecked: activeSessions.length,
    stuckFound,
    errors,
  };
}

/**
 * Notify budget warning
 */
export async function notifyBudgetWarning(
  agentType: string,
  tokensUsed: number,
  tokensLimit: number,
  percentageUsed: number
): Promise<{ success: boolean; errors: string[] }> {
  const payload: BudgetWarningNotification = {
    eventType: 'budget_warning',
    agentType,
    tokensUsed,
    tokensLimit,
    percentageUsed,
  };
  
  return sendNotification(payload);
}

/**
 * Notify stall detected
 */
export async function notifyStallDetected(
  storyId: string,
  agentType: string,
  stallType: 'network' | 'process' | 'session',
  severity: 'warning' | 'critical',
  detail: string
): Promise<{ success: boolean; errors: string[] }> {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  
  const payload: StallDetectedNotification = {
    eventType: 'stall_detected',
    storyId,
    storyTitle: story?.title || 'Unknown Story',
    agentType,
    stallType,
    severity,
    detail,
  };
  
  return sendNotification(payload);
}

// ============================================================
// Configuration Helpers
// ============================================================

/**
 * Load notification config from environment variables
 */
export function loadNotificationConfig(): NotificationConfig {
  return {
    slack: {
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#mission-control',
    },
    email: {
      enabled: !!process.env.SMTP_HOST,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      fromEmail: process.env.EMAIL_FROM || 'mission-control@localhost',
      toEmails: process.env.EMAIL_TO?.split(',').map(e => e.trim()),
    },
    rules: DEFAULT_NOTIFICATION_CONFIG.rules,
  };
}

/**
 * Validate notification configuration
 */
export function validateNotificationConfig(config: NotificationConfig): string[] {
  const errors: string[] = [];
  
  if (config.slack?.enabled && !config.slack.webhookUrl) {
    errors.push('Slack is enabled but webhook URL is not configured');
  }
  
  if (config.email?.enabled) {
    if (!config.email.smtpHost) {
      errors.push('Email is enabled but SMTP host is not configured');
    }
    if (!config.email.toEmails?.length) {
      errors.push('Email is enabled but no recipients are configured');
    }
  }
  
  const enabledRules = config.rules.filter(r => r.enabled);
  if (enabledRules.length === 0) {
    errors.push('No notification rules are enabled');
  }
  
  return errors;
}
