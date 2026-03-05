# MC2 Agent System Overview

## Agent Personas

```
┌─────────────────────────────────────────────────────────────────┐
│                        STORY LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐│
│   │  Draft   │───▶│ Approved │───▶│  Active  │───▶│Completed ││
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘│
│        │                               │                        │
│        ▼                               ▼                        │
│   ┌──────────┐                   ┌──────────┐                  │
│   │  Human   │                   │  Gates   │                  │
│   │ Approves │                   │          │                  │
│   └──────────┘                   └──────────┘                  │
│                                         │                       │
│                    ┌────────────────────┼────────────────────┐ │
│                    ▼                    ▼                    ▼ │
│               ┌─────────┐        ┌─────────┐          ┌────────┐│
│               │Architect│        │Implement│          │ReviewA ││
│               │ (Design)│        │ (Build) │          │  (QA)  ││
│               └─────────┘        └─────────┘          └────────┘│
│                    │                    │                    │   │
│                    ▼                    ▼                    ▼   │
│               ┌─────────┐        ┌─────────┐          ┌────────┐│
│               │Operator │        │ReviewB  │          │  Done  ││
│               │(Deploy) │        │(Validate│          │        ││
│               └─────────┘        └─────────┘          └────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Role Permissions Matrix

| Tool | Architect | Implementer | Reviewer-A | Operator | Reviewer-B |
|:----:|:---------:|:-----------:|:----------:|:--------:|:----------:|
| **read** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Read-Only |
| **write** | ✅ docs/ | ✅ src/ | ❌ | ❌ | ❌ |
| **edit** | ❌ | ✅ src/ | ❌ | ❌ | ❌ |
| **exec** | ❌ | ✅ test | ✅ test | ✅ deploy | ✅ health |
| **web_search** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **web_fetch** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **browser** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **sessions_spawn** | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Security Boundaries

### 🏗️ Architect
**Can:** Research, design, write specifications  
**Cannot:** Execute code, modify implementation, access production

```
Inputs:  Requirements
Outputs: SPEC.md, Design docs
Evidence: Document exists, AC defined
```

### 👷 Implementer
**Can:** Read code, write implementation, run tests  
**Cannot:** Deploy, modify infrastructure, access production

```
Inputs:  SPEC.md
Outputs: Source code, Tests
Evidence: Build passes, tests green
```

### 🔍 Reviewer-A
**Can:** Read all code, run tests, validate API, check UI  
**Cannot:** Modify code, deploy, spawn subagents

```
Inputs:  Implementation
Outputs: QA report
Evidence: API tests pass, no critical issues
```

### 🚀 Operator
**Can:** Run deploy scripts, check health, create backups  
**Cannot:** Modify code, change requirements, direct DB access

```
Inputs:  Approved build
Outputs: Deployed application
Evidence: Health check 200, backup created
```

### ✅ Reviewer-B
**Can:** Read production metrics, validate health, check UI  
**Cannot:** Modify anything in production

```
Inputs:  Production deployment
Outputs: Validation report
Evidence: All health checks pass
```

---

## Enforcement Points

### 1. Dispatch Gate
```typescript
validateGateAssignment(role, gate)
// Architect → architect gate ✅
// Architect → deploy gate ❌
```

### 2. Tool Call Interception
```typescript
checkToolPermission(agent, tool, params)
// Implementer calling 'write' to src/ ✅
// Implementer calling 'exec' with 'ssh' ❌
```

### 3. Evidence Validation
```typescript
validateEvidence(role, evidence)
// All required evidence present? ✅
// Missing evidence? ❌ Gate fails
```

### 4. Violation Handling
```typescript
logForbiddenAttempt(agent, tool, reason)
// Log violation
// Alert human
// Optionally kill session
```

---

## Example Agent Session

```typescript
// Agent context created at dispatch
const context = {
  agentId: 'agent-123',
  role: 'implementer',
  storyId: 'story-456',
  sessionId: 'session-789',
};

// Agent uses RBAC client
const agent = createRBACAgent(context);

// Allowed: Write to src/
const result = await agent.write({
  file_path: 'src/components/button.tsx',
  content: 'export function Button() {...}'
});
// ✅ Allowed - Implementer can write to src/

// Forbidden: Deploy
const result = await agent.exec({
  command: './scripts/deploy-production.sh'
});
// ❌ Blocked - Implementer cannot deploy
// Logs violation, alerts human
```

---

## Escalation Flow

```
Agent attempts forbidden action
         │
         ▼
┌─────────────────────┐
│  RBAC Check fails   │
│  - Log violation    │
│  - Store in DB      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Human Notification │
│  - Slack alert      │
│  - Dashboard flag   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Human Decision:    │
│  • Approve once     │
│  • Change role      │
│  • Kill session     │
│  • Manual fix       │
└─────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/AGENT_ROLES.md` | Role definitions and permissions |
| `src/domain/agent-roles.ts` | Domain types for RBAC |
| `src/services/role-permissions.ts` | Permission checking logic |
| `src/app/api/v1/rbac/check/route.ts` | RBAC API endpoint |
| `src/lib/rbac-client.ts` | Agent client library |

---

## Future Enhancements

- [ ] Dynamic role assignment based on story type
- [ ] Time-based permissions (expire after N hours)
- [ ] Multi-signature for high-risk operations
- [ ] AI-powered anomaly detection for violations
- [ ] Fine-grained file-level permissions
- [ ] Audit trail dashboard