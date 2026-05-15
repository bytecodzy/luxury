# Task 2: Fix AI Try-On API Route for Proper Proxy Support

## Summary
Fixed the AI virtual try-on API route to properly proxy requests to the sandbox AI proxy service when `ZAI_PROXY_URL` is set (e.g., on Vercel serverless where the ZAI service is unreachable).

## Changes Made

### 1. `/src/app/api/try-on/route.ts` — POST Handler
- **Problem**: The proxy couldn't resolve product image URLs like `/images/products/...` or `/api/image-proxy?url=...` because those are relative to the Vercel deployment.
- **Fix**: Before proxying, resolve the product image to base64 using `getProductImageBase64()`, then send `productImageBase64` in the proxy request body instead of `productImageUrl`.
- **Additional**: Added input validation before proxying, DB fallback for image resolution, 30s timeout, and canvas mode fallback if proxy fails.

### 2. `/src/app/api/try-on/route.ts` — GET Handler
- **Problem**: Polling for job status had a short 10s timeout and didn't properly handle error responses from the proxy.
- **Fix**: Increased timeout to 15s, added proper error response forwarding, URL-encoded the jobId parameter, and added error logging.

### 3. `/mini-services/ai-proxy/index.ts` — POST Handler
- **Problem**: The proxy only accepted `productImageUrl` and tried to fetch it, which fails for relative URLs from Vercel.
- **Fix**: Now accepts `productImageBase64` directly. If provided, uses it without attempting to fetch. Falls back to `getProductImageBase64(productImageUrl)` only when base64 is not provided.

## Key Design Decisions
- Base64 resolution happens on the Vercel side (which CAN access the images) before proxying
- The proxy treats `productImageBase64` as the preferred source, falling back to URL fetching
- Canvas mode fallback is maintained when both direct AI and proxy are unavailable
- All changes are backward-compatible with local development mode
