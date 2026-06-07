#!/usr/bin/env node
/**
 * Swaps the Prisma provider from SQLite to PostgreSQL for Vercel deployment.
 * This is needed because Vercel doesn't support SQLite, and we use PostgreSQL
 * (e.g., Neon, Supabase) in production.
 *
 * Usage: node scripts/swap-prisma-provider.js
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

try {
  let schema = fs.readFileSync(schemaPath, 'utf8');

  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('✅ Prisma provider swapped: SQLite → PostgreSQL');
  } else if (schema.includes('provider = "postgresql"')) {
    console.log('ℹ️  Prisma provider already set to PostgreSQL — no change needed');
  } else {
    console.warn('⚠️  Could not find provider line in schema.prisma');
  }
} catch (error) {
  console.error('❌ Failed to swap Prisma provider:', error.message);
  process.exit(1);
}
