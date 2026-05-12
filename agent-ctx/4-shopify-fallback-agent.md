# Task 4: Shopify API Fallback for Database-Unavailable Scenarios

## Agent: Fullstack Developer
## Status: Completed

## Summary
Created a Shopify Admin API client and integrated it as a fallback data source for when the Prisma database is unavailable. The primary data source remains the database (Prisma/SQLite), and the Shopify API is only used when the database query fails.

## Files Created

### `/home/z/my-project/src/lib/shopify.ts`
New Shopify Admin API client library that:
- Connects to the Shopify Admin REST API at `https://{store_domain}/admin/api/2024-10/`
- Uses `X-Shopify-Access-Token` header for authentication
- Fetches products from `/admin/api/2024-10/products.json`
- Fetches collections from `/admin/api/2024-10/custom_collections.json` and `/admin/api/2024-10/smart_collections.json`
- Transforms Shopify data to match the exact format returned by Prisma API routes
- Includes in-memory caching (5-minute TTL) to avoid excessive API calls
- Maps Shopify `product_type` to categories with a comprehensive mapping table
- Provides helper functions: `fetchShopifyProducts()`, `fetchShopifyCategories()`, `fetchShopifyProductsByCategory()`, `searchShopifyProducts()`, `isShopifyAvailable()`, `invalidateShopifyCache()`

## Files Modified

### `/home/z/my-project/src/app/api/products/route.ts`
- Wrapped the existing Prisma query in a try/catch
- On database failure, falls back to Shopify Admin API
- Applies the same filtering (category, search, price range, platform, source, isExternal, occasion, recipient, relationship), sorting, and pagination to Shopify data
- Added `source: 'database'` or `source: 'shopify'` field in response for debugging

### `/home/z/my-project/src/app/api/categories/route.ts`
- Wrapped the existing Prisma query in a try/catch
- On database failure, falls back to Shopify collections and product types
- Added `source: 'database'` or `source: 'shopify'` field in response

### `/home/z/my-project/src/app/api/cart/route.ts`
- GET endpoint: Returns empty offline cart (`source: 'offline'`) when database is unavailable
- POST/PATCH/DELETE endpoints: Return 503 status with `offline: true` flag when database is unavailable
- Allows the frontend to gracefully handle database unavailability by using client-side cart state

## Key Design Decisions

1. **Database-first approach**: Prisma is always tried first. Shopify is only used as a fallback.
2. **Same response format**: Shopify fallback data matches the exact format the frontend expects.
3. **5-minute cache**: Shopify API results are cached in-memory to avoid rate limiting and improve performance.
4. **Shopify product IDs are prefixed** with `shopify-` to avoid collision with database IDs.
5. **Category derivation**: Categories come from Shopify collections and product_type field mapping.
6. **HTML stripping**: Shopify `body_html` is stripped of HTML tags for the description field.
7. **No Prisma schema changes**: The existing database schema and code remain untouched.

## Testing
- Lint check passed for all modified files
- Dev server is running correctly
- API endpoints return data with `source: 'database'` when the database is available (local SQLite)
- On Vercel (with broken DATABASE_URL), the Shopify fallback will automatically activate
