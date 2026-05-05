# Task 2 - Auth Dialog Component

## Summary
Created the `auth-dialog.tsx` component for the 3 BOXES LUXURY e-commerce app at `/home/z/my-project/src/components/auth-dialog.tsx`.

## Changes Made

### 1. Updated Zustand Store (`/home/z/my-project/src/lib/store.ts`)
Added auth-related state and actions:
- **State**: `authUser`, `authToken`, `authView`, `authTwoFAStep`, `authPendingUserId`
- **Interface**: `AuthUser` type with `{ id, email, name, role }`
- **Actions**: `setAuth()`, `clearAuth()`, `setAuthView()`, `setAuthTwoFAStep()`, `setAuthPendingUserId()`

### 2. Created AuthDialog Component (`/home/z/my-project/src/components/auth-dialog.tsx`)
A `'use client'` component with:

#### Features:
- **Dialog visibility**: Shows when `authView` is `'login'` or `'register'`, closed when `null`
- **Login form**: Email + password fields with icons, show/hide password toggle
- **Register form**: Email + name + password + role selector (User/Agent/3Boxes Team)
  - Role-specific hints (Team accounts need approval, Agent accounts may need verification)
- **2FA verification**: 6-digit OTP input using `InputOTP` component, shown when `authTwoFAStep` is true
- **Social login buttons**: Google, Facebook, LinkedIn with brand-colored SVG icons
- **Error handling**: Animated error/success message display
- **Loading states**: Spinner on submit buttons during async operations
- **Role-based messages**: Shows "Administrator" welcome for ADMIN/3BOXES_TEAM roles
- **Pending approval handling**: Shows message instead of logging in when `approvalStatus === 'pending'`
- **Form reset**: All form state resets when dialog closes

#### Styling:
- Luxury dark theme: `bg-stone-950`, amber accents (`amber-600`, `amber-900`)
- Gold shimmer text effect via `gold-shimmer` class on dialog title
- Consistent with site's design language (matches header, hero section)
- Responsive design with mobile-friendly touch targets
- Smooth animations via Framer Motion (`AnimatePresence`, `motion.div`)

#### API Integration:
- `POST /api/auth/login` - Email/password login with 2FA and email verification checks
- `POST /api/auth/register` - Account creation with approval status handling
- `POST /api/auth/2fa/verify` - 6-digit code verification
- `POST /api/auth/social` - Social provider login (simulated)

#### shadcn/ui Components Used:
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
- Input, Button, Label
- Tabs, TabsContent, TabsList, TabsTrigger
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator
- Separator

## Lint Status
✅ Passes `bun run lint` with no errors
