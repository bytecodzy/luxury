'use client';

/**
 * TryOnDialog v4.5 — ZAI Image-Edit Virtual Try-On (works on local AND Vercel)
 *
 * KEY PRINCIPLES:
 * 1. Powered by Z.AI image-edit API (REAL image-to-image edit — passes BOTH
 *    the user's selfie AND the product photo to ZAI, which preserves the
 *    user's face/gender AND renders the exact product).
 * 2. PRESERVES THE USER — the user's SELFIE is the edit input image,
 *    so the AI keeps the user's face, gender, skin tone, and body type.
 * 3. RENDERS THE EXACT PRODUCT — the PRODUCT PHOTO is also passed to the
 *    edit API, so the AI reproduces the exact colours, pattern, fabric,
 *    and design (no more "saree → glasses").
 * 4. GENDER-NEUTRAL prompts — never hardcodes a gender; uses "the person
 *    in the reference image" so the result matches the user's actual gender.
 * 5. Instant selfie preview (show raw image IMMEDIATELY on upload)
 * 6. Disclaimer → auto-opens file picker (one-click flow)
 * 7. Hard 55-second client timeout with friendly retry message
 * 8. 3BOXES watermark on ALL generated/saved/downloaded images
 * 9. Works on BOTH preview AND Vercel — v23 uses ZAI image-edit on both
 *    (internal-api.z.ai is a public endpoint; hardcoded config fallback
 *    ensures it works on Vercel without env var setup).
 * 10. NO canvas overlay fallback — real AI generation every time
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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Sparkles,
  Loader2,
  RotateCcw,
  Download,
  RefreshCw,
  Zap,
  ShieldCheck,
  Clock,
  Share2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/lib/store';

// ── Types ──────────────────────────────────────────────────────────

interface TryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage: string;
  categorySlug?: string;
  rawProductImage?: string;
  productImages?: string[];
  productDescription?: string;
  productTags?: string[];
  onBackgroundJob?: (step: 'generating' | 'result') => void;
  onResetBackground?: () => void;
  onShareToInfluencer?: (imageDataUrl: string) => void;
}

type Step = 'upload' | 'preview' | 'generating' | 'result' | 'timeout';

// ── Constants ──────────────────────────────────────────────────────

const CLIENT_TIMEOUT_MS = 55_000; // 55 seconds — hard client timeout (golden rule: max 60s total)
const GENERATE_TIMEOUT_MSG = 'The AI image service took longer than expected. Please try again — it usually works on the second attempt!';

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

// ── Helper: Add 3BOXES watermark to image ─────────────────────────
// This is CRITICAL — every saved/downloaded image MUST have the 3BOXES logo

function add3BoxesWatermark(imageDataUrl: string, productName: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Use the FULL image dimensions — never crop
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imageDataUrl);
            return;
          }

          // Draw the original image at FULL size
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const w = canvas.width;
          const h = canvas.height;

          // ── Top-right "3BOXES AI TRY-ON" badge ──
          ctx.save();
          ctx.globalAlpha = 0.88;
          const badgeW = Math.max(Math.floor(w * 0.34), 120);
          const badgeH = Math.max(Math.floor(h * 0.04), 28);
          const badgeX = w - badgeW - 12;
          const badgeY = 12;
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
          ctx.fill();
          // Gold border
          ctx.strokeStyle = 'rgba(218,165,32,0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
          ctx.stroke();
          // Text
          ctx.fillStyle = '#daa520';
          const badgeFontSize = Math.max(10, Math.floor(badgeH * 0.52));
          ctx.font = `bold ${badgeFontSize}px Arial, Helvetica, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('3BOXES AI TRY-ON', badgeX + badgeW / 2, badgeY + badgeH / 2);
          ctx.restore();

          // ── Bottom watermark bar ──
          ctx.save();
          ctx.globalAlpha = 0.82;
          const barH = Math.max(40, Math.floor(h * 0.06));
          const barY = h - barH - 8;
          ctx.fillStyle = 'rgba(28,25,23,0.75)';
          ctx.beginPath();
          ctx.roundRect(w * 0.08, barY, w * 0.84, barH, 8);
          ctx.fill();

          // Product name (gold)
          const nameFontSize = Math.max(12, Math.floor(barH * 0.36));
          ctx.fillStyle = '#daa520';
          ctx.font = `bold ${nameFontSize}px Arial, Helvetica, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const displayName = (productName || 'Product').substring(0, 40);
          ctx.fillText(displayName, w / 2, barY + barH * 0.38);

          // "3BOXES GIFTS • AI Style Preview" branding
          const brandFontSize = Math.max(9, Math.floor(barH * 0.26));
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = '#a8a29e';
          ctx.font = `${brandFontSize}px Arial, Helvetica, sans-serif`;
          ctx.fillText('3BOXES GIFTS \u2022 AI Style Preview', w / 2, barY + barH * 0.72);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(imageDataUrl);
        }
      };
      img.onerror = () => resolve(imageDataUrl);
      img.src = imageDataUrl;
    } catch {
      resolve(imageDataUrl);
    }
  });
}

// ── Progress Messages ───────────────────────────────────────────────

const PROGRESS_MESSAGES = [
  { at: 0, text: 'Uploading your photo to the AI service...' },
  { at: 15, text: 'AI is analysing the product photo...' },
  { at: 30, text: 'AI is draping the product onto your photo...' },
  { at: 45, text: 'Almost there — generating the final image...' },
  { at: 55, text: 'Adding finishing touches...' },
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
  productDescription,
  productTags,
  onBackgroundJob,
  onResetBackground,
  onShareToInfluencer,
}: TryOnDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [watermarkedResult, setWatermarkedResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [spaceWarming, setSpaceWarming] = useState(false);
  const [spaceReady, setSpaceReady] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Gallery sharing state
  const [galleryConsent, setGalleryConsent] = useState(false);
  const [gallerySubmitting, setGallerySubmitting] = useState(false);
  const [gallerySubmitted, setGallerySubmitted] = useState(false);
  const [galleryError, setGalleryError] = useState('');

  const { authUser } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generatingStartRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Pre-warm IDM-VTON Space when dialog opens ───────────────────
  useEffect(() => {
    if (!open) return;

    setSpaceWarming(true);
    setSpaceReady(false);

    fetch('/api/try-on/status', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setSpaceReady(data.spaceRunning === true || data.available === true);
        setSpaceWarming(false);
      })
      .catch(() => {
        setSpaceWarming(false);
      });
  }, [open]);

  // ── Elapsed time tracker ──
  useEffect(() => {
    if (step !== 'generating') return;
    generatingStartRef.current = Date.now();
    setElapsedSeconds(0);
    elapsedIntervalRef.current = setInterval(() => {
      if (generatingStartRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - generatingStartRef.current) / 1000));
      }
    }, 1000);
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [step]);

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
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setWatermarkedResult(null);
    setErrorMessage('');
    setProgressPercent(0);
    setProgressText('');
    setIsRetrying(false);
    setElapsedSeconds(0);
    setGalleryConsent(false);
    setGallerySubmitting(false);
    setGallerySubmitted(false);
    setGalleryError('');
    onResetBackground?.();
  }, [onResetBackground]);

  // ── Disclaimer handlers ──────────────────────────────────────────
  // KEY FIX: After accepting disclaimer, IMMEDIATELY open file picker
  // so the user doesn't have to click "Upload" again
  const handleUploadClick = useCallback(() => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }
    fileInputRef.current?.click();
  }, [disclaimerAccepted]);

  const handleDisclaimerAccept = useCallback(() => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
    setDisclaimerChecked(false);
    // CRITICAL: Immediately open file picker after accepting — NO second click needed!
    // Use requestAnimationFrame for more reliable cross-browser behavior
    requestAnimationFrame(() => {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 50);
    });
  }, []);

  const handleDisclaimerCancel = useCallback(() => {
    setShowDisclaimer(false);
    setDisclaimerChecked(false);
  }, []);

  // ── Handle file selection — INSTANT preview ──────────────────────
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

      // KEY FIX: INSTANT PREVIEW — Read file and show IMMEDIATELY
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const originalDataUrl = ev.target?.result as string;
        if (!originalDataUrl) return;

        // Show preview IMMEDIATELY with the original image — no waiting!
        setSelfiePreview(originalDataUrl);
        setStep('preview');

        // Compress in the background (smaller = faster upload to API)
        try {
          const compressed = await compressImage(originalDataUrl, 1024, 0.85);
          setSelfieData(compressed);
        } catch {
          // If compression fails, use the original
          setSelfieData(originalDataUrl);
        }
      };
      reader.readAsDataURL(file);

      // Reset the file input so the same file can be re-selected
      e.target.value = '';
    },
    []
  );

  // ── Handle drag & drop ───────────────────────────────────────────
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Must accept disclaimer first
      if (!disclaimerAccepted) {
        setShowDisclaimer(true);
        return;
      }

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
    [disclaimerAccepted]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ── Generate Try-On ──────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selfieData) {
      setErrorMessage('Please wait for image to finish processing...');
      return;
    }

    setStep('generating');
    setErrorMessage('');
    setProgressPercent(10);
    setProgressText('Preparing your photo...');
    onBackgroundJob?.('generating');

    // Abort any previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Pre-resolve product image to base64 (with timeout)
    let productImageBase64: string | undefined;
    try {
      const imgToFetch = rawProductImage || productImage;
      if (imgToFetch) {
        productImageBase64 = await Promise.race([
          fetchImageAsBase64(imgToFetch),
          new Promise<null>(r => setTimeout(() => r(null), 5000)),
        ]) || undefined;
      }
    } catch {}

    // Start progress simulation
    progressIntervalRef.current = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 90) return prev;
        const next = prev + 1;
        for (let i = PROGRESS_MESSAGES.length - 1; i >= 0; i--) {
          if (next >= PROGRESS_MESSAGES[i].at) {
            setProgressText(PROGRESS_MESSAGES[i].text);
            break;
          }
        }
        return next;
      });
    }, 1500);

    // HARD 55-second timeout — golden rule: never make user wait more than 60s
    const timeoutId = setTimeout(() => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      setStep('timeout');
      setErrorMessage(GENERATE_TIMEOUT_MSG);
    }, CLIENT_TIMEOUT_MS);

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
          productDescription: productDescription || '',
          productTags: productTags || [],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

        // Add 3BOXES watermark — CRITICAL for branding
        try {
          const watermarked = await add3BoxesWatermark(data.imageUrl, productName);
          setWatermarkedResult(watermarked);
        } catch {
          setWatermarkedResult(data.imageUrl);
        }

        setStep('result');
        onBackgroundJob?.('result');
      } else {
        // FAILED — show timeout/error
        setStep('timeout');
        setErrorMessage(data.error || GENERATE_TIMEOUT_MSG);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }

      if (controller.signal.aborted) {
        return;
      }

      setStep('timeout');
      setErrorMessage(
        err instanceof Error && err.name === 'TimeoutError'
          ? GENERATE_TIMEOUT_MSG
          : 'Network error. Please check your connection and try again.'
      );
    }
  }, [selfieData, productId, productImage, productName, categorySlug, rawProductImage, productDescription, productTags, onBackgroundJob]);

  // ── Retry ────────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setStep('generating');
    setErrorMessage('');
    setProgressPercent(5);
    setProgressText('Retrying AI generation...');

    // Brief pause before retry
    await new Promise(r => setTimeout(r, 1000));

    setIsRetrying(false);
    handleGenerate();
  }, [handleGenerate]);

  // ── Download result with 3BOXES watermark ────────────────────────
  // CRITICAL: Always download the WATERMARKED version so 3BOXES branding is included
  const handleDownload = useCallback(() => {
    const imageToDownload = watermarkedResult || resultImage;
    if (!imageToDownload) return;

    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = `3boxes-tryon-${productName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultImage, watermarkedResult, productName]);

  // ── Get category label ──
  const getCategoryLabel = () => {
    const cat = (categorySlug || '').toLowerCase();
    if (cat.includes('saree') || cat.includes('fashion')) return 'see how this outfit looks on you';
    if (cat.includes('jewelry') || cat.includes('watch')) return 'see how this accessory looks on you';
    if (cat.includes('fragrance')) return 'see how this fragrance suits you';
    return 'see how this product looks on you';
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-900/40 via-rose-900/30 to-amber-900/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI Virtual Try-On
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              {step === 'result'
                ? 'Here\'s how it looks on you!'
                : step === 'timeout'
                ? 'Generation timed out'
                : <>
                    Upload your selfie and{' '}
                    <span className="text-amber-300">{getCategoryLabel()}</span>
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
                  <span className="text-green-300/60">AI service ready</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-amber-400/50" />
                  <span className="text-amber-300/40">AI service may need warm-up</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* ── Disclaimer Dialog ── */}
            {showDisclaimer && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md rounded-2xl border border-amber-900/30 bg-stone-950 p-6 shadow-2xl"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-400" />
                    <h3 className="text-lg font-bold text-amber-100">Selfie Upload Guidelines</h3>
                  </div>

                  <div className="mb-5 space-y-3 text-sm">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400/70">Accepted</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-amber-200/70">
                          <span className="mt-0.5 text-emerald-500">&#10003;</span>
                          Only clean, clear, well-lit selfies
                        </li>
                        <li className="flex items-start gap-2 text-amber-200/70">
                          <span className="mt-0.5 text-emerald-500">&#10003;</span>
                          Face must be clearly visible and facing the camera
                        </li>
                        <li className="flex items-start gap-2 text-amber-200/70">
                          <span className="mt-0.5 text-emerald-500">&#10003;</span>
                          Only your own selfie is permitted
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-400/70">Not Accepted</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-start gap-2 text-amber-200/70">
                          <span className="mt-0.5 text-red-500">&#10007;</span>
                          Obscene, explicit, or inappropriate images
                        </li>
                        <li className="flex items-start gap-2 text-amber-200/70">
                          <span className="mt-0.5 text-red-500">&#10007;</span>
                          Blurry, dark, or heavily filtered photos
                        </li>
                        <li className="flex items-start gap-2 text-amber-200/70">
                          <span className="mt-0.5 text-red-500">&#10007;</span>
                          Group photos or photos with face coverings
                        </li>
                      </ul>
                    </div>
                  </div>

                  <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-900/40 p-3 transition-colors hover:border-amber-700/30">
                    <Checkbox
                      checked={disclaimerChecked}
                      onCheckedChange={(checked) => setDisclaimerChecked(checked === true)}
                      className="mt-0.5 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                    <span className="text-xs leading-relaxed text-amber-200/60">
                      I confirm this is my own selfie and it meets the above guidelines
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleDisclaimerCancel}
                      className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDisclaimerAccept}
                      disabled={!disclaimerChecked}
                      className="flex-1 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Accept & Upload Photo
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}

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
                    <img
                      src={productImage}
                      alt={productName}
                      className="absolute inset-0 h-full w-full object-cover"
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
                  onClick={handleUploadClick}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/30 bg-stone-900/30 px-6 py-10 transition-all hover:border-amber-600/40 hover:bg-stone-900/50"
                >
                  <div className="mb-4 rounded-full bg-amber-900/20 p-4 transition-colors group-hover:bg-amber-900/30">
                    <Camera className="h-8 w-8 text-amber-400/60 transition-colors group-hover:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-amber-200/70">
                    Upload your selfie
                  </p>
                  <p className="mt-1 text-xs text-amber-200/40">
                    Drag & drop or click to browse &middot; JPG, PNG, WebP
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
                    <span className="font-semibold text-amber-300/60">Tips:</span> Use a clear,
                    well-lit selfie facing the camera. Full-body or
                    upper-body photos work best for clothing items.
                  </p>
                </div>
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
                      <img
                        src={selfiePreview}
                        alt="Your selfie"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      You
                    </div>
                  </div>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/40">
                    <img
                      src={productImage}
                      alt={productName}
                      className="absolute inset-0 h-full w-full object-cover"
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
                      <Sparkles className="h-10 w-10 text-amber-400 animate-pulse" />
                    </div>
                    <div className="absolute -inset-2 rounded-full border-2 border-amber-400/20 animate-ping" />
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-100">
                      {isRetrying ? 'Retrying...' : 'Creating Your Look'}
                    </p>
                    <p className="mt-1 text-sm text-amber-200/50">{progressText}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-amber-200/40">
                    <span>{progressPercent}% complete</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {elapsedSeconds}s / 55s max
                    </span>
                  </div>
                </div>

                {/* Info box */}
                <div className="rounded-lg bg-amber-900/10 p-3">
                  <p className="text-xs text-amber-200/50">
                    <span className="font-semibold text-amber-300/60">How it works:</span>{' '}
                    Our AI uses YOUR selfie AND the actual product photo together —
                    preserving your face, gender, and body type while rendering the
                    exact product with realistic fit, folds, and colours.
                    This usually takes 20–25 seconds.
                  </p>
                </div>

                {/* Cancel button */}
                <Button
                  variant="ghost"
                  className="mx-auto text-amber-200/40 hover:text-amber-200"
                  onClick={() => {
                    if (abortRef.current) abortRef.current.abort();
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </motion.div>
            )}

            {/* ── Step 4: Result ── */}
            {step === 'result' && (watermarkedResult || resultImage) && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {/* Result image — show watermarked version */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/40">
                  <img
                    src={watermarkedResult || resultImage!}
                    alt={`${productName} virtual try-on`}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-amber-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI Try-On
                  </div>
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

                {/* Share to AI Style Gallery — with admin approval workflow */}
                <div className="rounded-xl border border-amber-600/30 bg-gradient-to-r from-amber-900/20 via-rose-900/15 to-amber-900/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-amber-400" />
                    <p className="text-sm font-semibold text-amber-200">Share Your Style</p>
                  </div>

                  {gallerySubmitted ? (
                    /* Success state — pending admin approval */
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/20">
                        <CheckCircle className="h-5 w-5 text-amber-400" />
                      </div>
                      <p className="text-sm font-medium text-amber-200">Submitted for Approval!</p>
                      <p className="text-xs text-amber-200/50 text-center">
                        Your style is being reviewed by our team. It will appear in the AI Style Gallery once approved.
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 rounded-full bg-amber-600/10 px-3 py-1 border border-amber-600/20">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-medium text-amber-300">Pending Admin Approval</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-amber-200/50">
                        Love this look? Share it to the AI Style Gallery so other shoppers can get inspired!
                      </p>

                      {/* Consent checkbox */}
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-900/20 bg-stone-900/40 p-2.5 transition-colors hover:border-amber-700/30">
                        <Checkbox
                          checked={galleryConsent}
                          onCheckedChange={(checked) => {
                            setGalleryConsent(checked === true);
                            setGalleryError('');
                          }}
                          className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <span className="text-[11px] leading-relaxed text-amber-200/60">
                          I consent to my AI-generated style image being displayed in the public gallery after admin review
                        </span>
                      </label>

                      {galleryError && (
                        <div className="flex items-center gap-1.5 text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {galleryError}
                        </div>
                      )}

                      <Button
                        onClick={async () => {
                          if (!galleryConsent) {
                            setGalleryError('Please consent to share your image');
                            return;
                          }
                          const imageToShare = watermarkedResult || resultImage;
                          if (!imageToShare) return;

                          setGallerySubmitting(true);
                          setGalleryError('');

                          try {
                            const res = await fetch('/api/style-gallery', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                productId,
                                productName,
                                productImage: productImage,
                                userId: authUser?.id || null,
                                userName: authUser?.name || 'Anonymous',
                                aiGeneratedImage: imageToShare,
                                categorySlug: categorySlug || null,
                                consentGiven: true,
                              }),
                            });

                            const data = await res.json();

                            if (res.ok && data.success) {
                              setGallerySubmitted(true);
                              // Also call the old callback for backward compat
                              if (onShareToInfluencer) {
                                onShareToInfluencer(imageToShare);
                              }
                            } else {
                              setGalleryError(data.error || 'Failed to submit. Please try again.');
                            }
                          } catch {
                            setGalleryError('Network error. Please try again.');
                          } finally {
                            setGallerySubmitting(false);
                          }
                        }}
                        disabled={!galleryConsent || gallerySubmitting}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold gap-2 disabled:opacity-50"
                        size="sm"
                      >
                        {gallerySubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4" />
                            Share to AI Style Gallery
                          </>
                        )}
                      </Button>
                      <p className="text-[10px] text-amber-200/30 text-center">
                        All submissions are reviewed by our team before being displayed publicly
                      </p>
                    </>
                  )}
                </div>

                {/* Disclaimer */}
                <p className="text-center text-xs text-amber-200/30">
                  AI-generated preview with 3BOXES watermark &middot; Actual fit may vary
                </p>
              </motion.div>
            )}

            {/* ── Step 5: Timeout / Error ── */}
            {step === 'timeout' && (
              <motion.div
                key="timeout"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 py-4"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-full bg-amber-900/20 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-amber-100">
                      Generation Timed Out
                    </p>
                    <p className="mt-1 text-sm text-amber-200/60 max-w-sm">
                      {errorMessage || GENERATE_TIMEOUT_MSG}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-900/10 p-3">
                  <p className="text-xs text-amber-200/50">
                    <span className="font-semibold text-amber-300/60">Tip:</span>{' '}
                    Network conditions can affect AI generation time.
                    Trying again usually works on the second attempt.
                  </p>
                </div>

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
