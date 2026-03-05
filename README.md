# Mission Control 2.0

AI-native orchestration platform for agentic software development with deterministic workflows, quality gates, and safe deployment.

## Quick Start

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Run tests
npm test

# Generate weekly SLO report
npm run report:slo:weekly
```

## Architecture

### Core Principles
- **Deterministic Workflows**: Explicit state machine with strict gate transitions
- **Quality by Design**: No gate closes without required evidence
- **Safe Deployment**: Operator-gated production promotion with instant rollback
- **Agent RBAC**: Role-based access control for independent AI agents
- **Full Observability**: Structured logging, metrics, and health checks

### Gate Pipeline
```
architect → implementer → reviewer-a → operator → reviewer-b
   (design)    (build)       (QA)      (deploy)   (validate)
```

### Agent System
MC2 uses independent AI agents with strict role-based permissions:

| Role | Purpose | Allowed Tools |
|------|---------|---------------|
| **Architect** | Design & spec | read, write(docs), web_search |
| **Implementer** | Code & tests | read, write(src), edit, exec(test) |
| **Reviewer-A** | QA validation | read, exec(test), browser |
| **Operator** | Deployment | read, exec(deploy) |
| **Reviewer-B** | Prod validation | read, browser, exec(health) |

See [Agent System Overview](docs/AGENT_SYSTEM_OVERVIEW.md) for details.

### Tech Stack
- **Framework**: Next.js 16 + React 19
- **Database**: PostgreSQL + Prisma
- **UI**: Tailwind CSS + shadcn/ui + Material Design 3
- **Testing**: Vitest + React Testing Library
- **Language**: TypeScript 5

## Project Structure

```
src/
  app/                    # Next.js App Router
    api/v1/              # REST API endpoints
    stories/             # Story board UI
    deploy/              # Deployment control UI
  components/            # React components
    ui/                  # shadcn/ui components
  domain/                # Core domain logic
    workflow-types.ts    # State machine types
    state-machine.ts     # Gate transition logic
    story.ts            # Story entity
    gate-contracts.ts   # Evidence validation
  services/              # Application services
    dispatch-service.ts  # Story dispatch
    deploy-control.ts    # Deployment & rollback
    notifications.ts     # Slack/email alerts
  lib/                   # Infrastructure
    prisma.ts           # Database client
    utils.ts            # Utilities
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/stories` | GET, POST | List/create stories |
| `/api/v1/stories` | PATCH | Approve requirements |
| `/api/v1/orchestration/dispatch` | POST | Dispatch story to gate |
| `/api/v1/health` | GET | System health check |

## Environment Variables

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/mc2"
NEXT_PUBLIC_API_URL="http://localhost:3000"
SLACK_WEBHOOK_URL=""  # Optional
```

## Documentation

- **[Quick Start](docs/DEVELOPER_GUIDE.md#quick-start)** - Get running in 5 minutes
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Architecture, workflow, API development
- **[User Guide](docs/USER_GUIDE.md)** - Using Mission Control (stories, gates, deployments)
- **[Agent System](docs/AGENT_SYSTEM_OVERVIEW.md)** - Agent personas, permissions, RBAC
- **[Agent Roles](docs/AGENT_ROLES.md)** - Detailed role definitions and permissions matrix
- **[Architecture](docs/ARCHITECTURE.md)** - Clean architecture principles
- **[Deployment](docs/DEPLOYMENT.md)** - Dev/QA/Prod environments
- **[Deployment Testing](docs/DEPLOYMENT_TESTING.md)** - Validation procedures
- [Requirements](docs/MISSION_CONTROL_2_0_REQUIREMENTS.md)
- [API Contract](docs/API_CONTRACT.md)
- [DB Schema](docs/DB_SCHEMA_V1.md)

## Quick Reference

```bash
# Setup
./scripts/setup.sh

# Dev
docker compose up -d db && npm run dev

# Test all environments
./scripts/exercise-environments.sh

# Deploy production (MANUAL)
./scripts/deploy-production.sh

# API smoke tests
./scripts/test-api.sh
```

## Model Routing (Current)

| Lane | Model | Through |
|------|-------|---------|
| Architect | Kimi 2.5 | Mar 22 |
| Implementer | MiniMax 2.5 | Current |
| Reviewer | MiniMax/Kimi | Current |
| Escalation | Codex | On demand |

## License

MIT
