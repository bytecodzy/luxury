'use client';

/**
 * TryOnDialog v2.0 — Fast, Reliable AI Virtual Try-On
 *
 * KEY PRINCIPLES:
 * 1. Instant selfie preview (show raw image BEFORE compression)
 * 2. Disclaimer → immediately opens file picker (no double-click needed)
 * 3. Hard 55-second client timeout with friendly "try later" message
 * 4. 3BOXES watermark on ALL generated/saved images
 * 5. Full-body output (not half image)
 * 6. Works on both preview and Vercel
 * 7. NEVER frustrate the user — clear progress, honest timeouts
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
  X,
  RotateCcw,
  Download,
  AlertCircle,
  RefreshCw,
  Zap,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';

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
  onBackgroundJob?: (step: 'generating' | 'result') => void;
  onResetBackground?: () => void;
  onShareToInfluencer?: (imageDataUrl: string) => void;
}

type Step = 'upload' | 'preview' | 'generating' | 'result' | 'timeout';

// ── Constants ──────────────────────────────────────────────────────

const CLIENT_TIMEOUT_MS = 55_000; // 55 seconds — hard client timeout
const GENERATE_TIMEOUT_MSG = 'The AI service is currently busy. Please try again in a few minutes — it usually works on the second attempt!';

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

function add3BoxesWatermark(imageDataUrl: string, productName: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;

        // ── Top-right "3BOXES" badge ──
        ctx.save();
        ctx.globalAlpha = 0.85;
        const badgeW = Math.floor(w * 0.32);
        const badgeH = Math.floor(h * 0.038);
        const badgeX = w - badgeW - 12;
        const badgeY = 12;
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(218,165,32,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.stroke();
        ctx.fillStyle = '#daa520';
        ctx.font = `bold ${Math.max(9, Math.floor(badgeH * 0.5))}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✨ 3BOXES AI TRY-ON', badgeX + badgeW / 2, badgeY + badgeH * 0.7);
        ctx.restore();

        // ── Bottom watermark bar ──
        ctx.save();
        ctx.globalAlpha = 0.75;
        const barH = Math.max(32, Math.floor(h * 0.05));
        const barY = h - barH - 6;
        ctx.fillStyle = 'rgba(28,25,23,0.65)';
        ctx.beginPath();
        ctx.roundRect(w * 0.1, barY, w * 0.8, barH, 6);
        ctx.fill();

        // Product name
        const nameFontSize = Math.max(10, Math.floor(barH * 0.35));
        ctx.fillStyle = '#daa520';
        ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        const displayName = (productName || 'Product').substring(0, 35);
        ctx.fillText(displayName, w / 2, barY + nameFontSize + 4);

        // "3BOXES GIFTS" branding
        const brandFontSize = Math.max(8, Math.floor(barH * 0.28));
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#a8a29e';
        ctx.font = `${brandFontSize}px Arial, sans-serif`;
        ctx.fillText('3BOXES GIFTS • AI Style Preview', w / 2, barY + nameFontSize + brandFontSize + 6);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
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
  { at: 0, text: 'Uploading your photo to AI service...' },
  { at: 15, text: 'AI is analyzing your photo and the product...' },
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
  onBackgroundJob,
  onResetBackground,
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
    onResetBackground?.();
  }, [onResetBackground]);

  // ── Disclaimer handlers ──────────────────────────────────────────
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
    // KEY FIX: Immediately open file picker after accepting — NO second click needed!
    setTimeout(() => fileInputRef.current?.click(), 100);
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

        // Show preview IMMEDIATELY with the original image — no 30 second wait!
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

    // Pre-resolve product image to base64
    let productImageBase64: string | undefined;
    try {
      const imgToFetch = rawProductImage || productImage;
      if (imgToFetch) {
        productImageBase64 = await fetchImageAsBase64(imgToFetch) || undefined;
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

    // HARD 55-second timeout — never make user wait more than 60 seconds total
    const timeoutId = setTimeout(() => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
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
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const data = await response.json();

      // Canvas mode — AI unavailable, generate client-side overlay
      if (data.mode === 'canvas' || data.code === 'AI_CANVAS_MODE') {
        // Try to generate a canvas overlay with 3BOXES watermark
        try {
          const canvasResult = await generateCanvasOverlay(
            selfieData,
            productImage,
            productName,
            data.productImageBase64 || productImageBase64,
            categorySlug,
          );
          const watermarked = await add3BoxesWatermark(canvasResult, productName);
          setResultImage(canvasResult);
          setWatermarkedResult(watermarked);
          setProgressPercent(100);
          setStep('result');
          onBackgroundJob?.('result');
        } catch {
          setStep('timeout');
          setErrorMessage(GENERATE_TIMEOUT_MSG);
        }
        return;
      }

      if (data.success && data.imageUrl) {
        // SUCCESS — show the AI-generated try-on image
        setProgressPercent(100);
        setProgressText('Done!');
        setResultImage(data.imageUrl);

        // Add 3BOXES watermark
        try {
          const watermarked = await add3BoxesWatermark(data.imageUrl, productName);
          setWatermarkedResult(watermarked);
        } catch {
          setWatermarkedResult(data.imageUrl);
        }

        setStep('result');
        onBackgroundJob?.('result');
      } else if (data.jobId) {
        // Polling mode — server returned a job ID
        await pollForJobResult(data.jobId, timeoutId, controller, productImageBase64);
      } else {
        // FAILED
        setStep('timeout');
        setErrorMessage(data.error || GENERATE_TIMEOUT_MSG);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
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
  }, [selfieData, productId, productImage, productName, categorySlug, rawProductImage, onBackgroundJob]);

  // ── Poll for job result ──────────────────────────────────────────
  const pollForJobResult = useCallback(async (
    jobId: string,
    timeoutId: NodeJS.Timeout,
    controller: AbortController,
    productImageBase64?: string,
  ) => {
    const pollStartTime = Date.now();
    const maxPollTime = CLIENT_TIMEOUT_MS - 5000; // Leave 5s buffer
    let pollCount = 0;

    const poll = async (): Promise<void> => {
      if (controller.signal.aborted) return;
      if (Date.now() - pollStartTime > maxPollTime) {
        clearTimeout(timeoutId);
        setStep('timeout');
        setErrorMessage(GENERATE_TIMEOUT_MSG);
        return;
      }

      pollCount++;
      try {
        const pollRes = await fetch(`/api/try-on?jobId=${jobId}`, {
          signal: AbortSignal.timeout(10000),
        });
        const pollData = await pollRes.json();

        if (pollData.progress) {
          setProgressText(pollData.progress);
        }

        // Update progress based on phase
        if (pollData.pipelinePhase === 'hf-tryon') setProgressPercent(30);
        else if (pollData.pipelinePhase === 'generation') setProgressPercent(50);
        else if (pollData.pipelinePhase === 'complete') setProgressPercent(90);
        else if (pollCount > 1) setProgressPercent(Math.min(85, 25 + pollCount * 4));

        if (pollData.status === 'completed' && pollData.imageUrl) {
          clearTimeout(timeoutId);
          setProgressPercent(100);
          setResultImage(pollData.imageUrl);

          // Add 3BOXES watermark
          try {
            const watermarked = await add3BoxesWatermark(pollData.imageUrl, productName);
            setWatermarkedResult(watermarked);
          } catch {
            setWatermarkedResult(pollData.imageUrl);
          }

          setStep('result');
          onBackgroundJob?.('result');
          return;
        }

        if (pollData.status === 'failed') {
          clearTimeout(timeoutId);

          // Try canvas overlay as fallback
          try {
            const canvasResult = await generateCanvasOverlay(
              selfieData!,
              productImage,
              productName,
              productImageBase64,
              categorySlug,
            );
            const watermarked = await add3BoxesWatermark(canvasResult, productName);
            setResultImage(canvasResult);
            setWatermarkedResult(watermarked);
            setProgressPercent(100);
            setStep('result');
            onBackgroundJob?.('result');
          } catch {
            setStep('timeout');
            setErrorMessage(GENERATE_TIMEOUT_MSG);
          }
          return;
        }

        // Still processing — poll again after 2 seconds
        await new Promise(r => setTimeout(r, 2000));
        return poll();
      } catch (err) {
        if (controller.signal.aborted) return;
        // Connection reset — retry
        if (pollCount < 30) {
          await new Promise(r => setTimeout(r, 2000));
          return poll();
        }
        clearTimeout(timeoutId);
        setStep('timeout');
        setErrorMessage(GENERATE_TIMEOUT_MSG);
      }
    };

    await poll();
  }, [selfieData, productImage, productName, categorySlug, onBackgroundJob]);

  // ── Canvas overlay fallback ──────────────────────────────────────
  const generateCanvasOverlay = useCallback(async (
    selfieDataUrl: string,
    prodImage: string,
    prodName: string,
    prodImageBase64?: string,
    catSlug?: string,
  ): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const selfieImg = document.createElement('img');
        selfieImg.onload = () => {
          const canvas = document.createElement('canvas');
          const width = Math.max(selfieImg.naturalWidth, 512);
          const height = Math.max(selfieImg.naturalHeight, 680);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(selfieDataUrl);
            return;
          }

          // Draw the selfie
          ctx.drawImage(selfieImg, 0, 0, width, height);

          // Subtle vignette
          const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
          vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
          vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
          ctx.fillStyle = vignetteGrad;
          ctx.fillRect(0, 0, width, height);

          // Get overlay position based on category
          const pos = getCategoryOverlayPosition(catSlug || '');
          const overlayW = Math.floor(pos.w * width);
          const overlayH = Math.floor(pos.h * height);
          const overlayCX = pos.x * width;
          const overlayCY = pos.y * height;

          const renderProduct = (productImg?: HTMLImageElement) => {
            if (productImg) {
              ctx.save();
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

              // Shadow for depth
              ctx.shadowColor = 'rgba(0,0,0,0.35)';
              ctx.shadowBlur = 12;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;

              // Semi-transparent blend
              ctx.globalAlpha = 0.55;

              // Rounded clip
              ctx.beginPath();
              const radius = Math.min(10, drawW * 0.06, drawH * 0.06);
              ctx.roundRect(drawX, drawY, drawW, drawH, radius);
              ctx.clip();
              ctx.drawImage(productImg, drawX, drawY, drawW, drawH);
              ctx.restore();

              // Gold border
              ctx.save();
              ctx.globalAlpha = 0.4;
              ctx.strokeStyle = '#daa520';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2, radius + 1);
              ctx.stroke();
              ctx.restore();
            }

            resolve(canvas.toDataURL('image/png'));
          };

          // Try loading product image
          const productImg = document.createElement('img');
          let resolved = false;

          const finish = (img?: HTMLImageElement) => {
            if (resolved) return;
            resolved = true;
            renderProduct(img);
          };

          productImg.onload = () => finish(productImg);
          productImg.onerror = () => finish();

          // Timeout for product image loading
          setTimeout(() => finish(), 5000);

          if (prodImageBase64 && prodImageBase64.startsWith('data:')) {
            productImg.src = prodImageBase64;
          } else {
            let imgSrc = prodImage;
            if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
              imgSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
            } else if (imgSrc.startsWith('//')) {
              imgSrc = `/api/image-proxy?url=${encodeURIComponent(`https:${imgSrc}`)}`;
            }
            productImg.src = imgSrc;
          }
        };
        selfieImg.onerror = () => resolve(selfieDataUrl);
        selfieImg.src = selfieDataUrl;
      } catch {
        resolve(selfieDataUrl);
      }
    });
  }, []);

  // ── Category-aware overlay positioning ──
  function getCategoryOverlayPosition(categorySlug: string): { x: number; y: number; w: number; h: number } {
    const cat = (categorySlug || '').toLowerCase();

    if (cat.includes('jewel') || cat.includes('necklace') || cat.includes('pendant') || cat.includes('earring')) {
      return { x: 0.5, y: 0.38, w: 0.5, h: 0.2 };
    }
    if (cat.includes('watch')) {
      return { x: 0.3, y: 0.6, w: 0.25, h: 0.25 };
    }
    if (cat.includes('saree') || cat.includes('fashion') || cat.includes('shirt') || cat.includes('kurta') || cat.includes('dress')) {
      return { x: 0.5, y: 0.5, w: 0.5, h: 0.4 };
    }
    if (cat.includes('fragrance') || cat.includes('perfume')) {
      return { x: 0.55, y: 0.4, w: 0.25, h: 0.35 };
    }
    if (cat.includes('leather') || cat.includes('bag') || cat.includes('wallet')) {
      return { x: 0.4, y: 0.45, w: 0.35, h: 0.35 };
    }
    // Default — center upper body
    return { x: 0.5, y: 0.45, w: 0.45, h: 0.35 };
  }

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
      await new Promise(r => setTimeout(r, 2000));
    } catch {}

    setIsRetrying(false);
    handleGenerate();
  }, [handleGenerate]);

  // ── Download result with 3BOXES watermark ────────────────────────
  const handleDownload = useCallback(() => {
    // Use the watermarked version for download
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
                ? 'AI is busy right now'
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
                      I Understand & Agree
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
                    Our AI analyzes your photo, understands your body shape,
                    and realistically drapes the product onto your image.
                    This usually takes 20-40 seconds.
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
                  <Image
                    src={watermarkedResult || resultImage!}
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
                  AI-generated preview with 3BOXES watermark · Actual fit may vary
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
                      AI is Busy Right Now
                    </p>
                    <p className="mt-1 text-sm text-amber-200/60 max-w-sm">
                      {errorMessage || GENERATE_TIMEOUT_MSG}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-900/10 p-3">
                  <p className="text-xs text-amber-200/50">
                    <span className="font-semibold text-amber-300/60">Tip:</span>{' '}
                    The AI service may be under heavy load. Trying again usually works.
                    Best results come during off-peak hours.
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
