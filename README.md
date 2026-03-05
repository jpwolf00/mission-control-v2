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
- **Full Observability**: Structured logging, metrics, and health checks

### Gate Pipeline
```
architect → implementer → reviewer-a → operator → reviewer-b
   (design)    (build)       (QA)      (deploy)   (validate)
```

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

- [Requirements](docs/MISSION_CONTROL_2_0_REQUIREMENTS.md)
- [Architecture](docs/MISSION_CONTROL_2_0_DECOMPOSITION_DRAFT.md)
- [Material UI Scaffold](docs/MC2_MATERIAL_UI_SCAFFOLD.md)
- [API Contract](docs/API_CONTRACT.md)
- [DB Schema](docs/DB_SCHEMA_V1.md)

## Model Routing (Current)

| Lane | Model | Through |
|------|-------|---------|
| Architect | Kimi 2.5 | Mar 22 |
| Implementer | MiniMax 2.5 | Current |
| Reviewer | MiniMax/Kimi | Current |
| Escalation | Codex | On demand |

## License

MIT
