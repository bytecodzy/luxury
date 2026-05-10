# Task 15 - Backend API Developer

## Task: Update Prisma Schema + Create ALL Backend API Routes

### Work Completed

#### Part 1: Prisma Schema Updates
- Added 6 new models: Vendor, Invoice, InvoiceItem, AccountEntry, InventoryLog, UserPermission
- Updated User model with 14 new fields (phone, emailVerified, phoneVerified, twoFactorSecret, twoFactorEnabled, approvalStatus, socialProvider, socialId, resetToken, resetTokenExpiry, emailVerifyToken, emailVerifyExpiry, phoneVerifyCode, phoneVerifyExpiry, vendor, permissions, invoices, accountEntries, inventoryLogs)
- Updated Product model with 6 new fields (productNumber, sku, costPrice, vendorId, reorderLevel, inventoryLogs)
- Updated Order model with invoice relation
- Total: 18 Prisma models

#### Part 2: API Routes Created/Updated

**Auth Routes (7):**
1. `/api/auth/register` - UPDATED: approvalStatus="pending", no auto-login, creates default permissions
2. `/api/auth/verify-email` - NEW: POST verify email with token
3. `/api/auth/verify-phone` - NEW: POST verify code, PUT send code
4. `/api/auth/2fa/setup` - NEW: POST generates TOTP secret + otpauth URI
5. `/api/auth/2fa/verify` - NEW: POST verifies TOTP code (manual crypto implementation)
6. `/api/auth/approve` - NEW: GET pending users, POST approve/reject
7. `/api/auth/social` - NEW: POST handle Google/Facebook/LinkedIn login

**Admin Routes (5):**
8. `/api/admin/products` - NEW: GET list, POST create with PRD-XXXXX auto-numbering
9. `/api/admin/products/[id]` - NEW: PUT update, DELETE
10. `/api/admin/users` - NEW: GET list with permissions, POST create with permissions
11. `/api/admin/users/[id]` - NEW: PUT update role/status/permissions, DELETE deactivate
12. `/api/admin/permissions` - NEW: GET by userId, PUT update permissions

**Business Routes (7):**
13. `/api/invoices` - NEW: GET filtered list, POST create with INV-XXXXX auto-numbering
14. `/api/invoices/[id]` - NEW: GET with items, PATCH status
15. `/api/accounting` - NEW: GET with summary stats, POST create with ACC-XXXXX auto-numbering
16. `/api/vendors` - NEW: GET list, POST create
17. `/api/vendors/[id]` - NEW: PUT update, DELETE deactivate
18. `/api/inventory` - NEW: GET stock levels + reorder alerts, POST create log
19. `/api/inventory/[productId]` - NEW: GET logs for product

**Updated Routes (2):**
20. `/api/checkout` - UPDATED: auto-generates invoice, creates account entry, creates inventory logs
21. `/api/auth/login` - UPDATED: checks approvalStatus before login

#### Part 3: Seed Data
- Updated prisma/seed.ts with productNumber for all 55 products
- Updated prisma/seed-users.ts with:
  - New User fields (emailVerified, phoneVerified, approvalStatus, etc.)
  - 44 user permissions (11 modules × 4 users)
  - 4 vendors (Swiss Watch Co., Italian Leather Atelier, Rajasthan Handloom House, Maison de Parfum)
  - 3 invoices (paid, sent, draft)
  - 6 account entries (sales, vendor payments, expenses, salary)

### Key Technical Decisions
- TOTP 2FA implemented manually with Node.js crypto (no external packages)
- Auto-numbering uses findFirst + orderBy desc pattern
- Social login with Google auto-approves (email verified by provider)
- Login route checks approvalStatus before allowing session
- Inventory log tracks previousStock and newStock for audit trail
