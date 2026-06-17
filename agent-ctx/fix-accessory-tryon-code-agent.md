# Task: fix-accessory-tryon — Code Agent Work Summary

## Task ID
fix-accessory-tryon

## Agent
code-agent

## Changes Made

### 1. Fixed `src/lib/virtual-tryon.ts` — ZAI Image Generation with Multiple Models
- Added `ZAI_IMAGE_MODELS` array constant with models tried in order: `flux-1`, `cogview-4`, `cogview-3-plus`, `cogview-4-plus`
- Modified `zaiImageGenerate()` to iterate through all models when one returns 403 `model_access_denied`
- Each model gets a proportional share of the overall timeout budget
- On 403, the function continues to the next model instead of giving up
- On success with any model, returns immediately with the result

### 2. Fixed `src/lib/virtual-tryon.ts` — Removed CANVAS_FALLBACK
- Changed the return from `CANVAS_FALLBACK` to always return `ALL_STRATEGIES_FAILED`
- Removed `CANVAS_FALLBACK` and `AI_CANVAS_MODE` from the `errorCode` type union
- Updated comments throughout the file to reflect the removal
- Changed "Strategy 6: CANVAS_FALLBACK" and "Strategy 7: CANVAS_FALLBACK" comments to "All strategies exhausted"

### 3. Fixed `src/lib/virtual-tryon.ts` — Better Error Messages
Added specific error detection for:
- OpenAI 403 region block → "OpenAI API is not available in your region"
- OpenAI 400 billing hard limit → "OpenAI billing limit has been reached"
- Replicate 402 insufficient credits → "Replicate account needs billing setup"
- ZAI 403 model denied → "ZAI image model not available, tried alternative models"
- Model "does not exist" → "AI model not available, models may be deprecated"
- ZAI 404 NOT_FOUND → "AI service endpoint not found"
- Network failures → "Could not connect to AI service"
- Timeout → "AI service is taking too long"
- Content filter → "content restrictions"

### 4. Fixed `src/components/try-on-dialog.tsx` — Removed CANVAS_FALLBACK Handler
- Removed the CANVAS_FALLBACK handler (lines 760-784) that rendered a crude canvas overlay
- Now when all AI fails, the user sees the `step='timeout'` state with a clear error message
- Removed `generateCanvasOverlay` from the `handleGenerate` callback dependency array

### 5. Fixed `src/lib/external-ai.ts` — Better Error Details for Replicate & OpenAI
- **Replicate**: Added `strategyErrors` array to collect individual strategy error messages
  - IDM-VTON, OOTDiffusion, SDXL errors are now collected and included in "All Replicate strategies failed" message
  - Added specific error detection for: 402 insufficient credit, 401 unauthorized, 403 forbidden, 429 rate limit, region blocked
- **OpenAI**: Added `strategyErrors` array to collect individual strategy error messages
  - GPT-Image-1, DALL-E-3, DALL-E-2 errors are now collected and included in "All OpenAI strategies failed" message
  - Added specific error detection for: 403 region blocked, 401 unauthorized, 429 rate limit, content policy violation

### 6. Added Debug/Test Endpoint to `src/app/api/try-on/route.ts`
- Added `?action=test-external-ai` GET endpoint that tests:
  - OpenAI: Lists models (lightweight connectivity test)
  - Replicate: GET /v1/predictions (lightweight connectivity test)
  - ZAI: Chat completions ping (lightweight connectivity test)
  - Returns availability, latency, and specific error diagnostics for each service
- Added `?action=status` GET endpoint with additional `isVercel` and `zaiBaseUrl` fields

## Git Commits
1. `1f7c205` — Main fix: multi-model ZAI, remove CANVAS_FALLBACK, better error messages
2. `08c6223` — Include specific error details in OpenAI/Replicate strategy failure messages
3. `238e480` — Add detection for OpenAI billing hard limit and deprecated model errors

## Vercel Deployment Verification

### Test: `GET /api/try-on?action=status`
```json
{
  "available": true,
  "spaceAwake": true,
  "zaiConfigured": true,
  "openaiConfigured": true,
  "replicateConfigured": true,
  "isVercel": true,
  "zaiBaseUrl": "https://api.z.ai/api/v1",
  "mode": "external-ai"
}
```

### Test: `GET /api/try-on?action=test-external-ai`
```json
{
  "results": {
    "openai": { "available": true, "latencyMs": 634 },
    "replicate": { "available": true, "latencyMs": 118 },
    "zai": { "available": true, "latencyMs": 509 }
  }
}
```

### Test: `POST /api/try-on` (accessory try-on)
```json
{
  "success": false,
  "error": "OpenAI billing limit has been reached. Please check your OpenAI account billing settings.",
  "errorCode": "ALL_STRATEGIES_FAILED",
  "elapsed": 3.1,
  "debug": {
    "strategiesAttempted": ["openai-gpt-image", "replicate-accessory", "zai-generate-accessory", "zai-selfie-edit-accessory", "hf-inference"],
    "strategyErrors": {
      "openai-gpt-image": "All OpenAI strategies failed: GPT-Image-1: 400 Billing hard limit has been reached.; DALL-E-3: 400 The model 'dall-e-3' does not exist.; DALL-E-2: 400 The model 'dall-e-2' does not exist.",
      "replicate-accessory": "All Replicate strategies failed: SDXL: Request to https://api.replicate.com/v1/predictions failed with status 402 Payment Required...",
      "zai-generate-accessory": "All ZAI image models failed (flux-1, cogview-4, cogview-3-plus, cogview-4-plus). The models may be unavailable or access-denied.",
      "zai-selfie-edit-accessory": "ZAI returned no image data after 0.4s: 404 NOT_FOUND",
      "hf-inference": "HF generate error: fetch failed"
    }
  }
}
```

## Key Findings from Vercel Testing
- **OpenAI**: Not region-blocked as originally assumed. The real issue is "400 Billing hard limit has been reached" for GPT-Image-1, and "model does not exist" for DALL-E 2/3 (likely deprecated on this account)
- **Replicate**: Confirmed 402 "Insufficient credit" — account has $0 balance
- **ZAI**: All 4 image models (flux-1, cogview-4, cogview-3-plus, cogview-4-plus) are denied on the public API
- **ZAI Selfie Edit**: 404 NOT_FOUND — endpoint doesn't exist on public API
- **HF Inference**: Fetch failed — unreachable from Vercel

## Status
All changes deployed to Vercel and verified. The error messages are now actionable and specific, no more misleading canvas overlay fallback.
