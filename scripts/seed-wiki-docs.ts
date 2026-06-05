import { db } from '../src/lib/db'
import * as fs from 'fs'
import * as path from 'path'

async function seedWikiDocs() {
  console.log('🌱 Seeding wiki documents...')

  const docsDir = path.join(__dirname, '..', 'docs')

  const docsToSeed = [
    {
      title: 'Technical & Functional Documentation',
      slug: 'technical-functional-documentation',
      filePath: path.join(docsDir, 'wiki', 'TECHNICAL-FUNCTIONAL-DOCUMENTATION.md'),
      category: 'technical',
      docType: 'wiki',
      version: '1.0',
      accessRoles: 'admin,team',
      isPublished: true,
    },
    {
      title: 'SOP Documents - User Role Procedures',
      slug: 'sop-documents',
      filePath: path.join(docsDir, 'wiki', 'SOP-DOCUMENTS.md'),
      category: 'sop',
      docType: 'sop',
      version: '1.0',
      accessRoles: 'admin,team,agent,user,corporate',
      isPublished: true,
    },
    {
      title: 'Workflow Documentation',
      slug: 'workflow-documentation',
      filePath: path.join(docsDir, 'wiki', 'WORKFLOW-DOCUMENTATION.md'),
      category: 'workflow',
      docType: 'workflow',
      version: '1.0',
      accessRoles: 'admin,team',
      isPublished: true,
    },
    {
      title: 'Patent Application - Complete Documentation',
      slug: 'patent-application-complete',
      filePath: path.join(docsDir, 'patent', 'PATENT-APPLICATION-COMPLETE.md'),
      category: 'patent',
      docType: 'patent',
      version: '1.0',
      accessRoles: 'admin',
      isPublished: true,
    },
    {
      title: 'Video Training Scripts & Production Guide',
      slug: 'video-training-scripts',
      filePath: path.join(docsDir, 'wiki', 'VIDEO-TRAINING-SCRIPTS.md'),
      category: 'training',
      docType: 'training',
      version: '1.0',
      accessRoles: 'admin,team',
      isPublished: true,
    },
    {
      title: 'Admin SOP - Standard Operating Procedures',
      slug: 'admin-sop',
      content: `# Admin Standard Operating Procedure

## Daily Tasks
1. Review pending orders and process shipments
2. Check low-stock alerts and reorder inventory
3. Respond to escalated support tickets
4. Review new user registrations and approve as needed

## Weekly Tasks
1. Generate sales reports and analyze trends
2. Update product catalog with new arrivals
3. Review and moderate user reviews
4. Audit training content and sharing permissions

## Monthly Tasks
1. Review and update SOPs
2. Analyze corporate gifting campaign performance
3. Audit user permissions and access levels
4. Review AI feature performance metrics

## Key Metrics
- Order processing time: < 24 hours
- Support ticket resolution: < 48 hours
- Inventory accuracy: > 95%
- User satisfaction: > 4.5/5

## Escalation Procedures
- Critical issues (payment failures, security): Immediate escalation to tech lead
- High priority (order issues, 2FA problems): Resolve within 4 hours
- Medium priority (content updates, feature requests): Resolve within 24 hours
- Low priority (UI improvements, documentation): Resolve within 1 week`,
      category: 'sop',
      docType: 'sop',
      version: '1.0',
      accessRoles: 'admin',
      isPublished: true,
    },
    {
      title: 'User Onboarding Guide',
      slug: 'user-onboarding-guide',
      content: `# User Onboarding Guide

## Welcome to 3 Boxes Luxury!

### Getting Started
1. **Register**: Click Sign In → Register. Enter your name, email, and password.
2. **Verify Email**: Check your inbox and click the verification link.
3. **Login**: Sign in with your credentials. Complete 2FA if prompted.
4. **Explore**: Browse categories, search for products, use AI features.

### Key Features for Users
- **AI Virtual Try-On**: See how products look on you
- **Social Style**: Connect social media for personalized recommendations
- **3Box Curate**: Shop across multiple portals in one cart
- **Family Shopping**: Curated packages for family occasions
- **Gift Builder**: AI-powered gift recommendations
- **Wishlist**: Save products for later
- **Order Tracking**: Real-time order status updates

### Need Help?
- Email: info@3boxes.in
- Phone: +91 9611533511
- WhatsApp: wa.me/919611533511`,
      category: 'general',
      docType: 'training',
      version: '1.0',
      accessRoles: 'admin,team,user',
      isPublished: true,
    },
    {
      title: 'Training Video: Admin Dashboard Overview',
      slug: 'training-video-admin-dashboard',
      content: `<!-- VIDEO_METADATA
{
  "videoUrl": "https://www.youtube.com/embed/placeholder-admin-dashboard",
  "duration": "8:00",
  "videoCategory": "admin-training",
  "targetRoles": ["admin"],
  "thumbnail": ""
}
-->

# Admin Dashboard Overview

This training video covers the complete admin dashboard walkthrough including:
- Login and 2FA authentication
- Dashboard metrics and analytics
- Sidebar navigation and all admin sections
- Quick actions and search functionality
- Theme and settings management

**Duration**: 8 minutes
**Target**: Admin users
**Prerequisites**: Admin account with 2FA enabled

## Key Takeaways
1. The dashboard provides real-time metrics for orders, revenue, and users
2. All management functions are accessible from the sidebar
3. Use search for quick access to products, orders, and users
4. Training content and documentation are managed in the Training & Wiki section
5. Always enable 2FA for security`,
      category: 'training',
      docType: 'video',
      version: '1.0',
      accessRoles: 'admin',
      isPublished: true,
    },
    {
      title: 'Training Video: AI Virtual Try-On Tutorial',
      slug: 'training-video-ai-try-on',
      content: `<!-- VIDEO_METADATA
{
  "videoUrl": "https://www.youtube.com/embed/placeholder-ai-tryon",
  "duration": "6:00",
  "videoCategory": "feature-tutorial",
  "targetRoles": ["user", "admin", "team"],
  "thumbnail": ""
}
-->

# AI Virtual Try-On Tutorial

Learn how to use the AI Virtual Try-On feature to see how products look on you before purchasing.

## Steps Covered
1. Navigate to a product page
2. Click "Try On This Product"
3. Upload a well-lit, front-facing photo
4. Wait for AI processing (10-30 seconds)
5. View and download your try-on result
6. Share to the AI Style Gallery (optional)

## Tips for Best Results
- Use a front-facing photo with good lighting
- Stand against a plain background
- Wear fitted clothing for accurate body mapping
- The AI works best with full-body or upper-body photos

**Duration**: 6 minutes
**Target**: All users`,
      category: 'training',
      docType: 'video',
      version: '1.0',
      accessRoles: 'admin,team,user',
      isPublished: true,
    },
    {
      title: 'Training Video: 3Box Curate Cross-Portal Shopping',
      slug: 'training-video-3box-curate',
      content: `<!-- VIDEO_METADATA
{
  "videoUrl": "https://www.youtube.com/embed/placeholder-3box-curate",
  "duration": "7:00",
  "videoCategory": "feature-tutorial",
  "targetRoles": ["user", "admin", "team"],
  "thumbnail": ""
}
-->

# 3Box Curate: Cross-Portal Shopping Tutorial

Learn how to shop across 9 different e-commerce portals and receive everything in one package.

## Steps Covered
1. Navigate to 3Box Curate from the top navigation
2. Browse products from Myntra, Amazon, Nykaa, Flipkart, and more
3. Add products to your bundle using the + button
4. Include at least one 3Box product (required)
5. Get bundle discounts: 5% for 3+ items, 10% for 5+ items
6. Review your bundle and proceed with AI Curation
7. Read and accept the consent form
8. Confirm your bundle and receive a Bundle ID
9. Track your bundle from the Orders section

**Duration**: 7 minutes
**Target**: All users`,
      category: 'training',
      docType: 'video',
      version: '1.0',
      accessRoles: 'admin,team,user',
      isPublished: true,
    },
    {
      title: 'Training Video: Family Shopping Guide',
      slug: 'training-video-family-shopping',
      content: `<!-- VIDEO_METADATA
{
  "videoUrl": "https://www.youtube.com/embed/placeholder-family-shopping",
  "duration": "6:00",
  "videoCategory": "feature-tutorial",
  "targetRoles": ["user", "admin", "team"],
  "thumbnail": ""
}
-->

# Family Shopping Guide

Learn how to shop for your entire family based on occasions and festivals with curated packages and special offers.

## Steps Covered
1. Navigate to Family Shop from the top navigation
2. Select an occasion (Diwali, Christmas, Birthday, etc.)
3. Add family members with name, age, gender, and relationship
4. Review AI-generated packages:
   - Complete Family Gift Pack (15% off)
   - Couples Special (18% off)
   - Kids Delight (20% off)
   - Elder's Blessing (15% off)
5. Select and customize packages
6. Take advantage of special offers:
   - Buy 3+ items: 15% off
   - Family of 4+: Free gift wrapping
   - Prepaid orders: Extra 10% off
7. Add to cart and checkout

**Duration**: 6 minutes
**Target**: All users`,
      category: 'training',
      docType: 'video',
      version: '1.0',
      accessRoles: 'admin,team,user',
      isPublished: true,
    },
    {
      title: 'Training Video: Corporate Gifting Setup',
      slug: 'training-video-corporate-gifting',
      content: `<!-- VIDEO_METADATA
{
  "videoUrl": "https://www.youtube.com/embed/placeholder-corporate-gifting",
  "duration": "8:00",
  "videoCategory": "corporate-training",
  "targetRoles": ["corporate", "admin"],
  "thumbnail": ""
}
-->

# Corporate Gifting Setup Tutorial

Complete guide to setting up corporate accounts, creating campaigns, and managing bulk gifting.

## Steps Covered
1. Register as a corporate user with company details
2. Wait for admin approval
3. Access the corporate dashboard
4. Create a new gifting campaign
5. Set occasion, budget, and select products
6. Customize branding (logo, colors, packaging)
7. Add team members with appropriate roles
8. Add recipients manually or via CSV import
9. Review and submit campaign
10. Track delivery status per recipient

**Duration**: 8 minutes
**Target**: Corporate users, Admin`,
      category: 'training',
      docType: 'video',
      version: '1.0',
      accessRoles: 'admin,corporate',
      isPublished: true,
    },
  ]

  let created = 0
  let skipped = 0

  for (const docDef of docsToSeed) {
    try {
      // Check if document already exists by slug
      const existing = await db.wikiDocument.findUnique({ where: { slug: docDef.slug } })
      if (existing) {
        console.log(`  ⏭️  Skipping "${docDef.title}" (slug "${docDef.slug}" already exists)`)
        skipped++
        continue
      }

      // Read content from file if filePath is provided, otherwise use inline content
      let content = docDef.content || ''
      if (docDef.filePath && fs.existsSync(docDef.filePath)) {
        content = fs.readFileSync(docDef.filePath, 'utf-8')
        console.log(`  📄 Read ${content.length} chars from ${path.basename(docDef.filePath)}`)
      }

      if (!content) {
        console.log(`  ⚠️  Skipping "${docDef.title}" (no content available)`)
        continue
      }

      await db.wikiDocument.create({
        data: {
          title: docDef.title,
          slug: docDef.slug,
          content,
          category: docDef.category,
          docType: docDef.docType,
          version: docDef.version,
          accessRoles: docDef.accessRoles,
          isPublished: docDef.isPublished,
          createdBy: 'system-seed',
        },
      })

      console.log(`  ✅ Created "${docDef.title}" (${docDef.docType})`)
      created++
    } catch (err) {
      console.error(`  ❌ Error creating "${docDef.title}":`, err)
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`)

  // Show doc type counts
  const typeCounts = await db.wikiDocument.groupBy({
    by: ['docType'],
    _count: { id: true },
  })

  console.log('\n📁 Documents by type:')
  for (const tc of typeCounts) {
    console.log(`  ${tc.docType}: ${tc._count.id}`)
  }

  await db.$disconnect()
}

seedWikiDocs().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
