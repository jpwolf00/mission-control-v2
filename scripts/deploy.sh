#!/bin/bash
set -e

echo "🚀 Deploying Mission Control 2.0..."

# Check environment
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

# Pull latest
git pull origin main

# Install dependencies
npm ci

# Run migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build application
echo "🔨 Building application..."
npm run build

# Restart service
echo "🔄 Restarting service..."
systemctl restart mission-control || docker compose up -d

echo "✅ Deployment complete!"
echo "Health check: http://localhost:3000/api/v1/health"