# Notification System (MC2-E5)

The Mission Control notification system provides configurable alerts for important workflow events including gate completions, failures, and stuck runs.

## Overview

The notification service (`src/lib/notifications.ts`) supports:
- **Slack webhooks** - Send messages to Slack channels
- **Email notifications** - Send emails via SMTP
- **Configurable rules** - Enable/disable specific notification types
- **Cooldown periods** - Prevent notification spam

## Configuration

### Environment Variables

```bash
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
SLACK_CHANNEL=#mission-control

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=mission-control@example.com
EMAIL_TO=team@example.com,another@example.com
```

### Default Notification Rules

| Rule | Event Type | Severity | Default Channels | Cooldown |
|------|------------|----------|------------------|-----------|
| Gate Completed | `gate_completed` | info | slack, email | 5 min |
| Gate Failed | `gate_failed` | warning | slack, email | 0 min |
| Run Stuck (>30 min) | `run_stuck` | warning | slack, email | 15 min |
| Budget Warning | `budget_warning` | warning | slack, email | 60 min |
| Stall Detected | `stall_detected` | critical | slack, email | 5 min |

## Usage

### Sending Notifications

```typescript
import { 
  sendNotification,
  notifyGateCompleted,
  notifyGateFailed,
  checkAndNotifyStuckRuns,
  notifyBudgetWarning,
  notifyStallDetected,
} from '@/lib/notifications';
```

#### Gate Completion

```typescript
await notifyGateCompleted(
  'story-id',
  'architect',           // gate name
  'Spec completed successfully',
  120                    // duration in seconds (optional)
);
```

#### Gate Failure

```typescript
await notifyGateFailed(
  'story-id',
  'implementer',
  'Build failed: TypeScript errors',
  300                    // duration in seconds (optional)
);
```

#### Stuck Run Check

```typescript
// Call periodically (e.g., via cron or health check)
// Runs are considered stuck if no activity for >30 minutes
const result = await checkAndNotifyStuckRuns(30);

console.log(`Checked ${result.storiesChecked} stories, found ${result.stuckFound} stuck`);
```

#### Budget Warning

```typescript
await notifyBudgetWarning(
  'implementer',        // agent type
  800000,               // tokens used
  1000000,              // token limit
  80                    // percentage used
);
```

#### Stall Detected

```typescript
await notifyStallDetected(
  'story-id',
  'implementer',
  'network',            // stall type: 'network' | 'process' | 'session'
  'critical',          // severity: 'warning' | 'critical'
  'No response from API for 5 minutes'
);
```

### Custom Notifications

```typescript
import { sendNotification, type NotificationConfig } from '@/lib/notifications';

const customPayload = {
  eventType: 'gate_completed' as const,
  storyId: 'story-123',
  storyTitle: 'Add user authentication',
  gate: 'architect',
  agentType: 'architect',
  summary: 'Created SPEC.md with detailed requirements',
  duration: 180,
};

const config: NotificationConfig = {
  slack: {
    enabled: true,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
  rules: [
    {
      id: 'custom-rule',
      name: 'Custom Notification',
      enabled: true,
      eventType: 'gate_completed',
      channels: ['slack'],
    },
  ],
};

await sendNotification(customPayload, config);
```

## Integration Points

### With Gate Completion (Reconciler)

The notification service integrates with the reconciliation system in `src/lib/orchestration/reconciler.ts`:

```typescript
import { notifyGateCompleted, notifyGateFailed } from '@/lib/notifications';

// After successful gate transition
await notifyGateCompleted(storyId, gate, summary, duration);

// After failed gate
await notifyGateFailed(storyId, gate, failureReason, duration);
```

### With Stall Detection

Integrate with the stall detector in `src/lib/stall-detector.ts`:

```typescript
import { notifyStallDetected } from '@/lib/notifications';

const stalls = await detectStalls(session);

for (const stall of stalls) {
  if (stall.severity === 'critical') {
    await notifyStallDetected(
      session.storyId,
      session.agentType,
      stall.type,
      stall.severity,
      stall.detail
    );
  }
}
```

### With Budget Tracking

Integrate with the budget system in `src/lib/budget.ts`:

```typescript
import { notifyBudgetWarning } from '@/lib/notifications';

if (percentageUsed >= 80 && !alertSent) {
  await notifyBudgetWarning(agentType, tokensUsed, tokensLimit, percentageUsed);
}
```

## Scheduled Checks

Add periodic checks for stuck runs using cron:

```bash
# Check for stuck runs every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/notifications/check-stuck
```

Or integrate into the health check endpoint:

```typescript
// In src/app/api/health/route.ts
import { checkAndNotifyStuckRuns } from '@/lib/notifications';

export async function GET() {
  // ... existing health checks ...
  
  // Check for stuck runs
  const stuckResult = await checkAndNotifyStuckRuns(30);
  
  return Response.json({
    status: 'healthy',
    stuckRuns: stuckResult,
  });
}
```

## Testing

Run the notification tests:

```bash
cd mission-control
npm test -- src/lib/__tests__/notifications.test.ts
```

Test notification delivery manually:

```bash
# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from Mission Control"}' \
  $SLACK_WEBHOOK_URL
```

## Troubleshooting

### Slack notifications not sending

1. Verify `SLACK_WEBHOOK_URL` is set correctly
2. Check Slack app permissions for the webhook
3. Test with curl (see above)

### Email notifications not sending

1. Verify SMTP credentials are correct
2. Check that your email provider allows SMTP
3. For development, emails are logged to console instead

### Too many notifications

- Adjust cooldown periods in the notification rules
- Disable specific rules you're not interested in
- Use severity filtering to reduce noise

### Rate limiting

The service doesn't implement rate limiting internally. For high-volume scenarios:
- Use Slack's built-in rate limiting
- Implement cooldown in your calling code
- Use the cooldown settings in notification rules
