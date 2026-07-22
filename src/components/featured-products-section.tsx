'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, ShoppingCart, Eye, ArrowRight, Crown } from 'lucide-react';
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

const SHOWCASE_TABS = [
  { id: 'featured', label: 'Featured', icon: Crown },
  { id: 'new-arrivals', label: 'New Arrivals', icon: Sparkles },
  { id: 'women-jewelry', label: 'Jewelry', icon: Star },
  { id: 'women-sarees', label: 'Sarees', icon: Star },
  { id: 'men-watches', label: 'Watches', icon: Star },
  { id: 'men-fragrances', label: 'Fragrances', icon: Star },
];

export function FeaturedProductsSection() {
  const { selectProduct, addItem, setCategory, setView, selectedCategory, appTheme } = useStore();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('featured');
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const accentColor = `var(--luxury-accent, #d4a437)`;

  // Fetch featured products for home page showcase
  const { data, isLoading } = useQuery({
    queryKey: ['showcase-products', activeTab],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('limit', '12');
      if (activeTab === 'featured') {
        params.set('sort', 'featured');
      } else {
        params.set('category', activeTab);
      }
      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
  });

  const rawProducts = data?.products;
  const products: Product[] = Array.isArray(rawProducts) ? rawProducts : [];

  // Pick the hero product (first featured)
  const heroProduct = products.length > 0 ? products[0] : null;
  const gridProducts = products.slice(1);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setIsAdding(product.id);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '/images/placeholder.jpg',
    });
    setTimeout(() => setIsAdding(null), 600);
  };

  const handleViewAll = () => {
    if (activeTab === 'featured') {
      setCategory(null);
      setView('home');
    } else {
      setCategory(activeTab);
      setView('home');
      setTimeout(() => {
        const el = document.getElementById('products-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <section ref={sectionRef} className="py-12 sm:py-16">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mb-8 text-center"
      >
        <div className={`mb-3 inline-flex items-center gap-2 rounded-full border ${appTheme === 'light' ? 'border-amber-300/30 bg-amber-100/50 text-amber-700' : 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400'} px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em]`}>
          <Crown className="h-3.5 w-3.5" />
          Curated Showcase
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          <span className={appTheme === 'light' ? 'text-stone-800' : 'text-amber-50/90'}>Luxury </span>
          <span className="gold-shimmer">Collections</span>
        </h2>
      </motion.div>

      {/* Showcase Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8 flex flex-wrap items-center justify-center gap-2.5"
      >
        {SHOWCASE_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                isActive
                  ? `${appTheme === 'light' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25' : 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 shadow-lg shadow-amber-600/30'}`
                  : `${appTheme === 'light' ? 'border border-amber-300/30 bg-amber-100/50 text-stone-700 hover:bg-amber-200/60 hover:border-amber-400/40' : 'border border-amber-500/15 bg-amber-500/[0.04] text-amber-200/60 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-200'}`
              }`}
              style={isActive ? {} : {}}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="showcase-tab-glow"
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 15px ${accentColor}40` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`aspect-[3/4] rounded-2xl ${appTheme === 'light' ? 'bg-amber-100/30 animate-pulse' : 'bg-stone-900/60 animate-pulse'} border ${appTheme === 'light' ? 'border-amber-200/30' : 'border-amber-900/10'}`} />
          ))}
        </div>
      ) : products.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex flex-col items-center justify-center rounded-2xl border border-dashed ${appTheme === 'light' ? 'border-amber-300/30 bg-amber-50/20' : 'border-amber-900/20 bg-stone-900/20'} py-16 px-6`}
        >
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${appTheme === 'light' ? 'bg-amber-100/50' : 'bg-amber-900/20'} mb-4`}>
            <Sparkles className={`h-8 w-8 ${appTheme === 'light' ? 'text-amber-600/50' : 'text-amber-400/50'}`} />
          </div>
          <p className={`text-base font-medium ${appTheme === 'light' ? 'text-stone-700' : 'text-amber-200/50'} mb-1`}>No products found</p>
          <p className={`text-sm ${appTheme === 'light' ? 'text-stone-500/60' : 'text-amber-200/30'} max-w-md text-center mb-6`}>
            Try selecting a different category to explore our collections.
          </p>
        </motion.div>
      ) : (
        /* Showcase Layout — Hero product + grid */
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="grid gap-4 lg:grid-cols-12"
          >
            {/* Hero Product — large showcase card */}
            {heroProduct && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className={`lg:col-span-5 group cursor-pointer overflow-hidden rounded-2xl border ${appTheme === 'light' ? 'border-amber-200/40 bg-white/90' : 'border-amber-500/10'} transition-all duration-500 hover:shadow-xl ${appTheme === 'light' ? 'hover:shadow-amber-600/10' : 'hover:shadow-amber-900/20'} relative`}
                onClick={() => selectProduct(heroProduct.id)}
              >
                {/* Large product image */}
                <div className={`aspect-[4/5] relative overflow-hidden ${appTheme === 'light' ? 'bg-gradient-to-br from-amber-50 to-white' : 'bg-gradient-to-br from-stone-900 to-stone-950'}`}>
                  {!heroProduct.isExternal && (
                    <img
                      src={getProxiedImageUrl(heroProduct.images?.[0] || '/images/placeholder.jpg', heroProduct.platform)}
                      alt={heroProduct.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${appTheme === 'light' ? 'from-white/60 via-transparent to-transparent' : 'from-stone-950/60 via-stone-950/10 to-transparent'}`} />
                  
                  {/* Featured badge */}
                  {heroProduct.featured && (
                    <div className="absolute left-4 top-4">
                      <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${appTheme === 'light' ? 'bg-amber-600 text-white' : 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950'} shadow-lg`}>
                        <Crown className="h-3 w-3 mr-1 inline-block" />
                        Featured
                      </span>
                    </div>
                  )}

                  {/* Try-On badge */}
                  {!heroProduct.isExternal && (
                    <div className="absolute right-4 top-4">
                      <span className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold ${appTheme === 'light' ? 'bg-white/80 text-amber-700 border border-amber-300/30 backdrop-blur-md' : 'bg-stone-950/70 text-amber-300 border border-amber-500/20 backdrop-blur-md'}`}>
                        <Sparkles className="h-3 w-3" />
                        Virtual Try-On
                      </span>
                    </div>
                  )}

                  {/* Bottom info overlay */}
                  <div className={`absolute bottom-0 left-0 right-0 p-5 ${appTheme === 'light' ? 'bg-gradient-to-t from-white/90' : 'bg-gradient-to-t from-stone-950/90'} to-transparent`}>
                    <p className={`text-[10px] uppercase tracking-[0.2em] font-medium ${appTheme === 'light' ? 'text-amber-600' : 'luxury-accent-text'} opacity-70`}>
                      {heroProduct.category}
                    </p>
                    <h3 className={`mt-1 text-xl font-bold ${appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'} group-hover:text-amber-300 transition-colors`}>
                      {heroProduct.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xl font-bold ${appTheme === 'light' ? 'text-amber-600' : 'luxury-accent-text'}`}>
                        {format(heroProduct.price)}
                      </span>
                      {heroProduct.compareAtPrice && (
                        <span className={`text-sm ${appTheme === 'light' ? 'text-stone-400' : 'text-amber-200/30'} line-through`}>
                          {format(heroProduct.compareAtPrice)}
                        </span>
                      )}
                    </div>
                    {/* Rating */}
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < Math.floor(heroProduct.rating) ? 'fill-amber-500 text-amber-500' : (appTheme === 'light' ? 'text-amber-300' : 'text-amber-700/25')}`}
                        />
                      ))}
                      <span className={`ml-1 text-xs ${appTheme === 'light' ? 'text-stone-400/60' : 'text-amber-200/30'}`}>
                        ({heroProduct.reviewCount})
                      </span>
                    </div>
                    {/* CTA buttons */}
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        onClick={(e) => handleAddToCart(e, heroProduct)}
                        className={`gap-2 h-9 px-5 text-xs font-semibold rounded-full ${appTheme === 'light' ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400'} transition-all duration-300`}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {isAdding === heroProduct.id ? 'Added!' : 'Add to Cart'}
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); selectProduct(heroProduct.id); }}
                        variant="outline"
                        className={`gap-2 h-9 px-5 text-xs font-medium rounded-full ${appTheme === 'light' ? 'border-amber-300/40 bg-white/80 text-amber-700 hover:bg-amber-100/50 hover:border-amber-400/50' : 'border-amber-500/25 bg-amber-500/[0.05] text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/40'} transition-all duration-300`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grid Products — smaller cards in a 2-col layout */}
            <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
              {gridProducts.map((product, i) => {
                const discount = product.compareAtPrice
                  ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                  : 0;
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.45 }}
                    className={`group cursor-pointer overflow-hidden rounded-xl border ${appTheme === 'light' ? 'border-amber-200/40 bg-white/90 hover:border-amber-300/30 hover:shadow-amber-400/5' : 'border-amber-500/10 bg-gradient-to-b from-stone-900/80 to-stone-950/90 hover:border-amber-500/25 hover:shadow-lg hover:shadow-amber-900/10'} backdrop-blur-sm transition-all duration-300`}
                    onClick={() => selectProduct(product.id)}
                  >
                    {/* Product image */}
                    <div className={`aspect-square relative overflow-hidden ${appTheme === 'light' ? 'bg-gradient-to-br from-amber-50 to-white' : 'bg-gradient-to-br from-stone-900 to-stone-950'}`}>
                      <img
                        src={getProxiedImageUrl(product.images?.[0] || '/images/placeholder.jpg', product.platform)}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Badges */}
                      {product.featured && (
                        <span className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider luxury-accent-bg text-stone-950 shadow-sm">
                          Featured
                        </span>
                      )}
                      {discount > 0 && (
                        <span className={`absolute left-2.5 top-2.5 ${product.featured ? 'top-8' : ''} rounded-full bg-emerald-600/90 px-2.5 py-1 text-[9px] font-bold text-white`}>
                          -{discount}%
                        </span>
                      )}
                      {/* Try-On badge */}
                      {!product.isExternal && (
                        <span className={`absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium ${appTheme === 'light' ? 'bg-white/80 text-amber-700 border border-amber-300/20' : 'bg-stone-950/70 text-amber-300 border border-amber-500/15'} backdrop-blur-sm`}>
                          <Sparkles className="h-2.5 w-2.5" />
                          Try On
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3.5">
                      <p className={`text-[10px] uppercase tracking-[0.2em] font-medium ${appTheme === 'light' ? 'text-amber-600/60' : 'luxury-accent-text opacity-60'}`}>
                        {product.category}
                      </p>
                      <h3 className={`mt-1 text-sm font-bold ${appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'} line-clamp-1 group-hover:text-amber-300 transition-colors`}>
                        {product.name}
                      </h3>
                      {/* Rating row */}
                      <div className="mt-1.5 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.floor(product.rating) ? 'fill-amber-500 text-amber-500' : (appTheme === 'light' ? 'text-amber-300/30' : 'text-amber-700/25')}`} />
                        ))}
                        <span className={'ml-1 text-[10px] ' + (appTheme === 'light' ? 'text-stone-400/40' : 'text-amber-200/30')}>
                          {'(' + product.reviewCount + ')'}
                        </span>
                      </div>
                      {/* Price */}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-base font-bold ${appTheme === 'light' ? 'text-amber-600' : 'luxury-accent-text'}`}>
                          {format(product.price)}
                        </span>
                        {product.compareAtPrice && (
                          <span className={`text-[11px] ${appTheme === 'light' ? 'text-stone-400/40' : 'text-amber-200/20'} line-through`}>
                            {format(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                      {/* Quick Add button */}
                      <Button
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={product.stock === 0}
                        className={`mt-2.5 w-full gap-2 h-8 text-xs font-semibold rounded-lg transition-all duration-300 ${
                          isAdding === product.id
                            ? 'bg-emerald-600 text-white scale-95'
                            : `${appTheme === 'light' ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400'}`
                        }`}
                        size="sm"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        {isAdding === product.id ? 'Added!' : product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* View All CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <Button
          onClick={handleViewAll}
          className={`gap-2 rounded-full px-8 h-11 text-sm font-semibold ${appTheme === 'light' ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400'} transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25`}
        >
          View All Products
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </section>
  );
}
