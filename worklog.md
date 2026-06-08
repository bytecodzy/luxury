---
Task ID: 1
Agent: Main Agent
Task: Fix AI Virtual Try-On — complete rewrite for reliability, speed, and UX

Work Log:
- Rewrote try-on-dialog.tsx (v2.0) with all requested fixes:
  - Instant selfie preview (shows raw image immediately before compression)
  - Disclaimer auto-opens file picker on accept (no double-click needed)
  - Hard 55-second client timeout with friendly "AI is busy" message
  - 3BOXES watermark on ALL generated/saved images (client-side canvas)
  - Category-aware canvas overlay fallback
  - Elapsed time display during generation
  - Clean "timeout" step with retry option
- Removed inline TryOnDialog (~1200 lines) from product-detail.tsx
  - Replaced with import from try-on-dialog.tsx
  - Removed unused imports (Progress, Video, Checkbox, Camera, ShieldCheck)
  - Fixed HMR errors by drastically reducing file size (2468 → 799 lines)
- Simplified API route (/api/try-on/route.ts):
  - Single synchronous approach: try IDM-VTON with 50s hard timeout
  - Returns result immediately (no complex job polling)
  - Returns canvas mode if IDM-VTON fails
  - Removed multi-strategy pipeline (no ZAI, no VLM verification)
  - Added maxDuration=60 for Vercel Pro
- Simplified status route (/api/try-on/status/route.ts)
  - Only checks IDM-VTON Space status
  - Added POST handler for pre-warming
- Deleted duplicate ProductDetail.tsx (capital P) file
- Verified all changes work in preview via Agent Browser

Stage Summary:
- product-detail.tsx: 2468 → 799 lines (HMR errors should be resolved)
- try-on-dialog.tsx: Complete rewrite with all user-requested fixes
- API route: Simplified from complex multi-strategy to single IDM-VTON approach
- 3BOXES watermark: Added to all result images (both AI and canvas overlay)
- Disclaimer flow: Fixed — accept → immediately opens file picker
- Selfie preview: Instant (no 30-second delay)
- Timeout: 55s client-side hard limit with friendly message
- Full body output: IDM-VTON uses is_checked_crop=false to preserve full image
