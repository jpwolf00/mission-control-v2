# API Contract (v1 scaffold)

All mutation endpoints under `/api/v1/*` must:

1. Require header `X-Idempotency-Key`
2. Return consistent error codes:
   - `409` conflict (active lock / out-of-order transition)
   - `422` contract validation failure
   - `503` runtime unavailable

## Example

`POST /api/v1/orchestration/dispatch`

Required headers:
- `X-Idempotency-Key: <uuid-or-unique-string>`
