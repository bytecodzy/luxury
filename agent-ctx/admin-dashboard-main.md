# Task: Admin Dashboard Component

## Summary
Created a comprehensive admin dashboard component (`src/components/admin-dashboard.tsx`) for the "3 BOXES LUXURY" e-commerce project, along with necessary API route updates.

## Files Created
- `src/components/admin-dashboard.tsx` (445 lines) - Main admin dashboard component with 7 tabs

## Files Modified
- `src/app/api/orders/route.ts` - Added admin mode: fetch all orders without email param when admin auth is present
- `src/app/api/wiki/route.ts` - Added `?all=true` param for admin to see unpublished docs; added `isPublished` field to response
- `src/app/api/wiki/[id]/route.ts` - Added PATCH endpoint for admin to publish/unpublish wiki documents
- `src/app/api/admin/share-doc/route.ts` - Added GET endpoint to list all document shares
- `src/app/api/offers/route.ts` - Added `?all=true` param for admin to see all offers (including inactive/expired)
- `src/app/page.tsx` - Added AdminDashboard import and case in switch statement

## Component Features
1. **Stats Cards Row** - 4 cards (Revenue, Orders, Users, Products) with icons, values, Framer Motion animations
2. **Orders Tab** - Filterable table with status badges, payment status, customer name, total, date
3. **Products Tab** - Grid view with images, stock indicators (red/amber/green)
4. **Users Tab** - Table with role badges (color-coded), active status, join dates
5. **Payments Tab** - Summary cards, animated bar chart for revenue by month, orders by status breakdown
6. **Content Tab** - Wiki documents table with publish/unpublish toggle buttons
7. **Share Docs Tab** - Form with document/agent selectors, toggle switches, message field + existing shares table
8. **Offers Tab** - Offers table with discount codes, validity dates, active/expired status

## Auth & Security
- Uses `useStore` for auth state (authUser, authToken)
- Early return "Access Denied" for non-admin users
- Bearer token passed in all API calls
- Back to Store button calls `setView('home')`

## Design
- Dark luxury theme (bg-stone-950, text-amber-100, amber-600 primary, amber borders)
- Responsive grid layouts
- Loading skeletons for all data-fetching tabs
- Color-coded badges for statuses and roles
