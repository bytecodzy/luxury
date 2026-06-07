---
Task ID: 1
Agent: main
Task: Fix Virtual Try-On to use HuggingFace IDM-VTON instead of canvas overlay

Work Log:
- Read and analyzed the current try-on implementation: route.ts, try-on-pipeline.ts, zai.ts, try-on-dialog.tsx, product-detail.tsx
- Identified root cause: Entire try-on pipeline depends on ZAI SDK which is unreachable, falling back to canvas overlay (just pasting product image on selfie)
- Created src/lib/huggingface-tryon.ts with two strategies:
  1. IDM-VTON via Gradio Space API (REAL virtual try-on, free, no token needed)
  2. Instruct-pix2pix via HuggingFace Inference API (text-guided editing, needs HF_API_TOKEN)
- Modified src/lib/try-on-pipeline.ts to try HuggingFace FIRST (Phase 0.5) before ZAI pipeline
- Modified src/app/api/try-on/route.ts to try HuggingFace on both Vercel and non-Vercel paths
- Updated src/app/api/try-on/status/route.ts to reflect HuggingFace availability
- Updated frontend components (product-detail.tsx, try-on-dialog.tsx) to show "hf-tryon" pipeline phase progress
- Verified no TypeScript compilation errors in changed files
- Verified no ESLint errors in changed files
- Verified try-on status endpoint returns correct data
- Verified UI (try-on dialog) opens and works correctly via Agent Browser

Stage Summary:
- HuggingFace IDM-VTON integration is now the PRIMARY try-on strategy
- When HF succeeds, the garment is AI-applied to the person's selfie (real virtual try-on)
- When HF fails, the existing ZAI pipeline is tried as fallback
- When both fail, canvas overlay is the final fallback
- The Gradio Space API format (Gradio 4.x /call/ and Gradio 3.x /api/predict) is handled
- SSE (Server-Sent Events) protocol for Gradio results is properly parsed
- Space wake-up logic handles sleeping HuggingFace Spaces
- No new npm dependencies added (uses plain HTTP requests)
