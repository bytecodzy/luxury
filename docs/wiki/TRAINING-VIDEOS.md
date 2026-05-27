# 3 BOXES LUXURY — Training Videos Documentation

> **Comprehensive video training scripts and recording guides for the AI Virtual Try-On feature**

---

## Video Series Overview

This training series covers all aspects of the AI Virtual Try-On feature, from setup to deployment, targeted at developers, content managers, and QA testers.

| # | Video Title | Duration | Audience | Status |
|---|-------------|----------|----------|--------|
| 1 | Getting Started with AI Virtual Try-On | 12 min | Developers | Script Ready |
| 2 | Understanding the AI Pipeline | 15 min | Developers | Script Ready |
| 3 | Customizing for Your Products | 10 min | Content Managers | Script Ready |
| 4 | Deploying to Production | 12 min | DevOps | Script Ready |
| 5 | Troubleshooting Guide | 10 min | All | Script Ready |
| 6 | QA Testing Procedures | 12 min | QA Testers | Script Ready |
| 7 | Patent Overview & Filing Guide | 15 min | Legal / Founders | Script Ready |

---

## Video 1: Getting Started with AI Virtual Try-On

### Objective
Set up the development environment and run the virtual try-on feature for the first time.

### Script Outline

**[0:00 - 1:30] Introduction**
- Welcome to 3 BOXES LUXURY AI Virtual Try-On training
- What we'll cover: setup, configuration, first run
- Prerequisites: Node.js 18+, bun, Git

**[1:30 - 4:00] Project Setup**
```
# Screen recording: Terminal
git clone <repo-url>
cd my-project
bun install
```
- Explain the project structure
- Highlight the AI-related files

**[4:00 - 7:00] ZAI SDK Configuration**
- Method 1: Environment variables
```
ZAI_BASE_URL=http://172.25.136.193:8080/v1
ZAI_API_KEY=your-api-key
```
- Method 2: .z-ai-config file
```json
{
  "baseUrl": "http://172.25.136.193:8080/v1",
  "apiKey": "your-api-key"
}
```
- Method 3: Auto-detection (ZAI.create())

**[7:00 - 9:00] Running the Development Server**
```
bun run dev
```
- Navigate to localhost:3000
- Browse to any product
- Show the "Style Preview" button

**[9:00 - 11:00] First Try-On Demo**
- Upload a selfie (good lighting, clear face)
- Show the 4-step flow: Upload → Preview → Generate → Result
- Explain the progress messages
- Show the AI accuracy scores

**[11:00 - 12:00] Summary & Next Steps**
- Recap what we covered
- Next video: Understanding the AI Pipeline

---

## Video 2: Understanding the AI Pipeline

### Objective
Deep dive into how the 5-phase AI pipeline works, including all 4 generation strategies.

### Script Outline

**[0:00 - 2:00] Pipeline Overview**
- The 5 phases: Analysis → Generation → Verification → Refinement → Watermark
- Why multi-strategy? Because no single AI strategy works for all products

**[2:00 - 5:00] Phase 1: Product Analysis**
- VLM (glm-4v-plus) analyzes the product image
- Extracts: TYPE, MAIN_COLOR (with hex), SECONDARY_COLOR, METAL_COLOR, MATERIALS, KEY_DETAILS
- Also analyzes the person's selfie for description
- Show example VLM output

**[5:00 - 9:00] Phase 2: Multi-Strategy Generation**
- **Strategy A: Dual-Image Edit** (PRIMARY)
  - Passes BOTH selfie + product to the AI
  - The model can SEE the actual product colors
  - Best for color accuracy
- **Strategy B: Selfie-Edit**
  - Only selfie as image, product described in text
  - Best face preservation
- **Strategy C: Product-Edit**
  - Only product as image, person described in text
  - Best for jewelry/watches where product color matters most
- **Strategy D: Text-to-Image**
  - Last resort when image edit fails
  - Lowest quality but always available

**[9:00 - 11:30] Phase 3: VLM Verification**
- Each result is compared against the original product
- Scores: COLOR (0-10), SHAPE (0-10), FACE (0-10), OVERALL (0-10)
- Best-scoring result is selected
- If any result scores COLOR >= 8, we stop early

**[11:30 - 13:00] Phase 4: Color Refinement**
- If best result has colorScore < 7
- VLM describes the specific color mismatch
- Refinement pass uses the mismatch description to correct colors
- Only product colors are adjusted, face/body preserved

**[13:00 - 14:00] Phase 5: Watermark**
- Sharp composites "3BOXES GIFTS - AI Style Preview" at bottom-right
- Supports logo PNG if available
- Returns base64 data URL

**[14:00 - 15:00] Summary & Key Takeaways**

---

## Video 3: Customizing for Your Products

### Objective
Learn how product names, categories, and images affect AI output quality.

### Script Outline

**[0:00 - 2:00] How Products Affect AI Output**
- Product name → Jewelry sub-type detection
- Category → Prompt engineering, image size, body framing
- Product image quality → Color accuracy

**[2:00 - 5:00] Jewelry Naming Best Practices**
- Include sub-type: "Diamond Necklace" not "Diamond Jewelry"
- Keywords detected: earring, jhumka, stud, necklace, choker, pendant, temple, haar, mala, bracelet, cuff, bangle, kada, ring, set, bridal
- Good examples vs bad examples with screenshots

**[5:00 - 7:00] Category Configuration**
- Each category has: placement, size, colorFocus, bodyType, useProductEdit
- Show the CATEGORY_CONFIG table
- How to add a new category

**[7:00 - 9:00] Product Image Tips**
- Use high-resolution images (at least 500x500)
- White or neutral background works best
- Show the product clearly without too many props
- For sarees: show the full drape if possible
- For jewelry: show the piece against a dark background

**[9:00 - 10:00] Summary**

---

## Video 4: Deploying to Production

### Objective
Deploy the AI Virtual Try-On to Vercel with proxy configuration.

### Script Outline

**[0:00 - 2:00] Deployment Architecture**
- Vercel (serverless) cannot reach internal AI service
- Need a proxy: ZAI_PROXY_URL
- Options: sandbox Caddy gateway, dedicated proxy server

**[2:00 - 5:00] Setting Up the Proxy**
- Configure ZAI_PROXY_URL environment variable
- The .space-z.ai gateway routes to sandbox's Next.js (port 3000)
- No XTransformPort needed for external gateway

**[5:00 - 8:00] Vercel Deployment Steps**
```bash
# Set environment variables
npx vercel env add ZAI_PROXY_URL
npx vercel env add DATA_SOURCE
npx vercel env add SHOPIFY_STORE_DOMAIN
npx vercel env add SHOPIFY_ADMIN_API_TOKEN

# Deploy
npx vercel --prod --token YOUR_TOKEN --yes
```

**[8:00 - 10:00] Canvas Fallback on Vercel**
- When AI is unavailable: client-side canvas overlay
- Product image overlaid on selfie with branding
- Still provides a useful style preview

**[10:00 - 12:00] Android PWA Deployment**
- The same Vercel URL works as PWA
- PWA install prompt for Android
- AI try-on works the same way in the app

---

## Video 5: Troubleshooting Guide

### Objective
Diagnose and fix common issues with the AI Virtual Try-On.

### Script Outline

**[0:00 - 2:00] Common Issues Overview**
1. AI not generating images
2. Color mismatch
3. Face distortion
4. Canvas fallback triggering
5. Proxy connection errors

**[2:00 - 4:00] AI Not Generating Images**
- Check ZAI service status: GET /api/try-on/status
- Check .z-ai-config file exists and is valid
- Check network connectivity to AI endpoint
- Check server logs for errors

**[4:00 - 6:00] Color Mismatch**
- Ensure product image is high quality
- Check product name for correct jewelry sub-type
- Try Strategy C (product-edit) for jewelry
- Review VLM verification scores

**[6:00 - 8:00] Canvas Fallback Triggering**
- Verify ZAI_BASE_URL or ZAI_PROXY_URL is configured
- Check proxy health: GET /api/config
- On Vercel: ensure ZAI_PROXY_URL is set

**[8:00 - 10:00] Debug Logging**
- Set NODE_ENV=development for verbose logs
- Check [try-on] prefixed logs
- Check [pipeline] prefixed logs
- Monitor job status via GET /api/try-on?jobId=xxx

---

## Video 6: QA Testing Procedures

### Objective
Systematic testing procedures for the AI Virtual Try-On across all platforms.

### Script Outline

**[0:00 - 3:00] Test Setup**
- Test accounts and products
- Test images: various lighting, angles, backgrounds
- Platform checklist: Local, Vercel, Android PWA

**[3:00 - 7:00] Category Test Cases**
- For each of 8 categories:
  - Upload selfie → Generate → Verify result
  - Check product placement (e.g., necklace on neck, watch on wrist)
  - Check color accuracy against product image
  - Record AI scores (color, face, overall)

**[7:00 - 9:00] Fallback Testing**
- Disable ZAI service → Verify canvas fallback works
- Disable proxy → Verify fallback on Vercel
- Test with invalid images → Verify error messages

**[9:00 - 11:00] Cross-Platform Testing**
- Same product + same selfie on:
  - Local development
  - Vercel deployment
  - Android PWA
- Compare results and timing

**[11:00 - 12:00] Performance Benchmarks**
- Target: < 60 seconds end-to-end
- Canvas fallback: < 5 seconds
- Job polling: 2-second intervals

---

## Video 7: Patent Overview & Filing Guide

### Objective
Understand the patentable aspects of the AI Virtual Try-On and the filing process.

### Script Outline

**[0:00 - 3:00] What Makes Our System Patentable**
- 9 novel features not found in existing patents
- Key differentiator: VLM Verification + Color Refinement Loop
- Prior art analysis summary

**[3:00 - 6:00] Patent Filing Options**
- India (IPO): ₹4,000-8,000 filing, 3-5 year timeline
- US (USPTO): $300-800 micro entity, 2-3 year timeline
- PCT (International): ~$4,000, 30-month priority

**[6:00 - 10:00] Filing Process (India)**
1. Patentability search (already done in our documentation)
2. Draft patent specification (draft in our docs)
3. File provisional application (within 12 months)
4. File complete specification
5. Publication (18 months)
6. Examination & hearing
7. Grant

**[10:00 - 13:00] Key Claims Overview**
- Claim 1: Multi-strategy pipeline with VLM verification
- Claim 2: Dual-image edit for product color fidelity
- Claim 3: Color accuracy refinement with hex-code extraction
- Claim 4: Category-aware prompt engineering
- Claims 5-30: Dependent claims for specific features

**[13:00 - 15:00] Next Steps**
- Consult with patent attorney
- File provisional patent (protects for 12 months)
- Complete detailed specification within 12 months
- Monitor for infringement

---

## Recording Guidelines

### Technical Setup
- **Screen Resolution**: 1920x1080 minimum
- **Audio**: Clear microphone, minimal background noise
- **Software**: OBS Studio or Loom for recording
- **Format**: MP4, H.264 codec

### Visual Standards
- Use dark mode for IDE and terminal
- Zoom into relevant code sections (150-200%)
- Highlight important lines with annotations
- Use consistent color scheme (amber/gold theme matching 3 BOXES brand)

### Intro/Outro Template
- **Intro**: "Welcome to 3 BOXES LUXURY training. I'm [name], and today we'll cover [topic]."
- **Outro**: "That's it for this video. In the next video, we'll cover [next topic]. Thanks for watching!"

---

*Last updated: March 2025*
