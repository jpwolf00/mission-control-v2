-- Add AgentSession model for tracking agent sessions
-- Commit: e75bd91 fix: add missing AgentSession model to Prisma schema

CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_heartbeat_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_sessions_story_id_idx" ON "agent_sessions" ("story_id");
