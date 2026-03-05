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

## Runtime Signal Contract

Runtime signals track session lifecycle events. All runtime signals MUST include:

- `type`: One of `started`, `heartbeat`, `completed`, `failed`, `timed_out`, `canceled`
- `storyId`: String identifier for the story
- `sessionId`: String identifier for the session

### Signal Types

| Type | Required Fields | Optional Fields | Description |
|------|-----------------|-----------------|-------------|
| `started` | storyId, sessionId | - | Session has started |
| `heartbeat` | storyId, sessionId | - | Session is still active |
| `completed` | storyId, sessionId | result | Session completed successfully |
| `failed` | storyId, sessionId | error | Session failed with error |
| `timed_out` | storyId, sessionId | reason | Session timed out |
| `canceled` | storyId, sessionId | reason | Session was canceled |

### Validation

All runtime signals are validated on ingestion:

- Type must be one of the valid signal types
- `storyId` and `sessionId` are required and must be non-empty strings
- Optional fields (`error`, `reason`, `result`) must be of the correct type if provided
- Invalid signals return `422` with descriptive error message

### Session Lifecycle

Sessions are tracked with the following fields:

- `id`: Unique session identifier
- `storyId`: Associated story identifier
- `createdAt`: Unix timestamp (ms) when session was created
- `lastHeartbeatAt`: Unix timestamp (ms) of last heartbeat
- `expiresAt`: Unix timestamp (ms) when session expires
- `status`: One of `pending`, `active`, `completed`, `failed`, `timed_out`, `canceled`

### Stalled Derivation Detection

Sessions can be monitored for stalling using explicit timestamp inputs:

- `timeoutThresholdMs`: Configurable threshold (default: 5 minutes)
- Detection uses timestamp comparisons only (no timers)
- Stalled sessions transition to `timed_out` status

## Example

`POST /api/v1/orchestration/dispatch`

Required headers:
- `X-Idempotency-Key: <uuid-or-unique-string>`

### Runtime Signal Example

```json
{
  "type": "started",
  "storyId": "story-123",
  "sessionId": "session-abc"
}
```

```json
{
  "type": "heartbeat",
  "storyId": "story-123",
  "sessionId": "session-abc"
}
```

```json
{
  "type": "failed",
  "storyId": "story-123",
  "sessionId": "session-abc",
  "error": "Connection refused"
}
```
