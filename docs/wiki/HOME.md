# 3 BOXES LUXURY — AI Virtual Try-On Wiki

> **Complete documentation hub for the AI Virtual Try-On feature by 3 BOXES GIFTS**

---

## 📋 Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| [Technical Documentation](./TECHNICAL-DOCUMENTATION.md) | Complete code-level documentation covering architecture, pipeline, API specs, and implementation details | Developers, Patent Attorneys |
| [Functional Documentation & Training Guide](./FUNCTIONAL-DOCUMENTATION.md) | User-facing feature guide, test cases, training scripts, and QA procedures | Product Managers, QA, Content Managers |
| [Patent Application](../patent/PATENT-APPLICATION.md) | Draft patent application with claims, prior art analysis, and filing guide | Patent Attorneys, Legal |
| [Vercel Deployment Wiki](../VERCEL-WIKI.md) | Quick reference for deploying to Vercel | DevOps, Developers |
| [Vercel Deployment Guide](../VERCEL-DEPLOYMENT-GUIDE.md) | Detailed Vercel deployment instructions | DevOps, Developers |

---

## 🤖 AI Virtual Try-On — Feature Summary

The **3 BOXES LUXURY AI Virtual Try-On** is a multi-strategy AI image generation system that allows users to upload selfies and see luxury products (jewelry, sarees, watches, etc.) virtually worn on them.

### Key Capabilities

- **4 AI Generation Strategies** with automatic best-result selection
- **VLM Verification** — Vision Language Model scores each result for color/shape/face accuracy
- **Color Accuracy Refinement** — automatic refinement when color matching is below threshold
- **8 Product Categories** — Jewelry, Sarees, Watches, Fashion, Men's Shirts, Leather Goods, Fragrances, Home & Living
- **Cross-Platform** — Works on Web, Vercel serverless, and Android PWA
- **Fallback Mechanism** — Canvas overlay when AI service is unavailable
- **Watermarking** — "3BOXES GIFTS - AI Style Preview" branding on all generated images
- **Product Pairing Suggestions** — AI-recommended complementary products

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                         │
│         TryOnDialog (4-step flow)                         │
│  Upload → Preview → Generating → Result                   │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   API Route      │
              │  /api/try-on     │
              └────┬───────┬────┘
                   │       │
     ┌─────────────▼──┐ ┌──▼──────────────┐
     │  Direct ZAI    │ │  Proxy to       │
     │  SDK (Local)   │ │  Sandbox        │
     │                │ │  (Vercel)       │
     └────┬───────────┘ └──┬──────────────┘
          │                │
     ┌────▼────────────────▼────┐
     │   AI Pipeline (5 Phases)  │
     │  1. Product Analysis       │
     │  2. Multi-Strategy Gen     │
     │  3. VLM Verification       │
     │  4. Color Refinement       │
     │  5. Watermark + Deliver    │
     └────────────────────────────┘
```

---

## 📊 Pipeline Performance Summary

| Strategy | Typical Color Score | Typical Face Score | Speed |
|----------|-------------------:|-------------------:|-------|
| Dual-Image Edit (A) | 7-9 | 8-9 | ~30s |
| Selfie-Edit (B) | 5-7 | 9-10 | ~25s |
| Product-Edit (C) | 8-9 | 3-5 | ~25s |
| Text-to-Image (D) | 3-6 | 2-4 | ~20s |

---

## 🔬 Patent Status

The AI Virtual Try-On feature contains **9 novel aspects** that are not found in existing patents:

1. Multi-Strategy Pipeline with VLM Verification
2. Dual-Image Edit with Product Color Fidelity
3. Category-Aware Prompt Engineering
4. Color Accuracy Refinement Loop
5. Hex-Code-Based Color Extraction
6. Luxury E-Commerce Integration
7. Cross-Platform Deployment with Proxy Architecture
8. Canvas Overlay Fallback
9. Automatic Watermarking

For full patent analysis and draft application, see [Patent Application Document](../patent/PATENT-APPLICATION.md).

### Existing Patents Reviewed

| Patent | Title | Relevance |
|--------|-------|-----------|
| CN104021590A | Virtual try-on system using AR | AR-based, no VLM verification |
| US12205209B1 | Virtual try-on based on predetermined cloth | Single-strategy, no color refinement |
| US20220318892A1 | Clothing virtual try-on based on deep learning | Deep learning based, no multi-strategy |
| US6546309B1 | Virtual fitting room | Mathematical body model, not AI-based |
| US12017142B2 | AR/AI-based virtual try-on | AR-based real-time, no VLM scoring |
| US11158121B1 | Generating realistic clothing for body pose | Single-image, no dual-image edit |
| US20200183969A1 | Virtual dressing utilizing image | Basic overlay, no AI pipeline |
| US5930769A | Fashion shopping system | 2D mannequin, not generative AI |
| GB2488237A | Body model for clothing fit | Body model approach, no AI generation |
| US20150154691A1 | Online virtual fitting room | 3D scanning based, not image generation |

**Conclusion**: Our system's combination of multi-strategy generation + VLM verification + color refinement loop is novel and patentable.

---

## 🛠️ Quick Start

### Local Development
```bash
# 1. Ensure ZAI SDK is configured
cat .z-ai-config  # Should contain baseUrl and apiKey

# 2. Start the development server
bun run dev

# 3. Navigate to any product → Click "Style Preview"
```

### Vercel Deployment
```bash
# Set environment variables
ZAI_PROXY_URL=https://your-sandbox.space-z.ai  # Public proxy URL
DATA_SOURCE=shopify

# Deploy
npx vercel --prod --token YOUR_TOKEN --yes
```

---

## 📁 Project File Structure (AI Try-On Related)

```
src/
├── app/api/try-on/
│   ├── route.ts          # Main try-on API endpoint (POST + GET)
│   ├── status/route.ts   # Health check endpoint
│   └── remote/route.ts   # Proxy forwarding route
├── components/
│   └── product-detail.tsx  # TryOnDialog + ProductDetail components
├── lib/
│   ├── zai.ts              # ZAI SDK configuration and health checks
│   ├── try-on-pipeline.ts  # Core AI pipeline (5 phases, 4 strategies)
│   └── watermark.ts        # Image watermarking with Sharp
└── hooks/
    └── usePWAInstall.ts    # PWA install hook (Android)

docs/
├── wiki/
│   ├── HOME.md                        # This file
│   ├── TECHNICAL-DOCUMENTATION.md     # Complete technical docs
│   └── FUNCTIONAL-DOCUMENTATION.md    # Functional docs + training
├── patent/
│   └── PATENT-APPLICATION.md          # Draft patent application
├── VERCEL-WIKI.md                     # Vercel deployment quick ref
└── VERCEL-DEPLOYMENT-GUIDE.md         # Vercel deployment guide
```

---

## 📞 Contact & Support

For questions about this documentation or the AI Virtual Try-On feature, contact the 3 BOXES LUXURY development team.

---

*Last updated: March 2025*
