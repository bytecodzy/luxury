# Task: Fix "failed to share to gallery" error

## Summary
Fixed the gallery sharing failure caused by base64 data URL payloads exceeding Vercel's serverless function body size limit (~4.5MB). Added client-side image compression and improved error handling across the full stack.

## Changes Made

### 1. New File: `/src/lib/image-compress.ts`
- Created `compressImageForGallery()` utility function
- Resizes images to max 1024x1024 maintaining aspect ratio
- Converts to JPEG with progressive quality reduction (0.75 → 0.6 → 0.45 → 0.3 → 0.2)
- Targets 800KB max output size
- SSR-safe (returns original if `document` is undefined)
- Returns `CompressionResult` with size metrics for logging

### 2. Updated: `/src/components/try-on-dialog.tsx`
- Share button onClick handler now dynamically imports `compressImageForGallery`
- Compresses image before POST to `/api/style-gallery`
- Uses `compressed.dataUrl` instead of raw `imageToShare` in the API payload
- Added compression logging: `[Gallery] Image compressed: X KB → Y KB (Z% reduction)`
- Improved error messages: `'Failed to share to gallery. Please try again.'`
- Added `console.error('[Gallery] Share error:', err)` for debugging

### 3. Updated: `/src/components/ai-influencer-section.tsx`
- `handleSubmitShare` now dynamically imports `compressImageForGallery`
- Compresses `newImage.imageDataUrl` before sending to API
- Added `productImage: undefined` to the API payload for clarity
- Added error response handling: logs API error details when `!res.ok`

### 4. Updated: `/src/app/api/style-gallery/route.ts`
- Added try-catch around `request.json()` parsing
  - Returns 400 with message: `'Invalid request body. Image may be too large.'`
- Enhanced catch block with specific error codes:
  - `P2025`/`P2003` → 400: `'Product not found. Cannot submit to gallery.'`
  - Other `P*` codes → 500: `'Database error. Please try again later.'`
  - Generic → 500: `'Failed to submit to gallery. Please try again.'`
- Logs `error?.message || error` instead of full error object

### 5. Updated: `/vercel.json`
- Added `src/app/api/style-gallery/**/*.ts` entry with `memory: 1024, maxDuration: 30`
- Placed before the catch-all `src/app/api/**/*.ts` for proper precedence

## Verification
- Lint passed on all changed files with no errors
- TypeScript type check passed on `image-compress.ts`
- Full project lint OOMs (pre-existing issue, not related to changes)
