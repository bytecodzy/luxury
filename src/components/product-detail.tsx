'use client';

/* Product Detail with AI Virtual Try-On v6 */

import { useStore } from '@/lib/store';
import { TryOnDialog } from '@/components/try-on-dialog';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Package, Sparkles, ExternalLink, Globe, CheckCircle, Truck, Heart, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
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
import { Crown, Loader2, Send } from 'lucide-react';
import { useAffiliateClick } from '@/hooks/useAffiliateClick';
import { AIInfluencerSection } from '@/components/ai-influencer-section';

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

export function ProductDetail() {
  const { selectedProductId, setView, addItem, setCategory, authUser, authToken } = useStore();
  const { trackClick } = useAffiliateClick();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '', name: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { data, isLoading } = useQuery<{ product: ProductDetail }>({
    queryKey: ['product', selectedProductId],
    queryFn: () => fetch(`/api/products/${selectedProductId}`).then((r) => r.json()),
    enabled: !!selectedProductId,
  });

  const product = data?.product;
  // Bulletproof array access - prevents "Cannot read properties of undefined (reading 'length')"
  const safeImages = Array.isArray(product?.images) ? product.images : [];
  const safeTags = Array.isArray(product?.tags) ? product.tags : [];

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
    if (!authToken || !selectedProductId) return;
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await fetch('/api/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ productId: selectedProductId }),
        });
        setIsWishlisted(false);
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ productId: selectedProductId }),
        });
        setIsWishlisted(true);
      }
    } catch {
      // ignore
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
              <img
                src={getProxiedImageUrl(safeImages[selectedImage] || '/images/hero.png', product.platform)}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover"
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

            {/* Image counter */}
            {safeImages.length > 1 && (
              <div className="absolute bottom-3 right-3 rounded-full bg-stone-950/70 px-2.5 py-1 text-[10px] font-medium text-amber-200/70 backdrop-blur-sm">
                {selectedImage + 1} / {safeImages.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {safeImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border transition-all ${
                  i === selectedImage
                    ? 'border-amber-500 ring-1 ring-amber-500 scale-105'
                    : 'border-amber-900/20 opacity-60 hover:opacity-100 hover:border-amber-700/40'
                }`}
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
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategory(product.categorySlug)}
                className="text-xs font-medium uppercase tracking-wider text-amber-500/60 hover:text-amber-400 transition-colors"
              >
                {product.category}
              </button>
              {product.isExternal && product.platform && (
                <Badge className={`${PLATFORM_COLORS[product.platform.toLowerCase()] || 'bg-stone-600/20 text-stone-300 border-stone-600/30'} text-[10px] font-semibold border px-2 py-0.5`}>
                  {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
                </Badge>
              )}
            </div>
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
              {format(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-amber-200/30 line-through">
                {format(product.compareAtPrice)}
              </span>
            )}
            {discount > 0 && (
              <Badge variant="outline" className="border-emerald-600/50 text-emerald-400">
                {t('productDetail.save')} {format(product.compareAtPrice! - product.price)}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-amber-200/60">
            {product.description}
          </p>

          {/* Tags */}
          {safeTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {safeTags.map((tag) => (
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

          {/* Stock / Availability */}
          {product.isExternal && product.platform ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Available</span>
              <span className="text-xs text-amber-200/30">on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}</span>
            </div>
          ) : (
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
          )}

          {/* Delivery Estimate */}
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-400/60" />
            <span className="text-sm text-amber-200/50">
              Estimated delivery: {product.deliveryEstimate || '3-5 business days'}
            </span>
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
                <p className="text-sm font-semibold text-amber-100">Style Preview</p>
                <p className="text-xs text-amber-200/40">See how it looks on you with 3 BOXES</p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-400/50 transition-colors group-hover:text-amber-400" />
            </button>
          </motion.div>

          {/* External Product Notice */}
          {product.isExternal && product.platform && (
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-400/60" />
                <p className="text-sm font-medium text-amber-200/70">
                  Available on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
                </p>
              </div>
              <p className="text-xs text-amber-200/40 italic">
                This product is sold by our partner {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}. You'll be redirected to their site to complete your purchase.
              </p>
              {product.sourceUrl && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
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
                className={`w-full transition-all duration-300 text-stone-950 hover:shadow-lg hover:shadow-amber-600/25 h-12 text-base font-semibold gap-2 ${PLATFORM_BUTTON_COLORS[product.platform.toLowerCase()] || 'bg-amber-600 hover:bg-amber-500'}`}
              >
                <ExternalLink className="h-5 w-5" />
                Shop on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
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
                  `Add to Cart - ${format(product.price * quantity)}`
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading || !authToken}
                className={`h-10 w-10 shrink-0 border-amber-900/30 ${
                  isWishlisted
                    ? 'bg-red-600/20 border-red-500/50 text-red-400 hover:bg-red-600/30'
                    : 'text-amber-200/40 hover:text-red-400 hover:border-red-500/30'
                }`}
                title={authToken ? (isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist') : 'Sign in to add to wishlist'}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-100">
              Reviews ({reviews.length})
            </h3>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating) ? 'fill-amber-500 text-amber-500' : 'text-amber-700/40'
                  }`}
                />
              ))}
              <span className="ml-1 text-sm text-amber-200/50">{product.rating.toFixed(1)}</span>
            </div>
          </div>
          <Button
            onClick={() => setReviewDialogOpen(true)}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500"
          >
            Write a Review
          </Button>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-8 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-amber-200/20" />
            <p className="text-sm text-amber-200/40">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600/20 text-xs font-bold text-amber-400">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-amber-100">{review.userName}</span>
                        {review.verified && (
                          <Badge className="bg-emerald-600/20 text-emerald-400 text-[10px] border-emerald-600/30">Verified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-700/40'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs text-amber-200/30">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {review.title && (
                  <p className="mt-2 text-sm font-medium text-amber-200/80">{review.title}</p>
                )}
                <p className="mt-1 text-sm text-amber-200/50">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Style Gallery (Influencer Section) */}
      {product && (
        <div id="ai-influencer-section">
          <AIInfluencerSection
            productId={product.id}
            productName={product.name}
          />
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Write a Review</DialogTitle>
            <DialogDescription className="text-amber-200/50">Share your experience with this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Star Picker */}
            <div>
              <Label className="text-sm text-amber-200/60">Rating</Label>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: i + 1 }))}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        i < reviewForm.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-700/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-name" className="text-sm text-amber-200/60">Your Name</Label>
              <Input
                id="review-name"
                value={reviewForm.name}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
              />
            </div>
            <div>
              <Label htmlFor="review-title" className="text-sm text-amber-200/60">Title (optional)</Label>
              <Input
                id="review-title"
                value={reviewForm.title}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Summary of your review"
                className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
              />
            </div>
            <div>
              <Label htmlFor="review-comment" className="text-sm text-amber-200/60">Your Review</Label>
              <textarea
                id="review-comment"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="What did you like or dislike?"
                rows={4}
                className="mt-1 w-full rounded-md border border-amber-900/40 bg-stone-800/50 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/20 focus:outline-none focus:ring-1 focus:ring-amber-600 resize-none"
              />
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewSubmitting || !reviewForm.name || !reviewForm.comment}
              className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500"
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

      {/* Style Preview Dialog */}
      {tryOnOpen && product && (
        <TryOnDialog
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          productId={product.id}
          productName={product.name}
          productImage={getProxiedImageUrl(safeImages[0] || '/images/hero.png', product.platform)}
          rawProductImage={safeImages[0] || '/images/hero.png'}
          categorySlug={product.categorySlug}
        />
      )}
    </motion.div>
  );
}
