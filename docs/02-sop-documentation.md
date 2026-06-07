# 3BOXES LUXURY — Standard Operating Procedure (SOP) Documentation

**Document ID:** SOP-MASTER-001
**Version:** 2.0
**Effective Date:** March 2026
**Last Reviewed:** March 2026
**Prepared By:** 3Boxes Operations & Engineering Team
**Approved By:** Super Admin
**Classification:** Internal — All Roles
**Review Cycle:** Quarterly

---

## Document Purpose

This document defines the complete set of Standard Operating Procedures for all user roles on the **3boxes.in** luxury e-commerce platform. Each SOP provides step-by-step instructions for critical workflows, ensuring consistency, compliance, and operational excellence across the organization. All personnel must familiarize themselves with the SOPs relevant to their role and adhere to them in day-to-day operations.

## Scope

This document covers SOPs for five distinct platform roles:

| # | Role | Description |
|---|------|-------------|
| 1 | **End User (Customer)** | Individual shoppers browsing, purchasing, and using AI features |
| 2 | **Admin** | Full system access — dashboard, products, orders, users, corporate, campaigns, integrations, reports |
| 3 | **Agent** | Customer support — ticket handling, order assistance, document sharing |
| 4 | **Team Member** | Internal team — product management, order processing, inventory, vendors |
| 5 | **Corporate User** | B2B corporate gifting — campaigns, branding, recipient management, invoicing |

## Conventions

- **SOP ID Format:** `SOP-[ROLE]-[NUMBER]` (e.g., SOP-CUST-001, SOP-ADM-005)
- **Role Codes:** CUST = Customer, ADM = Admin, AGT = Agent, TM = Team Member, CRP = Corporate User
- All steps assume the user is logged in unless stated otherwise
- UI references correspond to the production environment at `3boxes.in`
- Field names in `monospace` refer to database/API field names

---

## Table of Contents

1. [Customer SOPs](#1-customer-sops)
2. [Admin SOPs](#2-admin-sops)
3. [Agent SOPs](#3-agent-sops)
4. [Team Member SOPs](#4-team-member-sops)
5. [Corporate User SOPs](#5-corporate-user-sops)
6. [Cross-Role SOPs & Escalation Matrix](#6-cross-role-sops--escalation-matrix)
7. [Appendix: Glossary & Reference](#7-appendix-glossary--reference)

---

# 1. Customer SOPs

## SOP-CUST-001: Account Registration & Login

**Objective:** Enable new customers to create an account and existing customers to log in using email/password, phone OTP, or social login providers.

**Prerequisites:**
- Valid email address or phone number
- Internet access and a modern web browser
- For social login: active Google, Facebook, or LinkedIn account

**Steps — Email Registration:**

1. Navigate to the 3boxes.in homepage
2. Click **"Sign Up"** or **"Register"** in the site header
3. Fill in the registration form:
   - **Email Address** (required, must be unique in the system)
   - **Full Name** (required)
   - **Password** (minimum 8 characters; must include uppercase, lowercase, number, and special character)
   - **Confirm Password** (must match password exactly)
4. Click **"Create Account"**
5. A verification email is sent to the provided address containing a link with an `emailVerifyToken` (expires in 24 hours)
6. Open the email and click the verification link
7. On successful verification, `emailVerified` is set to `true` and you are redirected to the login page
8. If the verification link has expired, click **"Resend Verification"** on the login page

**Steps — Phone OTP Registration:**

1. On the registration page, switch to the **"Phone"** tab
2. Enter your mobile number with country code (e.g., +91XXXXXXXXXX)
3. Click **"Send OTP"**
4. A 6-digit OTP is sent via SMS (valid for 5 minutes)
5. Enter the OTP in the verification field
6. On success, the phone number is verified and linked to your account
7. Complete the remaining profile fields (name, email, password)

**Steps — Social Login:**

1. On the login/registration page, click the desired social provider button:
   - **Google** — "Sign in with Google"
   - **Facebook** — "Sign in with Facebook"
   - **LinkedIn** — "Sign in with LinkedIn"
2. Authorize the 3Boxes Luxury application in the provider's OAuth popup
3. System creates an account using the social profile data (email, name, avatar)
4. If the email from the social provider matches an existing account, the accounts are linked automatically
5. `emailVerified` is set to `true` automatically for social logins (provider-verified email)

**Steps — Standard Login:**

1. Click **"Sign In"** in the header
2. Enter registered email and password
3. Click **"Log In"**
4. If 2FA is enabled, enter the 6-digit TOTP code or request an email OTP (see SOP-CUST-002)
5. On successful authentication, a session is created and you are redirected to the homepage or dashboard

**Expected Outcome:**
- Account is created with `approvalStatus = "pending"` (awaiting admin approval for non-social logins) or `approvalStatus = "approved"` (social logins auto-approved)
- `emailVerified = true` after email verification
- `twoFactorEnabled = false` by default
- User can browse products immediately; purchasing requires account approval

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Email already exists" error | An account with this email is already registered | Use "Forgot Password" to recover the existing account instead of re-registering |
| Verification email not received | Spam filter or typo in email | Check spam/junk folder; click "Resend Verification"; verify the email address is correct |
| OTP not received on phone | Invalid number or carrier delay | Verify country code; wait 60 seconds and retry; ensure SMS is not blocked |
| Social login fails | Browser blocks popups or OAuth error | Allow popups for 3boxes.in; clear browser cookies; try a different browser |
| Account still pending after verification | Admin has not yet approved the account | Wait for approval email (typically within 4 hours); contact support if delayed beyond 24 hours |

**Related SOPs:** SOP-CUST-002 (2FA Setup), SOP-CUST-011 (Multi-Currency & Language), SOP-ADM-003 (User Approval)

---

## SOP-CUST-002: Two-Factor Authentication (2FA) Setup & Login

**Objective:** Enable and use two-factor authentication for enhanced account security during login.

**Prerequisites:**
- Active and approved 3boxes account
- For TOTP: a compatible authenticator app (Google Authenticator, Authy, 1Password)
- For Email OTP: access to registered email inbox

**Steps — 2FA Setup:**

1. Log in to your account
2. Navigate to **Profile** > **Security** > **Two-Factor Authentication**
3. Click **"Enable Two-Factor Authentication"**
4. Choose an authentication method:
   - **Authenticator App (TOTP)** — A QR code is displayed
   - **Email OTP** — Codes are sent to your registered email for each login
5. If TOTP selected:
   - Scan the QR code using your authenticator app
   - Enter the 6-digit code displayed in the app to verify setup
   - **Important:** Save the backup codes displayed on-screen in a secure location — these are the only way to recover access if you lose your authenticator device
6. System sets `twoFactorEnabled = true` and stores the `twoFactorSecret` (encrypted)
7. An audit log entry is created (`action: "mfa_setup"`)

**Steps — 2FA Login:**

1. Enter email and password on the login page
2. The 2FA verification prompt appears
3. **TOTP method:** Open your authenticator app, enter the current 6-digit code (refreshes every 30 seconds)
4. **Email OTP method:** Click **"Send Code"**, check your email, enter the 6-digit code (valid for 5 minutes)
5. Click **"Verify"**
6. On success: Session is created, redirected to homepage
7. On 3 consecutive failed attempts: Account is temporarily locked for 15 minutes; contact support for manual unlock

**Expected Outcome:**
- `twoFactorEnabled = true` on the user record
- All subsequent logins require 2FA verification
- Account lockout after 3 failed 2FA attempts (auto-unlocks after 15 minutes)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| TOTP code not accepted | Device time drift | Ensure device time is set to auto-sync; wait for the next code cycle |
| Email OTP not received | Spam filter or SMTP delay | Check spam folder; wait 60 seconds; use "Resend Code" |
| Lost authenticator device | No backup codes saved | Contact support with identity verification to reset 2FA |
| Account locked | 3 failed 2FA attempts | Wait 15 minutes for auto-unlock; or contact support for manual unlock |

**Related SOPs:** SOP-CUST-001 (Registration & Login), SOP-ADM-003 (User Management)

---

## SOP-CUST-003: Browsing & Searching Products

**Objective:** Enable customers to discover products through category browsing, keyword search, and advanced filtering.

**Prerequisites:**
- Active 3boxes account (not required for browsing, but needed for wishlisting/cart)
- Internet access

**Steps — Category Browsing:**

1. From the homepage, browse products via:
   - **Category Grid** — Click a category tile (Jewelry, Sarees, Watches, Fashion, Men's Shirts, Leather Goods, Fragrances, Home & Living, Kids, Corporate Gifts, etc.)
   - **Featured Products** — Scroll to see curated selections and new arrivals
   - **Occasion Tabs** — Select an occasion (Birthday, Anniversary, Wedding, Diwali, Christmas, Housewarming)
2. Each category page shows a responsive product grid with: product image, name, price (with compare-at price if discounted), category badge, and average rating
3. Use pagination or infinite scroll to load more products

**Steps — Keyword Search:**

1. Click the **search icon** (magnifying glass) in the header, or press the `/` keyboard shortcut
2. Type a search query (e.g., "ruby necklace", "silk saree under 5000", "men's watch gold")
3. The search engine matches against product `name`, `description`, `tags`, and `occasions`
4. Results are displayed ranked by relevance
5. Apply filters to narrow results:
   - **Category** — Multi-select checkboxes (e.g., Jewelry + Watches)
   - **Price Range** — Min-max slider (values adjust based on selected currency)
   - **Rating** — Toggle (4+ stars, 3+ stars, 2+ stars)
   - **Occasion** — Multi-select (Birthday, Anniversary, Wedding, Diwali, etc.)
   - **Recipient Type** — Multi-select (Him, Her, Couple, Kids, Parents, Friend, Colleague)
   - **In Stock Only** — Checkbox (hides out-of-stock and pre-order items)
6. Sort results by: Relevance, Price (Low–High), Price (High–Low), Rating, Newest Arrivals

**Expected Outcome:**
- Products matching the search criteria are displayed with accurate pricing, availability, and images
- Filters can be combined for precise results
- Price display adapts to the user's selected currency (see SOP-CUST-011)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| No search results | Too specific query or no matching products | Broaden the query; remove some filters; check spelling |
| Prices showing wrong currency | Currency setting incorrect | Update currency preference in Profile > Settings (see SOP-CUST-011) |
| Product images not loading | CDN or network issue | Refresh the page; clear browser cache; check internet connection |
| Category page empty | No products assigned to category | This is an admin catalog issue — report via support ticket |

**Related SOPs:** SOP-CUST-004 (Virtual Try-On), SOP-CUST-005 (Gift Builder), SOP-CUST-009 (Wishlist)

---

## SOP-CUST-004: Using AI Virtual Try-On (Style Preview)

**Objective:** Allow customers to upload a selfie and generate an AI-rendered preview of how a product would look on them, with accuracy scoring and complementary product suggestions.

**Prerequisites:**
- Active 3boxes account
- A clear, well-lit selfie photo (JPG, PNG, or WebP format, max 10MB)
- Product page open for the item to try on

**Steps:**

1. Navigate to any product detail page
2. Click the **"Style Preview"** button (sparkles icon with amber gradient)
3. The TryOnDialog opens in a multi-step flow:
   - **Step 1 — Upload Selfie:**
     - Drag and drop or click to upload a selfie image
     - Accepted formats: JPG, PNG, WebP (max 10MB)
     - Ensure the photo shows a clear face with good lighting
     - Click **"Next"** to proceed
   - **Step 2 — Preview & Confirm:**
     - Review the uploaded selfie on the left and the product on the right
     - Confirm both are correct
     - Click **"Create Preview"** to start AI generation
   - **Step 3 — Generating:**
     - Wait 30–60 seconds while the AI processes the image
     - A progress indicator is displayed
     - If the AI service is unavailable, the system falls back to a canvas overlay composite (non-AI preview)
   - **Step 4 — Result:**
     - View the AI-generated image showing the product on your selfie
     - Accuracy scores are displayed:
       - **Color Match** (0–10) — How well the product color blends with the image
       - **Face Preservation** (0–10) — How accurately your face is maintained
       - **Overall** (0–10) — Composite quality score
     - Scores of 7+ are shown in green (good), 4–6 in yellow (acceptable), below 4 in red (try again)
4. Available actions on the result:
   - **Save Image** — Downloads the watermarked result as a PNG file
   - **Try Again** — Resets to the upload step with a new selfie
   - **Share to Gallery** — If consent is given, submits the result to the influencer/style gallery for public display
   - **View Suggestions** — Displays AI-recommended complementary products ("Complete Your Look" section)

**Expected Outcome:**
- AI-generated image with accuracy scores displayed
- Downloadable watermarked preview image
- Optional gallery submission with user consent
- Complementary product recommendations based on the tried-on product

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| "AI Service Unavailable" error | Backend AI service is down or rate-limited | System falls back to canvas overlay; retry later for full AI result |
| Poor accuracy scores (below 4) | Low-quality selfie, poor lighting, or obscured face | Upload a clearer selfie with front-facing pose and good lighting |
| Upload fails | File too large or unsupported format | Resize image to under 10MB; use JPG, PNG, or WebP only |
| "Creating Preview" hangs indefinitely | Network timeout or AI queue backlog | Wait up to 2 minutes; if still processing, close and retry |
| Cannot share to gallery | Consent checkbox not checked | Must check "I consent to share" before the Share to Gallery button activates |

**Related SOPs:** SOP-CUST-003 (Browsing & Searching), SOP-CUST-005 (Gift Builder), SOP-CUST-012 (Review & Rating)

---

## SOP-CUST-005: Gift Builder & Gift Assistant

**Objective:** Enable customers to discover and build personalized gift selections using AI-powered filtering by occasion, recipient, and relationship.

**Prerequisites:**
- Active 3boxes account
- Basic idea of the gifting occasion and recipient

**Steps — Gift Assistant:**

1. Navigate to the **Gift Assistant** section from the homepage navigation
2. The AI-powered assistant presents guided questions:
   - **Occasion** — Select the gifting occasion (Birthday, Anniversary, Wedding, Diwali, Valentine's Day, Housewarming, Christmas, Raksha Bandhan, etc.)
   - **Recipient** — Select who the gift is for (Him, Her, Couple, Kids, Parents, Friend, Colleague, Boss)
   - **Relationship** — Select your relationship to the recipient (Spouse, Parent, Sibling, Friend, Colleague, Boss, Child)
   - **Budget Range** — Set a minimum and maximum price range
   - **Preferences** (optional) — Select style preferences (Classic, Modern, Traditional, Minimalist, Bold)
3. Click **"Find Gifts"**
4. The AI generates a curated list of gift recommendations with match scores (percentage)
5. Each recommendation shows: product image, name, price, match score, and a brief reason ("Perfect for your spouse's birthday — classic jewelry with timeless appeal")
6. Click a recommendation to view the product detail page
7. Add desired items to the cart or wishlist

**Steps — Gift Builder (3Box Curate):**

1. Navigate to **3Box Curate** from the homepage
2. Browse curated portals by occasion, theme, or category
3. Add items to your 3Box bundle:
   - Click **"Add to Box"** on individual products
   - A minimum of 3 items is required (the "3Box" concept)
4. Review your 3Box bundle in the sidebar:
   - All selected items with images and prices
   - Running total and estimated delivery
   - Packaging preview
5. Toggle **"AI Curation Consent"** to allow AI to suggest optimal arrangement and complementary items
6. Click **"Proceed to Purchase"** to begin checkout (see SOP-CUST-007)

**Expected Outcome:**
- Personalized gift recommendations ranked by AI match score
- Ability to build a 3Box curated bundle with a minimum of 3 items
- Smooth transition to checkout for gift purchases

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| No recommendations shown | Budget too narrow or rare combination | Widen budget range; try different occasion/recipient combinations |
| "3Box Complete" validation fails | Fewer than 3 items in the box | Add at least 3 products to proceed with 3Box Curate |
| AI suggestions not relevant | Incomplete preference input | Provide more detail in the preferences section; adjust budget range |

**Related SOPs:** SOP-CUST-003 (Browsing & Searching), SOP-CUST-006 (Cart Management), SOP-CUST-007 (Checkout)

---

## SOP-CUST-006: Shopping Cart Management

**Objective:** Enable customers to add, remove, and modify items in their shopping cart, apply coupon codes, and configure gift options before checkout.

**Prerequisites:**
- Active and approved 3boxes account
- At least one product added to the cart

**Steps:**

1. Add products to cart from:
   - Product card — Click **"Add to Cart"** button
   - Product detail page — Select variant (if applicable), then click **"Add to Cart"**
2. Navigate to the **Cart** page via the cart icon in the header
3. The cart displays: product image, name, selected variant, quantity, unit price, and line subtotal
4. For each cart item, you can:
   - **Change quantity** — Click the `+` or `-` buttons (minimum: 1, maximum: limited by stock availability)
   - **Select a variant** — If the product has variants, click the variant selector to change (e.g., size, color)
   - **Toggle gift wrapping** — Enable/disable gift wrapping (adds a gift wrap charge to the order total)
   - **Add a greeting message** — Enter free text (up to 250 characters) for a personalized greeting card
   - **Toggle "Hide Price"** — Remove price tags from the gift packaging (for surprise gifts)
   - **Remove item** — Click the trash icon to remove the item from the cart
5. Apply a coupon code:
   - Enter the code in the **"Coupon Code"** field
   - Click **"Apply"**
   - System validates the coupon against: expiration date, minimum order value, usage limit, applicable categories/products
   - If valid, the discount is applied and the cart total is updated
   - If invalid, an error message explains why (e.g., "Coupon expired", "Minimum order ₹2,000 required")
6. Review the order summary:
   - Subtotal (sum of all line items)
   - Shipping estimate (based on delivery type and address)
   - Tax (GST as applicable)
   - Discount (from coupon, if applied)
   - Gift wrapping charges (if enabled)
   - **Total** (final amount payable)
7. Click **"Proceed to Checkout"** to continue (see SOP-CUST-007)

**Expected Outcome:**
- Cart accurately reflects all selected items with correct pricing, quantities, and gift options
- Coupon discount is correctly applied and visible in the order summary
- Cart data persists across sessions (stored server-side, not just in local storage)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Item removed from cart automatically | Product went out of stock or was deactivated | The item is grayed out with an "Out of Stock" badge; remove it or wait for restock |
| Coupon not applying | Expired, minimum not met, usage limit reached, wrong category | Check coupon terms and conditions on the Offers page; try a different coupon |
| Cart total showing wrong amount | Currency conversion or stale cache | Refresh the page; check currency settings in Profile |
| Cannot increase quantity | Exceeds available stock | Stock is limited to the displayed maximum; contact support for bulk orders |
| "Cart is empty" after login | Cart was in guest session before login | Guest cart items are merged with the user's cart on login; if empty, items may have gone out of stock |

**Related SOPs:** SOP-CUST-005 (Gift Builder), SOP-CUST-007 (Checkout), SOP-ADM-011 (Coupon Management)

---

## SOP-CUST-007: Checkout Process

**Objective:** Complete a purchase by providing shipping details, selecting a delivery option, choosing a payment method, and placing the order.

**Prerequisites:**
- Active and approved 3boxes account
- At least one item in the shopping cart
- Valid shipping address and payment method

**Steps:**

1. From the Cart page, click **"Proceed to Checkout"**
2. **Shipping Address:**
   - For returning customers: previously saved addresses appear as selectable cards
   - Click an existing address to select it, or click **"Add New Address"**
   - Fill in the address form:
     - First Name, Last Name
     - Address Line 1 (street address)
     - Address Line 2 (apartment, suite, etc. — optional)
     - City, State, ZIP/Postal Code
     - Country (auto-detected via geo-IP, editable)
     - Phone Number (for delivery coordination)
   - Click **"Save Address"** to continue
3. **Delivery Type:**
   - **Standard Delivery** (3–5 business days) — Free or nominal charge
   - **Express Delivery** (1–2 business days) — Additional charge
   - **Same-Day Delivery** (select metro cities only) — Premium charge
   - **Scheduled Delivery** (pick a specific date) — Available for select pin codes
4. **Payment Method:**
   - **Card** — Credit or Debit card (Visa, Mastercard, Amex, RuPay)
   - **UPI** — Unified Payments Interface (GPay, PhonePe, Paytm, BHIM)
   - **Net Banking** — Direct bank transfer from supported banks
   - **Wallet** — Digital wallets (Paytm, Amazon Pay, Mobikwik)
   - **Corporate Credit** — Available for approved corporate users (see SOP-CRP-008)
5. Review the complete order summary on the right panel:
   - All items with images, names, quantities, and prices
   - Subtotal, shipping, tax, discount, gift wrap charges, and total
6. Click **"Place Order"**
7. The payment gateway (Razorpay/Stripe) processes the payment:
   - A secure payment popup or redirect appears
   - Complete the payment authentication
8. On successful payment:
   - Order is created with `status = "pending"` and `paymentStatus = "paid"`
   - Order confirmation page displays with the order number
   - Confirmation email is sent to the registered email address
9. On failed payment:
   - Order is created with `status = "pending"` and `paymentStatus = "failed"`
   - You can retry payment from **My Orders** > **Pay Now**

**Expected Outcome:**
- Order is created in the system with a unique order number
- Payment is processed and confirmed
- Confirmation email with order details is sent
- Order appears in **My Orders** with real-time tracking (see SOP-CUST-008)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Payment debited but order shows "failed" | Bank confirmed but gateway callback delayed | Wait 5 minutes and refresh; if still failed, contact support with payment reference |
| Payment gateway not loading | Browser popup blocker or network issue | Allow popups; disable ad blockers temporarily; try a different browser |
| "Address not serviceable" | Pin code not in delivery zone | Try a different address; contact support for special delivery requests |
| Corporate credit not showing | Corporate account not approved or credit limit exceeded | Check corporate account status; contact corporate admin (see SOP-CRP-001) |
| Coupon discount missing at checkout | Coupon invalidated after cart page | Re-apply the coupon; check if the coupon expired between cart and checkout |

**Related SOPs:** SOP-CUST-006 (Cart Management), SOP-CUST-008 (Order Tracking), SOP-ADM-005 (Order Management)

---

## SOP-CUST-008: Order Tracking & History

**Objective:** Enable customers to view their order history, track shipment status, and access delivery details for all placed orders.

**Prerequisites:**
- Active 3boxes account
- At least one placed order

**Steps:**

1. Navigate to **My Orders** from the user dashboard or profile menu
2. The order list displays: Order #, Date, Status, Total Amount, Tracking Number (if available)
3. Filter orders by status: All, Pending, Processing, Shipped, Delivered, Cancelled
4. Click an order to view full details:
   - **Order Timeline** — Visual status milestones (Placed → Confirmed → Processing → Shipped → Delivered)
   - **Tracking Events** — Carrier updates (Picked up, In Transit, Out for Delivery, Delivered)
   - **Estimated Delivery Date** — Updated in real-time based on carrier data
   - **Delivery Address** — Full shipping address
   - **Order Items** — Product images, names, quantities, prices
   - **Payment Summary** — Method, amount, status
   - **Invoice** — Download link (available after order is processed)
5. For orders with `status = "pending"` and `paymentStatus = "failed"`: Click **"Retry Payment"** to attempt payment again
6. For delivered orders: Click **"Write Review"** to submit a product review (see SOP-CUST-012)

**Expected Outcome:**
- Complete order history is accessible with real-time status updates
- Tracking information is available once the order is shipped
- Invoices are downloadable for completed orders

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Order not visible | Account not approved at time of order, or payment failed | Check payment status; if debited, contact support with payment reference |
| Tracking not updating | Carrier has not scanned the package | Wait 24 hours after shipment; contact support if no update after 48 hours |
| Invoice download fails | PDF generation error | Retry after a few minutes; if persistent, request via support ticket |

**Related SOPs:** SOP-CUST-007 (Checkout), SOP-CUST-010 (Support Ticket), SOP-ADM-005 (Order Management)

---

## SOP-CUST-009: Wishlist Management

**Objective:** Allow customers to save products for future consideration, manage their wishlist, and move items to cart when ready to purchase.

**Prerequisites:**
- Active 3boxes account
- At least one product of interest

**Steps:**

1. **Add to Wishlist:** Click the **heart icon** on any product card or product detail page
2. **View Wishlist:** Click the **heart icon** in the header navigation
3. The wishlist displays: product image, name, current price, stock status, and date added
4. Available actions per item:
   - **Add to Cart** — Moves the item from wishlist to the shopping cart
   - **Remove** — Deletes the item from the wishlist permanently
   - **Share** — Generates a shareable link to your wishlist (for gift registries)
5. Wishlist items that go out of stock show an **"Out of Stock"** badge with an optional **"Notify Me"** button for restock alerts
6. Items are stored as `WishlistItem` records (unique per userId + productId; duplicates are prevented)

**Expected Outcome:**
- Products are saved for later with accurate pricing and stock status
- Wishlist can be shared externally for gift registries
- Restock notifications are enabled for out-of-stock items

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Heart icon not clickable | Not logged in | Log in to your account to use the wishlist feature |
| Duplicate item in wishlist | Race condition on rapid double-click | Duplicates are automatically merged; refresh the page |
| "Add to Cart" fails from wishlist | Product went out of stock | Enable "Notify Me" and wait for restock |

**Related SOPs:** SOP-CUST-003 (Browsing & Searching), SOP-CUST-006 (Cart Management)

---

## SOP-CUST-010: Support Ticket Creation

**Objective:** Enable customers to create and track support tickets for issues related to orders, products, account, or platform functionality.

**Prerequisites:**
- Active 3boxes account
- A specific issue or question that requires assistance

**Steps:**

1. Navigate to **Support** from the user dashboard or footer
2. Click **"Create Ticket"** or **"New Ticket"**
3. Fill in the ticket form:
   - **Subject** (required, brief description of the issue)
   - **Category** (Order Issue, Product Inquiry, Account Problem, Payment Issue, Return/Refund, Technical, Other)
   - **Priority** (Low, Medium, High, Urgent — be honest in your assessment; see priority guide below)
   - **Description** (required, detailed explanation of the issue)
   - **Related Order #** (optional, if the issue pertains to a specific order)
   - **Attachments** (optional, screenshots or documents — max 5 files, 5MB each)
4. Click **"Submit Ticket"**
5. Ticket is created with `status = "open"` and a unique ticket ID
6. You receive an email confirmation with the ticket ID
7. Monitor ticket status in **My Tickets**:
   - `open` → `in_progress` (agent is working on it)
   - `in_progress` → `resolved` (agent has provided a solution)
   - `resolved` → `closed` (you confirm the resolution)
8. To respond to an agent: Open the ticket, type your message, and click **"Reply"**
9. If the resolution is unsatisfactory: Reply to the ticket instead of confirming closure; the ticket reopens automatically

**Priority Classification Guide for Customers:**

| Priority | When to Use |
|----------|-------------|
| **Urgent** | Payment failure with money debited, account security breach |
| **High** | Order not delivered past estimated date, defective product received |
| **Medium** | General questions, feature requests, account settings help |
| **Low** | Feedback, suggestions, non-urgent inquiries |

**Expected Outcome:**
- Support ticket is created and routed to the appropriate agent queue
- Agent responds within the target time (Urgent: < 15 min, High: < 1 hour, Medium: < 4 hours, Low: < 24 hours)
- Customer can track progress and communicate with the agent in real-time

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Ticket not appearing | Account not approved or submission failed | Refresh the page; check "My Tickets" section |
| No agent response | High ticket volume | Wait for the priority-based response window; if exceeded, submit a follow-up |
| Cannot attach files | File size exceeds 5MB or unsupported format | Compress images; use JPG, PNG, or PDF format only |

**Related SOPs:** SOP-CUST-008 (Order Tracking), SOP-AGT-001 (Ticket Handling)

---

## SOP-CUST-011: Multi-Currency & Language Settings

**Objective:** Allow customers to view prices and interact with the platform in their preferred currency and language.

**Prerequisites:**
- Active 3boxes account
- Internet access

**Steps:**

1. Navigate to **Profile** > **Settings** > **Preferences**
2. **Currency Selection:**
   - Click the **Currency** dropdown
   - Available currencies: INR (₹), USD ($), EUR (€), GBP (£), AED (د.إ), SGD (S$), CAD (C$), AUD (A$)
   - Select your preferred currency
   - All prices across the platform are converted using real-time exchange rates (via `/api/currency/rates`)
   - The currency symbol updates throughout the site (product cards, cart, checkout)
3. **Language Selection:**
   - Click the **Language** dropdown
   - Available languages: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi
   - Select your preferred language
   - UI labels, navigation, and product descriptions update to the selected language (where translations are available)
4. Click **"Save Preferences"**
5. Settings are persisted to your user profile and apply across all sessions

**Expected Outcome:**
- All product prices display in the selected currency with real-time conversion rates
- UI text renders in the selected language
- Preferences persist across login sessions

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Currency conversion seems wrong | Stale exchange rate cache | Refresh the page; rates update every 15 minutes |
| Some text still in English | Translation not yet available for that section | Product descriptions and some labels may not be fully translated yet |
| Currency reverts to INR | Session expired or preference not saved | Re-login and save preferences again |

**Related SOPs:** SOP-CUST-003 (Browsing & Searching), SOP-CUST-006 (Cart Management)

---

## SOP-CUST-012: Review & Rating Submission

**Objective:** Enable customers to submit verified reviews and ratings for purchased products, contributing to the platform's social proof and helping other customers make informed decisions.

**Prerequisites:**
- Active 3boxes account
- At least one order with `status = "delivered"`
- The product being reviewed must be from a delivered order

**Steps:**

1. Navigate to **My Orders** from the user dashboard
2. Find a delivered order and click **"Write Review"** on the specific product
3. Fill in the review form:
   - **Rating** (required) — Select 1 to 5 stars (1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent)
   - **Title** (optional) — A short summary (e.g., "Beautiful necklace, great quality!")
   - **Comment** (required) — Detailed review text (minimum 10 characters, maximum 2000 characters)
   - **Attach Style Preview** (optional) — If you have an AI Virtual Try-On result for this product, you can attach it as a visual review
4. Click **"Submit Review"**
5. The review is created with `verified = false` initially
6. An admin verifies the purchase (confirms the reviewer actually bought the product) and sets `verified = true`
7. Verified reviews appear on the product detail page with a **"Verified Purchase"** badge
8. Unverified reviews may be published but without the verification badge

**Expected Outcome:**
- Review is submitted and queued for admin verification
- Verified reviews contribute to the product's average rating
- AI Style Preview attachments enhance the review with visual context

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Write Review" button not available | Order not yet delivered or review already submitted | Wait for delivery confirmation; check if you already reviewed this product |
| Review not visible on product page | Not yet verified by admin | Allow 24–48 hours for admin verification |
| Cannot attach Style Preview | No Try-On result exists for this product | Generate a Style Preview first (see SOP-CUST-004) |

**Related SOPs:** SOP-CUST-004 (Virtual Try-On), SOP-CUST-008 (Order Tracking)

---

# 2. Admin SOPs

## SOP-ADM-001: Dashboard Overview & Navigation

**Objective:** Provide admins with a comprehensive overview of the admin dashboard layout, key metrics, and navigation structure for efficient system management.

**Prerequisites:**
- Admin account with `approvalStatus = "approved"` and `isActive = true`
- Required permissions: `dashboard.view`

**Steps:**

1. Log in with admin credentials at `/admin`
2. The admin dashboard displays key metrics:
   - **Total Revenue** — Today, this week, this month (with comparison to previous period)
   - **Order Count by Status** — Pending, Processing, Shipped, Delivered, Cancelled
   - **Low Stock Alerts** — Products below reorder level
   - **Active Users** — Currently logged-in users
   - **Pending Corporate Approvals** — Corporate accounts awaiting review
   - **Support Tickets by Priority** — Urgent, High, Medium, Low counts
3. Left sidebar navigation provides access to all admin modules:
   - **Dashboard** (home with KPIs)
   - **Users** — User management
   - **Products** — Product catalog
   - **Orders** — Order processing
   - **Categories** — Category hierarchy
   - **Corporate** — Corporate accounts
   - **Campaigns** — Corporate campaigns
   - **Coupons** — Coupon & offer management
   - **Partners** — Integration management
   - **SMTP** — Email configuration
   - **Reports** — Analytics and exports
   - **Audit Logs** — Security and activity logs
   - **API Logs** — API request monitoring
   - **Permissions** — Role-based access control
   - **Wiki** — Documentation management
   - **Training** — Training material management
4. Each module supports CRUD operations with consistent UI patterns (list view, detail view, create/edit forms)

**Expected Outcome:**
- Admin can quickly assess platform health and identify items requiring attention
- Navigation to any module is accessible within 2 clicks from the dashboard

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Dashboard not loading | Insufficient permissions or session expired | Check `dashboard.view` permission; re-login |
| Metrics showing zero | Database query timeout or cache issue | Refresh the page; if persistent, check API logs for errors |

**Related SOPs:** SOP-ADM-002 (User Management), SOP-ADM-015 (Permission Management)

---

## SOP-ADM-002: User Management

**Objective:** Manage the complete lifecycle of user accounts — creation, approval, role assignment, suspension, and deletion.

**Prerequisites:**
- Admin account with `permissions` including `users.manage`
- Access to the Admin Dashboard > Users tab

**Steps — Creating a New User:**

1. Navigate to **Admin Dashboard** > **Users**
2. Click **"Add User"** button (top-right corner)
3. Fill in required fields:
   - **Email** (required, must be unique across the system)
   - **Name** (required)
   - **Role** (select: admin, user, agent, team, corporate)
   - **Admin Sub-Role** (if role=admin): super_admin, product_manager, order_manager, inventory_manager, finance_manager, support_agent, corporate_account_manager
   - **Corporate Role** (if role=corporate): corporate_admin, finance_user, campaign_manager
4. Click **"Create User"**
5. The user receives an email with account setup instructions
6. New user `approvalStatus` defaults to `"pending"`

**Steps — Approving/Rejecting a User:**

1. Navigate to **Admin Dashboard** > **Users**
2. Filter by `approvalStatus = "pending"` using the status filter
3. Review user details: email, name, role requested, registration date
4. Click **"Approve"** to activate or **"Reject"** to deny
5. If approving:
   - System sets `approvalStatus = "approved"` and `isActive = true`
   - User receives confirmation email
   - Audit log entry created (`action: "approval_change"`)
6. If rejecting:
   - System sets `approvalStatus = "rejected"`
   - User receives rejection notification

**Steps — Suspending a User:**

1. Locate the user in the Users table
2. Click **"Suspend"** button
3. Enter a reason for suspension in the confirmation dialog (required)
4. Confirm the action
5. System sets `isActive = false` and `approvalStatus = "suspended"`
6. All active sessions for the user are terminated immediately
7. Audit log entry is created with the suspension reason

**Steps — Role & Permission Assignment:**

1. Navigate to **Admin Dashboard** > **Permissions** (or **Role Permissions**)
2. Select a user from the list
3. View current permissions (e.g., `products.manage`, `orders.manage`, `accounting.view`)
4. To add a permission: Click **"Add Permission"**, select from the dropdown, confirm
5. To remove a permission: Click the **"X"** icon next to the permission
6. Changes take effect immediately on the user's next API request
7. Permissions are stored as `UserPermission` records (unique per userId + permission string)

**Expected Outcome:**
- User accounts are properly created, approved, and assigned appropriate roles and permissions
- Suspended users lose access immediately
- All user management actions are logged in the audit trail

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Cannot create user | Email already exists | Search for the existing user; consider reactivating instead |
| User cannot log in after approval | 2FA misconfigured or email not verified | Check `emailVerified` and `twoFactorEnabled` fields; reset 2FA if needed |
| Permission changes not taking effect | Browser or API session cache | User must log out and log back in; permissions apply on next request |

**Related SOPs:** SOP-ADM-001 (Dashboard), SOP-ADM-015 (Permission Management), SOP-CUST-001 (Registration)

---

## SOP-ADM-003: Product Management

**Objective:** Manage the product catalog including adding, editing, deleting products, importing from external platforms, and syncing with Shopify.

**Prerequisites:**
- Admin account with `permissions` including `products.manage`
- For imports: active partner integration configured (see SOP-ADM-010)

**Steps — Adding a New Product Manually:**

1. Navigate to **Admin Dashboard** > **Products**
2. Click **"Add Product"** button
3. Fill in product details:
   - **Name** (required)
   - **Description** (required, rich text editor with markdown support)
   - **Price** (required, in INR — base currency)
   - **Compare-at Price** (optional, for showing strikethrough discount)
   - **Cost Price** (optional, for margin calculation)
   - **SKU** (optional, unique stock keeping unit)
   - **Category** (select from dropdown — must exist first; see SOP-ADM-006)
   - **Stock Quantity** (default: 0)
   - **Reorder Level** (default: 5 — triggers low_stock alert when stock falls below this)
   - **Tags** (comma-separated, stored as JSON array)
   - **Occasions** (multi-select: birthday, anniversary, wedding, diwali, christmas, valentine, raksha_bandhan, housewarming)
   - **Recipient Types** (multi-select: him, her, couple, kids, parents, friend, colleague)
   - **Relationships** (multi-select: spouse, parent, sibling, friend, colleague, boss)
   - **Delivery Estimate** (e.g., "3-5 business days")
   - **Featured** (checkbox — featured products appear on homepage)
   - **Is Active** (checkbox — inactive products are hidden from storefront)
4. Upload product images:
   - Drag and drop or click to upload
   - Multiple images allowed; the first image is set as the primary image
   - Accepted formats: JPG, PNG, WebP (max 5MB per image)
5. Add product variants (optional):
   - Click **"Add Variant"**
   - Enter variant name (e.g., "Gold Plated", "Silver"), price, stock quantity, attributes (JSON)
   - Upload variant-specific image (optional)
6. Click **"Create Product"**
7. System auto-generates `productNumber` and `slug` from the product name

**Steps — Importing Products from External Platforms:**

1. Navigate to **Admin Dashboard** > **Partners**
2. Select the platform integration (Myntra, Nykaa, CaratLane, Tanishq, Bluestone, Voylla, Flipkart, Amazon)
3. Click **"Sync Now"** to pull latest product data from the platform
4. Alternatively, use the dedicated Product Import API:
   - **Search**: `GET /api/product-import/search?platform={platform}&query={query}`
   - **Scrape**: `POST /api/product-import/scrape` with `{platform, category, maxProducts}` parameters
   - **Import**: `POST /api/product-import/import` with `{platform, productIds[]}` to import selected products
5. Review imported products in the **Products** tab
6. Verify: images are loading, prices are correct, descriptions are complete
7. Assign categories if needed via **Partners** > **Category Maps** (maps external categories to internal categories)
8. Imported products are marked with `isExternal = true` and include `affiliateUrl` and `platform` fields

**Steps — Shopify Sync:**

1. Navigate to **Admin Dashboard** > **Partners**
2. Click on the **Shopify** integration card
3. Configure Shopify store URL and API credentials if not already set
4. Click **"Sync from Shopify"** to import products
5. Or click **"Push to Shopify"** to export 3Boxes products to your Shopify store
6. Review sync results: number of products imported/exported, errors (if any)
7. Check `lastSyncedAt` and `lastSyncError` fields for sync status

**Expected Outcome:**
- Products are created with all required fields, images, and variants
- Imported products from external platforms have correct pricing, images, and affiliate links
- Shopify sync maintains data consistency between platforms

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Product not appearing in search | Missing category or `isActive=false` | Assign a valid category; set `isActive = true`; ensure `stock > 0` |
| Image upload fails | File too large or unsupported format | Resize images to under 5MB; use JPG, PNG, or WebP only |
| Import returns no results | Platform API timeout or rate limit | Retry after 5 minutes; check `lastSyncError` in Partners tab |
| Shopify sync fails | Invalid API credentials or network error | Verify Shopify API key and secret; test connection in Partners tab |
| Slug collision | Product name generates a duplicate slug | System auto-appends a numeric suffix; manually edit the slug if needed |

**Related SOPs:** SOP-ADM-006 (Category Management), SOP-ADM-010 (Partner Management), SOP-ADM-004 (Order Management)

---

## SOP-ADM-004: Order Management

**Objective:** Manage the complete order lifecycle — viewing, updating status, cancelling, processing refunds, and generating invoices.

**Prerequisites:**
- Admin account with `permissions` including `orders.manage`
- Access to the Admin Dashboard > Orders tab

**Steps — Viewing & Processing Orders:**

1. Navigate to **Admin Dashboard** > **Orders**
2. Orders are listed with: Order #, Customer, Total, Status, Payment Status, Date
3. Filter by status: All, Pending, Processing, Shipped, Delivered, Cancelled
4. Click an order to view full details:
   - **Customer Info** — Name, email, phone, shipping address
   - **Order Items** — Product thumbnail, name, variant, quantity, price
   - **Payment Details** — Method, status, session ID, transaction reference
   - **Tracking Info** — Tracking number, URL, carrier, events
   - **Invoice** — Invoice number, amount, tax, PDF link
5. Update order status through the pipeline:
   - `pending` → `processing` → `shipped` → `delivered`
   - Or `pending` → `cancelled` (must provide a cancellation reason)
6. Add tracking information when shipping:
   - Enter **Tracking Number** (from the logistics carrier)
   - Enter **Tracking URL** (carrier tracking page link)
   - Enter **Estimated Delivery Date**
   - Click **"Update Order"** to save

**Steps — Processing a Refund:**

1. Navigate to the order detail page
2. Verify `paymentStatus = "paid"` (only paid orders can be refunded)
3. Click **"Process Refund"**
4. Enter refund amount (defaults to order total; can be partial)
5. Select refund reason: Customer Request, Defective Product, Wrong Item, Late Delivery, Other
6. Confirm the refund
7. System creates a `PaymentSession` record with `status = "refunded"`
8. Order `refundStatus` set to `"processed"`, `refundAmount` and `refundedAt` recorded
9. If order had inventory deducted, stock is restored via `InventoryLog` with type `return`

**Steps — Generating an Invoice:**

1. Navigate to the order detail page
2. Click **"Generate Invoice"**
3. System creates an `OrderInvoice` record with:
   - Auto-generated `invoiceNumber` (sequential, formatted)
   - Amount, tax (GST), and total calculated from order items
   - Status set to `"generated"`
4. PDF is generated and stored at `pdfUrl`
5. Click **"Send Invoice"** to email the invoice to the customer
6. Invoice status updates to `"sent"`

**Expected Outcome:**
- Orders progress through the status pipeline correctly
- Refunds are processed with proper audit trail
- Invoices are generated, downloadable, and emailable

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Order stuck in "pending" | Payment not verified or gateway callback missed | Check `PaymentSession` status; if confirmed paid, manually update order status |
| Refund button disabled | Payment not in "paid" status | Cannot refund unpaid orders; verify payment status first |
| Invoice PDF generation fails | Template rendering error or storage issue | Retry; if persistent, check server logs and storage configuration |
| Tracking updates not showing | Carrier API not integrated or tracking number invalid | Verify tracking number format; manually add tracking events |

**Related SOPs:** SOP-ADM-003 (Product Management), SOP-ADM-013 (Reports), SOP-CUST-008 (Order Tracking)

---

## SOP-ADM-005: Category Management

**Objective:** Create and manage the product category hierarchy, including slugs, parent-child relationships, and category-level configurations.

**Prerequisites:**
- Admin account with `permissions` including `categories.manage`
- Access to the Admin Dashboard > Categories tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Categories**
2. Existing categories are displayed as a hierarchical tree
3. **Create a New Category:**
   - Click **"Add Category"** button
   - Enter **Name** (required, e.g., "Jewelry", "Sarees", "Corporate Gifts")
   - **Slug** is auto-generated from the name (editable; used in URLs)
   - Enter **Description** (optional)
   - Upload **Category Image** (displayed on the storefront category grid)
   - Select **Parent Category** (optional — for sub-categories; e.g., "Necklaces" under "Jewelry")
   - Click **"Create Category"**
4. **Edit a Category:** Click the category name or edit icon, modify fields, click **"Save Changes"**
5. **Delete a Category:** Click the delete icon; if products are assigned, you must reassign them first
6. **Slug Mapping:** Ensure slugs are URL-safe (lowercase, hyphens instead of spaces, no special characters)

**Expected Outcome:**
- Category hierarchy is properly structured and displayed on the storefront
- Products can be assigned to categories during product creation
- Category URLs are clean and SEO-friendly

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Category not showing on storefront | No products assigned or image missing | Assign at least one active product; upload a category image |
| Slug conflict | Another category has the same slug | Slugs must be unique; system auto-appends a suffix on conflict |
| Cannot delete category | Products still assigned | Reassign products to another category before deletion |

**Related SOPs:** SOP-ADM-003 (Product Management), SOP-ADM-010 (Partner Management)

---

## SOP-ADM-006: Corporate Account Management

**Objective:** Manage corporate B2B accounts — review applications, approve/reject accounts, and update corporate account status.

**Prerequisites:**
- Admin account with `permissions` including `corporate.manage`
- Access to the Admin Dashboard > Corporate tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Corporate**
2. View all corporate accounts with: Company Name, Contact Person, Email, Status, Credit Limit, Date Applied
3. Filter by `approvalStatus`: pending, approved, rejected, suspended
4. **Review a New Application:**
   - Click on a corporate account with `approvalStatus = "pending"`
   - Review: Company name, registration number, GST number, contact details, address, requested credit limit, team size estimate
   - Verify business documentation (GST certificate, company registration)
5. **Approve/Reject:**
   - Click **"Approve"** to activate the corporate account
     - System sets `approvalStatus = "approved"`, `isActive = true`
     - Corporate admin receives approval email with login instructions
     - Credit limit is set based on the approved amount
   - Click **"Reject"** to deny the application
     - Enter rejection reason (required)
     - Corporate admin receives rejection notification
6. **Update Status:**
   - **Suspend** — Temporarily disable corporate account (unpaid invoices, policy violation)
   - **Reactivate** — Restore a suspended account
   - **Update Credit Limit** — Increase or decrease the corporate credit limit
7. Audit log entries are created for all corporate account status changes

**Expected Outcome:**
- Corporate accounts are reviewed and approved/rejected within 24 hours
- Credit limits are set appropriately based on business verification
- Status changes are logged with reasons

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Corporate admin cannot log in | Account not approved or email not verified | Check `approvalStatus` and `emailVerified`; approve if pending |
| Credit limit not updating | Cache or permission issue | Refresh; verify `corporate.manage` permission; check API logs |

**Related SOPs:** SOP-ADM-002 (User Management), SOP-CRP-001 (Corporate Registration)

---

## SOP-ADM-007: Campaign Management

**Objective:** Create, review, and manage corporate gifting campaigns on the platform.

**Prerequisites:**
- Admin account with `permissions` including `campaigns.manage`
- Access to the Admin Dashboard > Campaigns tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Campaigns**
2. View all campaigns with: Campaign Name, Corporate Account, Status, Budget, Recipient Count, Date
3. Filter by `status`: draft, submitted, approved, in_progress, completed, cancelled
4. **Review a Submitted Campaign:**
   - Click on a campaign with `status = "submitted"`
   - Review: Campaign name, occasion, budget, product selections, recipient list, delivery schedule
   - Verify budget alignment with corporate credit limit
   - Verify recipient data quality (valid names, addresses, phone numbers)
5. **Approve/Reject:**
   - Click **"Approve"** to move the campaign to `in_progress`
   - Click **"Request Changes"** to send feedback to the corporate user (campaign reverts to `draft`)
   - Click **"Reject"** to cancel the campaign entirely
6. **Monitor Active Campaigns:**
   - Track delivery progress for each recipient
   - View budget utilization (spent vs. allocated)
   - Flag any delivery issues or failed shipments

**Expected Outcome:**
- Campaigns are reviewed and processed within the committed SLA
- Budget and recipient data are verified before campaign execution
- Corporate users receive timely feedback on their campaign submissions

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Campaign stuck in "submitted" | Not yet reviewed by admin | Review and approve/reject promptly; SLA is 24 hours |
| Budget exceeds credit limit | Corporate account credit limit was reduced after campaign creation | Request the corporate user to reduce budget or increase credit limit |

**Related SOPs:** SOP-ADM-006 (Corporate Management), SOP-CRP-005 (Campaign Creation)

---

## SOP-ADM-008: Coupon & Offer Management

**Objective:** Create, validate, and manage promotional coupons and offers with usage limits, category restrictions, and expiration dates.

**Prerequisites:**
- Admin account with `permissions` including `coupons.manage`
- Access to the Admin Dashboard > Coupons tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Coupons**
2. View existing coupons with: Code, Type, Value, Min Order, Usage Count, Usage Limit, Expiry Date, Status
3. **Create a New Coupon:**
   - Click **"Create Coupon"** button
   - Fill in coupon details:
     - **Code** (required, unique, e.g., "DIWALI2025") — auto-generate option available
     - **Type** — Percentage discount (`percentage`) or Fixed amount (`fixed`)
     - **Value** — Discount amount (e.g., 15 for 15% or ₹500 for fixed)
     - **Minimum Order Value** — Minimum cart total required (e.g., ₹2000)
     - **Maximum Discount** — Cap on percentage discounts (e.g., max ₹1000 off)
     - **Usage Limit** — Total number of times the coupon can be used across all users (e.g., 1000)
     - **Per-User Limit** — Maximum uses per individual user (e.g., 1)
     - **Applicable Categories** — Restrict to specific categories (optional; leave empty for all)
     - **Applicable Products** — Restrict to specific products (optional)
     - **Start Date** — When the coupon becomes active
     - **End Date** — When the coupon expires
     - **Is Active** — Toggle to enable/disable
   - Click **"Create Coupon"**
4. **Edit a Coupon:** Click the coupon code, modify fields, click **"Save Changes"**
5. **Deactivate a Coupon:** Toggle the `isActive` switch to off; existing uses are preserved but new applications are blocked

**Expected Outcome:**
- Coupons are created with clear terms and conditions
- Usage is tracked and limits are enforced
- Expired or deactivated coupons cannot be applied at checkout

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Coupon not applying at checkout | Expired, usage limit reached, minimum not met, wrong category | Check all coupon conditions; review usage count vs. limit |
| "Code already exists" | Duplicate coupon code | Use a unique code; try the auto-generate feature |

**Related SOPs:** SOP-CUST-006 (Cart Management), SOP-ADM-013 (Reports)

---

## SOP-ADM-009: Partner & Integration Management

**Objective:** Add, configure, and manage external platform integrations (Myntra, Nykaa, CaratLane, Shopify, etc.) for product import, affiliate tracking, and data synchronization.

**Prerequisites:**
- Admin account with `permissions` including `partners.manage`
- API credentials for the external platform (if required)

**Steps:**

1. Navigate to **Admin Dashboard** > **Partners**
2. View existing integrations with: Platform Name, Status, Last Synced, Products Count, Sync Errors
3. **Add a New Partner:**
   - Click **"Add Partner"**
   - Enter **Platform Name** (e.g., "Myntra", "Nykaa", "Shopify")
   - Enter **API Endpoint** (base URL for the platform's API)
   - Enter **API Key** and **API Secret** (platform-specific credentials)
   - Enter **Affiliate Code** (referral code for affiliate tracking)
   - Enter **Commission Rate** (percentage earned on affiliate sales)
   - Click **"Save"**
4. **Sync Products:**
   - Click **"Sync Now"** on the partner card
   - System pulls latest product data via the platform API
   - Review sync results: products added, updated, or failed
   - Check `lastSyncedAt` and `lastSyncError` fields
5. **Category Mapping:**
   - Click **"Category Maps"** on the partner card
   - Map external platform categories to internal 3Boxes categories
   - This ensures imported products are automatically assigned to the correct category
6. **Monitor Affiliate Performance:**
   - View click stats, conversion rates, and commissions per partner
   - Check for broken affiliate links and update URLs as needed

**Expected Outcome:**
- External platform integrations are configured and syncing correctly
- Imported products are categorized properly via category mapping
- Affiliate links are tracked and commissions are recorded

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Sync fails | Invalid API credentials or platform downtime | Verify credentials; check platform status; retry after 5 minutes |
| Imported products have no category | Category mapping not configured | Set up category maps before importing |
| Affiliate links broken | URL format changed on partner platform | Update the affiliate URL pattern in the partner configuration |

**Related SOPs:** SOP-ADM-003 (Product Management), SOP-ADM-005 (Category Management)

---

## SOP-ADM-010: SMTP Configuration

**Objective:** Configure and test the SMTP email service for transactional emails (order confirmations, verification links, password resets, invoices).

**Prerequisites:**
- Admin account with `super_admin` or `admin` sub-role with SMTP permissions
- Valid SMTP credentials from your email service provider

**Steps:**

1. Navigate to **Admin Dashboard** > **SMTP**
2. Enter SMTP credentials:
   - **Host** (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`, `smtp.mailgun.org`)
   - **Port** (e.g., 587 for TLS, 465 for SSL, 2525 for alternative)
   - **Username** (email address or API key)
   - **Password** (app-specific password or API key)
   - **From Email** (sender address, e.g., `noreply@3boxes.in`)
   - **From Name** (display name, e.g., "3 Boxes Luxury")
   - **Encryption** (TLS or SSL)
3. Click **"Test Connection"** to verify the configuration:
   - System sends a test email to the admin's registered email
   - If successful, a confirmation message appears
   - If failed, an error message describes the issue (authentication, connection, certificate)
4. Click **"Save"** to persist the configuration
5. All subsequent transactional emails use the configured SMTP settings

**Expected Outcome:**
- SMTP connection is verified and working
- Transactional emails are delivered successfully with > 98% delivery rate
- From name and email appear correctly in customer inboxes

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Authentication failed" | Wrong credentials or app password not set | For Gmail: create an app-specific password; for SendGrid: use API key |
| "Connection timeout" | Firewall blocking the SMTP port | Open port 587 or 465 on the server; check with hosting provider |
| Emails going to spam | Missing SPF/DKIM/DMARC records | Configure DNS records for the sending domain |
| Test email received but other emails not | Template rendering error | Check email templates for syntax errors; review API logs for failures |

**Related SOPs:** SOP-ADM-001 (Dashboard), SOP-ADM-014 (API Logs)

---

## SOP-ADM-011: Reports & Analytics

**Objective:** Generate, view, and export platform reports for business intelligence and decision-making.

**Prerequisites:**
- Admin account with `permissions` including `reports.view`
- Access to the Admin Dashboard > Reports tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Reports**
2. Select a report type:
   - **Sales Summary** — Revenue, orders, average order value by period
   - **Product Performance** — Best sellers, lowest sellers, inventory turns, margin analysis
   - **Customer Analytics** — Registration trends, repeat purchase rate, lifetime value
   - **Corporate Gifting** — Campaign status, budget utilization, corporate revenue share
   - **AI Try-On Metrics** — Usage count, accuracy scores, strategy distribution, conversion impact
   - **Coupon Performance** — Usage rates, revenue impact, top coupons
   - **Affiliate Report** — Clicks, conversions, commissions by platform
3. Set date range: Today, This Week, This Month, This Quarter, Custom Range
4. Click **"Generate Report"**
5. Report renders as interactive tables and charts in the dashboard
6. Click **"Export CSV"** or **"Export PDF"** to download the report for offline analysis

**Expected Outcome:**
- Accurate reports are generated within the specified date range
- Data can be exported for external analysis and presentations
- Report data matches source records (cross-verify with Orders and Products)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Report shows zero data | Date range has no matching records or query timeout | Widen the date range; check if orders exist for the period |
| Export fails | File too large or server memory limit | Reduce the date range; use CSV instead of PDF for large datasets |

**Related SOPs:** SOP-ADM-004 (Order Management), SOP-ADM-003 (Product Management)

---

## SOP-ADM-012: Audit Logs

**Objective:** View, search, and filter audit logs for security monitoring, compliance, and incident investigation.

**Prerequisites:**
- Admin account with `permissions` including `audit.view`
- Access to the Admin Dashboard > Audit Logs tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Audit Logs**
2. Logs are displayed in reverse chronological order (newest first)
3. Each log entry shows: Timestamp, User, Action, Entity, Details, IP Address, User Agent
4. **Filter options:**
   - **Action Type** — login, logout, password_change, role_change, approval_change, mfa_setup, mfa_disable, user_create, user_update, order_update, refund_process
   - **Entity** — user, order, product, corporate, campaign, coupon, category
   - **Date Range** — Custom range selector
   - **User** — Search by user email or name
5. Click a log entry to view full details in a modal/panel
6. Audit logs are immutable — they cannot be edited or deleted through the UI
7. Logs are retained for a minimum of 12 months per compliance requirements

**Expected Outcome:**
- Complete audit trail of all significant platform actions
- Ability to trace any change back to a specific user, time, and IP address
- Logs support compliance requirements and incident investigation

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Logs not loading | Large result set causing query timeout | Apply narrower date range or specific action filter |
| Missing log entry | Action not instrumented for audit | Report to engineering team; check API logs as a fallback |

**Related SOPs:** SOP-ADM-014 (API Logs), SOP-ADM-015 (Permission Management)

---

## SOP-ADM-013: API Logs Monitoring

**Objective:** Monitor API request logs for debugging, performance analysis, and error detection.

**Prerequisites:**
- Admin account with `permissions` including `api_logs.view`
- Access to the Admin Dashboard > API Logs tab

**Steps:**

1. Navigate to **Admin Dashboard** > **API Logs**
2. View recent API requests with: Timestamp, Method, Endpoint, Status Code, Response Time, User, IP
3. Filter by:
   - **Status Code** — 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
   - **Endpoint** — Filter by API route (e.g., `/api/admin/products`, `/api/checkout`)
   - **Method** — GET, POST, PUT, PATCH, DELETE
   - **Date Range** — Custom selector
4. Click a log entry to view full request/response details (headers, body, timing)
5. Use API logs to:
   - Debug failed requests (4xx/5xx errors)
   - Identify slow endpoints (high response times)
   - Detect unauthorized access attempts (401/403 patterns)
   - Verify webhook deliveries from payment gateways

**Expected Outcome:**
- API issues are identified and diagnosed quickly
- Performance bottlenecks are visible for optimization
- Security incidents are detected through unauthorized access patterns

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| API logs page slow | Large volume of requests | Apply date range and status code filters; use pagination |
| 500 errors appearing | Backend server error | Check the specific endpoint's error details; escalate to engineering |

**Related SOPs:** SOP-ADM-012 (Audit Logs), SOP-ADM-010 (SMTP Configuration)

---

## SOP-ADM-014: Permission Management

**Objective:** Manage granular, role-based permissions for all platform users, ensuring the principle of least privilege.

**Prerequisites:**
- Admin account with `super_admin` sub-role or explicit `permissions.manage` permission
- Access to the Admin Dashboard > Permissions tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Permissions**
2. **View User Permissions:**
   - Select a user from the list
   - View all assigned permissions as badges/tags
3. **Add a Permission:**
   - Click **"Add Permission"**
   - Select from the available permissions dropdown:
     - `dashboard.view` — Access admin dashboard
     - `products.manage` — CRUD products and variants
     - `orders.manage` — Process orders, refunds, invoices
     - `users.manage` — Create, approve, suspend users
     - `corporate.manage` — Manage corporate accounts
     - `campaigns.manage` — Manage corporate campaigns
     - `coupons.manage` — Create and manage coupons
     - `categories.manage` — Manage category hierarchy
     - `partners.manage` — Manage integrations and syncs
     - `reports.view` — View and export reports
     - `audit.view` — View audit logs
     - `api_logs.view` — View API logs
     - `permissions.manage` — Manage user permissions
     - `wiki.manage` — Manage wiki documents
     - `training.manage` — Manage training materials
     - `smtp.manage` — Configure SMTP settings
     - `accounting.view` — View accounting entries
   - Click **"Confirm"**
4. **Remove a Permission:**
   - Click the **"X"** icon next to the permission badge
   - Confirm the removal
5. **Role-Level Defaults:**
   - Navigate to **Role Permissions** tab to view/modify default permissions per role
   - Changes to role-level defaults affect all users with that role on their next API request
6. Changes take effect immediately; no server restart required

**Expected Outcome:**
- Users have only the permissions necessary for their role
- Permission changes are reflected immediately
- Principle of least privilege is maintained

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Permission not taking effect | Cached session or browser issue | User must log out and log back in; permissions apply on next request |
| Cannot add permission | Insufficient admin privileges | Only super_admin or users with `permissions.manage` can modify permissions |

**Related SOPs:** SOP-ADM-002 (User Management), SOP-ADM-001 (Dashboard)

---

## SOP-ADM-015: Wiki & Documentation Management

**Objective:** Create, edit, publish, and share wiki documents and SOPs for internal knowledge management.

**Prerequisites:**
- Admin account with `permissions` including `wiki.manage`
- Access to the Admin Dashboard > Wiki tab

**Steps:**

1. Navigate to **Admin Dashboard** > **Wiki**
2. View all documents with: Title, Category, Type, Access Roles, Status, Version
3. **Create a New Document:**
   - Click **"Create Document"**
   - Fill in:
     - **Title** (required)
     - **Slug** (auto-generated from title, editable — used in URLs)
     - **Content** (markdown editor with preview)
     - **Category** — architecture, api, technical, general, sop, workflow, patent, training
     - **Doc Type** — wiki, sop, workflow, patent, training, video
     - **Access Roles** — Comma-separated (admin, team, agent, user, corporate)
     - **Is Published** — Checkbox (unpublished docs are drafts only visible to admins)
   - Click **"Save"** (draft) or **"Publish"** (immediately available to access roles)
4. **Edit a Document:** Click the document title, modify content, click **"Save Changes"** or **"Update & Publish"**
5. **Share with Agents:**
   - Click **"Share with Agents"** on the document detail page
   - Select agent(s) from the dropdown
   - Set permissions: **Can Download** (default: true), **Can Share** (default: false)
   - Click **"Share"** — creates `AgentDocShare` records; agents receive a notification
6. **Share as Training:**
   - Click **"Share as Training"** on the document detail page
   - Select **Target Role** (admin, team, agent, user, corporate)
   - Set permissions: **Can Download** (default: true), **Can View** (default: true)
   - Click **"Share"** — creates `TrainingShare` records

**Expected Outcome:**
- Internal documentation is organized, versioned, and accessible to authorized roles
- Agents and team members receive shared documents and training materials
- Knowledge base remains current and relevant

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Agents cannot see shared doc | Access role not matching or not published | Ensure doc is published and agent's role is in Access Roles |
| Markdown rendering issues | Unsupported syntax | Use standard markdown; check preview before publishing |

**Related SOPs:** SOP-AGT-004 (Document Access), SOP-ADM-016 (Training Management)

---

## SOP-ADM-016: Training Material Management

**Objective:** Create and distribute training materials for different platform roles, including video scripts, SOPs, and onboarding guides.

**Prerequisites:**
- Admin account with `permissions` including `training.manage`
- Training content ready (documents, video scripts, SOPs)

**Steps:**

1. Navigate to **Admin Dashboard** > **Training** (or manage via Wiki > Doc Type = "training")
2. **Create Training Content:**
   - Click **"Create Training Material"**
   - Fill in: Title, Content (markdown), Category, Target Role, Difficulty Level (Beginner, Intermediate, Advanced)
   - Attach supplementary files (PDFs, video links)
   - Click **"Publish"**
3. **Assign Training:**
   - Select the training material
   - Click **"Assign to Users"**
   - Select target: All users of a role, or specific users
   - Set due date (optional)
   - Click **"Assign"**
4. **Track Completion:**
   - View completion status per user
   - Follow up with users who have not completed required training

**Expected Outcome:**
- Training materials are available for all roles
- Completion is tracked and follow-ups are automated
- New hires and role changes trigger appropriate training assignments

**Related SOPs:** SOP-ADM-015 (Wiki Management), SOP-AGT-004 (Document Access)

---

# 3. Agent SOPs

## SOP-AGT-001: Dashboard Navigation

**Objective:** Familiarize agents with the Agent Dashboard layout and navigation for efficient daily operations.

**Prerequisites:**
- Agent account with `approvalStatus = "approved"`
- Required role: `agent`

**Steps:**

1. Log in with agent credentials
2. The Agent Dashboard displays:
   - **Open Tickets Count** — Tickets awaiting response
   - **My Active Tickets** — Tickets currently assigned to you
   - **Recent Activity** — Latest ticket updates and messages
   - **Quick Stats** — Avg response time, resolution rate, customer satisfaction
3. Left sidebar navigation provides access to:
   - **Dashboard** (home with metrics)
   - **Support Tickets** — Ticket queue and management
   - **Documents** — Shared documents and knowledge base
   - **Training** — Training materials assigned to you
   - **Orders** — View-only access to customer orders (for assistance)
4. Use the global search bar to find tickets, orders, or documents by ID or keyword

**Expected Outcome:**
- Agent can navigate to all relevant modules within 2 clicks
- Key metrics are visible at a glance for prioritization

**Related SOPs:** SOP-AGT-002 (Ticket Handling), SOP-AGT-004 (Document Access)

---

## SOP-AGT-002: Support Ticket Handling

**Objective:** Handle customer support tickets from receipt to resolution, including response, escalation, and closure.

**Prerequisites:**
- Agent account with `approvalStatus = "approved"`
- Access to the Agent Dashboard > Support Tickets tab

**Steps:**

1. Navigate to **Support Tickets** in the Agent Dashboard
2. Tickets are sorted by priority (Urgent → High → Medium → Low) and then by creation date
3. Click a ticket to open it
4. Review:
   - **Subject** and **Description** — Customer's stated issue
   - **User Information** — Name, email, phone, order history link
   - **Priority Level** and **Status** — Current classification and state
   - **Message Thread** — All previous communications with timestamps
5. **Respond to the Ticket:**
   - Click **"Reply"**
   - Type your response in the rich text editor
   - Optionally attach files (screenshots, invoice PDFs, guides — max 5 files, 5MB each)
   - Click **"Send Reply"**
   - Ticket status auto-updates to `"in_progress"` if it was `"open"`
   - Customer receives an email notification of your reply
6. **Resolve the Ticket:**
   - After confirming the issue is resolved, click **"Mark Resolved"**
   - Status changes to `"resolved"`
   - Customer receives a notification and can confirm or reopen the ticket
7. If the customer confirms resolution: Status moves to `"closed"`
8. If the customer responds after resolution: Ticket reopens with `"in_progress"` status

**Steps — Escalating a Ticket:**

1. While viewing a ticket, click **"Escalate"** button
2. Select escalation reason:
   - **Technical Issue** — Requires engineering investigation (e.g., AI Try-On failure, payment gateway error)
   - **Refund Over Limit** — Refund amount exceeds agent authorization threshold (₹5,000)
   - **Account Security** — Suspected unauthorized access or data breach
   - **Corporate Account** — Requires corporate account manager intervention
3. Add detailed notes explaining the escalation context
4. Click **"Submit Escalation"**
5. Ticket priority is elevated (e.g., medium → high or high → urgent)
6. Admin or appropriate team is notified via email and dashboard alert

**Priority Classification Guide:**

| Priority | Criteria | Response Target |
|----------|----------|-----------------|
| **Urgent** | Payment failure with money debited, account breach, platform-wide issue | < 15 minutes |
| **High** | Order not delivered past ETA, defective product, refund under ₹5,000 | < 1 hour |
| **Medium** | Feature questions, account settings, general product inquiry | < 4 hours |
| **Low** | Feedback, suggestions, non-urgent requests | < 24 hours |

**Expected Outcome:**
- All tickets receive a first response within the priority-based SLA
- Escalations are properly categorized and routed to the correct team
- Resolution rate targets > 85% within first contact

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Cannot reply to ticket | Ticket is in "closed" status | Reopen the ticket first; or the customer must submit a new ticket |
| Escalation button disabled | Insufficient permissions | Contact admin for escalation privileges |
| Customer not receiving email replies | SMTP issue or email in spam | Check SMTP configuration; advise customer to check spam folder |

**Related SOPs:** SOP-AGT-003 (Customer Order Assistance), SOP-AGT-005 (Communication Protocols), SOP-CUST-010 (Ticket Creation)

---

## SOP-AGT-003: Customer Order Assistance

**Objective:** Assist customers with order-related inquiries including status checks, delivery updates, modification requests, and refund initiation.

**Prerequisites:**
- Agent account with view access to the Orders module
- Customer's order number or email for lookup

**Steps:**

1. Navigate to **Orders** in the Agent Dashboard (view-only access)
2. Search for the order by:
   - **Order Number** (exact match)
   - **Customer Email** (lists all orders for that customer)
   - **Customer Name** (fuzzy search)
3. Review the order details:
   - Current status, payment status, tracking information
   - Order items, quantities, prices
   - Shipping address and delivery type
4. **Common Assistance Scenarios:**
   - **"Where is my order?"** — Check tracking events; provide estimated delivery date; if no tracking update for 48+ hours, escalate to logistics
   - **"I want to cancel"** — If order is `pending` or `processing`, initiate cancellation (requires admin approval if payment already captured)
   - **"I received the wrong item"** — Create a replacement request; escalate for product swap
   - **"I want a refund"** — If under ₹5,000 and within refund policy, process directly; otherwise escalate with reason "Refund Over Limit"
5. Update the support ticket with the action taken and any reference numbers

**Expected Outcome:**
- Customer receives accurate and timely information about their order
- Appropriate actions (cancellation, refund, replacement) are initiated per policy
- All actions are documented in the support ticket thread

**Related SOPs:** SOP-AGT-002 (Ticket Handling), SOP-ADM-004 (Order Management)

---

## SOP-AGT-004: Document Sharing with Customers

**Objective:** Share approved documents, invoices, and guides with customers through the support ticket system.

**Prerequisites:**
- Agent account with document sharing permissions
- Document already shared with the agent (via `AgentDocShare`) or publicly available

**Steps:**

1. While responding to a support ticket, identify a relevant document to share
2. Click the **"Attach Document"** button in the reply editor
3. Select from:
   - **Shared Documents** — Documents shared with you by admin (e.g., return policy, size guide)
   - **Order Invoices** — Invoice PDFs for the customer's orders
   - **Public Guides** — Publicly available help articles
4. If `Can Share` permission is enabled on the document: It will be attached to the ticket reply
5. If `Can Share` is disabled: You cannot attach the document; direct the customer to the public help center instead
6. Click **"Send Reply"** with the document attached

**Expected Outcome:**
- Customers receive relevant documents directly in the support conversation
- Document access controls are respected (agents cannot share documents they don't have share permission for)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Document not appearing in attach list | Not shared with you or Can Share = false | Request admin to share the document with share permission |
| Invoice PDF not generating | Order not yet invoiced | Request admin to generate the invoice first (see SOP-ADM-004) |

**Related SOPs:** SOP-ADM-015 (Wiki Management), SOP-AGT-002 (Ticket Handling)

---

## SOP-AGT-005: Communication Protocols

**Objective:** Define standard communication protocols for agent-customer interactions, ensuring professional, consistent, and empathetic responses.

**Prerequisites:**
- Agent account with `approvalStatus = "approved"`
- Completed onboarding training (assigned via SOP-ADM-016)

**Communication Standards:**

1. **Greeting:** Always begin with a professional greeting using the customer's name (e.g., "Hello Priya,")
2. **Acknowledge:** Acknowledge the customer's issue before providing solutions (e.g., "I understand you're concerned about your order delivery. Let me look into this for you.")
3. **Be Specific:** Provide concrete information — order numbers, dates, tracking links, next steps
4. **Be Transparent:** If you don't have an immediate answer, set expectations (e.g., "I'm investigating this with our logistics team and will update you within 2 hours.")
5. **Professional Tone:** Maintain a professional, empathetic, and solution-oriented tone throughout
6. **Closing:** End with a clear next step and offer for further assistance (e.g., "Your order is now being processed and you'll receive a tracking number within 24 hours. Please don't hesitate to reach out if you have any other questions.")
7. **Language:** Respond in the customer's preferred language if a translation is available; default to English
8. **Escalation Notice:** If escalating, inform the customer (e.g., "I'm escalating this to our specialized team for faster resolution. You'll hear from them within 1 hour.")

**Prohibited Actions:**
- Never share internal system details (database fields, API endpoints, server names)
- Never promise refunds or credits beyond your authorization level (₹5,000)
- Never share one customer's information with another
- Never use informal or unprofessional language

**Expected Outcome:**
- Customers receive consistent, professional, and helpful communication
- Brand reputation is maintained through high-quality support interactions
- Escalation and authorization boundaries are respected

**Related SOPs:** SOP-AGT-002 (Ticket Handling), SOP-AGT-003 (Order Assistance)

---

# 4. Team Member SOPs

## SOP-TM-001: Product Management Tasks

**Objective:** Enable team members to manage product catalog tasks including adding products, updating inventory, and maintaining product data quality.

**Prerequisites:**
- Team member account with `approvalStatus = "approved"`
- Permissions: `products.manage`

**Steps — Adding a New Product:**

1. Log in to the admin interface with team member credentials
2. Navigate to **Products** > **Add Product**
3. Fill in all required fields (see SOP-ADM-003 for detailed field descriptions)
4. Upload product images (first image is primary)
5. Add variants if applicable
6. Click **"Create Product"**
7. Verify the product appears correctly on the storefront by searching for it

**Steps — Updating Product Information:**

1. Navigate to **Products** and search for the product
2. Click **"Edit"** to modify fields
3. Common updates: price changes, description improvements, new images, tag additions
4. Click **"Save Changes"**
5. Verify the update is reflected on the storefront

**Steps — Bulk Price Updates:**

1. Navigate to **Products** and filter by category or tag
2. Select multiple products using checkboxes
3. Click **"Bulk Edit"** (if available) or update each product individually
4. Apply price changes uniformly
5. Verify all updated products display correct pricing

**Expected Outcome:**
- Product catalog remains accurate and up-to-date
- New products are added with complete information
- Pricing and inventory changes are reflected in real-time

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Product not visible on storefront | `isActive=false` or missing category | Set `isActive = true`; assign a valid category |
| Image upload fails | File size exceeds 5MB limit | Compress the image; use JPG/PNG/WebP format |

**Related SOPs:** SOP-ADM-003 (Product Management), SOP-TM-003 (Inventory Monitoring)

---

## SOP-TM-002: Order Processing Workflow

**Objective:** Process customer orders through the fulfillment pipeline from pending to delivered.

**Prerequisites:**
- Team member account with `permissions` including `orders.manage`
- Access to the Admin Dashboard > Orders tab

**Steps:**

1. Navigate to **Orders** and filter by `status = "pending"`
2. For each pending order:
   - Verify payment status is `"paid"`
   - Confirm stock availability for all order items
   - If stock is insufficient, flag the order and notify the customer via support ticket
3. Update order status to `"processing"`:
   - Pick and pack the order items
   - Generate any required packaging labels
4. Once packed and handed to the logistics carrier:
   - Enter the **Tracking Number**
   - Enter the **Tracking URL** (carrier's tracking page)
   - Enter the **Estimated Delivery Date**
   - Update order status to `"shipped"`
5. Monitor shipped orders for delivery confirmation
6. When delivery is confirmed (carrier tracking shows "Delivered"):
   - Update order status to `"delivered"`
   - System triggers a review request email to the customer
7. For cancelled orders:
   - Update status to `"cancelled"` with a reason
   - If payment was captured, initiate refund process (see SOP-ADM-004)
   - Restore inventory via `InventoryLog` with type `return`

**Expected Outcome:**
- Orders progress through the pipeline without unnecessary delays
- Target: < 2 hours from payment to "processing" status
- Tracking information is provided to customers within 24 hours of shipment

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Cannot update to "shipped" | Missing tracking information | Tracking number and URL are required to move to shipped status |
| Stock discrepancy at packing time | Inventory count is incorrect | Adjust inventory; create adjustment log; update stock count |

**Related SOPs:** SOP-ADM-004 (Order Management), SOP-TM-003 (Inventory Monitoring)

---

## SOP-TM-003: Inventory Monitoring

**Objective:** Monitor product inventory levels, identify low-stock and out-of-stock items, and trigger restocking processes.

**Prerequisites:**
- Team member account with `permissions` including `products.manage`
- Access to the Admin Dashboard > Products tab

**Steps:**

1. Navigate to **Products** and filter by `stockStatus`:
   - **`low_stock`** — Stock is below the `reorderLevel` but above 0
   - **`out_of_stock`** — Stock is 0; product cannot be purchased
   - **`preorder`** — Product is available for pre-order (future stock expected)
2. For each low-stock item:
   - Review the `reorderLevel` (default: 5) — adjust if necessary based on sales velocity
   - Initiate a restock order with the vendor (see SOP-TM-004)
   - Update the `stock` quantity when new inventory arrives
   - System auto-creates an `InventoryLog` entry with `type = "in"` (restock)
3. For out-of-stock items:
   - Set `stockStatus = "out_of_stock"` if not already set (auto-triggers when stock = 0)
   - Product is automatically hidden from search results (unless "Show Out of Stock" filter is enabled)
   - Consider setting `stockStatus = "preorder"` if restock is confirmed within 7 days
4. Review inventory logs for accuracy:
   - Log types: `in` (restock), `out` (sale deduction), `adjustment` (correction), `return` (customer return)
   - Discrepancies between system count and physical count should be corrected with an `adjustment` log entry
5. **Weekly Inventory Report:**
   - Generate a product inventory report (see SOP-ADM-011)
   - Highlight items requiring restock and items with high holding costs
   - Share report with the procurement team

**Expected Outcome:**
- Inventory levels are monitored proactively
- Low-stock alerts trigger restocking before items go out of stock
- Inventory accuracy > 98% (system count matches physical count)

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| System shows stock but item is physically unavailable | Inventory not deducted after sale or miscount | Create an `adjustment` log entry to correct; investigate root cause |
| Low-stock alert not triggering | `reorderLevel` set too low or not set | Adjust `reorderLevel` based on sales velocity; default is 5 |

**Related SOPs:** SOP-TM-001 (Product Management), SOP-TM-004 (Vendor Coordination)

---

## SOP-TM-004: Vendor Coordination

**Objective:** Coordinate with product vendors and suppliers for restocking, new product sourcing, and quality assurance.

**Prerequisites:**
- Team member account with vendor coordination permissions
- Active vendor relationships and contact information
- Access to the Vendors module (`/api/vendors`)

**Steps:**

1. Navigate to **Vendors** in the admin interface
2. View vendor list with: Name, Contact, Email, Phone, Product Count, Last Order Date, Status
3. **Add a New Vendor:**
   - Click **"Add Vendor"**
   - Fill in: Name, Contact Person, Email, Phone, Address, GST Number, Payment Terms, Notes
   - Click **"Save"**
4. **Restock Coordination:**
   - Identify products requiring restock (from SOP-TM-003)
   - Contact the vendor via email or phone
   - Negotiate quantity, price, and delivery timeline
   - Confirm the purchase order verbally and follow up with a written confirmation
   - Update the vendor's `lastOrderDate` and notes
5. **New Product Sourcing:**
   - Work with vendors to source new products for the catalog
   - Request product samples for quality review
   - Upon approval, add the product to the catalog (see SOP-TM-001)
6. **Quality Issue Resolution:**
   - If customers report quality issues, document the complaints
   - Contact the vendor with specific product and batch details
   - Negotiate replacement, refund, or credit
   - Update the vendor notes with quality concerns

**Expected Outcome:**
- Vendor relationships are maintained with clear communication
- Restock orders are placed before items go out of stock
- Quality issues are addressed promptly with vendor accountability

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Vendor not responding | Contact information outdated or vendor inactive | Try alternative contact methods; escalate to procurement manager |
| Delivery delay from vendor | Supply chain disruption | Communicate delay to affected customers; explore alternative vendors |

**Related SOPs:** SOP-TM-003 (Inventory Monitoring), SOP-TM-001 (Product Management)

---

# 5. Corporate User SOPs

## SOP-CRP-001: Corporate Account Registration & Approval Process

**Objective:** Register a corporate B2B account on 3boxes.in and navigate the approval process.

**Prerequisites:**
- Valid business email address (not a personal email)
- Business documentation ready (GST certificate, company registration)
- Authorized signatory to approve terms and conditions

**Steps:**

1. Navigate to the 3boxes.in **Corporate Registration** page
2. Fill in the corporate registration form:
   - **Company Name** (required)
   - **Registration Number** (required — CIN, GST, or equivalent)
   - **GST Number** (required for Indian businesses)
   - **Company Address** (required)
   - **Industry/Sector** (select from dropdown)
   - **Company Size** (number of employees range)
   - **Contact Person Name** (required)
   - **Contact Person Email** (required — becomes the corporate admin email)
   - **Contact Person Phone** (required)
   - **Designation** (required)
   - **Requested Credit Limit** (optional — suggested amount for corporate credit)
   - **Business Documentation** — Upload GST certificate and company registration (PDF, JPG, PNG; max 10MB each)
3. Review and accept the **Corporate Terms & Conditions**
4. Click **"Submit Application"**
5. Application is created with `approvalStatus = "pending"`
6. Admin reviews the application (typically within 24 hours — see SOP-ADM-006)
7. **If Approved:**
   - You receive an approval email with login credentials and next steps
   - Corporate account is activated with the approved credit limit
   - You can now log in to the Corporate Dashboard
8. **If Rejected:**
   - You receive a rejection email with the reason
   - You may reapply after addressing the stated concerns

**Expected Outcome:**
- Corporate account application is submitted with all required documentation
- Approval is received within 24 hours (SLA)
- Corporate admin can access the Corporate Dashboard upon approval

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Registration form not submitting | Missing required fields or invalid GST format | Verify all required fields are filled; check GST number format |
| Application pending beyond 24 hours | High volume of applications or incomplete documentation | Contact support with your application reference number |
| "Email already registered" | Email used for a personal account | Use a different corporate email; or contact support to link accounts |

**Related SOPs:** SOP-ADM-006 (Corporate Account Management), SOP-CRP-002 (Profile & Branding Setup)

---

## SOP-CRP-002: Profile & Branding Setup

**Objective:** Configure corporate branding elements including logo, brand colors, custom packaging, and gift wrap options for a personalized gifting experience.

**Prerequisites:**
- Approved corporate account
- Corporate admin role (`corporate_admin`)
- Branding assets ready (logo, color codes, packaging design files)

**Steps:**

1. Log in to the **Corporate Dashboard**
2. Navigate to **Profile** > **Branding**
3. **Upload Logo:**
   - Click **"Upload Logo"** in the Logo section
   - Select a high-resolution logo file (PNG with transparent background recommended; max 2MB)
   - Preview the logo on sample packaging and invoices
   - Click **"Save Logo"**
4. **Set Brand Colors:**
   - Enter **Primary Color** (hex code, e.g., #1A365D)
   - Enter **Secondary Color** (hex code, e.g., #C9A84C)
   - Preview colors on sample gift wrap and packaging
   - Click **"Save Colors"**
5. **Configure Custom Packaging:**
   - Upload **Gift Wrap Design** (PDF or PNG; max 5MB)
   - Upload **Greeting Card Template** (PDF; optional)
   - Set **Default Greeting Message** (text that appears on the card; can be overridden per campaign)
   - Click **"Save Packaging"**
6. **Gift Wrap Options:**
   - **Standard Gift Wrap** — Platform's default luxury wrapping
   - **Custom Branded Wrap** — Your uploaded design (additional charge may apply)
   - **No Gift Wrap** — Products shipped in standard packaging
7. All branding changes are previewed before saving and applied to new campaigns immediately

**Expected Outcome:**
- Corporate branding is configured and applied to all outgoing gifts from campaigns
- Custom logo, colors, and packaging create a cohesive branded gifting experience
- Branding persists across all campaigns unless explicitly changed

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Logo upload fails | File exceeds 2MB or unsupported format | Compress the logo; use PNG with transparent background |
| Colors not appearing on packaging | Cache or preview not refreshed | Clear browser cache; regenerate preview |
| Custom gift wrap not applied | Campaign created before branding update | Update the campaign's packaging settings; new campaigns use latest branding |

**Related SOPs:** SOP-CRP-001 (Corporate Registration), SOP-CRP-005 (Campaign Creation)

---

## SOP-CRP-003: Team Member Management

**Objective:** Invite, manage, and assign roles to team members within the corporate account.

**Prerequisites:**
- Approved corporate account
- Corporate admin role (`corporate_admin`) — only admins can manage team members

**Steps:**

1. Log in to the **Corporate Dashboard**
2. Navigate to **Team** > **Members**
3. **Invite a Team Member:**
   - Click **"Invite Member"**
   - Enter **Name** and **Email** (required)
   - Assign a **Role**:
     - `corporate_admin` — Full access: branding, team, campaigns, recipients, invoicing
     - `finance_user` — Budget management, invoicing, payment tracking
     - `campaign_manager` — Campaign creation, recipient management, order tracking
   - Click **"Send Invitation"**
   - The invitee receives an email with a link to set up their account and join the corporate team
4. **Manage Existing Members:**
   - **Change Role** — Click the role dropdown on the member's row and select a new role
   - **Remove Member** — Click **"Remove"** and confirm; the member loses access to the corporate dashboard immediately
5. **View Member Activity:**
   - Click a member's name to view their recent activity: campaigns created, recipients added, login history

**Expected Outcome:**
- Team members are invited and assigned appropriate roles
- Role-based access is enforced within the corporate dashboard
- Members who are removed lose access immediately

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Invitation email not received | Spam filter or incorrect email | Check spam folder; resend the invitation; verify email address |
| Member cannot access dashboard | Account not yet set up or not approved | Member must click the invitation link and complete registration; admin must approve |
| Cannot remove member | Member has active campaigns | Reassign the member's campaigns to another team member before removal |

**Related SOPs:** SOP-CRP-001 (Corporate Registration), SOP-CRP-005 (Campaign Creation)

---

## SOP-CRP-004: Recipient Management

**Objective:** Add and manage gift recipients for corporate campaigns, including individual entry, CSV import, and budget allocation.

**Prerequisites:**
- Approved corporate account
- Campaign manager or corporate admin role
- Recipient data prepared (name, email, phone, address, budget)

**Steps — Add Individual Recipient:**

1. Navigate to **Recipients** in the Corporate Dashboard
2. Click **"Add Recipient"**
3. Fill in recipient details:
   - **Name** (required)
   - **Email** (required — for delivery notifications)
   - **Phone** (required — for delivery coordination)
   - **Address** (required — full shipping address)
   - **Designation** (optional — e.g., "VP Engineering")
   - **Department** (optional)
   - **Budget Allocation** (optional — per-recipient budget limit)
   - **Gift Preferences** (optional — style, color, category preferences)
4. Click **"Save Recipient"**

**Steps — CSV Import:**

1. Navigate to **Recipients** > **Import**
2. Download the **CSV Template** (provides the required column format)
3. Fill in the template with recipient data:
   - Required columns: `name`, `email`, `phone`, `address_line1`, `city`, `state`, `zip`
   - Optional columns: `designation`, `department`, `budget`, `preferences`
4. Upload the completed CSV file (max 10MB, up to 1000 recipients per import)
5. System validates each row:
   - Checks for required fields
   - Validates email format and phone format
   - Flags duplicate entries (same email in the same campaign)
6. Review validation results:
   - **Valid rows** — Ready for import
   - **Invalid rows** — Listed with error descriptions; fix and re-upload, or skip
7. Click **"Confirm Import"** to add valid recipients
8. Imported recipients appear in the Recipients list and can be assigned to campaigns

**Steps — Budget Allocation:**

1. Navigate to **Recipients** and select one or more recipients
2. Click **"Allocate Budget"**
3. Enter the budget amount per recipient (in INR)
4. Or select **"Uniform Budget"** to set the same amount for all selected recipients
5. Click **"Save Budget Allocation"**
6. Total allocated budget must not exceed the campaign's total budget

**Expected Outcome:**
- Recipients are added to the corporate account with complete delivery information
- CSV import enables bulk addition of recipients efficiently
- Budget is allocated per recipient within the campaign's total budget

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| CSV import fails entirely | File format error or encoding issue | Ensure CSV uses UTF-8 encoding; verify column names match the template |
| Some rows skipped during import | Missing required fields or invalid data | Fix the flagged rows in the CSV and re-import; valid rows from the first import are preserved |
| Budget allocation exceeds campaign budget | Sum of per-recipient budgets > campaign budget | Reduce individual allocations or increase the campaign budget |

**Related SOPs:** SOP-CRP-005 (Campaign Creation), SOP-CRP-006 (Campaign Submission)

---

## SOP-CRP-005: Campaign Creation

**Objective:** Create a corporate gifting campaign with occasion, budget, product selections, and recipient assignments.

**Prerequisites:**
- Approved corporate account
- Campaign manager or corporate admin role
- Recipients already added (see SOP-CRP-004)
- Sufficient credit limit for the campaign budget

**Steps:**

1. Navigate to **Campaigns** in the Corporate Dashboard
2. Click **"Create Campaign"**
3. Fill in campaign details:
   - **Campaign Name** (required — e.g., "Diwali 2025 Employee Gifts")
   - **Occasion** (select: Diwali, Christmas, New Year, Employee Anniversary, Client Appreciation, Onboarding, Festival, Custom)
   - **Budget** (required — total campaign budget in INR)
   - **Delivery Window** — Start date and end date for gift deliveries
   - **Description** (optional — internal notes about the campaign)
   - **Gift Wrapping** — Select: Standard, Custom Branded (see SOP-CRP-002), None
   - **Greeting Message** — Default message for all gifts (can be customized per recipient)
4. **Select Products:**
   - Browse the product catalog or search for specific items
   - Add products to the campaign by clicking **"Add to Campaign"**
   - Set quantity per product (total units needed across all recipients)
   - Review total product cost vs. budget
5. **Assign Recipients:**
   - Select recipients from the Recipients list
   - Or assign all recipients in the corporate account
   - Allocate individual budgets (if not already set — see SOP-CRP-004)
   - Assign specific products to specific recipients (optional — default is all recipients receive the same products)
6. **Review Campaign Summary:**
   - Campaign name, occasion, budget
   - Product list with quantities and costs
   - Recipient count and total delivery addresses
   - Estimated total cost (products + packaging + shipping)
   - Budget utilization (percentage of budget consumed)
7. Save as **Draft** or click **"Submit for Approval"** (see SOP-CRP-006)

**Expected Outcome:**
- Campaign is created with all required details
- Products and recipients are assigned within the budget
- Campaign is saved as a draft for further editing or submitted for admin approval

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Budget exceeded" warning | Product costs + packaging + shipping > campaign budget | Reduce product quantities, select lower-cost products, or increase campaign budget |
| Cannot add products | No products in catalog or catalog not loaded | Refresh the page; ensure admin has added products to the catalog |
| Recipient count showing zero | No recipients added to the corporate account | Add recipients first (see SOP-CRP-004) |

**Related SOPs:** SOP-CRP-004 (Recipient Management), SOP-CRP-006 (Campaign Submission), SOP-ADM-007 (Campaign Management)

---

## SOP-CRP-006: Campaign Submission & Tracking

**Objective:** Submit a corporate campaign for admin approval and track its progress through execution and delivery.

**Prerequisites:**
- Corporate campaign in "draft" status with all details complete
- Campaign manager or corporate admin role

**Steps:**

1. Navigate to **Campaigns** in the Corporate Dashboard
2. Find the draft campaign and open it
3. Review all details one final time: name, occasion, budget, products, recipients, delivery window
4. Click **"Submit for Approval"**
5. Campaign status changes from `draft` to `submitted`
6. Admin receives a notification and reviews the campaign (see SOP-ADM-007)
7. **Possible Admin Actions:**
   - **Approve** — Campaign moves to `in_progress`; orders are created for each recipient
   - **Request Changes** — Campaign reverts to `draft` with admin feedback; corporate user must make changes and resubmit
   - **Reject** — Campaign is cancelled; corporate user is notified with the reason
8. **Track Campaign Progress:**
   - View the campaign dashboard showing:
     - Total recipients vs. gifts delivered vs. gifts pending
     - Budget utilization (spent vs. allocated)
     - Delivery status per recipient (Pending, Shipped, Delivered, Failed)
   - Click a recipient to view their specific order tracking details
9. **After Campaign Completion:**
   - Campaign status moves to `completed` when all gifts are delivered
   - Final invoice is generated (see SOP-CRP-008)

**Expected Outcome:**
- Campaign is submitted and processed within 24 hours of submission
- Delivery progress is tracked per recipient
- Corporate user has full visibility into campaign execution

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Campaign stuck in "submitted" | Admin has not yet reviewed | SLA is 24 hours; contact support if delayed beyond that |
| Some deliveries showing "Failed" | Invalid address or delivery not serviceable | Update the recipient's address; contact support for re-delivery |
| Campaign reverted to "draft" | Admin requested changes | Review admin feedback, make required changes, and resubmit |

**Related SOPs:** SOP-CRP-005 (Campaign Creation), SOP-CRP-008 (Order History & Invoicing), SOP-ADM-007 (Campaign Management)

---

## SOP-CRP-007: Corporate Dashboard Navigation

**Objective:** Familiarize corporate users with the Corporate Dashboard layout, navigation, and key features.

**Prerequisites:**
- Approved corporate account
- Corporate admin, finance_user, or campaign_manager role

**Steps:**

1. Log in to the Corporate Dashboard at 3boxes.in with corporate credentials
2. The dashboard home displays:
   - **Active Campaigns** — Count and status overview
   - **Budget Overview** — Total allocated, spent, remaining
   - **Pending Deliveries** — Gifts awaiting shipment or delivery
   - **Recent Activity** — Latest campaign updates and deliveries
3. Left sidebar navigation:
   - **Dashboard** (home with KPIs)
   - **Campaigns** — Create and manage gifting campaigns
   - **Recipients** — Manage gift recipients
   - **Team** — Manage corporate team members
   - **Branding** — Configure logo, colors, packaging
   - **Orders** — View order history and invoices
   - **Profile** — Company information and settings
4. Role-based access:
   - `corporate_admin` — Full access to all modules
   - `finance_user` — Budget, orders, invoices only
   - `campaign_manager` — Campaigns, recipients, orders only

**Expected Outcome:**
- Corporate user can navigate to any module within 2 clicks
- Dashboard provides at-a-glance visibility into campaign and budget status

**Related SOPs:** SOP-CRP-001 (Corporate Registration), SOP-CRP-002 (Branding Setup)

---

## SOP-CRP-008: Order History & Invoicing

**Objective:** View corporate order history, download invoices, and manage payment records for all corporate gifting campaigns.

**Prerequisites:**
- Approved corporate account
- Corporate admin or finance_user role
- At least one completed or in-progress campaign

**Steps:**

1. Navigate to **Orders** in the Corporate Dashboard
2. View all orders associated with corporate campaigns:
   - Order #, Campaign Name, Recipient, Status, Total, Date
3. Filter by: Campaign, Status (Pending, Processing, Shipped, Delivered, Cancelled), Date Range
4. Click an order to view details:
   - Recipient name and delivery address
   - Products ordered with quantities and prices
   - Tracking information
   - Payment status
5. **Invoices:**
   - Navigate to **Orders** > **Invoices** sub-tab
   - View all invoices with: Invoice #, Campaign, Amount, Tax, Total, Status, Date
   - Click **"Download PDF"** to save the invoice
   - Click **"Email Invoice"** to send a copy to the corporate admin email
6. **Payment Summary:**
   - View total amount spent, pending, and credit limit remaining
   - Payment history with transaction references
   - Outstanding balances (if any)

**Expected Outcome:**
- Complete order and invoice history is accessible
- Invoices can be downloaded and emailed for accounting purposes
- Payment records are accurate and up-to-date

**Troubleshooting:**

| Issue | Cause | Resolution |
|-------|-------|------------|
| Invoice not generated | Campaign not yet completed or admin has not generated invoices | Invoices are auto-generated upon campaign completion; contact support if delayed |
| Invoice amount discrepancy | Tax calculation or packaging charges not reflected | Verify with the order details; contact support for correction |

**Related SOPs:** SOP-CRP-006 (Campaign Tracking), SOP-ADM-004 (Order Management)

---

# 6. Cross-Role SOPs & Escalation Matrix

## Escalation Matrix

| Severity | Examples | Response Time | Escalation Path |
|----------|----------|---------------|-----------------|
| **P1 — Critical** | Platform down, payment gateway failure, data breach, security incident | < 15 min | Agent → Super Admin → CTO → Legal (if breach) |
| **P2 — High** | Order processing failure, bulk email failure, refund > ₹5,000 | < 1 hour | Agent → Admin → Super Admin → Engineering Lead |
| **P3 — Medium** | Single user locked out, product import error, campaign review | < 4 hours | Agent → Admin → Super Admin |
| **P4 — Low** | UI bug, minor content update, report formatting, feature suggestion | < 24 hours | Agent → Admin → Product Manager |

## Cross-Role Dependencies

| Process | Initiator | Approver | Executor |
|---------|-----------|----------|----------|
| User account approval | Customer (registers) | Admin (approves) | System (activates) |
| Corporate account approval | Corporate User (applies) | Admin (approves) | System (activates) |
| Campaign approval | Corporate User (submits) | Admin (approves) | System (creates orders) |
| Refund > ₹5,000 | Agent (escalates) | Admin (approves) | System (processes) |
| Product catalog update | Team Member (updates) | Admin (reviews) | System (publishes) |
| SMTP configuration | Super Admin (configures) | — | System (applies) |
| Permission changes | Super Admin (modifies) | — | System (enforces) |

## Incident Response Flow

1. **Detection** — Issue is detected via monitoring, customer report, or agent escalation
2. **Classification** — Severity is assigned based on the escalation matrix above
3. **Notification** — Relevant personnel are notified per the escalation path
4. **Containment** — Immediate actions to prevent further impact (e.g., disable broken feature, switch to fallback)
5. **Resolution** — Root cause is identified and fix is deployed
6. **Communication** — Affected customers are notified of the resolution
7. **Post-Mortem** — Incident is documented with timeline, root cause, and prevention measures
8. **SOP Update** — If the incident reveals a gap in existing SOPs, the relevant SOP is updated

---

# 7. Appendix: Glossary & Reference

## Glossary

| Term | Definition |
|------|------------|
| **3Box Curate** | Feature allowing users to bundle 3+ products into a curated gift box |
| **AI Virtual Try-On** | AI-powered feature that generates a preview image of a product on a user's selfie |
| **Affiliate URL** | External product link with a referral code for commission tracking |
| **Approval Status** | Account lifecycle status: pending, approved, rejected, suspended |
| **Campaign** | Corporate gifting initiative with defined budget, products, and recipients |
| **Category Map** | Mapping between external platform categories and internal 3Boxes categories |
| **Corporate Credit** | Pre-approved spending limit for corporate accounts |
| **GST** | Goods and Services Tax (Indian tax system) |
| **InventoryLog** | Database record tracking stock movements (in, out, adjustment, return) |
| **OTP** | One-Time Password (sent via SMS or email for verification) |
| **PaymentSession** | Database record tracking payment gateway transactions |
| **Reorder Level** | Stock threshold that triggers a low-stock alert |
| **Slug** | URL-friendly version of a name (lowercase, hyphens, no special characters) |
| **SMTP** | Simple Mail Transfer Protocol — used for sending transactional emails |
| **Stock Status** | Product availability: in_stock, low_stock, out_of_stock, preorder |
| **Style Preview** | Another name for AI Virtual Try-On |
| **TOTP** | Time-based One-Time Password — standard 2FA method using authenticator apps |
| **WishlistItem** | Database record linking a user to a saved product |

## API Endpoint Reference (Quick Reference)

| Endpoint | Method | Purpose | Role |
|----------|--------|---------|------|
| `/api/auth/login` | POST | User login | All |
| `/api/auth/otp/send` | POST | Send phone OTP | All |
| `/api/auth/2fa/verify` | POST | Verify 2FA code | All |
| `/api/products` | GET | List products | All |
| `/api/products/[id]` | GET | Product detail | All |
| `/api/cart` | GET/POST | Cart management | Customer |
| `/api/checkout` | POST | Place order | Customer |
| `/api/orders` | GET | Order history | Customer, Admin |
| `/api/orders/[id]/tracking` | GET | Order tracking | Customer, Admin |
| `/api/orders/[id]/refund` | POST | Process refund | Admin |
| `/api/admin/products` | GET/POST | Product CRUD | Admin |
| `/api/admin/users` | GET/POST | User management | Admin |
| `/api/admin/corporate` | GET/POST | Corporate management | Admin |
| `/api/admin/campaigns` | GET/POST | Campaign management | Admin |
| `/api/admin/coupons` | GET/POST | Coupon management | Admin |
| `/api/admin/smtp` | GET/POST | SMTP configuration | Admin |
| `/api/admin/reports` | GET | Generate reports | Admin |
| `/api/admin/audit-logs` | GET | View audit logs | Admin |
| `/api/admin/permissions` | GET/POST | Permission management | Admin |
| `/api/support/tickets` | GET/POST | Support tickets | Agent |
| `/api/corporate/campaigns` | GET/POST | Corporate campaigns | Corporate |
| `/api/corporate/recipients` | GET/POST | Recipient management | Corporate |
| `/api/corporate/recipients/import-csv` | POST | CSV import | Corporate |
| `/api/currency/rates` | GET | Exchange rates | All |
| `/api/product-import/search` | GET | Search external platforms | Admin, Agent |

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Operations Team | Initial SOP document |
| 2.0 | March 2026 | Operations & Engineering | Comprehensive rewrite with SOP IDs, structured format, all roles, edge cases, and cross-references |

---

**End of Document**

*This document is the property of 3Boxes Luxury. Unauthorized distribution is prohibited. All personnel must acknowledge reading and understanding the SOPs relevant to their role before being granted system access.*
