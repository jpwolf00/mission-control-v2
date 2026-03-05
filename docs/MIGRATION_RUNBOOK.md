# Migration Runbook - MC2 Schema V1

## Overview
This runbook documents the apply and rollback procedures for database schema V1.

## Prerequisites
- PostgreSQL 14+ with uuid-ossp extension
- Database connection with CREATE/ALTER/DROP permissions
- Backup taken before applying migrations

---

## Apply Migration

### Step 1: Backup Database
```bash
# Create pre-migration backup
pg_dump -U <user> -d <database> > backup_pre_v1_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Connect to Database
```bash
psql -U <user> -d <database> -f sql/001_init.sql
```

### Step 3: Verify Tables Created
```bash
psql -U <user> -d <database> -c "\dt"
# Expected output:
#               List of relations
#  Schema |      Name       | Type  | Owner
# --------+-----------------+-------+--------
#  public | dispatch_locks  | table | ...
#  public | run_sessions   | table | ...
#  public | stories         | table | ...
#  public | story_events    | table | ...
#  public | story_gates     | table | ...
```

### Step 4: Verify Indexes
```bash
psql -U <user> -d <database> -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;"
```

### Step 5: Verify Trigger
```bash
psql -U <user> -d <database> -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'stories';"
# Expected: update_stories_updated_at
```

---

## Rollback Migration

### ⚠️ Warning
This will delete all data. Ensure backups are current.

### Step 1: Drop Tables (in reverse dependency order)
```sql
-- Drop in correct order to respect foreign keys
DROP TABLE IF EXISTS dispatch_locks CASCADE;
DROP TABLE IF EXISTS story_events CASCADE;
DROP TABLE IF EXISTS run_sessions CASCADE;
DROP TABLE IF EXISTS story_gates CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
```

### Step 2: Drop Trigger and Function
```sql
DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

### Step 3: Verify Cleanup
```bash
psql -U <user> -d <database> -c "\dt"
# Expected: No relations found
```

---

## Verification Tests

### Basic Insert Test
```sql
-- Test stories table
INSERT INTO stories (title, description, status) VALUES ('Test Story', 'A test story', 'draft') RETURNING id;

-- Test story_gates table  
INSERT INTO story_gates (story_id, name, gate_type, position) 
VALUES (<story_id>, 'Start Gate', 'automatic', 0) RETURNING id;

-- Test run_sessions table
INSERT INTO run_sessions (story_id, status) VALUES (<story_id>, 'pending') RETURNING id;

-- Test dispatch_locks table
INSERT INTO dispatch_locks (lock_key, owner_id, expires_at) 
VALUES ('test_lock', 'test_owner', NOW() + INTERVAL '1 hour') RETURNING id;
```

### Cleanup Test Data
```sql
DELETE FROM dispatch_locks WHERE lock_key = 'test_lock';
DELETE FROM story_events WHERE story_id IN (SELECT id FROM stories WHERE title = 'Test Story');
DELETE FROM run_sessions WHERE story_id IN (SELECT id FROM stories WHERE title = 'Test Story');
DELETE FROM story_gates WHERE story_id IN (SELECT id FROM stories WHERE title = 'Test Story');
DELETE FROM stories WHERE title = 'Test Story';
```

---

## Troubleshooting

### Error: extension "uuid-ossp" does not exist
```sql
CREATE EXTENSION "uuid-ossp";
```

### Error: relation already exists
- Migration may have already been applied
- Check with: `SELECT COUNT(*) FROM stories;`

### Foreign Key Errors on Drop
- Use `CASCADE` flag to force drop with dependencies
- Or drop tables in correct order (see Step 1)
