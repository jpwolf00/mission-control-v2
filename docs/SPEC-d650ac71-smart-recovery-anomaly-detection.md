# Smart Recovery: Anomaly Detection and Escalation for Stalled Agent Sessions

**Story ID:** `d650ac71-2950-4057-8530-924e52d3d8b0`  
**Gate:** Architect  
**Version:** 1.0  
**Status:** Draft (Ready for Implementation)  
**Date:** 2026-03-09

---

## Executive Summary

This specification defines an intelligent incident-response system for the Mission Control v2 orchestrator that detects and escalates anomalous agent session conditions. Instead of auto-remediation (which can cause dangerous loops), the system escalates to a problem-solving agent or human operator with comprehensive diagnostic context.

### Key Capabilities

1. **Stale Session Detection** — Gate-specific heartbeat thresholds with configurable timeouts
2. **Duplicate Run Detection** — Identifies and prevents multiple concurrent sessions for the same story+gate
3. **Callback Timeout Detection** — Tracks expected vs actual callback timing
4. **Gate-Specific Thresholds** — Operator gets longer leash for backups; implementer gets more time for builds
5. **Heartbeat Ping Mechanism** — Long-running operations can signal liveness
6. **Comprehensive Audit Logging** — Full traceability of all detection and escalation events
7. **Edge Case Handling** — Operator mid-backup, implementer mid-build, network partitions, cascading failures

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Smart Recovery System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Anomaly Detector│    │  Escalation      │    │   Audit Logger       │  │
│  │  Service         │───▶│  Router          │───▶│   & Event Store      │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────────┘  │
│           │                       │                        │               │
│           ▼                       ▼                        ▼               │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Heartbeat       │    │  Problem-Solving │    │   Dashboard          │  │
│  │  Monitor         │    │  Agent (Optional)│    │   Integration        │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   MC2 Database  │       │  OpenClaw       │       │  Human Operator │
│   (Prisma)      │       │  Gateway        │       │  (Notification) │
│                 │       │                 │       │                 │
│ - RunSession    │       │ - Agent Status  │       │ - Alert UI      │
│ - StoryGate     │       │ - Hooks API     │       │ - Email/Slack   │
│ - AnomalyEvent  │       │                 │       │ - Dashboard     │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Data Flow

1. **Detection Loop** (background cron/heartbeat, every 2 minutes)
   - Scans all active sessions from database
   - Calculates staleness based on gate-specific thresholds
   - Detects duplicate active sessions for same story+gate
   - Identifies missing callbacks beyond expected window
   - Creates AnomalyEvent records for detected issues

2. **Escalation Router** (triggered on anomaly detection)
   - Classifies anomaly severity (warning, critical, emergency)
   - Routes to appropriate responder:
     - Problem-solving agent (for recoverable issues)
     - Human operator (for critical/unrecoverable issues)
   - Includes comprehensive diagnostic context

3. **Heartbeat Monitor** (continuous)
   - Receives heartbeat pings from long-running agents
   - Updates lastHeartbeatAt timestamp
   - Prevents false-positive stale detection

4. **Audit Logger** (event-driven)
   - Records all detection events
   - Stores escalation decisions
   - Maintains full traceability

---

## Component Specifications

### 3.1 Anomaly Detector Service

**File:** `src/services/anomaly-detector.ts`

#### Gate-Specific Thresholds

Default thresholds (configurable via `ANOMALY_THRESHOLDS` env var):

| Gate | Warning (min) | Critical (min) | Emergency (min) | Rationale |
|------|---------------|----------------|-----------------|-----------|
| `architect` | 15 | 30 | 60 | Design work should be bounded |
| `implementer` | 30 | 60 | 120 | Coding may take longer |
| `reviewer-a` | 15 | 30 | 60 | QA review should be quick |
| `operator` | 45 | 90 | 180 | Backups/deploys take time |
| `reviewer-b` | 15 | 30 | 60 | Prod validation should be quick |
| `default` | 20 | 40 | 80 | Fallback for unknown gates |

#### Anomaly Types

```typescript
type AnomalyType = 
  | 'stale_session'           // No heartbeat/activity within threshold
  | 'duplicate_active_runs'   // Multiple active sessions for same story+gate
  | 'callback_timeout'        // Expected callback not received
  | 'ghost_lock'              // Session released but gate still marked in_progress
  | 'cascading_failure'       // Multiple consecutive gate failures
  | 'network_partition'       // Gateway unreachable but session active
  | 'resource_exhaustion';    // High invocation count, potential runaway
```

#### Detection Logic

**Stale Session Detection:**
```typescript
function detectStaleSession(session: RunSession, gate: Gate): AnomalySeverity | null {
  const thresholds = GATE_THRESHOLDS[gate];
  const lastActivity = session.lastHeartbeatAt || session.startedAt;
  const idleMinutes = (Date.now() - lastActivity.getTime()) / 60000;
  
  if (idleMinutes >= thresholds.emergency) return 'emergency';
  if (idleMinutes >= thresholds.critical) return 'critical';
  if (idleMinutes >= thresholds.warning) return 'warning';
  return null;
}
```

**Duplicate Run Detection:**
```typescript
async function detectDuplicateRuns(storyId: string, gate: Gate): Promise<RunSession[]> {
  const activeSessions = await prisma.runSession.findMany({
    where: {
      storyId,
      gate,
      status: 'active',
    },
  });
  return activeSessions.length > 1 ? activeSessions : [];
}
```

**Ghost Lock Detection:**
```typescript
async function detectGhostLocks(): Promise<GhostLock[]> {
  // Find stories with gate status 'in_progress' but no active session
  const stories = await prisma.story.findMany({
    where: {
      status: 'active',
    },
    include: {
      gates: true,
      sessions: {
        where: { status: 'active' },
      },
    },
  });
  
  return stories.flatMap(story => {
    return story.gates
      .filter(g => g.status === 'in_progress' && !story.sessions.some(s => s.gate === g.gate))
      .map(g => ({ storyId: story.id, gate: g.gate }));
  });
}
```

**Callback Timeout Detection:**
```typescript
function detectCallbackTimeout(session: RunSession): boolean {
  // If session started but no callback received within expected window
  const startedAt = session.startedAt;
  if (!startedAt) return false;
  
  const elapsedMinutes = (Date.now() - startedAt.getTime()) / 60000;
  const expectedWindow = GATE_THRESHOLDS[session.gate as Gate].critical;
  
  return elapsedMinutes > expectedWindow && !session.endedAt;
}
```

**Cascading Failure Detection:**
```typescript
async function detectCascadingFailures(storyId: string): Promise<boolean> {
  const recentEvents = await prisma.storyEvent.findMany({
    where: {
      storyId,
      eventType: { in: ['gate_failed', 'session_failed'] },
      createdAt: {
        gte: new Date(Date.now() - 30 * 60000), // Last 30 minutes
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  
  return recentEvents.length >= 3;
}
```

**Resource Exhaustion Detection:**
```typescript
function detectResourceExhaustion(session: RunSession): boolean {
  const INVOCATION_THRESHOLD = 500; // Configurable
  return (session.actualInvocations || 0) > INVOCATION_THRESHOLD;
}
```

### 3.2 Escalation Router

**File:** `src/services/escalation-router.ts`

#### Severity Classification

| Severity | Criteria | Auto-Action | Human Notify |
|----------|----------|-------------|--------------|
| `warning` | Threshold warning level reached | Log only | No |
| `critical` | Threshold critical level OR duplicate runs | Escalate to problem-solving agent | Dashboard alert |
| `emergency` | Threshold emergency OR cascading failure | Immediate human escalation | Email + Dashboard |

#### Escalation Targets

```typescript
type EscalationTarget = 
  | 'problem_solving_agent'  // AI agent for recovery attempts
  | 'human_operator'         // Human operator notification
  | 'system_admin'           // System admin for infrastructure issues
  | 'on_call';               // PagerDuty/on-call rotation
```

#### Routing Logic

```typescript
function routeEscalation(anomaly: AnomalyEvent): EscalationTarget {
  switch (anomaly.type) {
    case 'stale_session':
      return anomaly.severity === 'emergency' ? 'human_operator' : 'problem_solving_agent';
    
    case 'duplicate_active_runs':
      return 'problem_solving_agent'; // Can auto-resolve
    
    case 'callback_timeout':
      return anomaly.severity === 'emergency' ? 'human_operator' : 'problem_solving_agent';
    
    case 'ghost_lock':
      return 'problem_solving_agent'; // Can auto-resolve
    
    case 'cascading_failure':
      return 'human_operator'; // Needs human judgment
    
    case 'network_partition':
      return 'system_admin'; // Infrastructure issue
    
    case 'resource_exhaustion':
      return 'human_operator'; // Potential runaway agent
    
    default:
      return 'human_operator';
  }
}
```

### 3.3 Diagnostic Context Builder

**File:** `src/services/diagnostic-context.ts`

Builds comprehensive context for escalation:

```typescript
interface DiagnosticContext {
  // Session Info
  sessionId: string;
  storyId: string;
  gate: Gate;
  role: string;
  startedAt: Date;
  lastHeartbeatAt?: Date;
  
  // Story Info
  storyTitle: string;
  storyStatus: string;
  currentGateStatus: string;
  
  // Anomaly Details
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  detectedAt: Date;
  idleMinutes: number;
  thresholdMinutes: number;
  
  // Agent Telemetry
  model?: string;
  provider?: string;
  estimatedInvocations: number;
  actualInvocations: number;
  
  // Recent Events (last 10)
  recentEvents: StoryEvent[];
  
  // Related Sessions
  duplicateSessions?: RunSession[];
  previousAttempts?: RunSession[];
  
  // System Health
  mc2Health: HealthStatus;
  openclawHealth: HookProbeStatus;
  
  // Recommended Actions
  recommendedActions: string[];
}
```

### 3.4 Problem-Solving Agent Integration

**File:** `src/services/problem-solving-agent.ts`

When escalation target is `problem_solving_agent`, the system spawns a specialized recovery agent:

```typescript
async function spawnProblemSolvingAgent(context: DiagnosticContext): Promise<void> {
  const recoverySessionId = uuidv4();
  
  const message = buildRecoveryPrompt(context);
  
  await triggerAgent({
    storyId: context.storyId,
    gate: 'recovery', // Special gate for recovery agents
    sessionId: recoverySessionId,
    role: 'recovery-agent',
    context: { diagnosticContext: context },
  });
}
```

**Recovery Agent Capabilities:**
- Kill stuck sessions
- Reset ghost locks
- Merge duplicate sessions
- Request human escalation if recovery fails
- Never auto-retry the same gate (prevents loops)

### 3.5 Human Operator Notification

**File:** `src/services/operator-notifier.ts`

```typescript
async function notifyHumanOperator(context: DiagnosticContext): Promise<void> {
  // Create notification record
  await prisma.operatorAlert.create({
    data: {
      sessionId: context.sessionId,
      storyId: context.storyId,
      severity: context.severity,
      type: context.anomalyType,
      context: context as unknown as Prisma.JsonObject,
      status: 'pending',
    },
  });
  
  // Send to notification channels
  await Promise.all([
    sendDashboardAlert(context),
    sendEmailNotification(context),
    // sendSlackNotification(context), // Future
  ]);
}
```

### 3.6 Audit Logger

**File:** `src/services/audit-logger.ts`

```typescript
async function logAnomalyEvent(event: AnomalyEvent): Promise<void> {
  await prisma.anomalyEvent.create({
    data: {
      id: uuidv4(),
      sessionId: event.sessionId,
      storyId: event.storyId,
      gate: event.gate,
      type: event.type,
      severity: event.severity,
      context: event.context as Prisma.JsonObject,
      detectedAt: new Date(),
    },
  });
}
```

---

## Database Schema Additions

### New Tables

```prisma
// Anomaly detection events
model AnomalyEvent {
  id          String   @id @default(uuid())
  sessionId   String   @map("session_id")
  storyId     String   @map("story_id")
  gate        String
  type        String   // stale_session, duplicate_runs, etc.
  severity    String   // warning, critical, emergency
  context     Json?    // Diagnostic context snapshot
  detectedAt  DateTime @default(now()) @map("detected_at")
  resolvedAt  DateTime? @map("resolved_at")
  resolvedBy  String?   @map("resolved_by")
  resolution  String?   // How it was resolved
  
  @@map("anomaly_events")
  @@index([storyId])
  @@index([sessionId])
  @@index([detectedAt])
  @@index([type, severity])
}

// Operator alerts (human escalation queue)
model OperatorAlert {
  id          String   @id @default(uuid())
  sessionId   String   @map("session_id")
  storyId     String   @map("story_id")
  type        String   // anomaly type
  severity    String   // warning, critical, emergency
  context     Json     // Full diagnostic context
  status      String   @default("pending") // pending, acknowledged, resolved
  acknowledgedAt DateTime? @map("acknowledged_at")
  acknowledgedBy String?   @map("acknowledged_by")
  resolvedAt  DateTime? @map("resolved_at")
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("operator_alerts")
  @@index([storyId])
  @@index([status, severity])
  @@index([createdAt])
}

// Recovery attempts by problem-solving agents
model RecoveryAttempt {
  id          String   @id @default(uuid())
  anomalyId   String   @map("anomaly_id")
  sessionId   String   @map("session_id")
  storyId     String   @map("story_id")
  recoveryAgentId String @map("recovery_agent_id")
  actions     Json     // List of actions taken
  success     Boolean
  error       String?
  startedAt   DateTime @default(now()) @map("started_at")
  completedAt DateTime? @map("completed_at")
  
  @@map("recovery_attempts")
  @@index([anomalyId])
  @@index([storyId])
}
```

---

## API Endpoints

### New Endpoints

#### 1. Heartbeat Ping (Agent → MC2)

```
POST /api/v1/agents/heartbeat
```

**Purpose:** Long-running agents can signal liveness to prevent false-positive stale detection.

**Body:**
```json
{
  "sessionId": "uuid",
  "agentId": "string",
  "progress": {
    "percentComplete": 45,
    "currentStep": "Running tests",
    "estimatedRemainingMinutes": 10
  }
}
```

**Response:**
```json
{
  "status": "heartbeat_received",
  "sessionId": "uuid",
  "thresholdMinutes": 45,
  "idleMinutes": 5
}
```

#### 2. Anomaly Events Query

```
GET /api/v1/anomalies?storyId=xxx&severity=critical&limit=50
```

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "storyId": "uuid",
      "gate": "implementer",
      "type": "stale_session",
      "severity": "critical",
      "detectedAt": "2026-03-09T18:00:00Z",
      "context": { ... }
    }
  ],
  "total": 42
}
```

#### 3. Operator Alerts

```
GET /api/v1/alerts?status=pending
PATCH /api/v1/alerts/:id/acknowledge
PATCH /api/v1/alerts/:id/resolve
```

#### 4. Manual Escalation Trigger

```
POST /api/v1/anomalies/detect
```

**Purpose:** Manual trigger for anomaly detection (for testing or forced re-check).

**Response:**
```json
{
  "scannedSessions": 15,
  "anomaliesDetected": 3,
  "anomalies": [ ... ]
}
```

---

## Edge Case Handling

### 4.1 Operator Mid-Backup

**Scenario:** Operator gate is running a database backup that takes 2+ hours.

**Handling:**
- Operator gate has extended thresholds (45/90/180 min)
- Agent sends periodic heartbeats during backup
- If heartbeat stops mid-backup, escalate with context: "Backup may be stuck"

### 4.2 Implementer Mid-Build

**Scenario:** Large project build taking 60+ minutes.

**Handling:**
- Implementer gate has extended critical threshold (60 min)
- Agent should send heartbeats during long builds
- Build progress can be included in heartbeat

### 4.3 Network Partitions

**Scenario:** MC2 can reach database but not OpenClaw gateway.

**Handling:**
- Detect via hook probe failure
- Mark sessions as "network_partitioned"
- Do not auto-kill (agent may still be running)
- Escalate to system admin

### 4.4 Cascading Failures

**Scenario:** Same story fails 3+ gates in a row.

**Handling:**
- Detect pattern in recent events
- Immediate human escalation (not problem-solving agent)
- Include full failure history in context

### 4.5 Duplicate Active Runs

**Scenario:** Race condition creates two active sessions for same story+gate.

**Handling:**
- Problem-solving agent identifies newer session
- Kills newer session (older session likely has progress)
- Updates database to reflect correct state
- Never kills both (risk of data loss)

### 4.6 Ghost Locks

**Scenario:** Session completed but gate still marked in_progress.

**Handling:**
- Problem-solving agent resets gate status
- Checks if gate was actually completed
- If completed, advances to next gate
- If not, re-dispatches current gate

---

## Configuration

### Environment Variables

```bash
# Anomaly Detection
ANOMALY_DETECTION_ENABLED=true
ANOMALY_DETECTION_INTERVAL_MINUTES=2
ANOMALY_THRESHOLDS='{"architect":{"warning":15,"critical":30,"emergency":60},...}'

# Escalation
ESCALATION_ENABLED=true
PROBLEM_SOLVING_AGENT_ENABLED=true
HUMAN_ESCALATION_CHANNELS=dashboard,email

# Notifications
OPERATOR_EMAIL=ops@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Recovery
MAX_RECOVERY_ATTEMPTS=3
RECOVERY_BACKOFF_MINUTES=5
```

---

## Integration with Existing Systems

### Heartbeat.md Integration

The Smart Recovery system integrates with the existing `HEARTBEAT.md` workflow:

1. Heartbeat checks now include anomaly detection scan
2. Stuck subagent detection uses anomaly detector
3. Ghost-lock cleanup uses official detection logic
4. Context continuity guard can trigger manual escalation

### Monitor v2 Integration

Anomaly events are displayed in the Monitor v2 dashboard:
- Stale stories table enhanced with anomaly severity
- New "Anomalies" panel showing recent events
- Alert badge on stories with active anomalies

---

## Testing Strategy

### Unit Tests

```typescript
// Test stale detection
describe('detectStaleSession', () => {
  it('should detect warning threshold breach', () => {
    const session = createMockSession({ idleMinutes: 16, gate: 'architect' });
    expect(detectStaleSession(session, 'architect')).toBe('warning');
  });
  
  it('should respect gate-specific thresholds', () => {
    const session = createMockSession({ idleMinutes: 35, gate: 'implementer' });
    expect(detectStaleSession(session, 'implementer')).toBe('warning');
    expect(detectStaleSession(session, 'architect')).toBe('critical');
  });
});

// Test duplicate detection
describe('detectDuplicateRuns', () => {
  it('should find duplicate active sessions', async () => {
    await createSession({ storyId: 's1', gate: 'architect', status: 'active' });
    await createSession({ storyId: 's1', gate: 'architect', status: 'active' });
    const duplicates = await detectDuplicateRuns('s1', 'architect');
    expect(duplicates).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
// Full detection pipeline
describe('Anomaly Detection Pipeline', () => {
  it('should detect and escalate stale session', async () => {
    // Create old session
    const session = await createSession({ 
      startedAt: Date.now() - 35 * 60000,
      gate: 'architect'
    });
    
    // Run detection
    const result = await runAnomalyDetection();
    
    // Verify anomaly created
    expect(result.anomalies).toHaveLength(1);
    expect(result.anomalies[0].type).toBe('stale_session');
    
    // Verify escalation
    const alert = await prisma.operatorAlert.findFirst();
    expect(alert).toBeTruthy();
    expect(alert.severity).toBe('critical');
  });
});
```

### Manual Testing

```bash
# 1. Create a test story and dispatch to architect
curl -X POST http://localhost:3004/api/v1/orchestration/dispatch \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-anomaly-001" \
  -d '{"storyId":"test-story","gate":"architect"}'

# 2. Manually trigger detection
curl -X POST http://localhost:3004/api/v1/anomalies/detect

# 3. Check for anomalies
curl http://localhost:3004/api/v1/anomalies

# 4. Send heartbeat to prevent false positive
curl -X POST http://localhost:3004/api/v1/agents/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"xxx","agentId":"test"}'
```

---

## Deployment Plan

### Phase 1: Database Migration

```bash
npx prisma migrate dev --name add_anomaly_detection
```

### Phase 2: Service Deployment

1. Deploy new services (anomaly-detector, escalation-router)
2. Enable heartbeat endpoint
3. Verify detection works (manual trigger)

### Phase 3: Enable Escalation

1. Enable problem-solving agent (dry-run mode)
2. Enable human notifications (dashboard only)
3. Monitor for false positives

### Phase 4: Full Enablement

1. Enable all escalation channels
2. Add to HEARTBEAT.md workflow
3. Document runbooks

---

## Runbooks

### Runbook: Stale Session Recovery

1. Check agent logs: `openclaw logs <sessionId>`
2. If agent is actually running: extend timeout
3. If agent is stuck: kill session, re-dispatch
4. If agent crashed: check error logs, fix issue, re-dispatch

### Runbook: Duplicate Session Cleanup

1. Identify which session has progress (check heartbeats, logs)
2. Kill the newer session (less progress)
3. Verify remaining session continues
4. Document root cause

### Runbook: Cascading Failure Response

1. Stop auto-dispatch immediately
2. Review failure patterns
3. Check for infrastructure issues
4. Manual intervention required before retry

---

## Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Gate-specific thresholds configurable | ⬜ | Threshold config exists |
| Stale session detection works | ⬜ | Anomaly events created |
| Duplicate run detection works | ⬜ | Duplicate sessions flagged |
| Callback timeout detection works | ⬜ | Timeout events created |
| Heartbeat ping mechanism works | ⬜ | Heartbeat updates timestamp |
| Problem-solving agent can recover | ⬜ | Recovery attempts logged |
| Human escalation includes context | ⬜ | Alert has diagnostic context |
| Audit logging complete | ⬜ | All events in anomaly_events table |
| Edge cases handled | ⬜ | Tests pass for all scenarios |
| Dashboard integration | ⬜ | Anomalies visible in UI |

---

## Future Enhancements

1. **Predictive Detection** — ML model predicts failures before they happen
2. **Auto-Remediation** — Safe auto-recovery for known patterns
3. **Root Cause Analysis** — Automatic RCA for common failures
4. **Integration with PagerDuty** — On-call rotation integration
5. **Metrics Export** — Prometheus metrics for anomaly rates

---

**End of Specification**
