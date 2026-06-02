---
Task ID: 7
Agent: Influencer Security Agent
Task: Restrict AI influencer uploads to registered users only

Work Log:
- Read ai-influencer-section.tsx to understand current implementation
- Added `userId` and `isVerified` optional fields to `AIInfluencerImage` interface
- Added `getUserShareCount()` helper function for spam prevention (3 shares per user per product)
- Imported `setAuthView` from the store and `showToast` from toast notification hook
- Added `loginPromptOpen` state for the new login prompt dialog
- Added `LogIn` and `CheckCircle` icon imports from lucide-react
- Modified `handleShareClick` to check if user is logged in before opening share dialog
  - Non-logged-in users see a toast ("Please sign in to share your AI style.") and the login prompt dialog
  - Logged-in users with 3+ shares get an error toast ("You've reached the maximum shares for this product.")
- Modified `handleShareFromTryOn` to also check auth status before opening share dialog
- Modified `handleSubmitShare` to include `userId` and `isVerified: true` in the shared image data
- Added `handleSignIn` callback that closes login prompt and opens auth dialog via `setAuthView('login')`
- Added `useEffect` to sync `userName` with `authUser.name` when auth state changes
- Added `initialShareImage` auth check — non-logged-in users see login prompt instead of share dialog
- Added Login Prompt Dialog with:
  - "Sign In Required" title with LogIn icon
  - Description explaining registration requirement
  - "Why sign in?" info box (verify identity, verified badge, track images)
  - Sign In and Cancel buttons
  - "Registration is free and only takes a moment." note
- Added verified badge (✓ CheckCircle icon) next to user names on shared images with `isVerified: true`
  - Wrapped in Tooltip component showing "Verified User" on hover
  - Wrapped entire component in TooltipProvider
- Updated empty state:
  - Changed description to include sign-in prompt when not logged in
  - Shows "Sign In to Share" button with LogIn icon when not logged in
  - Shows "Share Your Style" button when logged in
- Double-check share limit in handleSubmitShare as well for security

Stage Summary:
- Only logged-in users can share AI images
- Non-logged-in users see sign-in prompt dialog with Sign In button
- Verified badge shown for registered user shares with tooltip
- Spam prevention with 3-share limit per product per user
- Empty state shows contextual messaging based on auth status
- Pre-fills userName from authUser.name for logged-in users
