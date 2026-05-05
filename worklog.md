---
Task ID: 1
Agent: main
Task: Fix admin login preview error (Next.js 16 Image localPatterns)

Work Log:
- Identified the root cause: Next.js 16 with Turbopack enforces `images.localPatterns` validation for local image URLs with query strings (like `/api/image-proxy?url=...&platform=...`)
- The `<Image>` component from `next/image` throws error E871 when local URLs contain query strings and `localPatterns` isn't configured to allow them
- Also throws error E426 when local URLs don't match configured `localPatterns` (e.g., `/logos/nykaa.png`)
- Attempted to fix via `next.config.ts` `localPatterns` configuration but Next.js 16 auto-generates `localPatterns: [{ pathname: '**', search: '' }]` which blocks query strings
- Final fix: Replaced `next/image` `<Image>` with native `<img>` tags in components that use proxy URLs

Stage Summary:
- Fixed `/home/z/my-project/src/components/product-card.tsx`: Removed `import Image from 'next/image'`, replaced 2 `<Image>` usages with `<img>` tags
- Fixed `/home/z/my-project/src/components/product-detail.tsx`: Removed `import Image from 'next/image'`, replaced 8 `<Image>` usages with `<img>` tags
- Fixed `/home/z/my-project/src/components/cart-view.tsx`: Removed `import Image from 'next/image'`, replaced `<Image>` usage with `<img>` tag
- Left `/home/z/my-project/src/components/header.tsx`, `footer.tsx`, `hero-section.tsx` unchanged (they use static local images that work fine with next/image)
- Reverted `next.config.ts` to not include `localPatterns` (removed the attempted config)
- Verified: Homepage loads with product images, Admin login works, Admin dashboard loads with all tabs
