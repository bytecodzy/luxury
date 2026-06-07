# 3 BOXES LUXURY — Deployment Strategy Documentation

> **Comprehensive deployment guide for the 3boxes.in luxury e-commerce platform.**
> Covers both cloud (Vercel) and local environments with prerequisites, step-by-step instructions, and operational runbooks.
> Last updated: March 2026 | Version: 1.2

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup-step-by-step)
3. [Vercel Deployment](#3-vercel-deployment-step-by-step)
4. [Database Strategy](#4-database-strategy)
5. [Mini-Services Deployment](#5-mini-services-deployment)
6. [Shopify Integration Setup](#6-shopify-integration-setup)
7. [AI Services Setup](#7-ai-services-setup)
8. [Email Service Setup](#8-email-service-setup)
9. [Security Configuration](#9-security-configuration)
10. [PWA Configuration](#10-pwa-configuration)
11. [Monitoring & Maintenance](#11-monitoring--maintenance)
12. [Troubleshooting](#12-troubleshooting)
13. [Rollback Strategy](#13-rollback-strategy)
14. [Performance Optimization](#14-performance-optimization)

---

## 1. Prerequisites

### 1.1 Development Environment

Every developer contributing to 3 BOXES LUXURY must have the following tools installed and configured on their workstation:

| Tool | Minimum Version | Purpose | Installation |
|------|----------------|---------|--------------|
| **Node.js** | 20.x LTS | Runtime for Next.js, build scripts, and server-side rendering | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| **Bun** | 1.1+ | Fast JavaScript runtime and package manager (primary for this project) | `curl -fsSL https://bun.sh/install \| bash` |
| **Git** | 2.40+ | Version control | System package manager |
| **VS Code** | Latest | Recommended IDE with integrated terminal | [code.visualstudio.com](https://code.visualstudio.com) |

#### VS Code Recommended Extensions

Install the following extensions for optimal development experience:

```
- bradlc.vscode-tailwindcss         (Tailwind CSS IntelliSense)
- prisma.prisma                      (Prisma schema highlighting)
- esbenp.prettier-vscode             (Code formatting)
- dbaeumer.vscode-eslint             (JavaScript/TypeScript linting)
- ms-vscode.vscode-typescript-next   (TypeScript nightly)
- formulahendry.auto-rename-tag      (HTML tag renaming)
- yoavbls.pretty-ts-errors           (Readable TypeScript errors)
```

#### Required Accounts

| Account | Purpose | URL |
|---------|---------|-----|
| **Shopify Partner** | Access to Shopify Admin API, store management | [partners.shopify.com](https://partners.shopify.com) |
| **HuggingFace** | IDM-VTON virtual try-on Space access | [huggingface.co](https://huggingface.co) |
| **Gmail** | SMTP email delivery (or custom SMTP) | mail.google.com |
| **GitHub** | Repository hosting, CI/CD integration | github.com |

---

### 1.2 Cloud Environment (Vercel)

The production deployment targets Vercel's serverless infrastructure, optimized for Next.js applications.

| Requirement | Details | Notes |
|-------------|---------|-------|
| **Vercel Account** | Pro plan recommended | Free plan limits serverless functions to 10s timeout; AI try-on requires up to 120s |
| **PostgreSQL Database** | Neon, Supabase, or Vercel Postgres | Required for orders, users, sessions, and corporate portal |
| **Domain Name** | `3boxes.in` | Configured via Vercel DNS |
| **SSL Certificate** | Auto-provisioned by Vercel | Let's Encrypt, auto-renewed |
| **Shopify Store** | `3boxesluxury-2.myshopify.com` | Admin API access with `shpat_` token |
| **HuggingFace API Token** | `hf_` prefixed token | For IDM-VTON Gradio Space communication |
| **ZAI API Credentials** | API key + chat ID + user token | For Z-AI SDK (VLM, image generation) |

#### Vercel Plan Considerations

| Feature | Hobby (Free) | Pro ($20/mo) | Enterprise |
|---------|-------------|--------------|-----------|
| Serverless Function Duration | 10s | 60s (configurable to 300s) | 900s |
| Bandwidth | 100 GB | 1 TB | Custom |
| Build Time | 6,000 min/mo | 20,000 min/mo | Custom |
| Concurrent Builds | 1 | 3 | Custom |
| Edge Functions | 1M calls/mo | 10M calls/mo | Custom |

> **Critical:** The AI virtual try-on pipeline involves VLM analysis and image generation, which can take 30-120 seconds. The **Pro plan** (or higher) is required for reliable AI feature operation.

---

### 1.3 Local Environment

| Requirement | Specification | Notes |
|-------------|--------------|-------|
| **RAM** | 8 GB minimum, 16 GB recommended | Sharp image processing and AI features are memory-intensive |
| **Storage** | 2 GB free | Node modules, database, uploaded images |
| **SQLite** | Bundled with Prisma | No separate installation needed; file at `db/custom.db` |
| **Port 3000** | Available | Main Next.js development server |
| **Port 3030** | Available | AI proxy mini-service |
| **Port 3002** | Available | app-web secondary service (if used) |

#### Port Allocation Map

```
Port 3000  →  Next.js App (main application)
Port 3030  →  AI Proxy (mini-services/ai-proxy)
Port 3002  →  App Web (secondary web service)
Port 80/81 →  Caddy reverse proxy (production-like local setup)
```

---

## 2. Local Development Setup (Step-by-Step)

### 2.1 Clone the Repository

```bash
git clone <repository-url> /home/z/my-project
cd /home/z/my-project
```

### 2.2 Install Dependencies

```bash
bun install
```

This installs all npm dependencies using the Bun runtime. The project uses Bun as the primary package manager (referenced in `bun.lock`). If Bun is not available, you can fall back to:

```bash
npm install
```

> **Note:** The `postinstall` script automatically runs `prisma generate` to create the Prisma client.

### 2.3 Environment Variables Setup

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

If no `.env.example` exists, create `.env.local` with the following minimum configuration:

```env
# ─── Database (SQLite for local development) ───
DATABASE_URL="file:./db/custom.db"

# ─── Authentication ───
JWT_SECRET="3boxes-local-dev-secret-key-change-in-production"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# ─── Shopify (optional for local dev — fallback data) ───
SHOPIFY_STORE_DOMAIN="3boxesluxury-2.myshopify.com"
SHOPIFY_ADMIN_API_TOKEN="shpat_your_token_here"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your_storefront_token"
SHOPIFY_API_VERSION="2025-01"

# ─── AI Services ───
ZAI_BASE_URL="http://172.25.136.193:8080/v1"
ZAI_API_KEY="Z.ai"
ZAI_CHAT_ID="your-chat-id"
ZAI_TOKEN="your-zai-token"
ZAI_USER_ID="your-user-id"
HUGGINGFACE_API_TOKEN="hf_your_token_here"

# ─── Email (Gmail SMTP) ───
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="3 BOXES LUXURY <noreply@3boxes.in>"

# ─── Application ───
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
DATA_SOURCE="database"
```

### 2.4 Database Setup

Initialize the SQLite database and seed it with sample data:

```bash
# Push the Prisma schema to create tables
bun run db:push

# Seed the database with categories, products, and demo users
bun run db:seed
```

The seed script (`prisma/seed.ts`) creates:
- **7 parent categories** (Couple, Men, Women, Kids, Home, Office, New Arrivals)
- **18 subcategories** with hierarchy relationships
- **50+ products** across all categories with realistic luxury product data
- **5 demo users** (admin, user, agent, team, corporate)
- **Currency rates** for multi-currency support

### 2.5 Running the Development Server

```bash
# Primary method
bun run dev

# Alternative
npx next dev -p 3000
```

The dev server starts at `http://localhost:3000` with hot module replacement (HMR).

### 2.6 Running Mini-Services

The AI proxy service runs separately from the main application:

```bash
# Start the AI proxy on port 3030
cd mini-services/ai-proxy
npx tsx index.ts
```

Or start all services together using the provided script:

```bash
bash start-services.sh
```

This script starts:
1. Next.js dev server on port 3000
2. AI proxy on port 3030

For a production-like local setup with Caddy reverse proxy:

```bash
# Install Caddy (Ubuntu/Debian)
sudo apt install caddy

# Copy the Caddyfile from the project root
sudo cp Caddyfile /etc/caddy/Caddyfile

# Start Caddy
sudo systemctl start caddy
```

The Caddyfile routes:
- `/api/try-on*` → `localhost:3030` (AI proxy)
- `?XTransformPort=*` → `localhost:{port}` (dynamic port proxy)
- All other requests → `localhost:3000` (Next.js app)

### 2.7 Testing the Application

```bash
# Verify the home page loads
curl http://localhost:3000

# Check the products API
curl http://localhost:3000/api/products

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@3boxesluxury.com","password":"admin123"}'

# Check AI try-on availability
curl http://localhost:3000/api/try-on/status
```

### 2.8 Common Local Development Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `prisma: command not found` | Prisma CLI not in PATH | Run `npx prisma` instead, or `bun add -g prisma` |
| `Database file not found` | Missing `db/` directory | Create it: `mkdir -p db` and re-run `bun run db:push` |
| Port 3000 already in use | Another process on port | `lsof -i :3000` then `kill -9 <PID>` |
| HMR not working | File watching limit | `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |
| AI proxy connection refused | Proxy not started | Start with `cd mini-services/ai-proxy && npx tsx index.ts` |
| Image loading 404s | Missing product images | Run `node generate-images.ts` to generate placeholder images |
| SQLite locking errors | Concurrent writes | Use WAL mode or ensure single writer |
| `bcryptjs` native error | Architecture mismatch | Delete `node_modules` and re-run `bun install` |

---

## 3. Vercel Deployment (Step-by-Step)

### 3.1 Project Setup on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link the project (run from project root)
cd /home/z/my-project
vercel link
```

Follow the prompts to connect to an existing project or create a new one.

### 3.2 Environment Variable Configuration

Set all environment variables through the Vercel CLI or Dashboard (Project → Settings → Environment Variables):

```bash
# ─── Database (REQUIRED) ───
vercel env add DATABASE_URL production
# Value: postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require

vercel env add POSTGRES_PRISMA_URL production
# Value: same as DATABASE_URL (used by vercel-build.sh)

# ─── Shopify (REQUIRED) ───
vercel env add SHOPIFY_STORE_DOMAIN production
# Value: 3boxesluxury-2.myshopify.com

vercel env add SHOPIFY_ADMIN_API_TOKEN production
# Value: shpat_your_admin_token

vercel env add SHOPIFY_API_VERSION production
# Value: 2025-01

# ─── Authentication (REQUIRED) ───
vercel env add JWT_SECRET production
# Value: <generate with: openssl rand -hex 32>

vercel env add ENCRYPTION_KEY production
# Value: <generate with: openssl rand -hex 32>

# ─── AI Services ───
vercel env add ZAI_PROXY_URL production
# Value: https://your-ai-proxy.example.com (public URL)

vercel env add ZAI_API_KEY production
vercel env add ZAI_CHAT_ID production
vercel env add ZAI_TOKEN production
vercel env add ZAI_USER_ID production

vercel env add HUGGINGFACE_API_TOKEN production
# Value: hf_your_token

# ─── Email ───
vercel env add SMTP_HOST production
vercel env add SMTP_PORT production
vercel env add SMTP_SECURE production
vercel env add SMTP_USER production
vercel env add SMTP_PASS production
vercel env add SMTP_FROM production

# ─── Application ───
vercel env add NEXT_PUBLIC_APP_URL production
# Value: https://3boxes.in

vercel env add NEXT_PUBLIC_BASE_URL production
# Value: https://3boxes.in

vercel env add DATA_SOURCE production
# Value: shopify (recommended) or database
```

### 3.3 Build Configuration

The project uses a custom build script defined in `vercel.json`:

```json
{
  "framework": "nextjs"
}
```

The actual build logic is in `vercel-build.sh`, which handles:
1. Switching Prisma from SQLite to PostgreSQL provider (`sed` replacement)
2. Detecting `POSTGRES_PRISMA_URL` to determine if a real database is available
3. Running `prisma generate` to create the Prisma client
4. Running `next build` to compile the Next.js application

The `package.json` also contains fallback build scripts:

```json
{
  "scripts": {
    "build": "node -e \"const fs=require('fs');const s=fs.readFileSync('prisma/schema.prisma','utf8');fs.writeFileSync('prisma/schema.prisma',s.replace('provider = \\\"sqlite\\\"','provider = \\\"postgresql\\\"'))\" && prisma generate && next build",
    "vercel-build": "node -e \"const fs=require('fs');const s=fs.readFileSync('prisma/schema.prisma','utf8');fs.writeFileSync('prisma/schema.prisma',s.replace('provider = \\\"sqlite\\\"','provider = \\\"postgresql\\\"'))\" && prisma generate && next build"
  }
}
```

### 3.4 Serverless Function Timeouts

AI-related API routes require extended timeouts. Configure in `vercel.json`:

```json
{
  "functions": {
    "src/app/api/try-on/route.ts": {
      "maxDuration": 120
    },
    "src/app/api/ai-proxy/route.ts": {
      "maxDuration": 120
    },
    "src/app/api/try-on/analyze-selfie/route.ts": {
      "maxDuration": 60
    }
  }
}
```

> **Note:** `maxDuration` values above 60s require Vercel Pro plan.

### 3.5 Output File Tracing Excludes

For large dependencies that should not be bundled into serverless functions:

```json
{
  "experimental": {
    "outputFileTracingExcludes": {
      "*/api/try-on/**": [
        "node_modules/@gradio/client/dist",
        "node_modules/sharp/vendor"
      ]
    }
  }
}
```

### 3.6 PostgreSQL Migration

The build script automatically handles schema migration:

```bash
# If POSTGRES_PRISMA_URL is a valid postgresql:// URL:
prisma db push --accept-data-loss   # Push schema (no migration history)
npx tsx prisma/seed.ts              # Seed with initial data
```

For production databases with existing data, prefer proper migrations:

```bash
# Create a named migration
npx prisma migrate dev --name init_postgres

# Apply migrations in production
npx prisma migrate deploy
```

### 3.7 Domain Configuration (3boxes.in)

```bash
# Add domain to Vercel project
vercel domains add 3boxes.in

# Add DNS records at your domain registrar:
# Type: CNAME, Name: @, Value: cname.vercel-dns.com
# Type: CNAME, Name: www, Value: cname.vercel-dns.com

# Verify domain
vercel domains verify 3boxes.in
```

### 3.8 SSL Setup

Vercel automatically provisions SSL certificates via Let's Encrypt. No manual configuration is required. Certificates are auto-renewed before expiration.

### 3.9 CDN and Image Optimization

Vercel's Edge Network provides:
- **Global CDN** with 100+ PoPs
- **Automatic image optimization** via `next/image` component
- **Static asset caching** with immutable headers for hashed filenames

The `next.config.ts` allows all remote image patterns:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
},
```

### 3.10 Deployment Hooks and CI/CD

```bash
# Manual deployment
vercel --prod

# Create a deployment hook for CI/CD
vercel deploy --prod --token=$VERCEL_TOKEN

# GitHub Actions integration example:
# .github/workflows/deploy.yml
```

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm i -g vercel
      - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
```

### 3.11 Monitoring and Logging

- **Vercel Dashboard** → Project → Deployments → View Function Logs
- **Runtime Logs** → Project → Settings → Logging → Enable
- **Real-time logs** via Vercel CLI: `vercel logs --follow`

---

## 4. Database Strategy

### 4.1 Local: SQLite

#### Prisma Schema Configuration

The default `prisma/schema.prisma` uses SQLite:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

With `.env.local`:
```env
DATABASE_URL="file:./db/custom.db"
```

#### Migration Commands

```bash
# Push schema changes to SQLite (no migration history)
bun run db:push

# Reset the database completely
bun run db:reset

# Generate Prisma client after schema changes
bun run db:generate
```

#### Seeding Data

```bash
bun run db:seed
```

The seed script creates:
- 7 parent categories with 18 subcategories
- 50+ luxury products with realistic descriptions and pricing
- Product variants and images
- Currency exchange rates
- Geo-country mappings

#### Demo Users

| Email | Password | Role | Use Case |
|-------|----------|------|----------|
| `admin@3boxesluxury.com` | `admin123` | admin | Full admin dashboard access |
| `user@3boxesluxury.com` | `user123` | user | Standard customer |
| `agent@3boxesluxury.com` | `agent123` | agent | Support agent |
| `team@3boxesluxury.com` | `team123` | team | Internal team member |
| `corporate@3boxesluxury.com` | `corporate123` | corporate | Corporate gifting portal |

---

### 4.2 Production: PostgreSQL

#### Migration from SQLite to PostgreSQL

The `vercel-build.sh` script handles the provider switch automatically:

```bash
# Step 1: Replace provider in schema
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Step 2: If POSTGRES_PRISMA_URL is set, configure real database
export DATABASE_URL="$POSTGRES_PRISMA_URL"

# Step 3: Generate Prisma client for PostgreSQL
npx prisma generate

# Step 4: Push schema and seed
npx prisma db push --accept-data-loss
npx tsx prisma/seed.ts
```

#### Connection Pooling

For serverless environments, use connection pooling to avoid exhausting database connections:

| Provider | Connection Pooling | Connection String Format |
|----------|--------------------|------------------------|
| **Neon** | Built-in via `@neondatabase/serverless` | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| **Supabase** | PgBouncer on port 6543 | `postgresql://user:pass@db.supabase.co:6543/postgres` |
| **Vercel Postgres** | Built-in via `@vercel/postgres` | Auto-configured |

Configure Prisma for pooled connections:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // For migrations (non-pooled)
}
```

#### Prisma Configuration Changes

Key differences between SQLite and PostgreSQL in the schema:

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Provider | `"sqlite"` | `"postgresql"` |
| URL | `file:./db/custom.db` | `postgresql://...` |
| String lengths | No limit | No limit |
| JSON fields | Stored as `String` | Stored as `String` (parsed in app) |
| Full-text search | Not supported | Supported via `tsvector` |
| Enum types | Stored as `String` | Can use `enum` |
| Array fields | Stored as JSON `String` | Can use `String[]` |

#### Backup Strategy

| Method | Frequency | Retention | Tool |
|--------|-----------|-----------|------|
| **Neon PITR** | Continuous | 7 days (free), 30 days (pro) | Built-in |
| **Supabase Backups** | Daily | 7 days (free), 30 days (pro) | Built-in |
| **Manual pg_dump** | Before schema changes | Indefinite | `pg_dump -Fc > backup.dump` |
| **Vercel Postgres** | Daily | 7 days | Built-in |

```bash
# Manual backup
pg_dump "postgresql://user:pass@host/db" -Fc > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d "postgresql://user:pass@host/db" backup_20260301.dump
```

---

## 5. Mini-Services Deployment

### 5.1 AI Proxy Service Architecture

The AI proxy service (`mini-services/ai-proxy`) forwards requests to the internal ZAI service at `172.25.136.193:8080`. It acts as a secure gateway with allowlisted paths:

```
Allowed Paths:
  /chat/completions
  /chat/completions/vision
  /images/generations
  /images/generations/edit
  /audio/tts
  /audio/asr
  /video/generation
  /async-result
  /functions/invoke
```

### 5.2 How It Runs on Vercel vs Local

| Aspect | Local | Vercel (Cloud) |
|--------|-------|----------------|
| **Service type** | Separate process on port 3030 | Embedded API route at `/api/ai-proxy` |
| **Startup** | `npx tsx mini-services/ai-proxy/index.ts` | Automatic (serverless function) |
| **AI base URL** | `http://172.25.136.193:8080/v1` (direct) | `ZAI_PROXY_URL` (public proxy) |
| **Timeout** | No limit (long-running process) | 60-120s (configurable, Pro plan) |
| **Authentication** | Hardcoded config from `.z-ai-config` | Environment variables |
| **Scaling** | Single instance | Auto-scaling serverless |

### 5.3 Port Configuration and Caddy Proxy

The `Caddyfile` at the project root defines routing rules:

```
:81 {
    # AI try-on routes → port 3030
    @ai_tryon path /api/try-on*
    handle @ai_tryon {
        reverse_proxy localhost:3030
    }

    # Dynamic port proxy via XTransformPort query param
    @transform_port_query {
        query XTransformPort=*
    }
    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort}
    }

    # Default → Next.js on port 3000
    handle {
        reverse_proxy localhost:3000
    }
}
```

### 5.4 XTransformPort Gateway Mechanism

The `XTransformPort` query parameter enables dynamic port routing for specialized services. When a request includes `?XTransformPort=3030`, Caddy proxies the request to `localhost:3030`. This mechanism allows:

- Flexible service discovery without hardcoded routes
- Easy addition of new microservices on different ports
- Service isolation for debugging and development

---

## 6. Shopify Integration Setup

### 6.1 Shopify Partner Account Setup

1. Sign up at [partners.shopify.com](https://partners.shopify.com)
2. Create a development store (for testing)
3. Navigate to **Apps** → **Create custom app**

### 6.2 Store Configuration

| Setting | Value |
|---------|-------|
| Store Domain | `3boxesluxury-2.myshopify.com` |
| API Version | `2025-01` |
| Base URL | `https://3boxesluxury-2.myshopify.com/admin/api/2025-01` |
| Auth Header | `X-Shopify-Access-Token: shpat_xxxxx` |

### 6.3 Admin API Token Generation

1. Go to Shopify Admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. Click **Create custom app**
3. Configure API scopes:
   - `read_products`, `write_products`
   - `read_custom_collections`, `write_custom_collections`
   - `read_smart_collections`
   - `read_orders`, `write_orders`
   - `read_inventory`, `write_inventory`
4. Click **Install app** → Copy the Admin API access token (`shpat_...`)

### 6.4 Webhook Registration

Register webhooks to receive real-time updates:

```bash
# Register all required webhooks
curl -X POST https://3boxes.in/api/shopify/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl": "https://3boxes.in/api/shopify/webhooks"}'

# Check webhook status
curl https://3boxes.in/api/shopify/webhooks/register
```

**Registered webhook topics:**
- `orders/create`, `orders/updated`, `orders/cancelled`
- `products/create`, `products/update`, `products/delete`

### 6.5 Product Sync Configuration

The Shopify integration uses a **5-minute cache** for API responses with automatic fallback:

```
Products API Flow:
1. Try Prisma DB → If success, return DB products (source: "database")
2. If DB fails → Fetch from Shopify Admin API → Transform → Return (source: "shopify")
```

Product IDs from Shopify are prefixed with `shopify-` (e.g., `shopify-8765432109`) to avoid collisions with database products.

### 6.6 Category Mapping

The application maps 60+ Shopify product types to application categories:

| Shopify Product Type | Application Category |
|---------------------|---------------------|
| `jewelry`, `jewellery`, `fine jewellery` | Jewelry (`women-jewelry`) |
| `watches` | Watches (`men-watches`) |
| `sarees` | Sarees (`women-sarees`) |
| `men's shirts` | Men's Shirts (`men-shirts`) |
| `fragrances` | Fragrances (`men-fragrances` / `women-fragrances`) |
| `leather goods` | Leather (`men-leather`) |

---

## 7. AI Services Setup

### 7.1 HuggingFace

#### Account Creation

1. Sign up at [huggingface.co](https://huggingface.co)
2. Navigate to **Settings** → **Access Tokens**
3. Create a new token with `read` scope

#### API Token Generation

```bash
# Generate token at https://huggingface.co/settings/tokens
# Store as environment variable
export HUGGINGFACE_API_TOKEN="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### IDM-VTON Space Configuration

The virtual try-on feature communicates with HuggingFace Spaces running IDM-VTON:

```typescript
// Using @gradio/client
import { Client } from '@gradio/client';

const client = await Client.connect('username/idm-vton-space', {
  hf_token: process.env.HUGGINGFACE_API_TOKEN
});

const result = await client.predict('/predict', {
  human_img: base64Selfie,
  garm_img: base64Product,
  garment_des: productDescription,
  is_checked: true,
  is_checked_crop: false,
  denoise_steps: 30,
  seed: 42,
});
```

#### Rate Limits and Cold Start Handling

| Aspect | Free Tier | Pro Tier |
|--------|-----------|----------|
| Requests/minute | 2 | 10 |
| Cold start time | 30-120s | 10-30s |
| GPU availability | Shared | Priority |

**Cold start mitigation strategies:**
1. Implement a health check endpoint that pings the Space periodically
2. Display "warming up" status to users during cold starts
3. Use the `keep-alive.sh` script to periodically wake the Space:
   ```bash
   # keep-alive.sh - run via cron every 5 minutes
   curl -s https://username-idm-vton-space.hf.space/ > /dev/null
   ```

#### Space Wake-Up Strategy

```bash
# Add to crontab
*/5 * * * * /home/z/my-project/keep-alive.sh
```

### 7.2 ZAI (Z-AI SDK)

#### SDK Installation

The SDK is already included as a dependency:

```json
{
  "dependencies": {
    "z-ai-web-dev-sdk": "^0.0.17"
  }
}
```

#### API Key Configuration

The ZAI SDK is configured through environment variables:

```env
ZAI_BASE_URL=http://172.25.136.193:8080/v1
ZAI_API_KEY=Z.ai
ZAI_CHAT_ID=chat-97b5f242-82cb-4d42-801a-52a64cae9d47
ZAI_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ZAI_USER_ID=d71b6964-9afe-43fd-9ab8-108e57b055fa
```

#### Model Selection

| Capability | Model | Use Case |
|-----------|-------|----------|
| **Vision (VLM)** | `glm-4v-plus` | Selfie analysis, product description, style recommendations |
| **Image Generation** | Image generation API | Virtual try-on image creation |
| **Image Editing** | Edit API | Overlay product on selfie |
| **Chat Completions** | Chat API | AI shopping assistant |
| **ASR** | Audio API | Voice search |
| **TTS** | Audio API | Product description narration |

#### Rate Limits

| Endpoint | Default Limit | Timeout |
|----------|--------------|---------|
| `/chat/completions` | 60 req/min | 30s |
| `/images/generations` | 10 req/min | 120s |
| `/images/generations/edit` | 10 req/min | 120s |
| `/chat/completions/vision` | 20 req/min | 60s |

---

## 8. Email Service Setup

### 8.1 Gmail SMTP Configuration

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="3 BOXES LUXURY <noreply@3boxes.in>"
```

### 8.2 App Password Generation

1. Go to [myaccount.google.com](https://myaccount.google.com) → **Security**
2. Enable **2-Step Verification** (if not already enabled)
3. Navigate to **App passwords**
4. Create a new app password for "Mail" on "Other (Custom name)" → "3boxes Luxury"
5. Copy the 16-character password and use it as `SMTP_PASS`

### 8.3 Alternative: Ethereal Email for Testing

For development and testing, use Ethereal Email (fake SMTP):

```bash
# Generate test credentials at https://ethereal.email/create
# Or use Nodemailer's built-in test account:
npx nodemailer -i
```

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=generated-user@ethereal.email
SMTP_PASS=generated-password
```

> Emails sent via Ethereal are captured and viewable in a web inbox but never actually delivered.

### 8.4 Custom SMTP Setup

For production with a custom domain (recommended):

```env
# Amazon SES
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SMTP_FROM="3 BOXES LUXURY <noreply@3boxes.in>"

# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx.your-sendgrid-api-key
SMTP_FROM="3 BOXES LUXURY <noreply@3boxes.in>"

# Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@3boxes.in
SMTP_PASS=your-mailgun-password
SMTP_FROM="3 BOXES LUXURY <noreply@3boxes.in>"
```

### 8.5 Template Configuration

Email templates are configured in the application code using Nodemailer. Key email types:

| Type | Trigger | Template |
|------|---------|----------|
| Order confirmation | Order placed | HTML with order details |
| Password reset | Forgot password request | HTML with reset link |
| Email verification | Registration | HTML with verification link |
| Shipping update | Order tracking event | HTML with tracking info |
| Corporate invite | Team member added | HTML with invite link |

---

## 9. Security Configuration

### 9.1 JWT_SECRET Generation

```bash
# Generate a strong secret
openssl rand -hex 32
# Example output: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

```env
JWT_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

> **Warning:** Never use the default `3boxes-secret-key` in production. Rotate the secret periodically.

### 9.2 ENCRYPTION_KEY Generation (AES-256-GCM)

The encryption key must be exactly 32 bytes (64 hex characters) for AES-256-GCM encryption:

```bash
# Generate a 32-byte key in hex format
openssl rand -hex 32
# Example: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

```env
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

This key is used for encrypting sensitive data such as:
- Stored OAuth tokens
- API credentials for third-party services
- Sensitive user data fields

### 9.3 CORS Configuration

CORS headers are configured in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Auth-Token' },
      ],
    },
  ];
}
```

> **Production recommendation:** Replace `Access-Control-Allow-Origin: *` with specific domains:
> ```
> Access-Control-Allow-Origin: https://3boxes.in
> ```

### 9.4 Rate Limiting Setup

Implement rate limiting for sensitive endpoints:

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/register` | 3 requests | 60 minutes |
| `/api/auth/forgot-password` | 3 requests | 60 minutes |
| `/api/try-on` | 5 requests | 5 minutes |
| `/api/ai-proxy` | 10 requests | 1 minute |

### 9.5 2FA Configuration

The platform supports multiple 2FA methods:

| Method | API Endpoints | Use Case |
|--------|--------------|----------|
| **TOTP** | `/api/auth/2fa/setup`, `/api/auth/2fa/verify` | Admin accounts (recommended) |
| **Email OTP** | `/api/auth/2fa/email-otp` | User accounts |
| **Phone OTP** | `/api/auth/otp/send`, `/api/auth/otp/verify` | Phone-based verification |

Admin accounts should have `twoFactorRequired: true` enforced at the database level.

---

## 10. PWA Configuration

### 10.1 manifest.json Setup

The PWA manifest is at `public/manifest.json`:

```json
{
  "name": "3 BOXES LUXURY - Curated Luxury Gifting",
  "short_name": "3 BOXES",
  "description": "Discover timeless elegance. Shop the finest watches, jewelry, leather goods, fragrances, fashion, and home & living collections.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1c1917",
  "theme_color": "#d4a437",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en",
  "dir": "ltr",
  "categories": ["shopping", "lifestyle"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 10.2 Service Worker Configuration

The service worker (`public/sw.js`) implements a caching strategy:

| Resource Type | Strategy | Fallback |
|--------------|----------|----------|
| Navigation (HTML) | Network First | Cached page or `/` |
| Static assets (JS, CSS, images) | Cache First | Network |
| API calls (`/api/*`) | Network Only | N/A |
| Upload routes | Network Only | N/A |

**Cache versioning:** `3boxes-luxury-v3` — increment when deploying new static assets.

### 10.3 Offline Support Strategy

The service worker provides:
- **Cached app shell** for offline navigation
- **Static asset caching** for images, JS, and CSS
- **Offline image fallback** — branded SVG placeholder
- **API calls skip cache** — always go to network

### 10.4 App Install Prompt

The PWA is installable on supported browsers. The manifest includes:

```json
{
  "prefer_related_applications": false,
  "shortcuts": [
    { "name": "Shop All", "url": "/?action=shop" },
    { "name": "Gift Builder", "url": "/?action=gifts" }
  ]
}
```

---

## 11. Monitoring & Maintenance

### 11.1 Vercel Analytics

Enable Vercel Analytics for real-user performance data:

```bash
# Analytics are built into Vercel — enable in Dashboard
# Project → Analytics → Enable
```

Metrics tracked:
- Web Vitals (LCP, FID, CLS, TTFB)
- Page views and unique visitors
- Geographic distribution

### 11.2 Error Tracking

Implement error tracking using Vercel's built-in error reporting:

```typescript
// src/app/error.tsx — catches runtime errors
// src/app/global-error.tsx — catches root layout errors
```

For comprehensive error tracking, integrate:
- **Sentry** (recommended): `@sentry/nextjs`
- **Vercel's built-in**: Function logs and error boundaries

### 11.3 API Log Monitoring

The admin dashboard provides API log monitoring at `/api/admin/api-logs`:

```bash
# Check API logs
curl -H "Authorization: Bearer $TOKEN" \
  https://3boxes.in/api/admin/api-logs
```

### 11.4 Audit Log Review

Audit logs track all administrative actions:

```bash
# View audit logs
curl -H "Authorization: Bearer $TOKEN" \
  https://3boxes.in/api/admin/audit-logs
```

Tracked events: login, logout, password_change, role_change, approval_change, mfa_setup, product_update, order_update, etc.

### 11.5 Database Maintenance

```bash
# Check database size
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Vacuum and analyze (PostgreSQL)
psql "$DATABASE_URL" -c "VACUUM ANALYZE;"

# Check for bloat
psql "$DATABASE_URL" -c "SELECT relname, n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;"

# Reindex if needed
psql "$DATABASE_URL" -c "REINDEX DATABASE current_database();"
```

### 11.6 Shopify Sync Scheduling

The Shopify sync runs automatically:
- **Product sync**: Every 5 minutes via Next.js `revalidate: 300`
- **Collection sync**: Every 5 minutes via in-memory cache TTL
- **Webhook updates**: Real-time via registered webhooks

---

## 12. Troubleshooting

### 12.1 Common Deployment Errors

| Error | Cause | Solution |
|-------|-------|---------|
| `PrismaClient initialization error` | Invalid `DATABASE_URL` | Verify connection string format and credentials |
| `Build failed: sed command not found` | Alpine-based build image | Ensure `bash` is available in build environment |
| `Module not found: sharp` | Native module build failure | Add `sharp` to `outputFileTracingExcludes` |

### 12.2 Build Failures

```bash
# Common build failure: TypeScript errors
# Solution: The project uses ignoreBuildErrors: true in next.config.ts
# For strict builds, remove this flag and fix errors

# Common build failure: Prisma client not generated
# Solution: Run manually before build
npx prisma generate && next build

# Common build failure: PostgreSQL provider not switched
# Solution: Verify vercel-build.sh runs correctly
bash vercel-build.sh
```

### 12.3 Serverless Function Timeouts

| Function | Default Timeout | Recommended | Fix |
|----------|----------------|-------------|-----|
| `/api/try-on` | 10s (Hobby) | 120s (Pro) | Upgrade to Pro plan, set `maxDuration` |
| `/api/ai-proxy` | 10s (Hobby) | 120s (Pro) | Upgrade to Pro plan, set `maxDuration` |
| `/api/products` | 10s | 30s | Optimize DB queries, add caching |

### 12.4 Database Connection Issues

```bash
# Test PostgreSQL connectivity
psql "$DATABASE_URL" -c "SELECT 1;"

# Check connection pool exhaustion
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Common issue: too many connections from serverless functions
# Solution: Use connection pooling (PgBouncer, Neon proxy)
```

### 12.5 AI Service Unavailability

```bash
# Check AI service status
curl https://3boxes.in/api/try-on/status

# Possible responses:
# { "available": true, "mode": "ai" }        — Direct ZAI access works
# { "available": true, "mode": "proxy" }      — Proxy mode active
# { "available": false }                       — AI service unreachable

# Fix: Verify ZAI_PROXY_URL is set and reachable
curl -I $ZAI_PROXY_URL/api/try-on/status
```

### 12.6 Image Loading Issues (CORS, Proxy)

| Issue | Symptoms | Fix |
|-------|----------|-----|
| CORS error on Shopify images | Images fail in `<img>` tags | Use `/api/image-proxy?url=` endpoint |
| Shopify CDN blocked | Images 404 | Add `cdn.shopify.com` to allowed domains |
| External product images | Mixed content warnings | Ensure HTTPS for all image URLs |
| WebP/AVIF not supported | Fallback to JPEG | Next.js Image handles format negotiation |

### 12.7 Email Sending Failures

```bash
# Test SMTP connection
npx nodemailer -t --host smtp.gmail.com --port 587 \
  --user your-email@gmail.com --pass your-app-password

# Common issues:
# 1. "Invalid login" → App password not configured correctly
# 2. "Connection timeout" → Firewall blocking port 587
# 3. "Rate limit exceeded" → Gmail limit reached (500/day), use custom SMTP
```

---

## 13. Rollback Strategy

### 13.1 Vercel Instant Rollback

Vercel maintains every deployment and allows instant rollback:

```bash
# List recent deployments
vercel ls

# Rollback to a specific deployment
vercel rollback <deployment-url>

# Or via Dashboard:
# Project → Deployments → Select previous deployment → "..." → Promote to Production
```

**Rolldown time:** < 30 seconds (DNS-level switch, no rebuild needed).

### 13.2 Database Migration Rollback

```bash
# Prisma: Create a rollback migration
npx prisma migrate resolve --rolled-back <migration-name>

# Manual rollback using backup
pg_restore -d "$DATABASE_URL" backup_20260301.dump

# Prisma: Reset to a specific migration point
npx prisma migrate reset  # WARNING: Destroys all data
```

### 13.3 Environment Variable Rollback

```bash
# List current environment variables
vercel env ls

# Vercel does not keep variable history — maintain a secure backup:
# 1. Store all env vars in a secrets manager (1Password, Vault, AWS Secrets Manager)
# 2. Document all variable changes in the team changelog
# 3. Use Vercel's environment variable preview to test changes before promoting
```

**Recommended process for env var changes:**

1. Add new variable to Preview environment first
2. Test in preview deployment
3. Promote to Production only after verification
4. Document the change in the team changelog
5. Keep a secure backup of the previous value

---

## 14. Performance Optimization

### 14.1 Image Optimization (Next.js Image Component, Sharp)

The platform uses two layers of image optimization:

**Next.js Image Component:**
```tsx
<Image
  src="/images/products/watch-1.jpg"
  alt="Royal Chronograph Gold"
  width={600}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isAboveFold}
  loading={isAboveFold ? "eager" : "lazy"}
/>
```

**Sharp for server-side processing:**
- Watermarking AI try-on images
- Image format conversion
- Thumbnail generation

### 14.2 Bundle Size Optimization

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| Dynamic imports | `dynamic(() => import('component'))` | Reduces initial JS bundle |
| Tree shaking | ES module imports only | Removes unused code |
| Route splitting | App Router automatic | Each route loads only its code |
| Font optimization | `next/font` | Self-hosted fonts, no CLS |
| CSS optimization | Tailwind CSS purging | Only used classes in CSS |

### 14.3 Serverless Function Optimization

```typescript
// Warm-up strategy: keep functions warm with periodic pings
// Add to vercel.json:
{
  "crons": [{
    "path": "/api/health",
    "schedule": "*/5 * * * *"
  }]
}

// Minimize cold starts by:
// 1. Reducing bundle size (outputFileTracingExcludes)
// 2. Using edge functions for lightweight routes
// 3. Keeping frequently-used routes warm
```

### 14.4 CDN Caching Strategy

| Asset Type | Cache Strategy | Max-Age | Revalidation |
|-----------|---------------|---------|-------------|
| Static assets (hashed) | Immutable | 1 year | Never |
| Product images | Stale-while-revalidate | 1 hour | On request |
| API responses (products) | Server cache | 5 minutes | `revalidate: 300` |
| API responses (categories) | Server cache | 5 minutes | `revalidate: 300` |
| HTML pages | Stale-while-revalidate | 60 seconds | On request |
| SW and manifest | No cache | 0 | Always |

### 14.5 Database Query Optimization

```typescript
// 1. Use select to fetch only needed fields
const products = await db.product.findMany({
  select: {
    id: true,
    name: true,
    price: true,
    images: true,
    slug: true,
    category: { select: { slug: true, name: true } },
  },
  where: { isActive: true },
  take: 12,
  skip: (page - 1) * 12,
});

// 2. Add indexes for frequently queried fields
// In Prisma schema:
// @@index([categoryId])
// @@index([slug])
// @@index([featured, stockStatus])

// 3. Use cursor-based pagination for large datasets
const products = await db.product.findMany({
  take: 12,
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' },
});

// 4. Batch queries with Promise.all
const [products, total] = await Promise.all([
  db.product.findMany({ where, take: 12 }),
  db.product.count({ where }),
]);
```

---

## Appendix A: Complete Environment Variable Reference

| Variable | Required | Local Default | Production Value |
|----------|----------|--------------|-----------------|
| `DATABASE_URL` | Yes | `file:./db/custom.db` | `postgresql://...` |
| `POSTGRES_PRISMA_URL` | Vercel | — | `postgresql://...` |
| `JWT_SECRET` | Yes | `3boxes-local-dev-secret-key` | `<openssl rand -hex 32>` |
| `ENCRYPTION_KEY` | Yes | `<64 hex chars>` | `<openssl rand -hex 32>` |
| `SHOPIFY_STORE_DOMAIN` | Yes | — | `3boxesluxury-2.myshopify.com` |
| `SHOPIFY_ADMIN_API_TOKEN` | Yes | — | `shpat_xxxxx` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | No | — | `xxxx` |
| `SHOPIFY_API_VERSION` | No | `2025-01` | `2025-01` |
| `ZAI_BASE_URL` | No | `http://172.25.136.193:8080/v1` | — |
| `ZAI_PROXY_URL` | Vercel | — | `https://proxy.example.com` |
| `ZAI_API_KEY` | No | — | `Z.ai` |
| `ZAI_CHAT_ID` | No | — | `chat-xxxx` |
| `ZAI_TOKEN` | No | — | `eyJ...` |
| `ZAI_USER_ID` | No | — | `uuid` |
| `HUGGINGFACE_API_TOKEN` | No | — | `hf_xxxxx` |
| `SMTP_HOST` | No | — | `smtp.gmail.com` |
| `SMTP_PORT` | No | `587` | `587` |
| `SMTP_SECURE` | No | `false` | `false` |
| `SMTP_USER` | No | — | `email@gmail.com` |
| `SMTP_PASS` | No | — | `<app-password>` |
| `SMTP_FROM` | No | — | `3 BOXES LUXURY <noreply@3boxes.in>` |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | `https://3boxes.in` |
| `NEXT_PUBLIC_BASE_URL` | No | `http://localhost:3000` | `https://3boxes.in` |
| `DATA_SOURCE` | No | `database` | `shopify` |

---

## Appendix B: Quick Reference Commands

```bash
# ─── Local Development ───
bun install                          # Install dependencies
bun run db:push                      # Push schema to SQLite
bun run db:seed                      # Seed with sample data
bun run dev                          # Start dev server on :3000
bash start-services.sh               # Start all services (app + proxy)

# ─── Vercel Deployment ───
vercel login                         # Authenticate
vercel link                          # Link project
vercel env add VARIABLE production   # Add env var
vercel --prod                        # Deploy to production
vercel ls                            # List deployments
vercel rollback <url>                # Rollback deployment
vercel logs --follow                 # Stream function logs

# ─── Database Management ───
bun run db:generate                  # Regenerate Prisma client
bun run db:migrate                   # Run migrations
bun run db:reset                     # Reset database + reseed
npx prisma studio                    # Visual DB browser

# ─── Security ───
openssl rand -hex 32                 # Generate JWT_SECRET
openssl rand -hex 32                 # Generate ENCRYPTION_KEY
```

---

*This document is maintained by the 3 BOXES LUXURY engineering team. For questions or updates, contact the platform team.*
