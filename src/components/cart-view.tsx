'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Truck, CheckCircle, AlertTriangle, X, Sparkles, Eye, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getProxiedImageUrl } from '@/lib/image-utils';
import React from 'react';

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

export function CartView() {
  const { cartItems, updateQuantity, removeItem, setView, selectProduct, addItem } = useStore();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const appTheme = useStore((s) => s.appTheme);
  const isDark = appTheme === 'dark';
  const accentColor = 'var(--luxury-accent, #dbaf36)';

  // ── Fetch all products for stock lookup & recommendations ──
  const { data: productsData } = useQuery({
    queryKey: ['cart-products-info'],
    queryFn: () => fetch('/api/products?limit=100').then((r) => r.json()),
    enabled: cartItems.length > 0,
  });

  const allProducts: Product[] = Array.isArray(productsData?.products) ? productsData.products : [];
  const productMap = React.useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);

  // ── Cart item details (with stock info from API) ──
  const cartItemDetails = React.useMemo(
    () =>
      cartItems.map((item) => ({
        ...item,
        product: productMap.get(item.productId),
      })),
    [cartItems, productMap]
  );

  // ── Unique categories in cart for recommendation fetch ──
  const cartCategories = React.useMemo(
    () =>
      [...new Set(
        cartItemDetails
          .map((item) => item.product?.categorySlug)
          .filter(Boolean) as string[]
      )],
    [cartItemDetails]
  );

  // ── Fetch recommended products ──
  const { data: recData, isLoading: recLoading } = useQuery({
    queryKey: ['cart-recommendations', cartCategories.sort().join(',')],
    queryFn: () => {
      // If we have categories from cart, use them; otherwise use 'featured'
      const category = cartCategories.length > 0 ? cartCategories[0] : '';
      const params = new URLSearchParams();
      params.set('limit', '12');
      if (category) params.set('category', category);
      else params.set('sort', 'featured');
      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
    enabled: cartItems.length > 0,
  });

  const recommendedProducts: Product[] = React.useMemo(
    () =>
      Array.isArray(recData?.products)
        ? recData.products
            .filter((p: Product) => !cartItems.some((ci) => ci.productId === p.id))
            .slice(0, 12)
        : [],
    [recData, cartItems]
  );

  // ── Totals ──
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  // ── Stock status helper ──
  const getStockInfo = (stock: number | undefined) => {
    if (stock === undefined || stock === null) return { label: 'Checking availability…', variant: 'unknown' as const };
    if (stock === 0) return { label: 'Out of Stock', variant: 'out' as const };
    if (stock <= 5) return { label: `Only ${stock} left in stock`, variant: 'low' as const };
    return { label: 'In Stock', variant: 'in' as const };
  };

  // ── Colors based on theme ──
  const cardBg = isDark ? 'rgba(28, 25, 23, 0.6)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorder = isDark ? 'rgba(212, 164, 55, 0.1)' : 'rgba(212, 164, 55, 0.15)';
  const textPrimary = isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917';
  const textSecondary = isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)';
  const summaryBg = isDark ? 'rgba(28, 25, 23, 0.8)' : 'rgba(255, 255, 255, 0.95)';
  const summaryBorder = isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.2)';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
      {/* ── Back to Shopping button ── */}
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className="mb-6 transition-all duration-300"
        style={{
          color: isDark ? 'rgba(245, 230, 163, 0.7)' : 'rgba(28, 25, 23, 0.6)',
          background: isDark ? 'rgba(212, 164, 55, 0.06)' : 'rgba(212, 164, 55, 0.04)',
          border: isDark ? '1px solid rgba(212, 164, 55, 0.1)' : '1px solid rgba(212, 164, 55, 0.12)',
          borderRadius: '12px',
        }}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('common.continueShopping')}
      </Button>

      {/* ── Cart Title ── */}
      <h2
        className="text-2xl sm:text-3xl font-bold"
        style={{
          color: textPrimary,
          fontFamily: "'Urbanist', sans-serif",
          letterSpacing: '-0.01em',
        }}
      >
        {t('cart.title')}
      </h2>

      {cartItems.length === 0 ? (
        /* ── Empty Cart ── */
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="h-16 w-16" style={{ color: accentColor, opacity: 0.3 }} />
          <h3 className="mt-4 text-lg font-semibold" style={{ color: textPrimary }}>
            {t('cart.empty')}
          </h3>
          <p className="mt-2 text-sm" style={{ color: textSecondary }}>
            {t('cart.emptyDescription')}
          </p>
          <Button
            onClick={() => setView('home')}
            className="mt-6 luxury-sweep transition-all duration-300"
            style={{
              background: accentColor,
              color: isDark ? '#0a0a0a' : '#1c1917',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(219, 175, 54, 0.2)',
            }}
            size="lg"
          >
            {t('cart.shopNow')}
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* ── Cart Items ── */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItemDetails.map((item) => {
                const product = item.product;
                const stockInfo = getStockInfo(product?.stock);

                return (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className="group relative flex gap-4 sm:gap-5 rounded-xl p-4 sm:p-5 transition-all duration-300"
                    style={{
                      background: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: '16px',
                      backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
                      WebkitBackdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
                    }}
                  >


                    {/* ── Product Image ── */}
                    <div
                      className="relative h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-xl"
                      style={{
                        background: isDark ? 'rgba(12, 10, 9, 0.5)' : 'rgba(245, 240, 230, 0.5)',
                        border: isDark ? '1px solid rgba(212, 164, 55, 0.08)' : '1px solid rgba(212, 164, 55, 0.1)',
                      }}
                    >
                      <img
                        src={getProxiedImageUrl(item.image, product?.platform)}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                        }}
                      />
                    </div>

                    {/* ── Product Info ── */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* Category label */}
                          {product?.category && (
                            <p
                              className="text-[10px] uppercase tracking-[0.2em] font-medium"
                              style={{ color: accentColor, opacity: isDark ? 0.6 : 0.7 }}
                            >
                              {product.category}
                            </p>
                          )}
                          <h4
                            className="text-sm sm:text-base font-semibold line-clamp-1"
                            style={{
                              color: textPrimary,
                              fontFamily: "'Urbanist', sans-serif",
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {item.name}
                          </h4>
                          <p className="mt-1 text-sm font-medium" style={{ color: accentColor }}>
                            {format(item.price)}
                          </p>
                        </div>

                        {/* ── Delete button (visible, styled) ── */}
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 shrink-0"
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                            border: isDark ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(239, 68, 68, 0.12)',
                            color: isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(185, 28, 28, 0.6)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)';
                            e.currentTarget.style.color = isDark ? '#ef4444' : '#b91c1c';
                            e.currentTarget.style.borderColor = isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(185, 28, 28, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)';
                            e.currentTarget.style.color = isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(185, 28, 28, 0.6)';
                            e.currentTarget.style.borderColor = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(185, 28, 28, 0.12)';
                          }}
                          title="Remove from cart"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* ── Stock Status Badge ── */}
                      <div className="mt-2 flex items-center gap-1.5">
                        {stockInfo.variant === 'in' && (
                          <CheckCircle className="h-3.5 w-3.5" style={{ color: isDark ? '#34d399' : '#059669' }} />
                        )}
                        {stockInfo.variant === 'low' && (
                          <AlertTriangle className="h-3.5 w-3.5" style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
                        )}
                        {stockInfo.variant === 'out' && (
                          <X className="h-3.5 w-3.5" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                        )}
                        {stockInfo.variant === 'unknown' && (
                          <div className="h-3.5 w-3.5 rounded-full border-2 animate-pulse" style={{ borderColor: accentColor }} />
                        )}
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              stockInfo.variant === 'in'
                                ? isDark ? '#34d399' : '#059669'
                                : stockInfo.variant === 'low'
                                  ? isDark ? '#fbbf24' : '#b45309'
                                  : stockInfo.variant === 'out'
                                    ? isDark ? '#f87171' : '#dc2626'
                                    : textSecondary,
                          }}
                        >
                          {stockInfo.label}
                        </span>
                      </div>

                      {/* ── Quantity Controls + Total ── */}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div
                          className="flex items-center rounded-lg overflow-hidden"
                          style={{
                            background: isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(245, 240, 230, 0.4)',
                            border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.12)' : 'rgba(212, 164, 55, 0.15)'}`,
                          }}
                        >
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center transition-colors duration-200"
                            style={{ color: textSecondary }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = accentColor; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = textSecondary; }}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span
                            className="w-8 text-center text-sm font-semibold"
                            style={{ color: textPrimary }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center transition-colors duration-200"
                            style={{ color: textSecondary }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = accentColor; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = textSecondary; }}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span
                          className="text-sm sm:text-base font-bold"
                          style={{ color: accentColor }}
                        >
                          {format(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ── Order Summary ── */}
          <div
            className="rounded-xl p-6 lg:sticky lg:top-40 lg:self-start z-10"
            style={{
              background: summaryBg,
              border: `1px solid ${summaryBorder}`,
              borderRadius: '16px',
              backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
              WebkitBackdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
            }}
          >
            <h3
              className="text-lg font-semibold"
              style={{
                color: textPrimary,
                fontFamily: "'Urbanist', sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {t('cart.orderSummary')}
            </h3>

            {/* ── Free Shipping Banner (visible in both themes) ── */}
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{
                background: isDark ? 'rgba(212, 164, 55, 0.08)' : 'rgba(212, 164, 55, 0.06)',
                border: `1px solid ${isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)'}`,
                borderRadius: '10px',
              }}
            >
              <Truck className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
              {shipping === 0 ? (
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: accentColor,
                    fontFamily: "'Urbanist', sans-serif",
                  }}
                >
                  🎉 {t('cart.freeShippingOver', { amount: format(500) })}
                </span>
              ) : (
                <span
                  className="text-xs font-medium"
                  style={{
                    color: textSecondary,
                    fontFamily: "'Urbanist', sans-serif",
                  }}
                >
                  Add {format(500 - subtotal)} more for free shipping
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span style={{ color: textSecondary }}>{t('cart.subtotal')}</span>
                <span style={{ color: textPrimary }}>{format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: textSecondary }}>{t('cart.shipping')}</span>
                <span style={{ color: textPrimary }}>
                  {shipping === 0 ? (
                    <span
                      className="font-semibold"
                      style={{ color: isDark ? '#34d399' : '#059669' }}
                    >
                      {t('common.free')}
                    </span>
                  ) : (
                    format(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: textSecondary }}>{t('cart.tax')}</span>
                <span style={{ color: textPrimary }}>{format(tax)}</span>
              </div>

              <Separator style={{ background: isDark ? 'rgba(212, 164, 55, 0.15)' : 'rgba(212, 164, 55, 0.12)' }} />

              <div className="flex justify-between">
                <span className="font-semibold" style={{ color: textPrimary }}>{t('cart.total')}</span>
                <span className="text-lg font-bold" style={{ color: accentColor }}>{format(total)}</span>
              </div>
            </div>

            {/* ── Proceed to Checkout button (luxury gold theme) ── */}
            <Button
              onClick={() => setView('checkout')}
              className="mt-6 w-full luxury-sweep transition-all duration-300 font-semibold"
              style={{
                background: accentColor,
                color: isDark ? '#0a0a0a' : '#1c1917',
                borderRadius: '12px',
                boxShadow: '0 2px 16px rgba(219, 175, 54, 0.25)',
                fontFamily: "'Urbanist', sans-serif",
                letterSpacing: '0.02em',
                height: '44px',
              }}
              size="lg"
            >
              {t('common.proceedToCheckout')}
            </Button>

            {/* ── Continue Shopping link ── */}
            <button
              onClick={() => setView('home')}
              className="mt-3 w-full text-xs font-medium py-2 transition-colors duration-200"
              style={{
                color: textSecondary,
                fontFamily: "'Urbanist', sans-serif",
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t('common.continueShopping')}
            </button>
          </div>
        </div>
      )}

      {/* ── "You May Also Like" Recommendation Section ── */}
      {cartItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-16"
        >
          {/* Section Header */}
          <div className="mb-8 text-center">
            <h2
              className="text-xl sm:text-2xl lg:text-3xl font-medium"
              style={{
                color: textPrimary,
                fontFamily: "'Lora', serif",
              }}
            >
              You May Also Like
            </h2>
            {/* Gold accent diamond divider */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="luxury-accent-bg h-px w-8 opacity-60" />
              <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
              <span className="luxury-accent-bg h-px w-8 opacity-60" />
            </div>
          </div>

          {/* Loading skeleton */}
          {recLoading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-xl animate-pulse ${isDark ? 'bg-stone-900/50' : 'bg-white/80'} ${isDark ? 'border border-amber-500/8' : 'border border-stone-200/60'}`}
                >
                  <div className="aspect-[4/5] rounded-t-xl" style={{ background: isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(245, 240, 230, 0.6)' }} />
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-16 rounded" style={{ background: isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(245, 240, 230, 0.6)' }} />
                    <div className="h-4 w-3/4 rounded" style={{ background: isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(245, 240, 230, 0.6)' }} />
                    <div className="h-3 w-24 rounded" style={{ background: isDark ? 'rgba(12, 10, 9, 0.4)' : 'rgba(245, 240, 230, 0.6)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendedProducts.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-12 rounded-xl border border-dashed ${isDark ? 'border-amber-500/10 bg-stone-900/20' : 'border-stone-300/40 bg-stone-100/20'}`}
            >
              <Sparkles className="h-8 w-8" style={{ color: accentColor, opacity: 0.3 }} />
              <p className="mt-3 text-sm font-medium" style={{ color: textSecondary }}>
                No recommendations available right now
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {recommendedProducts.map((product, i) => {
                const isExternal = product.isExternal && product.platform;
                const platformSlug = product.platform?.toLowerCase() || '';
                const discount = product.compareAtPrice
                  ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                    className={`group cursor-pointer rounded-xl ${isDark ? 'bg-stone-900/50' : 'bg-white/80'} border ${isDark ? 'border-amber-500/8' : 'border-stone-200/60'} ${isDark ? 'hover:border-amber-500/20' : 'hover:border-amber-400/40'} transition-all duration-300 overflow-hidden relative`}
                    onClick={() => selectProduct(product.id)}
                  >
                    {/* Product image — aspect-[4/5] with hover overlay (same as home page) */}
                    <div className="aspect-[4/5] relative overflow-hidden bg-stone-800/30">
                      <img
                        src={getProxiedImageUrl(product.images?.[0] || '/images/placeholder.jpg', product.platform)}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                        }}
                      />
                      {/* Hover overlay with Quick View + Add to Cart (same as home page) */}
                      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 ${isDark ? 'bg-stone-950/50' : 'bg-stone-900/40'} opacity-0 group-hover:opacity-100`}>
                        <Button
                          onClick={(e) => { e.stopPropagation(); selectProduct(product.id); }}
                          className="gap-2 h-9 px-6 text-xs font-medium rounded-full bg-white/90 text-stone-900 hover:bg-white transition-all duration-200 backdrop-blur-sm"
                          style={{ fontFamily: "'Urbanist', sans-serif" }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Quick View
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            addItem({
                              productId: product.id,
                              name: product.name,
                              price: product.price,
                              image: product.images?.[0] || '/images/placeholder.jpg',
                            });
                          }}
                          disabled={product.stock === 0}
                          className="gap-2 h-9 px-6 text-xs font-medium rounded-full transition-all duration-200 luxury-accent-gradient-bg text-stone-950 hover:opacity-90"
                          style={{ fontFamily: "'Urbanist', sans-serif" }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                        </Button>
                      </div>

                      {/* Gold shimmer border effect on hover (same as home page) */}
                      <div
                        className="absolute inset-0 rounded-t-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: 'inset 0 0 0 1px rgba(219,175,54,0.3), inset 0 0 20px rgba(219,175,54,0.05)',
                        }}
                      />

                      {/* Discount badge */}
                      {discount > 0 && (
                        <span
                          className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-bold backdrop-blur-md"
                          style={{
                            background: 'rgba(5, 150, 105, 0.9)',
                            color: '#ffffff',
                          }}
                        >
                          -{discount}%
                        </span>
                      )}

                      {/* Featured badge */}
                      {product.featured && (
                        <span
                          className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
                          style={{
                            background: isDark ? 'rgba(212, 164, 55, 0.85)' : 'rgba(212, 164, 55, 0.9)',
                            color: isDark ? '#ffffff' : '#1c1917',
                            boxShadow: '0 0 8px rgba(212, 164, 55, 0.2)',
                          }}
                        >
                          {t('common.featured')}
                        </span>
                      )}
                    </div>

                    {/* Card info (same as home page) */}
                    <div className="p-4">
                      {/* Category label — small uppercase gold */}
                      <p
                        className="text-[10px] uppercase tracking-[0.2em] font-medium"
                        style={{
                          color: accentColor,
                          opacity: isDark ? 0.6 : 0.7,
                          fontFamily: "'Urbanist', sans-serif",
                        }}
                      >
                        {product.category}
                      </p>

                      {/* Product name — Urbanist */}
                      <h3
                        className="mt-1.5 text-sm sm:text-base font-normal line-clamp-1 transition-colors"
                        style={{
                          color: isDark ? 'rgba(245, 230, 163, 0.9)' : '#1c1917',
                          fontFamily: "'Urbanist', sans-serif",
                        }}
                      >
                        {product.name}
                      </h3>

                      {/* Price in luxury-accent-text gold color */}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span
                          className="text-sm sm:text-base font-semibold"
                          style={{
                            color: accentColor,
                            fontFamily: "'Urbanist', sans-serif",
                          }}
                        >
                          {format(product.price)}
                        </span>
                        {product.compareAtPrice && (
                          <span
                            className="text-xs line-through"
                            style={{
                              color: isDark ? 'rgba(245, 230, 163, 0.2)' : 'rgba(28, 25, 23, 0.3)',
                              fontFamily: "'Urbanist', sans-serif",
                            }}
                          >
                            {format(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
