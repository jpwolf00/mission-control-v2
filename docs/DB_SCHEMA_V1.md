# MC2 Database Schema V1 - Minimal Persistence

## Overview
Minimal table schema for Mission Control v2 event-driven story engine.

## Tables

### stories
Story definitions with metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique story identifier |
| title | VARCHAR(255) | NOT NULL | Story title |
| description | TEXT | | Story description |
| status | VARCHAR(50) | NOT NULL DEFAULT 'draft' | Status: draft, active, paused, completed |
| config | JSONB | DEFAULT '{}' | Story configuration |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_stories_status` on `status`

---

### story_gates
Gates/checkpoints within stories that control progression.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique gate identifier |
| story_id | UUID | NOT NULL, REFERENCES stories(id) ON DELETE CASCADE | Parent story |
| name | VARCHAR(255) | NOT NULL | Gate name |
| gate_type | VARCHAR(50) | NOT NULL | Gate type: manual, automatic, conditional |
| conditions | JSONB | DEFAULT '{}' | Gate conditions |
| position | INTEGER | NOT NULL DEFAULT 0 | Order within story |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_story_gates_story_id` on `story_id`
- `idx_story_gates_position` on `(story_id, position)`

---

### story_events
Event log for story execution and tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique event identifier |
| story_id | UUID | NOT NULL, REFERENCES stories(id) ON DELETE CASCADE | Associated story |
| gate_id | UUID | REFERENCES story_gates(id) ON DELETE SET NULL | Associated gate (if any) |
| session_id | UUID | REFERENCES run_sessions(id) ON DELETE SET NULL | Associated session |
| event_type | VARCHAR(100) | NOT NULL | Event type: entered, exited, triggered, skipped |
| payload | JSONB | DEFAULT '{}' | Event data |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Event timestamp |

**Indexes:**
- `idx_story_events_story_id` on `story_id`
- `idx_story_events_gate_id` on `gate_id`
- `idx_story_events_session_id` on `session_id`
- `idx_story_events_created_at` on `created_at`

---

### dispatch_locks
Distributed locking for story/event dispatch coordination.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Lock identifier |
| lock_key | VARCHAR(255) | NOT NULL UNIQUE | Unique lock key |
| owner_id | VARCHAR(255) | NOT NULL | Lock owner (session/process ID) |
| expires_at | TIMESTAMPTZ | NOT NULL | Lock expiration |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Lock acquisition time |

**Indexes:**
- `idx_dispatch_locks_key` on `lock_key`
- `idx_dispatch_locks_expires` on `expires_at`

---

### run_sessions
Story execution sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Session identifier |
| story_id | UUID | NOT NULL, REFERENCES stories(id) ON DELETE CASCADE | Associated story |
| status | VARCHAR(50) | NOT NULL DEFAULT 'pending' | Session status: pending, running, completed, failed, cancelled |
| started_at | TIMESTAMPTZ | | Session start time |
| ended_at | TIMESTAMPTZ | | Session end time |
| metadata | JSONB | DEFAULT '{}' | Session metadata |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_run_sessions_story_id` on `story_id`
- `idx_run_sessions_status` on `status`

---

## Relationships

```
stories (1) ──< story_gates (many)
stories (1) ──< story_events (many)
stories (1) ──< run_sessions (many)
story_gates (1) ──< story_events (many)
run_sessions (1) ──< story_events (many)
```
