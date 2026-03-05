# Mission Control 2.0 - Developer Documentation

## Quick Start (5 minutes)

```bash
# 1. Clone and setup
git clone https://github.com/jpwolf00/mission-control-v2.git
cd mission-control-v2
./scripts/setup.sh          # Creates .env with secure password

# 2. Start database
docker compose up -d db

# 3. Run migrations
npx prisma migrate dev

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000
```

---

## Architecture Overview

MC2 follows **Clean Architecture** with strict dependency rules:

```
┌─────────────────────────────────────────────┐
│  UI (src/app/)          → React + Next.js   │
├─────────────────────────────────────────────┤
│  API (src/app/api/)     → REST endpoints    │
├─────────────────────────────────────────────┤
│  Services (src/services/) → Business logic  │
├─────────────────────────────────────────────┤
│  Domain (src/domain/)   → Pure TypeScript   │
└─────────────────────────────────────────────┘
```

**Rule:** Domain layer has ZERO external dependencies.

---

## Development Workflow

### 1. Create a Feature

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# - Domain logic → src/domain/
# - API routes → src/app/api/v1/
# - UI components → src/components/
# - Services → src/services/

# Run tests
npm test

# Build check
npm run build
```

### 2. Database Changes

```bash
# Edit prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name add_new_field

# Generate client
npx prisma generate
```

### 3. Testing

```bash
# Unit tests
npm test

# API smoke tests (requires running server)
./scripts/test-api.sh

# E2E integration tests
npm run test:e2e
```

---

## Environment Setup

### Local Dev

```bash
# .env
DATABASE_URL="postgresql://mc2:your-password@localhost:5432/mission_control"
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Running Tests

```bash
# Start test database
docker compose up -d db

# Run all tests
npm test

# Test coverage
npm run test:coverage
```

---

## Deployment Pipeline

### Dev (Local)
```bash
npm run dev
# Hot reload enabled
# URL: http://localhost:3000
```

### QA (Test)
```bash
./scripts/exercise-environments.sh
# Auto-deploys to QA
# Runs smoke tests
# URL: http://localhost:3001
```

### Production
```bash
./scripts/deploy-production.sh
# Requires explicit 'DEPLOY-TO-PROD' confirmation
# Creates backup before deploy
# Auto-rollback on failure
# URL: http://localhost:3002
```

---

## Gate Pipeline

Stories flow through gates with required evidence:

| Gate | Input | Output | Evidence Required |
|------|-------|--------|-------------------|
| **architect** | Requirements | SPEC.md | Document exists |
| **implementer** | SPEC.md | Code + Tests | Build passes, tests green |
| **reviewer-a** | Code | QA Pass | API tests pass |
| **operator** | QA Pass | Deploy | Deploy succeeds |
| **reviewer-b** | Deploy | Prod Validation | Health check 200 |

---

## Adding a New API Endpoint

1. **Create route:** `src/app/api/v1/my-feature/route.ts`
2. **Add domain types:** `src/domain/my-feature.ts`
3. **Add service:** `src/services/my-feature-service.ts`
4. **Add tests:** `src/domain/my-feature.test.ts`
5. **Update API docs:** Add to this README

Example:
```typescript
// src/app/api/v1/widgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWidgets, createWidget } from '@/services/widget-service';

export async function GET() {
  const widgets = await getWidgets();
  return NextResponse.json({ widgets });
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const widget = await createWidget(data);
  return NextResponse.json(widget, { status: 201 });
}
```

---

## Debugging

### Logs
```bash
# Dev logs
npm run dev 2>&1 | grep ERROR

# Docker logs
docker compose logs -f app

# Production logs
docker compose -f docker-compose.prod.yml logs -f app-prod
```

### Database
```bash
# Open Prisma Studio
npx prisma studio

# Run raw query
npx prisma db execute --file query.sql
```

### Health Checks
```bash
# Dev
curl http://localhost:3000/api/v1/health

# QA
curl http://localhost:3001/api/v1/health

# Production
curl http://localhost:3002/api/v1/health
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "DB_PASSWORD required" | Run `./scripts/setup.sh` or create `.env` |
| Prisma client errors | Run `npx prisma generate` |
| Port already in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| Migration fails | Reset: `npx prisma migrate reset` |
| Build fails | Clear cache: `rm -rf .next && npm run build` |

---

## Code Style

- **Linting:** `npm run lint`
- **Formatting:** `npm run format`
- **Pre-commit:** Runs automatically via husky

---

## Resources

- [Clean Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API_CONTRACT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Database Schema](docs/DB_SCHEMA_V1.md)