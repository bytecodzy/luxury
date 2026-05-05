# Task 3: Admin Dashboard Component

## Summary
Created the `AdminDashboard` component at `/home/z/my-project/src/components/admin-dashboard.tsx` — a comprehensive 'use client' component with 12 tabs for the 3 BOXES LUXURY e-commerce admin console.

## What was done

### Store Update (`/home/z/my-project/src/lib/store.ts`)
- Added `AuthUser` interface with id, email, name, role fields
- Extended `View` type to include: 'user-dashboard', 'admin-dashboard', 'agent-dashboard', 'team-dashboard', 'wiki'
- Added `authUser`, `authToken`, `authView` state fields
- Added `setAuth`, `clearAuth`, `setAuthView` actions

### Admin Dashboard Component (2209 lines)
File: `/home/z/my-project/src/components/admin-dashboard.tsx`

**Features:**
- 12 functional tabs with luxury dark theme (bg-stone-950, amber accents)
- 401 auto-logout listener that clears auth and redirects to login
- Access denied check for non-admin users
- All tabs use real API calls with Bearer token auth
- Shared style constants as specified

**Tabs:**
1. **Dashboard** — Summary cards (revenue, orders, products, users) + accounting stats
2. **Products** — Table with search/pagination, add/edit/delete, product form with drag&drop image upload (max 3, uses /api/upload), auto-generated productNumber
3. **Inventory** — Log table with type filter, stock adjustment form, low stock alerts
4. **Orders** — Orders table with status/payment badges, detail view dialog
5. **Invoices** — Invoice list with create dialog, auto INV-XXXXX numbering, status update buttons
6. **Accounting** — Debit/credit entries with running balance, ACC-XXXXX numbering, summary cards
7. **Vendors** — Vendor list with GST details, add/edit/delete dialogs
8. **Users & Perms** — User list with role badges, approve/reject pending users, permission matrix (read/write/edit/delete per module)
9. **Content** — Wiki documents CRUD management
10. **Share Docs** — Share documents with agents
11. **Offers** — Coupon/offer management with create/edit
12. **Import** — Product import from Myntra/Nykaa/Amazon with platform selector, search, URL input, results grid, product preview, import dialog with category/vendor/stock fields

**Technical details:**
- Uses shadcn/ui components: Card, Tabs, Table, Button, Input, Label, Select, Badge, Dialog, Switch, Textarea, Checkbox, Separator
- Uses lucide-react icons
- Uses framer-motion for animations
- Uses @tanstack/react-query for data fetching and mutations
- Auth headers helper function for API calls
- INR currency formatting
