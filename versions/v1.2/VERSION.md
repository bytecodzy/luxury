# 3 BOXES LUXURY - Version 1.2

## Saved: Wed May  6 16:51:48 UTC 2026

## What's New in v1.2
- Fixed ALL external product images (46 products now have working images)
- Generated 19 AI product images for broken/missing product photos
- Improved image proxy with 3-strategy fetch fallback + SVG placeholder generation
- All product image URLs converted from broken external URLs to local paths
- Reset test user passwords to known values
- Security features already implemented:
  - JWT access token + refresh token system
  - Password hashing with bcrypt (12 salt rounds)
  - Input validation with Zod schemas
  - Rate limiting on all auth endpoints
  - Account lockout after 5 failed attempts (30-min lock)
  - OTP expiry (5 minutes)
  - Role-based access control with permissions
  - Admin audit logs
  - Secure payment callbacks (HMAC-SHA256 + idempotency)
  - AES-256-GCM encryption for sensitive fields
  - API logging and monitoring
  - Corporate registration with company details

## Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin (Super Admin) | admin@3boxesluxury.com | Admin@123 |
| Customer | testuser@example.com | Test@1234 |
| Customer | testuser2@example.com | Test@1234 |
| Customer | testuser3@example.com | Test@1234 |
| Agent | agent1@example.com | Test@1234 |
| Corporate | corp@test.com | Test@1234 |

## Stats
- Total Products: 101 (55 own + 46 external)
- All products have working images
- 7 user accounts across 4 roles (admin, user, agent, corporate)
- 11 categories
