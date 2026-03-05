#!/bin/bash
# Exercise all three deployment environments
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 MC2 Multi-Environment Deployment Exercise           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# STEP 1: Dev Environment
# ============================================
echo -e "${BLUE}[1/4] Starting Dev Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! docker compose ps | grep -q "mc2-db"; then
  echo "🐳 Starting dev database..."
  docker compose up -d db
  sleep 3
fi

echo "✅ Dev database ready"
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
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health | grep -q "200"; then
    break
  fi
  sleep 1
done

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health | grep -q "200"; then
  echo -e "${GREEN}✅ QA deployment successful${NC}"
  echo "   URL: http://localhost:3001"
  echo "   Health: http://localhost:3001/api/v1/health"
else
  echo "❌ QA deployment failed"
  exit 1
fi
echo ""

# ============================================
# STEP 3: QA Testing
# ============================================
echo -e "${BLUE}[3/4] Running QA Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

export NEXT_PUBLIC_API_URL="http://localhost:3001"

# Run API tests against QA
echo "🧪 Testing QA API..."

# Health check
echo -n "  Health check... "
if curl -s http://localhost:3001/api/v1/health | grep -q "healthy"; then
  echo -e "${GREEN}✅${NC}"
else
  echo "❌"
  exit 1
fi

# Create test story
echo -n "  Create story... "
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/stories \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Test","description":"Test in QA","priority":"medium"}')
if echo "$CREATE_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✅${NC}"
else
  echo "❌"
  exit 1
fi

# List stories
echo -n "  List stories... "
if curl -s http://localhost:3001/api/v1/stories | grep -q "stories"; then
  echo -e "${GREEN}✅${NC}"
else
  echo "❌"
  exit 1
fi

echo ""
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
echo "QA deployment verified and tested."
echo "To deploy to production, run:"
echo ""
echo "  ./scripts/deploy-production.sh"
echo ""
echo "This will:"
echo "  1. Require explicit 'DEPLOY-TO-PROD' confirmation"
echo "  2. Create database backup"
echo "  3. Deploy to http://localhost:3002"
echo "  4. Run health verification"
echo "  5. Auto-rollback on failure"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Dev:  http://localhost:3000 (manual)${NC}"
echo -e "${GREEN}  QA:   http://localhost:3001 ✅ Ready${NC}"
echo -e "${GREEN}  Prod: http://localhost:3002 (awaiting approval)${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  ✅ Dev database running"
echo "  ✅ QA deployed and tested"
echo "  ⏳ Production ready for manual deployment"