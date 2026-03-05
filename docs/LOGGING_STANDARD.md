# Logging Standard

## MC2-E8-S1: Observability Scaffold

This document defines the structured logging schema and conventions for Mission Control v2.

## Log Levels

| Level | Priority | Use Case |
|-------|----------|----------|
| `debug` | 0 | Detailed diagnostic information |
| `info` | 1 | General operational events |
| `warn` | 2 | Warning conditions, recoverable issues |
| `error` | 3 | Error conditions, failures |

## Log Sources

| Source | Description |
|--------|-------------|
| `domain` | Core business logic and domain services |
| `infrastructure` | Database, cache, external service clients |
| `gateway` | HTTP gateway, request/response handling |
| `api` | API routes and controllers |
| `worker` | Background job processing |

## Log Entry Schema

```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601 format
  level: LogLevel;         // debug | info | warn | error
  source: LogSource;       // domain | infrastructure | gateway | api | worker
  message: string;         // Human-readable message
  storyId?: string;       // Optional: Story ID for traceability
  sessionId?: string;      // Optional: Session ID for traceability
  metadata?: Record<string, unknown>;  // Optional: Additional context
  error?: {                // Optional: Error details
    name: string;
    message: string;
    stack?: string;
  };
}
```

## Examples

### Basic Log Entry

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "source": "domain",
  "message": "Session started"
}
```

### Log Entry with Context

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "error",
  "source": "api",
  "message": "Request validation failed",
  "storyId": "story-123",
  "sessionId": "session-456",
  "metadata": {
    "endpoint": "/api/stories",
    "method": "POST",
    "statusCode": 400
  }
}
```

### Log Entry with Error

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "error",
  "source": "infrastructure",
  "message": "Database connection failed",
  "metadata": {
    "host": "localhost",
    "port": 5432
  },
  "error": {
    "name": "ECONNREFUSED",
    "message": "connect ECONNREFUSED 127.0.0.1:5432",
    "stack": "Error: connect ECONNREFUSED..."
  }
}
```

## Validation Rules

1. **Required Fields**: `timestamp`, `level`, `source`, `message`
2. **Timestamp**: Must be ISO 8601 format (e.g., `2024-01-15T10:30:00.000Z`)
3. **Level**: Must be one of `debug`, `info`, `warn`, `error`
4. **Source**: Must be one of `domain`, `infrastructure`, `gateway`, `api`, `worker`
5. **Metadata**: Must be JSON serializable (no circular references)
6. **Optional Fields**: `storyId`, `sessionId`, `metadata`, `error` are optional but must be valid types if provided

## Filtering

Use the `shouldLog` function to filter logs based on minimum log level:

```typescript
import { shouldLog, type LogLevel } from "./logging";

function log(entryLevel: LogLevel, minLevel: LogLevel): boolean {
  return shouldLog(entryLevel, minLevel);
}

// Only log info and above in production
if (shouldLog("debug", "info")) {
  // Won't execute in production if minLevel is "info"
}
```

## Best Practices

1. **Use appropriate levels**: Don't log everything as `info`. Use `warn` for recoverable issues, `error` for failures.
2. **Include context**: Always include `storyId` and `sessionId` when available for traceability.
3. **Structured metadata**: Use the `metadata` field for structured data rather than embedding in the message.
4. **Error logging**: Always include the full error object (`name`, `message`, `stack`) when logging errors.
5. **ISO timestamps**: Always use ISO 8601 format for timestamps to ensure consistency across systems.
