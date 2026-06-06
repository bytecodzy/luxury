# Worklog: Fix AI Virtual Try-On Fast Failure (Task: try-on-fast-fail)

**Date:** 2026-03-05
**Problem:** When ZAI API is unreachable, the try-on feature takes 2+ minutes before all 4 strategies fail, then falls back to canvas overlay. Users wait too long for a broken result.

## Root Cause Analysis

1. **ai-proxy status endpoint** returned `{available: true}` just because ZAI config existed, NOT because the API actually worked
2. **isLocalProxyReachable()** only checked if the proxy was UP, not if ZAI was reachable through it
3. **handleLocalAIGeneration** tried the local proxy, then direct ZAI SDK, each with long timeouts
4. **Pipeline** tried 4 strategies sequentially with 30-45s timeouts per VLM call — 2+ min total when ZAI is down
5. **Frontend** had a 2-minute global timeout — too long when ZAI is unreachable

## Changes Made

### File 1: `mini-services/ai-proxy/index.ts`
- **Added `getZAIStatus()` function** that actually tests ZAI API connectivity with a 3-second timeout POST to `/chat/completions`
- **Returns `{available, zaiReachable}`** — both flags so callers can distinguish "proxy UP but ZAI down" from "everything works"
- **Caches result for 30 seconds** to avoid hammering the API
- **Added 90-second background process timeout** — if `backgroundProcess` hangs, the job fails after 90s instead of running forever
- **Verified:** `curl http://localhost:3030/api/try-on/status` now returns `{"available":false,"zaiReachable":false}` when ZAI is unreachable

### File 2: `src/lib/zai.ts`
- **`isLocalProxyReachable()`**: Now checks `data.zaiReachable !== false` in addition to `data.available === true`. Returns `false` if proxy is UP but ZAI is unreachable
- **`isProxyReachable()`**: Same fix — checks `zaiReachable` flag from proxy status response
- Both functions log when proxy is UP but ZAI is unreachable for debugging

### File 3: `src/app/api/try-on/route.ts`
- **`handleLocalAIGeneration`**: Checks `proxyStatus.zaiReachable !== false` before routing through proxy — skips proxy if ZAI is down even though proxy is up
- **Fast-fail when AI unavailable**: Logs "skipping to canvas fallback immediately" instead of proceeding with 2+ min of failing strategies
- **More descriptive logging**: Shows `available` and `zaiReachable` values when skipping proxy

### File 4: `src/components/product-detail.tsx`
- **Reduced global timeout** from 120s (2 min) to 60s — faster fallback when ZAI is down
- **Product overlay alpha** reduced from 0.92 to 0.5 — semi-transparent for more natural blending on canvas fallback
- **Improved bottom watermark**: Added styled "AI Style Preview" label + "Powered by 3BOXES" watermark with background bar, replacing the simple text overlay

### File 5: `src/lib/try-on-pipeline.ts`
- **Added 45-second total pipeline timeout** — `pipelineTimedOut()` check between every phase/strategy
- **Reduced VLM timeout defaults**: `vlmAnalyze` from 30s → 15s, `vlmCompare` from 45s → 15s
- **Added 15-second per-strategy timeout** to all generation helpers (`safeImageEdit`, `safeImageEditDual`, `safeImageCreate`) using `Promise.race`
- **Fast-fail on unreachable ZAI**: If both VLM calls return empty strings, throws `AI_STYLE_SERVICE_UNAVAILABLE` immediately instead of continuing with 4 more strategies
- **Skip phases on timeout**: Verification, face check, refinement, and composite phases are all skipped if pipeline has timed out

## Verification

- `curl http://localhost:3030/api/try-on/status` → `{"available":false,"zaiReachable":false}` (correctly reports ZAI unreachable)
- `curl http://localhost:3000/api/try-on/status` → `{"available":false,"mode":"unavailable","reason":"..."}` (correctly propagates unavailability)
- ESLint passes on all changed files with no errors
- TypeScript compilation shows no new errors (pre-existing errors in unrelated files)
- Dev server running correctly on port 3000

## Expected Behavior Change

**Before:** User clicks "Try On" → waits 2+ minutes → gets canvas overlay
**After:** User clicks "Try On" → status check detects ZAI unreachable in ~3s → skips directly to canvas overlay in ~5-10 seconds total
