# Task ID: 2 — Restructure virtual-tryon.ts to use OpenAI/Replicate as PRIMARY strategies

## Agent: full-stack-developer

## Work Summary

Rewrote `performVirtualTryOn()` in `virtual-tryon.ts` from v17 to v18, making OpenAI/Replicate the PRIMARY strategies instead of ZAI.

## Files Modified

1. **`src/lib/virtual-tryon.ts`** — Core rewrite:
   - Removed Vercel/non-Vercel split (was ~560 lines of duplicated strategy code)
   - New single strategy chain: External AI → ZAI → HF → CANVAS_FALLBACK
   - Updated version comment from v17 to v18
   - Added OPENAI_TIMEOUT_MS (20s) and REPLICATE_IDM_VTON_TIMEOUT_MS (25s) constants
   - Imported `openAITryOn` and `replicateTryOn` individually for precise strategy ordering
   - Added CANVAS_FALLBACK for garments (was only for accessories before)

2. **`src/lib/external-ai.ts`** — Exported `openAITryOn()` and `replicateTryOn()` individually (were private)

3. **`src/app/api/virtual-tryon/route.ts`** — Fixed pre-existing bug:
   - `checkIDMVTONSpaceStatus` returned `boolean` but route.ts expected `{ awake: boolean }`
   - Changed to use `checkIDMVTONSpaceStatusDetailed` which returns the correct type

## Strategy Order (v18)

### ACCESSORIES:
1. OpenAI GPT-Image (PRIMARY — 20s)
2. Replicate (skips garment models — 15s)
3. ZAI Text-to-Image (15s)
4. ZAI Selfie Edit (15s)
5. HF Inference API (15s)
6. CANVAS_FALLBACK (guaranteed)

### GARMENTS:
1. Replicate IDM-VTON (PRIMARY — 25s)
2. OpenAI GPT-Image (20s)
3. ZAI Selfie Edit (20s)
4. ZAI Product Edit (20s)
5. HF IDM-VTON (free HuggingFace Space)
6. ZAI Text-to-Image (last ZAI)
7. CANVAS_FALLBACK (last resort — NEW)

## Verification
- ESLint: zero errors in modified files
- TypeScript: zero errors in modified files
- Dev server: running (200 OK)
