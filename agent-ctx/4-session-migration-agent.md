# Task 4: Migrate API Routes to Database-Backed Session System

## Summary
Migrated 21 API route files from the old synchronous `sessions.get(token)` / `sessions.set(token, user)` calls to the new async database-backed session system using `getSessionAsync(token)` and `createSession(token, user)`.

## Changes Made

### Files updated with `sessions.get` → `await getSessionAsync` (19 files):
1. `src/app/api/product-import/search/route.ts`
2. `src/app/api/product-import/scrape/route.ts`
3. `src/app/api/product-import/import/route.ts` (also added `sourceUrl` and `platform` to `db.product.create`)
4. `src/app/api/inventory/[productId]/route.ts`
5. `src/app/api/inventory/route.ts` (2 occurrences: GET and POST)
6. `src/app/api/admin/products/[id]/route.ts` (2 occurrences: PUT and DELETE)
7. `src/app/api/admin/products/route.ts` (2 occurrences: GET and POST)
8. `src/app/api/admin/permissions/route.ts` (2 occurrences: GET and PUT)
9. `src/app/api/admin/users/[id]/route.ts` (2 occurrences: PUT and DELETE)
10. `src/app/api/admin/users/route.ts` (2 occurrences: GET and POST)
11. `src/app/api/invoices/[id]/route.ts` (2 occurrences: GET and PATCH)
12. `src/app/api/invoices/route.ts` (2 occurrences: GET and POST)
13. `src/app/api/accounting/route.ts` (2 occurrences: GET and POST)
14. `src/app/api/upload/route.ts`
15. `src/app/api/vendors/route.ts` (2 occurrences: GET and POST)
16. `src/app/api/vendors/[id]/route.ts` (2 occurrences: PUT and DELETE)
17. `src/app/api/auth/approve/route.ts` (2 occurrences: GET and POST)
18. `src/app/api/auth/verify-phone/route.ts` (1 occurrence: PUT only)
19. `src/app/api/auth/2fa/setup/route.ts`

### Files updated with `sessions.set` → `await createSession` (2 files):
20. `src/app/api/auth/2fa/verify/route.ts` - Replaced `sessions.set(token, sessionUser)` with `await createSession(token, sessionUser)`
21. `src/app/api/auth/social/route.ts` - Replaced all 3 instances of `sessions.set(token, sessionUser)` with `await createSession(token, sessionUser)`

### Import changes:
- For files using only `sessions.get()`: `import { sessions }` → `import { getSessionAsync }`
- For files using only `sessions.set()`: `import { sessions }` → `import { createSession }`

### Additional changes:
- Added `sourceUrl: sourceUrl || null` and `platform: platform || null` to `db.product.create` data in the product-import/import route

## Verification
- Lint check passed with no errors
- Dev server running normally
- No remaining `sessions.get()` or `sessions.set()` calls in any API route files
- No remaining `import { sessions }` imports in any API route files
