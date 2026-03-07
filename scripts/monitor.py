#!/usr/bin/env python3
"""
Mission Control / OpenClaw Monitor (Phase 1)

Purpose
-------
A lightweight architecture-aware monitor for Mission Control v2 + OpenClaw hooks.

What it checks
--------------
1) MC2 health endpoint
2) Story inventory (status/gate counts)
3) Stale stories by gate timeout
4) OpenClaw hook probe (/hooks/agent)

Run
---
python3 scripts/monitor.py
python3 scripts/monitor.py --port 7890 --bind 0.0.0.0
python3 scripts/monitor.py --config scripts/monitor.config.json
"""

from __future__ import annotations

import argparse
import json
import os
import threading
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from typing import Any, Dict, List, Optional
from urllib import error, request


DEFAULT_CONFIG: Dict[str, Any] = {
    "server": {
        "bind": "0.0.0.0",
        "port": 7890,
    },
    "poll": {
        "intervalSec": 10,
        "timeoutSec": 8,
    },
    "mc2": {
        "baseUrl": "http://192.168.85.205:3004",
        "healthPath": "/api/v1/health",
        "storiesPath": "/api/v1/stories",
    },
    "hooks": {
        "baseUrl": "http://192.168.85.206:18789",
        "path": "/hooks/agent",
        "tokenEnv": "OPENCLAW_HOOKS_TOKEN",  # fallback to OPENCLAW_GATEWAY_TOKEN
        "probeAgentId": "architect",
        "probeName": "MC2-monitor-probe",
        "enabled": True,
    },
    "staleThresholdsMinutes": {
        "architect": 20,
        "implementer": 45,
        "reviewer-a": 20,
        "operator": 20,
        "reviewer-b": 20,
        "default": 30,
    },
}


@dataclass
class MonitorState:
    updated_at: float = 0.0
    mc2_ok: bool = False
    mc2_health: Dict[str, Any] = field(default_factory=dict)
    stories_total: int = 0
    by_status: Dict[str, int] = field(default_factory=dict)
    by_gate: Dict[str, int] = field(default_factory=dict)
    stale: List[Dict[str, Any]] = field(default_factory=list)
    hook_probe: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)


STATE = MonitorState()
LOCK = threading.Lock()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return None


def http_json(url: str, timeout: int = 8, method: str = "GET", headers: Optional[Dict[str, str]] = None, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    data = None
    req_headers = headers or {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers = {**req_headers, "Content-Type": "application/json"}
    req = request.Request(url=url, method=method, headers=req_headers, data=data)
    with request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
        if not raw:
            return {}
        return json.loads(raw)


def flatten_stories(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        stories = payload.get("stories")
        if isinstance(stories, list):
            return stories
    return []


def gate_of(story: Dict[str, Any]) -> str:
    return (story.get("currentGate") or "none").strip() or "none"


def status_of(story: Dict[str, Any]) -> str:
    return (story.get("status") or "unknown").strip() or "unknown"


def minutes_since(ts: Optional[datetime]) -> Optional[float]:
    if not ts:
        return None
    return (utc_now() - ts).total_seconds() / 60.0


def stale_threshold_minutes(cfg: Dict[str, Any], gate: str) -> int:
    thresholds = cfg.get("staleThresholdsMinutes", {})
    return int(thresholds.get(gate, thresholds.get("default", 30)))


def probe_hook(cfg: Dict[str, Any]) -> Dict[str, Any]:
    hooks_cfg = cfg.get("hooks", {})
    if not hooks_cfg.get("enabled", True):
        return {"enabled": False, "ok": None, "status": "disabled"}

    token_env = hooks_cfg.get("tokenEnv", "OPENCLAW_HOOKS_TOKEN")
    token = os.environ.get(token_env) or os.environ.get("OPENCLAW_GATEWAY_TOKEN")
    if not token:
        return {"enabled": True, "ok": False, "status": "missing-token-env", "tokenEnv": token_env}

    base = hooks_cfg.get("baseUrl", "").rstrip("/")
    path = hooks_cfg.get("path", "/hooks/agent")
    url = f"{base}{path}"

    body = {
        "message": "monitor health probe",
        "name": hooks_cfg.get("probeName", "MC2-monitor-probe"),
        "agentId": hooks_cfg.get("probeAgentId", "architect"),
        "deliver": False,
    }

    try:
        # Do raw request so we can capture non-200 status cleanly
        req = request.Request(
            url=url,
            method="POST",
            headers={
                "x-openclaw-token": token,
                "Content-Type": "application/json",
            },
            data=json.dumps(body).encode("utf-8"),
        )
        with request.urlopen(req, timeout=int(cfg["poll"]["timeoutSec"])) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw) if raw else {}
            return {"enabled": True, "ok": True, "status": resp.status, "response": parsed}
    except error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8")
        except Exception:
            pass
        return {"enabled": True, "ok": False, "status": e.code, "error": detail[:240]}
    except Exception as e:
        return {"enabled": True, "ok": False, "status": "error", "error": str(e)}


def collect_once(cfg: Dict[str, Any]) -> MonitorState:
    state = MonitorState(updated_at=time.time())

    base = cfg["mc2"]["baseUrl"].rstrip("/")
    health_url = f"{base}{cfg['mc2']['healthPath']}"
    stories_url = f"{base}{cfg['mc2']['storiesPath']}"

    try:
        health = http_json(health_url, timeout=int(cfg["poll"]["timeoutSec"]))
        state.mc2_health = health
        state.mc2_ok = str(health.get("status", "")).lower() == "healthy"
    except Exception as e:
        state.errors.append(f"mc2-health: {e}")

    stories: List[Dict[str, Any]] = []
    try:
        payload = http_json(stories_url, timeout=int(cfg["poll"]["timeoutSec"]))
        stories = flatten_stories(payload)
        state.stories_total = len(stories)
    except Exception as e:
        state.errors.append(f"mc2-stories: {e}")

    by_status = Counter()
    by_gate = Counter()
    stale: List[Dict[str, Any]] = []

    for s in stories:
        st = status_of(s)
        gt = gate_of(s)
        by_status[st] += 1
        by_gate[gt] += 1

        if st in {"approved", "active", "in_progress"}:
            # prefer updatedAt; fallback createdAt
            updated = parse_iso(s.get("updatedAt")) or parse_iso(s.get("createdAt"))
            age_min = minutes_since(updated)
            if age_min is None:
                continue
            threshold = stale_threshold_minutes(cfg, gt)
            if age_min > threshold:
                stale.append(
                    {
                        "id": s.get("id"),
                        "title": (s.get("metadata") or {}).get("title", "(untitled)"),
                        "status": st,
                        "gate": gt,
                        "ageMinutes": round(age_min, 1),
                        "thresholdMinutes": threshold,
                    }
                )

    state.by_status = dict(by_status)
    state.by_gate = dict(by_gate)
    state.stale = sorted(stale, key=lambda x: x["ageMinutes"], reverse=True)

    state.hook_probe = probe_hook(cfg)
    return state


def collector_loop(cfg: Dict[str, Any]) -> None:
    while True:
        next_state = collect_once(cfg)
        with LOCK:
            global STATE
            STATE = next_state
        time.sleep(int(cfg["poll"]["intervalSec"]))


def diagnostics_json(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Generate diagnostics data for JSON endpoint."""
    mc2_base = cfg["mc2"]["baseUrl"].rstrip("/")
    hook_base = cfg["hooks"]["baseUrl"].rstrip("/")
    hook_path = cfg["hooks"]["path"]
    token_env = cfg["hooks"]["tokenEnv"]
    
    return {
        "quickChecks": {
            "mc2Health": f"curl -s {mc2_base}{cfg['mc2']['healthPath']} | jq .",
            "mc2Stories": f"curl -s {mc2_base}{cfg['mc2']['storiesPath']} | jq 'length'",
            "hookProbe": f"curl -X POST {hook_base}{hook_path} -H 'x-openclaw-token: ${token_env}' -H 'Content-Type: application/json' -d '{{\"message\":\"diag\",\"name\":\"diag\",\"agentId\":\"architect\",\"deliver\":false}}'",
        },
        "commonIssues": [
            {
                "symptom": "Hook probe returns 401",
                "cause": "Token mismatch",
                "fix": f"Verify {token_env} matches gateway config"
            },
            {
                "symptom": "Hook probe returns 404",
                "cause": "Wrong path or hooks disabled",
                "fix": "Check hooks.path config (should be /hooks/agent) and hooks.enabled"
            },
            {
                "symptom": "MC2 health fails",
                "cause": "Service down or unreachable",
                "fix": "ssh jpwolf00@192.168.85.205 \"docker compose ps\""
            },
            {
                "symptom": "Stale stories accumulating",
                "cause": "Agent stuck or slow",
                "fix": "openclaw subagents list; openclaw subagents kill --target <session-id>"
            }
        ],
        "recoveryCommands": [
            {
                "label": "Restart MC2",
                "command": "ssh jpwolf00@192.168.85.205 \"cd ~/mission-control-v2 && docker compose restart\""
            },
            {
                "label": "Restart OpenClaw Gateway",
                "command": "ssh jpwolf00@192.168.85.206 \"openclaw gateway restart\""
            },
            {
                "label": "Check Stuck Subagents",
                "command": "openclaw subagents list"
            },
            {
                "label": "View MC2 Logs",
                "command": "ssh jpwolf00@192.168.85.205 \"tail -f /tmp/mc2.log\""
            },
            {
                "label": "View OpenClaw Logs",
                "command": "ssh jpwolf00@192.168.85.206 \"tail -f ~/.openclaw/logs/gateway.log\""
            }
        ]
    }


def diagnostics_page(state: MonitorState, cfg: Dict[str, Any]) -> str:
    """Generate HTML diagnostics page."""
    diag = diagnostics_json(cfg)
    
    quick_checks = "".join(
        f"<div class='cmd'><code>{k}</code><pre>{v}</pre></div>"
        for k, v in diag["quickChecks"].items()
    )
    
    issues_rows = "".join(
        f"<tr><td>{i['symptom']}</td><td>{i['cause']}</td><td>{i['fix']}</td></tr>"
        for i in diag["commonIssues"]
    )
    
    recovery_cmds = "".join(
        f"<div class='cmd'><code>{c['label']}</code><pre>{c['command']}</pre></div>"
        for c in diag["recoveryCommands"]
    )
    
    return f"""
<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>MC2 Monitor - Diagnostics</title>
  <style>
    body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 18px; background:#0f1115; color:#e8eaed; }}
    h2 {{ color:#9cc4ff; }}
    h3 {{ color:#74d99f; margin-top:24px; }}
    .card {{ background:#171a21; border:1px solid #2a2f3a; border-radius:10px; padding:12px; margin-bottom:12px; }}
    .cmd {{ background:#1a1d26; border-radius:6px; padding:8px; margin:8px 0; }}
    .cmd code {{ display:block; color:#ffd48a; font-size:12px; margin-bottom:4px; }}
    .cmd pre {{ background:#0f1115; padding:8px; border-radius:4px; overflow-x:auto; color:#74d99f; font-size:12px; margin:0; }}
    table {{ width:100%; border-collapse:collapse; font-size:13px; }}
    th,td {{ border-bottom:1px solid #2a2f3a; text-align:left; padding:8px; }}
    th {{ color:#9cc4ff; }}
    a {{ color:#9cc4ff; }}
    .back {{ display:inline-block; margin-bottom:12px; color:#74d99f; }}
  </style>
</head>
<body>
  <a href='/' class='back'>&larr; Back to Dashboard</a>
  <h2>Operator Diagnostics</h2>
  
  <div class='card'>
    <h3>Quick Health Checks</h3>
    {quick_checks}
  </div>
  
  <div class='card'>
    <h3>Common Issues &amp; Fixes</h3>
    <table>
      <thead><tr><th>Symptom</th><th>Likely Cause</th><th>Fix</th></tr></thead>
      <tbody>{issues_rows}</tbody>
    </table>
  </div>
  
  <div class='card'>
    <h3>Recovery Commands</h3>
    {recovery_cmds}
  </div>
  
  <div class='card'>
    <h3>Current State</h3>
    <p>MC2 OK: <b>{'✅ Yes' if state.mc2_ok else '❌ No'}</b></p>
    <p>Stories: <b>{state.stories_total}</b></p>
    <p>Stale: <b>{len(state.stale)}</b></p>
    <p>Hook Status: <b>{state.hook_probe.get('status', 'unknown')}</b></p>
    <p>Errors: <b>{len(state.errors)}</b></p>
  </div>
</body>
</html>
"""


def html_page(state: MonitorState, cfg: Dict[str, Any]) -> str:
    updated = datetime.fromtimestamp(state.updated_at).strftime("%Y-%m-%d %H:%M:%S") if state.updated_at else "-"

    stale_rows = "".join(
        f"<tr{' class=critical' if x['ageMinutes'] > 2 * x['thresholdMinutes'] else ''}><td>{x['id']}</td><td>{x['title']}</td><td>{x['status']}</td><td>{x['gate']}</td><td>{x['ageMinutes']}</td><td>{x['thresholdMinutes']}</td></tr>"
        for x in state.stale[:50]
    ) or "<tr><td colspan='6'>No stale stories</td></tr>"

    status_chip = "ok" if state.mc2_ok else "bad"
    hook_ok = state.hook_probe.get("ok")
    hook_chip = "ok" if hook_ok is True else ("warn" if hook_ok is None else "bad")

    return f"""
<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>MC2/OpenClaw Monitor</title>
  <style>
    body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 18px; background:#0f1115; color:#e8eaed; }}
    .grid {{ display:grid; grid-template-columns: repeat(3,minmax(240px,1fr)); gap:12px; }}
    .card {{ background:#171a21; border:1px solid #2a2f3a; border-radius:10px; padding:12px; }}
    .chip {{ display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; }}
    .ok {{ background:#153b24; color:#74d99f; }} .bad {{ background:#4a1b1b; color:#ff9f9f; }} .warn {{ background:#4b3a15; color:#ffd48a; }}
    table {{ width:100%; border-collapse:collapse; font-size:13px; }}
    th,td {{ border-bottom:1px solid #2a2f3a; text-align:left; padding:6px; }}
    code {{ color:#9cc4ff; }}
    tr.critical {{ background:#4a1b1b; }}
    .diag-link {{ float:right; color:#74d99f; text-decoration:none; }}
    .diag-link:hover {{ text-decoration:underline; }}
  </style>
</head>
<body>
  <h2>Mission Control / OpenClaw Monitor <a href='/diagnostics' class='diag-link'>Operator Diagnostics →</a></h2>
  <p>Updated: {updated}</p>

  <div class='grid'>
    <div class='card'>
      <h3>MC2 Health <span class='chip {status_chip}'>{'healthy' if state.mc2_ok else 'degraded'}</span></h3>
      <pre>{json.dumps(state.mc2_health, indent=2)[:800]}</pre>
    </div>
    <div class='card'>
      <h3>Stories</h3>
      <p>Total: <b>{state.stories_total}</b></p>
      <p>By status: <code>{json.dumps(state.by_status)}</code></p>
      <p>By gate: <code>{json.dumps(state.by_gate)}</code></p>
    </div>
    <div class='card'>
      <h3>Hook Probe <span class='chip {hook_chip}'>{state.hook_probe.get('status','-')}</span></h3>
      <pre>{json.dumps(state.hook_probe, indent=2)[:800]}</pre>
    </div>
  </div>

  <div class='card' style='margin-top:12px;'>
    <h3>Stale Stories</h3>
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Gate</th><th>Age (min)</th><th>Threshold</th></tr></thead>
      <tbody>{stale_rows}</tbody>
    </table>
  </div>

  <div class='card' style='margin-top:12px;'>
    <h3>Errors</h3>
    <pre>{json.dumps(state.errors, indent=2)}</pre>
  </div>
</body>
</html>
"""


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class Handler(BaseHTTPRequestHandler):
    cfg: Dict[str, Any] = {}

    def _write(self, code: int, body: str, ctype: str = "text/plain; charset=utf-8") -> None:
        data = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # noqa: N802
        with LOCK:
            state = STATE
        if self.path == "/json":
            self._write(200, json.dumps(state.__dict__, indent=2), "application/json; charset=utf-8")
            return
        if self.path == "/diagnostics/json":
            self._write(200, json.dumps(diagnostics_json(self.cfg), indent=2), "application/json; charset=utf-8")
            return
        if self.path == "/diagnostics":
            self._write(200, diagnostics_page(state, self.cfg), "text/html; charset=utf-8")
            return
        self._write(200, html_page(state, self.cfg), "text/html; charset=utf-8")

    def log_message(self, format: str, *args):  # silence
        return


def load_config(path: Optional[str]) -> Dict[str, Any]:
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    if not path:
        return cfg
    with open(path) as f:
        user_cfg = json.load(f)

    def merge(dst: Dict[str, Any], src: Dict[str, Any]) -> Dict[str, Any]:
        for k, v in src.items():
            if isinstance(v, dict) and isinstance(dst.get(k), dict):
                merge(dst[k], v)
            else:
                dst[k] = v
        return dst

    return merge(cfg, user_cfg)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="scripts/monitor.config.json")
    ap.add_argument("--bind", default=None)
    ap.add_argument("--port", type=int, default=None)
    args = ap.parse_args()

    cfg_path = args.config if os.path.exists(args.config) else None
    cfg = load_config(cfg_path)
    if args.bind:
        cfg["server"]["bind"] = args.bind
    if args.port:
        cfg["server"]["port"] = args.port

    t = threading.Thread(target=collector_loop, args=(cfg,), daemon=True)
    t.start()

    Handler.cfg = cfg
    server = ThreadingHTTPServer((cfg["server"]["bind"], int(cfg["server"]["port"])), Handler)
    print(f"[monitor] serving http://{cfg['server']['bind']}:{cfg['server']['port']}")
    server.serve_forever()


if __name__ == "__main__":
    main()
