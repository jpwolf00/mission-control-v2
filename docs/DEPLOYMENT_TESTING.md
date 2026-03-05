# Deployment Testing Guide

## Overview

This document describes how to test the full deployment pipeline across all three environments.

**Note:** Actual deployment testing requires Docker and must be run on a system with Docker installed (your VM at 192.168.85.205).

---

## Test Environment Setup

On your VM (192.168.85.205):

```bash
ssh jpwolf00@192.168.85.205

cd ~/mission-control-v2

# Verify Docker
docker --version
docker compose version

# Ensure clean state
docker compose down
docker compose -f docker-compose.qa.yml down
docker compose -f docker-compose.prod.yml down
```

---

## Test 1: Dev Environment

### Setup
```bash
./scripts/setup.sh
# Review .env file
cat .env
```

### Start Dev
```bash
# Start database
docker compose up -d db

# Verify database
pg_isready -h localhost -p 5432

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Validation Checklist
- [ ] Server starts on http://localhost:3000
- [ ] Health endpoint returns 200
- [ ] Can create story via API
- [ ] Database persists data

---

## Test 2: QA Deployment

### Deploy to QA
```bash
./scripts/exercise-environments.sh
```

### Expected Output
```
[1/4] Starting Dev Environment
✅ Dev database ready

[2/4] Deploying to QA
✅ QA deployment successful (XXs)

[3/4] Running QA Tests (MANDATORY)
  Health check... ✅
  Create story... ✅
  List stories... ✅
✅ All QA tests passed!

[4/4] Production Deployment
⚠️  PRODUCTION DEPLOYMENT REQUIRES MANUAL APPROVAL
✅ QA deployment verified and tested
```

### Validation Checklist
- [ ] QA database starts on port 5433
- [ ] QA app starts on port 3001
- [ ] Health check passes
- [ ] Can create story via QA API
- [ ] QA tests all pass
- [ ] Exercise script exits with code 0

---

## Test 3: Production Deployment (Success Case)

### Pre-Deploy Check
```bash
# Ensure QA is healthy
curl http://localhost:3001/api/v1/health

# Review production config
cat .env
```

### Deploy to Production
```bash
./scripts/deploy-production.sh
```

### Expected Flow
1. Shows deployment summary
2. Verifies QA health (MUST pass)
3. Creates database backup
4. Prompts for `DEPLOY-TO-PROD`
5. Pulls code, builds, deploys
6. Waits 15s, checks health (5 retries)
7. Reports success

### Validation Checklist
- [ ] Backup file created in `./backups/`
- [ ] Production database on port 5434
- [ ] Production app on port 3002
- [ ] Health check passes
- [ ] Script exits with code 0

---

## Test 4: Rollback Validation (Failure Case)

### Simulate Failed Deployment

1. **Pre-deploy:** Create a story in production
```bash
curl -X POST http://localhost:3002/api/v1/stories \
  -H "Content-Type: application/json" \
  -d '{"title":"Pre-deploy Test","priority":"low"}'
```

2. **Note the story ID**

3. **Deploy:** Run production deploy

4. **Simulate failure:** While deploy is running, kill the app container:
```bash
# In another terminal
docker compose -f docker-compose.prod.yml kill app-prod
```

5. **Verify rollback:**
   - Script should detect failure
   - Database should restore from backup
   - Story should still exist (pre-deploy state)

### Validation Checklist
- [ ] Deploy script detects failure
- [ ] Database backup restored
- [ ] Application rolled back
- [ ] Pre-deploy data intact
- [ ] Script exits with code 1
- [ ] Error message shown

---

## Test 5: QA Gate Enforcement

### Test QA Failure Blocks Production

1. **Stop QA:**
```bash
docker compose -f docker-compose.qa.yml down
```

2. **Try production deploy:**
```bash
./scripts/deploy-production.sh
```

3. **Expected:** Script exits with "QA health check failed, production deployment blocked"

### Validation Checklist
- [ ] QA down detected
- [ ] Production deploy blocked
- [ ] Script exits with code 1
- [ ] Clear error message

---

## Test 6: Security Validation

### Test Missing .env
```bash
mv .env .env.backup
./scripts/setup.sh  # Should prompt to configure
# Restore
mv .env.backup .env
```

### Test Missing DB_PASSWORD
```bash
# Temporarily break .env
sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=/' .env
./scripts/deploy-production.sh
# Should fail with "DB_PASSWORD not configured"
# Restore .env
git checkout .env
```

### Test Hardcoded Password Rejection
```bash
# Try to run compose without .env
docker compose -f docker-compose.qa.yml up
# Should fail with "DB_PASSWORD required"
```

### Validation Checklist
- [ ] Missing .env detected
- [ ] Default password rejected
- [ ] Compose fails without password
- [ ] Clear error messages

---

## Automated Test Suite

Run all tests:
```bash
# Full pipeline test
./scripts/exercise-environments.sh

# If QA passes, test production (manually approve)
./scripts/deploy-production.sh

# Run API tests against QA
./scripts/test-api.sh
```

---

## Cleanup

After testing:
```bash
# Stop all environments
docker compose down
docker compose -f docker-compose.qa.yml down
docker compose -f docker-compose.prod.yml down

# Remove volumes (DESTROYS DATA)
docker volume rm mission-control-v2_postgres_data
docker volume rm mission-control-v2_postgres_qa_data
docker volume rm mission-control-v2_postgres_prod_data

# Clean up backups
rm -rf ./backups/*.sql
```

---

## Troubleshooting Tests

| Issue | Solution |
|-------|----------|
| Port conflict | Kill process using port: `lsof -ti:3000 \| xargs kill -9` |
| Database won't start | Check logs: `docker compose logs db` |
| Migration fails | Reset: `npx prisma migrate reset --force` |
| Health check timeout | Increase wait time in script |
| Rollback fails | Check backup file exists and is valid |

---

## Success Criteria

All tests pass when:
1. ✅ Dev environment runs locally
2. ✅ QA auto-deploys and passes tests
3. ✅ Production deploys with manual approval
4. ✅ Rollback restores data on failure
5. ✅ QA failure blocks production
6. ✅ Security gates prevent bad configs