# AI Code Strategy Documentation

## 3boxes.in Luxury E-Commerce Platform — AI Systems Architecture & Code Deep-Dive

**Version:** v4 Pipeline  
**Last Updated:** 2025-03-04  
**Audience:** Engineers, Architects, AI/ML Integrators

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI Virtual Try-On System](#2-ai-virtual-try-on-system)
   - 2.1 [HuggingFace Integration (`src/lib/huggingface-tryon.ts`)](#21-huggingface-integration)
   - 2.2 [Try-On Pipeline (`src/lib/try-on-pipeline.ts`)](#22-try-on-pipeline)
   - 2.3 [Try-On API Route (`src/app/api/try-on/route.ts`)](#23-try-on-api-route)
   - 2.4 [Try-On Frontend (`src/components/try-on-dialog.tsx`)](#24-try-on-frontend)
3. [AI Shopping Assistant](#3-ai-shopping-assistant)
4. [AI Image Moderation](#4-ai-image-moderation)
5. [VLM (Vision Language Model) Usage](#5-vlm-vision-language-model-usage)
6. [Watermark System](#6-watermark-system)
7. [AI Strategy Decision Tree](#7-ai-strategy-decision-tree)
8. [AI Service Architecture](#8-ai-service-architecture)
9. [Code Architecture Patterns](#9-code-architecture-patterns)
10. [Performance & Cost Analysis](#10-performance--cost-analysis)

---

## 1. Executive Summary

The 3boxes.in platform employs a sophisticated, multi-layered AI strategy centered on two core capabilities: **Virtual Try-On** and **AI-Powered Gift Recommendations**. The system is architected around a **progressive fallback philosophy** — starting with the highest-quality, most specialized AI models and degrading gracefully through increasingly generalized strategies until a result is always delivered.

Key architectural principles:
- **Never show the user "AI unavailable"** — canvas overlay fallback guarantees a visual result
- **VLM-in-the-loop quality verification** — every AI generation is scored by a Vision Language Model before delivery
- **Category-specific prompt engineering** — 28+ product categories each have tailored prompts, image sizes, and placement instructions
- **Multi-strategy generation with selection** — up to 4 generation strategies are attempted in parallel/sequence, and VLM picks the best
- **Job-based async processing** — POST returns immediately with a jobId; client polls for completion

---

## 2. AI Virtual Try-On System

The virtual try-on is the platform's flagship AI feature. It allows users to upload a selfie and see themselves wearing or holding any product from the catalog. The system uses a **6-layer fallback chain** spanning two AI providers (HuggingFace and ZAI) plus a non-AI canvas fallback.

### 2.1 HuggingFace Integration

**File:** `src/lib/huggingface-tryon.ts` (856 lines)

#### 2.1.1 Architecture Overview

The HuggingFace integration provides **free, real virtual try-on** via the IDM-VTON model hosted on HuggingFace Spaces. It implements three distinct strategies for interacting with the model, ordered by reliability:

```
┌─────────────────────────────────────────────────────────────┐
│  tryOnWithHuggingFace()  — Main Entry Point                │
│                                                             │
│  Strategy 1: Manual Gradio REST API (Primary)              │
│    ├── checkSpaceStatus()                                   │
│    ├── uploadImageToSpace() × 2 (person + garment)         │
│    ├── POST /call/tryon → event_id                         │
│    └── SSE Polling → /call/tryon/{event_id}                │
│                                                             │
│  Strategy 2: @gradio/client (Fallback)                     │
│    ├── Client.connect(IDM_VTON_SPACE_ID)                   │
│    ├── client.submit('/tryon', [...])                       │
│    └── for await (message of job) → result                  │
│                                                             │
│  Strategy 3: HF Inference API (Last Resort)                │
│    └── POST api-inference.huggingface.co/models/...         │
│        (instruct-pix2pix — instruction-based editing)       │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.2 Key Constants & Timeouts

```typescript
const IDM_VTON_SPACE_ID = 'yisol/IDM-VTON'
const IDM_VTON_SPACE_URL = 'https://yisol-idm-vton.hf.space'

const GRADIO_CONNECT_TIMEOUT = 30_000    // 30s to connect
const GRADIO_PROCESS_TIMEOUT = 120_000   // 120s for processing + queue
const MANUAL_POLL_TIMEOUT = 180_000      // 180s for manual API polling
const UPLOAD_TIMEOUT = 30_000            // 30s for image uploads
const DOWNLOAD_TIMEOUT = 30_000          // 30s for downloading result
```

These timeouts were carefully calibrated: IDM-VTON on a free HuggingFace Space can take 30-90 seconds for inference, plus queue wait time. The 180-second manual poll window accommodates both Space cold starts (1-2 minutes) and queue waiting.

#### 2.1.3 Strategy 1: Manual Gradio REST API (Primary)

This is the **most reliable strategy** because it doesn't depend on session management (a known issue with `@gradio/client`). The flow is:

1. **Check Space Status** via `checkSpaceStatus()`:
   - Calls `https://huggingface.co/api/spaces/yisol/IDM-VTON` 
   - Checks `runtime.stage` for `RUNNING`, `SLEEPING`, `BUILDING`, etc.
   - Falls back to a HEAD request to the Space URL
   - Returns `'running' | 'sleeping' | 'building' | 'error'`

2. **Upload Person Image** via `uploadImageToSpace()`:
   - Converts base64 data URL to Blob
   - POSTs to `${SPACE_URL}/upload?upload_id=${id}` as FormData
   - Returns the server-assigned file path (e.g., `/tmp/xxx/person.jpg`)

3. **Upload Garment Image** — same process as person image

4. **Submit Try-On Job** via `POST ${SPACE_URL}/call/tryon`:
   - Body contains a `data` array with 7 parameters:
     ```typescript
     data: [
       { background: { path: personPath, ... }, layers: [], composite: null },  // ImageEditor
       { path: garmentPath, ... },                                              // Image
       getGarmentDescription(categorySlug),                                      // Textbox
       true,   // is_checked (auto-masking)
       false,  // is_checked_crop (no auto-cropping)
       30,     // denoise_steps
       42,     // seed
     ]
     ```
   - Returns an `event_id` for polling

5. **Poll for Result** via SSE streaming at `GET ${SPACE_URL}/call/tryon/${eventId}`:
   - Parses SSE stream using `parseSSEStream()`
   - Looks for `event: complete` + `data: [...]`
   - Handles `event: error` with user-friendly messages
   - Retries on 429 (rate limit) with 5-second backoff
   - Detects connection termination (`ECONNRESET`, `terminated`) as model errors

6. **Extract Image** via `extractImageFromGradioResult()`:
   - Handles multiple result formats: `url`, `path`, raw string, nested `image.url`
   - Converts relative paths to full URLs: `${SPACE_URL}/file=${path}`
   - Downloads HTTP URLs to base64 via `downloadImageAsBase64()`

**Data Flow:**
```
Person Base64 → Blob → Upload → Path ─┐
                                       ├→ /call/tryon → event_id → SSE Poll → Image URL → Base64
Garment Base64 → Blob → Upload → Path ┘
```

#### 2.1.4 Strategy 2: @gradio/client (Fallback)

Uses the official `@gradio/client` npm package. Handles Space wake-up automatically but can encounter "404: Session not found" errors.

```typescript
const client = await Client.connect(IDM_VTON_SPACE_ID, { hf_token })
const job = client.submit('/tryon', [
  personBlob, garmentBlob, garmentDescription,
  true, false, 30, 42
])

for await (const message of job) {
  if (message.type === 'status') { /* queue position, generating */ }
  if (message.type === 'data')    { /* result data */ }
}
```

Key differences from Strategy 1:
- Images are passed as Blobs (not uploaded to server paths)
- The `for await` pattern handles SSE internally
- Session management is automatic but fragile

#### 2.1.5 Strategy 3: HuggingFace Inference API (Last Resort)

When IDM-VTON is completely unavailable, falls back to the serverless Inference API with `timbrooks/instruct-pix2pix`:

```typescript
const response = await fetch(
  'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hfToken}` },
    body: JSON.stringify({
      inputs: {
        image: personImageBase64.replace(/^data:image\/[^;]+;base64,/, ''),
        prompt: `Show this person wearing ${garmentDesc}. Make it look natural...`,
      },
      parameters: {
        num_inference_steps: 30,
        image_guidance_scale: 1.5,
        guidance_scale: 7.5,
      },
    }),
  }
)
```

This is not a true virtual try-on — it's instruction-based image editing. It only sees the person image and a text prompt, not the actual garment image. Color accuracy is significantly lower.

#### 2.1.6 Error Handling Strategies

The module implements **categorized error handling** with user-friendly messages:

| Error Pattern | User Message |
|---|---|
| `Space is sleeping/paused/building` | "IDM-VTON Space is starting up. Takes 1-2 minutes." |
| `401/Unauthorized` | "HuggingFace authentication failed. Check HF_API_TOKEN." |
| `429/rate limit` | "IDM-VTON Space is busy. Wait and try again." |
| `Connection timeout` | "Connection timeout — Space may be waking up." |
| `terminated/ECONNRESET` | "Processing error. Ensure selfie shows a person facing camera." |

#### 2.1.7 Space Pre-Warming

The `preWarmSpace()` function sends a HEAD request to the Space URL, which triggers HuggingFace's auto-wake mechanism. Called before the user starts a try-on to reduce perceived latency:

```typescript
export async function preWarmSpace(): Promise<boolean> {
  const status = await checkSpaceStatus(IDM_VTON_SPACE_URL)
  if (status === 'running') return true
  if (status === 'sleeping') {
    // HEAD request triggers wake-up
    await fetch(IDM_VTON_SPACE_URL, { method: 'HEAD', ... })
    return false  // Still waking up
  }
  return false
}
```

#### 2.1.8 Garment Description Helper

The `getGarmentDescription()` function maps category slugs to human-readable descriptions that IDM-VTON uses as a conditioning signal:

```typescript
const descriptions: Record<string, string> = {
  'mens-shirts': 'a shirt',
  'sarees': 'a saree',
  'watches': 'a watch',
  'jewelry': 'jewelry',
  'fragrances': 'a fragrance',
  // ... 15+ categories
}
```

---

### 2.2 Try-On Pipeline

**File:** `src/lib/try-on-pipeline.ts` (~1350 lines)

This is the **core orchestration engine** that coordinates HuggingFace, ZAI VLM, ZAI image generation, verification, refinement, and watermarking into a coherent multi-phase pipeline.

#### 2.2.1 Pipeline v4 Architecture — Phase Breakdown

```
Phase 0:   Fetch Suggestions (parallel DB query)
Phase 0.5: HuggingFace Virtual Try-On (IDM-VTON — free, no ZAI)
  ↓ If HF succeeds → Watermark → Deliver (skip all ZAI phases)
  ↓ If HF fails → Continue to ZAI pipeline
Phase 1:   VLM Product Analysis (extract color, materials, type)
           + VLM Person Description (face, skin tone, build)
Phase 2:   Multi-Strategy Generation
           Strategy A: Dual-image edit (selfie + product images)
           Strategy B: Selfie edit (selfie image + text description)
           Strategy C: Product edit (product image + text description)
           Strategy D: Text-to-image (no image reference)
Phase 3:   VLM Verification (6-dimension quality check)
Phase 3.5: Face Preservation Check (VLM compares face against original)
Phase 4:   Refinement (up to 2 passes with correction instructions)
Phase 4.5: Product-Overlay Composite (if color still < 6)
Phase 5:   Watermark + Deliver
```

#### 2.2.2 Job Storage & Lifecycle

Jobs are stored in an in-memory `Map<string, TryOnJob>` with automatic cleanup every 5 minutes for jobs older than 15 minutes:

```typescript
export interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  progress?: string
  suggestions?: any[]
  pipelinePhase?: string       // Current phase for UI progress
  colorAccuracy?: number       // 0-10 VLM score
  faceAccuracy?: number        // 0-10 VLM score
  strategy?: string            // Which strategy succeeded
  totalPasses?: number         // How many generation/verification passes
}
```

The `pipelinePhase` field is crucial for the frontend progress bar — it maps to percentage milestones:
- `hf-tryon` → 25%
- `product-analysis` → 30%
- `generation` → 50%
- `verification` → 70%
- `refinement` → 80%
- `watermark` → 90%
- `complete` → 100%

#### 2.2.3 Category Configuration (28+ Categories)

Each product category has a tailored `CategoryConfig` that controls image dimensions, placement instructions, color focus rules, and strategy preferences:

```typescript
interface CategoryConfig {
  placement: string      // How the product is worn/held
  size: ImageSize        // Output image dimensions
  colorFocus: string     // What colors must match exactly
  bodyType: string       // Camera framing / body composition
  useProductEdit: boolean // Whether product-first edit strategy applies
}
```

**Key category examples:**

| Category | Size | Placement | Color Focus | useProductEdit |
|---|---|---|---|---|
| `jewelry` | 864×1152 | "wearing the jewelry piece" | Metal tone + stone colors | true |
| `sarees` | 768×1344 | "draped in traditional Indian style with pallu..." | Fabric + border + zari colors | false |
| `watches` | 864×1152 | "wearing the watch on left wrist" | Dial + case + strap colors | true |
| `fashion` | 768×1344 | "wearing the outfit" | Fabric + print + accent colors | false |
| `corporate-gifts` | 864×1152 | "holding the gift product elegantly" | Product + packaging + branding | true |
| `kids-fashion` | 768×1344 | "wearing the outfit" | Fabric + print + accent colors | false |

**Dynamic placement overrides** based on product name for jewelry and corporate gifts:

```typescript
// Jewelry sub-type detection from product name
if (n.includes('earring') || n.includes('jhumka')) 
  config.placement = 'wearing earrings on both earlobes'
else if (n.includes('necklace') || n.includes('choker'))
  config.placement = 'wearing a necklace around the neck'
else if (n.includes('ring'))
  config.placement = 'wearing a ring on the finger'

// Corporate gift sub-type detection
if (n.includes('diary') || n.includes('planner'))
  config.placement = 'holding the premium diary/notebook elegantly'
else if (n.includes('hamper') || n.includes('gift box'))
  config.placement = 'presenting the gift hamper elegantly'
```

#### 2.2.4 VLM Prompt Engineering

The pipeline uses two major VLM prompts that are critical to output quality:

**PRODUCT_ANALYSIS_PROMPT** — Extracts structured product data with extreme color precision:

```
Analyze this luxury product for a virtual try-on system.
Respond EXACTLY in this format:
TYPE: [e.g. "diamond bib necklace", "maroon kanjeevaram silk saree"]
MAIN_COLOR: [with hex code AND undertone, e.g. "deep maroon red with warm undertone #8B1A1A"]
SECONDARY_COLOR: [with hex AND undertone]
METAL_COLOR: [warm/cool undertone + hex, or "none"]
MATERIALS: [comma-separated with visual texture]
KEY_DETAILS: [2-3 most visible design elements]
PATTERN_TEXTURE: [patterns, prints, textures, engravings]
SIZE_SCALE: [relative to a person]
COLOR_FAMILY: [broad family, e.g. "maroon/burgundy family (NOT red)"]
```

Key design decisions:
- Hex codes force the VLM to be precise (not just "gold" but "warm yellow gold #DAA520")
- `COLOR_FAMILY` with explicit "(NOT red)" prevents color family drift
- `SIZE_SCALE` helps the generation model size products correctly
- `METAL_COLOR` with warmth/coolness is critical for jewelry

**VERIFICATION_PROMPT** — 6-dimension quality inspection with strict scoring:

```
1. COLOR_MATCH (0-10): Product color accuracy
2. SHAPE_DESIGN (0-10): Shape and pattern match
3. FACE_PRESERVATION (0-10): Face identity preservation
4. NATURAL_WEAR (0-10): Realistic wear appearance
5. SKIN_TONE (0-10): Skin tone preservation
6. OVERALL (0-10): Weighted combination

PASS requires: COLOR>=6, FACE>=7, NATURAL_WEAR>=6, SKIN_TONE>=7
```

The PASS threshold is intentionally lenient for color (≥6) because the refinement loop (Phase 4) can improve it. Face and skin tone are stricter because they're harder to fix in refinement.

#### 2.2.5 Generation Strategies (Phase 2)

The pipeline tries up to 4 generation strategies in sequence, with the first successful result from each being verified:

**Strategy A: Dual-Image Edit** (PRIMARY — highest quality)
```typescript
const dualPrompt = buildDualImagePrompt(config, productName, productInfo)
const result = await safeImageEditDual(dualPrompt, selfieData, productImageBase64, config.size)
```
- Passes **both** the selfie AND product as images to the model
- The model can SEE the actual product colors, eliminating color guessing
- Prompt focuses on placement instructions and color-matching rules
- Key phrase: "SECOND IMAGE is the ground truth for product colors"

**Strategy B: Selfie Edit** (Face-preserving, text-described colors)
```typescript
const selfiePrompt = buildSelfieEditPrompt(config, productName, productInfo)
const result = await safeImageEdit(selfiePrompt, selfieData, config.size)
```
- Only the selfie is passed as an image
- Product colors are described in text from the VLM analysis
- Better face preservation but potentially worse color accuracy

**Strategy C: Product Edit** (Color-preserving, text-described person)
```typescript
const productPrompt = buildProductEditPrompt(config, productName, productInfo, personDesc)
const result = await safeImageEdit(productPrompt, productImageBase64, config.size)
```
- Only the product is passed as an image
- Person is described in text from VLM analysis
- Better color accuracy but face won't match
- Only used for categories where `useProductEdit: true` (jewelry, watches, leather, etc.)

**Strategy D: Text-to-Image** (Last resort — no image reference)
```typescript
const createPrompt = buildTextToImagePrompt(config, productName, productInfo, personDesc)
const result = await safeImageCreate(createPrompt, config.size)
```
- Pure text-to-image generation with no reference images
- Lowest quality — only used if ALL other strategies fail

#### 2.2.6 VLM Verification & Selection (Phase 3)

Each generated result is verified against the original product image using `vlmCompare()`:

```typescript
for (const result of results) {
  const verifyRaw = await vlmCompare(VERIFICATION_PROMPT, result.imageUrl, productImageBase64)
  const verification = parseVerification(verifyRaw)
  result.verification = verification
  // Track best result by overall score
  if (!bestVerification || verification.overallScore > bestVerification.overallScore) {
    bestResult = result
    bestVerification = verification
  }
  // Early exit if we find a clearly passing result
  if (verification.colorScore >= 8 && verification.passed) break
}
```

**Weighted overall score** computation when VLM returns sub-scores:
```typescript
overallScore = colorScore * 0.3 + shapeScore * 0.2 + faceScore * 0.2 
             + naturalWearScore * 0.15 + skinToneScore * 0.15
```

Color receives the highest weight (0.3) reflecting the business priority that product colors must be accurate for a luxury e-commerce platform.

#### 2.2.7 Face Preservation Check (Phase 3.5)

If the verification face score is below 7, a dedicated face check is run comparing the AI result against the original selfie:

```typescript
const faceCheckRaw = await vlmCompare(
  `Compare these two images of a person... Rate FACE_SCORE: [0-10]`,
  bestResult.imageUrl,  // AI-generated try-on
  selfieData,           // Original selfie
)
```

If the face check score is below 5, the system searches other strategy results for one with better face preservation, even if color accuracy is slightly lower. This tradeoff prioritizes identity preservation over product accuracy.

#### 2.2.8 Refinement Loop (Phase 4)

The refinement system has two modes:

**Auto-refinement** (color 6-8, other scores acceptable):
```typescript
const isAutoRefinement = bestVerification.colorScore >= 6 && bestVerification.colorScore < 8
  && bestVerification.naturalWearScore >= 6 && bestVerification.skinToneScore >= 7
```

**Forced refinement** (color < 6, naturalWear < 6, or skinTone < 7):

The refinement prompt is built from **specific corrections** extracted from the verification issue description:

```typescript
const corrections: string[] = []
if (bestVerification.colorScore < 8) {
  corrections.push(`COLOR FIX: ${bestVerification.issue}`)
  corrections.push('COLOR IS THE #1 PRIORITY.')
  corrections.push(`The MAIN color must be: ${productInfo.mainColor}`)
}
if (bestVerification.naturalWearScore < 6) {
  corrections.push('NATURAL FIT FIX: Product looks pasted on. Add realistic shadows...')
}
if (bestVerification.skinToneScore < 7) {
  corrections.push('SKIN TONE FIX: Restore original skin tone...')
}
```

Refinement uses **dual-image editing** (result + product reference) as primary, falling back to single-image editing:

```
Pass 1: safeImageEditDual(correctionPrompt, result, productImage, size)
        → If fails: safeImageEdit(correctionPrompt, result, size)
        → Verify → If improved, use refined result

Pass 2: safeImageEditDual(specificPrompt, refined, productImage, size)
        → Only if: still needs refinement AND not auto-refinement success
        → Verify → If improved, use refined2 result
```

Auto-refinement succeeds if it achieves color ≥ 8, skipping the second pass.

#### 2.2.9 Product-Overlay Composite (Phase 4.5)

If color accuracy is still below 6 after refinement, the system attempts a **product-overlay composite** — a dual-image edit that passes the current AI result as the first image and the original product as the second:

```typescript
const compositePrompt = `Blend the product from the SECOND image into the person 
wearing it in the FIRST image. COLOR IS #1 PRIORITY. Use EXACT colors from 
the SECOND image. Keep the person's face and body EXACTLY as in the FIRST image.`

const compositeResult = await safeImageEditDual(
  compositePrompt, finalResult.imageUrl, productImageBase64, config.size
)
```

This is effectively asking the model to "color-correct the product in the existing result using the real product as reference."

---

### 2.3 Try-On API Route

**File:** `src/app/api/try-on/route.ts` (~753 lines)

#### 2.3.1 POST Handler — Job Creation

The POST handler creates a try-on job and starts background processing. It has **different code paths for Vercel vs local** deployments:

**Vercel Deployment Path:**
```
1. Try proxy to sandbox AI service (ZAI_PROXY_URL)
2. If proxy unavailable → Start HuggingFace async (create job, return jobId)
3. If HF setup fails → Return canvas mode (non-AI overlay)
```

**Local Development Path:**
```
1. Check ZAI availability
2. If ZAI unavailable → Start HuggingFace async
3. If HF fails → Return canvas mode
4. If ZAI available → Resolve product → Start full pipeline
```

**Product Image Resolution** is a critical function that handles multiple image sources:

```typescript
async function getProductImageBase64(imagePath: string): Promise<string | null> {
  // 1. External URLs (http/https) → direct fetch
  // 2. Protocol-relative URLs (//) → prepend https:
  // 3. Image proxy URLs (/api/image-proxy?url=...) → extract original URL
  // 4. Local paths → fetch via HTTP (works on Vercel CDN + local Next.js)
  // 5. Last resort: filesystem read (local dev only, not Vercel)
}
```

**Product Resolution Chain:**
```
1. Database (Prisma) → db.product.findUnique()
2. Client-provided details (productName, categorySlug from POST body)
3. Shopify fallback → fetchShopifyProducts()
4. Static products → getStaticProductById()
5. Canvas mode fallback → returnCanvasMode()
```

#### 2.3.2 GET Handler — Job Polling

```typescript
export async function GET(request: NextRequest) {
  const jobId = searchParams.get('jobId')
  const job = getJob(jobId)
  
  // If job not found locally, try proxy
  if (!job && proxyUrl) {
    return await fetch(`${proxyUrl}/api/try-on?jobId=${jobId}`)
  }
  
  return NextResponse.json({
    jobId, status: job.status, imageUrl: job.imageUrl,
    progress: job.progress, pipelinePhase: job.pipelinePhase,
    colorAccuracy: job.colorAccuracy, faceAccuracy: job.faceAccuracy,
    strategy: job.strategy, suggestions: job.suggestions,
  })
}
```

#### 2.3.3 Canvas Fallback Mode

The `returnCanvasMode()` function ALWAYS returns HTTP 200 with a special `mode: 'canvas'` response. The frontend detects this and generates a client-side canvas overlay instead of showing an error:

```typescript
function returnCanvasMode(productImageUrl, productImageBase64, productName, categorySlug, message?) {
  return NextResponse.json({
    mode: 'canvas',
    code: 'AI_CANVAS_MODE',
    message: message || 'AI style preview is temporarily unavailable...',
    productImageBase64, productImageUrl, productName, categorySlug,
  }, { status: 200 })
}
```

#### 2.3.4 Proxy Support for Vercel

On Vercel, the ZAI SDK is unavailable (serverless functions can't connect to the sandbox AI service). The route supports proxying through the sandbox:

```typescript
function buildProxyUrl(proxyUrl: string, path: string, queryParams?) {
  const base = proxyUrl.replace(/\/+$/, '')
  return queryParams ? `${base}${path}?${new URLSearchParams(queryParams)}` : `${base}${path}`
}

function getProxyHeaders(proxyUrl: string) {
  // For .space-z.ai gateway, add 'Abc' header with subdomain
  if (hostname.includes('.space-z.ai')) {
    headers['Abc'] = hostname.split('.')[0]
  }
}
```

---

### 2.4 Try-On Frontend

**File:** `src/components/try-on-dialog.tsx` (~1000+ lines)  
**Note:** The active version is embedded in `product-detail.tsx`; this standalone file is deprecated but contains the canonical UI logic.

#### 2.4.1 User Flow

```
Step 1: Upload Selfie
  ├── File selection (click or drag-drop)
  ├── Image compression (max 1024px, quality 0.8, JPEG)
  └── Image moderation (optional VLM check)

Step 2: Preview & Confirm
  ├── Show selfie preview
  ├── Show product thumbnail
  └── "Generate Try-On" button

Step 3: Generating (async)
  ├── POST /api/try-on → { jobId }
  ├── Poll GET /api/try-on?jobId=X every 3 seconds
  ├── Progress bar with phase-based percentage
  └── Educational AI facts (rotating every 3 seconds)

Step 4: Result Display
  ├── AI-generated try-on image
  ├── "AI-Generated Image" disclaimer
  ├── "Try Again" and "Download" buttons
  └── Style suggestions (complementary products)
```

#### 2.4.2 Image Compression

Client-side compression reduces upload payload significantly:

```typescript
function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<string> {
  // 1. Read file as data URL
  // 2. Load into <img> element
  // 3. Scale to max 1024px on longest side
  // 4. Draw to canvas at reduced size
  // 5. Export as JPEG at 80% quality
  // Returns: data:image/jpeg;base64,...
}
```

#### 2.4.3 Educational Facts During Generation

To keep users engaged during the 30-90 second generation time:

```typescript
const AI_EDUCATION_FACTS = [
  "📸 AI analyzes your facial features to create a personalized try-on experience",
  "🎨 Our AI preserves your skin tone and facial features while adding the product",
  "⚡ The AI processes over 1 million pixels to generate your style preview",
  // ... 10 facts total, rotating every 3 seconds
]
```

#### 2.4.4 Canvas Fallback (Client-Side)

When all AI strategies fail, the client generates a non-AI overlay:

```typescript
async function generateCanvasFallback(): Promise<string> {
  // 1. Draw selfie as base image
  // 2. Add vignette overlay (radial gradient)
  // 3. Draw product panel (bottom-right, semi-transparent card with product image)
  // 4. Add "STYLE PREVIEW" badge (top-left)
  // 5. Add "3BOXES GIFTS · AI Style Preview" branding
  // NEVER returns null — has minimal placeholder fallback
}
```

The canvas fallback:
- Uses the selfie as background
- Overlays the product image in a styled card panel
- Adds branding badges
- Handles CORS issues via `/api/image-proxy` for external images
- Has a 5-second timeout for product image loading
- Falls back to a minimal placeholder if even the selfie fails to load

#### 2.4.5 Client-Side Multi-Strategy Flow

The frontend has its own fallback chain that supplements the server-side one:

```
Strategy 1: POST /api/try-on (server handles AI)
  ↓ If returns canvas mode (AI unavailable on server):
Strategy 2: Direct client-to-proxy call (bypass server, hit sandbox directly)
  ↓ If proxy unavailable:
Strategy 3: Client-side canvas overlay (always succeeds)
```

---

## 3. AI Shopping Assistant

**Files:**
- `src/app/api/ai-assistant/route.ts` (149 lines)
- `src/components/ai-assistant.tsx` (293 lines)

### 3.1 Architecture

The AI Shopping Assistant is a conversational gift recommendation system using ZAI's `glm-4-flash` chat model.

**Data Flow:**
```
User Message → POST /api/ai-assistant
  → ZAI glm-4-flash chat completion
  → Parse hidden <!--FILTERS: {...}--> from response
  → Save recommendation to DB (AIRecommendation table)
  → Return { reply, filters }

Frontend receives filters → "Apply Filters & View Gifts" button
  → setGiftFilter(filters) in Zustand store
  → Navigates to filtered product grid
```

### 3.2 System Prompt Design

The assistant's system prompt is a structured conversation flow:

1. **Greet** → Ask about OCCASION
2. Ask about RECIPIENT
3. Ask about RELATIONSHIP
4. Ask about BUDGET
5. Ask about PREFERENCES
6. When enough info → Give 2-3 category recommendations

**Hidden Filter Block** — The assistant embeds structured filters in an HTML comment:

```
<!--FILTERS:{"occasion":"birthday","recipient":"for-her","relationship":"spouse","priceRange":"2500-5000"}-->
```

This is parsed server-side with regex, stripped from the visible response, and saved to the database for analytics:

```typescript
function parseFilters(text: string): Record<string, string> | null {
  const match = text.match(/<!--FILTERS:(\{[^}]+\})-->/)
  return match ? JSON.parse(match[1]) : null
}
```

### 3.3 UI Design

The assistant is a floating chat bubble (bottom-right) with:
- Animated entry/exit via Framer Motion
- Quick-start buttons for common gift scenarios
- Typing indicator with loading spinner
- "Apply Filters" action button when filters are detected
- Responsive sizing: `w-[min(400px,calc(100vw-2rem))]`

---

## 4. AI Image Moderation

**File:** `src/app/api/moderate-image/route.ts` (94 lines)

### 4.1 Implementation

Uses VLM (`glm-4v-plus`) to analyze uploaded selfies for content safety:

```typescript
const result = await zai.chat.completions.createVision({
  model: 'glm-4v-plus',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this selfie image... Check: 1) Clear human face? 2) Appropriate content? 3) Clear enough? 4) Appears to be a selfie?' },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ],
  }],
})
```

Returns a structured response:
```typescript
{
  appropriate: boolean,
  faceDetected: boolean,
  clear: boolean,
  selfie: boolean,
  reason?: string  // "No face detected", "Image too blurry", etc.
}
```

### 4.2 Fail-Open Policy

The moderation system **fails open** — if VLM analysis fails, times out, or returns unparseable results, the image is allowed through:

```typescript
// Timeout — allow through
if (!result) analysis = { faceDetected: true, appropriate: true, clear: true, selfie: true }

// VLM error — allow through
catch (vlmErr) {
  analysis = { faceDetected: true, appropriate: true, clear: true, selfie: true }
}
```

This design choice prioritizes user experience over content safety strictness. The reasoning is that false positives (blocking valid selfies) are worse for conversion than false negatives (allowing marginal images).

---

## 5. VLM (Vision Language Model) Usage

**File:** `src/lib/zai.ts` (274 lines)

### 5.1 ZAI SDK Wrapper

The `zai.ts` module provides a unified interface to the ZAI AI service with three discovery strategies:

```
Strategy 1: Explicit config (env vars or .z-ai-config file)
  → ZAI_BASE_URL + ZAI_API_KEY
  → Falls back to files: .z-ai-config, ~/.z-ai-config, /etc/.z-ai-config

Strategy 2: SDK auto-discovery (ZAI.create())
  → Works in sandbox environment without explicit config
  → Disabled on Vercel (no sandbox access)

Strategy 3: Proxy URL (ZAI_PROXY_URL)
  → Forwards requests through the sandbox gateway
```

### 5.2 Health Check Caching

Reachability checks are cached to avoid hammering the AI service:

```typescript
let healthCache: { reachable: boolean; timestamp: number } | null = null
const HEALTH_CACHE_TTL = 30_000  // 30 seconds for direct
const PROXY_HEALTH_CACHE_TTL = 60_000  // 60 seconds for proxy
```

### 5.3 VLM Usage Across the Platform

| Use Case | Model | Function | Timeout |
|---|---|---|---|
| Product Analysis | glm-4v-plus | `vlmAnalyze()` | 30s |
| Result Verification | glm-4v-plus | `vlmCompare()` | 45s |
| Face Preservation | glm-4v-plus | `vlmCompare()` | 45s |
| Image Moderation | glm-4v-plus | Direct call | 30s |
| Gift Recommendations | glm-4-flash | Chat completion | N/A |
| Selfie Keypoint Analysis | glm-4v-plus | Direct call | 30s |

### 5.4 Environment Variables

```bash
ZAI_BASE_URL=http://172.25.136.193:8080/v1   # AI service URL
ZAI_API_KEY=Z.ai                                # API authentication key
ZAI_CHAT_ID=chat-97b5f242-...                   # Chat session ID
ZAI_TOKEN=eyJhbGci...                           # JWT auth token
ZAI_USER_ID=d71b6964-...                        # User identifier
ZAI_PROXY_URL=https://xxx.space-z.ai            # Sandbox proxy (for Vercel)
HF_API_TOKEN=hf_...                             # HuggingFace authentication
```

---

## 6. Watermark System

**File:** `src/lib/watermark.ts` (153 lines)

### 6.1 Implementation

Uses **Sharp** (Node.js image processing) to composite a branded watermark at the bottom-right corner of try-on results.

**Two watermark modes:**

1. **Logo + Text Composite** (when `public/images/logo-uploaded.png` exists):
   - Scales logo to 8% of image height with 60% opacity
   - Renders "3BOXES GIFTS" text in gold gradient
   - Renders "AI Style Preview" sub-text
   - Composites logo + text side by side

2. **Text-Only Fallback** (when logo file is unavailable):
   - SVG-rendered "3BOXES GIFTS" with gold gradient (`#b8860b` → `#daa520` → `#b8860b`)
   - "AI Style Preview" sub-text at 60% opacity
   - Dark rounded rectangle background

```typescript
export async function addWatermark(imageDataUrl: string): Promise<string> {
  const imageBuffer = Buffer.from(base64Match[2], 'base64')
  const { width, height } = await sharp(imageBuffer).metadata()
  const wmBuffer = await getWatermarkBuffer(width, height)
  
  const watermarkedBuffer = await sharp(imageBuffer)
    .composite([{ input: wmBuffer, left, top }])
    .png()
    .toBuffer()
  
  return `data:image/png;base64,${watermarkedBuffer.toString('base64')}`
}
```

The watermark is positioned with `2%` padding from the bottom-right edge, ensuring it doesn't obscure the product/person but is clearly visible.

---

## 7. AI Strategy Decision Tree

The complete fallback chain, from highest quality to guaranteed delivery:

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. HuggingFace IDM-VTON (Free, Real Virtual Try-On)            │
│    ├── Manual Gradio REST API (most reliable)                   │
│    ├── @gradio/client (automatic wake-up)                       │
│    └── HF Inference API / instruct-pix2pix (serverless)         │
│    Quality: ★★★★★  Cost: Free  Latency: 30-180s                │
│    ↓ (if all HF strategies fail)                                │
├──────────────────────────────────────────────────────────────────┤
│ 2. ZAI Dual-Image Edit (Sees both selfie + product)            │
│    Model can reference actual product colors                    │
│    Quality: ★★★★☆  Cost: Paid  Latency: 10-30s                │
│    ↓ (if dual-image edit fails)                                 │
├──────────────────────────────────────────────────────────────────┤
│ 3. ZAI Selfie Edit (Sees person, text description of product)  │
│    Good face preservation, may have color drift                 │
│    Quality: ★★★☆☆  Cost: Paid  Latency: 10-20s                │
│    ↓ (if selfie edit fails)                                     │
├──────────────────────────────────────────────────────────────────┤
│ 4. ZAI Product Edit (Sees product, text description of person) │
│    Good color accuracy, face won't match                        │
│    Quality: ★★★☆☆  Cost: Paid  Latency: 10-20s                │
│    ↓ (if product edit fails)                                    │
├──────────────────────────────────────────────────────────────────┤
│ 5. ZAI Text-to-Image (No image reference)                      │
│    No visual reference at all — pure text generation            │
│    Quality: ★★☆☆☆  Cost: Paid  Latency: 10-20s                │
│    ↓ (if text-to-image fails)                                   │
├──────────────────────────────────────────────────────────────────┤
│ 6. Canvas Overlay (Non-AI, client-side)                        │
│    Selfie background + product image panel + branding           │
│    Quality: ★☆☆☆☆  Cost: Free  Latency: <1s                   │
│    GUARANTEED — always produces a visual result                 │
└──────────────────────────────────────────────────────────────────┘
```

Additionally, after any ZAI generation (strategies 2-5), the pipeline applies:

- **VLM Verification** — 6-dimension quality check
- **Face Preservation Check** — if face score < 7
- **Up to 2 Refinement Passes** — with specific correction instructions
- **Product-Overlay Composite** — if color accuracy < 6 after refinement

---

## 8. AI Service Architecture

### 8.1 ai-proxy Mini-Service

**File:** `src/app/api/ai-proxy/route.ts` (193 lines)

The AI proxy runs on the sandbox (localhost:3000) and forwards requests to the internal ZAI service at `172.25.136.193:8080/v1`. This is critical for Vercel deployments where the serverless function can't reach the internal AI service directly.

**Security:** Only allows specific AI endpoint paths:
```typescript
const ALLOWED_PATHS = [
  '/chat/completions',
  '/chat/completions/vision',
  '/images/generations',
  '/images/generations/edit',
  '/audio/tts',
  '/audio/asr',
  '/video/generation',
  '/async-result',
  '/functions/invoke',
]
```

**Authentication headers:**
```typescript
{
  'Authorization': `Bearer Z.ai`,
  'X-Z-AI-From': 'Z',
  'X-Chat-Id': AI_CONFIG.chatId,
  'X-User-Id': AI_CONFIG.userId,
  'X-Token': AI_CONFIG.token,
}
```

**Image URL resolution:** For image generation results, the proxy downloads HTTP URLs and converts them to base64 before returning to the client, avoiding CORS issues.

### 8.2 Service Communication Topology

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel CDN    │────▶│  Next.js Server  │────▶│  ZAI Service    │
│   (Frontend)    │     │  (API Routes)    │     │  172.25.x:8080  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────────┐
              │ HF Space │ │ ai-proxy │ │ HuggingFace  │
              │ IDM-VTON │ │ :3030    │ │ Inference API│
              └──────────┘ └──────────┘ └──────────────┘
```

On **local development**, the Next.js server connects to ZAI directly.
On **Vercel**, the Next.js server proxies through the sandbox's ai-proxy route.

---

## 9. Code Architecture Patterns

### 9.1 Job-Based Async Processing

The try-on system uses a **create-then-poll** pattern:

```typescript
// Server: Create job, start background processing
const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
createJob(jobId, { categorySlug, productName })
runPipeline({ jobId, ... }).catch(console.error)
return NextResponse.json({ jobId, status: 'processing' })

// Client: Poll for completion
const pollInterval = setInterval(async () => {
  const res = await fetch(`/api/try-on?jobId=${jobId}`)
  const data = await res.json()
  if (data.status === 'completed') { /* show result */ }
  if (data.status === 'failed') { /* canvas fallback */ }
}, 3000)
```

Jobs are stored in-memory with automatic TTL cleanup (15 minutes max).

### 9.2 Multi-Strategy with Progressive Fallback

Every AI operation tries the best strategy first, then degrades:

```
HuggingFace (3 sub-strategies) → ZAI (4 sub-strategies) → Canvas
```

Within ZAI, strategies are ordered by expected quality:
```
Dual-image > Selfie-edit > Product-edit > Text-to-image
```

### 9.3 VLM-in-the-Loop Quality Verification

The pipeline doesn't just generate and deliver — it **verifies** every result through VLM comparison against the original product. This creates a quality feedback loop:

```
Generate → Verify → (if needed) Refine → Re-verify → (if needed) Composite → Re-verify
```

### 9.4 Category-Specific Prompt Engineering

Rather than one-size-fits-all prompts, each of the 28+ product categories has:
- Specific placement instructions ("draped in traditional Indian style with pallu over left shoulder")
- Color focus rules ("saree fabric color, border color, and zari/work color")
- Camera framing ("Close-up beauty photograph from chest up" vs "Full-body professional fashion photograph")
- Strategy preference (sarees: `useProductEdit: false` because they're too complex for product-first editing)

### 9.5 Image Preprocessing Pipeline

```
Original File (up to 10MB)
  → Client compression (max 1024px, JPEG 80%)
  → Base64 data URL
  → Server-side: decode, validate format
  → ZAI API: base64 in images array
  → Result: base64 response
  → Sharp watermark compositing
  → Final base64 data URL
```

### 9.6 Rate Limiting

API calls are throttled with a 1200ms delay between each ZAI call:

```typescript
const API_CALL_DELAY = 1200
await delay(API_CALL_DELAY)  // Before each VLM/generation call
```

This prevents hitting rate limits on the ZAI service while the pipeline runs its 8-15 API calls per try-on request.

---

## 10. Performance & Cost Analysis

### 10.1 HuggingFace (IDM-VTON)

| Metric | Value |
|---|---|
| **Cost** | Free (public Space) |
| **Cold Start** | 1-2 minutes (Space sleeping → running) |
| **Inference Time** | 30-90 seconds |
| **Queue Wait** | 0-5 minutes (shared public resource) |
| **Quality** | Best for wearable garments (shirts, sarees) |
| **Limitations** | Struggles with non-wearable products (jewelry, fragrances); Space may be down; No SLA |

**Mitigation:** Pre-warming (`preWarmSpace()`) triggers Space wake-up before user interaction. The 180-second polling timeout accommodates cold starts.

### 10.2 ZAI API

| Metric | Value |
|---|---|
| **Cost** | Paid API (per-call) |
| **Latency** | 10-30 seconds per call |
| **Calls per Try-On** | 8-15 (analysis + generation + verification + refinement) |
| **Quality** | Good for all product categories |
| **Strengths** | Dual-image support, always available, fast |
| **Limitations** | Color accuracy varies; face preservation not guaranteed |

**Mitigation:** Multi-strategy generation + VLM verification + refinement loop ensures minimum quality bar.

### 10.3 Cost Optimization Strategy

The fallback chain is designed to **minimize cost while maximizing availability**:

1. **HuggingFace first** — Free, so no cost incurred for successful try-ons
2. **ZAI only when needed** — Only falls back to paid API when HF fails
3. **VLM verification prevents wasted deliveries** — Bad results are refined rather than accepted
4. **Canvas fallback is free** — Non-AI overlay costs nothing

### 10.4 Typical API Call Budget per Try-On

**Best case (HuggingFace succeeds):** 1-3 API calls (HF Space interaction)
**Typical case (ZAI pipeline):** 10-15 API calls
- Phase 1: 2 VLM calls (product + person analysis)
- Phase 2: 1-4 generation calls (strategies A-D)
- Phase 3: 1-4 VLM verification calls
- Phase 3.5: 0-1 VLM face check
- Phase 4: 2-4 VLM + generation (refinement passes)
- Phase 5: 1 watermark (Sharp, local)

**Worst case (all strategies fail):** 0 AI calls, canvas overlay

### 10.5 Latency Budget

| Phase | Typical | Worst Case |
|---|---|---|
| Phase 0 (suggestions) | 0.5s | 2s |
| Phase 0.5 (HF try-on) | 45s | 180s |
| Phase 1 (analysis) | 5s | 15s |
| Phase 2 (generation) | 10s | 60s |
| Phase 3 (verification) | 10s | 30s |
| Phase 3.5 (face check) | 5s | 15s |
| Phase 4 (refinement) | 15s | 45s |
| Phase 5 (watermark) | 1s | 2s |
| **Total (HF success)** | ~50s | ~180s |
| **Total (ZAI pipeline)** | ~50s | ~170s |
| **Total (canvas fallback)** | <1s | <1s |

---

## Appendix A: Key Function Signatures

```typescript
// HuggingFace Integration
function tryOnWithHuggingFace(
  personImageBase64: string,
  garmentImageBase64: string,
  productDescription: string,
  categorySlug: string,
  onProgress?: (msg: string) => void,
): Promise<HFTryOnResult>

function checkIDMVTONSpaceStatus(): Promise<{ status: string; url: string }>
function preWarmSpace(): Promise<boolean>
function isHuggingFaceAvailable(): boolean

// Pipeline
function runPipeline(input: PipelineInput): Promise<void>
function createJob(id: string, data: Partial<TryOnJob>): TryOnJob
function getJob(id: string): TryOnJob | undefined

// VLM
function vlmAnalyze(prompt: string, imageUrl: string, timeoutMs?: number): Promise<string>
function vlmCompare(prompt: string, image1Url: string, image2Url: string, timeoutMs?: number): Promise<string>
async function createZAI(): Promise<InstanceType<typeof ZAI>>
async function isZAIAvailable(): Promise<{ available: boolean; mode: string; reason?: string }>

// Image Generation
function safeImageEdit(prompt: string, imageUrl: string, size: ImageSize): Promise<string | null>
function safeImageEditDual(prompt: string, selfieUrl: string, productUrl: string, size: ImageSize): Promise<string | null>
function safeImageCreate(prompt: string, size: ImageSize): Promise<string | null>

// Watermark
function addWatermark(imageDataUrl: string): Promise<string>

// Image Moderation
POST /api/moderate-image { imageBase64: string } → { appropriate, faceDetected, clear, selfie, reason? }
```

## Appendix B: Error Code Reference

| Code | Meaning | Client Action |
|---|---|---|
| `AI_CANVAS_MODE` | All AI strategies unavailable | Show canvas overlay |
| `AI_STYLE_SERVICE_UNAVAILABLE` | ZAI not configured/reachable | Try HuggingFace or canvas |
| `HF_SPACE_SLEEPING` | IDM-VTON Space is waking up | Show "Please wait" message |
| `HF_SPACE_BUILDING` | IDM-VTON Space is deploying | Show "Try again in 2-3 minutes" |
| `HF_AUTH_FAILED` | HF_API_TOKEN missing/invalid | Log error, try ZAI |
| `HF_RATE_LIMITED` | Space queue is full | Show "Please wait" message |

---

*This document covers the complete AI strategy and code architecture for the 3boxes.in platform. For deployment-specific details, see the Vercel Deployment Guide. For the broader platform architecture, see the Architecture Deep-Dive documentation.*
