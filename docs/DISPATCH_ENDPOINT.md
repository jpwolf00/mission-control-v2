# Dispatch Endpoint

**Endpoint:** `POST /api/v1/orchestration/dispatch`

Dispatches a story to a specific gate, acquiring a lock to prevent concurrent mutations.

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Idempotency-Key` | Yes | Unique key for idempotent requests (min 8 characters) |

### Body

```json
{
  "storyId": "string",
  "gate": "architect" | "implementer" | "reviewer-a" | "operator" | "reviewer-b",
  "sessionId": "string"
}
```

## Response

### Success (200)

```json
{
  "storyId": "story-123",
  "gate": "architect",
  "sessionId": "session-abc",
  "idempotencyKey": "unique-key-12345",
  "dispatchedAt": 1707033600000,
  "lockAcquired": true,
  "lockSessionId": "session-abc",
  "lockExpiresAt": 1707033900000
}
```

### Error Responses

**409 Conflict** - Lock conflict
```json
{
  "error": "Lock conflict: conflict",
  "reason": "lock_conflict"
}
```

**422 Unprocessable Entity** - Validation/precondition failure
```json
{
  "error": "Story must be in 'created' state for dispatch",
  "reason": "precondition"
}
```

```json
{
  "error": "Story not found: story-123",
  "reason": "not_found"
}
```

**400 Bad Request** - Missing/invalid idempotency key
```json
{
  "error": "Missing X-Idempotency-Key header",
  "reason": "idempotency"
}
```

## Preconditions

1. **Story must exist** - Story ID must be present in the in-memory store
2. **Story must be in 'created' state** - Initial dispatch only from created state
3. **Gate must be 'architect' for initial dispatch** - First dispatch must target architect gate
4. **Lock acquisition** - Must acquire story+gate lock to prevent concurrent dispatches

## Lock Behavior

- Locks auto-expire after 5 minutes
- Same session can re-acquire lock (idempotent)
- Different session gets conflict (409)
- Lock key = `storyId:gate`

## Idempotency

- All dispatch requests require `X-Idempotency-Key` header
- Minimum 8 characters required
- Same key + same session = deterministic success (idempotent)
- Different key = new request

## Example

```bash
curl -X POST http://localhost:3001/api/v1/orchestration/dispatch \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: dispatch-story-123-architect" \
  -d '{
    "storyId": "story-123",
    "gate": "architect",
    "sessionId": "session-abc"
  }'
```
