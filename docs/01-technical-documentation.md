# 3 Boxes Luxury — Technical Documentation

> **Version:** 1.2  
> **Last Updated:** 2025-07-18  
> **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma ORM · Zustand  
> **Domain:** [3boxes.in](https://3boxes.in)

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Mini-Services Architecture](#4-mini-services-architecture)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Performance Optimizations](#7-performance-optimizations)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

3boxes.in is a **luxury e-commerce platform** that operates as a **Single-Page Application (SPA)**. Unlike standard Next.js applications that use file-based routing, this platform uses **Zustand-driven view routing** — the entire app lives on a single page (`src/app/page.tsx`) and view transitions are managed through a global Zustand store. This design choice was made to deliver a seamless, app-like experience with instant transitions and persistent state across views.

```
┌──────────────────────────────────────────────────────────────┐
│                     Caddy Reverse Proxy (:81)                │
│                                                              │
│  /api/try-on* ──────► ai-proxy (localhost:3030)             │
│  ?XTransformPort=N ─► Dynamic proxy to port N               │
│  /* ────────────────► Next.js App (localhost:3000)           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Next.js Application (:3000)                │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────────┐    │
│  │ Zustand  │  │ TanStack │  │  API Routes (/api/*)    │    │
│  │  Store   │  │  Query   │  │  ├─ Auth (14+ endpoints)│    │
│  │ (views,  │  │ (server  │  │  ├─ Products            │    │
│  │  cart,   │  │  state)  │  │  ├─ Cart & Checkout     │    │
│  │  auth,   │  │          │  │  ├─ Orders              │    │
│  │  locale) │  │          │  │  ├─ Corporate Gifting   │    │
│  └─────────┘  └──────────┘  │  ├─ Admin                │    │
│                              │  ├─ Shopify              │    │
│  ┌─────────────────────┐    │  ├─ AI (try-on, chat)    │    │
│  │  Dual Data Source   │    │  └─ Support              │    │
│  │  ├─ Prisma DB       │    └─────────────────────────┘    │
│  │  ├─ Shopify API     │                                   │
│  │  └─ Static Products │    ┌─────────────────────────┐    │
│  └─────────────────────┘    │  Prisma ORM              │    │
│                              │  ├─ SQLite (local dev)   │    │
│                              │  └─ PostgreSQL (Vercel)  │    │
│                              └─────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Mini-Services                              │
│  ai-proxy (:3030) — ZAI SDK wrapper for AI try-on           │
│  app-web (:3002)  — Bun static server for Flutter web app   │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Zustand view routing** instead of Next.js file routing | Instant transitions, persistent cart/auth state, single-page feel |
| **Dual data source** (DB + Shopify + Static) | Shopify products for live catalog, DB for custom products, static fallback for categories Shopify doesn't cover |
| **JWT + DB sessions** | JWT works on Vercel serverless without DB; DB sessions provide revocability and metadata |
| **In-memory session cache** | Fast lookups without DB hit; survives Vercel cold starts via JWT fallback |
| **Demo users** | When DB is unavailable (Vercel without Postgres), hardcoded demo users allow testing |
| **SQLite locally, PostgreSQL on Vercel** | Zero-config local dev; production-grade RDBMS for deployment |

### 1.3 Environment Configuration

Key environment variables:

```env
# Database
DATABASE_URL="file:./dev.db"          # SQLite for local
DATABASE_URL="postgresql://..."        # PostgreSQL for Vercel

# Auth
JWT_SECRET="3boxes-secret-key"        # JWT signing key

# Shopify
SHOPIFY_STORE_DOMAIN="3boxesluxury-2.myshopify.com"
SHOPIFY_STOREFRONT_TOKEN="..."
SHOPIFY_ADMIN_TOKEN="..."
SHOPIFY_API_VERSION="2025-01"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""

# AI
ZAI_BASE_URL=""
ZAI_API_KEY=""
ZAI_PROXY_URL=""

# Encryption
ENCRYPTION_KEY=""                      # 32-byte hex key for AES-256-GCM
```

---

## 2. Frontend Architecture

### 2.1 Core Components

#### `src/app/page.tsx` — SPA Shell & View Router

This is the **single entry point** for the entire application. It does NOT use Next.js file-based routing. Instead, it reads the `view` state from Zustand and renders the corresponding component.

```typescript
// View routing via Zustand — the entire app is a single page
function AppContent() {
  const view = useStore((s) => s.view);

  const renderView = () => {
    switch (view) {
      case 'home':           return <HomeSections />;
      case 'product':        return <ProductDetail />;
      case 'cart':           return <CartView />;
      case 'checkout':       return <CheckoutView />;
      case 'order-confirmation': return <OrderConfirmation />;
      case 'orders':         return <OrderHistory />;
      case 'admin-dashboard':   return <AdminDashboard />;
      case 'user-dashboard':    return <UserDashboard />;
      case 'agent-dashboard':   return <AgentDashboard />;
      case 'team-dashboard':    return <TeamDashboard />;
      case 'corporate-dashboard': return <CorporateDashboard />;
      // ... more views
    }
  };
}
```

**ErrorBoundary**: A React class component wraps each major section. When a section crashes, it shows a retry button instead of breaking the entire app.

**AnimatePresence**: View transitions use Framer Motion's `AnimatePresence` with fade+slide animations (200ms duration).

**Global overlays**: `AuthDialog`, `GiftBuilder`, `GiftAssistant`, and `AppDownloadBanner` are always mounted (conditionally visible) so they can be triggered from any view.

---

#### `src/components/header.tsx` — Navigation & Controls

The header provides:
- **Logo** (clicking navigates to `home` view)
- **Search bar** (updates `searchQuery` in store)
- **Category dropdown** (sets `selectedCategory` in store)
- **Currency switcher** (calls `setCurrency` on store)
- **Language switcher** (calls `setLocale` on store)
- **Theme toggle** (dark/light via `setAppTheme`)
- **Auth button** (opens `AuthDialog`)
- **Cart icon** with item count badge (navigates to `cart` view)
- **User avatar/dropdown** for logged-in users (navigates to appropriate dashboard)

---

#### `src/components/hero-section.tsx` — Landing Page

Full-width hero with background image and call-to-action. Sets the luxury brand tone with gold gradient overlays.

---

#### `src/components/category-grid.tsx` — Category Browsing

Renders a responsive grid of category cards. Clicking a category calls `setCategory(slug)` which updates the store and filters the `ProductGrid`. Categories come from the `/api/categories` endpoint or Shopify collections.

---

#### `src/components/product-grid.tsx` — Product Listing with Filters

Displays products in a paginated grid. Features:
- **Search filtering** (via `searchQuery` from store)
- **Category filtering** (via `selectedCategory` from store)
- **Sort options** (price low-high, price high-low, newest, rating)
- **Infinite scroll / load more**
- Data source: `/api/products` (DB) → Shopify fallback → static product fallback

---

#### `src/components/product-card.tsx` — Product Card

Each card shows:
- Product image with hover zoom
- Name, price (with currency conversion via `useCurrency` hook)
- Compare-at price (strikethrough)
- Rating stars
- "Try On" button (opens `TryOnDialog`)
- "Add to Cart" button
- Affiliate badge for external products (Myntra, Nykaa, etc.)

---

#### `src/components/product-detail.tsx` — Full Product Detail

Full-page product view with:
- Image gallery with zoom
- Variant selector (size, color, material)
- Price with currency conversion
- Add to cart with quantity selector
- **TryOnDialog** integration for AI virtual try-on
- Gift wrapping options
- Delivery estimate
- Related products
- Reviews section

---

#### `src/components/cart-view.tsx` — Shopping Cart

Client-side cart managed entirely by Zustand. Features:
- Item list with quantity +/- controls
- Remove item
- Gift wrapping toggle per item
- Greeting message per item
- Hide price toggle (for gifts)
- Subtotal, shipping estimate, tax
- Coupon code input (validated via `/api/coupons/validate`)
- "Proceed to Checkout" button

---

#### `src/components/checkout-view.tsx` — Multi-Step Checkout

Multi-step checkout flow:
1. **Shipping info** — name, address, city, state, zip, country, phone
2. **Delivery option** — standard, express, same-day, scheduled
3. **Gift options** — wrapping style, greeting message, hide price
4. **Payment** — Razorpay (INR) or Stripe (international)
5. **Order review** — summary before placing

Creates order via `POST /api/checkout`, then initiates payment session via `POST /api/payments/create-session`.

---

#### `src/components/auth-dialog.tsx` — Authentication Dialog

Modal dialog supporting:
- **Login** — email/password with 2FA flow
- **Register** — name, email, password, phone (optional)
- **Social login** — Google, Facebook, LinkedIn (via `/api/auth/social`)
- **2FA verification** — email OTP or TOTP authenticator
- **Forgot password** — sends reset email
- **Phone OTP login** — via `/api/auth/otp-login`

The dialog state is managed by the store fields: `showAuthDialog`, `authMode`, `authTwoFAStep`, `authPendingUserId`, `authTwoFAMethod`, `authPendingEmail`.

---

#### `src/components/gift-builder.tsx` — Gift Box Builder

Uses `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop gift box assembly:
- Select items from product catalog
- Drag items into a gift box
- Set occasion, recipient, relationship
- Add greeting message
- Calculate total price
- Add entire box to cart

State: `giftBuilderView` (toggle), `giftFilter` (occasion/recipient/relationship/priceRange), `smartBundleItems` in Zustand store.

---

#### `src/components/gift-assistant.tsx` — AI Gift Recommendations

AI-powered gift suggestion engine:
- User selects occasion, recipient, relationship, budget
- Calls `POST /api/gift-recommend` which uses ZAI AI to suggest products
- Displays recommendations with "Add to Cart" and "Try On" options

---

#### `src/components/try-on-dialog.tsx` — AI Virtual Try-On (DEPRECATED)

> **Note:** This component is deprecated in favor of the try-on integration within `product-detail.tsx`. It remains in the codebase for backward compatibility.

The dialog allows users to:
1. Upload a selfie or take a photo with webcam
2. Select a product
3. Submit to the AI try-on pipeline
4. Poll for results (shows progress)
5. View the generated image with watermark

---

#### `src/components/ai-assistant.tsx` — AI Shopping Chatbot

Floating chat widget powered by ZAI AI:
- Context-aware recommendations based on current view
- Product search and comparison
- Gift suggestions
- Order tracking queries
- Uses `/api/ai-assistant` endpoint

---

#### `src/components/admin-dashboard.tsx` — Full Admin Dashboard

Tabbed dashboard for administrators:
- **Overview** — Key metrics (revenue, orders, users, products)
- **Products** — CRUD with Shopify sync, image management, variants
- **Orders** — View, update status, process refunds, generate invoices
- **Users** — Approve/reject, manage roles and permissions
- **Categories** — CRUD with hierarchy
- **Corporate** — Manage corporate accounts and campaigns
- **Coupons** — Create and manage discount codes
- **Campaigns** — Corporate gifting campaigns
- **Reports** — Sales, inventory, and financial reports
- **Audit Logs** — Security audit trail
- **Settings** — SMTP, Shopify, permissions configuration
- **Training** — Agent training documents
- **Shopify** — Shopify sync status and manual triggers
- **Partners** — Platform integration management

All admin endpoints require `role: 'admin'` and appropriate permissions (e.g., `products.manage`, `orders.manage`).

---

#### `src/components/user-dashboard.tsx` — User Profile/Orders/Wishlist

- Profile editing (name, phone, avatar)
- Order history with tracking
- Wishlist management
- Email/phone verification
- 2FA setup

---

#### `src/components/corporate-dashboard.tsx` — Corporate Gifting Portal

Full portal for corporate accounts:
- **Company profile** — branding, billing address, GST/PAN
- **Team members** — invite with role-based access (corporate_admin, finance_user, campaign_manager)
- **Campaigns** — create, manage, submit for approval
- **Recipients** — add individually or import CSV
- **Branding** — logo, colors, packaging type, gift wrap style, custom message
- **Budget tracking** — per-campaign and per-recipient budgets

### 2.2 State Management

#### Zustand Store (`src/lib/store.ts`)

The **single source of truth** for all client-side state. Created with `zustand` v5:

```typescript
export const useStore = create<AppState>((set, get) => ({
  // View routing
  view: 'home',
  selectedProductId: null,

  // Product browsing
  searchQuery: '',
  selectedCategory: null,

  // Cart
  cartItems: [],

  // Auth
  authUser: null,
  authToken: null,
  authView: null,
  authTwoFAStep: false,
  authPendingUserId: null,
  authTwoFAMethod: null,
  authPendingEmail: null,
  showAuthDialog: false,
  authMode: null,

  // Gift builder
  giftBuilderView: false,
  giftFilter: { occasion: null, recipient: null, relationship: null, priceRange: null, category: null },
  smartBundleItems: [],

  // Multi-currency & i18n
  locale: 'en',
  currency: 'INR',
  currencySymbol: '₹',
  currencyRates: {},
  geoInfo: null,
  geoDetected: false,

  // Theme
  appTheme: 'dark',

  // Aliases (for backward compatibility)
  user: null,       // alias for authUser
  language: 'en',   // alias for locale
}));
```

**LocalStorage persistence** is handled manually in each setter:
- `3boxes_auth` — auth user + token
- `3boxes_locale` — language preference
- `3boxes_currency` — currency preference
- `3boxes_theme` — dark/light theme

**Geo-detection**: On first visit, the app calls `/api/geo` to detect the user's country, then auto-sets currency and language (only if user hasn't manually set them).

#### TanStack Query (`src/lib/query-provider.tsx`)

Used for **server state** management — product listings, order data, admin dashboard stats. The `QueryProvider` wraps the entire app and provides the `useQuery` and `useMutation` hooks to all components.

#### Shopify Store (`src/lib/shopify/store.ts`)

A separate Zustand store for **Shopify cart integration**:
- `useShopifyStore` — manages Shopify-specific cart (variant IDs, checkout URL)
- Persisted to localStorage under key `shopify-cart`
- Syncs with Shopify Storefront API for cart creation and checkout

### 2.3 Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTranslation` | `src/hooks/useTranslation.ts` | Returns `t()` function with current locale from store; dynamically loads translation JSON files |
| `useCurrency` | `src/hooks/useCurrency.ts` | Returns `format()`, `convert()`, `formatOnly()` with current currency from store |
| `useLocale` | `src/hooks/useLocale.ts` | Returns locale info, RTL status, supported locales |
| `useMobile` | `src/hooks/use-mobile.ts` | Returns `isMobile` boolean based on viewport width |
| `usePWAInstall` | `src/hooks/usePWAInstall.ts` | Returns `canInstall`, `promptInstall()`, `isInstalled` for PWA install prompt |
| `useAffiliateClick` | `src/hooks/useAffiliateClick.ts` | Tracks affiliate clicks via `/api/affiliate/click` and opens external URLs |
| `useGeoDetection` | `src/hooks/useGeoDetection.ts` | Calls `/api/geo` on mount to detect country and auto-set currency/language |
| `use-toast-notification` | `src/hooks/use-toast-notification.tsx` | Global toast notification system |

**useTranslation example:**
```typescript
export function useTranslation() {
  const locale = useStore((s) => s.locale);
  const translate = useCallback((key: string, vars?: Record<string, string | number>) => {
    return t(locale, key, vars);
  }, [locale]);
  return { t: translate, locale, isRTL: isRTL(locale), loaded, supportedLocales };
}
```

**useCurrency example:**
```typescript
export function useCurrency() {
  const { currency, exchangeRates } = useStore();
  const format = (amountUsd: number, overrideCurrency?: string): string => {
    return convertAndFormat(amountUsd, overrideCurrency || currency, exchangeRates || { USD: 1 });
  };
  return { currency, format, convert, formatOnly, rates: exchangeRates };
}
```

### 2.4 UI Component Library

The project uses **shadcn/ui** (New York style) with 40+ components located in `src/components/ui/`:

| Component | Path |
|-----------|------|
| Alert | `ui/alert.tsx` |
| AlertDialog | `ui/alert-dialog.tsx` |
| Accordion | `ui/accordion.tsx` |
| AspectRatio | `ui/aspect-ratio.tsx` |
| Avatar | `ui/avatar.tsx` |
| Badge | `ui/badge.tsx` |
| Breadcrumb | `ui/breadcrumb.tsx` |
| Button | `ui/button.tsx` |
| Calendar | `ui/calendar.tsx` |
| Card | `ui/card.tsx` |
| Carousel | `ui/carousel.tsx` |
| Checkbox | `ui/checkbox.tsx` |
| Collapsible | `ui/collapsible.tsx` |
| Command | `ui/command.tsx` |
| ContextMenu | `ui/context-menu.tsx` |
| Dialog | `ui/dialog.tsx` |
| Drawer | `ui/drawer.tsx` |
| DropdownMenu | `ui/dropdown-menu.tsx` |
| Form | `ui/form.tsx` |
| HoverCard | `ui/hover-card.tsx` |
| Input | `ui/input.tsx` |
| InputOTP | `ui/input-otp.tsx` |
| Label | `ui/label.tsx` |
| Menubar | `ui/menubar.tsx` |
| NavigationMenu | `ui/navigation-menu.tsx` |
| Pagination | `ui/pagination.tsx` |
| Popover | `ui/popover.tsx` |
| Progress | `ui/progress.tsx` |
| RadioGroup | `ui/radio-group.tsx` |
| Resizable | `ui/resizable.tsx` |
| ScrollArea | `ui/scroll-area.tsx` |
| Select | `ui/select.tsx` |
| Separator | `ui/separator.tsx` |
| Sheet | `ui/sheet.tsx` |
| Sidebar | `ui/sidebar.tsx` |
| Skeleton | `ui/skeleton.tsx` |
| Slider | `ui/slider.tsx` |
| Sonner | `ui/sonner.tsx` |
| Switch | `ui/switch.tsx` |
| Table | `ui/table.tsx` |
| Tabs | `ui/tabs.tsx` |
| Textarea | `ui/textarea.tsx` |
| Toast | `ui/toast.tsx` |
| Toaster | `ui/toaster.tsx` |
| Toggle | `ui/toggle.tsx` |
| ToggleGroup | `ui/toggle-group.tsx` |
| Tooltip | `ui/tooltip.tsx` |

All components use Radix UI primitives under the hood with Tailwind CSS for styling.

---

## 3. Backend Architecture

### 3.1 API Routes — Organized by Module

The API follows Next.js App Router conventions with route handlers in `src/app/api/`.

#### Auth Routes (14+ endpoints)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Create account (bcrypt password, email verification) |
| POST | `/api/auth/login` | Email/password login with 2FA check |
| POST | `/api/auth/social` | OAuth login (Google, Facebook, LinkedIn) |
| POST | `/api/auth/otp/send` | Send phone OTP |
| POST | `/api/auth/otp/verify` | Verify phone OTP |
| POST | `/api/auth/otp-login` | Phone OTP-based login |
| POST | `/api/auth/2fa/setup` | Enable TOTP 2FA (generates QR code) |
| POST | `/api/auth/2fa/verify` | Verify TOTP code during login |
| POST | `/api/auth/2fa/email-otp` | Verify email OTP during 2FA flow |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/verify-email` | Verify email with code |
| POST | `/api/auth/verify-phone` | Verify phone number |
| POST | `/api/auth/refresh` | Refresh JWT access token |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/session` | Get session info |
| GET | `/api/auth/users` | List users (admin) |
| POST | `/api/auth/approve` | Approve/reject user (admin) |

**Login flow (most complex):**

```
1. POST /api/auth/login { email, password }
   ├─ Try DB lookup first
   │  ├─ User found → bcrypt.compare(password, hash)
   │  │  ├─ Invalid → 401
   │  │  ├─ Account inactive → 403
   │  │  ├─ Account pending/rejected → 403
   │  │  ├─ 2FA required (admin/team/agent/corporate) → { requiresTwoFactor: true, userId, method: 'email' }
   │  │  └─ No 2FA → Generate JWT + Create session → { user, token }
   │  └─ DB unavailable → Try demo user fallback
   └─ No match → 401

2. POST /api/auth/2fa/email-otp { userId, otp }
   ├─ Verify OTP against DB or in-memory store
   ├─ On success → Generate JWT + Create session → { user, token }
   └─ On failure → 401

3. POST /api/auth/refresh { refreshToken }
   ├─ Verify refresh token JWT
   ├─ Look up user in DB
   ├─ Generate new access + refresh token pair
   └─ Return { accessToken, refreshToken }
```

#### Product Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/products` | List products (with pagination, category filter, search, sort) |
| GET | `/api/products/[id]` | Get single product with category, variants, images |
| POST | `/api/products/fix-images` | Fix broken image URLs (admin) |
| GET | `/api/search` | Full-text search across products |
| POST | `/api/product-import/search` | Search external platforms for import |
| POST | `/api/product-import/scrape` | Scrape product data from URL |
| POST | `/api/product-import/import` | Import product from external source |

**Product listing fallback chain:**
1. Query Prisma DB for products matching filters
2. If DB empty/unavailable → fetch from Shopify Storefront API
3. If Shopify unavailable → return static products from `src/lib/static-products.ts`

#### Cart & Checkout Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cart` | Get cart (by session ID or user ID) |
| POST | `/api/cart` | Add/update/remove cart item |
| POST | `/api/checkout` | Create order from cart |
| POST | `/api/checkout/estimate` | Estimate shipping, tax, and discount |
| POST | `/api/payments/create-session` | Create Razorpay/Stripe payment session |
| POST | `/api/payments/verify` | Verify payment after return |
| GET | `/api/payment-methods` | List available payment methods |

**Checkout flow:**
```
1. POST /api/checkout { items, shipping, delivery, giftOptions, couponCode }
   ├─ Validate coupon via /api/coupons/validate
   ├─ Create Order in DB (status: pending)
   ├─ Create PaymentSession (provider: razorpay or stripe)
   └─ Return { orderId, paymentSession }

2. POST /api/payments/create-session { orderId, provider }
   ├─ Razorpay: Create order via Razorpay SDK
   ├─ Stripe: Create checkout session via Stripe SDK
   └─ Return { sessionId, paymentUrl }

3. POST /api/payments/verify { paymentId, orderId }
   ├─ Verify payment with provider
   ├─ Update Order.paymentStatus = 'paid'
   ├─ Update PaymentSession.status = 'paid'
   └─ Return { success: true }
```

#### Order Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/orders` | List user's orders |
| GET | `/api/orders/[id]` | Get order detail |
| GET | `/api/orders/[id]/tracking` | Get tracking events |
| POST | `/api/orders/[id]/refund` | Process refund |
| GET | `/api/orders/[id]/invoice` | Generate/download invoice PDF |

#### Corporate Gifting Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/corporate/register` | Register corporate account |
| POST | `/api/corporate/login` | Corporate login |
| GET | `/api/corporate/profile` | Get corporate profile |
| GET/POST | `/api/corporate/members` | List/add team members |
| PUT/DELETE | `/api/corporate/members/[memberId]` | Update/remove member |
| GET/POST | `/api/corporate/branding` | Get/update branding |
| GET/POST | `/api/corporate/campaigns` | List/create campaigns |
| GET/PUT/DELETE | `/api/corporate/campaigns/[id]` | Get/update/delete campaign |
| POST | `/api/corporate/campaigns/[id]/submit` | Submit campaign for approval |
| GET/POST | `/api/corporate/campaigns/[id]/recipients` | List/add recipients |
| PUT/DELETE | `/api/corporate/campaigns/[id]/recipients/[recipientId]` | Update/remove recipient |
| POST | `/api/corporate/recipients/import-csv` | Bulk import recipients from CSV |

#### Admin Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/dashboard` | Full dashboard data |
| GET/POST | `/api/admin/users` | List/create users |
| GET/PUT/DELETE | `/api/admin/users/[id]` | Get/update/delete user |
| GET/POST | `/api/admin/products` | List/create products |
| GET/PUT/DELETE | `/api/admin/products/[id]` | Get/update/delete product |
| GET/POST | `/api/admin/orders` | List/manage orders |
| GET/POST | `/api/admin/categories` | List/create categories |
| GET/POST | `/api/admin/coupons` | List/create coupons |
| GET/POST | `/api/admin/campaigns` | List/create campaigns |
| GET/PUT/DELETE | `/api/admin/campaigns/[id]` | Manage campaign |
| GET/POST | `/api/admin/corporate` | Manage corporate accounts |
| PUT | `/api/admin/corporate/[id]/status` | Approve/reject corporate |
| GET | `/api/admin/audit-logs` | View audit trail |
| GET | `/api/admin/permissions` | Get role permissions |
| POST | `/api/admin/role-permissions` | Update role permissions |
| GET | `/api/admin/sessions` | List active sessions |
| GET/POST | `/api/admin/smtp` | Get/test SMTP settings |
| GET | `/api/admin/api-logs` | View API call logs |
| GET | `/api/admin/reports` | Generate reports |
| GET/POST | `/api/admin/share-doc` | Share documents with agents |

#### Shopify Integration Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/shopify/products` | List Shopify products |
| GET | `/api/shopify/products/[handle]` | Get product by handle |
| GET | `/api/shopify/collections` | List Shopify collections |
| POST | `/api/shopify/cart` | Create/update Shopify cart |
| POST | `/api/shopify/checkout` | Create Shopify checkout |
| POST | `/api/shopify/checkout/complete` | Complete Shopify checkout |
| POST | `/api/shopify/checkout/verify` | Verify Shopify checkout |
| POST | `/api/shopify/sync` | Sync products from Shopify |
| GET | `/api/shopify/status` | Get Shopify connection status |
| GET | `/api/shopify/admin-token` | Get admin token status |
| POST | `/api/shopify/webhooks` | Receive Shopify webhooks |
| POST | `/api/shopify/webhooks/register` | Register webhook handlers |

#### AI Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/try-on` | Create AI try-on job (proxied to ai-proxy:3030) |
| GET | `/api/try-on/status` | Get try-on service status |
| GET | `/api/try-on?jobId=X` | Poll try-on job status |
| POST | `/api/try-on/analyze-selfie` | Analyze selfie for try-on |
| POST | `/api/try-on/remote` | Create try-on via remote proxy |
| POST | `/api/ai-assistant` | AI shopping chat |
| GET | `/api/ai-proxy` | AI proxy status |
| GET | `/api/image-proxy` | Proxy external images (avoids CORS) |
| POST | `/api/moderate-image` | Image moderation via AI |

#### Support Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/support/tickets` | List/create support tickets |
| GET/PUT | `/api/support/tickets/[id]` | Get/update ticket |
| GET/POST | `/api/support/tickets/[id]/messages` | List/add messages |
| GET/POST | `/api/support-tickets` | Legacy ticket endpoints |
| GET/POST | `/api/support-tickets/[id]/messages` | Legacy message endpoints |

#### Other Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/categories` | List categories |
| GET | `/api/currency/rates` | Get exchange rates |
| GET | `/api/exchange-rates` | Get exchange rates (alt) |
| GET | `/api/geo` | Geo-detect user's country |
| GET | `/api/config` | Get app configuration |
| GET/POST | `/api/reviews` | List/create product reviews |
| GET/POST/DELETE | `/api/wishlist` | Manage wishlist |
| GET/POST | `/api/coupons/validate` | Validate coupon code |
| GET/POST | `/api/offers` | List/create offers |
| POST | `/api/offers/validate` | Validate offer code |
| GET/POST | `/api/inventory` | List/manage inventory |
| GET/PUT | `/api/inventory/[productId]` | Get/update product inventory |
| GET | `/api/accounting` | Get accounting entries |
| GET/POST | `/api/invoices` | List/generate invoices |
| GET | `/api/invoices/[id]` | Get invoice |
| GET/POST | `/api/partners` | List/manage platform partners |
| GET/PUT/DELETE | `/api/partners/[id]` | Manage partner |
| POST | `/api/partners/[id]/sync` | Sync partner products |
| GET/POST | `/api/partners/[id]/category-maps` | Manage partner category mappings |
| GET/POST | `/api/vendors` | List/manage vendors |
| GET/PUT/DELETE | `/api/vendors/[id]` | Manage vendor |
| GET/POST | `/api/integrations` | List/manage integrations |
| POST | `/api/integrations/discover` | Discover available integrations |
| POST | `/api/integrations/sync` | Sync integration data |
| GET/PUT/DELETE | `/api/integrations/[id]` | Manage integration |
| GET/POST | `/api/wiki` | List/create wiki documents |
| GET/PUT/DELETE | `/api/wiki/[id]` | Manage wiki document |
| POST | `/api/wiki/[id]/share` | Share wiki document |
| GET/POST | `/api/portfolio` | Customer portfolio (AI style previews) |
| GET/POST | `/api/style-gallery` | Style gallery |
| GET/PUT/DELETE | `/api/style-gallery/[id]` | Manage style gallery entry |
| GET | `/api/dashboard` | User dashboard data |
| POST | `/api/affiliate/click` | Track affiliate click |
| GET | `/api/affiliate/stats` | Get affiliate statistics |
| POST | `/api/gift-recommend` | AI gift recommendations |
| POST | `/api/combo-suggestions` | Product combo suggestions |
| POST | `/api/smartbundle/create` | Create smart bundle |
| GET | `/api/family-shopping` | Family shopping features |
| GET | `/api/family/packages` | Family pack options |
| POST | `/api/social/analyze` | Analyze social media style |
| POST | `/api/social-style` | Get social style recommendations |
| GET | `/api/threebox-curate` | Curated collections |

### 3.2 Database Schema (Prisma)

The Prisma schema is located at `prisma/schema.prisma` with **28+ models**. The provider is `sqlite` for local development and `postgresql` for Vercel deployment (auto-switched via the build script).

**Database provider switching** (in `package.json` build script):
```json
"build": "node -e \"const fs=require('fs');const s=fs.readFileSync('prisma/schema.prisma','utf8');fs.writeFileSync('prisma/schema.prisma',s.replace('provider = \\\"sqlite\\\"','provider = \\\"postgresql\\\"'))\" && prisma generate && next build"
```

#### Complete Model Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Commerce Models                      │
├─────────────────────────────────────────────────────────────┤
│ Category (self-referential hierarchy)                        │
│   ├── id, name, slug (unique), description, image           │
│   ├── parentId → Category (self-ref)                        │
│   ├── children: Category[]                                  │
│   ├── products: Product[]                                   │
│   └── order: Int (sort)                                     │
│                                                              │
│ Product                                                      │
│   ├── id, productNumber (unique), name, slug (unique)       │
│   ├── description, price, compareAtPrice, costPrice, sku    │
│   ├── images (JSON array), categoryId → Category             │
│   ├── stock, stockStatus, reorderLevel                      │
│   ├── rating, reviewCount, featured                         │
│   ├── tags, occasions, recipientTypes, relationships (JSON)  │
│   ├── deliveryEstimate                                      │
│   ├── vendorId → Vendor, sourceUrl, platform                │
│   ├── affiliateUrl, affiliateId, commission                  │
│   ├── externalId, lastSyncedAt, syncStatus, isExternal      │
│   ├── variants: ProductVariant[]                            │
│   ├── productImages: ProductImage[]                         │
│   ├── cartItems: CartItem[], orderItems: OrderItem[]         │
│   ├── reviews: Review[], wishlistItems: WishlistItem[]       │
│   ├── campaigns: CorporateCampaign[]                        │
│   └── portfolioItems: CustomerPortfolio[]                   │
│                                                              │
│ ProductVariant                                               │
│   ├── id, productId → Product, name, sku                    │
│   ├── price, compareAtPrice, stock, stockStatus             │
│   ├── attributes (JSON: color, size, material)              │
│   ├── image, isActive                                       │
│   └── Cascading delete from Product                         │
│                                                              │
│ ProductImage                                                 │
│   ├── id, productId → Product, url, alt, sort, isActive     │
│   └── Cascading delete from Product                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Cart & Order Models                        │
├─────────────────────────────────────────────────────────────┤
│ Cart                                                         │
│   ├── id, sessionId (unique), userId, couponCode            │
│   └── items: CartItem[]                                     │
│                                                              │
│ CartItem                                                     │
│   ├── id, cartId → Cart, productId → Product                │
│   ├── quantity, variantId, giftWrapping                     │
│   ├── greetingMessage, hidePrice                            │
│   └── Cascading delete from Cart                            │
│                                                              │
│ Order                                                        │
│   ├── id, orderNumber (unique), email, firstName, lastName  │
│   ├── address, city, state, zipCode, country, phone         │
│   ├── subtotal, shipping, tax, discount, total              │
│   ├── status (pending/processing/shipped/delivered/cancelled)│
│   ├── paymentMethod, paymentStatus (pending/paid/failed/refunded)│
│   ├── deliveryType (standard/express/same-day/scheduled)    │
│   ├── scheduledDate, occasion                               │
│   ├── giftWrapping, giftWrapStyle, greetingMessage, hidePrice│
│   ├── couponCode, trackingNumber, trackingUrl               │
│   ├── estimatedDelivery, cancelledAt, cancelReason          │
│   ├── refundStatus, refundAmount, refundedAt                │
│   ├── userId                                                │
│   ├── items: OrderItem[], reviews: Review[]                 │
│   ├── trackingEvents: OrderTrackingEvent[]                  │
│   ├── paymentSessions: PaymentSession[]                     │
│   └── invoice: OrderInvoice?                                │
│                                                              │
│ OrderItem                                                    │
│   ├── id, orderId → Order, productId → Product              │
│   ├── name, price, quantity, image                          │
│   ├── variantId, variantName, giftWrapping                  │
│   └── greetingMessage, hidePrice                            │
│                                                              │
│ OrderTrackingEvent                                           │
│   ├── id, orderId → Order, status, description, location    │
│   └── timestamp                                             │
│                                                              │
│ PaymentSession                                               │
│   ├── id, orderId → Order, provider (razorpay/stripe)       │
│   ├── providerSessionId, amount, currency, status           │
│   ├── paymentId, method, metadata (JSON)                    │
│   └── Cascading delete from Order                           │
│                                                              │
│ OrderInvoice                                                 │
│   ├── id, orderId (unique), invoiceNumber (unique)          │
│   ├── amount, tax, total, status, pdfUrl                    │
│   └── One-to-one with Order                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    User & Auth Models                         │
├─────────────────────────────────────────────────────────────┤
│ User                                                         │
│   ├── id, email (unique), name, password (bcrypt hash)      │
│   ├── role (admin/user/agent/team/corporate)                │
│   ├── adminRole (super_admin/product_manager/etc.)          │
│   ├── corporateRole (corporate_admin/finance_user/etc.)     │
│   ├── avatar, phone, isActive                               │
│   ├── emailVerified, phoneVerified                          │
│   ├── twoFactorSecret, twoFactorEnabled, twoFactorRequired  │
│   ├── approvalStatus (pending/approved/rejected/suspended)  │
│   ├── socialProvider, socialId                              │
│   ├── resetToken, resetTokenExpiry                          │
│   ├── otpCode, otpExpiry                                    │
│   ├── emailVerifyToken, emailVerifyExpiry                   │
│   ├── phoneVerifyCode, phoneVerifyExpiry                    │
│   ├── lastLoginAt, lastLoginIp, lastLoginDevice             │
│   ├── preferredLanguage, preferredCurrency, detectedCountry  │
│   ├── permissions: UserPermission[]                         │
│   ├── sessions: Session[]                                   │
│   ├── wishlistItems: WishlistItem[]                         │
│   ├── corporateAccount: CorporateAccount?                   │
│   └── auditLogs: AuditLog[]                                 │
│                                                              │
│ UserPermission                                               │
│   ├── id, userId → User, permission (e.g. "products.manage")│
│   └── @@unique([userId, permission])                        │
│                                                              │
│ Session                                                      │
│   ├── id, token (unique), userId → User                     │
│   ├── ipAddress, userAgent, deviceInfo                      │
│   ├── expiresAt, lastActivity                               │
│   └── Cascading delete from User                            │
│                                                              │
│ AuditLog                                                     │
│   ├── id, userId → User (nullable, SetNull on delete)       │
│   ├── action, entity, entityId, details (JSON)              │
│   ├── ipAddress, userAgent                                  │
│   └── createdAt                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Corporate Gifting Models                      │
├─────────────────────────────────────────────────────────────┤
│ CorporateAccount                                             │
│   ├── id, companyName, slug (unique), industry, website     │
│   ├── gstNumber, panNumber, billingAddress/City/State/Zip   │
│   ├── contactName, contactEmail, contactPhone               │
│   ├── address, city, state, zipCode, country, logo          │
│   ├── userId → User (unique)                                │
│   ├── approvalStatus, isActive                              │
│   ├── creditLimit, creditUsed, discountPercent              │
│   ├── campaigns: CorporateCampaign[]                        │
│   ├── branding: CorporateBranding?                          │
│   └── members: CorporateMember[]                            │
│                                                              │
│ CorporateMember                                              │
│   ├── id, corporateId → CorporateAccount, userId?           │
│   ├── email, name, role, status, invitedAt, joinedAt        │
│   └── @@unique([corporateId, email])                        │
│                                                              │
│ CorporateBranding                                            │
│   ├── id, corporateId (unique) → CorporateAccount           │
│   ├── logoUrl, primaryColor, secondaryColor, customMessage  │
│   ├── packagingType, giftWrapStyle, includeBranding         │
│   ├── hidePrice, cardTemplate                               │
│   └── Cascading delete from CorporateAccount                │
│                                                              │
│ CorporateCampaign                                            │
│   ├── id, corporateId → CorporateAccount                    │
│   ├── name, occasion, description, budgetPerRecipient       │
│   ├── totalBudget, status (draft→pending_approval→approved) │
│   ├── deliveryType, deliveryDate, message                   │
│   ├── productId? → Product                                  │
│   └── recipients: CampaignRecipient[]                       │
│                                                              │
│ CampaignRecipient                                            │
│   ├── id, campaignId → CorporateCampaign                    │
│   ├── name, email, phone, designation, department           │
│   ├── address, city, state, zipCode                         │
│   ├── productId? → Product (override campaign product)      │
│   ├── budget (override), message (override)                 │
│   ├── giftStatus (pending/ordered/shipped/delivered/cancelled)│
│   └── orderId?                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Supporting Models                          │
├─────────────────────────────────────────────────────────────┤
│ Vendor: id, name, slug, contactName, email, phone, address  │
│         gstNumber, isActive → products: Product[]           │
│         invoices: Invoice[]                                 │
│                                                              │
│ Invoice: id, invoiceNumber (unique), vendorId?, orderId?    │
│          amount, tax, total, status, dueDate, paidDate      │
│          → items: InvoiceItem[]                              │
│                                                              │
│ InvoiceItem: id, invoiceId → Invoice, description, qty,     │
│              unitPrice, amount                               │
│                                                              │
│ AccountEntry: id, entryNumber (unique), type (debit/credit) │
│               category, amount, description, reference       │
│                                                              │
│ InventoryLog: id, productId → Product, type (in/out/adj),   │
│               quantity, note                                 │
│                                                              │
│ WishlistItem: id, userId → User, productId → Product        │
│               @@unique([userId, productId])                  │
│                                                              │
│ PaymentMethod: id, type, provider, last4, isDefault, userId │
│                                                              │
│ Offer: id, title, description, code (unique), type, value   │
│        minOrder, maxDiscount, validFrom, validTo, isActive  │
│        usageLimit, usedCount                                 │
│                                                              │
│ Coupon: id, code (unique), title, type, value, minOrder     │
│         maxDiscount, validFrom, validTo, isActive           │
│         usageLimit, usedCount                                │
│                                                              │
│ SupportTicket: id, subject, status, priority, userId        │
│                → messages: SupportTicketMessage[]            │
│                                                              │
│ SupportTicketMessage: id, ticketId → SupportTicket           │
│                       senderId, message                      │
│                                                              │
│ Review: id, productId → Product, orderId? → Order           │
│         userId?, userName, rating (1-5), title, comment     │
│         verified                                            │
│                                                              │
│ CustomerPortfolio: id, productId → Product, userId?         │
│                    userName, aiGeneratedImage, originalSelfie│
│                    rating, reviewTitle, reviewComment        │
│                    consentGiven, isApproved, isActive        │
│                                                              │
│ WikiDocument: id, title, content, category, createdBy       │
│                                                              │
│ AgentDocShare: id, agentId, docId, sharedBy, canDownload    │
│                canShare, message                             │
│                                                              │
│ AffiliateClick: id, productId, platform, sourceUrl          │
│                  referralCode, ipAddress, userAgent          │
│                                                              │
│ PlatformIntegration: id, name (unique), slug (unique)       │
│                      baseUrl, logo, isActive, autoSync      │
│                      syncInterval, lastSyncedAt, syncStatus  │
│                      lastSyncError, categories (JSON)       │
│                      affiliateTag, commission, maxProducts   │
│                      productCount → syncLogs, categoryMaps  │
│                                                              │
│ SyncLog: id, integrationId → PlatformIntegration, type      │
│           status, productsFound/Added/Updated/Removed, error│
│           startedAt, completedAt                             │
│                                                              │
│ PartnerCategoryMap: id, integrationId → PlatformIntegration  │
│                      partnerCatName, partnerCatSlug          │
│                      localCatId?                             │
│                      @@unique([integrationId, partnerCatSlug])│
│                                                              │
│ CurrencyRate: id, code (unique), name, symbol, rate         │
│                                                              │
│ GeoCountry: id, code (unique), name, currencyCode           │
│             languageCode, flagEmoji                          │
└─────────────────────────────────────────────────────────────┘
```

**Indexing strategy:**
- All `slug` fields are `@unique` (fast lookups by URL-friendly identifier)
- All `email` fields are `@unique`
- Foreign keys are indexed automatically by Prisma
- Composite unique constraints on `UserPermission(userId, permission)`, `WishlistItem(userId, productId)`, `CorporateMember(corporateId, email)`, `PartnerCategoryMap(integrationId, partnerCatSlug)`
- JSON fields (images, tags, occasions, attributes) are stored as strings — parsed at the application layer

### 3.3 Authentication & Security

#### JWT Token System

The authentication system uses a **dual-token approach** with JWT and DB-backed sessions:

```
Access Token:
  - Type: JWT
  - Expiry: 15 minutes
  - Payload: { userId, email, role, permissions, type: "access" }
  - Signed with: JWT_SECRET (HS256)

Refresh Token:
  - Type: JWT
  - Expiry: 7 days
  - Payload: { userId, type: "refresh" }
  - Signed with: JWT_SECRET (HS256)

Session Token (legacy):
  - Type: UUID
  - Expiry: 7 days
  - Stored in: Session table + in-memory cache
```

**Session lookup priority** (in `src/lib/auth.ts`):
1. **In-memory cache** — fastest, checks `sessionCache` Map
2. **JWT verification** — works on Vercel serverless without DB
3. **DB session lookup** — fallback for legacy UUID tokens

**In-memory session cache** (in `src/lib/sessions.ts`):
```typescript
const sessionCache = new Map<string, {
  userId: string; expiresAt: Date;
  id: string; email: string; name: string; role: string;
}>();
```
- Expired entries cleaned every 5 minutes (development only)
- On Vercel serverless, each invocation starts fresh — JWT is the primary mechanism

#### Two-Factor Authentication (2FA)

2FA is **mandatory** for roles: `admin`, `team`, `agent`, `corporate`.

**Supported methods:**
1. **Email OTP** — 6-digit code sent via email, expires in 5 minutes
2. **TOTP** — Time-based One-Time Password (Authenticator apps like Google Authenticator)

**2FA flow during login:**
```
1. User logs in with email/password
2. If user.twoFactorEnabled OR role in [admin, team, agent, corporate]:
   a. Generate 6-digit OTP
   b. Store OTP in user.otpCode + user.otpExpiry (DB)
   c. Send OTP via email (fire-and-forget)
   d. Return { requiresTwoFactor: true, userId, method: 'email' }
3. Frontend shows OTP input dialog
4. User submits OTP
5. POST /api/auth/2fa/email-otp { userId, otp }
6. Verify OTP against DB or in-memory demo store
7. On success: generate JWT + create session → return { user, token }
```

#### Rate Limiting

Implemented in `src/lib/rate-limiter.ts` with in-memory tracking:

| Endpoint | Max Requests | Window |
|----------|-------------|--------|
| `login` | 5 | 15 minutes |
| `otp-login` | 3 | 5 minutes |
| `register` | 3 | 1 hour |
| `forgot-password` | 3 | 15 minutes |
| `2fa-verify` | 5 | 5 minutes |

Rate limit is tracked by `endpoint:ip` key. Returns 429 with `Retry-After` header when exceeded.

#### AES-256-GCM Encryption

Sensitive fields (phone numbers, GST numbers, billing addresses) are encrypted at rest using AES-256-GCM (`src/lib/encryption.ts`):

```typescript
// Encryption format: "iv:tag:encrypted" (all hex-encoded)
export function encrypt(plaintext: string | null): string | null
export function decrypt(encryptedString: string | null): string | null
export function isEncrypted(value: string | null): boolean
```

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **IV**: 16 bytes random per encryption
- **Auth Tag**: 16 bytes
- **Key**: 32 bytes from `ENCRYPTION_KEY` env var (hex) or dev default
- **Backward compatibility**: `decrypt()` returns raw value if format doesn't match (unencrypted legacy data)

#### Role-Based Access Control (RBAC)

Five roles with granular permissions:

| Role | Description | Typical Permissions |
|------|------------|---------------------|
| `admin` | Full system access | `products.manage`, `orders.manage`, `users.approve`, `users.manage`, `reports.view`, `settings.manage`, `inventory.manage` |
| `user` | Regular customer | `orders.own`, `cart.manage`, `wishlist.manage`, `profile.own` |
| `agent` | Customer support | `orders.view`, `orders.manage`, `products.view`, `customers.view`, `reports.view` |
| `team` | Operations team | `orders.view`, `products.view`, `inventory.manage`, `reports.view` |
| `corporate` | Corporate buyer | `corporate.manage`, `campaigns.manage`, `branding.manage`, `recipients.manage` |

**Sub-roles for admins**: `super_admin`, `product_manager`, `order_manager`, `inventory_manager`, `finance_manager`, `support_agent`, `corporate_account_manager`

**Sub-roles for corporate**: `corporate_admin`, `finance_user`, `campaign_manager`

Permissions are stored in the `UserPermission` table and embedded in JWT access tokens.

#### Audit Logging

Every significant action is logged in the `AuditLog` table:
- Login/logout events
- Password changes
- Role changes
- Approval status changes
- MFA setup
- Entity modifications (with before/after details)

### 3.4 Email System

Located in `src/lib/email.ts`, the email system uses **Nodemailer** with a fallback chain:

```
1. Gmail SMTP (primary)
   ├─ Host: smtp.gmail.com:587
   ├─ Auth: SMTP_USER + SMTP_PASS
   └─ 15-second timeout

2. Ethereal Email (testing fallback)
   ├─ Auto-creates temporary inbox
   ├─ Returns preview URL for viewing in browser
   └─ 10-second account creation timeout + 15-second send timeout

3. Console log (last resort)
   └─ Logs email content to stdout
```

**Email templates:**
- **2FA verification code** — 6-digit OTP with 5-minute expiry, luxury gold/amber theme
- **Password reset** — Reset link with 1-hour expiry, "Reset Password" button
- **Email verification** — Verification code with 24-hour expiry

All templates use inline CSS with the 3 Boxes Luxury brand colors (amber/gold on dark stone background).

### 3.5 Shopify Integration

The Shopify integration spans two client modules:

#### Storefront API Client (`src/lib/shopify/client.ts`)
- **Purpose**: READ operations for the storefront
- **Uses**: `SHOPIFY_STOREFRONT_TOKEN`
- **Features**: Product listing, collection browsing, cart management, checkout creation

#### Admin API Client (`src/lib/shopify/admin-client.ts`)
- **Purpose**: WRITE operations (product/collection CRUD, sync)
- **Uses**: `SHOPIFY_ADMIN_TOKEN`
- **Store**: `3boxesluxury-2.myshopify.com`
- **API Version**: `2025-01`
- **Features**:
  - Product CRUD (`createShopifyProduct`, `updateShopifyProduct`, `deleteShopifyProduct`)
  - Collection CRUD (`createShopifyCustomCollection`, etc.)
  - Collect management (product ↔ collection linking)
  - Shop info retrieval
  - Connection testing (`testAdminConnection`)
  - Local-to-Shopify product conversion (`localProductToShopifyInput`)
  - Local-to-Shopify category conversion (`localCategoryToShopifyCollectionInput`)
  - GID ↔ numeric ID conversion helpers

**Category mapping and hierarchy:**
- Shopify collections map to local `Category` model
- `PartnerCategoryMap` stores the mapping between partner categories and local categories
- Parent-child category relationships are preserved via self-referential `Category.parentId`

**Product sync flow:**
```
1. GET /api/shopify/sync
2. Fetch all Shopify products (paginated, 250 per page)
3. For each product:
   a. Check if exists in DB (by externalId or handle)
   b. If exists → update price, stock, images
   c. If not → create new Product record
4. Map Shopify collections to Categories
5. Update PlatformIntegration.syncStatus and lastSyncedAt
6. Log results in SyncLog
```

**Webhook handling** (`/api/shopify/webhooks`):
- Receives Shopify webhooks for product/collection/order updates
- Verifies webhook signature using HMAC-SHA256
- Processes the event and updates local DB

### 3.6 Multi-Currency & i18n

#### Supported Currencies (10)

| Code | Name | Symbol | Locale |
|------|------|--------|--------|
| USD | US Dollar | $ | en-US |
| EUR | Euro | € | de-DE |
| GBP | British Pound | £ | en-GB |
| INR | Indian Rupee | ₹ | en-IN |
| AED | UAE Dirham | د.إ | ar-AE |
| SAR | Saudi Riyal | ﷼ | ar-SA |
| SGD | Singapore Dollar | S$ | en-SG |
| AUD | Australian Dollar | A$ | en-AU |
| CAD | Canadian Dollar | C$ | en-CA |
| JPY | Japanese Yen | ¥ | ja-JP |

**Default rates** (hardcoded fallback in `src/lib/currency/config.ts`):
```typescript
export const DEFAULT_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.50,
  AED: 3.67, SAR: 3.75, SGD: 1.34, AUD: 1.53,
  CAD: 1.36, JPY: 149.50,
};
```

Live rates are fetched from `/api/currency/rates` or `/api/exchange-rates` and stored in the `CurrencyRate` DB table.

#### Supported Languages (10)

| Code | Name | RTL |
|------|------|-----|
| en | English | No |
| hi | हिन्दी | No |
| ar | العربية | **Yes** |
| fr | Français | No |
| de | Deutsch | No |
| es | Español | No |
| zh | 简体中文 | No |
| ja | 日本語 | No |
| ko | 한국어 | No |
| pt | Português | No |

**i18n system** (`src/lib/i18n/index.ts`):
- Translation files in `src/lib/i18n/translations/{locale}.json`
- Dot-notation keys (e.g., `common.shopNow`)
- Variable interpolation with `{variable}` syntax
- RTL detection for Arabic, Hebrew, Farsi, Urdu
- Dynamic loading — translations are loaded on demand when locale changes
- English fallback when a key is missing in the target locale

**Geo-detection** (`/api/geo`):
1. Uses `x-forwarded-for` or `x-real-ip` header to get client IP
2. Looks up country in `GeoCountry` table
3. Returns `{ country, countryName, currency, language, flagEmoji }`
4. Auto-sets currency and language on first visit (only if user hasn't manually set preferences)

---

## 4. Mini-Services Architecture

### 4.1 ai-proxy (Port 3030)

**Location**: `mini-services/ai-proxy/index.ts`

A standalone Node.js HTTP server that wraps the **ZAI SDK** for AI virtual try-on functionality. It exists as a separate service because:

1. The ZAI SDK is only available in the sandbox environment
2. Vercel serverless functions cannot access the local ZAI service
3. The proxy allows the Vercel-deployed app to reach the AI service via the sandbox gateway

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/try-on/status` | Health check — returns `{ available: boolean }` |
| POST | `/api/try-on` | Create try-on job — returns `{ jobId, status }` |
| GET | `/api/try-on?jobId=X` | Poll job status — returns `{ status, imageUrl, progress, ... }` |

**AI generation strategies (ordered by quality):**

1. **edit-both** — Pass both selfie and product image to ZAI image edit API. Best for color accuracy (face: 8/10, product: 9/10).
2. **edit-selfie** — Pass selfie only, describe product in text. Best for face preservation (face: 9/10, product: 6/10).
3. **edit-product** — Pass product image only, describe person in text. Good product match (face: 5/10, product: 8/10).
4. **create-detailed** — Text-to-image from both descriptions. Last resort (face: 4/10, product: 6/10).

**Job management:**
- Jobs stored in-memory `Map<string, TryOnJob>`
- Auto-cleaned after 10 minutes
- Rate-limited with 1.5s delay between API calls
- Watermark applied via Sharp (SVG overlay: "3BOXES GIFTS / AI Style Preview")

### 4.2 app-web (Port 3002)

**Location**: `mini-services/app-web/index.ts`

A **Bun static file server** that serves the Flutter web app build:

```typescript
serve({
  port: 3002,
  fetch(req) {
    // Serves from flutter_app/build/web/
    // SPA routing: unknown paths → index.html
    // Cache: HTML = no-cache, assets = 1 year
  },
});
```

- Serves the compiled Flutter web app from `flutter_app/build/web/`
- Includes MIME type mapping for `.wasm`, `.js`, `.json`, images, fonts
- Directory traversal protection
- SPA fallback routing (unknown paths serve `index.html`)
- CORS headers on all responses

### 4.3 Caddy Gateway Configuration

**File**: `Caddyfile`

```caddy
:81 {
    # Route AI try-on requests to ai-proxy
    @ai_tryon path /api/try-on*
    handle @ai_tryon {
        reverse_proxy localhost:3030
    }

    # Dynamic port proxying (for debugging)
    @transform_port_query {
        query XTransformPort=*
    }
    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort}
    }

    # Default: proxy to Next.js app
    handle {
        reverse_proxy localhost:3000
    }
}
```

**Routing rules:**
1. `/api/try-on*` → `ai-proxy:3030` (AI try-on requests)
2. `?XTransformPort=N` → `localhost:N` (dynamic port proxying for sandbox debugging)
3. Everything else → `next.js:3000` (main application)

---

## 5. Data Flow Diagrams

### 5.1 Product Browsing Flow

```
User clicks category
       │
       ▼
Zustand: setCategory(slug)
       │
       ▼
ProductGrid re-renders
       │
       ▼
┌──────────────────────┐
│  GET /api/products    │
│  ?category=slug       │
│  &search=query        │
│  &sort=newest         │
│  &page=1              │
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │ DB query?  │
     ├───────────┤
     │ Available │──► Return DB products
     │           │
     │ Empty/    │──► Try Shopify Storefront API
     │ Unavail   │    ├─ Success ─► Return Shopify products
     │           │    └─ Fail ──► Return static-products.ts
     └───────────┘
           │
           ▼
ProductGrid renders ProductCards
with currency conversion (useCurrency)
and translation (useTranslation)
```

### 5.2 Checkout Flow

```
CartView → "Proceed to Checkout"
       │
       ▼
CheckoutView (multi-step)
  Step 1: Shipping info
  Step 2: Delivery option
  Step 3: Gift options
  Step 4: Payment method
  Step 5: Order review
       │
       ▼
POST /api/checkout
  ├─ Validate coupon (POST /api/coupons/validate)
  ├─ Calculate shipping + tax (POST /api/checkout/estimate)
  ├─ Create Order in DB (status: pending)
  └─ Create PaymentSession
       │
       ▼
POST /api/payments/create-session
  ├─ Razorpay (INR): Create Razorpay order
  └─ Stripe (International): Create checkout session
       │
       ▼
[Payment gateway processing]
       │
       ▼
POST /api/payments/verify
  ├─ Verify payment with provider
  ├─ Update Order.paymentStatus = 'paid'
  ├─ Update PaymentSession.status = 'paid'
  ├─ Decrement product stock
  └─ Generate order invoice
       │
       ▼
OrderConfirmation view
  └─ Display order number, tracking info
```

### 5.3 AI Try-On Flow

```
User clicks "Try On" on ProductCard
       │
       ▼
TryOnDialog opens
  ├─ User uploads selfie (or uses webcam)
  └─ Product image auto-selected
       │
       ▼
POST /api/try-on/analyze-selfie
  └─ Returns person description via VLM
       │
       ▼
POST /api/try-on
  ├─ Caddy routes to ai-proxy:3030
  └─ ai-proxy starts background processing:
       │
       ├─ Phase 0: Fetch product suggestions
       ├─ Phase 0.5: Try HuggingFace IDM-VTON (free, no ZAI)
       │   ├─ Success ─► Return result
       │   └─ Fail ──► Continue to ZAI pipeline
       ├─ Phase 1: VLM analyze product image
       ├─ Phase 2: VLM analyze person selfie
       ├─ Phase 3: Generate with dual-image edit
       ├─ Phase 4: VLM verify (6-dimension check)
       │   ├─ PASS ─► Accept result
       │   └─ FAIL ─► Refine (up to 2 passes)
       ├─ Phase 4.5: Product-overlay composite (if color still poor)
       └─ Phase 5: Add watermark + deliver
       │
       ▼
Frontend polls GET /api/try-on?jobId=X
  └─ Every 2 seconds until status = 'completed' or 'failed'
       │
       ▼
Display result image with:
  ├─ Watermark ("3BOXES GIFTS / AI Style Preview")
  ├─ Color accuracy score
  ├─ Product suggestions
  └─ "Add to Cart" button
```

### 5.4 Corporate Gifting Flow

```
Corporate user registers
       │
       ▼
POST /api/corporate/register
  ├─ Create User (role: corporate)
  ├─ Create CorporateAccount (approvalStatus: pending)
  └─ Send verification email
       │
       ▼
Admin approves account
  ├─ PUT /api/admin/corporate/[id]/status
  └─ CorporateAccount.approvalStatus = 'approved'
       │
       ▼
Corporate dashboard:
  ├─ Invite team members (POST /api/corporate/members)
  ├─ Set up branding (POST /api/corporate/branding)
  └─ Create campaign:
       │
       ▼
POST /api/corporate/campaigns
  ├─ Select product or budget per recipient
  ├─ Add recipients individually or CSV import
  ├─ Set delivery date and greeting message
  └─ Campaign status: 'draft'
       │
       ▼
POST /api/corporate/campaigns/[id]/submit
  └─ Campaign status: 'pending_approval'
       │
       ▼
Admin reviews campaign
  ├─ Approve → status: 'approved' → 'in_progress'
  └─ Reject → status back to 'draft'
       │
       ▼
Campaign execution:
  ├─ Create orders for each recipient
  ├─ Apply corporate discount
  ├─ Custom packaging with branding
  └─ Track delivery per recipient
```

### 5.5 Authentication Flow

```
┌──────────────┐
│  AuthDialog   │
│  login/register│
└──────┬───────┘
       │
       ▼
POST /api/auth/login { email, password }
       │
       ├── DB available?
       │   ├── Yes → Lookup user, bcrypt.compare
       │   │   ├── Invalid → 401
       │   │   ├── Account inactive → 403
       │   │   ├── 2FA required? (admin/team/agent/corporate)
       │   │   │   ├── Yes → Generate OTP
       │   │   │   │   ├── Store in DB (user.otpCode + otpExpiry)
       │   │   │   │   ├── Send via email (fire-and-forget)
       │   │   │   │   └── Return { requiresTwoFactor: true, userId, method: 'email' }
       │   │   │   │       │
       │   │   │   │       ▼
       │   │   │   │   POST /api/auth/2fa/email-otp { userId, otp }
       │   │   │   │   ├── Verify OTP
       │   │   │   │   └── Generate JWT + Create session
       │   │   │   └── No → Generate JWT + Create session
       │   │   └── Return { user, token }
       │   └── No → Try demo user fallback
       │       ├── Match → Generate JWT (same flow)
       │       └── No match → 401
       │
       ▼
Zustand: setAuth(user, token)
  ├── Store in localStorage ('3boxes_auth')
  ├── Set authUser + authToken in store
  └── Close AuthDialog

Subsequent API calls:
  └── Authorization: Bearer {token}
       │
       ▼
verifyAuth() in src/lib/auth.ts
  ├── Check in-memory session cache
  ├── Try JWT verification
  └── Fallback to DB session lookup
```

---

## 6. Error Handling Strategy

### 6.1 Error Boundary at App Level

The `ErrorBoundary` React class component wraps every major section in `page.tsx`:

```typescript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      // Detect data-related errors (undefined, null, length, map is not a function)
      // Show contextual error message with "Try again" button
    }
    return this.props.children;
  }
}
```

**Wrapping strategy:**
- Top-level: `ErrorBoundary` wraps the entire app
- Section-level: Each home section (`HeroSection`, `CategoryGrid`, `ProductGrid`, etc.) has its own `ErrorBoundary` with `fallback={null}` — so a crash in one section doesn't break others
- Overlay-level: `AuthDialog`, `GiftBuilder`, `GiftAssistant` each have their own `ErrorBoundary`

### 6.2 API Error Responses

All API routes follow a consistent error response format:

```typescript
// Client errors (4xx)
NextResponse.json({ error: 'Description of what went wrong' }, { status: 400 });

// Auth errors (401, 403)
NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
NextResponse.json({ error: 'Your account is pending approval', approvalStatus: 'pending' }, { status: 403 });

// Rate limit errors (429)
NextResponse.json({ error: 'Too many requests', retryAfter: 300 }, { status: 429 });

// Server errors (5xx)
NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
```

### 6.3 Fallback Strategies

#### Demo Users Fallback

When the database is unavailable (common on Vercel without PostgreSQL), the login endpoint falls back to **hardcoded demo users**:

```typescript
const DEMO_USERS: Record<string, { name: string; role: string; password: string; permissions: string[] }> = {
  'admin@3boxesluxury.com': { name: 'Admin', role: 'admin', password: 'admin123', ... },
  'user@3boxesluxury.com':  { name: 'User', role: 'user', password: 'user123', ... },
  'agent@3boxesluxury.com': { name: 'Agent', role: 'agent', password: 'agent123', ... },
  'team@3boxesluxury.com':  { name: 'Team', role: 'team', password: 'team123', ... },
  'corporate@3boxesluxury.com': { name: 'TechCorp Industries', role: 'corporate', password: 'corporate123', ... },
};
```

These users:
- Work without any database
- Get JWT tokens that work on Vercel serverless
- Have full role-based permissions
- Include 2FA flow for admin/agent/team/corporate roles
- In development mode, the OTP is included in the response for testing (`_otp` field)

#### Static Products Fallback

When both DB and Shopify are unavailable, products come from `src/lib/static-products.ts`:
- **Office Products** (12 items): Corporate gifts, desk accessories, stationery
- **New Arrivals** (6 items): Watches, scarves, fragrances, chocolate, card holders, decanters
- **Kids Products** (10 items): Shirts and dresses by age group

Each static product has full details: images, price, compare-at price, rating, review count, tags, delivery estimate.

#### Canvas Overlay Fallback (AI Try-On)

When the AI try-on service is unavailable, the try-on dialog falls back to a **canvas-based overlay** that simply composites the product image on top of the selfie at reduced opacity. This provides a basic visual preview even without AI.

#### Session Fallback Chain

```
1. In-memory cache (fastest) → works for current server process
2. JWT verification (no DB needed) → works on Vercel serverless
3. DB session lookup → works for legacy UUID tokens
4. Return null → unauthenticated
```

---

## 7. Performance Optimizations

### 7.1 Image Proxying with Caching

The `/api/image-proxy` endpoint serves external images through the server to avoid CORS issues and enable caching:

```
Client → GET /api/image-proxy?url=external-url
      → Server fetches image
      → Server returns with cache headers
      → Browser caches the image
```

### 7.2 Zustand Store for Instant UI Updates

All state mutations (add to cart, change currency, change language, set category) are **synchronous** through Zustand — there's no loading state for UI transitions. The Zustand store updates instantly, then API calls happen in the background:

```typescript
// Instant UI update + background API sync
addItem: (item) => set((state) => {
  const existing = state.cartItems.find((ci) => ci.productId === item.productId);
  if (existing) {
    return { cartItems: state.cartItems.map(...) };
  }
  return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] };
}),
```

### 7.3 Lazy Loading and Code Splitting

- Components are dynamically imported where possible
- Heavy components (AdminDashboard, CorporateDashboard) render only when their view is active
- Images use `loading="lazy"` for below-the-fold content
- Product images use the image proxy for optimization

### 7.4 PWA with Service Worker

The app is a **Progressive Web App** with:
- **Manifest**: `public/manifest.json` — app name, icons (192px and 512px), theme color, display mode
- **Service Worker**: `public/sw.js` — caches static assets and API responses
- **Install Prompt**: `usePWAInstall` hook captures the `beforeinstallprompt` event globally (before React mounts) to prevent race conditions
- **App Download Banner**: `AppDownloadBanner` component shows when PWA install is available

Service worker headers (from `next.config.ts`):
```typescript
{
  source: '/sw.js',
  headers: [
    { key: 'Cache-Control', value: 'public, max-age=0' },
    { key: 'Service-Worker-Allowed', value: '/' },
    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
  ],
}
```

### 7.5 Shopify Caching

- Shopify Storefront API responses are cached with a **5-minute TTL**
- Product data is cached in the DB after sync
- Categories are cached after initial fetch
- Admin API calls are rate-limited to avoid hitting Shopify API limits

### 7.6 Database Optimization

- **SQLite WAL mode** for concurrent reads during local development
- **Connection pooling** via Prisma's built-in pool (5 connections default)
- **Prisma singleton pattern** to avoid creating multiple client instances in development:
  ```typescript
  export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ['error', 'warn'] });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
  ```
- **JSON fields** for arrays (images, tags, occasions) — avoids join queries for simple lists
- **Composite unique constraints** prevent duplicate entries at the DB level

### 7.7 Build Optimization

- **TypeScript ignore errors** during build (`typescript: { ignoreBuildErrors: true }`) — speeds up production builds
- **PostgreSQL auto-switch** in build script — no manual schema changes needed
- **Static product pre-generation** — products are included in the JS bundle for instant display

---

## Appendix A: Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` | Prisma connection string |
| `JWT_SECRET` | Yes | `3boxes-secret-key` | JWT signing secret |
| `SHOPIFY_STORE_DOMAIN` | No | `3boxesluxury-2.myshopify.com` | Shopify store domain |
| `SHOPIFY_STOREFRONT_TOKEN` | No | — | Shopify Storefront API token |
| `SHOPIFY_ADMIN_TOKEN` | No | — | Shopify Admin API token |
| `SHOPIFY_API_VERSION` | No | `2025-01` | Shopify API version |
| `SMTP_HOST` | No | `smtp.gmail.com` | Email SMTP host |
| `SMTP_PORT` | No | `587` | Email SMTP port |
| `SMTP_USER` | No | — | Email SMTP username |
| `SMTP_PASS` | No | — | Email SMTP password |
| `SMTP_FROM` | No | `SMTP_USER` | Email from address |
| `ZAI_BASE_URL` | No | — | ZAI AI service URL |
| `ZAI_API_KEY` | No | — | ZAI AI API key |
| `ZAI_PROXY_URL` | No | — | ZAI proxy URL for Vercel |
| `ZAI_CHAT_ID` | No | — | ZAI chat ID |
| `ZAI_TOKEN` | No | — | ZAI auth token |
| `ZAI_USER_ID` | No | — | ZAI user ID |
| `ENCRYPTION_KEY` | No | Dev default | 32-byte hex key for AES-256-GCM |
| `NEXT_PUBLIC_URL` | No | `https://3boxes.in` | Public app URL |
| `VERCEL` | Auto | — | Set by Vercel runtime |

## Appendix B: Quick Start for New Developers

```bash
# 1. Install dependencies
npm install

# 2. Set up the database
npx prisma db push
npx prisma db seed    # Seeds demo users and categories

# 3. Start the development server
npm run dev            # Runs on port 3000

# 4. (Optional) Start AI proxy for try-on
cd mini-services/ai-proxy
npm install
npx tsx index.ts       # Runs on port 3030

# 5. (Optional) Start Flutter web app server
cd mini-services/app-web
bun run index.ts       # Runs on port 3002

# 6. (Optional) Start Caddy gateway
caddy run              # Proxies :81 to :3000, :3030
```

**Demo login credentials:**

| Email | Password | Role |
|-------|----------|------|
| `admin@3boxesluxury.com` | `admin123` | Admin |
| `user@3boxesluxury.com` | `user123` | User |
| `agent@3boxesluxury.com` | `agent123` | Agent |
| `team@3boxesluxury.com` | `team123` | Team |
| `corporate@3boxesluxury.com` | `corporate123` | Corporate |

> **Note:** In development mode, 2FA OTPs are included in the API response (`_otp` field) for easy testing. Check the browser console for OTP values.

## Appendix C: Project Directory Structure

```
my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx              # SPA shell (view router)
│   │   ├── layout.tsx            # Root layout
│   │   ├── error.tsx             # Error page
│   │   ├── global-error.tsx      # Global error boundary
│   │   ├── globals.css           # Global styles
│   │   └── api/                  # 100+ API route handlers
│   │       ├── auth/             # Authentication endpoints
│   │       ├── products/         # Product endpoints
│   │       ├── cart/             # Cart endpoints
│   │       ├── checkout/         # Checkout endpoints
│   │       ├── orders/           # Order endpoints
│   │       ├── corporate/        # Corporate gifting endpoints
│   │       ├── admin/            # Admin endpoints
│   │       ├── shopify/          # Shopify integration endpoints
│   │       ├── try-on/           # AI try-on endpoints
│   │       ├── ai-assistant/     # AI chatbot endpoint
│   │       ├── support*/         # Support ticket endpoints
│   │       └── ...               # 30+ more endpoint directories
│   ├── components/
│   │   ├── ui/                   # 40+ shadcn/ui components
│   │   ├── admin/                # Admin dashboard tabs
│   │   ├── header.tsx            # Main navigation
│   │   ├── footer.tsx            # Footer
│   │   ├── hero-section.tsx      # Landing hero
│   │   ├── category-grid.tsx     # Category browsing
│   │   ├── product-grid.tsx      # Product listing
│   │   ├── product-card.tsx      # Product card
│   │   ├── product-detail.tsx    # Product detail page
│   │   ├── cart-view.tsx         # Shopping cart
│   │   ├── checkout-view.tsx     # Multi-step checkout
│   │   ├── auth-dialog.tsx       # Login/Register/2FA
│   │   ├── gift-builder.tsx      # DnD gift box builder
│   │   ├── gift-assistant.tsx    # AI gift suggestions
│   │   ├── try-on-dialog.tsx     # AI virtual try-on
│   │   ├── ai-assistant.tsx      # AI shopping chatbot
│   │   ├── admin-dashboard.tsx   # Full admin dashboard
│   │   ├── user-dashboard.tsx    # User profile/orders
│   │   ├── corporate-dashboard.tsx # Corporate gifting portal
│   │   └── ...                   # 20+ more components
│   ├── lib/
│   │   ├── store.ts              # Zustand global store
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── auth.ts               # Auth verification (JWT + sessions)
│   │   ├── sessions.ts           # Session management (create/destroy/refresh)
│   │   ├── encryption.ts         # AES-256-GCM encrypt/decrypt
│   │   ├── rate-limiter.ts       # In-memory rate limiting
│   │   ├── email.ts              # Nodemailer (Gmail + Ethereal)
│   │   ├── static-products.ts    # Fallback product data
│   │   ├── zai.ts                # ZAI SDK wrapper
│   │   ├── try-on-pipeline.ts    # AI try-on pipeline (v4)
│   │   ├── watermark.ts          # Image watermarking (Sharp)
│   │   ├── shopify/
│   │   │   ├── client.ts         # Storefront API client
│   │   │   ├── admin-client.ts   # Admin API client
│   │   │   └── store.ts          # Shopify Zustand store
│   │   ├── currency/
│   │   │   ├── config.ts         # Currency definitions + default rates
│   │   │   └── formatter.ts      # Currency formatting utilities
│   │   ├── i18n/
│   │   │   ├── index.ts          # Translation engine
│   │   │   └── translations/     # JSON translation files
│   │   └── ...                   # More utility modules
│   ├── hooks/
│   │   ├── useTranslation.ts     # Translation hook
│   │   ├── useCurrency.ts        # Currency hook
│   │   ├── useLocale.ts          # Locale hook
│   │   ├── use-mobile.ts         # Mobile detection hook
│   │   ├── usePWAInstall.ts      # PWA install prompt hook
│   │   └── useAffiliateClick.ts  # Affiliate tracking hook
│   └── instrumentation.ts        # Next.js instrumentation
├── prisma/
│   ├── schema.prisma             # Database schema (28+ models)
│   ├── seed.ts                   # Database seeder
│   ├── seed-users.ts             # User seeder
│   └── seed-wiki.js              # Wiki seeder
├── mini-services/
│   ├── ai-proxy/
│   │   └── index.ts              # AI proxy service (port 3030)
│   └── app-web/
│       └── index.ts              # Flutter web server (port 3002)
├── flutter_app/                  # Flutter mobile app source
├── public/
│   ├── images/                   # Product, category, hero images
│   ├── icons/                    # PWA icons
│   ├── app/                      # Flutter web build
│   ├── sw.js                     # Service worker
│   └── manifest.json             # PWA manifest
├── Caddyfile                     # Caddy reverse proxy config
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind CSS configuration
├── components.json               # shadcn/ui configuration
└── tsconfig.json                 # TypeScript configuration
```
