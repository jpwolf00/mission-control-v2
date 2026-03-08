-- Phase 1a: enforce one gate record per (story, gate)

-- Deduplicate existing rows before adding uniqueness constraint.
-- Keep the most recent record by created_at, then id.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY story_id, gate
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM story_gates
)
DELETE FROM story_gates sg
USING ranked r
WHERE sg.ctid = r.ctid
  AND r.rn > 1;

-- Add unique index used by Prisma compound unique selector storyId_gate
CREATE UNIQUE INDEX IF NOT EXISTS story_gates_story_id_gate_key
  ON story_gates (story_id, gate);
