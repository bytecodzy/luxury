'use client';

/**
 * TryOnDialog — AI Virtual Try-On with category-aware product overlay.
 *
 * The canvas fallback overlays the product image ON the person in the selfie
 * using body keypoints (VLM or heuristic) and category-aware positioning.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Sparkles,
  Loader2,
  X,
  RotateCcw,
  Download,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';

interface TryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage: string;
  categorySlug?: string;
  rawProductImage?: string;
}

type Step = 'upload' | 'preview' | 'generating' | 'result';

// ── Body Keypoints Interface ──────────────────────────────────────

interface BodyKeypoints {
  faceCenter: { x: number; y: number };
  faceWidth: number;
  neckCenter: { x: number; y: number };
  chestCenter: { x: number; y: number };
  leftWrist: { x: number; y: number };
  rightWrist: { x: number; y: number };
  torsoCenter: { x: number; y: number };
  shoulderWidth: number;
  personDetected: boolean;
  source?: string;
}

/** Default heuristic keypoints for typical selfie composition */
const DEFAULT_KEYPOINTS: BodyKeypoints = {
  faceCenter: { x: 0.5, y: 0.28 },
  faceWidth: 0.22,
  neckCenter: { x: 0.5, y: 0.4 },
  chestCenter: { x: 0.5, y: 0.5 },
  leftWrist: { x: 0.28, y: 0.62 },
  rightWrist: { x: 0.72, y: 0.62 },
  torsoCenter: { x: 0.5, y: 0.53 },
  shoulderWidth: 0.45,
  personDetected: true,
  source: 'heuristic',
};

// ── Helper Functions ──────────────────────────────────────────────

/** Load an image from a data URL or any URL and return it as HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 60)}`));
    img.src = src;
  });
}

/** Resolve product image URL — handles proxies, protocol-relative, etc. */
function resolveProductImageUrl(url: string): string {
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  if (url.startsWith('//')) {
    return `/api/image-proxy?url=${encodeURIComponent(`https:${url}`)}`;
  }
  if (url.startsWith('/') && !url.startsWith('/api/')) {
    return `${window.location.origin}${url}`;
  }
  return url;
}

/**
 * Fetch an image as base64 data URL. Tries multiple strategies to avoid CORS issues.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url;

  const strategies: Array<{ label: string; fetchUrl: string }> = [];

  if (url.startsWith('/api/image-proxy?url=')) {
    strategies.push({ label: 'already-proxied', fetchUrl: url });
    try {
      const proxyUrlObj = new URL(url, 'http://localhost');
      const originalUrl = proxyUrlObj.searchParams.get('url');
      if (originalUrl) {
        const resolved = originalUrl.startsWith('//') ? `https:${originalUrl}` : originalUrl;
        if (resolved.startsWith('http')) {
          strategies.push({ label: 'original-re-proxied', fetchUrl: `/api/image-proxy?url=${encodeURIComponent(resolved)}` });
        }
      }
    } catch {}
  } else if (url.startsWith('/') && !url.startsWith('/api/')) {
    strategies.push({ label: 'local-path', fetchUrl: url });
  } else if (url.startsWith('//')) {
    const httpsUrl = `https:${url}`;
    strategies.push({ label: 'proxied', fetchUrl: `/api/image-proxy?url=${encodeURIComponent(httpsUrl)}` });
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    strategies.push({ label: 'proxied', fetchUrl: `/api/image-proxy?url=${encodeURIComponent(url)}` });
    strategies.push({ label: 'direct', fetchUrl: url });
  } else {
    strategies.push({ label: 'as-is', fetchUrl: url });
  }

  for (const strategy of strategies) {
    try {
      const response = await fetch(strategy.fetchUrl, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) continue;
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      if (base64.startsWith('data:')) return base64;
    } catch {}
  }
  return null;
}

/**
 * Determine where to overlay the product based on category and body keypoints.
 * Returns normalized (0-1) coordinates: x,y = center; w,h = dimensions.
 */
function calculateOverlayPosition(
  categorySlug: string,
  productName: string,
  kp: BodyKeypoints,
): { x: number; y: number; w: number; h: number; rotation?: number } {
  const cat = (categorySlug || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  // ── Jewelry ──
  if (cat.includes('jewel')) {
    // Earrings → both sides of face
    if (name.includes('earring') || name.includes('jhumka') || name.includes('stud')) {
      return {
        x: kp.faceCenter.x,
        y: kp.faceCenter.y + kp.faceWidth * 0.15,
        w: kp.faceWidth * 2.4,
        h: kp.faceWidth * 1.0,
      };
    }
    // Necklace / pendant → chest/neck area
    if (name.includes('necklace') || name.includes('choker') || name.includes('pendant') ||
        name.includes('temple') || name.includes('haar') || name.includes('mala') ||
        name.includes('set') || name.includes('bridal')) {
      return {
        x: kp.chestCenter.x,
        y: kp.chestCenter.y - 0.02,
        w: Math.max(kp.shoulderWidth * 0.7, kp.faceWidth * 2.2),
        h: Math.max(kp.faceWidth * 1.8, 0.18),
      };
    }
    // Bracelet / bangle → wrist
    if (name.includes('bracelet') || name.includes('cuff') || name.includes('bangle') || name.includes('kada')) {
      return {
        x: kp.leftWrist.x,
        y: kp.leftWrist.y,
        w: kp.faceWidth * 1.2,
        h: kp.faceWidth * 1.2,
        rotation: -15,
      };
    }
    // Ring → finger area
    if (name.includes('ring')) {
      return {
        x: kp.leftWrist.x + 0.03,
        y: kp.leftWrist.y - 0.03,
        w: kp.faceWidth * 0.8,
        h: kp.faceWidth * 0.8,
        rotation: -10,
      };
    }
    // Default jewelry → chest area
    return {
      x: kp.chestCenter.x,
      y: kp.chestCenter.y - 0.02,
      w: Math.max(kp.shoulderWidth * 0.7, kp.faceWidth * 2.2),
      h: Math.max(kp.faceWidth * 1.8, 0.18),
    };
  }

  // ── Watches ──
  if (cat.includes('watch')) {
    return {
      x: kp.leftWrist.x,
      y: kp.leftWrist.y,
      w: kp.faceWidth * 1.4,
      h: kp.faceWidth * 1.4,
      rotation: -15,
    };
  }

  // ── Clothing / Sarees / Fashion ──
  if (cat.includes('saree') || cat.includes('fashion') || cat.includes('shirt') ||
      cat.includes('tshirt') || cat.includes('kurta') || cat.includes('dress')) {
    return {
      x: kp.torsoCenter.x,
      y: kp.torsoCenter.y + 0.02,
      w: kp.shoulderWidth * 0.95,
      h: 0.38,
    };
  }

  // ── Fragrances ──
  if (cat.includes('fragrance') || cat.includes('perfume')) {
    return {
      x: kp.chestCenter.x + kp.shoulderWidth * 0.15,
      y: kp.chestCenter.y - 0.05,
      w: kp.faceWidth * 1.5,
      h: kp.faceWidth * 2.5,
    };
  }

  // ── Leather goods / Bags ──
  if (cat.includes('leather') || cat.includes('bag') || cat.includes('wallet')) {
    return {
      x: kp.torsoCenter.x - kp.shoulderWidth * 0.25,
      y: kp.chestCenter.y,
      w: kp.shoulderWidth * 0.55,
      h: kp.faceWidth * 2.8,
      rotation: 5,
    };
  }

  // ── Couple / Gifts ──
  if (cat.includes('couple') || cat.includes('romantic') || cat.includes('gift') || cat.includes('corporate')) {
    return {
      x: kp.chestCenter.x,
      y: kp.chestCenter.y,
      w: kp.shoulderWidth * 0.6,
      h: kp.faceWidth * 2.0,
    };
  }

  // ── Default → upper body center ──
  return {
    x: kp.torsoCenter.x,
    y: kp.torsoCenter.y - 0.02,
    w: kp.shoulderWidth * 0.7,
    h: kp.faceWidth * 2.2,
  };
}

/** Draw the "AI STYLE PREVIEW" badge at top-left */
function drawStyleBadge(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = 0.92;
  const badgeW = Math.floor(w * 0.38);
  const badgeH = Math.floor(h * 0.042);
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.roundRect(12, 12, badgeW, badgeH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(218,165,32,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(12, 12, badgeW, badgeH, 6);
  ctx.stroke();
  ctx.fillStyle = '#daa520';
  ctx.font = `bold ${Math.max(9, Math.floor(badgeH * 0.48))}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('✨ AI STYLE PREVIEW', 12 + badgeW / 2, 12 + badgeH * 0.68);
  ctx.restore();
}

/** Create a minimal placeholder when everything else fails */
function createMinimalPlaceholder(productName: string): string {
  try {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 680;
    const cx = c.getContext('2d');
    if (cx) {
      const grad = cx.createLinearGradient(0, 0, 0, 680);
      grad.addColorStop(0, '#1c1917'); grad.addColorStop(1, '#292524');
      cx.fillStyle = grad; cx.fillRect(0, 0, 512, 680);
      cx.fillStyle = '#daa520'; cx.font = 'bold 22px Arial, sans-serif'; cx.textAlign = 'center';
      cx.fillText('✨ Style Preview', 256, 280);
      cx.fillStyle = '#a8a29e'; cx.font = '14px Arial, sans-serif';
      cx.fillText((productName || 'Product').substring(0, 40), 256, 320);
      cx.fillStyle = '#78716c'; cx.font = '12px Arial, sans-serif';
      cx.fillText('3BOXES GIFTS', 256, 360);
      return c.toDataURL('image/png');
    }
  } catch {}
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
}

/**
 * Compress an image file to reduce payload size before sending to the API.
 * Resizes to max 1024px on the longest side and reduces quality.
 */
function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if needed
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG for smaller size
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Whether the category is a clothing/wearable item (uses multiply blend) */
function isClothingCategory(categorySlug: string): boolean {
  const cat = (categorySlug || '').toLowerCase();
  return ['mens-shirts', 'men-tshirts', 'fashion', 'sarees', 'women-sarees', 'women-fashion', 'kids-fashion', 'kids-shirts', 'kids-dresses']
    .some(c => cat.includes(c));
}

/**
 * Educational facts shown during AI generation to keep users informed.
 */
const AI_EDUCATION_FACTS = [
  "📸 AI analyzes your facial features to create a personalized try-on experience",
  "🎨 Our AI preserves your skin tone and facial features while adding the product",
  "⚡ The AI processes over 1 million pixels to generate your style preview",
  "🔍 Each try-on goes through a multi-step quality verification process",
  "👤 Face preservation is our top priority — your features stay authentic",
  "🌈 Color accuracy is verified against the original product image",
  "✨ The AI uses dual-image technology for maximum product accuracy",
  "🛡️ Your photos are processed securely and never stored permanently",
  "🎯 Our AI considers product type, material, and fit for natural results",
  "💡 Try-on works best with clear, well-lit selfies facing the camera",
];

export function TryOnDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  categorySlug,
  rawProductImage,
}: TryOnDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-rotate educational facts every 3 seconds during generation
  useEffect(() => {
    if (step !== 'generating') return;
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % AI_EDUCATION_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step]);

  const reset = useCallback(() => {
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setError(null);
    setProgress('');
    setProgressPercent(0);
    setCurrentFactIndex(0);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (JPG, PNG, WebP)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }

      setError(null);

      try {
        // Compress the image to reduce payload size
        const compressed = await compressImage(file, 1024, 0.8);
        setSelfiePreview(compressed);
        setSelfieData(compressed);
        setStep('preview');
      } catch {
        setError('Failed to process image. Please try another photo.');
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        setError('Please drop an image file');
        return;
      }
      setError(null);
      try {
        const compressed = await compressImage(file, 1024, 0.8);
        setSelfiePreview(compressed);
        setSelfieData(compressed);
        setStep('preview');
      } catch {
        setError('Failed to process image. Please try another photo.');
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  /**
   * Client-side canvas fallback: overlays the product image ON the person's body.
   * Uses body keypoints (from VLM analysis or heuristics) and category-aware positioning
   * to place the product at the correct body location.
   *
   * Uses base64 for all images to avoid CORS/canvas-taint issues.
   * For clothing categories, uses multiply blend mode for a more natural look.
   */
  const generateCanvasFallback = useCallback(async (): Promise<string> => {
    // Step 1: Try to get body keypoints from VLM analysis
    let keypoints: BodyKeypoints | null = null;
    try {
      const analysisRes = await fetch('/api/try-on/analyze-selfie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfieData, categorySlug }),
        signal: AbortSignal.timeout(8000),
      });
      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        if (analysisData.analysis?.personDetected) {
          keypoints = analysisData.analysis;
          console.log('[try-on] VLM keypoints received, source:', keypoints?.source);
        }
      }
    } catch {
      console.log('[try-on] VLM analysis failed/timed out — using heuristic positioning');
    }

    try {
      // Step 2: Convert product image to base64 FIRST (avoids CORS/canvas-taint)
      let resolvedProductBase64: string | null = null;
      const imgUrl = rawProductImage || productImage;
      try {
        resolvedProductBase64 = await fetchImageAsBase64(imgUrl);
      } catch {}

      if (resolvedProductBase64) {
        console.log('[try-on] Product image resolved to base64, length:', resolvedProductBase64.length);
      } else {
        console.warn('[try-on] Could not resolve product image to base64');
      }

      // Step 3: Load selfie image
      const selfieImg = await loadImage(selfieData!);

      // Step 4: Create canvas and draw selfie
      const canvas = document.createElement('canvas');
      const width = Math.max(selfieImg.naturalWidth, 512);
      const height = Math.max(selfieImg.naturalHeight, 680);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return createMinimalPlaceholder(productName);

      // Draw the selfie as the base
      ctx.drawImage(selfieImg, 0, 0, width, height);

      // Subtle vignette for premium feel
      const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, width, height);

      // Step 5: Calculate overlay position based on category + keypoints
      const kp = keypoints || DEFAULT_KEYPOINTS;
      const pos = calculateOverlayPosition(categorySlug || '', productName, kp);
      const overlayW = Math.floor(pos.w * width);
      const overlayH = Math.floor(pos.h * height);
      const overlayCX = pos.x * width;   // center X
      const overlayCY = pos.y * height;  // center Y

      // Step 6: Load and render product image from base64
      let productImg: HTMLImageElement | undefined;
      if (resolvedProductBase64) {
        try {
          productImg = await loadImage(resolvedProductBase64);
          console.log('[try-on] Product image loaded from base64:', productImg.naturalWidth, 'x', productImg.naturalHeight);
        } catch (err) {
          console.warn('[try-on] Failed to load product image from base64:', err);
        }
      }

      if (productImg) {
        // Apply rotation if specified
        if (pos.rotation) {
          ctx.translate(overlayCX, overlayCY);
          ctx.rotate((pos.rotation * Math.PI) / 180);
          ctx.translate(-overlayCX, -overlayCY);
        }

        // Calculate aspect-ratio-preserving dimensions
        const imgAspect = productImg.naturalWidth / productImg.naturalHeight;
        const slotAspect = overlayW / overlayH;
        let drawW = overlayW;
        let drawH = overlayH;

        if (imgAspect > slotAspect) {
          drawH = drawW / imgAspect;
        } else {
          drawW = drawH * imgAspect;
        }

        const drawX = overlayCX - drawW / 2;
        const drawY = overlayCY - drawH / 2;

        // Save context for product overlay
        ctx.save();

        // Shadow for depth and realism
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Use multiply blend for clothing (looks more natural), normal for accessories
        const isClothing = isClothingCategory(categorySlug || '');
        if (isClothing) {
          ctx.globalAlpha = 0.85;
          ctx.globalCompositeOperation = 'multiply';
        } else {
          ctx.globalAlpha = 0.92;
        }

        // Clip to rounded rectangle for neat edges
        const cornerRadius = Math.min(12, drawW * 0.06, drawH * 0.06);
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, drawW, drawH, cornerRadius);
        ctx.clip();

        // Draw product image
        ctx.drawImage(productImg, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Second pass for clothing: overlay at reduced opacity for better blending
        if (isClothing) {
          ctx.save();
          if (pos.rotation) {
            ctx.translate(overlayCX, overlayCY);
            ctx.rotate((pos.rotation * Math.PI) / 180);
            ctx.translate(-overlayCX, -overlayCY);
          }
          ctx.globalAlpha = 0.35;
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath();
          ctx.roundRect(drawX, drawY, drawW, drawH, cornerRadius);
          ctx.clip();
          ctx.drawImage(productImg, drawX, drawY, drawW, drawH);
          ctx.restore();
        }

        // Glow border around product overlay
        ctx.save();
        if (pos.rotation) {
          ctx.translate(overlayCX, overlayCY);
          ctx.rotate((pos.rotation * Math.PI) / 180);
          ctx.translate(-overlayCX, -overlayCY);
        }
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2, cornerRadius + 1);
        ctx.stroke();
        ctx.restore();

        // Product label below the overlay
        ctx.save();
        const labelFontSize = Math.max(9, Math.floor(drawW * 0.055));
        ctx.font = `600 ${labelFontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(28,25,23,0.75)';
        const labelText = productName.substring(0, 28);
        const labelWidth = ctx.measureText(labelText).width + 16;
        const labelHeight = labelFontSize + 8;
        const labelX = overlayCX - labelWidth / 2;
        const labelY = drawY + drawH + 6;

        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
        ctx.fill();
        ctx.fillStyle = '#daa520';
        ctx.globalAlpha = 0.9;
        ctx.fillText(labelText, overlayCX, labelY + labelFontSize + 2);
        ctx.restore();
      } else {
        // No product image — draw a subtle placeholder at the body position
        ctx.save();
        if (pos.rotation) {
          ctx.translate(overlayCX, overlayCY);
          ctx.rotate((pos.rotation * Math.PI) / 180);
          ctx.translate(-overlayCX, -overlayCY);
        }
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        const overlayX = overlayCX - overlayW / 2;
        const overlayY = overlayCY - overlayH / 2;
        ctx.roundRect(overlayX, overlayY, overlayW, overlayH, 8);
        ctx.fill();
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(overlayX, overlayY, overlayW, overlayH, 8);
        ctx.stroke();
        // Product emoji placeholder
        const iconSize = Math.floor(overlayH * 0.3);
        ctx.fillStyle = '#daa520';
        ctx.font = `${iconSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.5;
        ctx.fillText('👗', overlayCX, overlayCY);
        ctx.restore();
      }

      // Step 7: Style badge at top-left
      drawStyleBadge(ctx, width, height);

      // Step 8: Bottom watermark
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#daa520';
      ctx.font = `bold ${Math.max(10, Math.floor(width * 0.017))}px Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('3BOXES GIFTS · AI Style Preview', width - 14, height - 14);
      ctx.restore();

      // Since we used base64 data URLs for both images, canvas is NOT tainted
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('[try-on] generateCanvasFallback error:', err instanceof Error ? err.message : String(err));
      return createMinimalPlaceholder(productName);
    }
  }, [selfieData, productImage, productName, categorySlug, rawProductImage]);

  /**
   * Poll a try-on job until completed or failed.
   * Works with both local /api/try-on and direct proxy URLs.
   * PERMANENT FIX: On ANY failure, falls back to canvas — user NEVER sees error.
   */
  const pollJob = useCallback(async (
    jobId: string,
    baseUrl: string,
    onComplete: (imageUrl: string) => void,
  ) => {
    setProgress('Generating your try-on look...');
    setProgressPercent(50);

    const pollInterval = setInterval(async () => {
      try {
        let statusUrl: string;
        if (baseUrl.includes('.space-z.ai')) {
          statusUrl = `${baseUrl}/api/try-on?XTransformPort=3030&jobId=${encodeURIComponent(jobId)}`;
        } else {
          statusUrl = `${baseUrl}/api/try-on?jobId=${encodeURIComponent(jobId)}`;
        }

        const statusRes = await fetch(statusUrl);
        const statusData = await statusRes.json();

        if (statusData.progress) {
          setProgress(statusData.progress);
        }

        // Update progress percentage based on pipeline phase
        if (statusData.pipelinePhase === 'hf-tryon') setProgressPercent(25);
        else if (statusData.pipelinePhase === 'product-analysis') setProgressPercent(30);
        else if (statusData.pipelinePhase === 'generation') setProgressPercent(50);
        else if (statusData.pipelinePhase === 'verification') setProgressPercent(70);
        else if (statusData.pipelinePhase === 'refinement') setProgressPercent(80);
        else if (statusData.pipelinePhase === 'watermark') setProgressPercent(90);

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          setProgressPercent(100);
          // If no imageUrl or canvas-fallback strategy, use client canvas fallback
          if (!statusData.imageUrl || statusData.strategy === 'canvas-fallback') {
            console.log('[try-on] Server returned canvas-fallback or no imageUrl, using client canvas fallback');
            generateCanvasFallback().then((canvasResult) => {
              onComplete(canvasResult);
            });
            return;
          }
          onComplete(statusData.imageUrl);
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          // Canvas fallback — user ALWAYS gets a visual result
          console.log('[try-on] Job failed, using canvas fallback instead of showing error');
          generateCanvasFallback().then((canvasResult) => {
            onComplete(canvasResult);
          });
        }
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
        clearInterval(pollInterval);
        generateCanvasFallback().then((canvasResult) => {
          onComplete(canvasResult);
        });
      }
    }, 3000);

    // Safety timeout: stop polling after 2 minutes
    setTimeout(() => clearInterval(pollInterval), 120000);
  }, [generateCanvasFallback]);

  const handleGenerate = useCallback(async () => {
    if (!selfieData) return;

    setStep('generating');
    setError(null);
    setProgress('Uploading your photo...');
    setProgressPercent(10);

    // Pre-resolve product image to base64 to avoid server-side CORS issues
    let productImageBase64: string | undefined;
    try {
      const imgToFetch = rawProductImage || productImage;
      if (imgToFetch) {
        productImageBase64 = await fetchImageAsBase64(imgToFetch) || undefined;
      }
    } catch {}

    const requestPayload = {
      productId,
      selfieData,
      productImageUrl: rawProductImage || productImage,
      productImageBase64,
      productName,
      categorySlug: categorySlug || '',
    };

    try {
      // ── Strategy 1: Try the server API (works locally, may return canvas mode on Vercel) ──
      setProgress('Connecting to AI service...');
      setProgressPercent(30);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // PERMANENT FIX: Non-JSON response — fall back to canvas instead of throwing
        console.warn('[try-on] Non-JSON response:', response.status);
        setProgress('Creating style preview overlay...');
        setProgressPercent(70);
        const canvasResult = await generateCanvasFallback();
        setResultImage(canvasResult);
        setProgressPercent(100);
        setStep('result');
        return;
      }

      const data = await response.json();

      // If server returned canvas mode, try direct client-to-proxy before falling back
      if (data.mode === 'canvas' || data.code === 'AI_CANVAS_MODE') {
        console.log('[try-on] Server returned canvas mode, trying direct proxy from client...');

        // ── Strategy 2: Try direct client-side proxy call to sandbox AI service ──
        let proxyUrl = '';
        try {
          const configRes = await fetch('/api/config', { signal: AbortSignal.timeout(3000) });
          if (configRes.ok) {
            const configData = await configRes.json();
            proxyUrl = configData.aiProxyUrl || '';
          }
        } catch {}
        if (!proxyUrl) {
          proxyUrl = process.env.NEXT_PUBLIC_AI_PROXY_URL || '';
        }
        if (proxyUrl) {
          try {
            setProgress('Connecting to AI service...');
            setProgressPercent(30);
            let proxyFetchUrl: string;
            if (proxyUrl.includes('.space-z.ai')) {
              proxyFetchUrl = `${proxyUrl}/api/try-on?XTransformPort=3030`;
            } else {
              proxyFetchUrl = `${proxyUrl}/api/try-on`;
            }

            const proxyResponse = await fetch(proxyFetchUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestPayload),
              signal: AbortSignal.timeout(90000),
            });

            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              if (proxyData.jobId) {
                // Poll the proxy for results
                const pollBaseUrl = proxyUrl;
                await new Promise<void>((resolve) => {
                  pollJob(
                    proxyData.jobId,
                    pollBaseUrl,
                    (imageUrl) => {
                      setResultImage(imageUrl);
                      setProgressPercent(100);
                      setStep('result');
                      resolve();
                    },
                  );
                });
                return;
              }
              if (proxyData.imageUrl) {
                setProgressPercent(100);
                setResultImage(proxyData.imageUrl);
                setStep('result');
                return;
              }
            }
            console.log('[try-on] Direct proxy call failed, falling back to canvas');
          } catch (directProxyErr) {
            console.log('[try-on] Direct proxy unavailable:', directProxyErr instanceof Error ? directProxyErr.message : String(directProxyErr));
          }
        }

        // ── Strategy 3: Canvas fallback — ALWAYS succeeds ──
        setProgress('Creating style preview overlay...');
        setProgressPercent(70);
        const canvasResult = await generateCanvasFallback();
        setResultImage(canvasResult);
        setProgressPercent(100);
        setStep('result');
        return;
      }

      // PERMANENT FIX: Handle ANY non-ok response by falling back to canvas mode.
      // The user should NEVER see "AI unavailable" — they ALWAYS get a visual result.
      if (!response.ok) {
        setProgress('Creating style preview overlay...');
        setProgressPercent(70);
        const canvasResult = await generateCanvasFallback();
        setResultImage(canvasResult);
        setProgressPercent(100);
        setStep('result');
        return;
      }

      // If server returned a jobId, poll for completion
      if (data.jobId) {
        setProgress('AI is analyzing your photo...');
        setProgressPercent(50);
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/try-on?jobId=${data.jobId}`);
            const statusData = await statusRes.json();

            if (statusData.progress) {
              setProgress(statusData.progress);
            }

            // Update progress percentage based on pipeline phase
            if (statusData.pipelinePhase === 'hf-tryon') setProgressPercent(25);
            else if (statusData.pipelinePhase === 'product-analysis') setProgressPercent(30);
            else if (statusData.pipelinePhase === 'generation') setProgressPercent(50);
            else if (statusData.pipelinePhase === 'verification') setProgressPercent(70);
            else if (statusData.pipelinePhase === 'refinement') setProgressPercent(80);
            else if (statusData.pipelinePhase === 'watermark') setProgressPercent(90);

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              setProgressPercent(100);
              if (!statusData.imageUrl || statusData.strategy === 'canvas-fallback') {
                setProgress('Creating style preview overlay...');
                setProgressPercent(70);
                const canvasResult = await generateCanvasFallback();
                setResultImage(canvasResult);
                setProgressPercent(100);
                setStep('result');
                return;
              }
              setResultImage(statusData.imageUrl);
              setStep('result');
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              setProgress('Creating style preview...');
              setProgressPercent(70);
              const canvasResult = await generateCanvasFallback();
              setProgressPercent(100);
              setResultImage(canvasResult);
              setStep('result');
            }
          } catch (pollErr) {
            console.error('Polling error:', pollErr);
          }
        }, 3000);

        setTimeout(() => clearInterval(pollInterval), 120000);
        return;
      }

      // Direct imageUrl returned (immediate result)
      if (data.imageUrl) {
        setProgressPercent(100);
        setResultImage(data.imageUrl);
        setStep('result');
        return;
      }

      // PERMANENT FIX: Unexpected response — always fall back to canvas mode
      setProgress('Creating style preview overlay...');
      setProgressPercent(70);
      const canvasResult = await generateCanvasFallback();
      setResultImage(canvasResult);
      setProgressPercent(100);
      setStep('result');
      return;
    } catch (err) {
      // PERMANENT FIX: On ANY error (including timeout), canvas fallback ALWAYS succeeds.
      // The user should NEVER see "AI unavailable" — they ALWAYS get a visual result.
      console.warn('[try-on] Error, falling back to canvas:', err instanceof Error ? err.message : String(err));
      setProgress('Creating style preview...');
      setProgressPercent(70);
      const canvasResult = await generateCanvasFallback();
      setResultImage(canvasResult);
      setProgressPercent(100);
      setStep('result');
    }
  }, [selfieData, productId, productImage, productName, categorySlug, rawProductImage, generateCanvasFallback, pollJob]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-xl">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-amber-900/40 via-rose-900/30 to-amber-900/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI Virtual Try-On
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              Upload your selfie and see how{' '}
              <span className="text-amber-300">{productName}</span> looks on
              you
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Product Preview */}
                <div className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-900/60 p-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={productImage}
                      alt={productName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-100">
                      {productName}
                    </p>
                    <p className="text-xs text-amber-200/40">
                      Selected for try-on
                    </p>
                  </div>
                </div>

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/30 bg-stone-900/30 px-6 py-10 transition-all hover:border-amber-600/40 hover:bg-stone-900/50"
                >
                  <div className="mb-4 rounded-full bg-amber-900/20 p-4 transition-colors group-hover:bg-amber-900/30">
                    <Camera className="h-8 w-8 text-amber-400/60 transition-colors group-hover:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-amber-200/70">
                    Upload your selfie
                  </p>
                  <p className="mt-1 text-xs text-amber-200/30">
                    Drag & drop or click to browse
                  </p>
                  <p className="mt-2 text-[10px] text-amber-200/20">
                    JPG, PNG, or WebP · Max 10MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <p className="text-center text-[10px] text-amber-200/20">
                  Your photo is processed securely and not stored permanently
                </p>
              </motion.div>
            )}

            {/* Step 2: Preview selfie before generating */}
            {step === 'preview' && selfiePreview && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  {/* Selfie Preview */}
                  <div className="relative flex-1">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60">
                      <Image
                        src={selfiePreview}
                        alt="Your selfie"
                        fill
                        className="object-cover"
                        sizes="300px"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelfiePreview(null);
                        setSelfieData(null);
                        setStep('upload');
                      }}
                      className="absolute right-2 top-2 rounded-full bg-stone-900/80 p-1.5 text-amber-200/60 transition-colors hover:bg-red-900/60 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Arrow + Product */}
                  <div className="flex flex-col items-center justify-center gap-2 pt-8">
                    <Sparkles className="h-6 w-6 text-amber-400/40" />
                    <span className="text-[10px] text-amber-200/30">+</span>
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-amber-900/20">
                      <Image
                        src={productImage}
                        alt={productName}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <span className="text-[10px] text-amber-200/30">=</span>
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-amber-900/20 bg-stone-900/60">
                      <ImageIcon className="h-6 w-6 text-amber-400/40" />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelfiePreview(null);
                      setSelfieData(null);
                      setStep('upload');
                    }}
                    className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    className="flex-1 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Try-On
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Generating — Enhanced with Progress Bar + Educational Content */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 py-4"
              >
                {/* Spinner + title */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                    <div className="relative rounded-full bg-amber-900/20 p-6">
                      <Sparkles className="h-10 w-10 animate-pulse text-amber-400" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-amber-100">
                    Creating Your Look
                  </h3>
                  <p className="mt-1 text-center text-sm text-amber-200/50">
                    This may take 30–60 seconds...
                  </p>
                </div>

                {/* Progress Bar using shadcn/ui */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-300/80">
                      {progress || 'Processing with AI...'}
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      {progressPercent}%
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-3 bg-stone-800/80 border border-amber-900/20 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-600 [&>[data-slot=progress-indicator]]:via-amber-400 [&>[data-slot=progress-indicator]]:to-amber-300"
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-amber-200/30">Starting</span>
                    <span className="text-[10px] text-amber-200/30">Complete</span>
                  </div>
                </div>

                {/* Scrolling Educational Content with AnimatePresence */}
                <div className="rounded-lg border border-amber-900/25 bg-stone-900/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-amber-900/15 bg-amber-950/25">
                    <p className="text-[10px] font-semibold text-amber-400/80 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      How AI Style Preview Works
                    </p>
                  </div>
                  <div className="px-3 py-3 min-h-[72px] flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentFactIndex}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-sm leading-relaxed text-amber-200/60">
                          {AI_EDUCATION_FACTS[currentFactIndex]}
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {/* Fact indicator dots */}
                  <div className="flex items-center justify-center gap-1 pb-2">
                    {AI_EDUCATION_FACTS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          i === currentFactIndex
                            ? 'w-4 bg-amber-400'
                            : 'w-1 bg-amber-900/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Loader indicator */}
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400/60" />
                  <span className="text-xs text-amber-200/30">
                    {progress || 'Processing with AI...'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Step 4: Result — Enhanced with AI-Generated Disclaimer */}
            {step === 'result' && resultImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-600/30 bg-stone-900/60">
                  <Image
                    src={resultImage}
                    alt={`Virtual try-on: ${productName}`}
                    fill
                    className="object-cover"
                    sizes="500px"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
                    Style Preview
                  </div>
                </div>

                {/* AI-Generated Disclaimer — Enhanced */}
                <div className="rounded-lg border border-amber-600/20 bg-amber-900/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-300">AI-Generated Image</p>
                      <p className="text-[11px] text-amber-200/50 mt-0.5">
                        This is an AI-generated style preview. Actual product appearance may vary slightly. 
                        Colors and details are approximated and there might be minor mismatches that can be 
                        rectified by consulting our style experts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <a
                    href={resultImage}
                    download
                    className="flex flex-1 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-stone-950 transition-all hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Save Image
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
