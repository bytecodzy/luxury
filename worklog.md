---
Task ID: 1
Agent: Main Agent
Task: Fix products display on Vercel for Office/New Arrivals, fix header dropdown sub-menus, add category slug aliases

Work Log:
- Analyzed the root cause: On Vercel, when Shopify API call fails or returns 0 products for Office/New Arrivals, the catch block returns a 500 error before static products can be injected
- Fixed products API route (src/app/api/products/route.ts):
  - Added EARLY RETURN for Office and New Arrivals categories BEFORE any Shopify API call
  - This ensures static products always work on Vercel regardless of Shopify availability
  - Added comprehensive category slug aliases for ALL header sub-menu items (men-accessories, women-jewelry, etc.)
  - Updated PARENT_CATEGORY_CHILDREN to include both header sub-menu slugs AND Shopify/DB slugs
  - Changed error handling: API returns empty results instead of 500 error when Shopify fails
- Fixed header dropdown menus (src/components/header.tsx):
  - Replaced Tailwind `group-hover:visible/opacity` CSS with inline style manipulation via onMouseEnter/onMouseLeave
  - This is more reliable across environments (preview, Vercel) since it doesn't depend on Tailwind CSS class generation
- Updated Shopify category hierarchy (src/lib/shopify.ts):
  - Added header sub-menu slugs to the category hierarchy for proper subcategory display
- Pushed all changes to GitHub (3 commits)
- Tested all APIs locally - all working:
  - Office: 12 static products ✓
  - New Arrivals: 6 static products ✓
  - Men Accessories: 3 DB products ✓
  - Women Jewelry: 11 DB products ✓
  - Home Decor: 2 DB products ✓
  - Kids Toys: 3 DB products ✓

Stage Summary:
- All category navigation now works - clicking any sub-menu item returns products
- Office and New Arrivals always serve static products without Shopify dependency
- Header dropdown menus use JavaScript-based hover instead of CSS-only group-hover
- Vercel deployment pending - code is pushed to GitHub but Vercel hasn't auto-deployed yet
- User may need to manually trigger Vercel deployment or verify auto-deploy is enabled
