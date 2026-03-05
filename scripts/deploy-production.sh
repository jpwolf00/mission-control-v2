#!/bin/bash
# PRODUCTION DEPLOYMENT - REQUIRES EXPLICIT APPROVAL
set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
ROLLBACK_TAG="rollback-$(date +%Y%m%d-%H%M%S)"
COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║     ⚠️  PRODUCTION DEPLOYMENT - MANUAL APPROVAL REQUIRED   ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify .env exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  echo "   Copy .env.example to .env and configure real values"
  exit 1
fi

# Verify DB_PASSWORD is set
source .env
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "change_me_in_production" ]; then
  echo -e "${RED}❌ DB_PASSWORD not configured in .env${NC}"
  exit 1
fi

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

# Pre-deployment QA check (MANDATORY)
echo -n "🧪 Checking QA environment... "
QA_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health 2>/dev/null || echo "000")
if [ "$QA_HEALTH" = "200" ]; then
  echo -e "${GREEN}✅ QA is healthy${NC}"
else
  echo -e "${RED}❌ QA health check failed (HTTP $QA_HEALTH)${NC}"
  echo "   Production deployment blocked until QA passes"
  exit 1
fi
echo ""

# Create backup
echo "💾 Creating database backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d-%H%M%S).sql"

if docker compose -f $COMPOSE_FILE ps | grep -q db-prod; then
  echo "   Dumping production database..."
  docker compose -f $COMPOSE_FILE exec -T db-prod pg_dump -U mc2 mission_control_prod > "$BACKUP_FILE"
  echo -e "${GREEN}   ✅ Backup created: $BACKUP_FILE${NC}"
  
  # Tag current deployment for rollback
  echo "   Tagging current deployment..."
  docker tag mission-control-v2-app-prod:latest mission-control-v2-app-prod:$ROLLBACK_TAG 2>/dev/null || true
else
  echo -e "${YELLOW}   ⚠️  Production DB not running (first deploy)${NC}"
fi
echo ""

# Explicit confirmation
echo -e "${YELLOW}This will deploy to PRODUCTION.${NC}"
echo "Backup location: $BACKUP_FILE"
echo ""
echo -e "${RED}Type 'DEPLOY-TO-PROD' to confirm:${NC}"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "DEPLOY-TO-PROD" ]; then
  echo -e "${RED}❌ Deployment cancelled${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo ""
echo -e "${GREEN}🚀 Starting production deployment...${NC}"

# Deploy
echo "📦 Pulling latest code..."
git pull origin main

echo "🔧 Installing dependencies..."
npm ci

echo "📊 Running migrations..."
npx prisma migrate deploy

echo "🔨 Building application..."
npm run build

echo "🔄 Deploying to production..."
docker compose -f $COMPOSE_FILE up -d --build

# Post-deployment verification
echo "⏳ Waiting for production to be ready (15s)..."
sleep 15

echo "✅ Verifying deployment..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/v1/health | grep -q "200"; then
    echo -e "${GREEN}✅ Production deployment successful!${NC}"
    echo "   URL: http://localhost:3002"
    echo "   Backup: $BACKUP_FILE"
    echo ""
    echo -e "${GREEN}🎉 Production is live!${NC}"
    exit 0
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "   Health check failed, retrying ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 5
  fi
done

# Deployment failed - initiate rollback
echo -e "${RED}❌ Deployment verification failed!${NC}"
echo "   Initiating rollback..."
echo ""

if [ -f "$BACKUP_FILE" ]; then
  echo "🔄 Rolling back database..."
  docker compose -f $COMPOSE_FILE exec -T db-prod psql -U mc2 -d mission_control_prod < "$BACKUP_FILE"
  echo -e "${GREEN}   ✅ Database restored${NC}"
fi

echo "🔄 Rolling back application..."
docker compose -f $COMPOSE_FILE down
if docker images | grep -q "mission-control-v2-app-prod.*$ROLLBACK_TAG"; then
  docker tag mission-control-v2-app-prod:$ROLLBACK_TAG mission-control-v2-app-prod:latest
  docker compose -f $COMPOSE_FILE up -d
  echo -e "${GREEN}   ✅ Application rolled back${NC}"
else
  echo -e "${YELLOW}   ⚠️  No previous image to roll back to${NC}"
fi

echo ""
echo -e "${RED}❌ Deployment failed and was rolled back${NC}"
exit 1