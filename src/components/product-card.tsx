'use client';

import { useStore } from '@/lib/store';
import { useAffiliateClick } from '@/hooks/useAffiliateClick';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingCart, ExternalLink, Eye, Heart, Sparkles } from 'lucide-react';

import { useState, useEffect, useRef } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';

interface Product {
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
  isExternal?: boolean;
  platform?: string;
  sourceUrl?: string;
  affiliateUrl?: string;
  platformLogo?: string;
}

// Platform badge colors — refined pill style
const PLATFORM_BADGE_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-600/90',
  tanishq: 'bg-rose-600/90',
  bluestone: 'bg-blue-600/90',
  voylla: 'bg-purple-600/90',
  myntra: 'bg-red-600/90',
  nykaa: 'bg-pink-600/90',
  amazon: 'bg-orange-600/90',
  flipkart: 'bg-yellow-600/90',
};

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

const PLATFORM_TEXT_COLORS: Record<string, string> = {
  caratlane: 'text-amber-400',
  tanishq: 'text-rose-400',
  bluestone: 'text-blue-400',
  voylla: 'text-purple-400',
  myntra: 'text-red-400',
  nykaa: 'text-pink-400',
  amazon: 'text-orange-400',
  flipkart: 'text-yellow-400',
};

const PLATFORM_TEXT_COLORS_LIGHT: Record<string, string> = {
  caratlane: 'text-amber-700',
  tanishq: 'text-rose-700',
  bluestone: 'text-blue-700',
  voylla: 'text-purple-700',
  myntra: 'text-red-700',
  nykaa: 'text-pink-700',
  amazon: 'text-orange-700',
  flipkart: 'text-yellow-700',
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

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { selectProduct, addItem, appTheme } = useStore();
  const { trackClick } = useAffiliateClick();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistAnimating, setWishlistAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDark = appTheme === 'dark';
  const accentColor = `var(--luxury-accent, #dbaf36)`;

  const safeImages = Array.isArray(product.images) ? product.images : [];
  const totalImages = safeImages.length;
  const currentImage = totalImages > 0
    ? getProxiedImageUrl(safeImages[currentImageIndex], product.platform)
    : '/images/placeholder.jpg';
  const mainImage = totalImages > 0
    ? getProxiedImageUrl(safeImages[0], product.platform)
    : '/images/placeholder.jpg';
  const isExternal = product.isExternal && product.platform;
  const platformSlug = product.platform?.toLowerCase() || '';
  const platformName = PLATFORM_DISPLAY_NAMES[platformSlug] || product.platform || '';
  const shopUrl = product.affiliateUrl || product.sourceUrl || '#';

  // Intersection observer for reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCurrentImageIndex(0);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: mainImage,
    });
    setTimeout(() => setIsAdding(false), 600);
  };

  const handleShopOnPlatform = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.sourceUrl) {
      trackClick(product.id, platformSlug, product.sourceUrl, product.affiliateUrl);
    } else {
      window.open(shopUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlistAnimating(true);
    setIsWishlisted(!isWishlisted);
    setTimeout(() => setWishlistAnimating(false), 400);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectProduct(product.id);
  };

  const handleTryOn = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectProduct(product.id);
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 25, scale: 0.96 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 25, scale: 0.96 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group cursor-pointer relative"
      onClick={() => selectProduct(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: '16px',
        // Dark theme: glassmorphic card with subtle gold border
        // Light theme: clean white card with gold accent
        background: isDark
          ? 'rgba(28, 25, 23, 0.6)'
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
        WebkitBackdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
        border: isDark
          ? '1px solid rgba(212, 164, 55, 0.1)'
          : '1px solid rgba(212, 164, 55, 0.15)',
        boxShadow: isHovered
          ? isDark
            ? `0 0 20px rgba(219, 175, 54, 0.15), 0 0 40px rgba(219, 175, 54, 0.06), 0 8px 24px rgba(0, 0, 0, 0.25)`
            : `0 0 15px rgba(219, 175, 54, 0.12), 0 0 30px rgba(219, 175, 54, 0.04), 0 8px 24px rgba(0, 0, 0, 0.08)`
          : isDark
            ? '0 4px 16px rgba(0, 0, 0, 0.15)'
            : '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {/* Gold shimmer sweep animation on hover — sweeps across border */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: '16px',
              background: `linear-gradient(90deg, transparent 0%, rgba(219, 175, 54, 0.25) 30%, rgba(245, 230, 163, 0.3) 50%, rgba(219, 175, 54, 0.25) 70%, transparent 100%)`,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              padding: '1px',
            }}
          />
        )}
      </AnimatePresence>

      {/* Image Carousel — portrait aspect-[3/4] */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ borderRadius: '16px 16px 0 0' }}>
        {!imageError ? (
          <motion.img
            key={currentImageIndex}
            src={currentImage}
            alt={product.name}
            className="h-full w-full object-cover"
            initial={{ opacity: 0.8, scale: 1.02 }}
            animate={{ opacity: 1, scale: isHovered ? 1.06 : 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${
            isDark ? 'bg-gradient-to-br from-stone-800 to-stone-900' : 'bg-gradient-to-br from-stone-100 to-stone-200'
          }`}>
            <span className="text-3xl" style={{ color: accentColor, opacity: 0.4 }}>💎</span>
          </div>
        )}

        {/* Glassmorphic overlay on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
              style={{
                background: isDark
                  ? 'linear-gradient(to top, rgba(12, 10, 9, 0.85), rgba(12, 10, 9, 0.3), transparent)'
                  : 'linear-gradient(to top, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.4), transparent)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Hover action buttons — glassmorphic backdrop */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              {/* Quick View button */}
              <button
                onClick={handleQuickView}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:scale-105"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                  color: isDark ? '#ffffff' : '#1c1917',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(212, 164, 55, 0.2)',
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                Quick View
              </button>
              {/* Try On button — KEEP THIS! */}
              <button
                onClick={handleTryOn}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:scale-105 luxury-sweep"
                style={{
                  background: accentColor,
                  color: isDark ? '#0a0a0a' : '#1c1917',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: `0 2px 12px rgba(219, 175, 54, 0.3)`,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Try On
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carousel Dots */}
        {totalImages > 1 && (
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => handleDotClick(e, i)}
                className={`rounded-full transition-all duration-300 ${
                  i === currentImageIndex
                    ? 'h-2 w-2 scale-110'
                    : 'h-1.5 w-1.5 hover:scale-125'
                }`}
                style={{
                  backgroundColor: i === currentImageIndex ? accentColor : isDark ? 'rgba(212, 164, 55, 0.25)' : 'rgba(212, 164, 55, 0.35)',
                  boxShadow: i === currentImageIndex ? `0 0 6px ${accentColor}` : 'none',
                }}
                aria-label={`View image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Wishlist heart toggle with animation */}
        <motion.button
          onClick={handleWishlistToggle}
          whileTap={{ scale: 0.85 }}
          className="absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300"
          style={{
            background: isWishlisted
              ? isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'
              : isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: isWishlisted
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(212, 164, 55, 0.2)',
            color: isWishlisted
              ? '#ef4444'
              : isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(28, 25, 23, 0.5)',
          }}
        >
          <motion.div
            animate={wishlistAnimating ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </motion.div>
        </motion.button>

        {/* Badges — left side */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {product.featured && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
              style={{
                background: isDark ? 'rgba(212, 164, 55, 0.85)' : 'rgba(212, 164, 55, 0.9)',
                color: isDark ? '#ffffff' : '#1c1917',
                boxShadow: `0 0 8px rgba(212, 164, 55, 0.2)`,
              }}
            >
              {t('common.featured')}
            </span>
          )}
          {discount > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-bold backdrop-blur-md"
              style={{
                background: 'rgba(5, 150, 105, 0.9)',
                color: '#ffffff',
              }}
            >
              -{discount}%
            </span>
          )}
        </div>

        {/* Platform Badge — floating colored pill */}
        {isExternal && platformSlug && (
          <span
            className={`absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full ${PLATFORM_BADGE_COLORS[platformSlug] || 'bg-emerald-600/90'} px-2.5 py-1 text-[9px] font-semibold text-white shadow-lg backdrop-blur-sm`}
          >
            {platformName}
            <ExternalLink className="h-2.5 w-2.5" />
          </span>
        )}

        {/* Virtual Try-On badge */}
        <AnimatePresence>
          {isHovered && !isExternal && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-medium backdrop-blur-md"
              style={{
                background: isDark ? 'rgba(12, 10, 9, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                color: accentColor,
                border: isDark ? '1px solid rgba(219, 175, 54, 0.2)' : '1px solid rgba(212, 164, 55, 0.25)',
              }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              Virtual Try-On
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stock badge */}
        {product.stock <= 3 && product.stock > 0 && !isExternal && (
          <span
            className="absolute right-2.5 bottom-2.5 rounded-full px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm"
            style={{
              background: isDark ? 'rgba(127, 29, 29, 0.8)' : 'rgba(185, 28, 28, 0.1)',
              color: isDark ? '#fca5a5' : '#b91c1c',
              border: isDark ? 'none' : '1px solid rgba(185, 28, 28, 0.2)',
            }}
          >
            {t('common.onlyLeft', { count: String(product.stock) })}
          </span>
        )}
        {product.stock === 0 && !isExternal && (
          <div
            className="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
            style={{
              background: isDark ? 'rgba(12, 10, 9, 0.7)' : 'rgba(255, 255, 255, 0.8)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <span
              className="rounded-full px-4 py-2 text-xs font-bold backdrop-blur-sm"
              style={{
                background: isDark ? 'rgba(28, 25, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                color: isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(184, 134, 11, 0.5)',
                border: isDark ? '1px solid rgba(219, 175, 54, 0.1)' : '1px solid rgba(212, 164, 55, 0.15)',
              }}
            >
              {t('common.soldOut')}
            </span>
          </div>
        )}
      </div>

      {/* Product Info Section */}
      <div className="p-4">
        {/* Category label — small uppercase gold */}
        <p
          className="text-[10px] uppercase tracking-[0.2em] font-medium"
          style={{ color: accentColor, opacity: isDark ? 0.6 : 0.7 }}
        >
          {product.category}
        </p>

        {/* Product name — Urbanist font reference via heading var */}
        <h3
          className="mt-1 text-sm font-semibold line-clamp-1 transition-colors duration-300 sm:text-[15px]"
          style={{
            color: isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917',
            fontFamily: 'var(--font-heading, Urbanist)',
            letterSpacing: '-0.01em',
          }}
        >
          {product.name}
        </h3>

        {/* Rating stars */}
        <div className="mt-1.5 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < Math.floor(product.rating)
                  ? isDark ? 'fill-amber-500 text-amber-500' : 'fill-amber-500 text-amber-500'
                  : isDark ? 'text-amber-700/25' : 'text-amber-300/40'
              }`}
            />
          ))}
          <span
            className="ml-1 text-[10px] font-medium"
            style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.35)' }}
          >
            ({product.reviewCount})
          </span>
        </div>

        {/* Price — gold accent */}
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="text-base font-bold sm:text-lg"
            style={{ color: accentColor }}
          >
            {format(product.price)}
          </span>
          {product.compareAtPrice && (
            <span
              className="text-[11px] line-through"
              style={{ color: isDark ? 'rgba(245, 230, 163, 0.2)' : 'rgba(28, 25, 23, 0.3)' }}
            >
              {format(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* CTA Section */}
        {isExternal ? (
          <div className="mt-3">
            <p className={`text-[10px] font-medium mb-2 flex items-center gap-1 ${
              isDark
                ? (PLATFORM_TEXT_COLORS[platformSlug] || 'text-emerald-400')
                : (PLATFORM_TEXT_COLORS_LIGHT[platformSlug] || 'text-emerald-700')
            }`}>
              <ExternalLink className="h-2.5 w-2.5" />
              Available on {platformName}
            </p>
            <Button
              onClick={handleShopOnPlatform}
              className={`w-full transition-all duration-300 font-semibold gap-1.5 text-xs h-9 rounded-lg luxury-sweep ${PLATFORM_BUTTON_COLORS[platformSlug] || 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
              size="sm"
            >
              <ExternalLink className="h-3 w-3" />
              Shop on {platformName}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`mt-3 w-full transition-all duration-300 text-xs h-9 rounded-lg font-semibold luxury-sweep ${
              isAdding
                ? 'bg-emerald-600 text-white scale-95'
                : 'text-stone-950 hover:shadow-lg'
            }`}
            style={!isAdding ? {
              background: accentColor,
              boxShadow: isAdding ? 'none' : `0 2px 12px rgba(219, 175, 54, 0.2)`,
            } : {}}
            size="sm"
          >
            <ShoppingCart className="mr-1 h-3 w-3" />
            {isAdding ? t('common.added') : product.stock === 0 ? t('common.soldOut') : t('common.addToCart')}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
