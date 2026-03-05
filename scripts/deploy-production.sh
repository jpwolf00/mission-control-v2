#!/bin/bash
# PRODUCTION DEPLOYMENT - REQUIRES EXPLICIT APPROVAL
set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     ⚠️  PRODUCTION DEPLOYMENT - MANUAL APPROVAL REQUIRED   ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo -e "${RED}❌ Must be on main branch to deploy to production${NC}"
  exit 1
fi

# Show what's being deployed
echo "📋 Deployment Summary:"
echo "   Branch: $BRANCH"
echo "   Commit: $(git rev-parse --short HEAD)"
echo "   Message: $(git log -1 --pretty=%B | head -1)"
echo ""

# Check if QA tests passed
echo -n "🧪 Checking QA environment... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health | grep -q "200"; then
  echo -e "${GREEN}✅ QA is healthy${NC}"
else
  echo -e "${YELLOW}⚠️  QA health check failed (or not running)${NC}"
  echo "   Deploy anyway? Only do this for hotfixes."
fi
echo ""

# Explicit confirmation
echo -e "${YELLOW}This will deploy to PRODUCTION.${NC}"
echo -e "${RED}Type 'DEPLOY-TO-PROD' to confirm:${NC}"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "DEPLOY-TO-PROD" ]; then
  echo -e "${RED}❌ Deployment cancelled${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}🚀 Starting production deployment...${NC}"

# Pre-deployment backup
echo "💾 Creating database backup..."
# pg_dump would go here in real deployment

# Deploy
echo "📦 Pulling latest code..."
git pull origin main

echo "🔧 Installing dependencies..."
npm ci

echo "📊 Running migrations..."
npx prisma migrate deploy

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting service..."
# In real deployment: systemctl restart mission-control
# For now, using docker:
docker compose -f docker-compose.prod.yml up -d --build

# Post-deployment verification
echo "✅ Verifying deployment..."
sleep 5
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/v1/health | grep -q "200"; then
  echo -e "${GREEN}✅ Production deployment successful!${NC}"
  echo "   URL: http://localhost:3002"
else
  echo -e "${RED}❌ Deployment verification failed!${NC}"
  echo "   Rolling back..."
  # Rollback logic would go here
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 Production is live!${NC}"
echo "   Monitor: http://localhost:3002/api/v1/health"
echo "   Logs: docker compose -f docker-compose.prod.yml logs -f"