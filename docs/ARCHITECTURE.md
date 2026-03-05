# MC2 Architecture

## Clean Architecture Layers

```
┌─────────────────────────────────────────────┐
│           UI (src/app/)                     │  Depends on: all
├─────────────────────────────────────────────┤
│      Controllers (src/app/api/)              │  Depends on: domain, services
├─────────────────────────────────────────────┤
│       Services (src/services/)              │  Depends on: domain
├─────────────────────────────────────────────┤
│        Domain (src/domain/)                 │  Pure - no deps
├─────────────────────────────────────────────┤
│      Infrastructure (src/lib/)               │  No domain deps
└─────────────────────────────────────────────┘
```

## Dependency Rules

1. **Domain is Pure** - No imports from services, lib, or api
2. **Services depend on Domain** - Never the reverse
3. **Infrastructure has no Domain imports** - Pure utilities only
4. **API orchestrates** - Imports domain (validation) + services (operations)

## Gate Pipeline

```
Requirements → Architect → Implementer → Reviewer-A → Operator → Reviewer-B → Done
                  ↓           ↓            ↓           ↓          ↓
              SPEC.md    Code+Test     QA Check    Deploy     Validate
```

## State Machine

| Status | Can Transition To |
|--------|-------------------|
| draft | approved |
| approved | active |
| active | completed, archived |
| completed | archived |
| archived | (terminal) |

## Evidence Contracts

Each gate requires specific evidence before completion:
- **Architect**: SPEC.md exists
- **Implementer**: Code builds + tests pass
- **Reviewer-A**: QA pass (curl/API tests)
- **Operator**: Deploy succeeds
- **Reviewer-B**: Production validation

## Idempotency

All state-changing operations require `Idempotency-Key` header.
Same key = same result (no duplicate side effects).

## Lock Semantics

- One active session per story at a time
- Locks auto-expire after 30min of no heartbeat
- Manual release via operator intervention
