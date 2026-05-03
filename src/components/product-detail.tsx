'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Package, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Camera, Loader2, RotateCcw, Download, ImageIcon, AlertCircle, Crown } from 'lucide-react';

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  category: string;
  categorySlug: string;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  tags: string[];
}

// ── Image Compression ──────────────────────────────────────────
function compressImage(file: File, maxSize = 1536, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
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
        if (!ctx) { reject(new Error('Canvas error')); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ── Logo Watermark Utility ─────────────────────────────────────
function addLogoWatermark(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imageDataUrl); return; }

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Draw the 3 BOXES logo watermark in gold
      const logoSize = Math.max(40, Math.min(canvas.width, canvas.height) * 0.12);
      const padding = logoSize * 0.3;
      const x = canvas.width - logoSize - padding;
      const y = canvas.height - logoSize - padding;

      // Semi-transparent gold background circle
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
      ctx.strokeStyle = '#D4A843';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gold text
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#D4A843';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // "3" at top
      const fontSize1 = logoSize * 0.28;
      ctx.font = `bold ${fontSize1}px Georgia, serif`;
      ctx.fillText('3', x + logoSize / 2, y + logoSize * 0.3);

      // "BOXES" in middle
      const fontSize2 = logoSize * 0.18;
      ctx.font = `bold ${fontSize2}px Georgia, serif`;
      ctx.fillText('BOXES', x + logoSize / 2, y + logoSize * 0.52);

      // "GIFTS" at bottom
      const fontSize3 = logoSize * 0.13;
      ctx.font = `${fontSize3}px Georgia, serif`;
      ctx.fillText('GIFTS', x + logoSize / 2, y + logoSize * 0.72);

      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

// ── Try-On Dialog ──────────────────────────────────────────────
type Step = 'upload' | 'preview' | 'generating' | 'result';

function getScoreLabel(score: number, type: 'face' | 'product'): { label: string; color: string } {
  if (score >= 9) return { label: type === 'face' ? 'Excellent Face Match' : 'Exact Product Match', color: 'text-emerald-400' };
  if (score >= 7) return { label: type === 'face' ? 'Good Face Match' : 'Close Product Match', color: 'text-emerald-400' };
  if (score >= 5) return { label: type === 'face' ? 'Partial Face Match' : 'Similar Product', color: 'text-amber-400' };
  return { label: type === 'face' ? 'Low Face Match' : 'Different Product', color: 'text-red-400' };
}

function ScoreDots({ score, max = 10 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            i < score
              ? score >= 7
                ? 'bg-emerald-500'
                : score >= 5
                ? 'bg-amber-500'
                : 'bg-red-500'
              : 'bg-stone-700'
          }`}
        />
      ))}
    </div>
  );
}

interface SuggestionItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  categorySlug: string;
}

// Rotating tips shown during generation
const GENERATION_TIPS = [
  '💡 For best face match, use a clear front-facing selfie with good lighting',
  '✨ AI try-on works best with simple backgrounds and no filters',
  '💎 Jewelry looks most accurate when your neck/wrists are clearly visible',
  '👗 Sarees and outfits look best with full-body or waist-up photos',
  '⌚ Watches are most accurate with a clear wrist shot',
  '📸 Natural lighting gives the most realistic try-on results',
  '🎨 AI generates multiple versions and picks the best match for you',
  '🌟 The 3 BOXES AI uses advanced face-preservation technology',
];

function TryOnDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  categorySlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage: string;
  categorySlug: string;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [watermarkedResult, setWatermarkedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [faceScore, setFaceScore] = useState<number | null>(null);
  const [productScore, setProductScore] = useState<number | null>(null);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [progressMsg, setProgressMsg] = useState('Analyzing your photo & product...');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const tipTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rotating tips
  useEffect(() => {
    if (step === 'generating') {
      tipTimerRef.current = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % GENERATION_TIPS.length);
      }, 5000);
    }
    return () => {
      if (tipTimerRef.current) clearInterval(tipTimerRef.current);
    };
  }, [step]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setWatermarkedResult(null);
    setError(null);
    setPollCount(0);
    setFaceScore(null);
    setProductScore(null);
    setStrategy(null);
    setSuggestions([]);
    setTipIndex(0);
    setProgressMsg('Analyzing your photo & product...');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (tipTimerRef.current) {
      clearInterval(tipTimerRef.current);
      tipTimerRef.current = null;
    }
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
        const compressed = await compressImage(file, 1536, 0.92);
        setSelfiePreview(compressed);
        setSelfieData(compressed);
        setStep('preview');
      } catch {
        setError('Failed to process image. Please try another photo.');
      }
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!selfieData) return;
    setStep('generating');
    setError(null);
    setPollCount(0);

    try {
      // Step 1: Start the job
      const postRes = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          selfieData,
          productImageUrl: productImage,
        }),
      });

      const contentType = postRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          postRes.status === 413
            ? 'Image is too large. Please try a smaller photo.'
            : postRes.status === 503
            ? 'AI service is currently busy. Please try again later.'
            : `Server error (${postRes.status}). Please try again.`
        );
      }

      const postData = await postRes.json();
      if (!postRes.ok) {
        throw new Error(postData.error || `Error: ${postRes.status}`);
      }

      const jobId = postData.jobId;
      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      // Step 2: Poll for completion
      const maxAttempts = 80;
      let attempts = 0;

      const poll = async () => {
        try {
          const pollRes = await fetch(`/api/try-on?jobId=${jobId}`);
          const pollData = await pollRes.json();

          // Update progress message from server
          if (pollData.progress) setProgressMsg(pollData.progress);

          if (pollData.status === 'completed' && pollData.imageUrl) {
            // Add logo watermark to the result
            const watermarked = await addLogoWatermark(pollData.imageUrl);
            setResultImage(pollData.imageUrl);
            setWatermarkedResult(watermarked);
            setFaceScore(pollData.faceScore || null);
            setProductScore(pollData.productScore || null);
            setStrategy(pollData.strategy || null);
            if (pollData.suggestions?.length) setSuggestions(pollData.suggestions);
            setStep('result');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            return;
          }

          if (pollData.status === 'failed') {
            setError(pollData.error || 'AI generation failed. Please try again.');
            setStep('preview');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            return;
          }

          attempts++;
          setPollCount(attempts);

          // Capture suggestions as soon as they're available
          if (pollData.suggestions?.length && suggestions.length === 0) {
            setSuggestions(pollData.suggestions);
          }

          if (attempts >= maxAttempts) {
            setError('Generation timed out. The AI service may be busy — please try again.');
            setStep('preview');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        } catch (err) {
          attempts++;
          setPollCount(attempts);
          if (attempts >= maxAttempts) {
            setError('Connection lost during generation. Please try again.');
            setStep('preview');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }
      };

      // Poll every 3 seconds
      pollingRef.current = setInterval(poll, 3000);
      // Also do an immediate poll after 2s
      setTimeout(poll, 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. The AI service may be busy — please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
      setStep('preview');
    }
  }, [selfieData, productId, productImage, suggestions.length]);

  // Get category-specific label
  const getCategoryLabel = () => {
    switch (categorySlug) {
      case 'sarees':
      case 'fashion':
        return 'see how this outfit looks on you';
      case 'jewelry':
      case 'watches':
        return 'see how this accessory looks on you';
      case 'fragrances':
        return 'see how this fragrance suits you';
      case 'leather-goods':
        return 'see how this bag looks with you';
      case 'romantic-gifts':
      case 'couple-gifts':
        return 'see how this gift looks with you';
      case 'toys':
        return 'see how this product looks with you';
      case 'home-living':
        return 'visualize this in your space';
      default:
        return 'see how this product looks on you';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="relative bg-gradient-to-r from-amber-900/40 via-rose-900/30 to-amber-900/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
              <Crown className="h-5 w-5 text-amber-400" />
              AI Virtual Try-On
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              Upload your selfie and{' '}
              <span className="text-amber-300">{getCategoryLabel()}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
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

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/30 bg-stone-900/30 px-6 py-8 transition-all hover:border-amber-600/40 hover:bg-stone-900/50"
              >
                <div className="mb-3 rounded-full bg-amber-900/20 p-4 transition-colors group-hover:bg-amber-900/30">
                  <Camera className="h-8 w-8 text-amber-400/60 transition-colors group-hover:text-amber-400" />
                </div>
                <p className="text-sm font-medium text-amber-200/70">Upload your selfie</p>
                <p className="mt-1 text-xs text-amber-200/30">Click to browse or drag & drop</p>
                <p className="mt-2 text-[10px] text-amber-200/20">JPG, PNG, or WebP · Max 10MB</p>
                <div className="mt-4 rounded-lg border border-amber-900/15 bg-amber-950/20 px-3 py-2 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-1.5">Tips for best results</p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-200/40">
                      <span className="text-emerald-500/60 mt-0.5">✓</span>
                      Face the camera directly, good lighting
                    </li>
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-200/40">
                      <span className="text-emerald-500/60 mt-0.5">✓</span>
                      {['sarees', 'fashion'].includes(categorySlug)
                        ? 'Full body or waist-up photo'
                        : categorySlug === 'jewelry'
                        ? 'Clear face and neck visible'
                        : categorySlug === 'watches'
                        ? 'Show your wrist or full upper body'
                        : 'Upper body photo works best'}
                    </li>
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-200/40">
                      <span className="text-red-500/60 mt-0.5">✗</span>
                      Avoid dark, blurry, or heavily filtered photos
                    </li>
                  </ul>
                </div>
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
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && selfiePreview && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="relative flex-1">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60">
                    <img
                      src={selfiePreview}
                      alt="Your selfie"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 pt-8">
                  <Crown className="h-6 w-6 text-amber-400/40" />
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
                  <Crown className="mr-2 h-4 w-4" />
                  Generate Try-On
                </Button>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === 'generating' && (
            <div className="space-y-5">
              {/* Progress indicator */}
              <div className="flex flex-col items-center py-4">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                  <div className="relative rounded-full bg-amber-900/20 p-5">
                    <Crown className="h-8 w-8 animate-pulse text-amber-400" />
                  </div>
                </div>
                <h3 className="mt-4 text-base font-semibold text-amber-100">
                  Creating Your Look
                </h3>
                <p className="mt-1 text-center text-xs text-amber-200/40">
                  {progressMsg}
                </p>
                <div className="mt-3 flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400/60" />
                  <span className="text-[10px] text-amber-200/30">
                    {pollCount > 0 ? `Processing... (${pollCount * 3}s)` : 'Starting AI...'}
                  </span>
                </div>
                <div className="mt-2 w-48">
                  <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
                      style={{ width: `${Math.min(90, pollCount * 3.5 + 5)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rotating tip */}
              <div className="rounded-lg border border-amber-900/15 bg-amber-950/20 p-3 min-h-[40px]">
                <p className="text-[11px] text-amber-200/50 transition-opacity duration-500">
                  {GENERATION_TIPS[tipIndex]}
                </p>
              </div>

              {/* AI Style Suggestions - shown while generating */}
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400/70" />
                    <p className="text-[11px] font-semibold text-amber-200/60">
                      AI Style Suggestions — Pairs well with {productName}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {suggestions.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="group cursor-pointer rounded-lg border border-amber-900/15 bg-stone-900/40 p-2 transition-all hover:border-amber-600/30 hover:bg-stone-900/60"
                        onClick={() => {
                          const store = useStore.getState();
                          store.setSelectedProductId(s.id);
                          store.setCategory(s.categorySlug);
                          store.setView('detail');
                          reset();
                        }}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-md bg-stone-800 mb-2">
                          <Image
                            src={s.image}
                            alt={s.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="120px"
                          />
                        </div>
                        <p className="text-[10px] font-medium text-amber-200/70 truncate">{s.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[10px] font-bold text-amber-400">${s.price.toLocaleString()}</p>
                          <p className="text-[8px] text-amber-200/25">{s.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-amber-200/20 text-center">Tap a suggestion to view it while you wait</p>
                </div>
              )}

              {/* Loading placeholders for suggestions if not yet loaded */}
              {suggestions.length === 0 && pollCount > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400/40 animate-pulse" />
                    <p className="text-[11px] font-semibold text-amber-200/40">
                      Loading AI style suggestions...
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-lg border border-amber-900/10 bg-stone-900/30 p-2">
                        <Skeleton className="aspect-square rounded-md bg-stone-800 mb-2" />
                        <Skeleton className="h-3 w-3/4 bg-stone-800 mb-1" />
                        <Skeleton className="h-3 w-1/2 bg-stone-800" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && watermarkedResult && (
            <div className="space-y-4">
              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/60">
                    {selfiePreview && (
                      <img
                        src={selfiePreview}
                        alt="Your selfie"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="text-center text-[10px] font-medium text-amber-200/50">Your Selfie</p>
                </div>
                <div className="space-y-1.5">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-600/30 bg-stone-900/60">
                    <img
                      src={watermarkedResult}
                      alt={`Virtual try-on: ${productName}`}
                      className="h-full w-full object-cover"
                    />
                    {/* 3 BOXES watermark badge */}
                    <div className="absolute left-1.5 top-1.5 rounded-full bg-stone-900/80 border border-amber-500/40 px-2 py-0.5 flex items-center gap-1 shadow-lg">
                      <Crown className="h-2.5 w-2.5 text-amber-400" />
                      <span className="text-[8px] font-bold text-amber-400">3 BOXES AI</span>
                    </div>
                  </div>
                  <p className="text-center text-[10px] font-medium text-amber-400">AI Try-On</p>
                </div>
              </div>

              {/* Dual Match Quality Indicators */}
              {(faceScore !== null || productScore !== null) && (
                <div className="space-y-2">
                  {faceScore !== null && (
                    <div className="rounded-lg border border-amber-900/15 bg-stone-900/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">👤</span>
                          <div>
                            <p className="text-[10px] font-semibold text-amber-200/70">Face Match</p>
                            <p className={`text-[9px] ${getScoreLabel(faceScore, 'face').color}`}>
                              {getScoreLabel(faceScore, 'face').label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ScoreDots score={faceScore} />
                          <span className={`text-[11px] font-bold ${getScoreLabel(faceScore, 'face').color}`}>
                            {faceScore}/10
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {productScore !== null && (
                    <div className="rounded-lg border border-amber-900/15 bg-stone-900/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">💎</span>
                          <div>
                            <p className="text-[10px] font-semibold text-amber-200/70">Product Match</p>
                            <p className={`text-[9px] ${getScoreLabel(productScore, 'product').color}`}>
                              {getScoreLabel(productScore, 'product').label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ScoreDots score={productScore} />
                          <span className={`text-[11px] font-bold ${getScoreLabel(productScore, 'product').color}`}>
                            {productScore}/10
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Product reference */}
              <div className="flex items-center gap-2 rounded-lg border border-amber-900/15 bg-stone-900/40 p-2">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={productImage}
                    alt={productName}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-amber-200/70 truncate">{productName}</p>
                  <p className="text-[10px] text-amber-200/30">Product used for try-on</p>
                </div>
                <span className="text-[10px] text-amber-200/30">&#10003; Applied</span>
              </div>

              {/* Info about 3 BOXES branding */}
              <div className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-950/30 to-stone-900/40 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-[10px] font-bold text-amber-300">3 BOXES GIFTS</p>
                </div>
                <p className="text-[10px] text-amber-200/40">
                  AI uses multiple strategies and picks the best match. For best accuracy, use a clear, well-lit, front-facing selfie.
                </p>
              </div>

              {/* AI Style Suggestions in result too */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-400/70" />
                    <p className="text-[10px] font-semibold text-amber-200/60">
                      Complete the Look — AI Style Suggestions
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {suggestions.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="group flex-shrink-0 cursor-pointer rounded-lg border border-amber-900/15 bg-stone-900/40 p-1.5 transition-all hover:border-amber-600/30 hover:bg-stone-900/60 w-24"
                        onClick={() => {
                          const store = useStore.getState();
                          store.setSelectedProductId(s.id);
                          store.setCategory(s.categorySlug);
                          store.setView('detail');
                          reset();
                        }}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-md bg-stone-800 mb-1">
                          <Image
                            src={s.image}
                            alt={s.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                        <p className="text-[8px] font-medium text-amber-200/60 truncate">{s.name}</p>
                        <p className="text-[8px] font-bold text-amber-400">${s.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <a
                  href={watermarkedResult}
                  download={`3boxes-tryon-${productName.toLowerCase().replace(/\s+/g, '-')}.png`}
                  className="flex flex-1 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-stone-950 transition-all hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Save
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Product Detail Component ───────────────────────────────────
export function ProductDetail() {
  const { selectedProductId, setView, addItem, setCategory } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [tryOnOpen, setTryOnOpen] = useState(false);

  const { data, isLoading } = useQuery<{ product: ProductDetail }>({
    queryKey: ['product', selectedProductId],
    queryFn: () => fetch(`/api/products/${selectedProductId}`).then((r) => r.json()),
    enabled: !!selectedProductId,
  });

  const product = data?.product;

  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0] || '/images/placeholder.jpg',
      });
    }
    setTimeout(() => setIsAdding(false), 800);
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-lg bg-stone-800" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24 bg-stone-800" />
            <Skeleton className="h-8 w-3/4 bg-stone-800" />
            <Skeleton className="h-5 w-32 bg-stone-800" />
            <Skeleton className="h-10 w-40 bg-stone-800" />
            <Skeleton className="h-24 w-full bg-stone-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-amber-200/60">Product not found</p>
        <Button onClick={() => setView('home')} className="mt-4 bg-amber-600 text-stone-950 hover:bg-amber-500">
          Back to Products
        </Button>
      </div>
    );
  }

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="py-8"
    >
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-amber-900/20 bg-stone-800">
            {imageErrors.has(selectedImage) ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                <span className="text-5xl text-amber-600/40">&#x1F48E;</span>
              </div>
            ) : (
              <Image
                src={product.images[selectedImage] || '/images/hero.png'}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={() => {
                  setImageErrors((prev) => new Set(prev).add(selectedImage));
                }}
              />
            )}

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {product.featured && (
                <Badge className="bg-amber-600 text-stone-950">Featured</Badge>
              )}
              {discount > 0 && (
                <Badge className="bg-emerald-600 text-white">-{discount}%</Badge>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border transition-all ${
                    i === selectedImage
                      ? 'border-amber-500 ring-1 ring-amber-500'
                      : 'border-amber-900/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  {!imageErrors.has(i) ? (
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                      onError={() => {
                        setImageErrors((prev) => new Set(prev).add(i));
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-stone-800">
                      <span className="text-lg text-amber-600/40">&#x1F48E;</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <button
              onClick={() => setCategory(product.categorySlug)}
              className="text-xs font-medium uppercase tracking-wider text-amber-500/60 hover:text-amber-400 transition-colors"
            >
              {product.category}
            </button>
            <h1 className="mt-2 text-2xl font-bold text-amber-100 sm:text-3xl">
              {product.name}
            </h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-amber-700/40'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-amber-200/50">
              {product.rating} ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-amber-400">
              ${product.price.toLocaleString()}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-amber-200/30 line-through">
                ${product.compareAtPrice.toLocaleString()}
              </span>
            )}
            {discount > 0 && (
              <Badge variant="outline" className="border-emerald-600/50 text-emerald-400">
                Save ${(product.compareAtPrice! - product.price).toLocaleString()}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-amber-200/60">
            {product.description}
          </p>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-amber-900/30 text-amber-200/40 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-200/40" />
            {product.stock > 0 ? (
              <span
                className={`text-sm ${
                  product.stock <= 5 ? 'text-amber-500' : 'text-emerald-400'
                }`}
              >
                {product.stock <= 5
                  ? `Only ${product.stock} left in stock`
                  : 'In Stock'}
              </span>
            ) : (
              <span className="text-sm text-red-400">Out of Stock</span>
            )}
          </div>

          {/* AI Try-On Button - Available for ALL categories */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => setTryOnOpen(true)}
              className="group flex w-full items-center gap-3 rounded-xl border border-amber-600/30 bg-gradient-to-r from-amber-900/20 via-rose-900/20 to-amber-900/20 p-4 transition-all hover:border-amber-500/50 hover:from-amber-900/30 hover:via-rose-900/30 hover:to-amber-900/30 hover:shadow-lg hover:shadow-amber-900/20"
            >
              <div className="rounded-lg bg-amber-600/20 p-2.5 transition-colors group-hover:bg-amber-600/30">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-amber-100">AI Virtual Try-On</p>
                <p className="text-xs text-amber-200/40">See how it looks on you with 3 BOXES AI</p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-400/50 transition-colors group-hover:text-amber-400" />
            </button>
          </motion.div>

          {/* Quantity & Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-amber-900/30 bg-stone-900/60">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center text-amber-200/60 hover:text-amber-400 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium text-amber-100">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="flex h-10 w-10 items-center justify-center text-amber-200/60 hover:text-amber-400 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={`flex-1 transition-all duration-300 ${
                isAdding
                  ? 'bg-emerald-600 text-white scale-95'
                  : 'bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25'
              }`}
            >
              {isAdding ? (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Added!
                </>
              ) : product.stock === 0 ? (
                'Out of Stock'
              ) : (
                `Add to Cart - $${(product.price * quantity).toLocaleString()}`
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Try-On Dialog */}
      {tryOnOpen && product && (
        <TryOnDialog
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          productId={product.id}
          productName={product.name}
          productImage={product.images[0] || '/images/hero.png'}
          categorySlug={product.categorySlug}
        />
      )}
    </motion.div>
  );
}
