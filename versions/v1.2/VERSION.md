# 3 BOXES LUXURY - Version 1.2

**Tag:** `v1.2`  
**Date:** 2026-03-05  
**Status:** ACTIVE

## Changes from Version 1.1

### 1. AI Selfie Consent Flow
- After AI Virtual Try-On generates a result, customer is asked for consent to share their AI-generated image
- Consent form includes: Name, Rating (1-5 stars), Review Title, Review Comment, Consent Checkbox
- "Share My Style" button submits to `/api/portfolio` with consent data
- "No, Thanks" option to dismiss
- Auto-approved for public display when consent is given

### 2. Customer Portfolio (Happy Customers)
- New `CustomerPortfolio` database model with consent tracking
- `/api/portfolio` API route (GET, POST, DELETE)
- "Happy Customers" section on Product Detail page showing AI-generated style previews
- Each portfolio entry shows: AI image, customer name, star rating, review, "Verified Style Preview" badge
- Only displays entries with consent given and admin approval

### 3. Restructured Categories
- **7 Main Categories**: Couple, Men, Women, Kids, Home, Office, New Arrivals
- **Subcategories**:
  - Couple: Couple Friendly
  - Men: Accessories, Shirts, T-Shirts & Polos, Fragrances, Watches, Leather Goods
  - Women: Jewelry, Sarees, Fashion, Fragrances, Accessories
  - Kids: Toys & Games, Kids Fashion
  - Home: Home Décor, Candles & Fragrances, Living
  - Office: Corporate Gifts, Desk Accessories, Stationery
  - New Arrivals: (no subcategories - flag category)
- Category model now supports `parentId` for hierarchy and `order` for sorting
- Category Grid redesign with expandable subcategory chips
- Header category navigation bar with dropdown menus (desktop) / scrollable row (mobile)
- 21 new products added across new subcategories
- 77 total products (56 remapped + 21 new)
