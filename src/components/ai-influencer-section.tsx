'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Share2, Shield, Clock, ImageIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useStore } from '@/lib/store';

/* ── Types ── */
export interface AIInfluencerImage {
  id: string;
  productId: string;
  imageDataUrl: string; // base64 data URL
  userName: string;
  createdAt: string;
  likes: number;
}

/* ── In-memory store for influencer images (shared across component instances) ── */
let _influencerImages: AIInfluencerImage[] = [];
let _likedIds: Set<string> = new Set();

function getInfluencerImages(productId: string): AIInfluencerImage[] {
  return _influencerImages.filter((img) => img.productId === productId);
}

function addInfluencerImage(image: AIInfluencerImage) {
  _influencerImages = [image, ..._influencerImages];
}

function toggleLike(imageId: string): number {
  const img = _influencerImages.find((i) => i.id === imageId);
  if (!img) return 0;
  if (_likedIds.has(imageId)) {
    _likedIds.delete(imageId);
    img.likes = Math.max(0, img.likes - 1);
  } else {
    _likedIds.add(imageId);
    img.likes += 1;
  }
  return img.likes;
}

function isLiked(imageId: string): boolean {
  return _likedIds.has(imageId);
}

/* ── Relative time formatter ── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ── Component ── */
interface AIInfluencerSectionProps {
  productId: string;
  productName: string;
  onShareImage?: (imageDataUrl: string) => void;
  initialShareImage?: string | null;
  onShareComplete?: () => void;
}

export function AIInfluencerSection({ productId, productName, onShareImage, initialShareImage, onShareComplete }: AIInfluencerSectionProps) {
  const { authUser } = useStore();
  const [images, setImages] = useState<AIInfluencerImage[]>(() => getInfluencerImages(productId));
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [userName, setUserName] = useState(authUser?.name || '');

  // Auto-open share dialog when initialShareImage is provided (from try-on result)
  useEffect(() => {
    if (initialShareImage) {
      setPendingImage(initialShareImage);
      setConsentGiven(false);
      setShareDialogOpen(true);
    }
  }, [initialShareImage]);

  // Refresh images from shared store
  const refreshImages = useCallback(() => {
    setImages([...getInfluencerImages(productId)]);
  }, [productId]);

  const handleShareClick = useCallback(() => {
    // In a real flow, this would receive the AI-generated image from the try-on dialog
    // For now, create a demo image or accept from external source
    setPendingImage(null); // Will be set by parent or from try-on result
    setConsentGiven(false);
    setShareDialogOpen(true);
  }, []);

  const handleShareFromTryOn = useCallback(
    (imageDataUrl: string) => {
      setPendingImage(imageDataUrl);
      setConsentGiven(false);
      setShareDialogOpen(true);
    },
    []
  );

  const handleSubmitShare = useCallback(() => {
    if (!consentGiven || !userName.trim()) return;

    const newImage: AIInfluencerImage = {
      id: `inf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId,
      imageDataUrl:
        pendingImage ||
        `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#292524" width="400" height="400"/><text x="200" y="180" text-anchor="middle" fill="#d97706" font-size="48">✨</text><text x="200" y="230" text-anchor="middle" fill="#fbbf24" font-size="16" font-family="sans-serif">AI Style Preview</text><text x="200" y="260" text-anchor="middle" fill="#78716c" font-size="12" font-family="sans-serif">${productName.substring(0, 30)}</text></svg>`)}`,
      userName: userName.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    addInfluencerImage(newImage);
    refreshImages();
    setShareDialogOpen(false);
    setConsentGiven(false);
    setPendingImage(null);

    if (onShareImage) {
      onShareImage(newImage.imageDataUrl);
    }
    if (onShareComplete) {
      onShareComplete();
    }
  }, [consentGiven, userName, pendingImage, productId, productName, refreshImages, onShareImage, onShareComplete]);

  const handleLike = useCallback(
    (imageId: string) => {
      toggleLike(imageId);
      refreshImages();
    },
    [refreshImages]
  );

  // Expose the shareFromTryOn method via a ref pattern
  // The parent can call this to open the share dialog with a try-on image

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/20">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-100">AI Style Gallery</h3>
            <p className="text-xs text-amber-200/40">See how others styled this product</p>
          </div>
        </div>
        <Button
          onClick={handleShareClick}
          className="bg-amber-600 text-stone-950 hover:bg-amber-500 gap-2"
          size="sm"
        >
          <Share2 className="h-4 w-4" />
          Share Your Style
        </Button>
      </div>

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {images.map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60 transition-all hover:border-amber-600/30 hover:shadow-lg hover:shadow-amber-900/10"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={img.imageDataUrl}
                    alt={`AI style by ${img.userName}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* AI Generated badge overlay */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-stone-900/80 text-amber-300 border-amber-600/30 text-[9px] backdrop-blur-sm px-1.5 py-0.5">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      AI Generated
                    </Badge>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-2.5">
                  <div className="flex items-center justify-between">
                    {/* User info */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                        {img.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-amber-200/60 truncate">{img.userName}</span>
                    </div>

                    {/* Like button */}
                    <button
                      onClick={() => handleLike(img.id)}
                      className="flex items-center gap-1 text-amber-200/40 hover:text-red-400 transition-colors"
                      aria-label={`Like this image. Currently ${img.likes} likes`}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 transition-all ${
                          isLiked(img.id) ? 'fill-red-400 text-red-400 scale-110' : ''
                        }`}
                      />
                      <span className="text-[10px]">{img.likes > 0 ? img.likes : ''}</span>
                    </button>
                  </div>

                  {/* Timestamp */}
                  <div className="mt-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-amber-200/20" />
                    <span className="text-[9px] text-amber-200/30">{relativeTime(img.createdAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-900/20 bg-stone-900/30 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-900/20 mb-3">
            <ImageIcon className="h-7 w-7 text-amber-400/40" />
          </div>
          <p className="text-sm text-amber-200/40">No AI styles shared yet</p>
          <p className="mt-1 text-xs text-amber-200/25">Be the first to share your AI-generated look!</p>
          <Button
            onClick={handleShareClick}
            variant="outline"
            className="mt-4 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 gap-2"
            size="sm"
          >
            <Share2 className="h-4 w-4" />
            Share Your Style
          </Button>
        </div>
      )}

      {/* Share Consent Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Share Your AI Style
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              Share your AI-generated look with other shoppers?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Preview of the image to share */}
            {pendingImage && (
              <div className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden rounded-xl border border-amber-900/20">
                <img
                  src={pendingImage}
                  alt="AI style preview to share"
                  className="h-full w-full object-cover"
                />
                <Badge className="absolute top-2 left-2 bg-stone-900/80 text-amber-300 border-amber-600/30 text-[9px] backdrop-blur-sm">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  AI Generated
                </Badge>
              </div>
            )}

            {/* Info box */}
            <div className="rounded-lg border border-amber-900/15 bg-amber-950/20 p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-400/60 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-amber-200/60">What happens when you share?</p>
                  <ul className="text-[10px] text-amber-200/40 space-y-0.5">
                    <li>Your AI-generated image will be visible to all shoppers</li>
                    <li>Only your first name initial will be shown</li>
                    <li>You can request removal at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* User name input */}
            <div>
              <Label htmlFor="share-name" className="text-sm text-amber-200/60">
                Display Name
              </Label>
              <input
                id="share-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full rounded-md border border-amber-900/40 bg-stone-800/50 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/20 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>

            {/* Consent checkbox */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
              <Checkbox
                id="consent-checkbox"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
                className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <Label
                htmlFor="consent-checkbox"
                className="text-xs text-amber-200/60 leading-relaxed cursor-pointer"
              >
                I consent to sharing my AI-generated image publicly. I understand this image was
                created by AI and may not accurately represent the actual product appearance.
              </Label>
            </div>

            {/* Submit button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShareDialogOpen(false)}
                className="flex-1 border-amber-900/40 text-amber-200/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitShare}
                disabled={!consentGiven || !userName.trim()}
                className="flex-1 bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share to Gallery
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
