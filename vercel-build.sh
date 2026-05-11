#!/bin/bash
# Vercel Build Script for 3 BOXES LUXURY
# This script switches Prisma from SQLite to PostgreSQL for Vercel's serverless environment

set -e

echo "🔧 Vercel Build: Switching Prisma to PostgreSQL provider..."

# Switch the Prisma schema provider from sqlite to postgresql
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

echo "🔧 Running prisma generate..."
npx prisma generate

echo "🔧 Building Next.js application..."
npx next build

echo "✅ Vercel build complete!"
