# 3 BOXES LUXURY - Version 1.1 Changelog

## Release Date: 2025-03-05

## Summary
Version 1.1 includes comprehensive bug fixes and feature additions based on PRD requirements audit.

## Bug Fixes
- **Next.js Image Component**: Replaced `<Image>` with `<img>` tags in product-card.tsx, product-detail.tsx, and cart-view.tsx to fix `localPatterns` error
- **Login Bug (Critical)**: Fixed role mismatch where Prisma schema defines UPPERCASE enum values (ADMIN, USER, AGENT, TEAM) but seed file used lowercase, causing 3 out of 4 users to never be created
  - Updated `prisma/seed.ts` to use UPPERCASE role values
  - Created missing users (user, agent, team) in database
  - Fixed `src/app/api/dashboard/route.ts` to use `.toLowerCase()` for robust role comparisons
  - Fixed `src/app/page.tsx` and `src/components/header.tsx` for role comparisons

## Features (from PRD audit Tasks 1-11)

### Customer App/Website
- **Auth**: Login/register with JWT, phone verification API, 2FA setup/verify, social auth, user approval
- **Product Browsing**: Category grid, product grid with search/filter (occasion, recipient, relationship, price)
- **Product Detail**: Full product details with delivery estimate, wishlist toggle, reviews section with form
- **AI Gift Recommendations**: LLM-powered gift recommendation API + floating chat assistant widget
- **Gift Builder**: 6-step wizard (occasion → recipient → relationship → budget → products → review)
- **Cart & Wishlist**: Cart with CRUD, wishlist API
- **Gift Options**: Gift wrapping, greeting message, hide price options in checkout
- **Checkout**: Full checkout with delivery type, gift options, coupon code validation
- **Order Management**: Order history with tracking info, cancel order functionality
- **Ratings & Reviews**: Review API with auto-updating product ratings
- **Support**: Support ticket system with messages

### Corporate Gifting Portal
- **Corporate Auth**: Corporate registration API
- **Company Profile**: Profile management API
- **Campaigns**: Full CRUD for gifting campaigns
- **Bulk CSV Upload**: CSV upload for bulk recipients with template download
- **Budget per Recipient**: Recipient management with budget allocation
- **Campaign Submission**: Submit campaigns for approval
- **Branding**: Corporate branding API (logo, custom messages)
- **Corporate Dashboard**: Full dashboard with campaign management, orders, invoices

### Admin Panel
- **Admin Dashboard**: Full admin dashboard with stats
- **Product Management**: Admin product CRUD
- **Category Management**: Category CRUD with admin API
- **Inventory Management**: Inventory tracking with stock alerts API
- **Order Management**: Admin order management with status updates, tracking, refund processing
- **Offer/Coupon Management**: Full CRUD with validation (date range, usage limit, min order)
- **User Management**: Admin user CRUD with role management
- **Corporate Account Management**: Admin corporate account management
- **Campaign Management**: Admin campaign approval/management
- **Reports & Analytics**: Revenue summary, order stats, top products, CSV export
- **RBAC**: Role-based permissions API (ADMIN, USER, AGENT, TEAM)
- **Partners/Integrations**: Partner management and integration sync APIs
- **Vendor Management**: Vendor CRUD APIs
- **Product Import**: Search, scrape, and import product APIs

## Tech Stack
- Next.js 16 with App Router
- TypeScript 5
- Tailwind CSS 4 with shadcn/ui
- Prisma ORM with SQLite
- JWT Authentication with bcrypt
- Zustand for client state
- React Query for server state
- z-ai-web-dev-sdk for AI features (LLM gift recommendations)

## Demo Accounts
- admin@3boxesluxury.com / admin123 (ADMIN)
- user@3boxesluxury.com / user123 (USER)
- agent@3boxesluxury.com / agent123 (AGENT)
- team@3boxesluxury.com / team123 (TEAM)

## File Structure
- `src/app/api/` - 50+ API route files
- `src/components/` - 15+ custom components + 40+ shadcn/ui components
- `src/lib/` - Utilities (auth, db, store, sessions)
- `src/hooks/` - Custom hooks
- `prisma/` - Schema and seed files
- `public/images/` - Product and category images
