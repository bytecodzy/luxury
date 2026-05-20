---
Task ID: 1
Agent: Main Orchestrator
Task: Fix PWA app installation and product image upload for Vercel production

Work Log:
- Investigated PWA setup: manifest.json, service worker (sw.js), icons, layout.tsx - all properly configured
- Fixed CORS misconfiguration: removed `Access-Control-Allow-Credentials: true` which was invalid with `Access-Control-Allow-Origin: *`
- Updated service worker cache version from v2 to v3 to force cache refresh
- Added skip for upload routes in SW fetch handler
- Improved AppDownloadSection component with:
  - Aggressive beforeinstallprompt capture (both window and document)
  - Auto-show instructions on iOS (1.5s delay) and other mobile browsers (5s delay)
  - Browser detection (Chrome, Safari, Edge, Samsung, Firefox)
  - PWA readiness indicator
  - Prominent browser-specific install tips
  - QR code section for desktop users
  - Web Share API integration
  - Fixed Safari icon import (replaced non-existent `Safari` with `Compass`)
- Fixed product image upload API for Vercel:
  - Added 3-tier upload strategy: Vercel Blob → Base64 data URL → Local filesystem
  - Installed @vercel/blob package
  - Base64 fallback works without any additional config
  - Local filesystem still works for development
- Updated image-utils.ts to handle Vercel Blob URLs and data URLs directly
- Updated Flutter app config to point to production URL (https://my-project-sepia-seven-42.vercel.app)
- Updated Flutter getImageUrl to handle data URLs and Vercel Blob URLs
- Deployed to Vercel production successfully

Stage Summary:
- Production URL: https://my-project-fawn-mu.vercel.app (new deployment)
- CORS fixed: No more invalid Access-Control-Allow-Credentials header
- PWA install: Enhanced with browser-specific instructions, auto-show on iOS
- Product image upload: Works on Vercel via Vercel Blob or base64 fallback
- Flutter app: Config now points to production URL by default
- Service worker: Updated to v3 with proper upload route handling
