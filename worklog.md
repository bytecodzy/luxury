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
- This caused cascading failures for concurrent users
- Fix: Removed all global rate limit state. Each request now handles its own retries independently

**Bug 3: Excessive retry delays causing timeout**
- Old code had: 8s * attempt backoff + 3-10 min cooldown on rate limits
- Total processing could exceed 6+ minutes, hitting the frontend's polling timeout
- Fix: Reduced to 3s * attempt backoff, 10s wait on rate limits, 5s on server errors, max 2 retries per strategy, 5-minute hard deadline

Frontend improvements:
- Changed maxAttempts from 120 to 100 (5 min total)
- Added consecutive error tracking (stops after 5 consecutive fetch errors)
- Improved timeout error messages

Stage Summary:
- Rewrote `/home/z/my-project/src/app/api/try-on/route.ts` with correct SDK usage
- Updated polling in `/home/z/my-project/src/components/product-detail.tsx`
- The SDK's `CreateImageEditBody` interface confirms: `image` is a single optional string, NOT an array
- TypeScript type check on the skills/image-edit scripts confirms the same bug pattern: `error TS2561: Object literal may only specify known properties, but 'images' does not exist in type 'CreateImageEditBody'. Did you mean to write 'image'?`
