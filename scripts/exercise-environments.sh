#!/bin/bash
# Exercise all three deployment environments
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 MC2 Multi-Environment Deployment Exercise           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check .env
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file not found, creating from example...${NC}"
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${YELLOW}   Please edit .env and set DB_PASSWORD, then re-run${NC}"
    exit 1
  else
    echo -e "${RED}❌ .env.example not found${NC}"
    exit 1
  fi
fi

source .env

# ============================================
# STEP 1: Dev Environment
# ============================================
echo -e "${BLUE}[1/4] Starting Dev Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! docker compose ps 2>/dev/null | grep -q "mc2-db"; then
  echo "🐳 Starting dev database..."
  docker compose up -d db
  sleep 3
fi

echo -e "${GREEN}✅ Dev database ready${NC}"
echo "   Port: 5432"
echo "   URL: http://localhost:3000 (manual: npm run dev)"
echo ""

# ============================================
# STEP 2: QA Deployment
# ============================================
echo -e "${BLUE}[2/4] Deploying to QA${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "🐳 Starting QA environment..."
docker compose -f docker-compose.qa.yml up -d --build

echo "⏳ Waiting for QA to be ready..."
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null | grep -q "200"; then
    break
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null | grep -q "200"; then
  echo -e "${GREEN}✅ QA deployment successful (${WAITED}s)${NC}"
  echo "   URL: http://localhost:3001"
  echo "   Health: http://localhost:3001/api/v1/health"
else
  echo -e "${RED}❌ QA deployment failed (timeout after ${MAX_WAIT}s)${NC}"
  docker compose -f docker-compose.qa.yml logs app-qa | tail -20
  exit 1
fi
echo ""

# ============================================
# STEP 3: QA Testing (MANDATORY)
# ============================================
echo -e "${BLUE}[3/4] Running QA Tests (MANDATORY)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export NEXT_PUBLIC_API_URL="http://localhost:3001"

# Run API tests against QA
echo "🧪 Testing QA API..."
TEST_FAILED=0

# Health check
echo -n "  Health check... "
if curl -s http://localhost:3001/api/v1/health 2>/dev/null | grep -q "healthy"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
  TEST_FAILED=1
fi

# Create test story
echo -n "  Create story... "
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/stories \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Test","description":"Test in QA","priority":"medium"}' 2>/dev/null)
if echo "$CREATE_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
  TEST_FAILED=1
fi

# List stories
echo -n "  List stories... "
if curl -s http://localhost:3001/api/v1/stories 2>/dev/null | grep -q "stories"; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
  TEST_FAILED=1
fi

echo ""
if [ $TEST_FAILED -eq 1 ]; then
  echo -e "${RED}❌ QA tests FAILED${NC}"
  echo "   Production deployment BLOCKED"
  exit 1
fi

echo -e "${GREEN}✅ All QA tests passed!${NC}"
echo ""

# ============================================
# STEP 4: Production Readiness
# ============================================
echo -e "${YELLOW}[4/4] Production Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  PRODUCTION DEPLOYMENT REQUIRES MANUAL APPROVAL${NC}"
echo ""
echo "✅ QA deployment verified and tested"
echo "✅ All QA tests passed"
echo ""
echo "To deploy to production, run:"
echo ""
echo "  ${GREEN}./scripts/deploy-production.sh${NC}"
echo ""
echo "This will:"
echo "  1. Require explicit 'DEPLOY-TO-PROD' confirmation"
echo "  2. Create database backup (pg_dump)"
echo "  3. Deploy to http://localhost:3002"
echo "  4. Run health verification (5 retries, 15s wait)"
echo "  5. Auto-rollback on failure (DB + app)"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Dev:  http://localhost:3000 (manual)${NC}"
echo -e "${GREEN}  QA:   http://localhost:3001 ✅ TESTED${NC}"
echo -e "${GREEN}  Prod: http://localhost:3002 (awaiting approval)${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  ✅ Dev database running"
echo "  ✅ QA deployed and tested"
echo "  ⏳ Production ready (run deploy-production.sh)"