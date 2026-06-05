#!/bin/bash
set -e

echo "========================================="
echo "3 BOXES LUXURY - Vercel Build"
echo "========================================="
echo "Node: $(node --version)"
echo "NPM: $(npm --version 2>/dev/null || echo 'N/A')"
echo "Bun: $(bun --version 2>/dev/null || echo 'N/A')"
echo "DATA_SOURCE: ${DATA_SOURCE:-not set}"
echo "POSTGRES_PRISMA_URL: ${POSTGRES_PRISMA_URL:+set}${POSTGRES_PRISMA_URL:-not set}"
echo "========================================="

# Step 1: Switch Prisma to PostgreSQL provider (Vercel requires PostgreSQL)
echo ""
echo "📋 Step 1: Switching Prisma to PostgreSQL provider..."
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma
echo "✅ Prisma provider switched to PostgreSQL"

# Step 2: Set up database URL based on environment
if [ "${DATA_SOURCE:-}" = "shopify" ]; then
  echo ""
  echo "🛍️ DATA_SOURCE=shopify — Using Shopify-only mode (no database dependency)"
  export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
  # Hardcode the URL in schema so Prisma doesn't need env var at build time
  sed -i 's|url      = env("DATABASE_URL")|url      = "postgresql://user:password@localhost:5432/mydb"|g' prisma/schema.prisma
  echo "✅ Shopify-only mode configured"
elif [ -n "${POSTGRES_PRISMA_URL:-}" ] && echo "${POSTGRES_PRISMA_URL}" | grep -q "^postgres"; then
  echo ""
  echo "🗄️ PostgreSQL database detected"
  export DATABASE_URL="$POSTGRES_PRISMA_URL"
  sed -i "s|url      = env(\"DATABASE_URL\")|url      = \"$POSTGRES_PRISMA_URL\"|g" prisma/schema.prisma
  echo "✅ PostgreSQL database configured"
else
  echo ""
  echo "⚠️ No database configured — using Shopify fallback mode"
  export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
  # Hardcode the URL in schema so Prisma doesn't need env var at build time
  sed -i 's|url      = env("DATABASE_URL")|url      = "postgresql://user:password@localhost:5432/mydb"|g' prisma/schema.prisma
  echo "✅ Fallback mode configured"
fi

# Step 3: Generate Prisma client
echo ""
echo "📋 Step 2: Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

# Step 4: Build Next.js
echo ""
echo "📋 Step 3: Building Next.js application..."
npx next build
echo "✅ Next.js build complete"

echo ""
echo "========================================="
echo "🏆 BUILD SUCCESSFUL"
echo "========================================="
