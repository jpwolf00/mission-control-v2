# API Contract (v1 scaffold)

All mutation endpoints under `/api/v1/*` must:

1. Require header `X-Idempotency-Key`
2. Return consistent error codes:
   - `409` conflict (active lock / out-of-order transition)
   - `422` contract validation failure
   - `503` runtime unavailable

## Dispatch Lock Behavior

When dispatching to a gate, the system acquires a story+gate lock to prevent concurrent mutations. Lock conflicts return `409`:

- **Active lock:** Different session holds the lock → `409 Conflict`
- **Idempotent retry:** Same session re-acquires → returns existing lock (success)
- **Expired lock:** Previous lock expired → allows new acquisition

Locks auto-expire after 5 minutes. Explicit release supported via `releaseReason: 'released' | 'superseded'`.

## Example

`POST /api/v1/orchestration/dispatch`

Required headers:
- `X-Idempotency-Key: <uuid-or-unique-string>`
