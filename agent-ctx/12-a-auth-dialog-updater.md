# Task 12-a: Update Auth Dialog Component

## Agent: Auth Dialog Updater

## Summary of Changes

### Files Modified

1. **`src/lib/store.ts`** — Added new auth flow state fields:
   - `authTwoFAStep: boolean` — Tracks if the auth flow is currently at the 2FA step
   - `authPendingUserId: string | null` — Stores the userId pending 2FA verification
   - `setAuthTwoFAStep(step: boolean)` — Setter for 2FA step
   - `setAuthPendingUserId(id: string | null)` — Setter for pending user ID

2. **`src/app/api/auth/login/route.ts`** — Updated login route:
   - Added 2FA check: If `user.twoFactorEnabled` is true, returns `{ requires2FA: true, userId, email, emailVerified, phoneVerified }` instead of creating a session
   - Added `emailVerified` and `phoneVerified` fields to the successful login response

3. **`src/app/api/auth/2fa/verify/route.ts`** — Updated 2FA verify route:
   - When `enable` flag is not set (login flow), creates a session on successful verification
   - Checks approval status before creating session
   - Returns `{ user, token, emailVerified, phoneVerified }` on successful login verification
   - Preserves existing behavior when `enable` flag is set (2FA setup flow)

4. **`src/app/api/auth/verify-email/route.ts`** — Added PUT handler:
   - `PUT /api/auth/verify-email` — Resends email verification
   - Generates new `emailVerifyToken` and `emailVerifyExpiry` (24-hour expiry)
   - Returns the token for development testing (remove in production)

5. **`src/components/auth-dialog.tsx`** — Complete rewrite with multi-step auth flow:
   - **6 auth steps**: credentials, 2fa, email-verify, phone-verify, pending-approval, social-pending
   - **2FA step**: Uses `InputOTP` component with 6 slots (3+3 groups with separator), framer-motion animation
   - **Social login buttons**: Google (Chrome icon), Facebook, LinkedIn below the login form with "Or sign in with" divider using Separator component
   - **Email verification banner**: Shows after login if email not verified, with "Resend Verification" button and "Continue" button; includes dev auto-verify helper
   - **Phone verification step**: Two-phase flow (enter phone → send code → enter code → verify); shows dev code for testing; "Skip for now" option
   - **Pending approval screen**: Shows "Registration Submitted" with Shield icon after registration; "Back to Sign In" button
   - **Social pending screen**: Shows "Approval Required" for social login accounts needing approval
   - **Admin removed from role selector**: Only User, Agent, 3Boxes Team roles available in registration
   - **Approval notice**: Info box in registration form about admin approval requirement
   - **Dark luxury theme**: stone-950 bg, amber-600 accent, gold-shimmer text maintained throughout
   - **Framer-motion**: Subtle animations on all step transitions (slide, scale)

## Key Flow

1. **Standard login**: email+password → POST /api/auth/login → { user, token, emailVerified, phoneVerified }
2. **2FA login**: email+password → { requires2FA, userId } → 6-digit OTP → POST /api/auth/2fa/verify → { user, token }
3. **Social login**: Click provider → POST /api/auth/social → { user, token } or pending approval
4. **Registration**: Fill form → POST /api/auth/register → "Pending admin approval" screen (no auto-login)
5. **Post-login verification**: After successful login, check emailVerified/phoneVerified and show appropriate verification steps

## Lint Status
- All files pass ESLint with no errors
- Dev server running successfully on port 3000
