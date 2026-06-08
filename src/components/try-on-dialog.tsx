'use client';

/**
 * TryOnDialog v5 — Instant Preview, Reliable Try-On, Never Fails
 *
 * KEY PRINCIPLES:
 * 1. Selfie preview shown INSTANTLY after file read (before compression)
 * 2. "Create Try-On" button available as soon as selfie data is ready
 * 3. Single synchronous POST to /api/try-on (no polling, no jobs)
 * 4. 55-second hard client timeout — never wait 200+ seconds
 * 5. Canvas fallback ALWAYS succeeds — user ALWAYS gets a result
 * 6. Pre-warm IDM-VTON Space when dialog opens (parallel with upload)
 * 7. Clear progress messages so user knows what's happening
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
  RotateCcw,
  Download,
  AlertCircle,
  RefreshCw,
  Zap,
  Shirt,
} from 'lucide-react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────────

interface TryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage: string;
  categorySlug?: string;
  rawProductImage?: string;
}

type Step = 'upload' | 'preview' | 'generating' | 'result' | 'error';

// ── Helper: Compress image ─────────────────────────────────────────

function compressImage(dataUrl: string, maxSize = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// ── Helper: Fetch image as base64 ──────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url;

  const strategies: string[] = [];

  if (url.startsWith('//')) {
    strategies.push(`/api/image-proxy?url=${encodeURIComponent(`https:${url}`)}`);
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    strategies.push(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    strategies.push(url);
  } else if (url.startsWith('/') && !url.startsWith('/api/')) {
    strategies.push(url);
  }

  for (const fetchUrl of strategies) {
    try {
      const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
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

// ── Canvas Fallback ────────────────────────────────────────────────

/**
 * Client-side canvas composite that overlays the product on the selfie.
 * This is the "never fails" fallback — it ALWAYS produces a result.
 */
function generateCanvasFallback(
  selfieData: string,
  productImageUrl: string,
  productName: string,
  productImageBase64?: string,
  categorySlug?: string,
): Promise<string> {
  return new Promise((resolve) => {
    const createMinimalResult = (): string => {
      try {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 680;
        const cx = c.getContext('2d');
        if (cx) {
          const grad = cx.createLinearGradient(0, 0, 0, 680);
          grad.addColorStop(0, '#1c1917'); grad.addColorStop(1, '#292524');
          cx.fillStyle = grad; cx.fillRect(0, 0, 512, 680);
          cx.fillStyle = '#daa520'; cx.font = 'bold 22px Arial, sans-serif'; cx.textAlign = 'center';
          cx.fillText('✨ Style Preview', 256, 300);
          cx.fillStyle = '#a8a29e'; cx.font = '14px Arial, sans-serif';
          cx.fillText((productName || 'Product').substring(0, 40), 256, 340);
          cx.fillStyle = '#78716c'; cx.font = '12px Arial, sans-serif';
          cx.fillText('Powered by 3BOXES', 256, 380);
          return c.toDataURL('image/png');
        }
      } catch {}
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
    };

    try {
      const selfieImg = document.createElement('img');
      const cat = (categorySlug || '').toLowerCase();

      selfieImg.onload = () => {
        const canvas = document.createElement('canvas');
        const width = Math.max(selfieImg.naturalWidth, 512);
        const height = Math.max(selfieImg.naturalHeight, 680);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(createMinimalResult()); return; }

        // 1. Draw the selfie as the base
        ctx.drawImage(selfieImg, 0, 0, width, height);

        // 2. Subtle vignette overlay for premium feel
        const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, width, height);

        // 3. Determine overlay position based on category
        let overlayX: number, overlayY: number, overlayW: number, overlayH: number;
        const centerX = width / 2;

        if (cat.includes('jewel') || cat.includes('necklace')) {
          overlayX = centerX - width * 0.2;
          overlayY = height * 0.35;
          overlayW = width * 0.4;
          overlayH = height * 0.18;
        } else if (cat.includes('watch')) {
          overlayX = width * 0.15;
          overlayY = height * 0.55;
          overlayW = width * 0.25;
          overlayH = width * 0.25;
        } else if (cat.includes('saree') || cat.includes('fashion') || cat.includes('shirt') || cat.includes('dress')) {
          overlayX = centerX - width * 0.28;
          overlayY = height * 0.35;
          overlayW = width * 0.56;
          overlayH = height * 0.38;
        } else if (cat.includes('fragrance')) {
          overlayX = centerX + width * 0.05;
          overlayY = height * 0.35;
          overlayW = width * 0.25;
          overlayH = height * 0.3;
        } else {
          overlayX = centerX - width * 0.2;
          overlayY = height * 0.38;
          overlayW = width * 0.4;
          overlayH = height * 0.28;
        }

        // 4. Load and draw product image
        const productImg = document.createElement('img');
        let resolved = false;

        const finish = (img?: HTMLImageElement) => {
          if (resolved) return;
          resolved = true;

          if (img) {
            // Draw product image at the calculated position
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            // Maintain aspect ratio
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const slotAspect = overlayW / overlayH;
            let drawW = overlayW;
            let drawH = overlayH;
            if (imgAspect > slotAspect) {
              drawH = drawW / imgAspect;
            } else {
              drawW = drawH * imgAspect;
            }
            const drawX = overlayX + (overlayW - drawW) / 2;
            const drawY = overlayY + (overlayH - drawH) / 2;

            // Semi-transparent overlay for blending
            ctx.globalAlpha = 0.55;
            const cornerRadius = Math.min(12, drawW * 0.08);
            ctx.beginPath();
            ctx.roundRect(drawX, drawY, drawW, drawH, cornerRadius);
            ctx.clip();
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();

            // Glow border
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = '#daa520';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2, cornerRadius + 1);
            ctx.stroke();
            ctx.restore();

            // Product label
            ctx.save();
            const labelFontSize = Math.max(9, Math.floor(drawW * 0.06));
            ctx.font = `600 ${labelFontSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            const labelText = productName.substring(0, 28);
            const labelWidth = ctx.measureText(labelText).width + 16;
            const labelHeight = labelFontSize + 8;
            const labelX = drawX + drawW / 2 - labelWidth / 2;
            const labelY = drawY + drawH + 6;

            ctx.fillStyle = 'rgba(28,25,23,0.75)';
            ctx.beginPath();
            ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
            ctx.fill();
            ctx.fillStyle = '#daa520';
            ctx.globalAlpha = 0.9;
            ctx.fillText(labelText, drawX + drawW / 2, labelY + labelFontSize + 2);
            ctx.restore();
          }

          // Badge
          ctx.save();
          ctx.globalAlpha = 0.92;
          const badgeW = Math.floor(width * 0.38);
          const badgeH = Math.floor(height * 0.042);
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

          // Bottom watermark
          ctx.save();
          ctx.globalAlpha = 0.7;
          const wmFontSize = Math.max(10, Math.floor(width * 0.017));
          const wmLabelFontSize = Math.max(8, Math.floor(width * 0.013));
          const wmBarHeight = Math.max(wmFontSize + wmLabelFontSize + 16, 36);
          const wmBarY = height - wmBarHeight - 8;
          ctx.fillStyle = 'rgba(28,25,23,0.6)';
          ctx.beginPath();
          ctx.roundRect(width * 0.15, wmBarY, width * 0.7, wmBarHeight, 6);
          ctx.fill();
          ctx.fillStyle = '#daa520';
          ctx.font = `bold ${wmFontSize}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('AI Style Preview', width / 2, wmBarY + wmFontSize + 4);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#a8a29e';
          ctx.font = `${wmLabelFontSize}px Arial, sans-serif`;
          ctx.fillText('Powered by 3BOXES', width / 2, wmBarY + wmFontSize + wmLabelFontSize + 6);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };

        productImg.onload = () => finish(productImg);
        productImg.onerror = () => finish();

        // Timeout: if product image doesn't load in 5s, continue without it
        setTimeout(() => finish(), 5000);

        // Prefer base64 data URL if available (no CORS issues)
        if (productImageBase64 && productImageBase64.startsWith('data:')) {
          productImg.src = productImageBase64;
        } else {
          let imgSrc = productImageUrl;
          if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
            imgSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
          } else if (imgSrc.startsWith('//')) {
            imgSrc = `/api/image-proxy?url=${encodeURIComponent(`https:${imgSrc}`)}`;
          } else if (imgSrc.startsWith('/') && !imgSrc.startsWith('/api/')) {
            imgSrc = `${window.location.origin}${imgSrc}`;
          }
          productImg.src = imgSrc;
        }
      };

      selfieImg.onerror = () => resolve(createMinimalResult());
      selfieImg.src = selfieData;
    } catch {
      resolve(createMinimalResult());
    }
  });
}

// ── Progress Messages ───────────────────────────────────────────────

const PROGRESS_MESSAGES = [
  { at: 0, text: 'Uploading your photo to AI service...' },
  { at: 10, text: 'AI is analyzing your photo and the product...' },
  { at: 20, text: 'AI is draping the product onto your photo...' },
  { at: 40, text: 'AI is generating the final try-on image...' },
  { at: 60, text: 'Almost there — adding finishing touches...' },
  { at: 80, text: 'Finalizing your style preview...' },
];

// ── Component ──────────────────────────────────────────────────────

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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [spaceReady, setSpaceReady] = useState(false);
  const [spaceWarming, setSpaceWarming] = useState(false);
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Pre-warm IDM-VTON Space when dialog opens ───────────────────

  useEffect(() => {
    if (!open) return;

    // Use a ref to track if we should still update state
    let active = true;

    // Start the pre-warm fetch
    fetch('/api/try-on?action=prewarm')
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        setSpaceReady(data.spaceAwake === true);
        setSpaceWarming(false);
      })
      .catch(() => {
        if (!active) return;
        setSpaceWarming(false);
      });

    return () => { active = false; };
  }, [open]);

  // ── Reset ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setErrorMessage('');
    setErrorCode('');
    setProgressPercent(0);
    setProgressText('');
    setIsCanvasMode(false);
  }, []);

  // ── Handle file selection ────────────────────────────────────────
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please upload an image file (JPG, PNG, WebP)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Image must be less than 10MB');
        return;
      }

      setErrorMessage('');

      // INSTANT PREVIEW: Read the file as data URL and show immediately
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const originalDataUrl = ev.target?.result as string;
        if (!originalDataUrl) return;

        // Show preview IMMEDIATELY with the original image
        setSelfiePreview(originalDataUrl);
        setStep('preview');

        // Compress in the background (smaller = faster upload)
        try {
          const compressed = await compressImage(originalDataUrl, 1024, 0.85);
          setSelfieData(compressed);
        } catch {
          // If compression fails, use the original
          setSelfieData(originalDataUrl);
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // ── Handle drag & drop ───────────────────────────────────────────
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        setErrorMessage('Please drop an image file');
        return;
      }

      setErrorMessage('');

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const originalDataUrl = ev.target?.result as string;
        if (!originalDataUrl) return;

        // INSTANT preview
        setSelfiePreview(originalDataUrl);
        setStep('preview');

        try {
          const compressed = await compressImage(originalDataUrl, 1024, 0.85);
          setSelfieData(compressed);
        } catch {
          setSelfieData(originalDataUrl);
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ── Start progress simulation ────────────────────────────────────
  const startProgress = useCallback(() => {
    setProgressPercent(5);
    setProgressText(PROGRESS_MESSAGES[0].text);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 92) return prev; // Stop at 92% — will jump to 100% on success
        const next = prev + 1;
        for (let i = PROGRESS_MESSAGES.length - 1; i >= 0; i--) {
          if (next >= PROGRESS_MESSAGES[i].at) {
            setProgressText(PROGRESS_MESSAGES[i].text);
            break;
          }
        }
        return next;
      });
    }, 1200); // ~55s to reach 92% with 1% per 1.2s
  }, []);

  // ── Canvas Fallback ──────────────────────────────────────────────
  const doCanvasFallback = useCallback(async (fallbackProductImageBase64?: string) => {
    if (!selfieData) return;

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setProgressPercent(90);
    setProgressText('Creating style preview...');

    try {
      const canvasResult = await generateCanvasFallback(
        selfieData,
        rawProductImage || productImage,
        productName,
        fallbackProductImageBase64,
        categorySlug,
      );
      setProgressPercent(100);
      setProgressText('Done!');
      setResultImage(canvasResult);
      setIsCanvasMode(true);
      setStep('result');
    } catch {
      // Even canvas failed — show error
      setStep('error');
      setErrorMessage('Could not generate style preview. Please try again.');
      setErrorCode('CANVAS_FAILED');
    }
  }, [selfieData, productImage, productName, categorySlug, rawProductImage]);

  // ── Generate Try-On ──────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selfieData) {
      setErrorMessage('Please wait for image to finish processing...');
      return;
    }

    setStep('generating');
    setErrorMessage('');
    setIsCanvasMode(false);

    // Abort any previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startProgress();

    // Pre-resolve product image to base64
    let productImageBase64: string | undefined;
    try {
      const imgToFetch = rawProductImage || productImage;
      if (imgToFetch) {
        productImageBase64 = await fetchImageAsBase64(imgToFetch) || undefined;
      }
    } catch {}

    // 55-second hard client timeout — if no result by then, use canvas
    const clientTimeout = setTimeout(async () => {
      if (controller.signal.aborted) return;
      controller.abort();
      console.warn('[try-on] Client timeout (55s) — using canvas fallback');
      await doCanvasFallback(productImageBase64);
    }, 55_000);

    try {
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          selfieData,
          productImageUrl: rawProductImage || productImage,
          productImageBase64,
          productName,
          categorySlug: categorySlug || '',
        }),
        signal: controller.signal,
      });

      clearTimeout(clientTimeout);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const data = await response.json();

      if (data.success && data.imageUrl) {
        // SUCCESS — show the AI-generated try-on image
        setProgressPercent(100);
        setProgressText('Done!');
        setResultImage(data.imageUrl);
        setIsCanvasMode(false);
        setStep('result');
      } else if (data.mode === 'canvas' || data.errorCode === 'CANVAS_MODE') {
        // CANVAS MODE — AI couldn't generate, use client-side canvas
        await doCanvasFallback(data.productImageBase64 || productImageBase64);
      } else {
        // ERROR — show error with helpful message
        setStep('error');
        setErrorMessage(data.error || 'Virtual try-on failed. Please try again.');
        setErrorCode(data.errorCode || 'UNKNOWN');
      }
    } catch (err) {
      clearTimeout(clientTimeout);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (controller.signal.aborted) {
        // Already handled by client timeout or user cancel
        return;
      }

      // Network error — try canvas fallback
      await doCanvasFallback(productImageBase64);
    }
  }, [selfieData, productId, productImage, productName, categorySlug, rawProductImage, startProgress, doCanvasFallback]);

  // ── Retry ────────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    // Re-warm the Space first
    try {
      await fetch('/api/try-on?action=prewarm');
    } catch {}
    // Then try generating again
    handleGenerate();
  }, [handleGenerate]);

  // ── Download result ──────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `3boxes-tryon-${productName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultImage, productName]);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-900/40 via-rose-900/30 to-amber-900/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI Virtual Try-On
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              {step === 'result'
                ? isCanvasMode
                  ? 'Here\'s your style preview!'
                  : 'Here\'s how it looks on you!'
                : step === 'error'
                ? 'Something went wrong'
                : <>
                    Upload your selfie and see how{' '}
                    <span className="text-amber-300">{productName}</span> looks on you
                  </>
              }
            </DialogDescription>
          </DialogHeader>

          {/* Space status indicator */}
          {step === 'upload' && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {spaceWarming ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                  <span className="text-amber-300/60">Warming up AI service...</span>
                </>
              ) : spaceReady ? (
                <>
                  <Zap className="h-3 w-3 text-green-400" />
                  <span className="text-green-300/60">AI service ready — best quality available</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-amber-400/50" />
                  <span className="text-amber-300/40">AI will use alternative generation</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Upload ── */}
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
                    <p className="text-sm font-semibold text-amber-100">{productName}</p>
                    <p className="text-xs text-amber-200/40">Selected for try-on</p>
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
                  <p className="mt-1 text-xs text-amber-200/40">
                    Drag & drop or click to browse · JPG, PNG, WebP
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Tips */}
                <div className="rounded-lg bg-amber-900/10 p-3">
                  <p className="text-xs text-amber-200/50">
                    <span className="font-semibold text-amber-300/60">💡 Tips:</span> Use a clear,
                    well-lit selfie facing the camera for the best results. Full-body or
                    upper-body photos work best for clothing items.
                  </p>
                </div>

                {errorMessage && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {errorMessage}
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Preview ── */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Side-by-side preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/40">
                    {selfiePreview && (
                      <Image
                        src={selfiePreview}
                        alt="Your selfie"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 240px"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      You
                    </div>
                  </div>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/40">
                    <Image
                      src={productImage}
                      alt={productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 240px"
                    />
                    <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      Product
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!selfieData}
                  className="w-full bg-amber-700 hover:bg-amber-600 text-white font-semibold py-3 text-base"
                  size="lg"
                >
                  {!selfieData ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing photo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Create Virtual Try-On
                    </>
                  )}
                </Button>

                {!selfieData && (
                  <p className="text-center text-xs text-amber-200/40">
                    Compressing your photo for faster upload...
                  </p>
                )}

                {/* Change photo link */}
                <button
                  onClick={() => {
                    setSelfiePreview(null);
                    setSelfieData(null);
                    setStep('upload');
                  }}
                  className="mx-auto block text-sm text-amber-400/60 hover:text-amber-400 underline"
                >
                  Change photo
                </button>
              </motion.div>
            )}

            {/* ── Step 3: Generating ── */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 py-4"
              >
                {/* Animated AI processing visual */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-amber-900/20 flex items-center justify-center">
                      <Shirt className="h-10 w-10 text-amber-400 animate-pulse" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border-2 border-amber-400/20 animate-ping" />
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-100">
                      Creating Your Look
                    </p>
                    <p className="mt-1 text-sm text-amber-200/50">{progressText}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <Progress
                    value={progressPercent}
                    className="h-2 bg-stone-800 [&>div]:bg-amber-500"
                  />
                  <p className="text-center text-xs text-amber-200/40">
                    {progressPercent}% · Usually takes 20-40 seconds
                  </p>
                </div>

                {/* Info box */}
                <div className="rounded-lg bg-amber-900/10 p-3">
                  <p className="text-xs text-amber-200/50">
                    <span className="font-semibold text-amber-300/60">✨ How it works:</span>{' '}
                    Our AI analyzes your photo, understands your body shape,
                    and realistically drapes the product onto your image. You&apos;ll get
                    a photorealistic preview in under a minute.
                  </p>
                </div>

                {/* Cancel button */}
                <Button
                  variant="ghost"
                  className="mx-auto text-amber-200/40 hover:text-amber-200"
                  onClick={() => {
                    if (abortRef.current) abortRef.current.abort();
                    if (progressIntervalRef.current) {
                      clearInterval(progressIntervalRef.current);
                      progressIntervalRef.current = null;
                    }
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </motion.div>
            )}

            {/* ── Step 4: Result ── */}
            {step === 'result' && resultImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {/* Result image */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/40">
                  <Image
                    src={resultImage}
                    alt={`${productName} virtual try-on`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 480px"
                  />
                  <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-amber-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {isCanvasMode ? 'Style Preview' : 'AI Try-On'}
                  </div>
                  {isCanvasMode && (
                    <div className="absolute top-2 right-2 rounded bg-amber-900/80 px-2 py-0.5 text-xs text-amber-200">
                      Preview Mode
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleDownload}
                    className="flex-1 bg-amber-700 hover:bg-amber-600 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={reset}
                    variant="outline"
                    className="flex-1 border-amber-900/30 text-amber-200 hover:bg-amber-900/20"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-xs text-amber-200/30">
                  {isCanvasMode
                    ? 'Style preview overlay — actual fit may vary'
                    : 'AI-generated preview — actual fit may vary'
                  }
                </p>
              </motion.div>
            )}

            {/* ── Step 5: Error ── */}
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 py-4"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-full bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-amber-100">
                      Try-On Unavailable
                    </p>
                    <p className="mt-1 text-sm text-amber-200/60 max-w-sm">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                {/* Specific guidance based on error code */}
                {errorCode === 'SPACE_SLEEPING' && (
                  <div className="rounded-lg bg-amber-900/10 p-3">
                    <p className="text-xs text-amber-200/50">
                      <span className="font-semibold text-amber-300/60">⏳ AI Warming Up:</span>{' '}
                      The AI service was asleep and is now waking up. This takes about 30-60 seconds.
                      Please try again — it should work this time!
                    </p>
                  </div>
                )}

                {errorCode === 'TIMEOUT' && (
                  <div className="rounded-lg bg-amber-900/10 p-3">
                    <p className="text-xs text-amber-200/50">
                      <span className="font-semibold text-amber-300/60">⏱️ Slow Response:</span>{' '}
                      The AI service may be under heavy load. Trying again usually works.
                      Best results come during off-peak hours.
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleRetry}
                    className="flex-1 bg-amber-700 hover:bg-amber-600 text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={reset}
                    variant="outline"
                    className="flex-1 border-amber-900/30 text-amber-200 hover:bg-amber-900/20"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    New Photo
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
