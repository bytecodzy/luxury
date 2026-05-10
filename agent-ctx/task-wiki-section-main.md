# Task: Wiki Section Component

## Summary
Created `src/components/wiki-section.tsx` - a wiki/knowledge base section for the "3 BOXES LUXURY" e-commerce project.

## What was done
1. **Created `src/components/wiki-section.tsx`** with the following features:
   - Header with BookOpen icon and "Technical Documentation" title
   - Auth check: shows lock + login prompt if not authenticated
   - Document grid with category-colored badges (amber=architecture, emerald=api, rose=technical, stone=general)
   - View button opens document in a Dialog with rendered markdown (react-markdown)
   - Download button fetches full document and triggers browser download as `{slug}-v{version}.md`
   - Proper loading skeletons, error states, and empty state
   - Back to Store button (setView('home'))
   - Dark luxury theme (stone-950 bg, amber accents, hover border effects)

2. **Integrated into `src/app/page.tsx`**:
   - Added `WikiSection` import
   - Added `case 'wiki'` to the view switcher

3. **API routes already existed** at `/api/wiki` and `/api/wiki/[id]`

## Key Technical Details
- Uses `useStore` for auth state (authUser, authToken, setView, setAuthView)
- Uses `@tanstack/react-query` for data fetching with Bearer token auth
- Uses `react-markdown` for rendering document content in the Dialog viewer
- Download uses Blob + URL.createObjectURL pattern
- Download from list fetches the full document first (list only has metadata)
- Category badge colors: architecture=amber, api=emerald, technical=rose, general=stone
- Framer Motion for card animations and page transitions
- All shadcn/ui components (Dialog, Button, Badge, Skeleton, ScrollArea, Separator)
