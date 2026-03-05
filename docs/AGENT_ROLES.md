# MC2 Agent Roles & Permissions

## Agent Personas

### 1. Architect Agent
**Purpose:** Design and specification  
**Gates:** architect only  
**Lane:** Design

**Permissions:**
| Tool | Permission | Scope |
|------|------------|-------|
| `read` | ✅ Full | All files |
| `write` | ✅ Allowed | `docs/`, `specs/` only |
| `edit` | ❌ Denied | - |
| `exec` | ❌ Denied | - |
| `web_search` | ✅ Allowed | Research only |
| `web_fetch` | ✅ Allowed | Documentation |
| `sessions_spawn` | ❌ Denied | - |

**Evidence Required:**
- SPEC.md exists
- Requirements traceability matrix
- Design decisions documented

**Completion Contract:**
```json
{
  "gate": "architect",
  "deliverables": ["docs/SPEC-{storyId}.md"],
  "verification": "SPEC.md exists and contains acceptance criteria"
}
```

---

### 2. Implementer Agent
**Purpose:** Code implementation  
**Gates:** implementer only  
**Lane:** Build

**Permissions:**
| Tool | Permission | Scope |
|------|------------|-------|
| `read` | ✅ Full | All files |
| `write` | ✅ Allowed | `src/` (implementation only) |
| `edit` | ✅ Allowed | Existing files in scope |
| `exec` | ✅ Limited | `npm test`, `npm run build` |
| `web_search` | ✅ Allowed | API docs, examples |
| `sessions_spawn` | ❌ Denied | - |
| `web_fetch` | ✅ Allowed | Package docs |

**Evidence Required:**
- Code written and committed
- Tests pass (`npm test`)
- Build succeeds (`npm run build`)
- No lint errors

**Completion Contract:**
```json
{
  "gate": "implementer",
  "deliverables": ["src/**/*", "tests/**/*"],
  "verification": "npm test passes && npm run build succeeds"
}
```

---

### 3. Reviewer-A Agent
**Purpose:** Code quality assurance  
**Gates:** reviewer-a only  
**Lane:** QA

**Permissions:**
| Tool | Permission | Scope |
|------|------------|-------|
| `read` | ✅ Full | All files |
| `write` | ❌ Denied | - |
| `edit` | ❌ Denied | - |
| `exec` | ✅ Allowed | `npm test`, `curl`, validation scripts |
| `browser` | ✅ Allowed | UI verification (if applicable) |
| `web_fetch` | ✅ Allowed | Compare against requirements |
| `sessions_spawn` | ❌ Denied | - |

**Evidence Required:**
- Test results log
- API validation results
- Security scan (basic)
- Code review comments

**Completion Contract:**
```json
{
  "gate": "reviewer-a",
  "deliverables": ["qa-report.json"],
  "verification": "API tests pass, no critical issues"
}
```

---

### 4. Operator Agent
**Purpose:** Deployment operations  
**Gates:** operator only  
**Lane:** Deploy

**Permissions:**
| Tool | Permission | Scope |
|------|------------|-------|
| `read` | ✅ Full | All files |
| `write` | ❌ Denied | - |
| `edit` | ❌ Denied | - |
| `exec` | ✅ Limited | Deploy scripts only |
| `web_fetch` | ❌ Denied | - |
| `sessions_spawn` | ❌ Denied | - |

**Allowed Commands:**
- `./scripts/deploy.sh` (QA)
- `./scripts/deploy-production.sh` (Prod - requires approval)
- `docker compose up -d`
- Health check curls

**Forbidden:**
- SSH to arbitrary hosts
- Direct DB mutations
- Manual infra changes

**Evidence Required:**
- Deploy success log
- Health check 200
- Backup created (prod)

**Completion Contract:**
```json
{
  "gate": "operator",
  "deliverables": ["deploy-log.json"],
  "verification": "Health check passes, app responds"
}
```

---

### 5. Reviewer-B Agent
**Purpose:** Production validation  
**Gates:** reviewer-b only  
**Lane:** Validate

**Permissions:**
| Tool | Permission | Scope |
|------|------------|-------|
| `read` | ✅ Limited | Read-only from prod |
| `write` | ❌ Denied | - |
| `edit` | ❌ Denied | - |
| `exec` | ✅ Limited | Health checks, metrics queries |
| `browser` | ✅ Allowed | Prod UI verification |
| `web_fetch` | ❌ Denied | - |

**Evidence Required:**
- Production health check 200
- Key user flows validated
- No error spikes

**Completion Contract:**
```json
{
  "gate": "reviewer-b",
  "deliverables": ["prod-validation-report.json"],
  "verification": "All health checks pass, no critical errors"
}
```

---

## Tool Permission Matrix

| Tool | Architect | Implementer | Reviewer-A | Operator | Reviewer-B |
|------|-----------|-------------|------------|----------|------------|
| `read` | ✅ | ✅ | ✅ | ✅ | ✅ RO |
| `write` | ✅ docs | ✅ src | ❌ | ❌ | ❌ |
| `edit` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `exec` | ❌ | ✅ test | ✅ test | ✅ deploy | ✅ health |
| `web_search` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `web_fetch` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `browser` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `sessions_spawn` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `subagents` | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:** RO = Read-Only

---

## Role Enforcement

### Configuration Schema

```typescript
interface AgentRole {
  id: 'architect' | 'implementer' | 'reviewer-a' | 'operator' | 'reviewer-b';
  name: string;
  description: string;
  gates: string[];
  permissions: Permission[];
  allowedTools: string[];
  forbiddenTools: string[];
  evidenceRequirements: string[];
}

interface Permission {
  tool: string;
  action: 'allow' | 'deny' | 'scoped';
  scope?: string;
}
```

### Enforcement Points

1. **Dispatch Time:** Verify agent role matches gate
2. **Tool Call:** Check permission before executing
3. **Completion:** Validate evidence against requirements
4. **Escalation:** Route forbidden tool requests to human

---

## Security Boundaries

### Architect
- **Cannot:** Write code, execute commands, access production
- **Can:** Design, document, research

### Implementer
- **Cannot:** Deploy, access production, modify infrastructure
- **Can:** Write code, run tests, build

### Reviewer-A
- **Cannot:** Modify code, deploy, spawn subagents
- **Can:** Test, validate, report issues

### Operator
- **Cannot:** Modify code, change requirements, direct DB access
- **Can:** Run deploy scripts, check health

### Reviewer-B
- **Cannot:** Modify anything in production
- **Can:** Read metrics, validate health

---

## Escalation Rules

If an agent attempts a forbidden action:

1. **Log:** Record attempt with context
2. **Block:** Prevent action execution
3. **Notify:** Alert human operator
4. **Options:**
   - Approve one-time exception
   - Adjust role permissions
   - Escalate to different agent
   - Human completes task