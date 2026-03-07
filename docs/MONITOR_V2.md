# Monitor v2 (Mission Control + OpenClaw)

Phase 1 monitor for the new architecture.

## Location

- Script: `scripts/monitor.py`
- Example config: `scripts/monitor.config.example.json`

## What it monitors

1. MC2 health (`/api/v1/health`)
2. MC2 stories (`/api/v1/stories`) with counts by status/gate
3. Stale stories by gate-specific timeout thresholds
4. OpenClaw hooks probe (`POST /hooks/agent`)

## Run

```bash
cd mission-control-v2
python3 scripts/monitor.py
```

Open dashboard:
- `http://localhost:7890`
- JSON API: `http://localhost:7890/json`

## Config

If `scripts/monitor.config.json` exists, it is loaded automatically.

Start from:

```bash
cp scripts/monitor.config.example.json scripts/monitor.config.json
```

Set hook token via environment variable (recommended):

```bash
export OPENCLAW_HOOKS_TOKEN="<hooks token>"
# fallback: OPENCLAW_GATEWAY_TOKEN
```

## Notes

- The hook probe uses `deliver:false` and a lightweight message.
- A `200` with `{ok:true,...}` means hook ingress is healthy/authenticated.
- `401` means token mismatch.
- `404` means hooks not enabled/path mismatch.
