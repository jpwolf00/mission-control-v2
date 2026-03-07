# Monitor v2: Architecture-Aware Dashboard Enhancements

**Story ID:** `dafd763f-3b29-4937-86c5-d96fe9e9b873`  
**Gate:** Architect  
**Version:** 1.0  
**Status:** Draft (ready for implementation)

---

## Executive Summary

This spec defines enhancements to the Mission Control v2 monitoring system to provide architecture-aware visibility into the 5-gate workflow pipeline. The monitor serves as the canonical health dashboard for operators, architects, and reviewers to detect stalls, diagnose bottlenecks, and maintain workflow continuity.

### Key Enhancements

1. **Health Panels** — Modular dashboard sections for MC2, OpenClaw, and system health
2. **Stale Gate Detection** — Gate-specific timeout thresholds with actionable alerts
3. **Hook Probe** — Active health checks on OpenClaw webhook ingress
4. **Operator Diagnostics** — Troubleshooting tools and recovery commands
5. **Documentation** — Complete setup, configuration, and runbook guides

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitor v2 Dashboard                         │
│                     (http://:7890)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  MC2 Health  │  │ Story Stats  │  │   Hook Probe         │  │
│  │   Panel      │  │    Panel     │  │     Panel            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Stale Stories│  │    Error     │  │  Operator Diagnostics│  │
│  │    Table     │  │    Log       │  │      Panel           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   MC2 API       │  │  OpenClaw       │  │  System         │
│ :3004           │  │  Gateway :18789 │  │  Resources      │
│ - /health       │  │  - /hooks/agent │  │  - CPU/RAM      │
│ - /stories      │  │  - token auth   │  │  - disk         │
│ - /orchestration│  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 1.2 Data Flow

1. **Collector Loop** (background thread, configurable interval)
   - Fetches MC2 health endpoint
   - Fetches story inventory
   - Probes OpenClaw hook endpoint
   - Computes stale stories by gate thresholds
   - Updates shared state (thread-safe)

2. **HTTP Server** (main thread)
   - Serves HTML dashboard at `/`
   - Serves JSON API at `/json`
   - Serves diagnostics at `/diagnostics` (new)

3. **State Management**
   - In-memory state with atomic updates (lock-protected)
   - No persistence required (stateless, real-time only)

---

## 2. Component Specifications

### 2.1 Health Panels

#### MC2 Health Panel

**Purpose:** Display real-time health status of Mission Control v2 API

**Data Source:** `GET /api/v1/health`

**Display Fields:**
- Overall status: `healthy` | `degraded` | `unhealthy`
- Component health:
  - `app`: status, version
  - `database`: status, latencyMs
  - `orchestrator`: status
- Last check timestamp

**Visual Indicators:**
- 🟢 Green chip: all components healthy
- 🟡 Yellow chip: one or more components degraded
- 🔴 Red chip: any component unhealthy or unreachable

#### Story Stats Panel

**Purpose:** High-level overview of workflow pipeline state

**Data Source:** `GET /api/v1/stories`

**Metrics:**
- Total stories (all time)
- By status: `draft`, `approved`, `active`, `in_progress`, `done`, `blocked`
- By gate: `architect`, `implementer`, `reviewer-a`, `operator`, `reviewer-b`

**Visual Format:**
- Total count (large)
- Status breakdown (inline code block or mini bar chart)
- Gate breakdown (inline code block or mini bar chart)

#### Hook Probe Panel

**Purpose:** Verify OpenClaw webhook ingress is operational

**Data Source:** `POST /hooks/agent` (probe request with `deliver: false`)

**Display Fields:**
- Enabled: `true` | `false`
- OK: `true` | `false` | `null` (disabled)
- Status: HTTP status code or error type
- Token env: which env var is used
- Response: parsed JSON response (truncated)

**Probe Request:**
```json
{
  "message": "monitor health probe",
  "name": "MC2-monitor-probe",
  "agentId": "architect",
  "deliver": false
}
```

**Expected Responses:**
| Status | Meaning | Action |
|--------|---------|--------|
| 200 + `{ok:true}` | Hook healthy | None |
| 401 | Token mismatch | Check `OPENCLAW_HOOKS_TOKEN` |
| 404 | Path not found | Check hook path config |
| 500+ | Server error | Check OpenClaw gateway logs |
| Connection error | Unreachable | Check network/firewall |

### 2.2 Stale Story Detection

#### Gate-Specific Thresholds

Default thresholds (configurable in `monitor.config.json`):

| Gate | Threshold (minutes) | Rationale |
|------|---------------------|-----------|
| `architect` | 20 | Design work should be bounded |
| `implementer` | 45 | Coding may take longer |
| `reviewer-a` | 20 | QA review should be quick |
| `operator` | 20 | Deploy should be fast |
| `reviewer-b` | 20 | Prod validation should be quick |
| `default` | 30 | Fallback for unknown gates |

#### Stale Detection Logic

A story is considered stale when:
1. Status is `approved`, `active`, or `in_progress` (i.e., not terminal)
2. Age (minutes since `updatedAt` or `createdAt`) exceeds gate threshold
3. Story has a valid gate assignment

**Age Calculation:**
```python
age_minutes = (utc_now() - story.updated_at).total_seconds() / 60.0
```

**Stale Story Fields:**
- `id`: Story UUID
- `title`: From `metadata.title`
- `status`: Current status
- `gate`: Current gate
- `ageMinutes`: Rounded to 1 decimal
- `thresholdMinutes`: Gate-specific threshold

#### Display

Stale stories table (sorted by age descending, max 50 shown):
- Columns: ID, Title, Status, Gate, Age (min), Threshold
- Visual highlight: Red row background if age > 2x threshold

### 2.3 Operator Diagnostics Panel (NEW)

**Purpose:** Provide actionable troubleshooting tools for operators

#### Diagnostics Endpoints

**New endpoint:** `GET /diagnostics` (HTML) and `GET /diagnostics/json`

**Content:**

1. **Quick Health Checks**
   ```bash
   # MC2 API health
   curl -s http://192.168.85.205:3004/api/v1/health | jq .
   
   # OpenClaw hook probe
   curl -X POST http://192.168.85.206:18789/hooks/agent \
     -H 'x-openclaw-token: $OPENCLAW_HOOKS_TOKEN' \
     -H 'Content-Type: application/json' \
     -d '{"message":"diag","name":"diag","agentId":"architect","deliver":false}'
   
   # Story count
   curl -s http://192.168.85.205:3004/api/v1/stories | jq 'length'
   ```

2. **Common Issues & Fixes**

   | Symptom | Likely Cause | Fix |
   |---------|--------------|-----|
   | Hook probe returns 401 | Token mismatch | Verify `OPENCLAW_HOOKS_TOKEN` matches gateway config |
   | Hook probe returns 404 | Wrong path | Check `hooks.path` config (should be `/hooks/agent`) |
   | MC2 health fails | Service down | `ssh jpwolf00@192.168.85.205 "docker compose ps"` |
   | Stories endpoint slow | DB query slow | Check DB connections, add index on `updatedAt` |
   | Stale stories accumulating | Agent stuck | Check subagent status, restart if needed |

3. **Recovery Commands**

   ```bash
   # Restart MC2
   ssh jpwolf00@192.168.85.205 "cd ~/mission-control-v2 && docker compose restart"
   
   # Restart OpenClaw gateway
   ssh jpwolf00@192.168.85.206 "openclaw gateway restart"
   
   # Check stuck subagents
   openclaw subagents list
   
   # Kill stuck subagent
   openclaw subagents kill --target <session-id>
   
   # View MC2 logs
   ssh jpwolf00@192.168.85.205 "tail -f /tmp/mc2.log"
   
   # View OpenClaw logs
   ssh jpwolf00@192.168.85.206 "tail -f ~/.openclaw/logs/gateway.log"
   ```

4. **Lane Status (Future)**
   
   When MC2 exposes `/api/v1/orchestration/lanes`:
   - Show lane occupancy (which story is in which lane)
   - Detect ghost locks (sessionId null but status in_progress)
   - Provide reset commands

### 2.4 Error Log Panel

**Purpose:** Display recent collection errors

**Error Types:**
- `mc2-health`: Failed to fetch health endpoint
- `mc2-stories`: Failed to fetch stories
- `hook-probe`: Hook probe failed
- `config`: Configuration errors

**Display:** JSON array of error strings (most recent first, max 20)

---

## 3. Configuration

### 3.1 Config File Location

```
mission-control-v2/scripts/monitor.config.json
```

If not present, falls back to built-in defaults.

### 3.2 Config Schema

```json
{
  "server": {
    "bind": "0.0.0.0",
    "port": 7890
  },
  "poll": {
    "intervalSec": 10,
    "timeoutSec": 8
  },
  "mc2": {
    "baseUrl": "http://192.168.85.205:3004",
    "healthPath": "/api/v1/health",
    "storiesPath": "/api/v1/stories"
  },
  "hooks": {
    "enabled": true,
    "baseUrl": "http://192.168.85.206:18789",
    "path": "/hooks/agent",
    "tokenEnv": "OPENCLAW_HOOKS_TOKEN",
    "probeAgentId": "architect",
    "probeName": "MC2-monitor-probe"
  },
  "staleThresholdsMinutes": {
    "architect": 20,
    "implementer": 45,
    "reviewer-a": 20,
    "operator": 20,
    "reviewer-b": 20,
    "default": 30
  },
  "diagnostics": {
    "enabled": true,
    "commands": [
      {
        "label": "Restart MC2",
        "command": "ssh jpwolf00@192.168.85.205 \"cd ~/mission-control-v2 && docker compose restart\""
      }
    ]
  }
}
```

### 3.3 Environment Variables

| Variable | Purpose | Fallback |
|----------|---------|----------|
| `OPENCLAW_HOOKS_TOKEN` | Hook authentication | `OPENCLAW_GATEWAY_TOKEN` |
| `MONITOR_CONFIG` | Override config path | `scripts/monitor.config.json` |

---

## 4. Implementation Plan

### Phase 1: Core Enhancements (This Story)

**Tasks:**
1. ✅ Verify existing monitor.py covers baseline requirements
2. Add operator diagnostics panel (HTML + JSON)
3. Enhance stale story detection with visual highlights
4. Add comprehensive documentation (this spec + runbook)
5. Create systemd service file for auto-start

**Files to Create/Modify:**
- `scripts/monitor.py` — Add diagnostics endpoint, enhance HTML
- `docs/MONITOR-V2-SPEC.md` — This document
- `docs/MONITOR-V2-RUNBOOK.md` — Operator runbook (see below)
- `scripts/monitor.service` — systemd unit file
- `scripts/monitor.config.example.json` — Update with diagnostics section

### Phase 2: Advanced Features (Future Stories)

**Potential Enhancements:**
- Lane status integration (when MC2 exposes orchestration API)
- Historical trending (store metrics in SQLite)
- Alerting (email/Slack on threshold breaches)
- Multi-instance support (monitor multiple MC2 deployments)
- WebSocket live updates (replace polling)

---

## 5. Testing

### 5.1 Manual Testing

```bash
# 1. Start monitor
cd mission-control-v2
python3 scripts/monitor.py

# 2. Open dashboard
open http://localhost:7890

# 3. Verify panels render
# - MC2 Health: should show green chip
# - Story Stats: should show counts
# - Hook Probe: should show status
# - Stale Stories: should list any stale
# - Diagnostics: should show commands

# 4. Test JSON API
curl -s http://localhost:7890/json | jq .

# 5. Test diagnostics
curl -s http://localhost:7890/diagnostics/json | jq .
```

### 5.2 Automated Testing (Future)

```bash
# Health check script
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:7890)
if [ "$RESPONSE" -ne 200 ]; then
  echo "Monitor unhealthy: HTTP $RESPONSE"
  exit 1
fi

# Verify MC2 health
MC2_OK=$(curl -s http://localhost:7890/json | jq -r '.mc2_ok')
if [ "$MC2_OK" != "true" ]; then
  echo "MC2 unhealthy"
  exit 1
fi

echo "Monitor healthy"
exit 0
```

---

## 6. Deployment

### 6.1 Development

```bash
cd mission-control-v2
python3 scripts/monitor.py --port 7890
```

### 6.2 Production (systemd)

1. **Copy service file:**
   ```bash
   sudo cp scripts/monitor.service /etc/systemd/system/mc2-monitor.service
   ```

2. **Create config:**
   ```bash
   cp scripts/monitor.config.example.json scripts/monitor.config.json
   # Edit as needed
   ```

3. **Set environment:**
   ```bash
   echo "OPENCLAW_HOOKS_TOKEN=<token>" | sudo tee /etc/mc2-monitor.env
   ```

4. **Enable and start:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mc2-monitor
   sudo systemctl start mc2-monitor
   ```

5. **Verify:**
   ```bash
   sudo systemctl status mc2-monitor
   curl http://localhost:7890
   ```

### 6.3 Docker (Alternative)

Add to `docker-compose.yml`:

```yaml
services:
  monitor:
    build:
      context: .
      dockerfile: Dockerfile.monitor
    ports:
      - "7890:7890"
    environment:
      - OPENCLAW_HOOKS_TOKEN=${OPENCLAW_HOOKS_TOKEN}
    volumes:
      - ./scripts/monitor.config.json:/app/monitor.config.json
    restart: unless-stopped
```

---

## 7. Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Monitor script versioned in mission-control-v2 | ✅ | `scripts/monitor.py` exists |
| MC2 health/stories integrated | ✅ | Health panel + Story stats panel |
| OpenClaw hook probe integrated | ✅ | Hook probe panel with active checks |
| Stale story detection by gate thresholds | ✅ | Configurable thresholds per gate |
| Documentation for setup/run/config | ✅ | This spec + runbook |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Monitor itself becomes stale | High | Add watchdog cron to restart if unresponsive |
| False positive stale alerts | Medium | Tune thresholds based on actual workflow data |
| Hook probe triggers rate limits | Low | Use `deliver:false`, low frequency (10s interval) |
| Config file exposes tokens | Medium | Use env vars for secrets, restrict file permissions |

---

## 9. Future Considerations

### 9.1 Metrics Export

Consider adding Prometheus metrics endpoint:

```
GET /metrics

# HELP mc2_health_status MC2 health status (1=healthy, 0=unhealthy)
# TYPE mc2_health_status gauge
mc2_health_status 1

# HELP mc2_stories_total Total number of stories
# TYPE mc2_stories_total gauge
mc2_stories_total 42

# HELP mc2_stale_stories Number of stale stories
# TYPE mc2_stale_stories gauge
mc2_stale_stories 3
```

### 9.2 Historical Trending

Store hourly snapshots in SQLite:
- Story counts by status/gate
- Stale story count
- Hook probe success rate

Enable trend analysis: "Are implementer stories getting slower?"

### 9.3 Alerting Integration

When thresholds breached:
- Email notification
- Slack webhook
- Mission Control story creation (meta-monitoring)

---

## Appendix A: File Locations

```
mission-control-v2/
├── scripts/
│   ├── monitor.py                          # Main monitor script
│   ├── monitor.config.example.json         # Example config
│   ├── monitor.config.json                 # Active config (gitignored)
│   └── monitor.service                     # systemd unit
├── docs/
│   ├── MONITOR-V2-SPEC.md                  # This spec
│   └── MONITOR-V2-RUNBOOK.md               # Operator runbook
└── systemd/
    └── mc2-monitor.service                 # Install target
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Gate | A stage in the 5-stage workflow pipeline |
| Stale Story | A story that has exceeded its gate's time threshold |
| Hook Probe | Active health check on OpenClaw webhook ingress |
| Lane | Internal MC2 concept for gate-specific story queues |
| Ghost Lock | A story marked in_progress but with no active session |

---

**End of Spec**
