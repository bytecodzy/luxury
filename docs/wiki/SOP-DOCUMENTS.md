# 3 BOXES LUXURY — Standard Operating Procedures (SOP)

**Version:** 1.0
**Last Updated:** March 2026
**Authors:** 3 BOXES Operations Team
**Classification:** Internal — All Roles

---

## Table of Contents

1. [Admin SOP](#1-admin-sop)
2. [User SOP](#2-user-sop)
3. [Agent SOP](#3-agent-sop)
4. [Team SOP](#4-team-sop)
5. [Corporate SOP](#5-corporate-sop)

---

# 1. Admin SOP

## 1.1 Role Overview and Responsibilities

The **Admin** role is the highest-privilege role in the 3 Boxes Luxury platform. Admins manage the entire system including user accounts, product catalog, order processing, content, training materials, and system configuration.

**Admin Sub-Roles:**

| Sub-Role | Scope |
|----------|-------|
| `super_admin` | Full system access — all modules, user management, system config |
| `product_manager` | Product catalog, categories, inventory, imports |
| `order_manager` | Order processing, fulfillment, refunds, shipping |
| `inventory_manager` | Stock levels, reorder alerts, inventory logs |
| `finance_manager` | Invoicing, accounting entries, payment reconciliation |
| `support_agent` | Support tickets, user escalations, refund approvals |
| `corporate_account_manager` | Corporate account approvals, campaign oversight |

**Primary Responsibilities:**
- Manage user accounts (create, approve, suspend, delete)
- Maintain product catalog (add, edit, remove, import products)
- Process and fulfill customer orders
- Manage content, wiki documents, and training materials
- Configure system settings (SMTP, roles, permissions)
- Generate and review reports
- Oversee corporate accounts and campaigns
- Monitor system health and audit logs

---

## 1.2 Daily/Weekly/Monthly Task Checklists

### Daily Tasks
- [ ] Review new user registrations and approve/reject pending accounts
- [ ] Check for new orders requiring processing
- [ ] Monitor inventory alerts (low-stock and out-of-stock items)
- [ ] Review open support tickets (prioritize urgent and high-priority)
- [ ] Check corporate account approval requests
- [ ] Review audit logs for suspicious activity
- [ ] Verify payment status of pending orders

### Weekly Tasks
- [ ] Review product catalog for outdated or incorrect listings
- [ ] Run platform integration syncs (Myntra, Nykaa, CaratLane, etc.)
- [ ] Analyze sales report for trends
- [ ] Review and update training content as needed
- [ ] Check affiliate click stats and commission reports
- [ ] Review coupon usage and expiration dates
- [ ] Audit user permissions and role assignments

### Monthly Tasks
- [ ] Generate monthly sales and revenue report
- [ ] Review and update corporate account credit limits
- [ ] Perform full inventory audit and reconciliation
- [ ] Update system configuration as needed (SMTP, rate limits)
- [ ] Review and archive resolved support tickets
- [ ] Analyze AI Virtual Try-On accuracy metrics
- [ ] Review and update SOPs and workflow documentation
- [ ] Conduct security review (session cleanup, password policies)

---

## 1.3 Step-by-Step Procedures

### 1.3.1 User Management

#### Creating a New User
1. Navigate to **Admin Dashboard** > **Users** tab
2. Click **"Add User"** button in the top-right corner
3. Fill in required fields:
   - **Email** (required, must be unique)
   - **Name** (required)
   - **Role** (select from: admin, user, agent, team, corporate)
   - **Admin Sub-Role** (if role=admin, select from: super_admin, product_manager, order_manager, inventory_manager, finance_manager, support_agent, corporate_account_manager)
   - **Corporate Role** (if role=corporate, select from: corporate_admin, finance_user, campaign_manager)
4. Click **"Create User"** to save
5. The user receives an email with account setup instructions
6. New user `approvalStatus` defaults to `"pending"`
7. Navigate to the user's row and click **"Approve"** to activate the account

**Screenshot Placeholder:**
> Admin Users table showing columns: Name, Email, Role, Approval Status, 2FA Status, Last Login, Actions. Each row has Approve/Reject/Suspend buttons. An "Add User" modal is open with form fields for email, name, role selection dropdown, and admin/corporate sub-role dropdowns.

#### Approving a User Account
1. Navigate to **Admin Dashboard** > **Users** tab
2. Filter by `approvalStatus = "pending"`
3. Review user details (email, name, role requested)
4. Click **"Approve"** to activate or **"Reject"** to deny
5. If approving:
   - System sets `approvalStatus = "approved"` and `isActive = true`
   - User receives confirmation email
   - Audit log entry is created (`action: "approval_change"`)
6. If rejecting:
   - System sets `approvalStatus = "rejected"`
   - User receives rejection notification email

#### Suspending a User
1. Navigate to the user's row in the Users table
2. Click **"Suspend"** button
3. Enter a reason for suspension in the confirmation dialog
4. Confirm the action
5. System sets `isActive = false` and `approvalStatus = "suspended"`
6. All active sessions for the user are terminated
7. Audit log entry created with reason

#### Managing User Permissions
1. Navigate to **Admin Dashboard** > **Permissions** tab (or **Role Permissions** tab)
2. Select a user from the list
3. View current permissions (e.g., `products.manage`, `orders.manage`, `accounting.view`)
4. To add: Click **"Add Permission"**, select from dropdown, confirm
5. To remove: Click the **"X"** next to the permission
6. Changes take effect immediately on the user's next API request
7. Each permission is stored as a `UserPermission` record (unique per userId + permission)

---

### 1.3.2 Product Management

#### Adding a New Product Manually
1. Navigate to **Admin Dashboard** > **Products** tab
2. Click **"Add Product"** button
3. Fill in product details:
   - **Name** (required)
   - **Description** (required)
   - **Price** (required, in INR)
   - **Compare-at Price** (optional, for showing discounts)
   - **Cost Price** (optional, for margin calculation)
   - **SKU** (optional)
   - **Category** (select from dropdown)
   - **Stock Quantity** (default: 0)
   - **Reorder Level** (default: 5)
   - **Tags** (comma-separated JSON array)
   - **Occasions** (multi-select: birthday, anniversary, wedding, diwali, christmas, etc.)
   - **Recipient Types** (multi-select: him, her, couple, kids, parents, friend, colleague)
   - **Relationships** (multi-select: spouse, parent, sibling, friend, colleague, boss)
   - **Delivery Estimate** (e.g., "3-5 business days")
   - **Featured** (checkbox)
4. Upload product images (multiple allowed, first image is primary)
5. Add product variants if needed:
   - Click **"Add Variant"**
   - Enter variant name (e.g., "Gold Plated"), price, stock, attributes (JSON)
   - Upload variant-specific image (optional)
6. Click **"Create Product"** to save
7. System auto-generates `productNumber` and `slug`

**Screenshot Placeholder:**
> Admin Products form showing fields for product name, description (rich text editor), price input with INR symbol, category dropdown, stock quantity, image upload area with drag-and-drop zone, and a collapsible "Variants" section with variant rows. A "Create Product" button at the bottom with amber gradient styling.

#### Editing an Existing Product
1. Navigate to **Admin Dashboard** > **Products** tab
2. Search or filter to find the product
3. Click the product name or **"Edit"** icon
4. Modify any field as needed
5. Click **"Save Changes"** to update
6. System updates `updatedAt` timestamp automatically

#### Importing Products from External Platforms
1. Navigate to **Admin Dashboard** > **Partners** tab
2. Select the platform integration (Myntra, Nykaa, CaratLane, etc.)
3. Click **"Sync Now"** or **"Import Products"**
4. Alternatively, use the product import API:
   - **Search**: `GET /api/product-import/search?platform=myntra&query=sarees`
   - **Scrape**: `POST /api/product-import/scrape` with platform and category parameters
   - **Import**: `POST /api/product-import/import` with selected product IDs
5. Review imported products in the Products tab
6. Verify images, prices, and descriptions
7. Set category mappings if needed (Partners > Category Maps)

#### Managing Inventory
1. Navigate to **Admin Dashboard** > **Products** tab
2. Filter by `stockStatus` (in_stock, low_stock, out_of_stock, preorder)
3. For each product, update stock quantity:
   - Click **"Edit"** on the product
   - Update the **Stock** field
   - The `stockStatus` auto-updates based on `stock` vs `reorderLevel`
4. View inventory logs under **Products** > **Inventory Logs**
5. Log types: `in` (restock), `out` (sale), `adjustment` (correction), `return` (customer return)

---

### 1.3.3 Order Processing

#### Viewing and Processing Orders
1. Navigate to **Admin Dashboard** > **Orders** tab
2. Orders are listed with: Order #, Customer, Total, Status, Payment Status, Date
3. Click an order to view details:
   - Customer information (name, email, phone, address)
   - Order items (product, variant, quantity, price)
   - Payment details (method, status, session ID)
   - Tracking information (tracking number, URL, events)
   - Invoice details (if generated)
4. Update order status through the pipeline:
   - `pending` → `processing` → `shipped` → `delivered`
   - Or `pending` → `cancelled` (with reason)
5. Add tracking information when shipping:
   - Enter tracking number
   - Enter tracking URL
   - Enter estimated delivery date
6. Click **"Update Order"** to save changes

**Screenshot Placeholder:**
> Admin Order detail page showing customer info card (name, email, phone, shipping address), order items table with product thumbnails, an order timeline showing status transitions, a tracking information form with fields for tracking number and URL, and action buttons for "Process Order", "Ship Order", and "Cancel Order".

#### Processing Refunds
1. Navigate to the order detail page
2. If payment was successful (`paymentStatus = "paid"`), click **"Process Refund"**
3. Enter refund amount (defaults to order total)
4. Select refund reason
5. Confirm the refund
6. System creates a `PaymentSession` record with `status = "refunded"`
7. Order `refundStatus` set to `"processed"`, `refundAmount` and `refundedAt` recorded
8. If order had inventory deducted, stock is restored via `InventoryLog` with type `return`

#### Generating Invoices
1. Navigate to the order detail page
2. Click **"Generate Invoice"**
3. System creates an `OrderInvoice` record with:
   - Auto-generated `invoiceNumber`
   - Amount, tax, and total calculated from order
   - Status set to `"generated"`
4. PDF is generated and stored at `pdfUrl`
5. Click **"Send Invoice"** to email the invoice to the customer
6. Invoice status updates to `"sent"`

---

### 1.3.4 Content Management

#### Managing Wiki Documents
1. Navigate to **Admin Dashboard** > **Wiki** tab
2. View all documents with: Title, Category, Type, Access Roles, Status, Version
3. Click **"Create Document"** to add a new wiki page
4. Fill in:
   - **Title** (required)
   - **Slug** (auto-generated from title, editable)
   - **Content** (markdown editor)
   - **Category** (architecture, api, technical, general, sop, workflow, patent, training)
   - **Doc Type** (wiki, sop, workflow, patent, training, video)
   - **Access Roles** (comma-separated: admin, team, agent, user, corporate)
   - **Is Published** (checkbox)
5. Click **"Save"** to create or **"Publish"** to create and publish
6. Version number defaults to `"1.0"`; increment manually when making major updates

#### Sharing Documents with Agents
1. Navigate to the wiki document detail page
2. Click **"Share with Agents"**
3. Select the agent(s) from the dropdown
4. Set permissions:
   - **Can Download** (default: true)
   - **Can Share** (default: false)
   - **Message** (optional note to the agent)
5. Click **"Share"** — creates `AgentDocShare` records
6. Agents receive a notification and can access the document from their dashboard

#### Sharing Training Content
1. Navigate to the wiki document detail page
2. Click **"Share as Training"**
3. Select target:
   - **Target Role** (admin, team, agent, user, corporate)
   - **Target User** (optional — leave empty for all users of that role)
4. Set permissions:
   - **Can Download** (default: true)
   - **Can View** (default: true)
5. Click **"Share"** — creates `TrainingShare` records
6. Shared training content appears in the recipients' dashboard

---

### 1.3.5 Report Generation

#### Generating Sales Reports
1. Navigate to **Admin Dashboard** > **Reports** tab
2. Select report type:
   - **Sales Summary**: Revenue, orders, average order value by period
   - **Product Performance**: Best sellers, lowest sellers, inventory turns
   - **Customer Analytics**: Registration trends, repeat purchase rate
   - **Corporate Gifting**: Campaign status, budget utilization
   - **AI Try-On Metrics**: Usage count, average accuracy scores, strategy distribution
3. Set date range (preset: today, this week, this month, this quarter, custom)
4. Click **"Generate Report"**
5. Report renders as an interactive table/charts in the dashboard
6. Click **"Export CSV"** or **"Export PDF"** to download

#### Viewing Dashboard Statistics
1. Navigate to **Admin Dashboard** > **Dashboard** tab (home)
2. Key metrics displayed:
   - Total revenue (today, this week, this month)
   - Orders count by status (pending, processing, shipped, delivered)
   - Low stock alerts count
   - Active users count
   - Pending corporate approvals
   - Support tickets by priority
3. Charts update in real-time based on database queries

---

### 1.3.6 System Configuration

#### Configuring SMTP Settings
1. Navigate to **Admin Dashboard** > **SMTP** tab
2. Enter SMTP credentials:
   - **Host** (e.g., smtp.gmail.com)
   - **Port** (e.g., 587)
   - **Username** (email address)
   - **Password** (app-specific password)
   - **From Email** (sender address)
   - **From Name** (e.g., "3 Boxes Luxury")
3. Click **"Test Connection"** to verify
4. Click **"Save"** to update configuration

#### Managing Role Permissions
1. Navigate to **Admin Dashboard** > **Role Permissions** tab
2. View default permissions per role
3. Modify role-level permissions as needed
4. Changes affect all users with that role on next request

#### Viewing Audit Logs
1. Navigate to **Admin Dashboard** > **Audit Logs** tab
2. Filter by:
   - **Action type** (login, logout, password_change, role_change, approval_change, mfa_setup)
   - **Entity** (user, order, product, corporate, campaign)
   - **Date range**
   - **User**
3. Each log entry shows: timestamp, user, action, entity, details, IP address, user agent

---

## 1.4 Troubleshooting Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| User cannot log in | Account not approved or suspended | Check `approvalStatus` and `isActive` in Users tab; approve or reactivate |
| Product not appearing in search | Missing category or `isActive=false` | Verify product has a valid category and stock > 0 |
| Order stuck in "pending" | Payment not verified | Check PaymentSession status; if paid, manually update order status |
| 2FA setup failing | Time drift on TOTP app | Ensure device time is auto-synced; use email OTP fallback |
| Email not sending | SMTP misconfigured | Test SMTP connection in Settings; verify credentials |
| Corporate campaign not submitting | Account not approved | Check CorporateAccount `approvalStatus`; approve if pending |
| Product import fails | Platform API timeout | Retry sync; check integration `lastSyncError` in Partners tab |
| Inventory discrepancy | Manual stock adjustment needed | Use inventory log to add adjustment entry; reconcile with physical count |

---

## 1.5 Escalation Procedures

| Severity | Issue Examples | Response Time | Escalation Path |
|----------|---------------|---------------|-----------------|
| **P1 — Critical** | Platform down, payment failures, data breach | < 15 min | Super Admin → CTO → Legal (if breach) |
| **P2 — High** | Order processing failure, bulk email failure | < 1 hour | Super Admin → Engineering Lead |
| **P3 — Medium** | Single user locked out, product import error | < 4 hours | Admin → Super Admin |
| **P4 — Low** | UI bug, minor content update, report formatting | < 24 hours | Admin → Product Manager |

---

## 1.6 Performance Metrics / KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| User approval turnaround | < 4 hours | Time from registration to approval |
| Order processing time | < 2 hours | Time from payment to "processing" status |
| Support ticket response | < 2 hours (P1/P2), < 8 hours (P3/P4) | First response time |
| Inventory accuracy | > 98% | Physical vs system stock match |
| Corporate account approval | < 24 hours | Time from application to decision |
| Product catalog freshness | > 95% | Products with images, descriptions, and valid pricing |
| System uptime | > 99.5% | Monthly availability |
| Email delivery rate | > 98% | Successful SMTP deliveries |

---

---

# 2. User SOP

## 2.1 Role Overview and Responsibilities

The **User** role represents individual customers who browse, discover, and purchase luxury products on the 3 Boxes Luxury platform. Users interact with the storefront, AI features, and shopping tools.

**Primary Responsibilities:**
- Maintain an active account with verified email
- Browse and discover products using search, filters, and categories
- Use AI Virtual Try-On to preview products before purchase
- Manage shopping cart and complete checkout
- Track orders and request returns when needed
- Leave reviews and maintain wishlist
- Use Family Shopping and Gift Builder features
- Engage with 3Box Curate and Social Style features

---

## 2.2 Daily/Weekly/Monthly Task Checklists

### Daily Tasks (as needed)
- [ ] Check for new product arrivals in favorite categories
- [ ] Review and manage wishlist items
- [ ] Check order tracking updates
- [ ] Browse personalized recommendations

### Weekly Tasks
- [ ] Review new AI Style Preview results and share favorites
- [ ] Check for promotional offers and coupons
- [ ] Update profile information if changed
- [ ] Review saved items and move to cart or remove

### Monthly Tasks
- [ ] Update shipping addresses and payment methods
- [ ] Review order history and leave reviews for purchases
- [ ] Check Family Shopping occasions for upcoming events
- [ ] Update style preferences and Social Style connections

---

## 2.3 Step-by-Step Procedures

### 2.3.1 Registration

#### Creating a New Account
1. Navigate to the 3 Boxes Luxury homepage
2. Click **"Sign Up"** or **"Register"** in the header
3. Fill in registration form:
   - **Email Address** (required, must be unique)
   - **Full Name** (required)
   - **Password** (minimum 8 characters, must include uppercase, lowercase, number, and special character)
   - **Confirm Password**
4. Optionally sign up with social providers:
   - **Google** — Click "Sign up with Google" button
   - **Facebook** — Click "Sign up with Facebook" button
   - **LinkedIn** — Click "Sign up with LinkedIn" button
5. Click **"Create Account"**
6. System creates User record with:
   - `approvalStatus = "pending"`
   - `emailVerified = false`
   - `twoFactorEnabled = false`
7. Verification email is sent to the provided address

**Screenshot Placeholder:**
> Registration modal dialog on a dark-themed page with amber accents. Form fields for email (with envelope icon), full name, password (with eye toggle for visibility), confirm password. Below the form, social login buttons for Google, Facebook, and LinkedIn with their respective logos. A "Create Account" button with amber gradient at the bottom. Below that, a link "Already have an account? Sign in".

#### Email Verification
1. Check email inbox for verification message from 3 Boxes Luxury
2. Click the verification link in the email
3. Link contains a `emailVerifyToken` that expires after 24 hours
4. On successful verification:
   - `emailVerified = true`
   - `emailVerifyToken` is cleared
   - User is redirected to the login page with success message
5. If link expired: Click **"Resend Verification"** on the login page

---

### 2.3.2 Login with 2FA

#### Standard Login
1. Click **"Sign In"** in the header
2. Enter email and password
3. Click **"Log In"**
4. If 2FA is enabled, proceed to 2FA verification step
5. If 2FA is not enabled, user is authenticated and session is created

#### 2FA Setup
1. After logging in, navigate to **Profile** > **Security**
2. Click **"Enable Two-Factor Authentication"**
3. Choose method:
   - **Authenticator App (TOTP)** — Scan QR code with Google Authenticator, Authy, or similar
   - **Email OTP** — Receive one-time codes via email for each login
4. If TOTP: Scan the QR code, then enter the 6-digit code to verify setup
5. System sets `twoFactorEnabled = true` and stores `twoFactorSecret`
6. **Important:** Save backup codes shown during setup in a secure location

#### 2FA Verification During Login
1. After entering email and password, the 2FA prompt appears
2. **For TOTP**: Open authenticator app, enter the current 6-digit code
   - Code refreshes every 30 seconds
   - If code expired, wait for next code
3. **For Email OTP**: Click **"Send Code"** to receive a code via email
   - Code is valid for 5 minutes
   - Check spam/junk folder if not received
4. Enter the 6-digit code in the verification field
5. Click **"Verify"**
6. On success: Session is created, user is redirected to dashboard/homepage
7. On failure (3 incorrect attempts): Account is temporarily locked for 15 minutes

**Screenshot Placeholder:**
> 2FA verification screen showing a centered card with a shield icon. A 6-digit OTP input field with individual boxes for each digit. Below the input, two tabs: "Authenticator App" (active, showing TOTP input) and "Email OTP" (showing "Send Code" button). A "Verify" button with amber gradient at the bottom. A "Trouble logging in?" link below.

---

### 2.3.3 Browsing and Searching

#### Browsing Products
1. From the homepage, browse by:
   - **Category Grid** — Click a category tile (Jewelry, Sarees, Watches, Fashion, Men's Shirts, Leather Goods, Fragrances, Home & Living)
   - **Featured Products** — Scroll to see curated selections
   - **Occasion** — Select an occasion (Birthday, Anniversary, Wedding, Diwali, Christmas)
2. Product grid displays: product image, name, price, category badge, rating
3. Use pagination or infinite scroll to browse more products

#### Searching for Products
1. Click the **search icon** in the header or press `/` keyboard shortcut
2. Type search query (e.g., "ruby necklace", "silk saree")
3. Search runs against product name, description, and tags
4. Results display with relevance ranking
5. Use filters to narrow results:
   - **Category** (multi-select)
   - **Price Range** (min-max slider)
   - **Rating** (4+, 3+, 2+)
   - **Occasion** (multi-select)
   - **Recipient Type** (him, her, couple, kids)
   - **In Stock Only** (checkbox)
6. Sort results by: Relevance, Price (low-high), Price (high-low), Rating, Newest

**Screenshot Placeholder:**
> Search results page with a search bar at the top showing "ruby necklace" query. Left sidebar with filter options: Category checkboxes (Jewelry checked, Fashion unchecked), Price range slider, Rating filter, Occasion dropdown. Main area shows a 4-column grid of jewelry product cards with images, names, prices, and "Add to Cart" buttons. A sort dropdown in the top-right shows "Relevance" selected.

---

### 2.3.4 AI Virtual Try-On

#### Using Virtual Try-On
1. Navigate to any product detail page
2. Click the **"Style Preview"** button (sparkles icon, amber gradient)
3. In the TryOnDialog:
   - **Step 1 — Upload**: Upload a selfie (JPG, PNG, WebP, max 10MB)
   - **Step 2 — Preview**: Review your selfie and the product; click "Create Preview"
   - **Step 3 — Generating**: Wait 30-60 seconds while AI processes
   - **Step 4 — Result**: View the AI-generated image with accuracy scores
4. Actions on the result:
   - **Save Image** — Downloads the watermarked result as PNG
   - **Try Again** — Resets to upload step
   - **Share to Gallery** — If consent is given, submit to influencer gallery
   - **View Suggestions** — See AI-recommended complementary products

**Screenshot Placeholder:**
> Virtual Try-On result screen showing a full-size AI-generated image of a person wearing a gold necklace. Top-left corner has a green "Style Preview" badge. Below the image, accuracy scores: "Color 8/10" (green badge), "Face 9/10" (green badge), "Overall 8/10" (green badge). A "Complete Your Look" section shows 4 complementary product suggestion cards. Bottom buttons: "Try Again" (outline), "Save Image" (amber filled), "Share to Gallery" (outline with share icon).

---

### 2.3.5 Social Style Integration

#### Connecting Social Platforms
1. Navigate to **Profile** > **Style Preferences** > **Social Style**
2. Click **"Connect Platform"**
3. Select a platform (Myntra, Nykaa, Amazon, or others)
4. Authorize access via OAuth or login
5. Grant consent for data import (style history, preferences, purchases)
6. System imports style data and analyzes with AI
7. A **Style Profile** is generated based on:
   - Color preferences
   - Category affinities
   - Price range preferences
   - Occasion patterns
8. Personalized recommendations appear on homepage and product pages

---

### 2.3.6 3Box Curate

#### Creating a 3Box Curate Bundle
1. Navigate to the **3Box Curate** section from the homepage
2. Browse curated portals by occasion, theme, or category
3. Add items to your 3Box bundle:
   - Click **"Add to Box"** on individual products
   - System validates that at least 3 items are selected (3Box requirement)
4. Review your 3Box bundle:
   - See all selected items with images and prices
   - Estimated delivery and packaging preview
5. Click **"AI Curation Consent"** to allow AI to suggest optimal arrangement
6. Click **"Proceed to Purchase"**
7. Complete checkout with standard payment flow
8. 3Box package is assembled and shipped as a single curated gift box

**Screenshot Placeholder:**
> 3Box Curate page showing a themed portal "Wedding Collection" with a grid of products. A sidebar "Your Box" shows 3 selected items: a necklace, a saree, and a watch. A validation badge reads "3Box Complete - Ready to Purchase!" in green. An "AI Curation" toggle is enabled with a note "AI will optimize your gift arrangement." A "Proceed to Purchase" button is highlighted at the bottom of the sidebar.

---

### 2.3.7 Family Shopping

#### Using Family Shopping
1. Navigate to **Family Shopping** from the homepage
2. Select an **occasion** (Birthday, Anniversary, Wedding, Festival, Housewarming, etc.)
3. Add **family members**:
   - Enter name, relationship (spouse, parent, child, sibling), age range
   - Add preferences (optional: style, color, size)
4. Click **"Generate Packages"**
5. AI generates personalized gift packages for each family member
6. Review suggested packages:
   - Each package shows: recipient name, products, total price, match score
7. Select a package or customize:
   - Swap individual products within a package
   - Adjust quantities
   - Add greeting messages
8. Click **"Add to Cart"** to add selected packages

**Screenshot Placeholder:**
> Family Shopping page with an occasion selector at the top showing "Diwali" selected. Below, a "Family Members" section with cards for each member: "Priya (Spouse)" with a pink avatar, "Rahul (Child, 8yrs)" with a blue avatar, "Mom (Parent)" with a gold avatar. Below, generated packages are shown as expandable cards, each containing product thumbnails, a match percentage badge ("95% Match"), and an "Add to Cart" button.

---

### 2.3.8 Cart and Checkout

#### Managing Cart
1. Add products to cart from product cards or detail pages
2. Navigate to **Cart** via the cart icon in the header
3. Cart shows: product image, name, variant, quantity, price, subtotal
4. For each item, you can:
   - Change quantity (increments/decrements)
   - Select a variant (if available)
   - Toggle **gift wrapping** (adds gift wrap charge)
   - Add **greeting message** (free text)
   - Toggle **hide price** (for gift orders)
   - Remove item
5. Apply coupon code if available
6. View subtotal, shipping estimate, tax, discount, and total

#### Checkout Process
1. From cart, click **"Proceed to Checkout"**
2. Enter or select shipping address:
   - First Name, Last Name
   - Address Line
   - City, State, ZIP Code
   - Country (auto-detected based on geo)
   - Phone Number
3. Select delivery type:
   - **Standard** (3-5 business days)
   - **Express** (1-2 business days)
   - **Same-Day** (select cities only)
   - **Scheduled** (pick a date)
4. Select payment method:
   - **Card** (Credit/Debit)
   - **UPI**
   - **Net Banking**
   - **Wallet**
5. Click **"Place Order"**
6. Payment gateway (Razorpay/Stripe) processes the payment
7. On success: Order is created with `status = "pending"`, `paymentStatus = "paid"`
8. Order confirmation page displays with order number

**Screenshot Placeholder:**
> Checkout page with a two-column layout. Left column: Shipping Address form (auto-filled for returning users), Delivery Type radio buttons, Payment Method selection with card icons. Right column: Order Summary showing items, subtotal, shipping, tax, discount (if coupon applied), and total in large amber text. A "Place Order" button with amber gradient at the bottom. A secure payment badge and SSL icon are shown near the payment section.

---

### 2.3.9 Order Tracking

1. Navigate to **My Orders** from the user dashboard or profile menu
2. View order list with: Order #, Date, Status, Total, Tracking
3. Click an order to view details:
   - Order timeline with status milestones
   - Tracking events (picked up, in transit, out for delivery, delivered)
   - Estimated delivery date
   - Delivery address
4. For corporate orders, tracking is available via the corporate dashboard

---

### 2.3.10 Wishlist Management

1. Click the **heart icon** on any product card or detail page to add to wishlist
2. Navigate to **Wishlist** via the heart icon in the header
3. View all saved items with product image, name, price, and stock status
4. Actions:
   - **Add to Cart** — Move item from wishlist to cart
   - **Remove** — Delete from wishlist
   - **Share** — Generate a shareable link to your wishlist
5. Wishlist items are stored as `WishlistItem` records (unique per userId + productId)

---

### 2.3.11 Writing Reviews

1. Navigate to **My Orders** and find a delivered order
2. Click **"Write Review"** on the order or product
3. Fill in review form:
   - **Rating** (1-5 stars, required)
   - **Title** (optional, e.g., "Beautiful necklace!")
   - **Comment** (required, minimum 10 characters)
4. If you have an AI Style Preview for this product, you can attach it
5. Click **"Submit Review"**
6. Review is created with `verified = false` until admin verifies purchase
7. Reviews appear on the product detail page after verification

---

## 2.4 Troubleshooting Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Cannot register | Email already exists | Use "Forgot Password" to recover existing account |
| Email verification not received | Spam filter or wrong email | Check spam; click "Resend Verification" |
| 2FA code not accepted | Time drift or expired code | Sync device time; use fresh code; try email OTP fallback |
| Virtual Try-On shows error | AI service unavailable | System falls back to canvas overlay; retry later for AI result |
| Payment failed | Insufficient funds, network issue | Try different payment method; check with bank |
| Order not showing | Payment not completed | Check payment status; contact support if debited |
| Wishlist item out of stock | Product inventory depleted | Enable "Notify me" for restock alert |
| Coupon not applying | Expired, minimum not met, usage limit | Check coupon terms and conditions |

---

## 2.5 Escalation Procedures

| Issue | First Step | Escalation |
|-------|-----------|------------|
| Payment debited but order not created | Wait 5 min, refresh orders | Contact support with payment reference |
| Product received damaged | Take photos, initiate return | Support ticket → Admin review |
| Virtual Try-On consistently poor results | Try different selfie angle/lighting | Submit feedback → Team review |
| Account locked (3 failed 2FA attempts) | Wait 15 minutes, try again | Contact support for manual unlock |
| Refund not received | Check bank statement (5-7 business days) | Support ticket → Finance team |

---

## 2.6 Performance Metrics / KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Registration completion rate | > 80% | Started registrations vs completed |
| Time to first purchase | < 7 days | Registration date vs first order date |
| Virtual Try-On usage | > 30% of product views | Try-on initiations / product detail views |
| Cart abandonment rate | < 60% | Carts created vs orders placed |
| Repeat purchase rate | > 25% | Users with 2+ orders / total users |
| Review submission rate | > 15% | Reviews / delivered orders |
| Average wishlist size | 3-8 items | Mean items per user wishlist |

---

---

# 3. Agent SOP

## 3.1 Role Overview and Responsibilities

The **Agent** role represents customer support agents and affiliate managers who assist customers, manage support tickets, handle affiliate operations, and import products from external platforms.

**Primary Responsibilities:**
- Access shared documents and training materials
- Provide customer support via ticket system
- Manage affiliate links and track commissions
- Import products from external partner platforms
- Escalate complex issues to admins

---

## 3.2 Daily/Weekly/Monthly Task Checklists

### Daily Tasks
- [ ] Review and respond to new support tickets
- [ ] Check shared documents for updates
- [ ] Review affiliate click stats and flag anomalies
- [ ] Process pending product import requests
- [ ] Update ticket statuses as issues are resolved

### Weekly Tasks
- [ ] Review training content updates
- [ ] Generate weekly affiliate performance report
- [ ] Audit support ticket response times
- [ ] Check for expired or broken affiliate links
- [ ] Sync product imports from assigned platforms

### Monthly Tasks
- [ ] Review customer satisfaction scores
- [ ] Update knowledge base articles based on recurring issues
- [ ] Analyze product import quality and accuracy
- [ ] Submit monthly support summary to admin

---

## 3.3 Step-by-Step Procedures

### 3.3.1 Document Access

#### Viewing Shared Documents
1. Log in to the Agent Dashboard
2. Navigate to **Documents** tab in the left sidebar
3. View list of documents shared with you:
   - Document title, category, type, version
   - Shared by (admin name), date shared
   - Download permission indicator
4. Click a document to view its content
5. If **Can Download** is enabled, click **"Download"** to save locally
6. If **Can Share** is disabled, you cannot forward the document to others

#### Accessing Training Materials
1. Navigate to **Training** tab in the Agent Dashboard
2. View training content shared with your role
3. Filter by:
   - **Category** (architecture, api, technical, general, sop, workflow, training, video)
   - **Doc Type** (wiki, sop, workflow, training, video)
4. Click to open and view training content
5. Complete any required acknowledgment or quiz if applicable

**Screenshot Placeholder:**
> Agent Dashboard showing a two-panel layout. Left sidebar has navigation items: Dashboard, Documents, Training, Support Tickets, Affiliates, Product Import. Main area shows the "Documents" tab with a list of shared documents: each row has a document icon, title, category badge, version number, shared-by name, and a download button. A search bar at the top filters documents.

---

### 3.3.2 Customer Support Procedures

#### Handling a Support Ticket
1. Navigate to **Support Tickets** tab
2. View ticket list sorted by priority (urgent first, then high, medium, low)
3. Click a ticket to open it
4. Review:
   - **Subject** and **Description**
   - **User information** (name, email, order history)
   - **Priority level** and **Status** (open, in_progress, resolved, closed)
   - **Message thread** with timestamps
5. Click **"Reply"** to respond to the customer
6. Type your message in the rich text editor
7. Optionally attach files (screenshots, invoices, etc.)
8. Click **"Send Reply"**
9. Ticket status auto-updates to `"in_progress"` if it was `"open"`
10. After resolution:
    - Click **"Mark Resolved"** — status changes to `"resolved"`
    - Customer receives notification and can confirm or reopen
11. If customer confirms resolution, status moves to `"closed"`

#### Escalating a Ticket
1. While viewing a ticket, click **"Escalate"** button
2. Select escalation reason:
   - **Technical Issue** — Requires engineering investigation
   - **Refund Over Limit** — Refund amount exceeds agent authorization
   - **Account Security** — Suspected unauthorized access
   - **Corporate Account** — Requires corporate account manager
3. Add notes explaining the escalation
4. Click **"Submit Escalation"**
5. Ticket priority is elevated (e.g., medium → high)
6. Admin or appropriate team is notified

#### Priority Classification Guide

| Priority | Criteria | Response Target |
|----------|----------|-----------------|
| **Urgent** | Payment failure, account breach, platform down | < 15 minutes |
| **High** | Order not delivered, product defect, refund needed | < 1 hour |
| **Medium** | Feature question, account settings, general inquiry | < 4 hours |
| **Low** | Feedback, suggestion, non-urgent request | < 24 hours |

**Screenshot Placeholder:**
> Support Ticket detail view showing the ticket subject "Order not received after 7 days" with a red "High Priority" badge. Below is the customer info card with name, email, and order history link. The message thread shows the customer's initial complaint and an agent's reply. A reply editor is open at the bottom with formatting toolbar, attachment button, and "Send Reply" button. An "Escalate" button is in the top-right with a dropdown for escalation reason.

---

### 3.3.3 Affiliate Management

#### Viewing Affiliate Statistics
1. Navigate to **Affiliates** tab in the Agent Dashboard
2. View affiliate dashboard with:
   - **Total Clicks** — Number of affiliate link clicks (by platform)
   - **Conversion Rate** — Clicks that resulted in purchases
   - **Commission Earned** — Total commission from affiliate sales
   - **Top Products** — Most clicked affiliate products
3. Filter by platform (Myntra, Nykaa, Amazon, CaratLane, etc.)
4. Filter by date range

#### Tracking Affiliate Clicks
1. When a user clicks an external product link:
   - System creates an `AffiliateClick` record
   - Records: productId, platform, sourceUrl, referralCode, ipAddress, userAgent, clickedAt
2. View individual click records in the **Click Log** sub-tab
3. Each click may result in a commission if the user completes a purchase on the partner platform

#### Managing Affiliate Links
1. Navigate to **Products** tab and filter by `isExternal = true`
2. View products with affiliate URLs
3. Verify affiliate URLs are valid and contain the correct referral codes
4. If a link is broken:
   - Contact the platform integration team
   - Update the `affiliateUrl` field in the product record
5. Monitor `commission` percentages and `lastSyncedAt` timestamps

---

### 3.3.4 Product Import

#### Searching for Products on External Platforms
1. Navigate to **Product Import** tab
2. Select **Search** sub-tab
3. Choose a platform (Myntra, Nykaa, CaratLane, Tanishq, Bluestone, Voylla, Flipkart, Amazon)
4. Enter search query (e.g., "gold necklace", "silk saree")
5. Click **"Search"**
6. API call: `GET /api/product-import/search?platform={platform}&query={query}`
7. Results show: product name, image, price, platform, availability
8. Select products to import by checking the checkbox

#### Importing Selected Products
1. After selecting products from search results, click **"Import Selected"**
2. Alternatively, use the scrape endpoint for bulk category imports:
   - `POST /api/product-import/scrape` with `{ platform, category, maxProducts }`
3. For individual imports:
   - `POST /api/product-import/import` with selected product data
4. System creates Product records with:
   - `isExternal = true`
   - `platform = "myntra"` (or selected platform)
   - `affiliateUrl` set to the external product URL
   - `sourceUrl` stored for future syncs
   - `syncStatus = "active"`
5. Verify imported products:
   - Check images loaded correctly
   - Verify prices and descriptions
   - Ensure category mapping is correct
6. If category mapping is needed:
   - Navigate to **Partners** > **Category Maps**
   - Map partner category to local category

**Screenshot Placeholder:**
> Product Import tab showing a search form at the top with platform dropdown ("Myntra" selected), search query input "gold necklace", and a "Search" button. Below, search results are shown as a grid of product cards from Myntra with external images, names, and prices. Each card has a checkbox for selection. A floating "Import Selected (3)" button appears at the bottom when products are checked. An import progress bar shows in a toast notification when import starts.

---

## 3.4 Troubleshooting Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Cannot access shared document | Access role not assigned | Request admin to update `accessRoles` on the document |
| Ticket response not sending | SMTP issue or user email bounce | Check SMTP settings; verify customer email |
| Product import shows 0 results | Platform API blocked or rate limited | Wait and retry; try different search terms; check integration status |
| Affiliate link not tracking | Missing referral code in URL | Verify `affiliateUrl` contains correct referral parameters |
| Cannot download document | `canDownload = false` | Request admin to update share permission |
| Customer cannot see reply | Ticket notification not delivered | Ask customer to check spam; manually send email |

---

## 3.5 Escalation Procedures

| Situation | Escalation Path |
|-----------|-----------------|
| Refund exceeding INR 5,000 | Agent → Admin (order_manager or finance_manager) |
| Suspected fraud or security breach | Agent → Super Admin immediately |
| Platform API integration failure | Agent → Admin → Engineering Team |
| Customer threatens legal action | Agent → Super Admin → Legal |
| Corporate account dispute | Agent → Admin (corporate_account_manager) |
| Product data quality issue (import) | Agent → Admin (product_manager) |

---

## 3.6 Performance Metrics / KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| First response time | < 2 hours | Time from ticket creation to first agent reply |
| Ticket resolution time | < 24 hours (P3/P4), < 4 hours (P1/P2) | Time from ticket creation to resolved status |
| Customer satisfaction score | > 4.0/5.0 | Post-resolution survey rating |
| Product import accuracy | > 95% | Correctly imported products / total imported |
| Affiliate click tracking accuracy | > 99% | Clicks recorded vs actual clicks |
| Knowledge base contribution | 2+ articles/month | New or updated articles submitted |
| Escalation rate | < 10% | Tickets escalated / total tickets resolved |

---

---

# 4. Team SOP

## 4.1 Role Overview and Responsibilities

The **Team** role represents internal team members responsible for content creation, wiki management, document sharing, quality assurance, and maintaining the platform's knowledge base and training materials.

**Primary Responsibilities:**
- Create and edit wiki documents, SOPs, and workflow documentation
- Manage the knowledge base and training content
- Share documents with appropriate roles (agents, users, corporate)
- Perform quality assurance on content and product data
- Maintain version control of documentation
- Review and approve customer-submitted content (reviews, gallery images)

---

## 4.2 Daily/Weekly/Monthly Task Checklists

### Daily Tasks
- [ ] Review content submission queue (reviews, gallery images)
- [ ] Check for document update requests
- [ ] Review support ticket trends for content gaps
- [ ] Verify published content accuracy and links

### Weekly Tasks
- [ ] Create or update 2-3 wiki documents/SOPs
- [ ] Review and update training materials
- [ ] Perform content quality audit (spelling, accuracy, completeness)
- [ ] Update version numbers on modified documents
- [ ] Review product data quality (missing images, descriptions)

### Monthly Tasks
- [ ] Comprehensive documentation review and reorganization
- [ ] Archive outdated documents
- [ ] Generate content usage report (views, downloads by role)
- [ ] Update onboarding documentation for new team members
- [ ] Review and update the home wiki page and navigation
- [ ] Conduct documentation sprint for new features

---

## 4.3 Step-by-Step Procedures

### 4.3.1 Content Creation

#### Creating a Wiki Document
1. Navigate to **Team Dashboard** > **Wiki** tab
2. Click **"Create Document"**
3. Fill in document metadata:
   - **Title** (clear, descriptive, e.g., "Order Fulfillment SOP v2.1")
   - **Slug** (auto-generated, editable; use kebab-case)
   - **Category** (architecture, api, technical, general, sop, workflow, patent, training)
   - **Doc Type** (wiki, sop, workflow, patent, training, video)
   - **Access Roles** (comma-separated: admin, team, agent, user, corporate)
   - **Is Published** (uncheck for draft)
4. Write content in the Markdown editor:
   - Use proper heading hierarchy (H1 → H2 → H3)
   - Include a Table of Contents for long documents
   - Use code blocks for API examples and configurations
   - Include screenshot placeholders where applicable
   - Add Mermaid diagrams for workflows
5. Click **"Save as Draft"** or **"Publish"**
6. If published, the document is immediately visible to roles in `accessRoles`

**Screenshot Placeholder:**
> Team Wiki editor showing a split-panel view. Left panel: Markdown editor with syntax highlighting, showing a document being written with headings, bullet points, and code blocks. Right panel: Live preview of the rendered Markdown. A toolbar above has formatting buttons, image upload, and Mermaid diagram insertion. Metadata fields are at the top: Title input, Slug input, Category dropdown, Doc Type dropdown, Access Roles multi-select, and Is Published checkbox. Save and Publish buttons at the top-right.

#### Editing an Existing Document
1. Navigate to **Wiki** tab and find the document
2. Click **"Edit"** icon (pencil)
3. Make changes in the Markdown editor
4. **Version management:**
   - For minor edits (typos, formatting): Save without incrementing version
   - For major changes (new sections, restructured content): Increment version number
   - Version format: "Major.Minor" (e.g., "1.0" → "1.1" for minor, "2.0" for major)
5. Add a brief change description in the "Update Notes" field
6. Click **"Save"** or **"Publish"**

#### Using Mermaid Diagrams in Documents
1. In the Markdown editor, insert a Mermaid code block:
   ````
   ```mermaid
   sequenceDiagram
       participant User
       participant System
       User->>System: Login Request
       System->>User: 2FA Prompt
   ```
   ````
2. The preview panel renders the diagram automatically
3. Supported diagram types:
   - `sequenceDiagram` — Process flows between actors
   - `flowchart` — Decision trees and workflows
   - `classDiagram` — Data model relationships
   - `erDiagram` — Entity-relationship diagrams

---

### 4.3.2 Wiki Management

#### Organizing the Wiki Structure
1. Maintain a clear category hierarchy:
   - **architecture** — System design, infrastructure docs
   - **api** — API reference, integration guides
   - **technical** — Code-level documentation
   - **general** — Company info, FAQ
   - **sop** — Standard Operating Procedures
   - **workflow** — Process workflows with diagrams
   - **patent** — Patent research and applications
   - **training** — Training materials and videos
2. Ensure the Home wiki page (`HOME.md`) has an up-to-date index
3. Cross-link related documents using relative links
4. Archive documents older than 6 months with no updates

#### Reviewing Document Access
1. Periodically review `accessRoles` on all documents
2. Ensure sensitive documents (patent, financial) are restricted to `admin,team`
3. Agent-accessible documents should have `admin,team,agent`
4. Customer-facing training content should have `admin,team,user`
5. Remove access from roles that no longer need it

---

### 4.3.3 Document Sharing

#### Sharing with Agents
1. Open the document detail page
2. Click **"Share with Agents"** button
3. Select agent(s) from the user dropdown
4. Configure permissions:
   - **Can Download** — Allow agents to save the document locally (default: true)
   - **Can Share** — Allow agents to forward to others (default: false)
   - **Message** — Add context or instructions (e.g., "Updated return policy — please review before your shift")
5. Click **"Share"** — Creates `AgentDocShare` records
6. Agent receives notification in their dashboard

#### Sharing Training Content
1. Open the document detail page
2. Click **"Share as Training"**
3. Configure:
   - **Target Role** — Which role can access (admin, team, agent, user, corporate)
   - **Target User** — Specific user or leave empty for all users of that role
   - **Can Download** — Allow downloading (default: true)
   - **Can View** — Allow viewing (default: true)
4. Click **"Share"** — Creates `TrainingShare` records
5. Shared content appears in the Training section of target users' dashboards

**Screenshot Placeholder:**
> Document sharing modal showing two tabs: "Share with Agents" (active) and "Share as Training". The agent tab shows a multi-select dropdown with agent names, permission checkboxes for "Can Download" (checked) and "Can Share" (unchecked), and a message textarea with placeholder "Add context or instructions...". The training tab shows a role dropdown, optional user-specific input, and view/download permissions. A "Share" button at the bottom.

---

### 4.3.4 Quality Assurance

#### Reviewing Customer Reviews
1. Navigate to **Team Dashboard** > **Reviews** tab
2. View reviews pending verification:
   - Check if the user actually purchased the product (`verified` flag)
   - Review content for appropriateness (no profanity, no spam)
   - Verify rating aligns with comment sentiment
3. Actions:
   - **Approve** — Review becomes visible on product page
   - **Reject** — Review is hidden (with reason)
   - **Flag** — Mark for admin review (suspicious review)

#### Reviewing AI Gallery Submissions
1. Navigate to **Team Dashboard** > **Gallery** tab
2. View AI Style Preview images submitted for the influencer gallery
3. For each submission, verify:
   - **Consent given** — `consentGiven = true`
   - **Image quality** — Not blurry, distorted, or inappropriate
   - **Brand alignment** — Image represents the product well
   - **Accuracy** — AI-generated image reasonably matches the product
4. Actions:
   - **Approve** — Image appears in the public influencer gallery
   - **Reject** — Image is not shown publicly (user notified)
   - **Request Revision** — Ask user for a new try-on with better selfie

#### Product Data Quality Audit
1. Navigate to **Team Dashboard** > **Data Quality** tab
2. Run quality checks:
   - **Missing images** — Products without product images
   - **Missing descriptions** — Products with empty or short descriptions
   - **Price anomalies** — Products with price = 0 or compareAtPrice < price
   - **Category assignment** — Products without categories
   - **Stock status mismatch** — Products with stock > 0 but stockStatus = "out_of_stock"
3. Export the audit report
4. Assign fixes to appropriate team members or admins

---

## 4.4 Troubleshooting Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Mermaid diagram not rendering | Syntax error in Mermaid code | Validate Mermaid syntax using mermaid.live editor |
| Document not visible to target role | `accessRoles` not set correctly | Edit document and add the role to `accessRoles` |
| Version confusion | Multiple edits without version bump | Establish versioning convention; review edit history |
| Broken internal links | Document slug changed | Update all references; use search to find broken links |
| Training share not received | Target role mismatch | Verify `targetRole` matches the intended audience |
| Gallery image quality poor | AI generation issue | Reject and suggest user retry with better selfie |

---

## 4.5 Escalation Procedures

| Situation | Escalation Path |
|-----------|-----------------|
| Inappropriate user content (legal risk) | Team → Super Admin → Legal |
| Patent documentation accuracy concern | Team → Super Admin → Patent Attorney |
| AI accuracy consistently below threshold | Team → Engineering → Product Manager |
| Unauthorized access to restricted documents | Team → Super Admin (security incident) |
| Content dispute between departments | Team → Super Admin (arbitration) |

---

## 4.6 Performance Metrics / KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Document creation rate | 5+ documents/month | New wiki documents created |
| Document freshness | < 30 days since last review | Days since last update/review |
| Review processing time | < 24 hours | Time from review submission to approval/rejection |
| Gallery approval turnaround | < 48 hours | Time from submission to decision |
| Data quality score | > 95% | Products passing all quality checks |
| Training content coverage | > 90% of features documented | Documented features / total features |
| Link integrity | > 99% valid links | Working internal links / total internal links |

---

---

# 5. Corporate SOP

## 5.1 Role Overview and Responsibilities

The **Corporate** role represents business clients using the 3 Boxes Luxury Corporate Gifting portal. Corporate accounts manage bulk gift orders, campaigns, team members, and recipient lists for employee and client gifting.

**Corporate Sub-Roles:**

| Sub-Role | Scope |
|----------|-------|
| `corporate_admin` | Full corporate account access — manage members, campaigns, branding, billing |
| `finance_user` | View invoices, manage billing, track spending against budget |
| `campaign_manager` | Create and manage campaigns, add recipients, select products |

**Primary Responsibilities:**
- Register and maintain a corporate account
- Create and manage gifting campaigns
- Add and manage team members with appropriate sub-roles
- Manage recipient lists (manual entry or CSV import)
- Select products and customize branding for gift packages
- Track campaign progress and delivery status
- Manage corporate branding and packaging preferences

---

## 5.2 Daily/Weekly/Monthly Task Checklists

### Daily Tasks
- [ ] Review active campaign statuses
- [ ] Check delivery tracking for shipped gifts
- [ ] Respond to any recipient delivery issues
- [ ] Review pending team member invitations

### Weekly Tasks
- [ ] Review campaign budget utilization
- [ ] Update recipient lists for upcoming occasions
- [ ] Check invoice and payment status
- [ ] Review product catalog for new additions suitable for gifting

### Monthly Tasks
- [ ] Plan campaigns for upcoming occasions (festivals, milestones)
- [ ] Review and update corporate branding settings
- [ ] Generate gifting expense report
- [ ] Audit team member access and roles
- [ ] Review recipient satisfaction (delivery confirmation, feedback)

---

## 5.3 Step-by-Step Procedures

### 5.3.1 Account Registration

#### Registering a Corporate Account
1. Navigate to the 3 Boxes Luxury homepage
2. Click **"Corporate Gifting"** or **"Register as Corporate"**
3. Fill in corporate registration form:
   - **Company Name** (required)
   - **Industry** (optional, e.g., Technology, Finance, Healthcare)
   - **Website** (optional)
   - **GST Number** (optional, for Indian businesses)
   - **PAN Number** (optional)
   - **Contact Name** (required)
   - **Contact Email** (required, becomes the corporate admin email)
   - **Contact Phone** (optional)
   - **Billing Address** (required for invoicing)
   - **Shipping Address** (if different from billing)
4. Create account credentials (email + password)
5. Click **"Register Corporate Account"**
6. System creates:
   - User record with `role = "corporate"`, `corporateRole = "corporate_admin"`
   - `CorporateAccount` record with `approvalStatus = "pending"`
7. Admin reviews and approves the account
8. Once approved, corporate admin receives confirmation email with login instructions

**Screenshot Placeholder:**
> Corporate Registration page with a professional dark theme and amber/gold accents. Form fields are organized in sections: "Company Information" (company name, industry dropdown, website URL, GST/PAN fields), "Primary Contact" (name, email, phone), "Billing Address" (address, city, state, ZIP, country), "Account Credentials" (email, password, confirm password). A "Register Corporate Account" button with amber gradient at the bottom. A sidebar shows benefits: "Bulk Ordering", "Custom Branding", "Dedicated Support".

#### Corporate Login
1. Navigate to the corporate login page
2. Enter corporate email and password
3. Click **"Log In"**
4. If 2FA is enabled, complete 2FA verification
5. Upon successful login, land on the Corporate Dashboard

---

### 5.3.2 Campaign Creation

#### Creating a New Campaign
1. Navigate to **Corporate Dashboard** > **Campaigns** tab
2. Click **"Create Campaign"**
3. Fill in campaign details:
   - **Campaign Name** (required, e.g., "Diwali 2026 Employee Gifts")
   - **Occasion** (select from: diwali, christmas, new_year, birthday, anniversary, onboarding, farewell, achievement, custom)
   - **Description** (optional, internal notes)
   - **Budget Per Recipient** (optional, per-person budget cap)
   - **Total Budget** (optional, overall campaign budget)
   - **Delivery Type** (bulk — all at once, or individual — staggered)
   - **Delivery Date** (target delivery date)
   - **Greeting Message** (custom message for all gifts in this campaign)
4. Select a product:
   - Browse the product catalog
   - Use search and filters to find suitable products
   - Click **"Select"** on a product to assign it to the campaign
5. Click **"Save as Draft"** or **"Continue to Recipients"**
6. Campaign is created with `status = "draft"`

**Screenshot Placeholder:**
> Campaign creation form with two columns. Left column: Campaign Name input ("Diwali 2026 Employee Gifts"), Occasion dropdown ("Diwali" selected), Description textarea, Budget Per Recipient input with INR symbol, Total Budget input, Delivery Type radio buttons (Bulk/Individual), Delivery Date picker. Right column: Product selection area showing a mini product catalog with search bar and category filters. A selected product card shows a gold watch with a checkmark and "Selected" badge. "Save as Draft" and "Continue to Recipients" buttons at the bottom.

---

### 5.3.3 Team Member Management

#### Adding Team Members
1. Navigate to **Corporate Dashboard** > **Team** tab
2. Click **"Invite Member"**
3. Enter:
   - **Email** (required)
   - **Name** (optional, can be filled when they accept)
   - **Role** (select from: corporate_admin, finance_user, campaign_manager)
4. Click **"Send Invite"**
5. System creates a `CorporateMember` record with `status = "pending"`
6. Invitee receives an email with invitation link
7. When they accept:
   - If they have an existing account, they are linked to the corporate account
   - If not, they are prompted to create an account
   - `CorporateMember.status` updates to `"active"` and `joinedAt` is recorded

#### Managing Team Members
1. View all team members in the **Team** tab
2. For each member, you can:
   - **Change Role** — Update their corporate sub-role
   - **Suspend** — Temporarily revoke access (`status = "suspended"`)
   - **Remove** — Remove from the corporate account entirely
3. Only `corporate_admin` can add, remove, or change roles of other members

**Screenshot Placeholder:**
> Corporate Team management page showing a table of team members: Name, Email, Role (with dropdown for role change), Status (active/pending/suspended badges), Invited Date, Joined Date, and Actions (Suspend/Remove buttons). An "Invite Member" button in the top-right opens a modal with email, name, and role fields. A pending invitation row is highlighted with a "Resend Invite" option.

---

### 5.3.4 Recipient Management

#### Adding Recipients Manually
1. Navigate to the campaign detail page > **Recipients** tab
2. Click **"Add Recipient"**
3. Enter recipient details:
   - **Name** (required)
   - **Email** (required)
   - **Phone** (optional)
   - **Designation** (optional)
   - **Department** (optional)
   - **Address** (required for delivery)
   - **City, State, ZIP Code** (required)
   - **Custom Product** (optional — override campaign-level product)
   - **Custom Budget** (optional — override campaign budget)
   - **Custom Message** (optional — override campaign greeting)
4. Click **"Add"** — Creates `CampaignRecipient` record with `giftStatus = "pending"`
5. Repeat for additional recipients

#### Importing Recipients via CSV
1. Navigate to campaign > **Recipients** tab
2. Click **"Import CSV"**
3. Download the CSV template (if needed)
4. Prepare your CSV file with columns:
   - `name`, `email`, `phone`, `designation`, `department`, `address`, `city`, `state`, `zipCode`
   - Optional: `productId`, `budget`, `message` (for per-recipient overrides)
5. Upload the CSV file
6. API call: `POST /api/corporate/recipients/import-csv`
7. System validates each row:
   - Checks required fields
   - Validates email format
   - Checks for duplicates within the campaign
8. Shows import summary: X added, Y skipped (duplicates), Z errors
9. Review imported recipients in the list

**Screenshot Placeholder:**
> Recipient management page within a campaign. A table shows recipients with columns: Name, Email, Department, Gift Status (pending/ordered/shipped badges), Actions. An "Add Recipient" button and "Import CSV" button in the top-right. The CSV import modal is open showing a file upload zone, a "Download Template" link, and a preview of parsed data with validation status (green checkmarks for valid rows, red X for errors). Import summary at the bottom: "25 added, 2 duplicates skipped, 1 error".

---

### 5.3.5 Bulk Ordering

#### Submitting a Campaign for Processing
1. After adding recipients and selecting a product, review the campaign:
   - Verify recipient list is complete
   - Confirm product selection
   - Check total budget: `recipients.count × product.price`
   - Verify delivery date is feasible (at least 5 business days out)
2. Click **"Submit Campaign"**
3. API call: `POST /api/corporate/campaigns/{id}/submit`
4. Campaign status changes: `draft` → `pending_approval`
5. Admin reviews the campaign:
   - Checks budget, product availability, delivery feasibility
   - Approves or requests changes
6. Once admin approves: `status = "approved"` → `in_progress`
7. System creates orders for each recipient:
   - Each recipient gets an individual Order record
   - `CampaignRecipient.giftStatus` updates to `"ordered"`
   - `CampaignRecipient.orderId` is set to the new order's ID
8. Orders are processed through the standard fulfillment pipeline

#### Tracking Bulk Order Status
1. Navigate to campaign > **Recipients** tab
2. View `giftStatus` for each recipient:
   - `pending` — Order not yet created
   - `ordered` — Order created, awaiting processing
   - `shipped` — Order shipped with tracking
   - `delivered` — Order delivered
   - `cancelled` — Order cancelled
3. Click on a recipient to view their individual order details and tracking

---

### 5.3.6 Branding Customization

#### Setting Up Corporate Branding
1. Navigate to **Corporate Dashboard** > **Branding** tab
2. Configure branding options:
   - **Logo** — Upload company logo (PNG, SVG recommended; max 2MB)
   - **Primary Color** — Hex code for brand primary color (e.g., #1a365d)
   - **Secondary Color** — Hex code for brand secondary color (e.g., #e53e3e)
   - **Custom Message** — Default greeting message for all gifts
   - **Packaging Type** — Select from:
     - `standard` — Default 3 Boxes packaging
     - `premium` — Upgraded gift box with ribbon
     - `luxury` — Premium box with custom insert and branding
   - **Gift Wrap Style** — Ribbon color, wrapping style
   - **Include Branding** — Toggle corporate branding on packages (default: true)
   - **Hide Price** — Hide price on gift packages (default: true for corporate)
   - **Card Template** — Custom greeting card template with company branding
3. Click **"Save Branding"**
4. Settings are stored in the `CorporateBranding` record
5. Preview the branded package appearance in the right panel

**Screenshot Placeholder:**
> Corporate Branding settings page with a two-column layout. Left column: Logo upload area with drag-and-drop, Primary Color and Secondary Color pickers (showing color swatches and hex inputs), Custom Message textarea, Packaging Type dropdown ("luxury" selected), Gift Wrap Style options, Include Branding toggle (on), Hide Price toggle (on), Card Template selector. Right column: Live preview of a branded gift box showing the corporate logo, custom colors, greeting card, and packaging style. A "Save Branding" button at the bottom-left.

---

## 5.4 Troubleshooting Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Corporate account not approved | Admin has not reviewed yet | Wait for admin approval; contact support if > 24 hours |
| Campaign submission rejected | Product out of stock or budget exceeds credit limit | Select a different product; request credit limit increase |
| CSV import failing | Invalid CSV format or missing required fields | Download template; ensure all required columns are present |
| Team member not receiving invite | Email in spam or already has a corporate account | Resend invite; verify email address; contact support |
| Recipient delivery failed | Invalid address or unreachable location | Update recipient address; contact support for redelivery |
| Branding changes not applying | Campaign already submitted | Branding changes apply to new campaigns only |
| Budget exceeded | More recipients than planned | Remove recipients or reduce per-recipient budget |

---

## 5.5 Escalation Procedures

| Situation | Escalation Path |
|-----------|-----------------|
| Credit limit increase request | Corporate Admin → Admin (corporate_account_manager) |
| Campaign delivery deadline at risk | Corporate Admin → Admin → Fulfillment Team |
| Recipient complaint about gift quality | Corporate Admin → Support Ticket → QA Review |
| Billing dispute | Finance User → Admin (finance_manager) |
| Account suspension | Corporate Admin → Admin (super_admin) |
| Data privacy concern (recipient PII) | Corporate Admin → Admin → Legal |

---

## 5.6 Performance Metrics / KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Campaign setup time | < 30 minutes | Time from campaign creation to submission |
| Recipient data accuracy | > 98% | Valid addresses / total recipients |
| Campaign approval turnaround | < 24 hours | Time from submission to admin approval |
| Gift delivery success rate | > 95% | Delivered gifts / total recipients |
| Corporate account retention | > 80% year-over-year | Accounts active after 12 months |
| Budget utilization | 90-100% | Spending vs allocated budget |
| Recipient satisfaction | > 4.0/5.0 | Post-delivery feedback score |
| Team collaboration efficiency | < 2 days | Time from invite to team member joining |

---

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | 3 BOXES Operations Team | Initial SOP document for all 5 roles |

---

*For workflow diagrams and process flows, see [WORKFLOW-DOCUMENTATION.md](./WORKFLOW-DOCUMENTATION.md)*
