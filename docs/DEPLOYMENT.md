# Deployment Environments

## Overview

MC2 supports three environments with clear promotion gates:

```
Dev → QA → Production
  ↑    ↑      ↑
local  test   live
```

## Dev (Local)

```bash
# Start local dev
docker compose up -d db
npm run dev

# URL: http://localhost:3000
# DB: PostgreSQL in Docker
# Hot reload: Enabled
```

## QA (Test)

```bash
# Deploy to QA
docker compose -f docker-compose.qa.yml up -d

# URL: http://qa-mission-control.local
# DB: Isolated PostgreSQL
# Data: Reset on each deploy
```

## Production (Live)

**⚠️ Requires explicit operator approval**

```bash
# Deploy to production (MANUAL ONLY)
# 1. Ensure QA tests pass
# 2. Get approval from operator
# 3. Run deployment

ssh deploy@prod-server
./scripts/deploy-production.sh

# URL: http://mission-control.local
# DB: Production PostgreSQL
# Rollback: 1-command via deploy.sh
```

## Promotion Gates

| From | To | Required Evidence |
|------|-----|-------------------|
| Dev → QA | API tests pass (`./scripts/test-api.sh`) |
| QA → Prod | 1. E2E tests pass<br>2. Security scan clean<br>3. Operator approval |

## Environment Variables

### Dev
```bash
DATABASE_URL="postgresql://mc2:mc2password@localhost:5432/mission_control_dev"
NODE_ENV="development"
```

### QA
```bash
DATABASE_URL="postgresql://mc2:mc2password@db:5432/mission_control_qa"
NODE_ENV="production"
```

### Production
```bash
DATABASE_URL="postgresql://mc2:mc2password@prod-db:5432/mission_control_prod"
NODE_ENV="production"
# Secrets managed via 1Password or similar
```
