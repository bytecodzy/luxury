# Task 2-c: Fix Product Mismatch in Mobile App

## Summary
Fixed the product mismatch bug where tapping a product card would briefly show a different product's data before loading the correct one. The root cause was React Query keeping stale data from previous product views while new data loaded.

## Changes Made

### 1. `src/components/product-detail.tsx` — React Query stale data fix
- Added `isFetching` to the destructured `useQuery` return for detecting when new data is loading (not just initial load)
- Added `staleTime: 60000` (1 minute) to the `useQuery` config to prevent unnecessary refetches
- Added `useEffect` hook to reset `selectedImage` to 0 and clear `imageErrors` when `selectedProductId` changes
- Changed the `product` derivation from `data?.product` to a guard that only returns the product if its ID matches the current `selectedProductId` — this prevents showing stale data from a previous product while the new product loads

### 2. `src/components/product-card.tsx` — Verified, no changes needed
- The `selectProduct(product.id)` call correctly uses `product.id` 
- Both `handleAddToCart` and `handleShopOnPlatform` properly call `e.stopPropagation()` to prevent event bubbling
- No event bubbling issues found

### 3. `src/lib/shopify.ts` — Shopify image fallback system fix
- Updated `getFallbackImages` function signature from `(categorySlug, productId)` to `(categorySlug, productId, productName)` 
- Replaced `productId % pool.length` (which causes multiple products to share the same fallback image) with a hash-based approach using the product name
- The hash function iterates over `productName` characters to produce a more unique distribution
- Second image index now uses `Math.abs(hash + productId)` instead of `(productId + 1)` for better uniqueness
- Changed the second image condition from `pool.length > 1` to `pool.length > 2` to ensure meaningful variety
- Updated the call site in `fetchShopifyProducts()` to pass `p.title` as the third argument

### 4. `src/app/api/products/[id]/route.ts` — Cache control headers
- Added `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` headers to the product detail API response
- This ensures fresh data (60s max cache) while allowing stale data to be served during revalidation (5 min window)

## Lint Status
All changed files pass ESLint with no errors. (Full project lint runs OOM due to project size, but targeted lint of changed files is clean.)
