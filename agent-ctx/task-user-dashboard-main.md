# Task: Create User Dashboard Component

## Summary
Created `src/components/user-dashboard.tsx` - a comprehensive user account dashboard for the "3 BOXES LUXURY" e-commerce project.

## Work Completed

### 1. Created `src/components/user-dashboard.tsx`
- **Profile Header**: Displays user avatar (initials), name, email, and role badge (Admin/User/Agent/Team with color-coded badges and icons)
- **Tabs using shadcn Tabs** with 4 tabs:
  - **Purchases Tab**: Lists user orders with order number, date, status badge, total, item count. Expandable order details with item list and breakdown. Fetches from `/api/orders?email=xxx` with Bearer token auth.
  - **Wishlist Tab**: Grid of wishlisted products with image, name, price, compare-at price, rating, "Add to Cart" button (uses `useStore.addItem`), and "Remove" button (calls `DELETE /api/wishlist`). Fetches from `/api/wishlist` with Bearer token.
  - **Payment Modes Tab**: Lists saved payment methods (card, UPI, netbanking, wallet) with emoji icons, type badge, label, last4 digits, default indicator. "Add Payment Method" form with type select, label input, last4 input, and default checkbox. Fetches from `/api/payment-methods` with Bearer token.
  - **Offers Tab**: Displays active offers/discounts with discount %, title, description, code (copy to clipboard), min order, max discount, validity period, and "expiring soon" badge. Fetches from `/api/offers`.
- **Auth**: Reads `authToken` and `authUser` from `useStore`. Passes Bearer token in all API calls. Shows "Please Log In" state with link to auth dialog when not authenticated.
- **Styling**: Dark luxury theme (bg-stone-950, bg-stone-900 cards, amber-600 primary buttons, amber borders, amber/gold accents). Status badges colored by state.
- **Back Button**: "Back to Store" at top → `setView('home')`
- **Animations**: Framer Motion transitions for tab switching, card animations, expand/collapse.

### 2. Updated `src/app/page.tsx`
- Added import for `UserDashboard`
- Added `case 'user-dashboard'` in the view router

### 3. API Routes (pre-existing, verified)
- `/api/orders` - GET with email param, returns orders with items
- `/api/wishlist` - GET (auth required), POST (add), DELETE (remove)
- `/api/payment-methods` - GET (auth required), POST (create)
- `/api/offers` - GET returns active offers

### No Lint Errors
The component passes ESLint checks cleanly.

## Design Decisions
- Used `forceMount` with conditional rendering for tab content to enable AnimatePresence transitions
- Custom checkbox implementation for the payment method form to match dark luxury theme
- Copy-to-clipboard for offer codes with visual feedback
- Expiring soon badge (≤3 days) for offers
- Responsive grid layouts (2 cols mobile, 3-4 cols desktop for wishlist; 1-2 cols for offers)
- Skeleton loading states for all data-fetching tabs
- Empty states with icons for all tabs
