#!/bin/bash
set -e

echo "🚀 Setting up Mission Control 2.0..."

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 20+"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. Found: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo "⚙️ Setting up environment..."
if [ ! -f .env.local ]; then
  cat > .env.local << EOF
DATABASE_URL="postgresql://mc2:mc2password@localhost:5432/mission_control"
NEXT_PUBLIC_API_URL="http://localhost:3000"
EOF
  echo "✅ Created .env.local"
else
  echo "⚠️ .env.local already exists, skipping"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL: docker compose up -d db"
echo "2. Run migrations: npx prisma migrate dev"
echo "3. Start dev server: npm run dev"
echo "4. Open http://localhost:3000"