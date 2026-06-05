# 3 BOXES LUXURY - Version 1.2

**Tag:** `v1.2`  
**Date:** 2026-06-03  
**Status:** ACTIVE  
**Code Download:** `/downloads/3boxes-luxury-v1.2-code.zip` (4.8 MB - source code only)  
**Full Download:** `/downloads/3boxes-luxury-v1.2-source-code.zip` (74 MB - includes all assets)

---

## Tech Stack
- **Framework:** Next.js 16 with App Router + Turbopack
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York style)
- **Database:** Prisma ORM with SQLite
- **Authentication:** Custom auth with 2FA, OTP, social login
- **AI Integration:** Google Gemini AI (via z-ai-web-dev-sdk)
- **State:** Zustand (client) + TanStack Query (server)
- **Animations:** Framer Motion
- **PWA:** Service Worker with offline support

---

## Features

### Core E-Commerce
- Product catalog with 89+ items across 7 main categories
- Category grid with subcategory filtering
- Product detail with quick view, wishlist, reviews
- Shopping cart with Shopify checkout integration
- Order tracking, history, and invoice generation
- Multi-currency support (INR, USD, EUR, GBP, etc.)
- Multi-language support (English, Hindi, Arabic, French, etc.)

### AI Features
- **AI Virtual Try-On** - Upload selfie + product image to see AI-generated style preview
  - Three-layer fallback: AI generation → Canvas overlay → Minimal branded card
  - Auto-retry with health cache clearing
  - Never shows "AI unavailable" dead-end error
- **AI Style Gallery** - User-uploaded AI style images with community ratings
  - Admin moderation (approve/reject/delete/edit)
- **AI Gift Assistant** - Chat-based gift recommendation engine
- **AI Fashion Assistant** - General fashion advice chatbot

### Social & Influencer
- **Social Style** - TikTok/Instagram-style fashion feed with short videos
- **Influencer Pop-Out** - Influencer profiles with video reels and affiliate links
- **3Box Curate** - Curated luxury collections from brand partners
- **Customer Portfolio** - "Happy Customers" section with consent-based AI style sharing

### Family Shopping
- 10 Indian occasions (Diwali, Wedding, Birthday, Anniversary, Holi, etc.)
- Family member configuration (adults, kids, age groups)
- Budget range selection
- Gift preference filtering
- Family discount tiers (5%/10%/15%)
- Curated package recommendations

### Gift Builder
- Step-by-step gift customization wizard
- Recipient, occasion, personality, budget filters
- Gift wrapping and personal message options

### Knowledge Hub / Wiki
- Admin CRUD for knowledge documents
- Rich content with categories and tags
- PDF download for all documents
- Share options (Copy Link, Email, WhatsApp, LinkedIn, Twitter)
- Version tracking and publish/draft system

### Admin Dashboard
- **Products** - Full product management with image upload
- **Orders** - Order management with tracking
- **Users** - User management with role permissions
- **Categories** - Category hierarchy management
- **Coupons** - Coupon code management
- **Shopify** - Shopify store integration and sync
- **Knowledge Hub** - Wiki document management
- **AI Style Gallery** - Moderation of user uploads
- **Corporate** - Corporate account management
- **Reports** - Sales and analytics reports
- **API Logs** - Request logging and monitoring
- **Audit Logs** - Security audit trail
- **Partners** - Brand partner management
- **2FA** - Admin two-factor authentication

### Corporate Gifting
- Corporate account registration and login
- Recipient management with CSV import
- Campaign creation and submission
- Branding customization

### PWA & Mobile
- Progressive Web App with offline support
- Service Worker with intelligent caching
- Android app (Flutter) and install prompt
- Responsive design (mobile-first)

### Security
- 2FA authentication (TOTP + email OTP)
- Role-based access control
- Rate limiting on API endpoints
- Session management with refresh tokens
- Password validation and encryption
- Security policy page

---

## Project Structure
```
src/
├── app/
│   ├── api/           # 50+ API routes
│   ├── page.tsx       # Main storefront page
│   ├── layout.tsx     # Root layout
│   ├── globals.css    # Global styles
│   └── error.tsx      # Error boundary
├── components/
│   ├── ui/            # 40+ shadcn/ui components
│   ├── admin-dashboard.tsx
│   ├── family-shopping.tsx
│   ├── wiki-section.tsx
│   ├── threebox-curate.tsx
│   ├── social-style-integration.tsx
│   ├── ai-influencer-section.tsx
│   ├── try-on-dialog.tsx
│   ├── gift-builder.tsx
│   ├── header.tsx
│   ├── footer.tsx
│   └── ... (30+ components)
├── hooks/             # Custom React hooks
├── i18n/              # Internationalization
├── lib/               # Core utilities
│   ├── store.ts       # Zustand store
│   ├── db.ts          # Prisma client
│   ├── auth.ts        # Auth utilities
│   ├── shopify.ts     # Shopify integration
│   ├── try-on-pipeline.ts
│   ├── pdf-utils.ts
│   └── ... (20+ modules)
└── instrumentation.ts  # OpenTelemetry setup

prisma/
├── schema.prisma      # Database schema
└── seed.ts            # Seed data

mini-services/
└── ai-proxy/          # AI proxy service (port 3003)
```

---

## Bug Fixes (v1.2)
- Fixed styled-jsx HMR module factory error caused by PWA Service Worker caching stale JS chunks
  - Service Worker now uses network-first strategy for /_next/ paths
  - Cache-Control: no-cache headers added for dev chunks
  - SW cache version bumped to invalidate old caches
- Fixed AI Virtual Try-On "AI unavailable" error with permanent three-layer fallback
- Fixed Knowledge Hub not appearing in admin dashboard
- Fixed admin wiki document management

---

## Setup Instructions
```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Start development server
bun run dev

# Start AI proxy service
cd mini-services/ai-proxy && bun run dev
```

---

## Environment Variables Required
```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=xxx
SHOPIFY_ADMIN_TOKEN=xxx
GEMINI_API_KEY=xxx (for AI features)
NEXTAUTH_SECRET=xxx
```
