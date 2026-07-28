'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Package, Sparkles, ExternalLink, Globe, Info, CheckCircle, Truck, Heart, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, RotateCcw, Download, ImageIcon, AlertCircle, Crown, ExternalLink as ExternalLinkIcon, Send, AlertTriangle, Clock, Share2, X, ChevronRight, ChevronLeft, Maximize2, Diamond } from 'lucide-react';
import { useAffiliateClick } from '@/hooks/useAffiliateClick';
import { showToast } from '@/hooks/use-toast-notification';
import { AIInfluencerSection } from '@/components/ai-influencer-section';
import { TryOnDialog } from '@/components/try-on-dialog';

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
  deliveryEstimate?: string;
  isExternal?: boolean;
  platform?: string;
  sourceUrl?: string;
  affiliateUrl?: string;
  platformLogo?: string;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verified: boolean;
  createdAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  myntra: 'bg-red-600/20 text-red-300 border-red-600/30',
  nykaa: 'bg-pink-600/20 text-pink-300 border-pink-600/30',
  amazon: 'bg-orange-600/20 text-orange-300 border-orange-600/30',
  flipkart: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
  caratlane: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  tanishq: 'bg-rose-600/20 text-rose-300 border-rose-600/30',
  bluestone: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  voylla: 'bg-purple-600/20 text-purple-300 border-purple-600/30',
};

// Platform button brand colors (for Shop on Platform CTA)
const PLATFORM_BUTTON_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-600 hover:bg-amber-500',
  tanishq: 'bg-rose-600 hover:bg-rose-500',
  bluestone: 'bg-blue-600 hover:bg-blue-500',
  voylla: 'bg-purple-600 hover:bg-purple-500',
  myntra: 'bg-red-600 hover:bg-red-500',
  nykaa: 'bg-pink-600 hover:bg-pink-500',
  amazon: 'bg-orange-600 hover:bg-orange-500',
  flipkart: 'bg-yellow-600 hover:bg-yellow-500',
};

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  myntra: 'Myntra',
  nykaa: 'Nykaa',
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  caratlane: 'CaratLane',
  tanishq: 'Tanishq',
  bluestone: 'BlueStone',
  voylla: 'Voylla',
};

// ── Product Detail Component ───────────────────────────────────
export function ProductDetail() {
  const { selectedProductId, setView, addItem, setCategory, authUser, authToken } = useStore();
  const queryClient = useQueryClient();

  // Scroll to top when the selected product changes (fixes footer-first bug)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedProductId]);

  const { trackClick } = useAffiliateClick();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [backgroundJobStep, setBackgroundJobStep] = useState<'generating' | 'result' | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '', name: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [influencerShareImage, setInfluencerShareImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [shareAnimating, setShareAnimating] = useState(false);
  const [hasAddedToCart, setHasAddedToCart] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const influencerSectionRef = useRef<{ handleShareFromTryOn: (imageDataUrl: string) => void } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ product: ProductDetail }>({
    queryKey: ['product', selectedProductId],
    queryFn: () => fetch(`/api/products/${selectedProductId}`).then((r) => r.json()),
    enabled: !!selectedProductId,
  });

  const product = data?.product;
  const safeImages = Array.isArray(product?.images) ? product.images : [];
  const safeTags = Array.isArray(product?.tags) ? product.tags : [];

  const accentColor = `var(--luxury-accent, #d4a437)`;

  // Wishlist check
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist-check', selectedProductId],
    queryFn: async () => {
      if (!authToken) return { wishlist: [] };
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return { wishlist: [] };
      return res.json();
    },
    enabled: !!authToken && !!selectedProductId,
  });

  useEffect(() => {
    if (wishlistData?.wishlist) {
      const found = wishlistData.wishlist.some((w: any) => w.productId === selectedProductId);
      setIsWishlisted(found);
    }
  }, [wishlistData, selectedProductId]);

  // Reviews query
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', selectedProductId],
    queryFn: () => fetch(`/api/reviews?productId=${selectedProductId}`).then((r) => r.json()),
    enabled: !!selectedProductId,
  });

  const reviews: Review[] = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];

  const handleToggleWishlist = async () => {
    if (!authToken || !selectedProductId || !product) return;
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        // ── Remove from wishlist ──
        const res = await fetch('/api/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ productId: selectedProductId }),
        });
        if (res.ok) {
          setIsWishlisted(false);
          showToast('success', 'Removed from wishlist');
          queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
          queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        } else {
          const err = await res.json().catch(() => ({}));
          showToast('error', err.error || 'Failed to remove from wishlist');
        }
      } else {
        // ── Add to wishlist (pass full product data so the API can upsert external products) ──
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            productId: selectedProductId,
            // Product snapshot — used by the API when the product isn't in the local DB
            name: product.name,
            slug: product.slug || selectedProductId,
            description: product.description || '',
            price: product.price,
            image: Array.isArray(product.images) ? product.images[0] : null,
            images: Array.isArray(product.images) ? product.images : [],
            category: product.category || 'Uncategorized',
            categorySlug: product.categorySlug || 'uncategorized',
            platform: product.platform || null,
            sourceUrl: product.sourceUrl || null,
            affiliateUrl: product.affiliateUrl || null,
          }),
        });
        if (res.ok) {
          setIsWishlisted(true);
          showToast('success', 'Added to wishlist ♥');
          queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
          queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        } else {
          const err = await res.json().catch(() => ({}));
          showToast('error', err.error || 'Failed to add to wishlist');
        }
      }
    } catch (e) {
      showToast('error', 'Network error — please try again');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedProductId || !reviewForm.name || !reviewForm.comment) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          userName: reviewForm.name,
          rating: reviewForm.rating,
          title: reviewForm.title || undefined,
          comment: reviewForm.comment,
        }),
      });
      if (res.ok) {
        setReviewDialogOpen(false);
        setReviewForm({ rating: 5, title: '', comment: '', name: '' });
      }
    } catch {
      // ignore
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: getProxiedImageUrl(safeImages[0] || '/images/placeholder.jpg', product.platform),
      });
    }
    setHasAddedToCart(true);
    showToast('success', `${product.name} added to cart`);
    setTimeout(() => setIsAdding(false), 800);
  };

  // Buy Now: navigate directly to checkout (item already in cart from Add to Cart)
  const handleBuyNow = () => {
    if (!product) return;
    setView('checkout');
  };

  const handleBackgroundJob = useCallback((step: 'generating' | 'result') => {
    setBackgroundJobStep(step);
  }, []);

  const handleResetBackground = useCallback(() => {
    setBackgroundJobStep(null);
  }, []);

  // Zoom on hover handler
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // Share handler
  const handleShare = async () => {
    setShareAnimating(true);
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else if (product) {
      await navigator.clipboard.writeText(window.location.href);
    }
    setTimeout(() => setShareAnimating(false), 500);
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="aspect-square rounded-2xl bg-stone-800/40" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-16 rounded-xl bg-stone-800/40" />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <Skeleton className="h-4 w-24 bg-stone-800/40" />
            <Skeleton className="h-9 w-3/4 bg-stone-800/40" />
            <Skeleton className="h-5 w-32 bg-stone-800/40" />
            <Skeleton className="h-10 w-40 bg-stone-800/40" />
            <Skeleton className="h-28 w-full bg-stone-800/40" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'rgba(212, 164, 55, 0.08)', border: '1px solid rgba(212, 164, 55, 0.15)' }}
        >
          <Diamond className="h-8 w-8" style={{ color: accentColor, opacity: 0.5 }} />
        </div>
        <p className="text-amber-200/60 text-lg font-medium">Product not found</p>
        <Button
          onClick={() => setView('home')}
          className="mt-6 text-stone-950 font-semibold rounded-xl luxury-sweep"
          style={{ background: accentColor }}
        >
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
      transition={{ duration: 0.4 }}
      className="py-6"
    >
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-amber-200/35">
        <button
          onClick={() => setView('home')}
          className="hover:text-amber-300 transition-colors duration-200"
        >
          Home
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          onClick={() => setCategory(product.categorySlug)}
          className="hover:text-amber-300 transition-colors duration-200 capitalize"
        >
          {product.category}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-amber-200/50 line-clamp-1 max-w-[200px]">{product.name}</span>
      </nav>

      {/* Back button */}
      <motion.div whileHover={{ x: -3 }} transition={{ duration: 0.15 }}>
        <Button
          variant="ghost"
          onClick={() => setView('home')}
          className="mb-8 text-amber-200/50 hover:bg-amber-900/15 hover:text-amber-300 rounded-xl px-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </motion.div>

      <div className="grid gap-6 md:gap-10 md:grid-cols-2">
        {/* Image Gallery — thumbnails on LEFT, main image on RIGHT (mobile responsive) */}
        <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
          {/* Thumbnails — vertical column on the LEFT (always visible, even with 1 image) */}
          <div className="flex flex-col gap-2 sm:gap-3 flex-shrink-0 py-1">
            {safeImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`relative h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 flex-shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
                  i === selectedImage
                    ? 'ring-2 ring-amber-400 scale-105 opacity-100'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  border: i === selectedImage ? `2px solid var(--luxury-accent, #d4a437)` : '1px solid rgba(212, 164, 55, 0.2)',
                  boxShadow: i === selectedImage ? '0 0 12px rgba(212, 164, 55, 0.35)' : 'none',
                }}
                aria-label={`View image ${i + 1}`}
              >
                {!imageErrors.has(i) ? (
                  <img
                    src={getProxiedImageUrl(img, product.platform)}
                    alt={`${product.name} ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
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

          {/* Main image with zoom on hover — tap to open full-size lightbox */}
          <div
            ref={imageContainerRef}
            className="relative flex-1 min-w-0 aspect-[4/5] sm:aspect-square md:aspect-[4/5] lg:aspect-square overflow-hidden rounded-2xl luxury-glass max-h-[70vh] md:max-h-[75vh] cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleImageMouseMove}
          >
            {imageErrors.has(selectedImage) ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                <span className="text-5xl text-amber-600/40">&#x1F48E;</span>
              </div>
            ) : (
              <div className="luxury-zoom-container w-full h-full">
                <img
                  src={getProxiedImageUrl(safeImages[selectedImage] || '/images/hero.png', product.platform)}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transform: isZoomed ? 'scale(1.6)' : 'scale(1)',
                    transition: 'transform 0.3s ease-out',
                  }}
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(selectedImage));
                  }}
                />
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-4 top-4 flex flex-col gap-2 z-10">
              {product.featured && (
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md"
                  style={{ background: 'rgba(212, 164, 55, 0.85)', boxShadow: `0 0 10px rgba(212, 164, 55, 0.2)` }}
                >
                  Featured
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Image counter */}
            {safeImages.length > 1 && (
              <div className="absolute bottom-4 right-4 rounded-full bg-stone-950/70 px-3 py-1.5 text-[10px] font-medium text-amber-200/60 backdrop-blur-md border border-white/5">
                {selectedImage + 1} / {safeImages.length}
              </div>
            )}

            {/* Tap to enlarge hint — always visible (so mobile users know the image is tappable) */}
            <div className="absolute bottom-4 left-4 rounded-full bg-stone-950/70 px-3 py-1.5 text-[10px] font-medium text-amber-200/60 backdrop-blur-md border border-white/5 flex items-center gap-1 pointer-events-none">
              <Maximize2 className="h-3 w-3" />
              {isZoomed ? 'Move to zoom • Click to enlarge' : 'Tap to enlarge'}
            </div>
          </div>

        </div>

        {/* Product Info */}
        <div className="space-y-7">
          {/* Category & Platform */}
          <div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setCategory(product.categorySlug)}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-200 hover:opacity-80"
                style={{ color: accentColor }}
              >
                {product.category}
              </button>
              {product.isExternal && product.platform && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${PLATFORM_COLORS[product.platform.toLowerCase()] || 'bg-stone-600/20 text-stone-300 border-stone-600/30'}`}>
                  {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-amber-100 sm:text-4xl" style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {product.name}
            </h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-amber-700/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-amber-200/45 font-medium">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-amber-200/15">|</span>
            <button
              onClick={() => {
                const el = document.getElementById('reviews-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm text-amber-200/40 hover:text-amber-300 transition-colors"
            >
              {product.reviewCount} reviews
            </button>
          </div>

          {/* Price — compare-at styling */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold" style={{ color: accentColor, letterSpacing: '-0.02em' }}>
              {format(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-amber-200/20 line-through">
                {format(product.compareAtPrice)}
              </span>
            )}
            {discount > 0 && (
              <span
                className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"
              >
                {t('productDetail.save')} {format(product.compareAtPrice! - product.price)}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-amber-200/50 max-w-lg">
            {product.description}
          </p>

          {/* Tags */}
          {safeTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {safeTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-amber-900/20 bg-amber-900/5 px-3 py-1 text-[11px] text-amber-200/35 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />

          {/* Stock / Availability */}
          {product.isExternal && product.platform ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/15">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-sm text-emerald-400 font-medium">Available</span>
              <span className="text-xs text-amber-200/25">on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-900/15">
                <Package className="h-3.5 w-3.5 text-amber-200/40" />
              </div>
              {product.stock > 0 ? (
                <span
                  className={`text-sm font-medium ${
                    product.stock <= 5 ? 'text-amber-400' : 'text-emerald-400'
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
          )}

          {/* Delivery Estimate */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-900/10">
              <Truck className="h-3.5 w-3.5 text-amber-400/50" />
            </div>
            <span className="text-sm text-amber-200/40">
              Estimated delivery: <span className="text-amber-200/60 font-medium">{product.deliveryEstimate || '3-5 business days'}</span>
            </span>
          </div>

          {/* [HIDDEN per request] Virtual Style Preview — feature commented out
              Original block preserved below for easy re-enable:
              (inner JSX comment markers stripped to avoid nesting)
                [was JSX comment]: AI Try-On Button — Prominent & Elegant
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <button
                            onClick={() => setTryOnOpen(true)}
                            className="group relative flex w-full items-center gap-4 rounded-2xl p-5 transition-all duration-300 overflow-hidden luxury-sweep"
                            style={{
                              background: 'linear-gradient(135deg, rgba(212, 164, 55, 0.12) 0%, rgba(180, 83, 9, 0.08) 50%, rgba(212, 164, 55, 0.12) 100%)',
                              border: '1px solid rgba(212, 164, 55, 0.2)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(212, 164, 55, 0.4)';
                              e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 164, 55, 0.1), 0 8px 24px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(212, 164, 55, 0.2)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div
                              className="rounded-xl p-3 transition-all duration-300 group-hover:scale-110"
                              style={{ background: 'rgba(212, 164, 55, 0.15)' }}
                            >
                              <Crown className="h-6 w-6" style={{ color: accentColor }} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-bold text-amber-100">Virtual Style Preview</p>
                              <p className="text-xs text-amber-200/35 mt-0.5">See how it looks on you with 3 BOXES AI</p>
                            </div>
                            <Sparkles className="h-5 w-5 text-amber-400/40 transition-all duration-300 group-hover:text-amber-400 group-hover:scale-110" />
                          </button>
                        </motion.div>
          */}

          {/* External Product Notice */}
          {product.isExternal && product.platform && (
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: 'rgba(28, 25, 23, 0.4)',
                border: '1px solid rgba(212, 164, 55, 0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-amber-400/50" />
                <p className="text-sm font-medium text-amber-200/60">
                  Available on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
                </p>
              </div>
              <p className="text-xs text-amber-200/30 italic leading-relaxed">
                This product is sold by our partner {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}. You'll be redirected to their site to complete your purchase.
              </p>
              {product.sourceUrl && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-400 transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  View original listing
                </a>
              )}
            </div>
          )}

          {/* Quantity & Add to Cart / Shop on Platform */}
          {product.isExternal && product.platform ? (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  if (product.sourceUrl) {
                    trackClick(product.id, product.platform!.toLowerCase(), product.sourceUrl, product.affiliateUrl);
                  } else {
                    window.open(product.affiliateUrl || product.sourceUrl || '#', '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`w-full transition-all duration-300 text-stone-950 hover:shadow-lg h-12 text-base font-bold gap-2 rounded-xl luxury-sweep ${PLATFORM_BUTTON_COLORS[product.platform.toLowerCase()] || 'bg-amber-600 hover:bg-amber-500'}`}
                style={{ boxShadow: `0 4px 16px rgba(212, 164, 55, 0.15)` }}
              >
                <ExternalLink className="h-5 w-5" />
                Shop on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {/* Quantity selector */}
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(28, 25, 23, 0.5)',
                    border: '1px solid rgba(212, 164, 55, 0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-11 w-11 items-center justify-center text-amber-200/50 hover:text-amber-400 hover:bg-amber-900/10 transition-all duration-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-amber-100">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="flex h-11 w-11 items-center justify-center text-amber-200/50 hover:text-amber-400 hover:bg-amber-900/10 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 h-11 transition-all duration-300 rounded-xl font-bold luxury-sweep ${
                    isAdding
                      ? 'bg-emerald-600 text-white scale-[0.98]'
                      : 'text-stone-950 hover:shadow-lg'
                  }`}
                  style={!isAdding ? { background: accentColor, boxShadow: `0 4px 16px rgba(212, 164, 55, 0.2)` } : {}}
                >
                  {isAdding ? (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Added!
                    </>
                  ) : product.stock === 0 ? (
                    'Out of Stock'
                  ) : (
                    `Add to Cart — ${format(product.price * quantity)}`
                  )}
                </Button>

                {/* Wishlist */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading || !authToken}
                  className={`h-11 w-11 shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 ${
                    isWishlisted
                      ? 'bg-red-600/15 border-red-500/40 text-red-400'
                      : 'text-amber-200/30 hover:text-red-400'
                  }`}
                  style={{
                    background: isWishlisted ? undefined : 'rgba(28, 25, 23, 0.5)',
                    border: isWishlisted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(212, 164, 55, 0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                  title={authToken ? (isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist') : 'Sign in to add to wishlist'}
                >
                  <Heart className={`h-4.5 w-4.5 ${isWishlisted ? 'fill-current' : ''}`} />
                </motion.button>
              </div>

              {/* Buy Now button — visible only after the product has been added to cart */}
              {hasAddedToCart && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <Button
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                    className="w-full h-12 transition-all duration-300 rounded-xl font-bold luxury-sweep text-white hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #b8860b 0%, #8b6508 100%)',
                      boxShadow: '0 4px 16px rgba(184, 134, 11, 0.3)',
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Buy Now — {format(product.price * quantity)}
                  </Button>
                </motion.div>
              )}

              {/* Share button — highlighted for better visibility */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={handleShare}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-100 hover:text-white transition-all duration-200 py-3 px-4 rounded-xl w-full luxury-sweep"
                style={{
                  background: 'linear-gradient(135deg, rgba(212, 164, 55, 0.18) 0%, rgba(180, 83, 9, 0.12) 50%, rgba(212, 164, 55, 0.18) 100%)',
                  border: '1px solid rgba(212, 164, 55, 0.35)',
                  boxShadow: '0 4px 14px rgba(212, 164, 55, 0.12)',
                }}
              >
                <motion.div animate={shareAnimating ? { scale: [1, 1.2, 1], rotate: [0, 15, 0] } : {}} transition={{ duration: 0.3 }}>
                  <Share2 className="h-4 w-4" />
                </motion.div>
                Share this product
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Ornamental Divider */}
      <div className="mt-12 mb-8 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
        <Diamond className="h-3 w-3 text-amber-500/25" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
      </div>

      {/* Reviews Section */}
      <div id="reviews-section" className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/15">
              <MessageSquare className="h-4.5 w-4.5 text-amber-400/60" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-100">
                Reviews ({reviews.length})
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < Math.floor(product.rating) ? 'fill-amber-500 text-amber-500' : 'text-amber-700/25'
                    }`}
                  />
                ))}
                <span className="ml-1 text-xs text-amber-200/40 font-medium">{product.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setReviewDialogOpen(true)}
            className="text-stone-950 font-semibold rounded-xl luxury-sweep"
            style={{ background: accentColor }}
          >
            Write a Review
          </Button>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{
              background: 'rgba(28, 25, 23, 0.4)',
              border: '1px solid rgba(212, 164, 55, 0.06)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-amber-200/15" />
            <p className="text-sm text-amber-200/30">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl p-5 transition-all duration-300 hover:border-amber-500/15"
                style={{
                  background: 'rgba(28, 25, 23, 0.4)',
                  border: '1px solid rgba(212, 164, 55, 0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: 'rgba(212, 164, 55, 0.12)', color: accentColor }}
                    >
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-amber-100">{review.userName}</span>
                        {review.verified && (
                          <span className="rounded-full bg-emerald-600/10 border border-emerald-600/20 px-2 py-0.5 text-[9px] text-emerald-400 font-semibold">Verified</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-700/25'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[10px] text-amber-200/25">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {review.title && (
                  <p className="mt-3 text-sm font-medium text-amber-200/70">{review.title}</p>
                )}
                <p className="mt-1.5 text-sm text-amber-200/40 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* [HIDDEN per request] AI Style Gallery (Influencer Section) — feature commented out
          Original block preserved below for easy re-enable:
          [was JSX comment]: AI Style Gallery (Influencer Section)
      {product && (
        <div id="ai-influencer-section">
          <AIInfluencerSection
            productId={product.id}
            productName={product.name}
            initialShareImage={influencerShareImage}
            onShareComplete={() => setInfluencerShareImage(null)}
          />
        </div>
      )}
      */}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Write a Review</DialogTitle>
            <DialogDescription className="text-amber-200/40">Share your experience with this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Star Picker */}
            <div>
              <Label className="text-sm text-amber-200/50">Rating</Label>
              <div className="flex items-center gap-1.5 mt-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: i + 1 }))}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        i < reviewForm.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-700/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-name" className="text-sm text-amber-200/50">Your Name</Label>
              <Input
                id="review-name"
                value={reviewForm.name}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                className="mt-1.5 border-amber-900/30 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/15 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="review-title" className="text-sm text-amber-200/50">Title (optional)</Label>
              <Input
                id="review-title"
                value={reviewForm.title}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Summary of your review"
                className="mt-1.5 border-amber-900/30 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/15 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="review-comment" className="text-sm text-amber-200/50">Your Review</Label>
              <textarea
                id="review-comment"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="What did you like or dislike?"
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-amber-900/30 bg-stone-800/50 px-3 py-2.5 text-sm text-amber-50 placeholder:text-amber-200/15 focus:outline-none focus:ring-1 focus:ring-amber-600/50 resize-none"
              />
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewSubmitting || !reviewForm.name || !reviewForm.comment}
              className="w-full text-stone-950 font-semibold rounded-xl luxury-sweep"
              style={{ background: accentColor }}
            >
              {reviewSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Style Preview Dialog - mounted when open or background job active */}
      {(tryOnOpen || backgroundJobStep !== null) && product && (
        <TryOnDialog
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          productId={product.id}
          productName={product.name}
          productImage={getProxiedImageUrl(safeImages[0] || '/images/hero.png', product.platform)}
          rawProductImage={safeImages[0] || '/images/hero.png'}
          categorySlug={product.categorySlug}
          productImages={safeImages.map(img => getProxiedImageUrl(img, product.platform))}
          productDescription={product.description}
          productTags={product.tags}
          onBackgroundJob={handleBackgroundJob}
          onResetBackground={handleResetBackground}
          onShareToInfluencer={(imageDataUrl) => {
            setInfluencerShareImage(imageDataUrl);
            setTryOnOpen(false);
            setTimeout(() => {
              const section = document.getElementById('ai-influencer-section');
              if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          }}
        />
      )}

      {/* Floating Pill — shown when dialog is closed but a background job is running */}
      {backgroundJobStep && !tryOnOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
          onClick={() => setTryOnOpen(true)}
        >
          {backgroundJobStep === 'generating' ? (
            <div className="flex items-center gap-3 rounded-full border border-amber-600/40 bg-stone-900/95 px-5 py-3 shadow-2xl shadow-amber-900/30 backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <span className="text-xs font-semibold text-amber-200">Creating preview...</span>
              <Sparkles className="h-4 w-4 text-amber-400/60" />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-amber-500/60 bg-stone-900/95 px-5 py-3 shadow-2xl shadow-amber-500/20 backdrop-blur-sm animate-[glow_2s_ease-in-out_infinite]">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Style Preview Ready! Click to view</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Image Lightbox — full-size image viewer with prev/next navigation */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-amber-900/30 bg-stone-950/98 rounded-2xl overflow-hidden flex items-center justify-center" style={{ width: '95vw', height: '95vh' }}>
          <DialogTitle className="sr-only">{product.name} — Image {selectedImage + 1} of {safeImages.length}</DialogTitle>
          <DialogDescription className="sr-only">Full size product image view. Use arrow buttons to navigate between images.</DialogDescription>
          <div className="relative flex items-center justify-center w-full h-full p-4">
            {/* Previous image button */}
            {safeImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage((prev) => (prev - 1 + safeImages.length) % safeImages.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-stone-900/80 backdrop-blur-sm text-amber-200 hover:bg-stone-800 hover:text-amber-100 transition-all duration-200 border border-amber-900/30"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Full-size image */}
            {!imageErrors.has(selectedImage) ? (
              <img
                src={getProxiedImageUrl(safeImages[selectedImage] || '/images/hero.png', product.platform)}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-6xl text-amber-600/40">&#x1F48E;</span>
              </div>
            )}

            {/* Next image button */}
            {safeImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage((prev) => (prev + 1) % safeImages.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-stone-900/80 backdrop-blur-sm text-amber-200 hover:bg-stone-800 hover:text-amber-100 transition-all duration-200 border border-amber-900/30"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Image counter + close hint */}
            {safeImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-stone-950/85 px-4 py-2 text-xs font-medium text-amber-200/80 backdrop-blur-md border border-amber-900/30 flex items-center gap-2">
                <span>{selectedImage + 1} / {safeImages.length}</span>
                <span className="text-amber-200/30">•</span>
                <span className="text-amber-200/50">Click outside or press ESC to close</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
