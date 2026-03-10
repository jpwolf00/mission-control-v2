# Smart Recovery System - Anomaly Detection and Escalation

## Overview

The Smart Recovery System provides intelligent incident response for the Mission Control orchestrator. It detects stale agent sessions, duplicate runs, callback timeouts, and other anomalies, then escalates to problem-solving agents or human operators with diagnostic context.

## Key Features

### 1. Anomaly Detection

The system detects five types of anomalies:

| Type | Description | Severity | Auto-Escalate |
|------|-------------|----------|---------------|
| `stale_session` | No heartbeat within gate-specific threshold | High/Critical | ✅ |
| `duplicate_run` | Multiple active sessions for same story+gate | High | ✅ |
| `callback_timeout` | Session running >45 min without callback | Critical | ✅ |
| `ghost_lock` | Story locked but no active session | Medium | ⚠️ |
| `cascading_failure` | Multiple gate failures in sequence | Critical | ✅ |

### 2. Gate-Specific Heartbeat Thresholds

Different gates get different leash lengths based on expected operation duration:

| Gate | Threshold | Warning | Rationale |
|------|-----------|---------|-----------|
| `architect` | 15 min | 12 min | Research and spec writing |
| `implementer` | 20 min | 16 min | Code changes may take time |
| `reviewer-a` | 10 min | 8 min | QA validation should be quick |
| `operator` | **30 min** | 24 min | Backups and deploys take time |
| `reviewer-b` | 10 min | 8 min | Production health checks |
| `ui-designer` | 15 min | 12 min | Design work |

### 3. Heartbeat Ping Mechanism

Before escalating a stale session, the system can send a proactive heartbeat ping:

1. Detect stale session (no heartbeat within threshold)
2. Send ping to agent via callback endpoint
3. Wait 10 seconds for response
4. Re-check session status
5. If still stale → escalate; if recovered → log and skip

This prevents false escalations for agents that are still working but slow to report.

### 4. Escalation Flow

```
Anomaly Detected
       │
       ▼
┌──────────────┐
│ Check Severity│
└──────────────┘
       │
   ┌───┴───┐
   │       │
Critical  High/Medium
   │       │
   ▼       ▼
Escalate  Check Cooldown
to Human  (30 min)
           │
      ┌────┴────┐
      │         │
   Expired   Not Expired
      │         │
      ▼         │
  Escalate      │
  to Problem    │
  Solver        │
                ▼
         Log & Monitor
```

**Escalation Targets:**
- **Critical**: Human operator (email + Slack)
- **High**: Problem-solving agent (Slack)
- **Medium**: Problem-solving agent with cooldown (Slack)
- **Low**: Log only, no escalation

### 5. Comprehensive Audit Logging

All anomaly detections, escalations, and resolutions are logged to the `story_events` table with `eventType: 'audit_log'`.

**Logged Actions:**
- `anomaly_detected` - When an anomaly is first detected
- `escalation_sent` - When escalation notification is sent
- `heartbeat_ping` - When proactive ping is sent
- `recovery_attempted` - When recovery action is taken
- `resolved` - When anomaly is manually resolved

**Log Payload Structure:**
```json
{
  "action": "anomaly_detected",
  "sessionId": "session-123",
  "gate": "implementer",
  "timestamp": "2026-03-09T22:28:00.000Z",
  "type": "stale_session",
  "severity": "high",
  "timeSinceHeartbeat": 1320000
}
```

## Edge Case Handling

### Operator Mid-Backup

**Scenario:** Operator is running a database backup that takes 25 minutes.

**Handling:**
- Operator threshold is 30 minutes (longest of all gates)
- At 24 minutes (warning threshold), system logs but doesn't escalate
- At 25 minutes, heartbeat ping is sent
- If backup completes at 26 minutes → callback received, session closes normally
- If no response by 30 minutes → escalate to problem solver

### Implementer Mid-Build

**Scenario:** Implementer is running a large build/test suite.

**Handling:**
- 20 minute threshold gives ample time for builds
- Agent should send periodic heartbeats during long operations
- If heartbeat stops mid-build → ping sent, then escalate if no response

### Network Partitions

**Scenario:** Gateway is unreachable, agents can't send callbacks.

**Handling:**
- Callback timeouts detected after 45 minutes
- Multiple failures across different stories → cascading_failure detected
- System escalates with diagnostic context showing pattern
- Human operator can investigate network/gateway health

### Cascading Failures

**Scenario:** Provider issues cause multiple gate failures.

**Handling:**
- System detects 2+ failed sessions in 1 hour for same story
- Escalates as critical with full failure pattern
- Includes provider/model info for each failure
- Recommends checking provider status or switching providers

## API Endpoints

### Check for Anomalies

```bash
POST /api/v1/recovery/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "escalate": true,  // Optional: auto-escalate detected issues
  "types": ["stale_session", "duplicate_run"]  // Optional: filter by type
}
```

**Response:**
```json
{
  "success": true,
  "anomaliesFound": 2,
  "anomalies": [
    {
      "id": "anomaly-123",
      "type": "stale_session",
      "severity": "high",
      "storyId": "story-456",
      "sessionId": "session-789",
      "gate": "implementer",
      "detectedAt": "2026-03-09T22:28:00.000Z",
      "description": "Session session-789 stale: 22 min since last heartbeat (threshold: 20 min)",
      "escalated": true,
      "escalatedTo": "problem_solver"
    }
  ],
  "escalated": 1
}
```

### Get Recent Anomalies

```bash
GET /api/v1/recovery/check?limit=50&unresolved=true
Authorization: Bearer <token>
```

### Get Recovery Health

```bash
GET /api/v1/recovery/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "health": {
    "status": "degraded",
    "activeSessions": 3,
    "staleSessions": 1,
    "recentAnomalies": 2,
    "recentEscalations": 1,
    "lastCheck": "2026-03-09T22:25:00.000Z"
  },
  "monitor": {
    "lastRun": "2026-03-09T22:25:00.000Z",
    "lastEscalation": "2026-03-09T22:20:00.000Z",
    "totalAnomaliesDetected": 15,
    "totalEscalationsSent": 3,
    "totalPingsSent": 8
  }
}
```

### Trigger Manual Check

```bash
POST /api/v1/recovery/health
Authorization: Bearer <token>
Content-Type: application/json

{
  "escalate": false
}
```

### Resolve Anomaly

```bash
POST /api/v1/recovery/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "anomalyId": "anomaly-123",
  "resolution": "Manually restarted session after confirming agent was stuck",
  "action": "restart_session"  // Optional: resolve_only | release_lock | restart_session | cancel_session
}
```

## CLI Usage

### Check for Anomalies

```bash
# Run checks without escalation
npm run recovery:check

# Run checks and escalate issues
npm run recovery:check --escalate

# Get health status
npm run recovery:health
```

### Programmatic Usage

```typescript
import { runRecoveryMonitor, getRecoveryHealth } from '@/lib/recovery-monitor';

// Run monitoring
const result = await runRecoveryMonitor({
  escalate: true,
  pingBeforeEscalate: true,
});

// Get health status
const health = await getRecoveryHealth();
console.log(`System status: ${health.status}`);
```

## Cron Integration

Add to crontab for periodic checks:

```bash
# Run recovery check every 5 minutes
*/5 * * * * cd /path/to/mission-control-v2 && npm run recovery:check >> /var/log/mc2-recovery.log 2>&1

# Run health check every hour
0 * * * * cd /path/to/mission-control-v2 && npm run recovery:health >> /var/log/mc2-health.log 2>&1
```

## Testing

```bash
# Run recovery service tests
npm test -- recovery-service

# Run with coverage
npm run test:coverage -- recovery-service
```

## Configuration

Environment variables (optional, defaults shown):

```bash
# Recovery monitor settings
MC2_RECOVERY_CHECK_INTERVAL_MS=300000      # 5 minutes
MC2_RECOVERY_ESCALATION_COOLDOWN_MS=1800000 # 30 minutes
MC2_RECOVERY_PING_BEFORE_ESCALATE=true
MC2_RECOVERY_AUTO_RESOLVE_GHOST_LOCKS=false
```

## Files

| File | Purpose |
|------|---------|
| `src/services/recovery-service.ts` | Core anomaly detection and escalation logic |
| `src/lib/recovery-monitor.ts` | Periodic monitoring and health checks |
| `src/app/api/v1/recovery/check/route.ts` | API endpoint for anomaly checks |
| `src/app/api/v1/recovery/health/route.ts` | API endpoint for health status |
| `src/app/api/v1/recovery/resolve/route.ts` | API endpoint for manual resolution |
| `scripts/recovery-monitor.ts` | CLI script for manual/cron execution |
| `src/services/__tests__/recovery-service.test.ts` | Unit tests |
| `docs/RECOVERY_SYSTEM.md` | This documentation |

## Future Enhancements

- [ ] Redis-backed state for multi-instance deployments
- [ ] Machine learning for anomaly pattern recognition
- [ ] Automatic recovery actions (restart session, switch provider)
- [ ] Dashboard UI for anomaly visualization
- [ ] Integration with PagerDuty/OpsGenie for on-call escalation
- [ ] Historical anomaly trends and reporting
- [ ] Custom threshold configuration per story priority
