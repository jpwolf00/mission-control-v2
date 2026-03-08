-- Phase 3A.1 foundation: durable session safety fields

ALTER TABLE run_sessions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_invocations INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_invocations INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS run_sessions_idempotency_key_key
  ON run_sessions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS run_sessions_story_gate_status_idx
  ON run_sessions (story_id, gate, status);
