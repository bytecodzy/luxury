'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowRight, Eye } from 'lucide-react';
import { useState } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';
import { QuickViewDialog } from '@/components/quick-view-dialog';

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

const COLLECTION_TABS = [
  { id: 'featured', label: 'Featured' },
  { id: 'new-arrivals', label: 'New Arrivals' },
  { id: 'women-jewelry', label: 'Jewelry' },
  { id: 'women-sarees', label: 'Sarees' },
  { id: 'men-watches', label: 'Watches' },
  { id: 'men-fragrances', label: 'Fragrances' },
];

export function FeaturedProductsSection() {
  const { selectProduct, addItem, setCategory, setView } = useStore();
  const { format } = useCurrency();
  const [activeTab, setActiveTab] = useState('featured');
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const appTheme = useStore((s) => s.appTheme);

  // Fetch products for the selected tab
  const { data, isLoading } = useQuery({
    queryKey: ['showcase-products', activeTab],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('limit', '9');
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

  const handleQuickView = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setQuickViewProduct(product);
    setQuickViewOpen(true);
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

  const isLight = appTheme === 'light';
  const cardBg = isLight ? 'bg-white/80' : 'bg-stone-900/50';
  const cardBorder = isLight ? 'border-stone-200/60' : 'border-amber-500/8';
  const cardHoverBorder = isLight ? 'hover:border-amber-400/40' : 'hover:border-amber-500/20';
  const textPrimary = isLight ? 'text-stone-800' : 'text-amber-50';
  const textSecondary = isLight ? 'text-stone-500' : 'text-amber-100/60';

  return (
    <section className="py-12 sm:py-8 lg:py-10">
      {/* Section Header — "Curated Collections" with gold accent diamond divider */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mb-10 text-center"
      >
        <h2
          className={`text-2xl sm:text-3xl lg:text-4xl font-medium ${isLight ? 'text-stone-900' : 'text-amber-50'}`}
          style={{ fontFamily: "'Lora', serif" }}
        >
          Curated Collections
        </h2>
        {/* Gold accent diamond divider */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="luxury-accent-bg h-px w-8 opacity-60" />
          <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
          <span className="luxury-accent-bg h-px w-8 opacity-60" />
        </div>
      </motion.div>

      {/* Animated Tabs — gold underline on active tab (framer-motion layoutId) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mb-8 flex flex-wrap items-center justify-center gap-1 sm:gap-3"
      >
        {COLLECTION_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors duration-200 ${
                isActive
                  ? 'luxury-accent-text'
                  : isLight ? 'text-stone-400 hover:text-stone-600' : 'text-amber-100/40 hover:text-amber-100/70'
              }`}
              style={{ fontFamily: "'Urbanist', sans-serif" }}
            >
              {tab.label}
              {/* Animated gold underline on active tab */}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-px luxury-accent-bg"
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
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`rounded-xl ${cardBg} ${isLight ? 'border border-stone-200/60' : 'border border-amber-500/8'} animate-pulse`}>
              <div className="aspect-[3/4] rounded-t-xl bg-stone-800/40" />
              <div className="p-4 space-y-2">
                <div className={`h-3 w-16 rounded ${isLight ? 'bg-stone-200/60' : 'bg-stone-800/40'}`} />
                <div className={`h-4 w-3/4 rounded ${isLight ? 'bg-stone-200/60' : 'bg-stone-800/40'}`} />
                <div className={`h-3 w-24 rounded ${isLight ? 'bg-stone-200/60' : 'bg-stone-800/40'}`} />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed ${isLight ? 'border-stone-300/40 bg-stone-100/20' : 'border-amber-500/10 bg-stone-900/20'} py-16 px-6`}
        >
          <p className={`text-base font-medium mb-1 ${textSecondary}`} style={{ fontFamily: "'Urbanist', sans-serif" }}>
            No products found
          </p>
          <p className={`text-sm max-w-md text-center ${isLight ? 'text-stone-400' : 'text-amber-100/25'}`} style={{ fontFamily: "'Urbanist', sans-serif" }}>
            Try selecting a different collection to explore our offerings.
          </p>
        </motion.div>
      ) : (
        /* 3-Column Grid Layout with hover overlay */
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid gap-3 sm:gap-4 lg:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className={`group cursor-pointer rounded-xl ${cardBg} border ${cardBorder} ${cardHoverBorder} transition-all duration-300 overflow-hidden relative`}
              onClick={() => selectProduct(product.id)}
            >
              {/* Product image — aspect-[3/4] with hover overlay */}
              <div className="aspect-[4/5] relative overflow-hidden bg-stone-800/30">
                <img
                  src={getProxiedImageUrl(product.images?.[0] || '/images/placeholder.jpg', product.platform)}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                {/* Hover overlay with Quick View + Add to Cart */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 ${isLight ? 'bg-stone-900/40' : 'bg-stone-950/50'} opacity-0 group-hover:opacity-100`}>
                  <Button
                    onClick={(e) => handleQuickView(e, product)}
                    className="gap-2 h-9 px-6 text-xs font-medium rounded-full bg-white/90 text-stone-900 hover:bg-white transition-all duration-200 backdrop-blur-sm"
                    style={{ fontFamily: "'Urbanist', sans-serif" }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Quick View
                  </Button>
                  <Button
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={product.stock === 0}
                    className={`gap-2 h-9 px-6 text-xs font-medium rounded-full transition-all duration-200 ${
                      isAdding === product.id
                        ? 'bg-emerald-600 text-white scale-[0.97]'
                        : 'luxury-accent-gradient-bg text-stone-950 hover:opacity-90'
                    }`}
                    style={{ fontFamily: "'Urbanist', sans-serif" }}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {isAdding === product.id ? 'Added!' : product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                  </Button>
                </div>

                {/* Gold shimmer border effect on hover */}
                <motion.div
                  className="absolute inset-0 rounded-t-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(219,175,54,0.3), inset 0 0 20px rgba(219,175,54,0.05)',
                  }}
                />
              </div>

              {/* Card info */}
              <div className="p-4">
                {/* Category label — small uppercase gold */}
                <p
                  className="text-[10px] uppercase tracking-[0.2em] luxury-accent-text opacity-60 font-medium"
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  {product.category}
                </p>

                {/* Product name — Urbanist */}
                <h3
                  className={`mt-1.5 text-sm sm:text-base font-normal ${textPrimary} line-clamp-1 group-hover:${isLight ? 'text-stone-900' : 'text-amber-100'} transition-colors`}
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  {product.name}
                </h3>

                {/* Price in luxury-accent-text gold color */}
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className="text-sm sm:text-base font-semibold luxury-accent-text"
                    style={{ fontFamily: "'Urbanist', sans-serif" }}
                  >
                    {format(product.price)}
                  </span>
                  {product.compareAtPrice && (
                    <span className={`text-xs ${isLight ? 'text-stone-400' : 'text-amber-100/25'} line-through`} style={{ fontFamily: "'Urbanist', sans-serif" }}>
                      {format(product.compareAtPrice)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* View All CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="mt-10 text-center"
      >
        <Button
          onClick={handleViewAll}
          className={`gap-2 rounded-full px-7 h-10 text-sm font-medium transition-all duration-300 ${
            isLight
              ? 'bg-transparent border border-amber-600/25 text-amber-700/70 hover:border-amber-600/40 hover:text-amber-800 hover:bg-amber-500/[0.06]'
              : 'bg-transparent border border-amber-500/25 text-amber-100/70 hover:border-amber-500/40 hover:text-amber-50 hover:bg-amber-500/[0.06]'
          }`}
          style={{ fontFamily: "'Urbanist', sans-serif" }}
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Quick View Dialog */}
      <QuickViewDialog
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        product={quickViewProduct as any}
      />
    </section>
  );
}
