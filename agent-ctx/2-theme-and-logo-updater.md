# Task 2 - Theme & Logo Updates

## Summary
Completed all three tasks: bigger logo, global dark/light theme toggle, and dashboard theme toggles.

## Changes Made

### 1. Logo Size (header.tsx)
- Container: `h-16 w-16` / `sm:h-20 sm:w-20` → `h-20 w-20` / `sm:h-24 sm:w-24`
- Image width/height: 80 → 96
- Text kept at `text-2xl sm:text-3xl`

### 2. Global Theme Toggle
- **store.ts**: Added `appTheme: 'dark' | 'light'` state and `setAppTheme` action with localStorage persistence (key: `3boxes_theme`)
- **header.tsx**: Added Sun/Moon icon button (desktop only) next to locale switcher; header background adapts to theme
- **page.tsx**: Root wrapper div gets `data-theme` attribute and conditional `bg-amber-50/30` (light) or `bg-stone-950` (dark)
- **globals.css**: Comprehensive CSS overrides for `[data-theme="light"]` covering cards, text, borders, inputs, scrollbar, gold shimmer, and logo

### 3. User Dashboard Theme Toggle
- Added Sun/Moon toggle button in user-dashboard.tsx header area alongside "Back to Store" button
- Uses same `appTheme`/`setAppTheme` from Zustand store

## Files Modified
- `/home/z/my-project/src/components/header.tsx`
- `/home/z/my-project/src/lib/store.ts`
- `/home/z/my-project/src/app/page.tsx`
- `/home/z/my-project/src/app/globals.css`
- `/home/z/my-project/src/components/user-dashboard.tsx`
