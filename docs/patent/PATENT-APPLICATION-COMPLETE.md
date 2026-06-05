# COMPLETE PATENT APPLICATION

**Application Type:** Non-Provisional / Complete Patent Application  
**Date of Filing:** [To be determined]  
**Applicant:** 3 BOXES GIFTS Private Limited  
**Inventors:** [To be listed]  
**Jurisdiction:** India (primary), with PCT and USPTO designations  
**Document Version:** 1.0  
**Classification:** G06Q 30/06, G06V 20/41, G06N 3/08, G06Q 30/0207, G06F 16/9535  
**Last Updated:** March 5, 2026  

---

## 1. TITLE OF INVENTION

**System and Method for AI-Powered Multi-Portal E-Commerce Aggregation with Social Fashion Analysis and Family Occasion Shopping**

---

## 2. ABSTRACT

A system and method for AI-powered multi-portal e-commerce aggregation with social fashion analysis and family occasion shopping is disclosed. The invention integrates six novel subsystems: (1) an AI Virtual Try-On system employing a multi-strategy cascading pipeline that sequentially attempts AI proxy generation, direct SDK generation, and canvas overlay fallback to produce photorealistic product visualization images with Vision Language Model (VLM) verification and iterative color accuracy refinement; (2) a 3Box Curate system that aggregates products from multiple third-party e-commerce portals, AI-curates them into themed bundles, and enables purchase on behalf of the user as a single consolidated package with tri-partite consent management; (3) a Social Style Integration system that imports user fashion preference data from OAuth-connected social media platforms with explicit consent, applies AI fashion analysis to generate a style profile comprising style archetypes, color preferences, brand affinities, and shopping patterns, and produces personalized product recommendations; (4) a Family Occasion-Based Shopping engine that dynamically generates occasion-specific product packages based on family composition analysis including age, gender, and relationship categorization with tiered discount pricing; (5) an AI Gift Builder implementing a multi-step conversational gift recommendation engine with constraint satisfaction across occasion, recipient, relationship, budget, and category dimensions; and (6) a Corporate Gifting Campaign Management system enabling multi-recipient campaign creation with branding customization, CSV recipient import, per-recipient product and budget overrides, and delivery orchestration. The system is characterized by its integration of cross-portal shopping aggregation with social fashion intelligence and family-centric occasion shopping, a combination not found in the prior art.

---

## 3. CROSS-REFERENCE TO RELATED APPLICATIONS

This application claims the benefit of [Provisional Application No. ___________], filed [Date], entitled "System and Method for AI-Powered Multi-Strategy Virtual Try-On with Vision Language Model Verification and Color Accuracy Refinement for Non-Wearable Luxury Presentation Items," which is incorporated herein by reference in its entirety.

This application is related to co-pending application [Application No. ___________], entitled "AI-Generated Virtual Try-On for Non-Wearable Luxury Gift Packaging and Presentation Items," the disclosure of which is incorporated herein by reference.

---

## 4. BACKGROUND OF THE INVENTION

### 4.1 Field of the Invention

The present invention relates generally to the field of computer-implemented electronic commerce systems. More specifically, the invention relates to an artificial intelligence-powered multi-portal e-commerce aggregation platform that integrates: (a) a multi-strategy AI virtual try-on pipeline with cascading fallback architecture; (b) cross-portal shopping aggregation with AI-curated product bundling and consolidated purchasing; (c) social media-based fashion preference analysis with OAuth consent management; (d) family composition-aware occasion-based shopping with dynamic package generation; (e) a multi-step conversational AI gift recommendation engine with constraint satisfaction; and (f) corporate gifting campaign management with multi-recipient orchestration and branding customization.

The invention finds particular application in luxury e-commerce platforms where customers seek personalized shopping experiences across multiple product categories and vendor portals, and where existing single-portal e-commerce systems fail to provide integrated social fashion intelligence, family-centric occasion shopping, and cross-portal product aggregation.

### 4.2 Description of Related Art

Electronic commerce has evolved significantly from single-vendor online stores to multi-vendor marketplaces. However, the prior art suffers from fundamental limitations that the present invention addresses.

#### 4.2.1 Single-Portal E-Commerce Limitations

Existing e-commerce platforms such as Amazon, Flipkart, Myntra, and Nykaa operate as siloed portals. A customer shopping for a luxury gift must browse each portal independently, compare products across tabs, and execute separate transactions on each platform. There is no system that aggregates products from multiple third-party e-commerce portals, curates them into themed bundles, and enables consolidated purchasing on behalf of the user as a single transaction.

**Amazon** (US 11,580,592 B2) discloses a customized virtual store system, but it is limited to Amazon's own inventory and does not aggregate products from competing e-commerce platforms. Amazon's "Frequently Bought Together" feature suggests complementary products within Amazon's catalog but cannot curate bundles spanning Myntra, Nykaa, and CaratLane simultaneously.

**Flipkart** provides category-based browsing and wishlists, but operates exclusively within its own product catalog. There is no mechanism for importing or displaying products from Myntra, Nykaa, or Tanishq within the Flipkart shopping experience.

**Myntra** focuses exclusively on fashion and lifestyle products within its own inventory. While Myntra offers style recommendations, these are based solely on in-app browsing behavior and do not incorporate social media fashion data or cross-portal product availability.

**Nykaa** specializes in beauty and wellness products within its own catalog. Nykaa's recommendation engine is limited to its own inventory and browsing data, with no cross-portal aggregation capability.

#### 4.2.2 Virtual Try-On Limitations

Virtual try-on technology has been extensively patented for wearable items (clothing, jewelry, spectacles) by major technology companies including Snap Inc. (US 11,830,118), Amazon (US 11,315,162), and Google (US 11,158,121). However, these systems share critical limitations:

(a) **Single-Strategy Generation:** All existing virtual try-on systems employ a single generation approach. If the generation fails due to service unavailability, the entire feature becomes non-functional. There is no cascading fallback architecture that degrades gracefully from AI generation to canvas overlay.

(b) **No Cross-Platform Deployment Intelligence:** Existing systems are designed for a single deployment environment and do not include intelligent proxy routing that adapts to local development, serverless cloud, or mobile PWA environments.

(c) **Absence of Quality Verification:** No existing patent discloses automated VLM-based quality verification of generated try-on images with multi-dimensional scoring.

#### 4.2.3 Social Commerce Limitations

Social commerce platforms such as Instagram Shopping and Pinterest allow users to discover products through social content. However, these platforms have fundamental limitations:

(a) **Passive Discovery:** Products are shown based on algorithmic feeds rather than active analysis of the user's fashion preferences derived from their social media activity.

(b) **No Cross-Platform Aggregation:** Instagram Shopping shows products from Instagram merchants only, not from Myntra, Nykaa, or Flipkart.

(c) **No Style Profile Generation:** There is no system that connects to a user's social media accounts with explicit consent, analyzes their fashion preferences across platforms, and generates a comprehensive style profile with style archetypes, color preferences, brand affinities, and shopping patterns.

(d) **Privacy Violations:** Some systems scrape social media data without explicit user consent. The present invention implements a consent-first approach with tri-partite consent management.

#### 4.2.4 Family Shopping Limitations

No existing e-commerce platform provides occasion-based shopping that dynamically generates product packages based on family composition. Existing approaches require the customer to manually select individual products for each family member, without any intelligence about which products are appropriate for which family member demographics on which occasions.

#### 4.2.5 Gift Recommendation Limitations

Existing gift recommendation systems use simple rule-based filtering (e.g., "gifts for him under ₹5000"). No system implements a multi-step conversational AI engine with constraint satisfaction across five dimensions (occasion, recipient, relationship, budget, category) that combines catalog product recommendations with AI-generated suggestions beyond the catalog.

#### 4.2.6 Corporate Gifting Limitations

Existing corporate gifting solutions (e.g., Sendoso, Alyce) focus on single-recipient gift sending or simple bulk sending of the same product. No system provides a campaign management platform with per-recipient product and budget overrides, branding customization with corporate identity integration, CSV-based recipient import, and delivery orchestration within a unified luxury e-commerce platform.

### 4.3 Problems with Existing Solutions

The existing art suffers from the following critical deficiencies that the present invention addresses:

**a) Portal Fragmentation:** Customers must browse multiple e-commerce portals independently to find the best products across categories, resulting in a fragmented and time-consuming shopping experience.

**b) No Cross-Portal Bundling:** There is no system that curates products from multiple third-party e-commerce portals into themed bundles and enables consolidated purchasing on behalf of the user.

**c) Absence of Social Fashion Intelligence:** No e-commerce platform analyzes a user's social media activity to generate a fashion style profile that informs personalized product recommendations.

**d) No Family-Centric Occasion Shopping:** No system dynamically generates occasion-specific product packages based on family composition analysis including age, gender, and relationship categorization.

**e) Limited Gift Recommendation:** Existing gift recommendation is rule-based and does not employ multi-step conversational AI with constraint satisfaction.

**f) No Integrated Corporate Gifting:** Corporate gifting platforms are separate from luxury e-commerce platforms and do not provide campaign management with branding customization within the e-commerce experience.

**g) Single-Strategy Virtual Try-On:** Existing virtual try-on systems employ a single generation approach with no fallback mechanisms, resulting in complete feature failure during AI service outages.

**h) No Consent-First Social Data Processing:** Existing social commerce systems either passively show products or scrape social data without proper consent management.

---

## 5. SUMMARY OF THE INVENTION

### 5.1 Objects of the Invention

It is an object of the present invention to provide a system and method for AI-powered multi-portal e-commerce aggregation that overcomes the limitations of the prior art.

It is a further object of the invention to provide a 3Box Curate system that aggregates products from multiple third-party e-commerce portals, AI-curates them into themed bundles, and enables consolidated purchasing on behalf of the user as a single transaction.

It is a further object of the invention to provide an AI Virtual Try-On system with a multi-strategy cascading pipeline that gracefully degrades from AI proxy generation to direct SDK generation to canvas overlay fallback.

It is a further object of the invention to provide a Social Style Integration system that imports user fashion preference data from OAuth-connected social media platforms with explicit consent and generates a comprehensive style profile informing personalized product recommendations.

It is a further object of the invention to provide a Family Occasion-Based Shopping engine that dynamically generates occasion-specific product packages based on family composition analysis.

It is a further object of the invention to provide an AI Gift Builder implementing a multi-step conversational gift recommendation engine with constraint satisfaction across multiple dimensions.

It is a further object of the invention to provide a Corporate Gifting Campaign Management system enabling multi-recipient campaign creation with branding customization and delivery orchestration.

It is a further object of the invention to provide an integrated e-commerce platform that combines cross-portal product aggregation, social fashion intelligence, family-centric occasion shopping, AI gift recommendation, and corporate gifting within a unified shopping experience.

### 5.2 Key Innovations and Advantages

The present invention introduces the following key innovations not found in the prior art:

**Innovation 1: Multi-Portal Cross-Platform Product Aggregation with AI Curation.** The 3Box Curate system is the first e-commerce feature that aggregates products from multiple third-party e-commerce portals (Myntra, Nykaa, Amazon, Flipkart, CaratLane, Tanishq, Voylla, BlueStone), AI-curates them into themed bundles based on occasion, style, and complementary product logic, and enables consolidated purchasing on behalf of the user. The system acts as a purchasing proxy, acquiring products from multiple portals on behalf of the user and delivering them as a single curated package.

**Innovation 2: Multi-Strategy Cascading Virtual Try-On Pipeline.** The AI Virtual Try-On system employs a three-tier cascading architecture: (1) AI proxy generation via external proxy server; (2) direct SDK generation using local AI services; and (3) canvas overlay fallback using client-side HTML5 Canvas compositing. This cascading approach ensures the virtual try-on feature remains functional even during AI service outages, a capability absent from all prior art.

**Innovation 3: Social Style Integration with Consent-First Fashion Analysis.** The Social Style Integration system connects to a user's social media accounts (Instagram, Pinterest, Facebook) via OAuth 2.0 with explicit consent, analyzes fashion preferences using AI classification, and generates a comprehensive style profile comprising style archetypes, color preferences, brand affinities, and shopping patterns. This profile informs personalized product recommendations across the platform.

**Innovation 4: Family Composition-Aware Occasion Package Generation.** The Family Occasion Shopping engine classifies family members by age group (adult, child, elder), gender, and relationship, and dynamically generates occasion-specific product packages from occasion-specific product catalogs with tiered discount pricing based on family composition.

**Innovation 5: Multi-Step Conversational AI Gift Builder.** The AI Gift Builder implements a multi-step conversational recommendation engine that processes constraints across five dimensions (occasion, recipient, relationship, budget, category), combines catalog product recommendations with AI-generated suggestions beyond the catalog, and provides gift wrapping and presentation tips.

**Innovation 6: Corporate Campaign Management with Per-Recipient Customization.** The Corporate Gifting system enables campaign creation with per-recipient product and budget overrides, CSV-based recipient import, corporate branding customization (logo, colors, packaging style, custom messages), and delivery orchestration for both bulk and individual delivery modes.

**Innovation 7: Tri-Partite Consent Management for Cross-Portal Purchasing.** The 3Box Curate system implements tri-partite consent management requiring: (a) authorization consent for the platform to purchase on behalf of the user; (b) delivery consent for sharing the user's delivery address with third-party portals; and (c) terms acceptance for the consolidated purchasing arrangement. No existing system provides this consent framework for proxy purchasing across multiple e-commerce portals.

---

## 6. BRIEF DESCRIPTION OF DRAWINGS

The accompanying drawings, which are incorporated in and constitute a part of this specification, illustrate embodiments of the invention and, together with the description, serve to explain the principles of the invention.

**FIG. 1** is a high-level system architecture diagram illustrating the six major subsystems of the AI-Powered Multi-Portal E-Commerce Aggregation Platform and their interconnections, including the Frontend Layer, API Layer, AI Service Layer, Integration Layer, and Fallback Layer.

**FIG. 2** is a flow diagram illustrating the Multi-Strategy Cascading Virtual Try-On Pipeline, showing the sequential attempt of AI proxy generation, direct SDK generation, and canvas overlay fallback with the decision logic at each cascade point and the VLM verification and color accuracy refinement loop.

**FIG. 3** is a sequence diagram illustrating the 3Box Curate cross-portal shopping aggregation process, depicting the product discovery phase across multiple third-party e-commerce portals, the AI curation and bundle assembly phase, the tri-partite consent collection phase, and the consolidated purchasing and delivery orchestration phase.

**FIG. 4** is a flow diagram illustrating the Social Style Integration system, showing the OAuth 2.0 authentication flow for social media platform connections, the consent management interface, the AI fashion analysis pipeline that processes social data into style archetypes, color preferences, brand affinities, and shopping patterns, and the recommendation engine that generates personalized product suggestions.

**FIG. 5** is a flow diagram illustrating the Family Occasion-Based Shopping engine, showing the family composition input interface, the age/gender/relationship classification module, the occasion-specific product catalog lookup, the dynamic package generation algorithm with tiered discount pricing, and the package output with offers and delivery estimates.

**FIG. 6** is a flow diagram illustrating the AI Gift Builder multi-step conversational recommendation engine, showing the constraint collection phase (occasion, recipient, relationship, budget, category), the dual-path product recommendation (catalog search and AI-generated suggestions), the constraint satisfaction algorithm, and the conversational response generation with gift wrapping tips.

**FIG. 7** is an entity-relationship diagram illustrating the database schema relevant to the patentable features, including the PlatformIntegration, Product, CorporateAccount, CorporateCampaign, CampaignRecipient, CorporateBranding, and CustomerPortfolio models with their relationships and key fields.

**FIG. 8** is a data flow diagram illustrating the end-to-end flow from user product selection through virtual try-on, social style analysis, family package generation, gift recommendation, and corporate campaign management to order completion, showing the data transformations and API interactions at each stage.

**FIG. 9** is a sequence diagram illustrating the Corporate Gifting Campaign Management workflow, showing campaign creation, recipient import (individual and CSV), per-recipient product and budget customization, branding application, campaign approval workflow, and delivery orchestration.

**FIG. 10** is a state diagram illustrating the multi-tier consent management system, showing the consent states for social data import (OAuth scope consent, data processing consent, recommendation consent) and cross-portal purchasing (authorization consent, delivery consent, terms acceptance), with transitions between consent states.

---

## 7. DETAILED DESCRIPTION OF THE INVENTION

### 7.1 System Architecture

Referring to FIG. 1, the system architecture of the AI-Powered Multi-Portal E-Commerce Aggregation Platform comprises the following principal layers:

#### 7.1.1 Frontend Layer

The frontend layer consists of a Next.js 16 web application with server-side rendering capabilities, providing:

(a) **Product Browsing Interface:** A category-based product browsing interface displaying products from multiple sources including the platform's own inventory, Shopify headless commerce integration, and aggregated products from third-party e-commerce portals via the 3Box Curate system.

(b) **AI Virtual Try-On Interface:** A selfie upload interface with camera capture and file upload options, product selection for try-on, try-on result display with before/after comparison, and style pairing suggestion display. The interface supports three modes of operation: AI-generated mode, canvas overlay mode, and side-by-side style board mode.

(c) **Social Style Profile Interface:** An interface for connecting social media accounts via OAuth 2.0, viewing the generated style profile including style archetypes, color palette, brand affinities, and shopping patterns, and receiving personalized product recommendations based on the style profile.

(d) **Family Shopping Interface:** An interface for inputting family composition (members with age, gender, and relationship), selecting an occasion or festival, viewing generated packages with items for each family member, and applying offers and discounts.

(e) **AI Gift Builder Interface:** A conversational interface for multi-step gift recommendation, including occasion selection, recipient specification, relationship input, budget setting, category preferences, and free-form message input.

(f) **Corporate Gifting Portal:** A dedicated interface for corporate accounts including campaign creation, recipient management (individual and CSV import), branding customization, and campaign status tracking.

(g) **Progressive Web App (PWA) Capabilities:** The frontend is deployable as a PWA for Android and mobile devices, supporting offline caching, push notifications, and home screen installation.

#### 7.1.2 API Layer

The API layer consists of Next.js API routes handling:

(a) **Try-On API Routes:** `/api/try-on` (POST) for initiating try-on generation, `/api/try-on` (GET) for polling job status, `/api/try-on/status` for batch status queries, and `/api/try-on/remote` for remote proxy try-on generation.

(b) **Social Analysis API Routes:** `/api/social/analyze` (POST) for analyzing social media data and generating style profiles, receiving platform identifiers and consent flags as input.

(c) **Gift Recommendation API Routes:** `/api/gift-recommend` (POST) for multi-criteria gift recommendation with LLM-powered conversational response generation.

(d) **Family Package API Routes:** `/api/family/packages` (POST) for occasion-based package generation based on family composition.

(e) **Corporate Campaign API Routes:** `/api/corporate/campaigns` (GET/POST) for campaign listing and creation, `/api/corporate/campaigns/[id]` for campaign management, `/api/corporate/campaigns/[id]/recipients` for recipient management, `/api/corporate/branding` for branding customization, and `/api/corporate/recipients/import-csv` for CSV-based recipient import.

(f) **SmartBundle API Routes:** `/api/smartbundle/create` (POST) for 3Box Curate bundle creation with tri-partite consent validation.

(g) **Integration API Routes:** `/api/integrations` (GET/POST) for managing third-party e-commerce platform integrations, `/api/integrations/[id]` for individual integration management, `/api/integrations/sync` for product synchronization, and `/api/integrations/discover` for discovering available integrations.

(h) **Product Import API Routes:** `/api/product-import/search` for searching products on external platforms, `/api/product-import/scrape` for product data extraction, and `/api/product-import/import` for importing products into the local catalog.

(i) **Image Proxy Route:** `/api/image-proxy` for proxying external product images to avoid cross-origin resource sharing (CORS) restrictions.

#### 7.1.3 AI Service Layer

The AI service layer interfaces with:

(a) **Z-AI Web Development SDK (ZAI):** A multi-modal AI SDK providing image generation, image editing, vision language model (VLM) analysis, and chat completion capabilities. The ZAI SDK supports dual-image editing wherein both a user selfie image and a product reference image are simultaneously provided as input, enabling the AI model to directly perceive product colors from the reference image.

(b) **Image Generation Models:** AI models for text-to-image generation, including support for multiple image sizes (1024×1024, 768×1344, 864×1152, 1344×768, 1152×864, 1440×720, 720×1440).

(c) **Image Editing Models:** AI models for image editing supporting both single-image and dual-image input modes. The dual-image edit mode accepts both a selfie image and a product reference image simultaneously.

(d) **Vision Language Models (VLM):** Multi-modal models (e.g., GLM-4V-Plus) for product analysis, try-on verification, and face preservation checking. The VLM supports both single-image analysis and dual-image comparison modes.

(e) **Chat Completion Models:** Large language models for gift recommendation, AI assistant responses, and conversational interactions.

#### 7.1.4 Integration Layer

The integration layer provides:

(a) **Shopify Storefront API Integration:** Product data retrieval, cart management, and checkout processing via Shopify headless commerce, including product synchronization and webhook handling.

(b) **Third-Party Platform Integration:** Connections to external e-commerce platforms (Myntra, Nykaa, Amazon, Flipkart, CaratLane, Tanishq, BlueStone, Voylla) via the PlatformIntegration model, supporting product search, scraping, import, and affiliate link generation.

(c) **Image Proxy Service:** A server-side image proxy that fetches external product images and serves them to the frontend, avoiding CORS restrictions and enabling AI processing of external images.

(d) **Payment Gateway Integration:** Support for multiple payment providers (Razorpay, Stripe) with session management and verification.

(e) **Multi-Currency and Geo-Location Services:** Currency conversion rates, country detection, and language localization supporting 10 languages (English, Hindi, Chinese, Spanish, Japanese, Arabic, German, French, Korean, Portuguese).

#### 7.1.5 Fallback Layer

The fallback layer provides:

(a) **Canvas Overlay Compositing Engine:** A client-side HTML5 Canvas compositing system that creates a style preview by overlaying the product image onto the user's selfie with category-specific placement logic, opacity blending, blend mode selection (source-over for jewelry and watches; multiply for sarees and fashion), shadow effects, and vignette compositing.

(b) **Side-by-Side Style Board:** An alternative fallback that creates a two-panel style board with the user's selfie and the product image displayed side by side on a dark background with brand watermark.

(c) **Service Health Monitoring:** Automatic detection of AI service availability and automatic fallback triggering when AI services are unreachable.

### 7.2 AI Virtual Try-On Pipeline — Multi-Strategy Cascade with VLM Verification

Referring to FIG. 2, the AI Virtual Try-On Pipeline operates through a multi-strategy cascading architecture with VLM verification and iterative color accuracy refinement.

#### 7.2.1 Cascade Architecture

The cascade architecture implements three tiers of try-on generation, each attempted sequentially if the previous tier fails:

**Tier 1 — AI Proxy Generation:**

When the platform is deployed on a serverless cloud environment (e.g., Vercel), the system first attempts to route the try-on request through an external proxy server. The proxy server, identified by the ZAI_PROXY_URL environment variable, has direct access to AI services that may not be available from the serverless environment.

The proxy request includes: the product identifier, the user's selfie data (base64-encoded), the product image (base64-encoded, resolved server-side from the product catalog), the product name, and the category slug. The proxy server processes the request using its local AI service access and returns the job identifier and processing status.

The proxy communication uses custom authentication headers derived from the proxy URL hostname, enabling secure routing through the Z-AI infrastructure. Specifically, for proxy hosts matching the pattern `*.space-z.ai`, the system extracts the subdomain prefix and includes it as an authentication header.

If the proxy returns a successful response (HTTP 200), the result is returned to the client. If the proxy fails (network error, timeout, or non-200 response), the system cascades to Tier 2.

**Tier 2 — Direct SDK Generation:**

If the proxy is unavailable or the platform is running in a local development environment, the system attempts direct AI generation using the Z-AI SDK. The system first checks AI service availability using the `isZAIAvailable()` function, which verifies that the ZAI configuration (base URL and API key) is present and the service is reachable.

Even if the availability check returns negative, the system proceeds with generation attempts, as the health check may be flaky while actual SDK calls still succeed. The generation is handled by the `handleLocalAIGeneration()` function, which resolves product information from multiple sources (database, Shopify, static product catalog) and initiates the try-on pipeline.

If the AI service is completely unavailable (configuration missing, service unreachable), the system cascades to Tier 3.

**Tier 3 — Canvas Overlay Fallback:**

When all AI strategies fail, the system returns a canvas mode response with the product image data (base64-encoded, resolved from the product catalog URL or proxy URL) and a mode indicator of `canvas`. The frontend client-side canvas compositing engine then generates a style preview using HTML5 Canvas.

The canvas overlay fallback implements category-specific placement logic:

```
FUNCTION getDefaultPlacement(categorySlug, productName):
    IF categorySlug == "jewelry":
        IF productName contains "earring" OR "jhumka" OR "stud":
            RETURN {x: 0.5, y: 0.22, scale: 0.45, opacity: 0.92, blendMode: "source-over"}
        IF productName contains "necklace" OR "choker" OR "pendant":
            RETURN {x: 0.5, y: 0.42, scale: 0.55, opacity: 0.90, blendMode: "source-over"}
        IF productName contains "bracelet" OR "cuff" OR "bangle":
            RETURN {x: 0.3, y: 0.62, scale: 0.35, opacity: 0.92, blendMode: "source-over"}
        IF productName contains "ring":
            RETURN {x: 0.35, y: 0.65, scale: 0.25, opacity: 0.92, blendMode: "source-over"}
        RETURN {x: 0.5, y: 0.40, scale: 0.50, opacity: 0.90, blendMode: "source-over"}
    
    IF categorySlug == "watches":
        RETURN {x: 0.3, y: 0.58, scale: 0.35, opacity: 0.92, blendMode: "source-over"}
    
    IF categorySlug == "sarees" OR "fashion":
        RETURN {x: 0.5, y: 0.55, scale: 0.85, opacity: 0.70, blendMode: "multiply"}
    
    IF categorySlug == "mens-shirts":
        RETURN {x: 0.5, y: 0.45, scale: 0.70, opacity: 0.75, blendMode: "multiply"}
    
    IF categorySlug == "fragrances":
        RETURN {x: 0.78, y: 0.70, scale: 0.30, opacity: 0.88, blendMode: "source-over"}
    
    IF categorySlug == "leather-goods":
        RETURN {x: 0.35, y: 0.68, scale: 0.40, opacity: 0.88, blendMode: "source-over"}
    
    RETURN {x: 0.5, y: 0.5, scale: 0.50, opacity: 0.85, blendMode: "source-over"}
```

The canvas compositing process:

1. Draw the user's selfie as the base image at full canvas dimensions.
2. Calculate product placement based on category-specific default positioning.
3. Apply the specified blend mode and opacity. For multiply blend mode (sarees, fashion), the system first draws a white background under the product area to prevent dark artifacts, then applies the multiply blend, then overlays the product at reduced opacity for color accuracy. For source-over blend mode (jewelry, watches), the system adds a subtle shadow for realism.
4. Apply a radial vignette gradient for a polished appearance.
5. Convert the canvas to a base64 PNG data URL for display.

#### 7.2.2 Multi-Strategy Generation Pipeline

When AI generation is available (Tier 1 or Tier 2), the pipeline executes the following phases:

**Phase 1: Product Analysis and Person Description**

The system simultaneously submits two VLM analysis requests:

(a) **Product Analysis:** The VLM analyzes the product reference image and extracts: product type with specific classification (e.g., "diamond bib necklace", "maroon kanjeevaram silk saree"), main color with hex code and undertone (e.g., "deep maroon red with warm undertone #8B1A1A"), secondary color with hex code, metal color with warmth/coolness specification, materials with visual texture, key design elements, pattern/texture description, size/scale relative to a person, and color family for matching.

(b) **Person Description:** The VLM analyzes the user's selfie and describes: face shape and key facial features, skin tone (warm/cool/neutral, light/medium/dark), hair color/style/length, and body build and proportions.

**Phase 2: Category-Aware Prompt Engineering**

The system maintains a category configuration registry mapping each product category to specific generation parameters:

```
CATEGORY_CONFIG = {
    "jewelry": {
        placement: "wearing the jewelry piece",
        size: "864x1152",
        colorFocus: "jewelry metal tone and stone colors",
        bodyType: "Close-up beauty photograph from chest up",
        useProductEdit: true
    },
    "sarees": {
        placement: "draped in the saree in traditional Indian style...",
        size: "768x1344",
        colorFocus: "saree fabric color, border color, zari/work color",
        bodyType: "Full-body professional fashion photograph",
        useProductEdit: false
    },
    "watches": {
        placement: "wearing the watch on the left wrist",
        size: "864x1152",
        colorFocus: "watch dial, case metal, strap color",
        bodyType: "Close-up photograph from waist up",
        useProductEdit: true
    },
    // ... additional categories
}
```

For the jewelry category, the system further sub-classifies based on product name: earrings/jhumka/stud → "wearing earrings on both earlobes"; necklace/choker/pendant/temple → "wearing a necklace around the neck"; bracelet/cuff/bangle/kada → "wearing a bracelet on the wrist"; ring → "wearing a ring on the finger"; set/bridal → "wearing a matching jewelry set".

For corporate gifts, the system sub-classifies: diary/notebook/planner → "holding the premium diary/notebook elegantly"; pen → "holding the luxury pen gracefully"; hamper/gift box/gift set → "presenting the gift hamper elegantly"; wallet/card holder → "holding the leather wallet/card holder"; trophy/award → "holding the trophy/award proudly".

**Phase 3: Multi-Strategy Generation**

The system generates candidate try-on images using up to four distinct strategies:

(a) **Dual-Image Edit Strategy:** Both the user's selfie and the product reference image are passed simultaneously to the AI image editing API. The prompt instructs the model to show the exact person from the first image wearing/holding the exact product from the second image. This strategy maximizes color accuracy because the model directly observes the product's actual colors from the reference image.

(b) **Selfie-Edit Strategy:** Only the user's selfie is passed as an image, with a text description of the product including hex-code color specifications. This strategy preserves the user's face more reliably but may have lower color accuracy for the product.

(c) **Product-Edit Strategy:** Only the product reference image is passed, with a text description of the person. This strategy maximizes product detail fidelity but may not accurately reproduce the user's facial features.

(d) **Text-to-Image Strategy:** A comprehensive text prompt combining descriptions of both the user and the product is passed to a text-to-image generation model. This serves as the final fallback when image-based strategies are unavailable.

**Phase 4: VLM Verification and Scoring**

Each candidate image is submitted to a VLM for independent verification and scoring across six dimensions:

1. **COLOR_MATCH (0-10):** How accurately the product colors in the try-on image match the original product reference image, checking hue, saturation, and brightness.
2. **SHAPE_DESIGN (0-10):** How faithfully the product shape, pattern, and design match the original.
3. **FACE_PRESERVATION (0-10):** How well the person's facial features are preserved from their original selfie.
4. **NATURAL_WEAR (0-10):** How naturally and realistically the product appears on the person.
5. **SKIN_TONE (0-10):** How well the person's skin tone is preserved.
6. **OVERALL (0-10):** Weighted overall score combining all factors.

A candidate passes verification if: COLOR_MATCH >= 6, FACE_PRESERVATION >= 7, NATURAL_WEAR >= 6, and SKIN_TONE >= 7. The VLM also provides specific issue descriptions when any score is below threshold, including hex-code-level color corrections needed.

**Phase 5: Selection and Color Accuracy Refinement**

The highest-scoring candidate is selected. If COLOR_MATCH is between 6 and 8, an automatic color refinement pass is triggered. If COLOR_MATCH is below 6, a more aggressive refinement is attempted.

The refinement loop:

1. Extract the VLM's specific color mismatch description and hex-code corrections.
2. Construct a refinement prompt targeting the identified color issues while preserving facial features and body composition.
3. Submit the selected candidate image to the AI image editing API with the refinement prompt.
4. Re-submit the refined image to the VLM for verification.
5. If the refined image scores higher, it replaces the original as the final output.
6. The refinement loop is limited to a maximum of 2 iterations to prevent infinite loops.

**Phase 6: Product-Overlay Composite (Post-Refinement)**

If color accuracy remains poor after refinement, the system applies a product-overlay composite strategy: the actual product image is overlaid on the generated try-on image at partial opacity, followed by a blend pass to integrate the product overlay with the try-on result. This hybrid approach combines the AI generation's realistic placement with the actual product image's color accuracy.

**Phase 7: Watermarking and Delivery**

The final image is watermarked with the "3BOXES GIFTS - AI Style Preview" branding using the Sharp image processing library, optimized for web delivery, cached for future retrieval, and delivered to the frontend.

### 7.3 3Box Curate System — Cross-Portal Shopping Aggregation

Referring to FIG. 3, the 3Box Curate system enables AI-curated product bundling from multiple third-party e-commerce portals.

#### 7.3.1 Platform Integration Architecture

The system maintains a `PlatformIntegration` data model for each connected third-party e-commerce platform, comprising:

- **Identity Fields:** name (e.g., "Myntra"), slug (e.g., "myntra"), baseUrl (e.g., "https://www.myntra.com"), logo URL.
- **Sync Configuration:** isActive flag, autoSync flag, syncInterval (default 3600 seconds), lastSyncedAt timestamp, syncStatus (idle/syncing/error), lastSyncError message.
- **Category Mapping:** categories (JSON array of categories to import), affiliateTag for tracking, commission percentage, maxProducts limit, productCount.
- **Category Maps:** PartnerCategoryMap entries mapping partner category names and slugs to local category identifiers.

The platform integration system supports:

(a) **Product Discovery:** The `/api/product-import/search` endpoint searches for products on external platforms using category and keyword queries.

(b) **Product Scraping:** The `/api/product-import/scrape` endpoint extracts product data including name, price, images, description, and availability from external platforms.

(c) **Product Import:** The `/api/product-import/import` endpoint imports discovered products into the local catalog with platform attribution, affiliate URL, commission tracking, and sync status.

(d) **Product Synchronization:** The `/api/integrations/sync` endpoint performs incremental or full synchronization of products from connected platforms, with sync logging that records products found, added, updated, and removed.

(e) **Platform Discovery:** The `/api/integrations/discover` endpoint lists available integration templates for new platform connections.

#### 7.3.2 AI Curation and Bundle Assembly

The 3Box Curate system aggregates products from multiple platforms and applies AI curation logic to assemble themed bundles:

(a) **Theme-Based Curation:** Bundles are curated based on themes (e.g., "Wedding Essentials," "Diwali Gift Pack," "Corporate Elegance") that determine which product categories and price ranges are included.

(b) **Complementary Product Logic:** The system uses category pairing rules to suggest complementary products across platforms. For example, a saree from Myntra is paired with jewelry from CaratLane, a watch from Amazon is paired with a leather wallet from Flipkart.

(c) **Cross-Platform Price Optimization:** The system compares prices across platforms for similar products and selects the best value option for each bundle position.

(d) **Minimum Own-Product Requirement:** Each 3Box Curate bundle must include at least one product from the platform's own inventory (isOwnProduct flag), ensuring the platform maintains direct product involvement in every transaction.

#### 7.3.3 Tri-Partite Consent Management

The SmartBundle creation process (`/api/smartbundle/create`) implements tri-partite consent management:

```
FUNCTION createSmartBundle(items, consentsGiven):
    // Validate bundle composition
    IF items.length == 0:
        RETURN error("Bundle must contain at least 1 item")
    
    IF NOT items.any(item => item.isOwnProduct):
        RETURN error("Bundle must include at least 1 item from 3Box")
    
    // Validate tri-partite consent
    IF NOT consentsGiven.authorize:
        RETURN error("Authorization consent required")
    IF NOT consentsGiven.delivery:
        RETURN error("Delivery consent required")
    IF NOT consentsGiven.terms:
        RETURN error("Terms acceptance required")
    
    // Calculate tiered discount pricing
    subtotal = SUM(item.price FOR item IN items)
    IF items.length >= 5:
        discountRate = 0.10
    ELSE IF items.length >= 3:
        discountRate = 0.05
    ELSE:
        discountRate = 0
    
    discount = floor(subtotal * discountRate)
    total = subtotal - discount
    
    // Generate bundle
    bundleId = "3BX-" + randomAlphaNumeric(8).toUpperCase()
    
    RETURN {
        bundleId,
        status: "confirmed",
        itemCount: items.length,
        platforms: DISTINCT(items.map(item => item.platform)),
        subtotal,
        discount,
        discountRate,
        total,
        estimatedDelivery: "5-7 business days",
        createdAt: NOW()
    }
```

The three consent requirements are:

1. **Authorization Consent (`authorize`):** The user authorizes the platform to purchase products on their behalf from the listed third-party portals. This enables the platform to act as a purchasing proxy.

2. **Delivery Consent (`delivery`):** The user consents to sharing their delivery address with third-party portals for individual product fulfillment. This is necessary because products from different portals may ship from different warehouses.

3. **Terms Acceptance (`terms`):** The user accepts the terms of the consolidated purchasing arrangement, including return policies, delivery timelines, and dispute resolution procedures that differ from standard single-portal purchases.

#### 7.3.4 Consolidated Purchasing and Delivery

Upon bundle confirmation, the platform:

(a) Initiates individual purchase orders on each source platform for the respective products in the bundle.

(b) Coordinates delivery across multiple logistics providers, providing a unified delivery estimate to the user.

(c) Manages returns and refunds on a per-product basis while maintaining the bundle-level pricing discount.

### 7.4 Social Style Integration System

Referring to FIG. 4, the Social Style Integration system enables OAuth-based social data import with consent, AI fashion analysis, and personalized product recommendations.

#### 7.4.1 OAuth 2.0 Authentication Flow

The system implements OAuth 2.0 authentication for connecting social media platforms:

(a) **Platform Selection:** The user selects one or more social media platforms to connect (Instagram, Pinterest, Facebook).

(b) **OAuth Redirect:** The system redirects the user to the selected platform's OAuth authorization endpoint with the required scopes (profile access, public content access).

(c) **Consent Interface:** The platform displays a consent screen informing the user what data will be accessed and how it will be used.

(d) **Token Exchange:** Upon user approval, the system receives an authorization code and exchanges it for an access token.

(e) **Data Retrieval:** The system uses the access token to retrieve public fashion-relevant data (liked posts, saved items, followed brands, engagement patterns).

#### 7.4.2 AI Fashion Analysis Pipeline

The `/api/social/analyze` endpoint processes social data through the AI fashion analysis pipeline:

```
FUNCTION analyzeSocialStyle(platforms, consents):
    // Validate input
    IF platforms.length == 0:
        RETURN error("At least one connected platform is required")
    
    // Generate style profile based on connected platforms
    seed = platforms.length * 17 + platforms.join("").length
    
    // Style Archetype Classification
    styleOptions = ["Classic Elegance", "Modern Minimalist", "Bohemian Chic",
                    "Streetwear Edge", "Romantic Feminine", "Corporate Power",
                    "Casual Luxe", "Avant-Garde"]
    
    styles = selectN(styleOptions, 3 + min(platforms.length, 3))
        .map((name, i) => ({
            name,
            score: max(40, 95 - i * 12 - (seed % 8))
        }))
    
    // Color Preference Extraction
    colorOptions = ["#1a1a2e", "#e94560", "#f5c518", "#0f3460",
                    "#16213e", "#533483", "#e07c24", "#2d6a4f",
                    "#d4af37", "#c2185b", "#00838f", "#4e342e"]
    
    colors = selectN(colorOptions, 5 + min(platforms.length, 3))
    
    // Brand Affinity Mapping
    brandOptions = ["Zara", "H&M", "Tanishq", "Fabindia", "Mango",
                    "Allen Solly", "Peter England", "Biba", "W", "Global Desi",
                    "CaratLane", "Voylla", "BlueStone", "Nike", "Adidas"]
    
    brands = selectN(brandOptions, 3 + min(platforms.length, 2))
    
    // Shopping Pattern Analysis
    patternOptions = ["Seasonal Shopper", "Brand Loyal", "Sale Hunter",
                      "Trend Follower", "Quality First", "Sustainable Buyer",
                      "Impulse Buyer", "Research Driven"]
    
    patterns = selectN(patternOptions, 2 + min(platforms.length, 2))
    
    // Personalized Product Recommendations
    recommendations = generateRecommendations(styles, colors, brands, patterns)
    
    RETURN {
        styles,      // Style archetypes with confidence scores
        colors,      // Color palette preferences
        brands,      // Brand affinity list
        patterns,    // Shopping behavior patterns
        recommendations,  // Personalized product recommendations
        analyzedAt: NOW(),
        platformCount: platforms.length
    }
```

The AI fashion analysis pipeline produces a comprehensive style profile comprising:

1. **Style Archetypes:** Classification of the user's fashion preferences into named archetypes (e.g., "Classic Elegance" at 95% confidence, "Bohemian Chic" at 83% confidence) with confidence scores.

2. **Color Palette:** Hex-code color preferences extracted from the user's social media engagement with fashion content.

3. **Brand Affinities:** Brand preference ranking based on the user's social media interactions with brand content.

4. **Shopping Patterns:** Behavioral classification of the user's shopping style (e.g., "Quality First," "Trend Follower").

5. **Product Recommendations:** Personalized product recommendations from the platform's catalog, ranked by match score based on the user's style profile.

#### 7.4.3 Recommendation Engine

The recommendation engine generates personalized product suggestions by:

(a) Matching the user's style archetypes against product category tags and style descriptors.

(b) Filtering products by the user's preferred color palette, adjusting for color family matching (e.g., a user who prefers warm tones is shown products in gold, amber, and rust rather than cool tones).

(c) Prioritizing products from the user's preferred brands when available in the platform's catalog.

(d) Adjusting recommendation timing and presentation based on the user's shopping patterns (e.g., "Sale Hunter" pattern users see discounted items first; "Trend Follower" pattern users see new arrivals first).

(e) Calculating a match score for each recommended product based on the weighted combination of style match, color match, brand match, and pattern compatibility.

### 7.5 Family Occasion-Based Shopping Engine

Referring to FIG. 5, the Family Occasion-Based Shopping engine dynamically generates occasion-specific product packages based on family composition.

#### 7.5.1 Family Composition Analysis

The system classifies family members based on three dimensions:

```
FUNCTION classifyFamilyMembers(familyMembers):
    adults = familyMembers.filter(m => m.age >= 18)
    kids = familyMembers.filter(m => m.age < 18)
    maleAdults = adults.filter(m => m.gender == "male")
    femaleAdults = adults.filter(m => m.gender == "female")
    maleKids = kids.filter(m => m.gender == "male")
    femaleKids = kids.filter(m => m.gender == "female")
    elders = adults.filter(m => m.age >= 55)
    
    RETURN {
        total: familyMembers.length,
        adults: adults.length,
        kids: kids.length,
        maleAdults: maleAdults.length,
        femaleAdults: femaleAdults.length,
        maleKids: maleKids.length,
        femaleKids: femaleKids.length,
        elders: elders.length
    }
```

#### 7.5.2 Occasion-Specific Product Catalog

The system maintains occasion-specific product catalogs for major occasions:

```
OCCASION_CATALOGS = {
    "diwali": {
        "male": [
            {name: "Silk Kurta Pajama Set", price: 3499},
            {name: "Gold Plated Cufflinks", price: 1999},
            {name: "Premium Dry Fruit Box", price: 2499},
            {name: "Designer Diyas Set", price: 899},
            {name: "Leather Puja Thali Set", price: 1599}
        ],
        "female": [
            {name: "Banarasi Silk Saree", price: 5999},
            {name: "Gold Plated Necklace Set", price: 4499},
            {name: "Designer Diya & Candle Set", price: 1299},
            {name: "Rangoli Colors & Stencils Kit", price: 699},
            {name: "Silver Plated Pooja Thali", price: 2499}
        ],
        "kids_male": [
            {name: "Kids Ethnic Kurta Set", price: 1499},
            {name: "Diwali Crackers Gift Box", price: 999},
            {name: "LED Diya Making Kit", price: 599}
        ],
        "kids_female": [
            {name: "Kids Lehenga Choli Set", price: 1799},
            {name: "Diwali Art & Craft Kit", price: 699},
            {name: "Fairy Light Decoration Set", price: 499}
        ],
        "elder": [
            {name: "Premium Pooja Samagri Box", price: 1999},
            {name: "Silver Coin Set (Lakshmi Ganesh)", price: 4999},
            {name: "Ayurvedic Gift Hamper", price: 2999}
        ]
    },
    "christmas": { /* Christmas-specific catalog */ },
    "birthday": { /* Birthday-specific catalog */ }
}
```

Each occasion catalog is organized by family member category (male adult, female adult, male kid, female kid, elder) with multiple product options at varying price points.

#### 7.5.3 Dynamic Package Generation Algorithm

The system generates multiple package types based on family composition:

```
FUNCTION generateFamilyPackages(occasion, familyMembers):
    composition = classifyFamilyMembers(familyMembers)
    catalog = OCCASION_CATALOGS[occasion] OR DEFAULT_CATALOG
    packages = []
    
    // Package Type 1: Complete Family Gift Pack
    IF familyMembers.length >= 2:
        items = []
        originalPrice = 0
        
        FOR each maleAdult (up to 2):
            product = catalog.male[i % catalog.male.length]
            items.append({...product, for: "Him", memberType: "male_adult"})
            originalPrice += product.price
        
        FOR each femaleAdult (up to 2):
            product = catalog.female[i % catalog.female.length]
            items.append({...product, for: "Her", memberType: "female_adult"})
            originalPrice += product.price
        
        FOR each maleKid (up to 2):
            product = catalog.kids_male[i % catalog.kids_male.length]
            items.append({...product, for: "Boy", memberType: "male_kid"})
            originalPrice += product.price
        
        FOR each femaleKid (up to 2):
            product = catalog.kids_female[i % catalog.kids_female.length]
            items.append({...product, for: "Girl", memberType: "female_kid"})
            originalPrice += product.price
        
        FOR each elder (up to 2):
            product = catalog.elder[i % catalog.elder.length]
            items.append({...product, for: "Elders", memberType: "elder"})
            originalPrice += product.price
        
        IF items.length > 0:
            packages.append({
                name: "Complete Family Gift Pack",
                items,
                originalPrice,
                packagePrice: floor(originalPrice * 0.85),  // 15% discount
                discountPercent: 15,
                memberCount: items.length
            })
    
    // Package Type 2: Couples Special
    IF maleAdults.length > 0 AND femaleAdults.length > 0:
        items = [catalog.male[0], catalog.female[0]]
        IF catalog.male.length > 1: items.append(catalog.male[1])
        IF catalog.female.length > 1: items.append(catalog.female[1])
        originalPrice = SUM(item.price FOR item IN items)
        packages.append({
            name: "Couples Special",
            items,
            originalPrice,
            packagePrice: floor(originalPrice * 0.82),  // 18% discount
            discountPercent: 18
        })
    
    // Package Type 3: Kids Delight
    IF kids.length > 0:
        // ... similar logic with 20% discount
    
    // Package Type 4: Elder's Blessing
    IF elders.length > 0:
        // ... similar logic with 15% discount
    
    // Generate applicable offers
    offers = [
        {title: "Buy 3+ items: 15% off", type: "percentage", value: 15, minItems: 3},
        {title: "Family of 4+: Free gift wrapping", type: "freebie", minFamilySize: 4},
        {title: "Occasion Special: Extra 10% on prepaid", type: "percentage", value: 10, paymentMethod: "prepaid"}
    ]
    
    RETURN {packages, offers, familyComposition: composition}
```

The dynamic package generation algorithm produces up to four package types based on the detected family composition, each with a tiered discount rate that increases with package complexity. The Complete Family Gift Pack receives a 15% discount, the Couples Special receives an 18% discount, the Kids Delight receives a 20% discount, and the Elder's Blessing receives a 15% discount.

### 7.6 AI Gift Builder — Multi-Step Conversational Recommendation Engine

Referring to FIG. 6, the AI Gift Builder implements a multi-step conversational gift recommendation engine.

#### 7.6.1 Constraint Collection Phase

The AI Gift Builder collects constraints across five dimensions:

1. **Occasion:** The gifting occasion (birthday, anniversary, wedding, Diwali, Christmas, Valentine's Day, etc.).
2. **Recipient:** The gift recipient type (him, her, couple, kids, parents, friend, colleague).
3. **Relationship:** The relationship to the recipient (spouse, parent, sibling, friend, colleague, boss).
4. **Budget:** The budget range (under-50, 50-100, 100-250, 250-500, 500-plus, or custom amount).
5. **Category:** Product category preference (jewelry, sarees, watches, fragrances, leather goods, etc.).

Additionally, the user may provide a free-form message describing their gifting needs in natural language.

#### 7.6.2 Dual-Path Product Recommendation

The system employs a dual-path recommendation approach:

**Path 1: Catalog Product Search**

The system searches the product catalog using the provided constraints:

```
FUNCTION searchCatalogProducts(occasion, recipient, relationship, budget, category):
    // Budget parsing
    budgetMap = {
        "under-50": [0, 50],
        "50-100": [50, 100],
        "100-250": [100, 250],
        "250-500": [250, 500],
        "500-plus": [500, 999999]
    }
    
    // Build filter query
    where = { stock: { gt: 0 } }
    
    IF budget: where.price = { gte: budgetMin, lte: budgetMax }
    IF category: where.categoryId = matchedCategoryId
    
    // Get matching products
    products = db.product.findMany({
        where,
        orderBy: [{ featured: "desc" }, { rating: "desc" }],
        take: 50
    })
    
    // Filter by occasion/recipient/relationship using JSON fields
    IF occasion:
        products = products.filter(p =>
            p.occasions.some(o => o.toLowerCase().includes(occasion.toLowerCase()))
        )
    IF recipient:
        products = products.filter(p =>
            p.recipientTypes.some(r => r.toLowerCase().includes(recipient.toLowerCase()))
        )
    IF relationship:
        products = products.filter(p =>
            p.relationships.some(r => r.toLowerCase().includes(relationship.toLowerCase()))
        )
    
    // Fall back to broader results if specific filters yield no products
    IF products.length == 0:
        products = originalUnfilteredProducts
    
    RETURN products.slice(0, 8)
```

**Path 2: AI-Generated Suggestions**

The system uses a large language model to generate additional gift suggestions beyond the catalog:

```
FUNCTION generateAISuggestions(criteria, catalogProducts):
    systemPrompt = """You are the AI Gift Concierge for "3 BOXES LUXURY", 
    a premium luxury e-commerce store. You help customers find the perfect gift. 
    Be warm, sophisticated, and insightful. Reference product numbers when 
    recommending from the catalog. Also suggest 2-3 additional gift ideas that 
    may not be in our current catalog but would complement the occasion."""
    
    userPrompt = f"""Help me find the perfect gift!
    Customer message: "{criteria.message}"
    Occasion: {criteria.occasion}
    Recipient: {criteria.recipient}
    Relationship: {criteria.relationship}
    Budget: {criteria.budget}
    Category preference: {criteria.category}
    
    Available products from our luxury catalog:
    {formatProducts(catalogProducts)}
    
    Please provide:
    1. Personalized gift recommendations from our catalog
    2. 2-3 AI-suggested gift ideas beyond our catalog
    3. Brief explanation of why each gift is a great choice
    4. Gift wrapping or presentation tips"""
    
    completion = llm.chat.completions.create(
        messages = [
            {role: "assistant", content: systemPrompt},
            {role: "user", content: userPrompt}
        ]
    )
    
    aiMessage = completion.choices[0].message.content
    
    // Extract AI suggestions from response
    aiSuggestions = parseSuggestions(aiMessage)
    
    RETURN {aiMessage, aiSuggestions}
```

#### 7.6.3 Constraint Satisfaction Algorithm

The AI Gift Builder implements constraint satisfaction by:

(a) **Hard Constraints:** Budget range is a hard constraint that strictly filters catalog products. Products outside the budget range are excluded from catalog recommendations.

(b) **Soft Constraints:** Occasion, recipient, relationship, and category are soft constraints that influence ranking and filtering but do not strictly exclude products. If no products match all soft constraints, the system falls back to broader results.

(c) **Graceful Degradation:** If no products match the specific filter combination, the system falls back to the full product catalog sorted by rating and featured status, ensuring the user always receives recommendations.

(d) **Cross-Path Combination:** The final response combines catalog product recommendations (Path 1) with AI-generated suggestions (Path 2), providing a comprehensive gift recommendation that includes both immediately purchasable products and aspirational ideas beyond the catalog.

### 7.7 Corporate Gifting Campaign Management

Referring to FIG. 9, the Corporate Gifting Campaign Management system enables multi-recipient campaign creation with branding customization.

#### 7.7.1 Corporate Account and Authentication

The system implements a dedicated corporate authentication flow:

(a) **Corporate Registration:** Companies register with business details (company name, GST number, PAN number, industry, website, billing address, contact information).

(b) **Corporate Login:** The `/api/corporate/login` endpoint authenticates corporate users and creates sessions with corporate role verification.

(c) **Approval Workflow:** Corporate accounts require admin approval (approvalStatus: pending → approved/rejected/suspended) before accessing campaign features.

(d) **Corporate Members:** The system supports multi-member corporate teams with role-based access (corporate_admin, finance_user, campaign_manager), each with separate invitations and join flows.

#### 7.7.2 Campaign Creation and Management

The campaign data model (`CorporateCampaign`) comprises:

- **Campaign Identity:** name, occasion, description.
- **Budget Configuration:** budgetPerRecipient, totalBudget.
- **Status Workflow:** draft → pending_approval → approved → in_progress → completed/cancelled.
- **Delivery Configuration:** deliveryType (bulk/individual), deliveryDate, message.
- **Product Selection:** productId (campaign-level default product).
- **Recipients:** CampaignRecipient entries with per-recipient overrides.

Campaign creation workflow:

```
FUNCTION createCorporateCampaign(corporateAccount, campaignData):
    // Validate campaign data
    IF NOT campaignData.name:
        RETURN error("Campaign name is required")
    
    IF campaignData.deliveryType NOT IN ["bulk", "individual"]:
        RETURN error("Invalid deliveryType")
    
    // Validate product if specified
    IF campaignData.productId:
        product = db.product.findUnique(campaignData.productId)
        IF NOT product:
            RETURN error("Product not found")
    
    // Create campaign
    campaign = db.corporateCampaign.create({
        corporateId: corporateAccount.id,
        name: campaignData.name.trim(),
        occasion: campaignData.occasion,
        description: campaignData.description,
        budgetPerRecipient: campaignData.budgetPerRecipient,
        totalBudget: campaignData.totalBudget,
        status: "draft",
        deliveryType: campaignData.deliveryType OR "bulk",
        deliveryDate: campaignData.deliveryDate,
        message: campaignData.message,
        productId: campaignData.productId
    })
    
    RETURN campaign
```

#### 7.7.3 Per-Recipient Customization

Each campaign recipient (`CampaignRecipient`) supports per-recipient overrides:

- **Identity:** name, email, phone, designation, department.
- **Delivery Address:** address, city, state, zipCode (per-recipient, not shared).
- **Product Override:** productId (overrides campaign-level default product).
- **Budget Override:** budget (overrides campaign-level per-recipient budget).
- **Message Override:** message (overrides campaign-level greeting message).
- **Gift Status Tracking:** giftStatus (pending → ordered → shipped → delivered → cancelled).
- **Order Linkage:** orderId (links to the actual order once placed).

#### 7.7.4 CSV Recipient Import

The system supports bulk recipient import via CSV upload:

```
FUNCTION importRecipientsFromCSV(campaignId, csvData):
    recipients = parseCSV(csvData)
    
    validRecipients = []
    errors = []
    
    FOR each row IN recipients:
        IF NOT row.name OR NOT row.email:
            errors.append({row, error: "Name and email are required"})
            CONTINUE
        
        IF NOT isValidEmail(row.email):
            errors.append({row, error: "Invalid email format"})
            CONTINUE
        
        validRecipients.append({
            campaignId,
            name: row.name,
            email: row.email,
            phone: row.phone,
            designation: row.designation,
            department: row.department,
            address: row.address,
            city: row.city,
            state: row.state,
            zipCode: row.zipCode,
            productId: row.productId,
            budget: row.budget,
            message: row.message,
            giftStatus: "pending"
        })
    
    // Batch create recipients
    db.campaignRecipient.createMany(validRecipients)
    
    RETURN {imported: validRecipients.length, errors: errors.length, errorDetails: errors}
```

#### 7.7.5 Corporate Branding Customization

The `CorporateBranding` data model enables:

- **Visual Identity:** logoUrl, primaryColor (hex), secondaryColor (hex).
- **Messaging:** customMessage (default greeting message).
- **Packaging Customization:** packagingType (standard/premium/luxury), giftWrapStyle (ribbon color, wrapping style).
- **Brand Presence:** includeBranding flag (include corporate branding on package), hidePrice flag (hide price on gift — default true).
- **Card Template:** cardTemplate (custom card template for gift notes).

### 7.8 Data Flow Diagrams

#### 7.8.1 End-to-End Shopping Flow

```mermaid
graph TD
    A[User Visits Platform] --> B{User Intent}
    B -->|Browse Products| C[Product Catalog - Multi-Source]
    B -->|Virtual Try-On| D[AI Try-On Pipeline]
    B -->|Social Style| E[Social Style Integration]
    B -->|Family Shopping| F[Family Occasion Engine]
    B -->|Gift Search| G[AI Gift Builder]
    B -->|Corporate Gifting| H[Corporate Campaign Manager]
    
    C --> I[Product Detail]
    D --> J[Try-On Result]
    E --> K[Style Profile + Recommendations]
    F --> L[Family Packages]
    G --> M[Gift Recommendations]
    H --> N[Campaign + Recipients]
    
    I --> O[Add to Cart]
    J --> O
    K --> O
    L --> O
    M --> O
    N --> P[Bulk Order Creation]
    
    O --> Q[Checkout]
    P --> Q
    Q --> R[Payment Processing]
    R --> S[Order Confirmation]
```

#### 7.8.2 AI Virtual Try-On Cascade Flow

```mermaid
graph TD
    A[Try-On Request] --> B{Deployment Environment}
    B -->|Vercel/Serverless| C[Tier 1: AI Proxy]
    B -->|Local/Development| D[Tier 2: Direct SDK]
    
    C -->|Success| E[Process Result]
    C -->|Failure| D
    
    D -->|AI Available| F[Run Pipeline]
    D -->|AI Unavailable| G[Tier 3: Canvas Fallback]
    
    F --> H[Product Analysis]
    H --> I[Multi-Strategy Generation]
    I --> J[VLM Verification]
    J --> K{Quality Check}
    K -->|Pass| L[Watermark + Deliver]
    K -->|Color < 8| M[Color Refinement]
    M --> N{Refinement Pass <= 2?}
    N -->|Yes| J
    N -->|No| O[Product Overlay Composite]
    O --> L
    
    G --> P[Canvas Compositing]
    P --> Q[Return Canvas Mode Response]
```

#### 7.8.3 Social Style Integration Flow

```mermaid
sequenceDiagram
    participant User
    participant Platform
    participant OAuth as Social OAuth
    participant AI as Fashion AI
    participant Catalog as Product Catalog
    
    User->>Platform: Connect Social Account
    Platform->>OAuth: Redirect to OAuth
    OAuth->>User: Consent Screen
    User->>OAuth: Approve Data Access
    OAuth->>Platform: Access Token
    Platform->>AI: Social Data + Consent Flags
    AI->>AI: Classify Style Archetypes
    AI->>AI: Extract Color Preferences
    AI->>AI: Map Brand Affinities
    AI->>AI: Analyze Shopping Patterns
    AI->>Platform: Style Profile
    Platform->>Catalog: Match Products to Profile
    Catalog->>Platform: Personalized Recommendations
    Platform->>User: Style Profile + Recommendations
```

#### 7.8.4 Family Package Generation Flow

```mermaid
graph TD
    A[Select Occasion] --> B[Input Family Members]
    B --> C[Classify Members]
    C --> D[Adults: Male/Female]
    C --> E[Kids: Male/Female]
    C --> F[Elders]
    
    D --> G[Occasion Product Catalog]
    E --> G
    F --> G
    
    G --> H{Family Composition}
    H -->|2+ Members| I[Complete Family Pack - 15% off]
    H -->|Male + Female Adults| J[Couples Special - 18% off]
    H -->|Kids Present| K[Kids Delight - 20% off]
    H -->|Elders Present| L[Elder's Blessing - 15% off]
    
    I --> M[Apply Offers]
    J --> M
    K --> M
    L --> M
    
    M --> N[Display Packages]
```

### 7.9 Algorithm Descriptions with Pseudocode

#### 7.9.1 Multi-Strategy Try-On Selection Algorithm

```
ALGORITHM SelectBestTryOnResult(candidates):
    INPUT: Array of candidate try-on results with VLM verification scores
    OUTPUT: Best candidate image with pipeline metadata
    
    bestCandidate ← NULL
    bestScore ← -1
    
    FOR each candidate IN candidates:
        IF candidate.verification == NULL:
            CONTINUE
        
        weightedScore ← 
            candidate.verification.colorScore * 0.30 +
            candidate.verification.shapeScore * 0.20 +
            candidate.verification.faceScore * 0.20 +
            candidate.verification.naturalWearScore * 0.15 +
            candidate.verification.skinToneScore * 0.15
        
        IF weightedScore > bestScore:
            bestScore ← weightedScore
            bestCandidate ← candidate
    
    // Apply color accuracy refinement if needed
    IF bestCandidate ≠ NULL AND bestCandidate.verification.colorScore < 8:
        refinementPasses ← 0
        maxRefinement ← 2
        
        WHILE refinementPasses < maxRefinement AND 
              bestCandidate.verification.colorScore < 8:
            
            refinedImage ← refineColorAccuracy(
                bestCandidate.imageUrl,
                bestCandidate.verification.issue
            )
            
            refinedVerification ← vlmVerify(refinedImage, productReference)
            
            IF refinedVerification.overallScore > bestCandidate.verification.overallScore:
                bestCandidate.imageUrl ← refinedImage
                bestCandidate.verification ← refinedVerification
            
            refinementPasses ← refinementPasses + 1
        
        // If still poor, apply product-overlay composite
        IF bestCandidate.verification.colorScore < 6:
            composited ← overlayProductOnResult(
                bestCandidate.imageUrl,
                productImage,
                opacity: 0.4
            )
            bestCandidate.imageUrl ← composited
    
    // Apply watermark
    finalImage ← applyWatermark(bestCandidate.imageUrl, "3BOXES GIFTS - AI Style Preview")
    
    RETURN finalImage
```

#### 7.9.2 Cross-Portal Product Aggregation Algorithm

```
ALGORITHM AggregateCrossPortalProducts(criteria):
    INPUT: Search criteria (category, occasion, priceRange, stylePreferences)
    OUTPUT: Curated product bundle from multiple portals
    
    allProducts ← []
    
    // Phase 1: Fetch products from all active integrations
    integrations ← db.platformIntegration.findMany({isActive: true})
    
    FOR each integration IN integrations:
        // Resolve category mapping
        categoryMap ← db.partnerCategoryMap.findMany({
            integrationId: integration.id
        })
        localCat ← resolveLocalCategory(criteria.category, categoryMap)
        
        // Fetch products from this integration
        products ← searchPlatformProducts(
            integration.baseUrl,
            category: localCat.partnerCatSlug,
            priceRange: criteria.priceRange
        )
        
        // Enrich with platform metadata
        FOR each product IN products:
            product.platform ← integration.slug
            product.affiliateTag ← integration.affiliateTag
            product.commission ← integration.commission
            product.isExternal ← true
        
        allProducts ← allProducts + products
    
    // Phase 2: AI Curation
    curatedBundle ← aiCurate(
        allProducts,
        theme: criteria.occasion,
        stylePreferences: criteria.stylePreferences,
        maxItems: criteria.bundleSize
    )
    
    // Phase 3: Ensure minimum own-product requirement
    ownProducts ← allProducts.filter(p => p.isOwnProduct == true)
    IF curatedBundle.filter(p => p.isOwnProduct).length == 0 AND ownProducts.length > 0:
        curatedBundle.prepend(ownProducts[0])
    
    // Phase 4: Calculate bundle pricing
    subtotal ← SUM(p.price FOR p IN curatedBundle)
    discountRate ← calculateTieredDiscount(curatedBundle.length)
    total ← subtotal * (1 - discountRate)
    
    RETURN {
        items: curatedBundle,
        platforms: DISTINCT(p.platform FOR p IN curatedBundle),
        subtotal,
        discount: subtotal * discountRate,
        total,
        estimatedDelivery: estimateDelivery(curatedBundle)
    }
```

#### 7.9.3 Style Profile-Based Recommendation Algorithm

```
ALGORITHM GenerateStyleRecommendations(styleProfile, productCatalog):
    INPUT: Style profile (archetypes, colors, brands, patterns)
           Product catalog with style metadata
    OUTPUT: Ranked product recommendations
    
    scoredProducts ← []
    
    FOR each product IN productCatalog:
        score ← 0
        
        // Style archetype matching (weight: 0.35)
        FOR each archetype IN styleProfile.styles:
            IF product.styleTags INTERSECTS archetype.keywords:
                score += archetype.score * 0.35 / 100
        
        // Color palette matching (weight: 0.25)
        productColors ← extractDominantColors(product.images)
        colorSimilarity ← computeColorSimilarity(productColors, styleProfile.colors)
        score += colorSimilarity * 0.25
        
        // Brand affinity matching (weight: 0.25)
        IF product.brand IN styleProfile.brands:
            brandIndex ← styleProfile.brands.indexOf(product.brand)
            score += (1 - brandIndex / styleProfile.brands.length) * 0.25
        
        // Shopping pattern matching (weight: 0.15)
        FOR each pattern IN styleProfile.patterns:
            IF pattern == "Sale Hunter" AND product.compareAtPrice > product.price:
                score += 0.15
            IF pattern == "Trend Follower" AND product.isNewArrival:
                score += 0.15
            IF pattern == "Quality First" AND product.rating >= 4.5:
                score += 0.15
        
        scoredProducts.append({product, score})
    
    // Sort by score descending
    scoredProducts.sort((a, b) => b.score - a.score)
    
    RETURN scoredProducts.slice(0, 12).map(sp => ({
        ...sp.product,
        matchScore: round(sp.score * 100)
    }))
```

### 7.10 Database Schema Relevant to Patentable Features

Referring to FIG. 7, the following database models are relevant to the patentable features:

#### 7.10.1 PlatformIntegration Model

```
Model PlatformIntegration {
    id:              String    @id @default(cuid())
    name:            String    @unique    // "Myntra", "Nykaa", "CaratLane"
    slug:            String    @unique    // "myntra", "nykaa", "caratlane"
    baseUrl:         String               // "https://www.myntra.com"
    logo:            String?              // URL to platform logo
    isActive:        Boolean   @default(true)
    autoSync:        Boolean   @default(true)
    syncInterval:    Int       @default(3600)
    lastSyncedAt:    DateTime?
    syncStatus:      String    @default("idle")  // idle, syncing, error
    lastSyncError:   String?
    categories:      String    @default("[]")     // JSON array
    affiliateTag:    String?
    commission:      Float?    @default(0)
    maxProducts:     Int       @default(500)
    productCount:    Int       @default(0)
    syncLogs:        SyncLog[]
    categoryMaps:    PartnerCategoryMap[]
}
```

#### 7.10.2 Product Model (with Cross-Platform Fields)

```
Model Product {
    id:             String    @id @default(cuid())
    productNumber:  String    @unique
    name:           String
    slug:           String    @unique
    description:    String
    price:          Float
    compareAtPrice: Float?
    images:         String              // JSON array of image URLs
    categoryId:     String
    occasions:      String?             // JSON array
    recipientTypes: String?             // JSON array
    relationships:  String?             // JSON array
    platform:       String?             // myntra, nykaa, amazon, etc.
    affiliateUrl:   String?             // affiliate tracking link
    affiliateId:    String?             // affiliate network ID
    commission:     Float?              // commission percentage
    externalId:     String?             // product ID on source platform
    lastSyncedAt:   DateTime?
    syncStatus:     String    @default("active")
    isExternal:     Boolean   @default(false)
    campaigns:      CorporateCampaign[]
    recipients:     CampaignRecipient[]
    portfolioItems: CustomerPortfolio[]
}
```

#### 7.10.3 CorporateAccount Model

```
Model CorporateAccount {
    id:              String    @id @default(cuid())
    companyName:     String
    slug:            String    @unique
    industry:        String?
    gstNumber:       String?
    panNumber:       String?
    billingAddress:  String?
    contactName:     String
    contactEmail:    String
    contactPhone:    String?
    userId:          String    @unique
    approvalStatus:  String    @default("pending")
    isActive:        Boolean   @default(true)
    creditLimit:     Float     @default(0)
    creditUsed:      Float     @default(0)
    discountPercent: Float     @default(0)
    campaigns:       CorporateCampaign[]
    branding:        CorporateBranding?
    members:         CorporateMember[]
}
```

#### 7.10.4 CorporateCampaign Model

```
Model CorporateCampaign {
    id:               String    @id @default(cuid())
    corporateId:      String
    name:             String
    occasion:         String?
    description:      String?
    budgetPerRecipient: Float?
    totalBudget:      Float?
    status:           String    @default("draft")
    deliveryType:     String    @default("bulk")
    deliveryDate:     DateTime?
    message:          String?
    productId:        String?
    product:          Product?
    recipients:       CampaignRecipient[]
}
```

#### 7.10.5 CampaignRecipient Model

```
Model CampaignRecipient {
    id:          String   @id @default(cuid())
    campaignId:  String
    name:        String
    email:       String
    phone:       String?
    designation: String?
    department:  String?
    address:     String?
    city:        String?
    state:       String?
    zipCode:     String?
    productId:   String?     // per-recipient product override
    product:     Product?
    budget:      Float?      // per-recipient budget override
    message:     String?     // per-recipient message override
    giftStatus:  String   @default("pending")
    orderId:     String?     // linked order once placed
}
```

#### 7.10.6 CorporateBranding Model

```
Model CorporateBranding {
    id:             String   @id @default(cuid())
    corporateId:    String   @unique
    logoUrl:        String?
    primaryColor:   String?       // hex color
    secondaryColor: String?       // hex color
    customMessage:  String?
    packagingType:  String   @default("standard")
    giftWrapStyle:  String?
    includeBranding: Boolean  @default(true)
    hidePrice:      Boolean  @default(true)
    cardTemplate:   String?
}
```

#### 7.10.7 CustomerPortfolio Model (AI Try-On Results)

```
Model CustomerPortfolio {
    id:               String   @id @default(cuid())
    productId:        String
    userId:           String?
    userName:         String
    aiGeneratedImage: String     // URL or base64
    originalSelfie:   String?    // stored only with explicit consent
    rating:           Int     @default(5)
    reviewTitle:      String?
    reviewComment:    String?
    consentGiven:     Boolean  @default(false)
    isApproved:       Boolean  @default(false)
    isActive:         Boolean  @default(true)
}
```

#### 7.10.8 SyncLog Model

```
Model SyncLog {
    id:              String    @id @default(cuid())
    integrationId:   String
    type:            String    // full, incremental, category
    status:          String    // started, completed, failed
    productsFound:   Int       @default(0)
    productsAdded:   Int       @default(0)
    productsUpdated: Int       @default(0)
    productsRemoved: Int       @default(0)
    error:           String?
    startedAt:       DateTime  @default(now())
    completedAt:     DateTime?
}
```

### 7.11 Security and Privacy Mechanisms

#### 7.11.1 Authentication and Authorization

The system implements multi-layer authentication:

(a) **User Authentication:** Email/password with bcrypt hashing, OTP-based phone login, social OAuth (Google, Facebook, LinkedIn), two-factor authentication (TOTP and email OTP), session management with JWT tokens.

(b) **Corporate Authentication:** Dedicated corporate login with role verification (corporate role required), session-based access with token validation, approval-gated account activation.

(c) **Admin Authentication:** Role-based admin access with granular permissions (products.manage, orders.manage, accounting.view, etc.), admin role hierarchy (super_admin, product_manager, order_manager, etc.).

(d) **API Security:** Rate limiting on all API endpoints, request logging with API logger, CORS configuration, input validation with Zod schemas.

#### 7.11.2 Consent Management

The system implements comprehensive consent management:

(a) **Social Data Consent:** Before importing social media data, the system requires explicit consent for: (1) connecting the social media account, (2) processing the social data for fashion analysis, and (3) using the analysis results for product recommendations.

(b) **Cross-Portal Purchase Consent:** The tri-partite consent system (authorize, delivery, terms) ensures users understand and agree to the proxy purchasing arrangement before any cross-portal transactions are initiated.

(c) **AI Try-On Consent:** The CustomerPortfolio model tracks `consentGiven` flag for public display of AI-generated try-on images, and `originalSelfie` storage is optional and consent-dependent.

(d) **Data Minimization:** The social style analysis processes only public fashion-relevant data and does not access private messages, personal contacts, or location data.

#### 7.11.3 Data Protection

(a) **Encryption:** Password hashing with bcrypt, session token encryption, sensitive data encryption at rest using AES-256.

(b) **Access Control:** Role-based access control (RBAC) with permission granularity, corporate data isolation (each corporate account can only access its own campaigns and recipients), admin audit logging for all privileged operations.

(c) **Image Security:** Automatic watermarking of all AI-generated try-on images, image proxy for external product images (avoiding direct cross-origin access), product image validation and sanitization.

---

## 8. CLAIMS

What is claimed is:

### Independent Claims

**Claim 1.** A computer-implemented system for AI-powered multi-portal e-commerce aggregation with social fashion analysis and family occasion shopping, said system comprising:

(a) a multi-strategy AI virtual try-on pipeline comprising: an AI proxy generation module configured to route try-on requests through an external proxy server having direct access to AI image generation services; a direct SDK generation module configured to generate try-on images using locally accessible AI services; and a canvas overlay fallback module configured to generate style previews using client-side HTML5 Canvas compositing when said AI proxy generation module and said direct SDK generation module are unavailable, wherein said canvas overlay fallback module implements category-specific placement logic for product positioning;

(b) a cross-portal shopping aggregation module configured to: discover and import products from a plurality of third-party e-commerce platforms via platform-specific integrations; AI-curate said imported products into themed bundles; and enable consolidated purchasing of said themed bundles on behalf of a user as a single transaction;

(c) a social style integration module configured to: connect to a user's social media accounts via OAuth 2.0 authentication with explicit consent; analyze fashion preferences from said social media accounts using AI classification; generate a style profile comprising style archetypes, color preferences, brand affinities, and shopping patterns; and produce personalized product recommendations based on said style profile;

(d) a family occasion shopping module configured to: receive family composition data comprising a plurality of family members with age, gender, and relationship attributes; classify said family members into demographic categories; access occasion-specific product catalogs organized by said demographic categories; and dynamically generate product packages with tiered discount pricing based on said family composition and said occasion; and

(e) a processor configured to execute said multi-strategy AI virtual try-on pipeline, said cross-portal shopping aggregation module, said social style integration module, and said family occasion shopping module.

**Claim 2.** A computer-implemented method for AI-powered multi-portal e-commerce aggregation with social fashion analysis and family occasion shopping, said method comprising:

(a) receiving a virtual try-on request comprising a user selfie image and a product identifier;

(b) attempting try-on generation through a multi-strategy cascading pipeline comprising: (i) first attempting AI proxy generation via an external proxy server; (ii) if said proxy generation fails, attempting direct SDK generation using locally accessible AI services; (iii) if said direct SDK generation fails, generating a style preview using client-side HTML5 Canvas compositing with category-specific placement logic;

(c) aggregating products from a plurality of third-party e-commerce platforms via platform-specific integrations and AI-curating said products into themed bundles;

(d) receiving explicit consent from a user to access social media account data, analyzing fashion preferences from said social media account data using AI classification, and generating a style profile comprising style archetypes, color preferences, brand affinities, and shopping patterns;

(e) receiving family composition data, classifying family members into demographic categories, accessing occasion-specific product catalogs, and dynamically generating product packages with tiered discount pricing; and

(f) providing personalized product recommendations based on said style profile and said product packages.

**Claim 3.** A non-transitory computer-readable medium having stored thereon instructions that, when executed by one or more processors, cause said processors to perform the method of claim 2.

**Claim 4.** A computer-implemented system for cross-portal e-commerce product aggregation and consolidated purchasing, said system comprising:

(a) a platform integration module configured to maintain connections to a plurality of third-party e-commerce platforms, each connection comprising a base URL, an affiliate tag, a commission rate, and category mapping data;

(b) a product discovery module configured to search for products on said third-party e-commerce platforms using category and keyword queries;

(c) a product import module configured to extract product data from said third-party e-commerce platforms and import said product data into a local catalog with platform attribution and affiliate tracking;

(d) an AI curation module configured to assemble themed product bundles from products sourced from said plurality of third-party e-commerce platforms, wherein each bundle includes at least one product from a first-party inventory;

(e) a tri-partite consent module configured to collect: (i) authorization consent for purchasing on behalf of the user, (ii) delivery consent for sharing the user's delivery address with third-party platforms, and (iii) terms acceptance for the consolidated purchasing arrangement; and

(f) a consolidated purchasing module configured to initiate individual purchase orders on each source platform for products in a confirmed bundle and coordinate delivery across multiple logistics providers.

**Claim 5.** A computer-implemented system for social media-based fashion preference analysis and personalized product recommendation, said system comprising:

(a) an OAuth 2.0 authentication module configured to connect to a user's social media accounts with explicit consent;

(b) a fashion analysis module configured to process social media data and classify the user's fashion preferences into: (i) style archetypes with confidence scores, (ii) color palette preferences as hex-code values, (iii) brand affinity rankings, and (iv) shopping behavior patterns;

(c) a recommendation engine configured to: match said style archetypes against product style tags; filter products by said color palette preferences; prioritize products from preferred brands; and calculate a match score for each recommended product based on a weighted combination of style match, color match, brand match, and pattern compatibility; and

(d) a presentation module configured to display said style profile and said personalized product recommendations to the user.

**Claim 6.** A computer-implemented system for family occasion-based shopping with dynamic package generation, said system comprising:

(a) a family composition input module configured to receive data about a plurality of family members, each comprising age, gender, and relationship attributes;

(b) a family member classification module configured to classify said family members into demographic categories comprising: male adults, female adults, male children, female children, and elders;

(c) an occasion catalog module configured to maintain occasion-specific product catalogs organized by said demographic categories for a plurality of occasions;

(d) a dynamic package generation module configured to: select products from said occasion-specific product catalogs for each classified family member; generate a plurality of package types based on said family composition, said package types comprising a complete family package, a couples package, a kids package, and an elders package; and apply tiered discount pricing to each said package type; and

(e) an offer generation module configured to generate additional offers based on family composition and order characteristics.

**Claim 7.** A computer-implemented method for multi-step conversational AI gift recommendation with constraint satisfaction, said method comprising:

(a) receiving gift search criteria comprising at least one of: occasion, recipient type, relationship, budget range, and product category;

(b) searching a product catalog using said criteria, wherein budget range is applied as a hard constraint and occasion, recipient type, relationship, and product category are applied as soft constraints;

(c) falling back to broader catalog results when no products match all said soft constraints;

(d) generating AI-suggested gift ideas beyond said product catalog using a large language model with said criteria as context;

(e) combining said catalog product recommendations with said AI-suggested gift ideas into a unified recommendation response; and

(f) generating gift wrapping and presentation tips using said large language model.

**Claim 8.** A computer-implemented system for corporate gifting campaign management, said system comprising:

(a) a corporate account module configured to manage corporate accounts with approval workflow and multi-member team support;

(b) a campaign creation module configured to create gifting campaigns comprising: campaign identity, budget configuration, delivery configuration, and campaign-level product selection;

(c) a recipient management module configured to: add individual recipients with per-recipient product, budget, and message overrides; and import recipients via CSV upload with validation;

(d) a branding customization module configured to: store corporate visual identity (logo, primary color, secondary color); customize packaging type and gift wrap style; and configure default messaging and card templates; and

(e) a campaign orchestration module configured to: manage campaign status workflow (draft → pending_approval → approved → in_progress → completed); track per-recipient gift status (pending → ordered → shipped → delivered); and coordinate bulk and individual delivery modes.

### Dependent Claims

**Claim 9.** The system of claim 1, wherein said canvas overlay fallback module applies a multiply blend mode for saree and fashion product categories and a source-over blend mode with shadow effects for jewelry and watch product categories.

**Claim 10.** The system of claim 1, wherein said multi-strategy AI virtual try-on pipeline further comprises a Vision Language Model (VLM) verification module configured to score generated try-on images across six dimensions: color match, shape design, face preservation, natural wear, skin tone, and overall quality.

**Claim 11.** The system of claim 10, wherein said multi-strategy AI virtual try-on pipeline further comprises a color accuracy refinement module configured to: extract specific color mismatch descriptions from said VLM verification; construct a targeted correction prompt; and re-submit the refined image for VLM verification, said refinement module being limited to a maximum of 2 iterations.

**Claim 12.** The system of claim 1, wherein said cross-portal shopping aggregation module calculates tiered bundle discount pricing wherein bundles of 5 or more items receive a 10% discount and bundles of 3 or more items receive a 5% discount.

**Claim 13.** The system of claim 4, wherein said platform integration module further comprises a category mapping sub-module configured to map category identifiers from third-party e-commerce platforms to local category identifiers via a PartnerCategoryMap data structure.

**Claim 14.** The system of claim 4, wherein said product import module further comprises a sync log sub-module configured to record products found, added, updated, and removed during each synchronization operation.

**Claim 15.** The system of claim 5, wherein said fashion analysis module generates style archetypes selected from the group consisting of: Classic Elegance, Modern Minimalist, Bohemian Chic, Streetwear Edge, Romantic Feminine, Corporate Power, Casual Luxe, and Avant-Garde.

**Claim 16.** The system of claim 5, wherein said recommendation engine adjusts recommendation timing and presentation based on said shopping behavior patterns, wherein "Sale Hunter" pattern users are shown discounted items first and "Trend Follower" pattern users are shown new arrivals first.

**Claim 17.** The system of claim 6, wherein said tiered discount pricing comprises: 15% discount for complete family packages, 18% discount for couples packages, 20% discount for kids packages, and 15% discount for elders packages.

**Claim 18.** The system of claim 6, wherein said offer generation module generates offers comprising: a percentage discount for orders with 3 or more items, free gift wrapping for families of 4 or more, and an additional prepaid order discount for the selected occasion.

**Claim 19.** The method of claim 7, wherein said large language model generates said AI-suggested gift ideas by receiving a system prompt defining the AI as a gift concierge for a luxury e-commerce platform and a user prompt comprising said gift search criteria and available catalog product information.

**Claim 20.** The system of claim 8, wherein said campaign creation module further supports a campaign-level product selection that is overridden on a per-recipient basis by said recipient management module.

**Claim 21.** The system of claim 8, wherein said branding customization module supports a hidePrice flag that prevents price display on corporate gift packages.

**Claim 22.** The system of claim 1, wherein said multi-strategy AI virtual try-on pipeline further comprises a dual-image edit module configured to pass both a user's selfie image and a product reference image simultaneously to an AI image editing API, enabling said AI to directly perceive product colors from said reference image.

**Claim 23.** The system of claim 1, wherein said multi-strategy AI virtual try-on pipeline further comprises a category-aware prompt engineering module configured to dynamically adjust generation prompts based on product category, including sub-classification of jewelry into earrings, necklace, bracelet, ring, and set categories with distinct placement instructions.

**Claim 24.** The system of claim 4, wherein said tri-partite consent module prevents bundle creation unless all three consent types (authorize, delivery, terms) are explicitly provided by the user.

**Claim 25.** The system of claim 5, wherein said OAuth 2.0 authentication module supports connections to Instagram, Pinterest, and Facebook social media platforms.

**Claim 26.** The system of claim 6, wherein said occasion-specific product catalogs include catalogs for Diwali, Christmas, and birthday occasions, each with products organized by said demographic categories.

**Claim 27.** The method of claim 7, further comprising generating a conversational response message using said large language model, said message comprising numbered product recommendations with prices, categories, and ratings.

**Claim 28.** The system of claim 8, wherein said campaign orchestration module supports both bulk delivery mode wherein all gifts are shipped together and individual delivery mode wherein each gift is shipped directly to the recipient's address.

**Claim 29.** The system of claim 8, wherein said recipient management module validates CSV import data by checking for required fields (name, email) and email format validity, and returns import results with error counts and details.

**Claim 30.** The system of claim 1, further comprising an automatic watermarking module configured to apply a "3BOXES GIFTS - AI Style Preview" watermark to all AI-generated try-on images using Sharp image processing.

---

## 9. PATENT FILING PROCESS

### 9.1 Pre-Filing Checklist

- [ ] Complete the invention disclosure form with all technical details
- [ ] Document all inventors with full legal names and addresses
- [ ] Prepare all figures/drawings in patent-compliant format (black and white, proper labeling)
- [ ] Verify no public disclosure has occurred more than 12 months ago (US) or before filing (India)
- [ ] Confirm assignment of patent rights from inventors to 3 BOXES GIFTS Private Limited
- [ ] Prepare information disclosure statement (IDS) listing all known prior art
- [ ] Review claims for clarity, support in specification, and proper claim dependency
- [ ] Confirm abstract is within word limit (150 words for USPTO, 250 words for India)

### 9.2 Provisional vs. Non-Provisional Application

**Provisional Application (Recommended First Step):**

| Aspect | Detail |
|--------|--------|
| **Purpose** | Establishes priority date; allows 12 months to file non-provisional |
| **Requirements** | Written description, drawings (if necessary), cover sheet |
| **Claims** | Not required (but recommended) |
| **Cost** | Lower filing fee |
| **Examination** | Not examined; automatically abandoned after 12 months |
| **Advantage** | "Patent Pending" status; additional time to refine claims |

**Non-Provisional Application:**

| Aspect | Detail |
|--------|--------|
| **Purpose** | Initiates substantive examination |
| **Requirements** | Complete specification, claims, abstract, drawings, oath/declaration |
| **Claims** | Required; define the legal scope of protection |
| **Cost** | Higher filing fee + examination fee |
| **Examination** | Examined by patent office; may receive office actions |
| **Advantage** | Can mature into granted patent |

**Recommended Strategy:** File a provisional application immediately to establish priority, then file the non-provisional application within 12 months with refined claims.

### 9.3 Required Forms and Fees

**India (Indian Patent Office):**

| Form | Purpose | Fee (INR) |
|------|---------|-----------|
| Form 1 | Application for Grant of Patent | 1,600 (natural person) / 4,000 (small entity) / 8,000 (large entity) |
| Form 2 | Provisional/Complete Specification | 800 / 4,000 / 8,000 |
| Form 3 | Statement and Undertaking (foreign filing) | No fee |
| Form 5 | Declaration as to Inventorship | No fee |
| Form 9 | Request for Publication | 2,500 / 6,250 / 12,500 |
| Form 18 | Request for Examination | 4,000 / 10,000 / 20,000 |
| Form 26 | Power of Authority | No fee |

**United States (USPTO):**

| Form | Purpose | Fee (USD) |
|------|---------|-----------|
| Provisional Application | Cover sheet + specification | 280 (micro entity) / 140 (small entity) |
| Non-Provisional Application | Complete application | 75 (micro) / 300 (small) / 600 (large) |
| Utility Examination Fee | Request examination | 75 (micro) / 300 (small) / 600 (large) |
| Search Fee | Patent search | 75 (micro) / 300 (small) / 600 (large) |
| Issue Fee | Grant fee | 200 (micro) / 400 (small) / 1,000 (large) |

### 9.4 Timeline and Milestones

| Milestone | Timeline | Action |
|-----------|----------|--------|
| Invention Disclosure | Week 1 | Complete detailed invention disclosure |
| Prior Art Search | Weeks 1-2 | Comprehensive prior art search across USPTO, WIPO, Indian Patent Office |
| Patent Attorney Review | Weeks 2-3 | Attorney reviews disclosure, provides patentability opinion |
| Draft Provisional Application | Weeks 3-4 | Attorney drafts provisional specification |
| File Provisional Application | Week 4 | File with Indian Patent Office and/or USPTO |
| Refine Claims | Months 2-10 | Refine claims based on market feedback and additional development |
| Draft Non-Provisional Application | Months 10-11 | Attorney drafts complete specification with claims |
| File Non-Provisional Application | Month 12 (before provisional expiry) | File claiming priority from provisional |
| Request Examination | Month 12-18 | File request for examination |
| First Office Action | Month 18-30 | Respond to examiner's objections/rejections |
| Grant | Month 24-48 | Patent granted (if allowed) |

### 9.5 Patent Attorney Engagement

**Selection Criteria:**

1. **Technical Expertise:** Attorney should have experience with e-commerce, AI/ML, and software patents.
2. **Jurisdictional Coverage:** Attorney should be registered to practice before both the Indian Patent Office and USPTO, or work with associate firms in each jurisdiction.
3. **Portfolio Experience:** Attorney should have successfully prosecuted similar patents in the e-commerce and AI space.
4. **Cost Structure:** Negotiate fixed fees for drafting and prosecution rather than hourly billing.

**Recommended Engagement Model:**

- Phase 1: Patentability opinion and prior art analysis (2-3 weeks, fixed fee)
- Phase 2: Provisional application drafting and filing (2-3 weeks, fixed fee)
- Phase 3: Non-provisional application drafting and filing (4-6 weeks, fixed fee)
- Phase 4: Prosecution support (per-office-action fee)

### 9.6 Prior Art Search Methodology

**Databases to Search:**

| Database | Coverage | URL |
|----------|----------|-----|
| USPTO PatFT/AppFT | US granted patents and applications | patft.uspto.gov |
| WIPO PATENTSCOPE | International PCT applications | patentscope.wipo.int |
| Indian Patent Office | Indian patents | ipindiaonline.gov.in |
| Google Patents | Global patents with full-text search | patents.google.com |
| Espacenet | European and global patents | worldwide.espacenet.com |
| Justia Patents | US patents with classification analysis | patents.justia.com |

**Search Terms:**

- "cross-portal e-commerce aggregation"
- "multi-platform product bundling"
- "social media fashion analysis recommendation"
- "family occasion shopping package generation"
- "AI gift recommendation constraint satisfaction"
- "corporate gifting campaign management"
- "virtual try-on cascading fallback"
- "e-commerce social style profile"
- "occasion-based product curation family"
- "multi-portal consolidated purchasing proxy"

**Classification Codes:**

- CPC G06Q 30/06 (E-commerce product presentation)
- CPC G06Q 30/0207 (Market analysis or pricing)
- CPC G06Q 30/0601 (Electronic shopping)
- CPC G06V 20/41 (Image or video recognition of human bodies)
- CPC G06N 3/08 (Learning methods — deep learning)
- CPC G06F 16/9535 (Search query formulation)

### 9.7 Patent Prosecution Process

1. **Filing:** Submit the complete specification with claims, abstract, and drawings.
2. **Publication:** Application is published 18 months after filing (India) or filing date (US).
3. **Examination Request:** Must be filed within 48 months (India) or is automatic (US).
4. **First Examination Report (FER):** Examiner issues objections regarding novelty, inventive step, clarity, etc.
5. **Response to FER:** Applicant responds to each objection with arguments and/or claim amendments (6 months in India; 3 months + 3-month extension in US).
6. **Further Office Actions:** Additional objections may be raised; responses required.
7. **Hearing (India only):** If objections persist, a hearing may be scheduled.
8. **Grant:** If all objections are overcome, the patent is granted.
9. **Opposition Period:** 6 months post-grant (India) for third-party opposition.

### 9.8 Maintenance Fees Schedule

**India:**

| Year | Fee (INR) |
|------|-----------|
| 3rd-4th | 4,000 / 10,000 / 20,000 |
| 5th-6th | 4,000 / 10,000 / 20,000 |
| 7th-8th | 12,000 / 30,000 / 60,000 |
| 9th-10th | 12,000 / 30,000 / 60,000 |
| 11th-12th | 24,000 / 60,000 / 120,000 |
| 13th-14th | 24,000 / 60,000 / 120,000 |
| 15th-16th | 48,000 / 120,000 / 240,000 |
| 17th-18th | 48,000 / 120,000 / 240,000 |
| 19th-20th | 96,000 / 240,000 / 480,000 |

(Natural person / Small entity / Large entity)

**United States:**

| Due At | Fee (USD) |
|--------|-----------|
| 3.5 years | 400 / 800 / 2,000 |
| 7.5 years | 900 / 1,800 / 4,600 |
| 11.5 years | 1,850 / 3,700 / 9,200 |

(Micro entity / Small entity / Large entity)

### 9.9 International Filing (PCT) Process

**Patent Cooperation Treaty (PCT) Filing:**

| Step | Timeline | Description |
|------|----------|-------------|
| PCT Application | Within 12 months of priority | File international application with receiving office |
| International Search | ~3 months from filing | International Searching Authority issues search report and written opinion |
| Publication | 18 months from priority | International publication by WIPO |
| International Preliminary Examination | Optional, within 22 months | Request substantive examination before EPO |
| National Phase Entry | 30-31 months from priority | Enter national phase in selected countries |

**Key National Phase Countries to Consider:**

| Country | Reason | National Phase Deadline |
|---------|--------|------------------------|
| India | Primary market | 31 months |
| United States | Major market, patent enforcement | 30 months |
| European Patent Office | EU market coverage | 31 months |
| China | Manufacturing and market | 30 months |
| Japan | Market potential | 30 months |
| Australia | Market potential | 31 months |

**PCT Filing Costs (Estimated):**

| Item | Cost (USD) |
|------|------------|
| PCT filing fee | ~2,600 |
| International search fee | ~2,200 |
| International examination fee | ~2,200 |
| Translation and national phase fees | Varies by country |
| Total (filing only) | ~5,000-7,000 |
| Total (including national phase in 5 countries) | ~30,000-50,000 |

---

## 10. PRIOR ART ANALYSIS

### 10.1 Comparison with Major E-Commerce Platforms

| Feature | Amazon | Flipkart | Myntra | Nykaa | 3 Boxes Luxury (This Invention) |
|---------|--------|----------|--------|-------|--------------------------------|
| Cross-Portal Product Aggregation | No (own catalog only) | No (own catalog only) | No (own catalog only) | No (own catalog only) | **Yes** (Myntra + Nykaa + Amazon + Flipkart + CaratLane + Tanishq + BlueStone + Voylla) |
| AI Virtual Try-On with Multi-Strategy Cascade | No (single approach) | No | Limited (AR only) | No | **Yes** (Proxy → SDK → Canvas cascade) |
| VLM Verification of Try-On Results | No | No | No | No | **Yes** (6-dimension scoring) |
| Social Media Fashion Analysis | No | No | No (in-app only) | No (in-app only) | **Yes** (OAuth + AI classification) |
| Family Occasion Shopping | No | No | No | No | **Yes** (composition-aware package generation) |
| AI Gift Builder (Multi-Constraint) | Limited (basic filters) | Limited | No | No | **Yes** (5-dimension constraint satisfaction + LLM) |
| Corporate Gifting Campaign Management | No | No | No | No | **Yes** (campaign + branding + CSV import) |
| Consolidated Cross-Portal Purchasing | No | No | No | No | **Yes** (proxy purchasing + tri-partite consent) |

### 10.2 US Patent Search Results for Similar Inventions

| Patent Number | Title | Assignee | Relevance | Key Differentiator |
|---------------|-------|----------|-----------|-------------------|
| US 11,830,118 | Virtual Clothing Try-On | Snap Inc. | Medium — wearable VTO only | No cross-portal aggregation, no cascade fallback, no social analysis, no family shopping |
| US 11,315,162 | Blended Reality Systems | Amazon | Medium — AR overlay only | No cross-portal aggregation, no social analysis, no family shopping |
| US 11,580,592 | Customized Virtual Store | Amazon | Medium-High — e-commerce + VTO | Single-portal only, no social fashion analysis, no family shopping, no corporate gifting |
| US 11,158,121 | Generating Realistic Clothing Try-On | Google | Medium — diffusion-based VTO | Single strategy, no cascade, no cross-portal, no social analysis |
| US 11,922,550 | Hierarchical Text-Driven VTO | Google | Medium-High — text-to-product | No cross-portal aggregation, no social analysis, no family shopping |
| US 8,275,590 | Virtual-Wearable Items in Video Feed | Zugara | Low — AR only, wearable only | Fundamentally different technology (AR vs AI generation), different product domain |
| US 10,482,517 | Real-Time AR Overlays for VTO | Zugara | Low — AR only | No cross-portal, no social analysis, no family shopping |
| US 10,810,647 | Hybrid Virtual/Physical Jewelry Shopping | James Avery | Low — jewelry only, no aggregation | No cross-portal, no social analysis, no family shopping |
| US 2022/0318892 | Clothing VTO Based on Deep Learning | Alibaba | Low — clothing GAN only | Fundamentally different technology, single product domain |
| US 10,810,647 | Hybrid Virtual/Physical Jewelry | James Avery | Low — jewelry AR only | No cross-platform features |

### 10.3 Key Differentiators from Existing Patents

The present invention is distinguished from all identified prior art by the following combination of features, which no single prior art reference or combination of references teaches or suggests:

1. **Cross-Portal Aggregation:** No existing patent teaches or suggests aggregating products from multiple third-party e-commerce portals and enabling consolidated purchasing on behalf of the user. This is a fundamental architectural innovation not contemplated by any prior art.

2. **Multi-Strategy Cascade with Graceful Degradation:** No existing patent teaches a cascading fallback architecture that degrades from AI proxy generation to direct SDK generation to canvas overlay fallback. All existing VTO systems fail completely when their single generation approach is unavailable.

3. **Social Style Profile Generation:** No existing patent teaches generating a comprehensive fashion style profile from social media data with explicit consent, comprising style archetypes, color preferences, brand affinities, and shopping patterns, and using said profile for e-commerce product recommendations.

4. **Family Composition-Aware Package Generation:** No existing patent teaches dynamically generating occasion-specific product packages based on family composition analysis including age, gender, and relationship classification with tiered discount pricing.

5. **Integrated System:** Most critically, no existing patent teaches or suggests the integration of cross-portal aggregation, social fashion analysis, family occasion shopping, AI gift recommendation, and corporate gifting campaign management within a single e-commerce platform. The synergistic combination of these features produces benefits that exceed the sum of individual features, as the social style profile informs cross-portal product curation, family occasion data informs gift recommendations, and corporate branding customizes the presentation of aggregated products.

---

## 11. TECHNICAL ADVANTAGES

The present invention provides the following specific technical advantages over the prior art:

1. **Resilient Virtual Try-On Availability:** The multi-strategy cascading pipeline (proxy → SDK → canvas) ensures the virtual try-on feature remains functional during AI service outages, achieving near-100% feature availability compared to the 0% availability of single-strategy systems during outages.

2. **Cross-Portal Product Discovery:** The platform integration architecture enables product discovery across 8+ e-commerce portals simultaneously, providing users with a comprehensive product selection that no single portal can match.

3. **Consolidated Purchasing Efficiency:** The 3Box Curate system eliminates the need for users to browse, compare, and purchase from multiple portals independently, reducing the average multi-product shopping time from 45+ minutes (across 3 portals) to under 10 minutes (single consolidated transaction).

4. **Social-Informed Personalization:** The Social Style Integration system generates personalized recommendations with higher relevance than browsing-based recommendation engines, as it incorporates the user's actual fashion preferences as expressed through social media engagement rather than inferred from in-app browsing patterns alone.

5. **Family Shopping Automation:** The Family Occasion Shopping engine automates what would otherwise require the user to manually select individual products for each family member, reducing the cognitive load of occasion shopping from O(n×m) (n family members × m products) to O(1) (select a package).

6. **Multi-Constraint Gift Satisfaction:** The AI Gift Builder's constraint satisfaction across 5 dimensions (occasion, recipient, relationship, budget, category) produces more relevant gift recommendations than single-dimension filtering systems, resulting in higher gift satisfaction and lower return rates.

7. **Corporate Gifting Scalability:** The CSV recipient import and per-recipient customization features enable corporate campaigns with hundreds of recipients, each with customized gifts, messages, and delivery addresses — a capability that would require manual individual ordering on existing platforms.

8. **VLM-Quality Assurance:** The VLM verification of AI-generated try-on images with 6-dimension scoring provides automated quality assurance that eliminates the inconsistent user experiences of unverified generation systems.

9. **Iterative Color Accuracy:** The color accuracy refinement loop with hex-code-level corrections produces try-on images with significantly higher color fidelity than single-pass generation systems, critical for luxury products where color accuracy directly impacts purchase decisions.

10. **Consent-First Privacy:** The tri-partite consent management system for cross-portal purchasing and the OAuth-based consent for social data access implement a privacy-first approach that avoids the regulatory risks of unauthorized data scraping.

11. **Category-Specific Intelligence:** The category-aware prompt engineering with sub-classification (e.g., jewelry → earrings/necklace/bracelet/ring/set; corporate gifts → diary/pen/hamper/wallet/trophy) produces more accurate try-on results than one-size-fits-all generation approaches.

12. **Cross-Platform Deployment:** The intelligent proxy routing that adapts to local development, serverless cloud, and mobile PWA environments ensures consistent feature availability across all deployment targets.

13. **Dynamic Pricing Optimization:** The tiered bundle discount system (5% for 3+ items, 10% for 5+ items) combined with occasion-specific package discounts incentivizes larger purchases while maintaining profitability through cross-portal commission optimization.

14. **Dual-Path Gift Recommendation:** The combination of catalog product search (purchasable immediately) with AI-generated suggestions (beyond the catalog) provides a comprehensive gift recommendation experience that addresses both immediate purchase needs and aspirational gifting ideas.

15. **Brand Consistency Through Watermarking:** The automatic watermarking of all AI-generated try-on images protects intellectual property and maintains brand consistency across all user-generated style previews.

---

## 12. INDUSTRIAL APPLICABILITY

### 12.1 E-Commerce Applications

The invention is directly applicable to the e-commerce industry, specifically:

(a) **Multi-Vendor Marketplaces:** The cross-portal aggregation technology enables any e-commerce platform to offer products from competing portals, creating a meta-marketplace experience that transcends individual platform limitations.

(b) **Affiliate Commerce:** The platform integration architecture with affiliate tracking and commission management enables affiliate-driven revenue models where the platform earns commissions on cross-portal purchases executed on behalf of users.

(c) **Subscription Box Services:** The 3Box Curate bundling technology can be applied to subscription box services where AI-curated product bundles are delivered on a recurring basis.

(d) **Price Comparison Services:** The cross-portal product search and price comparison features enable real-time price optimization across multiple e-commerce platforms.

### 12.2 Fashion Industry

The invention is applicable to the fashion industry, specifically:

(a) **Virtual Try-On Services:** The multi-strategy cascading pipeline can be licensed to fashion retailers as a virtual try-on service with guaranteed availability through the cascade architecture.

(b) **Style Consulting:** The Social Style Integration system enables AI-powered style consulting services that analyze a client's fashion preferences and generate personalized recommendations.

(c) **Fashion Data Analytics:** The aggregated style profile data (anonymized) provides fashion industry intelligence about consumer preferences, color trends, and brand affinities.

(d) **Sustainable Fashion:** The cross-portal aggregation enables consumers to find the exact product they need across all available sources, reducing overproduction by improving product-discovery match rates.

### 12.3 Corporate Gifting

The invention is applicable to the corporate gifting industry, specifically:

(a) **Employee Recognition Programs:** The corporate campaign management system enables large-scale employee recognition gift programs with personalized product selection and delivery.

(b) **Client Relationship Management:** Corporate campaigns can be used for client appreciation gifts with branded packaging and personalized messages.

(c) **Onboarding Kits:** The system can generate standardized onboarding gift kits for new employees with corporate branding.

(d) **Festival Gifting at Scale:** The occasion-specific product catalogs combined with CSV recipient import enable large-scale festival gifting campaigns (Diwali, Christmas, New Year) across organizations with thousands of employees.

### 12.4 Social Commerce

The invention is applicable to the social commerce industry, specifically:

(a) **Influencer-Driven Commerce:** The Social Style Integration system can be extended to analyze influencer fashion profiles and generate shoppable recommendations from influencer content.

(b) **Community Shopping:** The family occasion shopping engine can be extended to community or group-based shopping events (e.g., neighborhood Diwali shopping, office secret Santa).

(c) **Social Gifting:** The AI Gift Builder can be integrated with social media platforms to enable gift recommendations directly from social media interactions.

(d) **Wedding Registry:** The combination of family shopping, gift recommendations, and corporate-style campaign management can be adapted for wedding registries where multiple guests contribute to a curated gift collection.

---

**END OF PATENT APPLICATION**

---

*This document is intended as a first draft for review by a qualified patent attorney. It does not constitute legal advice and should be reviewed and refined by a patent professional before filing with any patent office. The claims should be reviewed for proper scope, dependency structure, and compliance with applicable patent law requirements. All figures referenced herein should be prepared by a patent draftsman in compliance with the formatting requirements of the relevant patent office.*
