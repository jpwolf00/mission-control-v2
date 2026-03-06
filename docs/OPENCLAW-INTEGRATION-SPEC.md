# OpenClaw Gateway Integration Spec for Mission Control v2

## Overview

Mission Control v2 (MC2) dispatches work through a 5-gate pipeline. When a story is dispatched, MC2 sends a webhook to the OpenClaw gateway to trigger an agent for the appropriate gate role. The agent does its work, then POSTs results back to MC2's callback endpoint.

**MC2 side is complete.** This spec describes what needs to be configured on the OpenClaw gateway to receive and handle these dispatch requests.

---

## 1. Gateway Config Changes

Add/update the following in your OpenClaw gateway config (`config.json5` or equivalent):

```json5
{
  hooks: {
    enabled: true,
    token: "<same value as OPENCLAW_GATEWAY_TOKEN in MC2 .env>",
    path: "/hooks",
    allowedAgentIds: [
      "architect",
      "implementer",
      "reviewer-a",
      "operator",
      "reviewer-b"
    ]
  }
}
```

The token currently set in MC2 production `.env` is the value of `OPENCLAW_GATEWAY_TOKEN`. The gateway hook token must match.

---

## 2. Agent Workspaces Required

Create 5 OpenClaw agent workspaces, one per gate role. Each agent receives dispatched work via `POST /hooks/agent` with `agentId` matching the workspace name.

| agentId        | Role               | Purpose                        |
|----------------|--------------------|--------------------------------|
| `architect`    | Architect           | Design specs, architecture docs |
| `implementer`  | Implementer         | Code implementation             |
| `reviewer-a`   | Reviewer A (QA)     | Code quality review             |
| `operator`     | Operator            | Deployment operations           |
| `reviewer-b`   | Reviewer B (Prod)   | Production validation           |

Create each with:
```bash
gog agents add architect
gog agents add implementer
gog agents add reviewer-a
gog agents add operator
gog agents add reviewer-b
```

---

## 3. What MC2 Sends

When a story is dispatched, MC2 posts to the gateway:

```
POST http://<gateway>:18789/hooks/agent
Headers:
  x-openclaw-token: <hook-token>
  Content-Type: application/json

Body:
{
  "message": "<see below>",
  "name": "MC2-architect",
  "agentId": "architect",
  "deliver": false
}
```

The `message` field contains the full work context in markdown:

```markdown
You are the architect agent for Mission Control story "Add User Auth".

## Story Context
- **Story ID**: 8bdb4bf7-cfc6-4f6b-8fe2-636e1581f2bc
- **Gate**: architect
- **Session ID**: d7074fde-c1cd-44e7-b4e9-33410cb2f208
- **Description**: Implement user authentication with JWT tokens
- **Acceptance Criteria**:
- Login endpoint returns JWT
- Tokens expire after 24h

## Callback
When finished, POST your results to: http://192.168.85.205:3004/api/v1/agents/callback
Include headers: Content-Type: application/json, x-idempotency-key: <unique-key>
Body: { "sessionId": "d7074fde-...", "event": "completed", "agentId": "<your-id>", "gate": "architect", "evidence": [...] }
```

---

## 4. Callback Contract

When an agent finishes work, it must POST back to MC2. This is how MC2 knows the gate is done.

### Endpoint
```
POST http://192.168.85.205:3004/api/v1/agents/callback
```

### Required Headers
```
Content-Type: application/json
x-idempotency-key: <unique string, min 8 chars>
```

### Success Callback
```json
{
  "sessionId": "<from the message context>",
  "agentId": "<agent's own id>",
  "role": "architect",
  "event": "completed",
  "evidence": [
    {
      "description": "Created SPEC.md with architecture design"
    }
  ]
}
```

### Failure Callback
```json
{
  "sessionId": "<from the message context>",
  "agentId": "<agent's own id>",
  "role": "architect",
  "event": "failed",
  "error": "Could not access repository"
}
```

### Heartbeat (optional, keeps session alive)
```json
{
  "sessionId": "<from the message context>",
  "agentId": "<agent's own id>",
  "role": "architect",
  "event": "heartbeat"
}
```

### Response Codes from MC2
| Code | Meaning |
|------|---------|
| 200  | Callback processed, lock released |
| 400  | Missing x-idempotency-key header |
| 404  | Session not found (expired or invalid) |
| 422  | Missing required fields |
| 500  | Internal error |

---

## 5. Role Responsibilities & Tool Guidance

Each agent workspace should have an IDENTITY.md or system instructions scoped to its role. Here's what each role should do and what tools it should use:

### architect
- **Job**: Read the story requirements, produce architecture/design specs
- **Tools**: read files, write to `docs/`, web search, web fetch
- **Evidence**: `SPEC.md` or equivalent design document exists
- **Should NOT**: edit source code, run commands, spawn subagents

### implementer
- **Job**: Write code based on the architect's spec
- **Tools**: read files, write/edit in `src/`, run `npm test` and `npm run build`, web search
- **Evidence**: tests pass, build succeeds
- **Should NOT**: modify docs, deploy, spawn subagents

### reviewer-a
- **Job**: Review code quality, run validation
- **Tools**: read files, run validation scripts, browser automation, web fetch
- **Evidence**: API tests pass, no critical issues found
- **Should NOT**: write or edit any files, spawn subagents

### operator
- **Job**: Deploy the changes to production
- **Tools**: read files, run deploy scripts only
- **Evidence**: health check returns 200, backup created
- **Should NOT**: write/edit files, spawn subagents

### reviewer-b
- **Job**: Validate production deployment
- **Tools**: read files, run health checks, browser automation
- **Evidence**: production health check passes
- **Should NOT**: write/edit files, spawn subagents

---

## 6. Network Requirements

MC2 production is at `192.168.85.205:3004`. The OpenClaw gateway is at `192.168.85.206:18789`. Both must be reachable from each other on the local network:

- **MC2 → Gateway**: `POST http://192.168.85.206:18789/hooks/agent` (dispatch trigger)
- **Gateway → MC2**: `POST http://192.168.85.205:3004/api/v1/agents/callback` (result callback)

---

## 7. Testing

Once the gateway config is updated, test with:

```bash
# 1. Verify hooks endpoint responds
curl -X POST http://192.168.85.206:18789/hooks/agent \
  -H 'x-openclaw-token: <token>' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, this is a test","name":"MC2-test","agentId":"architect","deliver":false}'

# Should return 200, not 404

# 2. Test full round-trip from MC2
# Create a story, approve requirements, then dispatch via the UI
# Check MC2 logs: ssh jpwolf00@192.168.85.205 "tail -f /tmp/mc2.log"
# Look for: [openclaw] Agent triggered via /hooks/agent for role "architect"
# Then: [agent-callback] Session ... completed by ...
```

---

## 8. Summary of Changes Needed

| Item | Where | Action |
|------|-------|--------|
| Enable hooks | Gateway config | Set `hooks.enabled: true`, `hooks.token`, `hooks.path: "/hooks"` |
| Allow agent IDs | Gateway config | `hooks.allowedAgentIds: ["architect","implementer","reviewer-a","operator","reviewer-b"]` |
| Create 5 agent workspaces | Gateway CLI | `gog agents add <name>` for each role |
| Agent instructions | Each workspace | Add IDENTITY.md with role scope and tool constraints |
| Network access | Firewall/routing | Ensure gateway can reach `192.168.85.205:3004` for callbacks |

**No changes needed on the MC2 side** — the dispatch pipeline and callback handler are already deployed and working.
