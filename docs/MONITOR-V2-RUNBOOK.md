# Monitor v2 Operator Runbook

**Purpose:** Quick reference for operators managing the Mission Control v2 monitoring system.

---

## Quick Start

### Start Monitor (Development)

```bash
cd ~/mission-control-v2
python3 scripts/monitor.py
```

Open dashboard: **http://localhost:7890**

### Start Monitor (Production)

```bash
sudo systemctl start mc2-monitor
sudo systemctl status mc2-monitor
```

### Stop Monitor

```bash
# Development
# Press Ctrl+C in terminal

# Production
sudo systemctl stop mc2-monitor
```

### Restart Monitor

```bash
sudo systemctl restart mc2-monitor
```

---

## Dashboard Panels

### MC2 Health Panel

**What to look for:**
- 🟢 Green = All systems operational
- 🟡 Yellow = Degraded (some components unhealthy)
- 🔴 Red = Unhealthy (critical failure)

**If Red:**
1. Check MC2 service: `ssh jpwolf00@192.168.85.205 "docker compose ps"`
2. Check MC2 logs: `ssh jpwolf00@192.168.85.205 "tail -100 /tmp/mc2.log"`
3. Restart if needed: `ssh jpwolf00@192.168.85.205 "cd ~/mission-control-v2 && docker compose restart"`

### Story Stats Panel

**What to look for:**
- Total story count (should grow over time)
- Distribution by status (most should be `done`)
- Distribution by gate (should be balanced)

**If unusual:**
- Many `in_progress` stories = potential stuck agents
- Many `blocked` stories = review bottleneck
- Zero stories in a gate = possible dispatch failure

### Hook Probe Panel

**What to look for:**
- Status: `200` = healthy
- OK: `true` = authentication successful

**If 401:**
```bash
# Check token matches
echo $OPENCLAW_HOOKS_TOKEN

# Compare with gateway config
ssh jpwolf00@192.168.85.206 "cat ~/.openclaw/config.json | jq .hooks.token"
```

**If 404:**
- Check hook path in config (should be `/hooks/agent`)
- Verify OpenClaw gateway has hooks enabled

**If connection error:**
```bash
# Test connectivity
curl -v http://192.168.85.206:18789/hooks/agent

# Check gateway status
ssh jpwolf00@192.168.85.206 "openclaw gateway status"
```

### Stale Stories Table

**What to look for:**
- Stories where Age > Threshold
- Red-highlighted rows (Age > 2x Threshold = critical)

**Common causes:**
| Gate | Typical Cause | Action |
|------|---------------|--------|
| architect | Agent stuck thinking | Check subagent status, restart |
| implementer | Complex code, tests failing | Check subagent logs |
| reviewer-a | Browser automation stuck | Kill subagent, re-dispatch |
| operator | Deploy script hanging | SSH to host, check deploy logs |
| reviewer-b | Prod URL unreachable | Verify deployment succeeded |

**Manual recovery:**
```bash
# List subagents
openclaw subagents list

# Kill stuck subagent
openclaw subagents kill --target <session-id>

# Re-dispatch story (via MC2 UI or API)
curl -X POST http://192.168.85.205:3004/api/v1/stories/<id>/dispatch \
  -H "Authorization: Bearer <token>"
```

### Operator Diagnostics Panel

**Purpose:** Copy-paste commands for troubleshooting

**Sections:**
1. Quick Health Checks — One-liners to verify systems
2. Common Issues & Fixes — Symptom → Cause → Fix table
3. Recovery Commands — SSH commands to restart services

---

## Configuration

### Config File Location

```
~/mission-control-v2/scripts/monitor.config.json
```

### Edit Config

```bash
cd ~/mission-control-v2
cp scripts/monitor.config.example.json scripts/monitor.config.json
nano scripts/monitor.config.json
```

### Key Settings

| Setting | Default | When to Change |
|---------|---------|----------------|
| `server.port` | 7890 | Port conflict |
| `poll.intervalSec` | 10 | Reduce API load (increase) |
| `mc2.baseUrl` | http://192.168.85.205:3004 | Different MC2 host |
| `hooks.baseUrl` | http://192.168.85.206:18789 | Different OpenClaw host |
| `staleThresholdsMinutes` | varies | Tune based on workflow data |

### Environment Variables

```bash
# Required for hook probe
export OPENCLAW_HOOKS_TOKEN="<your-token>"

# Optional: override config path
export MONITOR_CONFIG="/path/to/config.json"
```

---

## Troubleshooting

### Monitor Won't Start

**Symptom:** `python3 scripts/monitor.py` exits immediately

**Check:**
```bash
# Config syntax
python3 -c "import json; json.load(open('scripts/monitor.config.json'))"

# Port in use
lsof -i :7890

# Python version
python3 --version  # Should be 3.8+
```

### Dashboard Shows No Data

**Symptom:** All panels empty or showing errors

**Check:**
```bash
# MC2 reachable?
curl -s http://192.168.85.205:3004/api/v1/health

# OpenClaw reachable?
curl -s http://192.168.85.206:18789/hooks/agent

# Monitor logs (if running as service)
sudo journalctl -u mc2-monitor -n 50
```

### High CPU Usage

**Cause:** Poll interval too low

**Fix:**
```json
{
  "poll": {
    "intervalSec": 30
  }
}
```

### Stale Alerts But Stories Look Fine

**Cause:** Thresholds too aggressive

**Fix:**
```json
{
  "staleThresholdsMinutes": {
    "architect": 30,
    "implementer": 60,
    "reviewer-a": 30,
    "operator": 30,
    "reviewer-b": 30
  }
}
```

---

## Monitoring the Monitor

### Health Check Script

```bash
#!/bin/bash
# scripts/check-monitor.sh

RESPONSE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:7890)
if [ "$RESPONSE" -ne 200 ]; then
  echo "CRITICAL: Monitor returned HTTP $RESPONSE"
  exit 2
fi

MC2_OK=$(curl -s http://localhost:7890/json | jq -r '.mc2_ok')
if [ "$MC2_OK" != "true" ]; then
  echo "WARNING: MC2 unhealthy"
  exit 1
fi

echo "OK: Monitor healthy"
exit 0
```

### Cron Job (Optional)

```bash
# Add to crontab
*/5 * * * * /path/to/check-monitor.sh && echo "Monitor OK" || mail -s "Monitor Alert" admin@example.com
```

### Prometheus Metrics (Future)

When implemented:
```bash
# Scrape metrics
curl http://localhost:7890/metrics

# Alert on stale stories
mc2_stale_stories > 5  # Warning
mc2_stale_stories > 10 # Critical
```

---

## Security

### File Permissions

```bash
# Config file (may contain URLs, but not secrets)
chmod 644 scripts/monitor.config.json

# Token in environment (not in file)
echo "OPENCLAW_HOOKS_TOKEN=<token>" | sudo tee /etc/mc2-monitor.env
chmod 600 /etc/mc2-monitor.env
```

### Network Access

**Required:**
- Monitor → MC2 (port 3004)
- Monitor → OpenClaw (port 18789)
- Browser → Monitor (port 7890)

**Firewall rules (if applicable):**
```bash
# Allow inbound to monitor
sudo ufw allow 7890/tcp

# Allow outbound to MC2 and OpenClaw
sudo ufw allow out to 192.168.85.205 port 3004
sudo ufw allow out to 192.168.85.206 port 18789
```

### Token Rotation

1. Generate new token in OpenClaw gateway config
2. Update MC2 `.env`: `OPENCLAW_GATEWAY_TOKEN=<new-token>`
3. Update monitor env: `OPENCLAW_HOOKS_TOKEN=<new-token>`
4. Restart all three services

---

## Upgrades

### Update Monitor Script

```bash
cd ~/mission-control-v2
git pull origin main

# Review changes
git diff HEAD~1 scripts/monitor.py

# Restart
sudo systemctl restart mc2-monitor

# Verify
curl http://localhost:7890/json | jq .updated_at
```

### Config Migration

When config schema changes:
```bash
# Backup old config
cp scripts/monitor.config.json scripts/monitor.config.json.bak

# Copy example and merge
cp scripts/monitor.config.example.json scripts/monitor.config.json.new
# Manually merge custom settings

# Test
python3 scripts/monitor.py --config scripts/monitor.config.json.new
```

---

## Contact & Escalation

| Issue | Contact | Escalation |
|-------|---------|------------|
| Monitor bug | Open GitHub issue | Tag @jason |
| MC2 down | Check MC2 status | Restart MC2 service |
| OpenClaw down | Check gateway status | Restart gateway |
| Network issue | Check firewall rules | Contact network admin |

---

## Appendix: Systemd Service File

```ini
# /etc/systemd/system/mc2-monitor.service

[Unit]
Description=Mission Control v2 Monitor
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=jpwolf00
WorkingDirectory=/home/jpwolf00/mission-control-v2
EnvironmentFile=/etc/mc2-monitor.env
ExecStart=/usr/bin/python3 /home/jpwolf00/mission-control-v2/scripts/monitor.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

**Last Updated:** 2026-03-07  
**Version:** 1.0
