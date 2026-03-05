-- MC2 Database Initialization - V1 Schema
-- Postgres-compatible DDL for minimal persistence layer

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: stories
-- ============================================
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);

-- ============================================
-- Table: story_gates
-- ============================================
CREATE TABLE IF NOT EXISTS story_gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gate_type VARCHAR(50) NOT NULL,
    conditions JSONB DEFAULT '{}',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_gates_story_id ON story_gates(story_id);
CREATE INDEX IF NOT EXISTS idx_story_gates_position ON story_gates(story_id, position);

-- ============================================
-- Table: run_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS run_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_sessions_story_id ON run_sessions(story_id);
CREATE INDEX IF NOT EXISTS idx_run_sessions_status ON run_sessions(status);

-- ============================================
-- Table: story_events
-- ============================================
CREATE TABLE IF NOT EXISTS story_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    gate_id UUID REFERENCES story_gates(id) ON DELETE SET NULL,
    session_id UUID REFERENCES run_sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_events_story_id ON story_events(story_id);
CREATE INDEX IF NOT EXISTS idx_story_events_gate_id ON story_events(gate_id);
CREATE INDEX IF NOT EXISTS idx_story_events_session_id ON story_events(session_id);
CREATE INDEX IF NOT EXISTS idx_story_events_created_at ON story_events(created_at);

-- ============================================
-- Table: dispatch_locks
-- ============================================
CREATE TABLE IF NOT EXISTS dispatch_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lock_key VARCHAR(255) NOT NULL UNIQUE,
    owner_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_locks_key ON dispatch_locks(lock_key);
CREATE INDEX IF NOT EXISTS idx_dispatch_locks_expires ON dispatch_locks(expires_at);

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
