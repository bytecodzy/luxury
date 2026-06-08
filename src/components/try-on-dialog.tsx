'use client';

/**
 * TryOnDialog — AI Virtual Try-On with IDM-VTON
 *
 * KEY PRINCIPLES:
 * 1. Pre-warm IDM-VTON Space when dialog opens (reduces wait time)
 * 2. Show selfie preview INSTANTLY after upload (before compression)
 * 3. Single synchronous POST request (no broken polling, no in-memory jobs)
 * 4. NO canvas overlay fallback — honest errors with retry
 * 5. 60-second total timeout — never makes the user wait 200+ seconds
 * 6. Clear progress messages so the user knows what's happening
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
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
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

// ── Progress Messages ───────────────────────────────────────────────

const PROGRESS_MESSAGES = [
  { at: 0, text: 'Uploading your photo to AI service...' },
  { at: 15, text: 'AI is analyzing your photo and the product...' },
  { at: 30, text: 'AI is draping the product onto your photo...' },
  { at: 45, text: 'Almost there — generating the final image...' },
  { at: 60, text: 'Adding finishing touches...' },
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
  const [spaceWarming, setSpaceWarming] = useState(false);
  const [spaceReady, setSpaceReady] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Pre-warm IDM-VTON Space when dialog opens ───────────────────
  useEffect(() => {
    if (!open) return;

    // Pre-warm the Space and resolve product image in parallel
    setSpaceWarming(true);
    setSpaceReady(false);

    fetch('/api/try-on/status', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setSpaceReady(data.spaceAwake === true);
        setSpaceWarming(false);
      })
      .catch(() => {
        setSpaceWarming(false);
      });
  }, [open]);

  // ── Reset ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setErrorMessage('');
    setErrorCode('');
    setProgressPercent(0);
    setProgressText('');
    setIsRetrying(false);
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

    // Abort any previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Pre-resolve product image to base64
    let productImageBase64: string | undefined;
    try {
      const imgToFetch = rawProductImage || productImage;
      if (imgToFetch) {
        productImageBase64 = await fetchImageAsBase64(imgToFetch) || undefined;
      }
    } catch {}

    // Start progress simulation
    const progressInterval = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 90) return prev;
        const next = prev + 1;
        // Update progress text based on percentage
        for (let i = PROGRESS_MESSAGES.length - 1; i >= 0; i--) {
          if (next >= PROGRESS_MESSAGES[i].at) {
            setProgressText(PROGRESS_MESSAGES[i].text);
            break;
          }
        }
        return next;
      });
    }, 1500);

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

      clearInterval(progressInterval);

      const data = await response.json();

      if (data.success && data.imageUrl) {
        // SUCCESS — show the AI-generated try-on image
        setProgressPercent(100);
        setProgressText('Done!');
        setResultImage(data.imageUrl);
        setStep('result');
      } else {
        // FAILED — show error with helpful message
        setStep('error');
        setErrorMessage(data.error || 'Virtual try-on failed. Please try again.');
        setErrorCode(data.errorCode || 'UNKNOWN');
      }
    } catch (err) {
      clearInterval(progressInterval);

      if (controller.signal.aborted) {
        // Request was aborted (user closed dialog or started a new request)
        return;
      }

      setStep('error');
      setErrorMessage(
        err instanceof Error && err.name === 'TimeoutError'
          ? 'The request timed out. The AI service may be busy — please try again.'
          : 'Network error. Please check your connection and try again.'
      );
      setErrorCode('NETWORK_ERROR');
    }
  }, [selfieData, productId, productImage, productName, categorySlug, rawProductImage]);

  // ── Retry ────────────────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setStep('generating');
    setErrorMessage('');
    setProgressPercent(5);
    setProgressText('Reconnecting to AI service...');

    // Re-warm the Space first
    try {
      await fetch('/api/try-on/status', { method: 'POST' });
      // Wait a moment for the Space to be ready
      await new Promise(r => setTimeout(r, 2000));
    } catch {}

    setIsRetrying(false);

    // Try generating again
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
                ? 'Here\'s how it looks on you!'
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
                  <Progress
                    value={progressPercent}
                    className="h-2 bg-stone-800 [&>div]:bg-amber-500"
                  />
                  <p className="text-center text-xs text-amber-200/40">
                    {progressPercent}% complete
                  </p>
                </div>

                {/* Info box */}
                <div className="rounded-lg bg-amber-900/10 p-3">
                  <p className="text-xs text-amber-200/50">
                    <span className="font-semibold text-amber-300/60">✨ How it works:</span>{' '}
                    Our AI (IDM-VTON) analyzes your photo, understands your body shape,
                    and realistically drapes the product onto your image. This usually takes
                    20-40 seconds.
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

                {/* Disclaimer */}
                <p className="text-center text-xs text-amber-200/30">
                  AI-generated preview — actual fit may vary
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
