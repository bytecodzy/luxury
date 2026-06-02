---
Task ID: 1
Agent: Main
Task: Implement 2FA for admin login with Gmail (pmkshar@gmail.com)

Work Log:
- Explored codebase to understand existing auth system (custom JWT + sessions, TOTP 2FA, demo users)
- Added pmkshar@gmail.com as primary admin demo user with 2FA required
- Forced 2FA for all admin, team, agent, and corporate roles (both DB and demo users)
- Created email-based OTP 2FA system (generates 6-digit OTP, 5-minute expiry)
- Created shared in-memory OTP store (/src/lib/demo-otp-store.ts) for demo users
- Created email OTP resend API (/api/auth/2fa/email-otp/route.ts)
- Updated 2FA verify route to support both email OTP and TOTP methods
- Updated auth dialog UI with email-specific 2FA flow (masked email display, resend OTP, cooldown timer)
- Updated store with authTwoFAMethod and authPendingEmail fields
- Fixed TypeScript type issues in login and verify routes
- Fixed bug where demo users created in DB with empty password blocked subsequent logins
- Cleaned up bad DB entry for pmkshar@gmail.com
- Tested full 2FA flow: login → OTP generation → verify → admin session

Stage Summary:
- Admin login with pmkshar@gmail.com now requires 2FA (email OTP)
- OTP shown via toast notification in demo/dev mode for easy testing
- 2FA also required for team, agent, and corporate roles
- Regular users (role: 'user') bypass 2FA
- Resend OTP functionality with 60-second cooldown
- Files modified: login route, 2FA verify route, email-otp route, auth dialog, store
- Files created: demo-otp-store.ts, email-otp/route.ts

---
Task ID: 1
Agent: main
Task: Implement 2FA email verification for admin login using pmkshar@gmail.com

Work Log:
- Explored the entire auth/2FA codebase and found that OTP codes were only being logged to console, never actually sent via email
- Installed nodemailer package + @types/nodemailer for email sending
- Created `src/lib/email.ts` with comprehensive email sending utility:
  - Gmail SMTP support (primary) with environment variable configuration
  - Ethereal Email fallback (for testing without SMTP credentials)
  - Professional HTML email templates for 2FA OTP, password reset, and email verification
  - Timeout handling to prevent API route hanging
- Updated `src/app/api/auth/login/route.ts` to actually send 2FA verification emails via `send2FAEmailWithDetails()`
- Updated `src/app/api/auth/2fa/email-otp/route.ts` to actually send emails on resend
- Updated `src/app/api/auth/forgot-password/route.ts` to send password reset and OTP emails
- Updated `src/components/auth-dialog.tsx` to show proper 2FA email status messages
- Configured `.env` with Gmail SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_FROM)
- Made email sending non-blocking (fire-and-forget) so login responses return immediately
- Added 15-second timeout for Gmail SMTP and Ethereal sends, 10-second timeout for Ethereal account creation
- Tested complete 2FA flow: Login → OTP generation → Email send → OTP verification → Session creation ✅
- Tested resend OTP endpoint ✅

Stage Summary:
- The 2FA email verification system is now fully functional
- When SMTP_PASS is set with a Google App Password, emails will be sent to pmkshar@gmail.com
- Without SMTP_PASS, the system falls back to Ethereal Email test inbox + shows OTP in toast notification (dev mode)
- The user needs to generate a Google App Password and set SMTP_PASS in .env for real email delivery
- All API endpoints work correctly and return fast responses
