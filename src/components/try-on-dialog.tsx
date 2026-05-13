'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
}

type Step = 'upload' | 'preview' | 'generating' | 'result';

// ── Image loading helper ─────────────────────────────────────────

function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If CORS fails, try without crossOrigin
      if (crossOrigin) {
        loadImage(src, false).then(resolve).catch(reject);
      } else {
        reject(new Error(`Failed to load image: ${src}`));
      }
    };
    img.src = src;
  });
}

/**
 * Load an image for canvas use. For external URLs, tries to use the
 * image proxy to avoid CORS issues. Falls back to direct loading.
 */
async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
  // For Shopify CDN URLs, try direct first (they support CORS)
  if (url.startsWith('https://cdn.shopify.com') || url.startsWith('https://shopify.com')) {
    try {
      return await loadImage(url, true);
    } catch {
      // If CORS fails, try without crossOrigin (canvas will be tainted but we handle that)
      return await loadImage(url, false);
    }
  }

  // For other external URLs, try through image proxy first
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    try {
      return await loadImage(proxyUrl, true);
    } catch {
      // Proxy failed, try direct
      try {
        return await loadImage(url, true);
      } catch {
        return await loadImage(url, false);
      }
    }
  }

  // For protocol-relative URLs
  if (url.startsWith('//')) {
    return loadImageForCanvas('https:' + url);
  }

  // For local paths
  return loadImage(url, false);
}

// ── Poll for AI job result ───────────────────────────────────────

async function pollForResult(
  jobId: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await fetch(`/api/try-on?jobId=${jobId}`);
      const data = await res.json();
      if (data.status === 'completed' && data.imageUrl) return data.imageUrl;
      if (data.status === 'failed')
        throw new Error(data.error || 'Generation failed');
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
    }
  }
  return null;
}

// ── Client-side canvas compositing fallback ──────────────────────

async function createClientSideComposite(
  selfieDataUrl: string,
  productImageUrl: string,
  productName: string
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Load selfie
    const selfieImg = await loadImage(selfieDataUrl, false);

    // Set canvas size to selfie dimensions (max 1024)
    let w = selfieImg.width;
    let h = selfieImg.height;
    if (w > 1024 || h > 1024) {
      if (w > h) {
        h = Math.round((h * 1024) / w);
        w = 1024;
      } else {
        w = Math.round((w * 1024) / h);
        h = 1024;
      }
    }
    canvas.width = w;
    canvas.height = h;

    // Draw selfie as background
    ctx.drawImage(selfieImg, 0, 0, w, h);

    // Load and draw product image overlay in bottom-right area
    try {
      let productSrc = productImageUrl;
      if (productSrc.startsWith('/api/image-proxy?url=')) {
        const urlParam = new URL(productSrc, 'http://localhost').searchParams.get('url');
        if (urlParam) productSrc = urlParam;
      }

      const productImg = await loadImageForCanvas(productSrc);
      const prodSize = Math.min(w * 0.35, 300);
      const prodX = w - prodSize - 20;
      const prodY = h - prodSize - 60;

      // Draw product with rounded corners and shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Rounded rect clip
      const r = 12;
      ctx.beginPath();
      ctx.moveTo(prodX + r, prodY);
      ctx.lineTo(prodX + prodSize - r, prodY);
      ctx.quadraticCurveTo(prodX + prodSize, prodY, prodX + prodSize, prodY + r);
      ctx.lineTo(prodX + prodSize, prodY + prodSize - r);
      ctx.quadraticCurveTo(prodX + prodSize, prodY + prodSize, prodX + prodSize - r, prodY + prodSize);
      ctx.lineTo(prodX + r, prodY + prodSize);
      ctx.quadraticCurveTo(prodX, prodY + prodSize, prodX, prodY + prodSize - r);
      ctx.lineTo(prodX, prodY + r);
      ctx.quadraticCurveTo(prodX, prodY, prodX + r, prodY);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(productImg, prodX, prodY, prodSize, prodSize);
      ctx.restore();

      // Border around product
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)'; // amber-600
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(prodX + r, prodY);
      ctx.lineTo(prodX + prodSize - r, prodY);
      ctx.quadraticCurveTo(prodX + prodSize, prodY, prodX + prodSize, prodY + r);
      ctx.lineTo(prodX + prodSize, prodY + prodSize - r);
      ctx.quadraticCurveTo(prodX + prodSize, prodY + prodSize, prodX + prodSize - r, prodY + prodSize);
      ctx.lineTo(prodX + r, prodY + prodSize);
      ctx.quadraticCurveTo(prodX, prodY + prodSize, prodX, prodY + prodSize - r);
      ctx.lineTo(prodX, prodY + r);
      ctx.quadraticCurveTo(prodX, prodY, prodX + r, prodY);
      ctx.closePath();
      ctx.stroke();

      // Product name label below product image
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
      const nameText =
        productName.length > 25
          ? productName.substring(0, 25) + '...'
          : productName;
      ctx.fillText(nameText, prodX, prodY + prodSize + 16);
    } catch (e) {
      console.warn('Could not load product image for composite:', e);
    }

    // Draw 3BOXES LUXURY watermark in bottom-left
    drawWatermark(ctx, w, h);

    // "Style Preview" badge in top-left
    ctx.fillStyle = 'rgba(217, 119, 6, 0.9)'; // amber-600
    const badgeText = '\u2728 STYLE PREVIEW';
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeX = 12;
    const badgeY = 12;
    const badgeW = textWidth + 16;
    const badgeH = 24;

    ctx.beginPath();
    ctx.moveTo(badgeX + 4, badgeY);
    ctx.lineTo(badgeX + badgeW - 4, badgeY);
    ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + 4);
    ctx.lineTo(badgeX + badgeW, badgeY + badgeH - 4);
    ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - 4, badgeY + badgeH);
    ctx.lineTo(badgeX + 4, badgeY + badgeH);
    ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - 4);
    ctx.lineTo(badgeX, badgeY + 4);
    ctx.quadraticCurveTo(badgeX, badgeY, badgeX + 4, badgeY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1c1917'; // stone-950
    ctx.fillText(badgeText, badgeX + 8, badgeY + 16);

    try {
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      // Canvas tainted (CORS) — try without the product image overlay
      console.warn('Canvas tainted, returning selfie with watermark only:', e);
      // Redraw just the selfie + watermark
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(selfieImg, 0, 0, w, h);
      drawWatermark(ctx, w, h);
      return canvas.toDataURL('image/jpeg', 0.92);
    }
  } catch (e) {
    console.error('Client-side composite failed:', e);
    return null;
  }
}

// ── Draw 3BOXES LUXURY watermark on canvas ─────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWatermark(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  // Try to draw logo + text watermark
  try {
    const logoImg = document.createElement('img');
    // Synchronous check: if logo is already cached by the browser, draw it
    // We'll use the text-only watermark as the reliable path and attempt logo async in addWatermark
    throw new Error('Use text-only watermark for inline drawing');
  } catch {
    // Text-only watermark — reliable, no async image loading needed
    const textHeight = Math.max(28, canvasHeight * 0.035);
    const padding = 8;
    const watermarkText = '3 BOXES LUXURY';
    ctx.font = `bold ${textHeight * 0.5}px sans-serif`;
    const textW = ctx.measureText(watermarkText).width;

    ctx.fillStyle = 'rgba(28, 25, 23, 0.75)'; // stone-950 with alpha
    roundRect(
      ctx,
      12,
      canvasHeight - textHeight - padding * 2 - 8,
      textW + padding * 2 + 8,
      textHeight + padding * 2,
      6
    );
    ctx.fill();

    // Amber accent line
    ctx.fillStyle = 'rgba(217, 119, 6, 0.8)'; // amber-600
    ctx.fillRect(12, canvasHeight - textHeight - padding * 2 - 8, 3, textHeight + padding * 2);

    ctx.font = `bold ${textHeight * 0.5}px sans-serif`;
    ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
    ctx.fillText(watermarkText, 12 + padding + 4, canvasHeight - textHeight / 2 - 4);
  }
}

// ── Watermark for saved images (with logo) ──────────────────────

async function addWatermark(imageDataUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageDataUrl;

  try {
    const img = await loadImage(imageDataUrl, false);
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  } catch {
    return imageDataUrl;
  }

  // Draw 3BOXES LUXURY logo watermark in bottom-left
  try {
    const logoImg = await loadImage('/images/logo.png', false);
    const logoW = 100;
    const logoH = Math.round((logoImg.height / logoImg.width) * logoW);
    const logoX = 15;
    const logoY = canvas.height - logoH - 15;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(28, 25, 23, 0.75)';
    const pad = 6;
    roundRect(
      ctx,
      logoX - pad,
      logoY - pad,
      logoW + pad * 2 + 140,
      logoH + pad * 2,
      6
    );
    ctx.fill();

    // Amber accent line on left
    ctx.fillStyle = 'rgba(217, 119, 6, 0.8)';
    ctx.fillRect(logoX - pad, logoY - pad, 3, logoH + pad * 2);

    ctx.globalAlpha = 0.85;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    ctx.globalAlpha = 1.0;

    // Brand text
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
    ctx.fillText('3 BOXES LUXURY', logoX + logoW + 10, logoY + logoH / 2 + 5);

    // Gifts tagline
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(217, 119, 6, 0.6)';
    ctx.fillText('Premium Gifting', logoX + logoW + 10, logoY + logoH / 2 + 18);
  } catch {
    // Text-only watermark fallback
    ctx.fillStyle = 'rgba(28, 25, 23, 0.75)';
    roundRect(ctx, 12, canvas.height - 40, 200, 30, 4);
    ctx.fill();

    // Amber accent line
    ctx.fillStyle = 'rgba(217, 119, 6, 0.8)';
    ctx.fillRect(12, canvas.height - 40, 3, 30);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
    ctx.fillText('3 BOXES LUXURY', 20, canvas.height - 20);
  }

  try {
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    // Canvas tainted — return original
    return imageDataUrl;
  }
}

// ── Image compression ────────────────────────────────────────────

/**
 * Compress an image file to reduce payload size before sending to the API.
 * Resizes to max 1024px on the longest side and reduces quality.
 */
function compressImage(
  file: File,
  maxSize = 1024,
  quality = 0.8
): Promise<string> {
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

// ── Main Component ───────────────────────────────────────────────

export function TryOnDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  categorySlug,
}: TryOnDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [isClientComposite, setIsClientComposite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setError(null);
    setProgress('');
    setIsClientComposite(false);
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

  const handleGenerate = useCallback(async () => {
    if (!selfieData) return;

    setStep('generating');
    setError(null);
    setProgress('Uploading your photo...');
    setIsClientComposite(false);

    try {
      // Try server-side AI generation first
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          selfieData,
          productImageUrl: productImage,
          productName,
          categorySlug: categorySlug || '',
        }),
        signal: AbortSignal.timeout(120000),
      });

      const data = await response.json();

      if (response.ok && data.jobId) {
        // Poll for AI result
        setProgress('AI is generating your try-on look...');
        const result = await pollForResult(data.jobId);
        if (result) {
          setResultImage(result);
          setStep('result');
          return;
        }
      }

      // If AI service unavailable, use client-side canvas fallback
      if (
        data.code === 'AI_SERVICE_UNAVAILABLE' ||
        response.status === 503
      ) {
        setProgress('AI service unavailable. Creating visual preview...');
        const compositeResult = await createClientSideComposite(
          selfieData,
          productImage,
          productName
        );
        if (compositeResult) {
          setResultImage(compositeResult);
          setIsClientComposite(true);
          setStep('result');
          return;
        }
      }

      throw new Error(data.error || 'Failed to generate try-on');
    } catch (err) {
      // On any network error, try client-side fallback
      if (err instanceof DOMException && err.name === 'AbortError') {
        setProgress('Request timed out. Trying visual preview...');
      }

      // Try client-side composite as last resort
      try {
        const compositeResult = await createClientSideComposite(
          selfieData,
          productImage,
          productName
        );
        if (compositeResult) {
          setResultImage(compositeResult);
          setIsClientComposite(true);
          setStep('result');
          return;
        }
      } catch {
        // Client-side composite also failed
      }

      setError(
        err instanceof Error ? err.message : 'Something went wrong'
      );
      setStep('preview');
    }
  }, [selfieData, productId, productImage, productName, categorySlug]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleSaveImage = useCallback(async () => {
    if (!resultImage) return;
    try {
      const watermarked = await addWatermark(resultImage);
      const link = document.createElement('a');
      link.href = watermarked;
      link.download = `3boxes-tryon-${productName
        .replace(/\s+/g, '-')
        .toLowerCase()}.jpg`;
      link.click();
    } catch {
      // Fallback: save without watermark
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `3boxes-tryon-${productName
        .replace(/\s+/g, '-')
        .toLowerCase()}.jpg`;
      link.click();
    }
  }, [resultImage, productName]);

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

            {/* Step 3: Generating */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                  <div className="relative rounded-full bg-amber-900/20 p-6">
                    <Sparkles className="h-10 w-10 animate-pulse text-amber-400" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-amber-100">
                  Creating Your Look
                </h3>
                <p className="mt-2 text-center text-sm text-amber-200/40">
                  Our AI is analyzing your photo and generating a virtual
                  try-on.
                  <br />
                  This may take 30–60 seconds...
                </p>
                <div className="mt-6 flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400/60" />
                  <span className="text-xs text-amber-200/30">
                    {progress || 'Processing with AI...'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Step 4: Result */}
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
                    {isClientComposite ? 'Style Preview' : 'AI Generated'}
                  </div>
                </div>

                <p className="text-center text-xs text-amber-200/30">
                  {isClientComposite
                    ? 'This is a visual style preview. For AI-generated results, try again when the AI service is available.'
                    : 'This is an AI-generated visualization. Actual appearance may vary.'}
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={handleSaveImage}
                    className="flex-1 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Save with Logo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
