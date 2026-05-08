# Worklog

---
Task ID: 1
Agent: Main Agent
Task: Fix AI Try-On "Generation timed out" and "All strategies failed" errors

Work Log:
- Read and analyzed `/home/z/my-project/src/app/api/try-on/route.ts` (the core API route)
- Read the SDK type definitions at `/home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.d.ts`
- Discovered 3 critical bugs causing ALL generation to fail:

**Bug 1: Wrong SDK API call format (ROOT CAUSE)**
- The SDK's `edit` method signature is: `{ prompt: string, image?: string, size?: ImageSize }`
- The old code was calling: `{ prompt, images: [{ url: selfieData }, { url: productImageBase64 }], size }` — passing `images` (array of objects) which DOES NOT EXIST in the SDK
- This caused EVERY edit call to fail silently or throw errors
- Fix: Changed to `{ prompt, image: selfieData, size }` — single string parameter

**Bug 2: Aggressive global rate limit state blocking ALL users**
- Old code had global variables: `lastRateLimitAt`, `rateLimitCooldownMs` (3-10 min!), `consecutiveRateLimits`
- When ONE user hit a rate limit, ALL subsequent users were blocked for 3-10 minutes
- Fix: Removed all global rate limit state. Each request now handles its own retries independently

**Bug 3: Excessive retry delays causing timeout**
- Old code had: 8s * attempt backoff + 3-10 min cooldown on rate limits
- Total processing could exceed 6+ minutes, hitting the frontend's polling timeout
- Fix: Reduced to 3s * attempt backoff, 10s wait on rate limits, 5s on server errors, max 2 retries per strategy, 5-minute hard deadline

Stage Summary:
- Rewrote `/home/z/my-project/src/app/api/try-on/route.ts` with correct SDK usage
- Updated polling in `/home/z/my-project/src/components/product-detail.tsx`
- The SDK's `CreateImageEditBody` interface confirms: `image` is a single optional string, NOT an array
- TypeScript type check on the skills/image-edit scripts confirms the same bug pattern

---
Task ID: 2
Agent: Main Agent
Task: Fix persistent 429 rate limit errors by adding composite fallback

Work Log:
- Tested SDK directly with `node -e` and found the API returns 429 (Too Many Requests) on ALL endpoints
- Tested with 30s, 90s, 120s delays — still 429, confirming persistent rate limit
- The rate limit is on the external z-ai API service, not something we can fix in code
- Solution: Add a "composite preview" fallback that shows a side-by-side of selfie + product when AI is unavailable

Backend changes (`/home/z/my-project/src/app/api/try-on/route.ts`):
- Added global request queue (only 1 API call at a time, 10s spacing between calls)
- Added rate limit tracking with progressive cooldown (30s, 45s, 60s, max 90s)
- Fast fallback: after 3 consecutive 429 errors, immediately return composite preview
- Hard deadline reduced to 3 minutes (was 5-8 min)
- Composite fallback: when AI fails, returns JSON with { type: 'composite', selfie, product, productName, categorySlug }
- Jobs never show "failed" status anymore — they always succeed with either AI image or composite

Frontend changes (`/home/z/my-project/src/components/product-detail.tsx`):
- Added `createCanvasComposite()` function: renders a professional side-by-side composite using HTML5 Canvas
  - Left 70%: user's selfie
  - Right 30%: product image with gold shadow, category label, 3 BOXES branding
  - Golden divider line, "COMPOSITE PREVIEW" badge, info text
- Updated polling handler to detect `isComposite` flag and render composite via canvas
- Added composite preview notice in result view with distinct styling
- Increased polling timeout to 160 attempts (8 minutes to match backend)
- Removed `ctx.letterSpacing` (not widely supported)

Stage Summary:
- Tested and verified: composite fallback works when API is rate-limited
- Jobs now ALWAYS return a result — either AI-generated image or composite preview
- No more "Generation timed out" or "All strategies failed" errors
- Composite preview is clearly labeled so users know it's not AI-generated
- When AI recovers, users can retry for the full AI experience
