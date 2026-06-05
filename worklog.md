---
Task ID: 1
Agent: Main Agent
Task: Fix missing sections (Family Pack, Social Connections, 3BOXES Curate) in header nav and fix AI Virtual Try On

Work Log:
- Explored project structure to locate header.tsx, page.tsx, section components, and AI Try On code
- Found that the three sections existed as both inline (simpler, active) and imported component (richer, unused/dead) versions in page.tsx
- Found that the header CATEGORY_NAV had no navigation items for the three sections
- Found that the AI Try On had canvas fallback logic but was slow (25s+ timeout) when AI was unavailable

- **Header Navigation**: Added Family Packs, Social, and Curate items to CATEGORY_NAV with scrollToId property
- **Header Navigation**: Updated desktop nav click handlers to support scroll-to-section navigation
- **Header Navigation**: Updated mobile nav click handlers to support scroll-to-section navigation  
- **Header Navigation**: Added "Explore" section to mobile sidebar menu with links to all three sections
- **Page.tsx**: Replaced inline (simpler) sections with the richer imported component versions (FamilyPackSection, SocialConnectionsSection, ThreeboxesCurateSection)
- **Page.tsx**: Added section IDs (family-pack-section, social-connections-section, 3boxes-curate-section) for scroll targeting
- **AI Try On**: Modified handleGenerate() to first do a quick AI availability check (3s timeout via /api/try-on/status)
- **AI Try On**: When AI is NOT available, skip the slow server POST entirely and go directly to canvas fallback (~3s total)
- **AI Try On**: When AI IS available, proceed with the full server flow with reduced timeouts
- **AI Try On**: Reduced global timeout from 25s to 10s
- **AI Try On**: Reduced POST timeout from 15s to 8s
- **AI Try On**: Added caching (60s TTL) to /api/try-on/status endpoint to avoid repeated slow health checks

- Verified all changes with agent-browser: three nav items visible, section IDs present, click-to-scroll working
- Verified no browser console errors
- Verified AI service is available locally (sdk-auto mode)

Stage Summary:
- Three sections now visible in header navigation on both desktop and mobile
- Three sections rendered with richer component versions on the home page
- AI Try On now responds in ~3 seconds when AI is unavailable (vs 25+ seconds before)
- AI Try On still uses real AI generation when available (local sandbox)
