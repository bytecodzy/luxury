'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from './product-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, SlidersHorizontal, ChevronLeft, ChevronRight, Diamond } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

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

// Platform chip dot colors
const PLATFORM_DOT_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-500',
  tanishq: 'bg-rose-500',
  bluestone: 'bg-blue-500',
  voylla: 'bg-purple-500',
  myntra: 'bg-red-500',
  nykaa: 'bg-pink-500',
  amazon: 'bg-orange-500',
  flipkart: 'bg-yellow-500',
};

const PLATFORM_CHIP_ACTIVE_BG: Record<string, string> = {
  caratlane: 'bg-amber-600/20 border-amber-500/50 text-amber-300',
  tanishq: 'bg-rose-600/20 border-rose-500/50 text-rose-300',
  bluestone: 'bg-blue-600/20 border-blue-500/50 text-blue-300',
  voylla: 'bg-purple-600/20 border-purple-500/50 text-purple-300',
  myntra: 'bg-red-600/20 border-red-500/50 text-red-300',
  nykaa: 'bg-pink-600/20 border-pink-500/50 text-pink-300',
  amazon: 'bg-orange-600/20 border-orange-500/50 text-orange-300',
  flipkart: 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300',
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

const PLATFORM_OPTIONS = [
  { value: 'myntra', label: 'Myntra' },
  { value: 'nykaa', label: 'Nykaa' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'caratlane', label: 'CaratLane' },
  { value: 'tanishq', label: 'Tanishq' },
  { value: 'bluestone', label: 'BlueStone' },
  { value: 'voylla', label: 'Voylla' },
];

const OCCASION_OPTIONS = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'diwali', label: 'Diwali' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'valentines', label: "Valentine's" },
  { value: 'housewarming', label: 'Housewarming' },
  { value: 'thank-you', label: 'Thank You' },
  { value: 'congratulations', label: 'Congratulations' },
  { value: 'just-because', label: 'Just Because' },
];

const RECIPIENT_OPTIONS = [
  { value: 'him', label: 'Him' },
  { value: 'her', label: 'Her' },
  { value: 'couple', label: 'Couple' },
  { value: 'kids', label: 'Kids' },
  { value: 'parents', label: 'Parents' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'boss', label: 'Boss' },
];

const PRICE_RANGE_OPTIONS = [
  { value: 'under-50', label: 'Under $50', min: 0, max: 50 },
  { value: '50-100', label: '$50 - $100', min: 50, max: 100 },
  { value: '100-250', label: '$100 - $250', min: 100, max: 250 },
  { value: '250-500', label: '$250 - $500', min: 250, max: 500 },
  { value: '500+', label: '$500+', min: 500, max: null },
];

// Ornamental divider component
function OrnamentalDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <Diamond className="h-3 w-3 text-amber-500/30" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </div>
  );
}

// Shimmer skeleton component
function ShimmerSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{
      background: 'rgba(28, 25, 23, 0.5)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(212, 164, 55, 0.08)',
    }}>
      <div className="luxury-shimmer aspect-square" />
      <div className="p-4 space-y-3">
        <div className="luxury-shimmer h-2.5 w-16 rounded-full" />
        <div className="luxury-shimmer h-4 w-3/4 rounded-full" />
        <div className="luxury-shimmer h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function ProductGrid() {
  const { searchQuery, selectedCategory, setCategory } = useStore();
  const { t } = useTranslation();
  const [sort, setSort] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [occasionFilter, setOccasionFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const priceRange = PRICE_RANGE_OPTIONS.find((o) => o.value === priceRangeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, sort, sourceFilter, platformFilter, occasionFilter, recipientFilter, relationshipFilter, priceRangeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('sort', sort);
      params.set('limit', '50');
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
      if (platformFilter && platformFilter !== 'all') params.set('platform', platformFilter);
      if (occasionFilter && occasionFilter !== 'all') params.set('occasion', occasionFilter);
      if (recipientFilter && recipientFilter !== 'all') params.set('recipient', recipientFilter);
      if (relationshipFilter && relationshipFilter !== 'all') params.set('relationship', relationshipFilter);
      if (priceRange) {
        params.set('priceMin', String(priceRange.min));
        if (priceRange.max !== null) params.set('priceMax', String(priceRange.max));
      }
      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
  });

  const rawProducts = data?.products;
  const products: Product[] = Array.isArray(rawProducts) ? rawProducts : [];

  // Pagination — clamp current page to valid range
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedProducts = products.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  // Compute which platforms have products in current results
  const availablePlatforms = useMemo(() => {
    const prods = data?.products;
    if (!Array.isArray(prods)) return [];
    const platformSet = new Set<string>();
    for (const p of prods as Product[]) {
      if (p.isExternal && p.platform) {
        platformSet.add(p.platform.toLowerCase());
      }
    }
    return PLATFORM_OPTIONS.filter(opt => platformSet.has(opt.value));
  }, [data]);

  const clearFilters = () => {
    setCategory(null);
    useStore.getState().setSearch('');
    setSourceFilter('all');
    setPlatformFilter('all');
    setOccasionFilter('all');
    setRecipientFilter('all');
    setRelationshipFilter('all');
    setPriceRangeFilter('all');
  };

  const hasActiveFilters = selectedCategory || searchQuery || sourceFilter !== 'all' || platformFilter !== 'all' || occasionFilter !== 'all' || recipientFilter !== 'all' || relationshipFilter !== 'all' || priceRangeFilter !== 'all';

  const accentColor = `var(--luxury-accent, #d4a437)`;

  return (
    <section className="relative py-8">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-amber-900/[0.03] to-transparent" />
      </div>

      <div className="relative">
        {/* Elegant Section Header with Ornamental Dividers */}
        <div className="mb-8">
          <OrnamentalDivider />
          <div className="mt-4 mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accentColor, opacity: 0.7 }}>
                {searchQuery ? 'Search Results' : selectedCategory ? 'Curated For You' : 'Our Collection'}
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-amber-100 sm:text-3xl" style={{ letterSpacing: '-0.01em' }}>
                {searchQuery
                  ? t('products.resultsFor', { query: searchQuery })
                  : selectedCategory
                  ? `${selectedCategory.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`
                  : t('products.allProducts')}
              </h2>
              {!isLoading && (
                <p className="mt-1 text-xs text-amber-200/30 font-medium">
                  {data?.total ?? 0} {t('categories.items')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Clear button */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 h-8 text-xs rounded-lg backdrop-blur-sm"
                >
                  <X className="mr-1 h-3 w-3" />
                  {t('common.clear')}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 sm:hidden h-8 rounded-lg backdrop-blur-sm"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </Button>

              {/* Sort — elegant styling */}
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[150px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-8 rounded-lg backdrop-blur-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filter Panel — Slide-out with luxury styling */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden mb-6"
            >
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: 'rgba(28, 25, 23, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(212, 164, 55, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                    Filters
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-amber-200/30 hover:text-amber-200/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Source Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">Source</span>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-[130px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="own">Our Collection</SelectItem>
                        <SelectItem value="external">External Platforms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Occasion Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">Occasion</span>
                    <Select value={occasionFilter} onValueChange={setOccasionFilter}>
                      <SelectTrigger className="w-[130px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                        <SelectItem value="all">All Occasions</SelectItem>
                        {OCCASION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recipient Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">For</span>
                    <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                      <SelectTrigger className="w-[110px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                        <SelectItem value="all">All</SelectItem>
                        {RECIPIENT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">Price</span>
                    <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                      <SelectTrigger className="w-[120px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                        <SelectItem value="all">Any Price</SelectItem>
                        {PRICE_RANGE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Filters Row (when panel closed) */}
        {!showFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {/* Source Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">Source</span>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[120px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="own">Our Collection</SelectItem>
                  <SelectItem value="external">External Platforms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Occasion Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">Occasion</span>
              <Select value={occasionFilter} onValueChange={setOccasionFilter}>
                <SelectTrigger className="w-[120px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                  <SelectItem value="all">All Occasions</SelectItem>
                  {OCCASION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">For</span>
              <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                <SelectTrigger className="w-[100px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                  <SelectItem value="all">All</SelectItem>
                  {RECIPIENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium">Price</span>
              <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                <SelectTrigger className="w-[110px] border-amber-900/25 bg-stone-900/40 text-amber-200/60 text-xs h-7 rounded-lg">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/30 bg-stone-900/95 backdrop-blur-xl">
                  <SelectItem value="all">Any Price</SelectItem>
                  {PRICE_RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Platform Filter Chips — refined look */}
        {availablePlatforms.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-amber-200/40 uppercase tracking-[0.15em] font-medium mr-1">Platform</span>
            <button
              onClick={() => setPlatformFilter('all')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                platformFilter === 'all'
                  ? 'border-amber-500/50 bg-amber-600/15 text-amber-300 shadow-sm'
                  : 'border-amber-900/15 bg-stone-900/30 text-amber-200/40 hover:border-amber-600/25 hover:text-amber-200/60'
              }`}
              style={platformFilter === 'all' ? { boxShadow: `0 0 8px rgba(212, 164, 55, 0.1)` } : {}}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
              All
            </button>
            {availablePlatforms.map((p) => {
              const slug = p.value;
              const isActive = platformFilter === slug;
              return (
                <button
                  key={slug}
                  onClick={() => setPlatformFilter(isActive ? 'all' : slug)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                    isActive
                      ? PLATFORM_CHIP_ACTIVE_BG[slug] || 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                      : 'border-amber-900/15 bg-stone-900/30 text-amber-200/40 hover:border-amber-600/25 hover:text-amber-200/60'
                  }`}
                  style={isActive ? { boxShadow: `0 0 8px rgba(212, 164, 55, 0.1)` } : {}}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${PLATFORM_DOT_COLORS[slug] || 'bg-emerald-500'}`} />
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ShimmerSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty state with elegant design */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: 'rgba(212, 164, 55, 0.08)',
                border: '1px solid rgba(212, 164, 55, 0.15)',
              }}
            >
              <Diamond className="h-8 w-8" style={{ color: accentColor, opacity: 0.5 }} />
            </div>
            <h3 className="text-lg font-semibold text-amber-100">{t('products.noProductsFound')}</h3>
            <p className="mt-2 text-sm text-amber-200/30 max-w-sm">
              {t('products.tryAdjusting')}
            </p>
            <Button
              onClick={clearFilters}
              className="mt-6 text-stone-950 font-semibold rounded-lg luxury-sweep"
              style={{ background: accentColor }}
            >
              {t('products.viewAllProducts')}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {paginatedProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </motion.div>
        )}

        {/* Pagination — luxury style */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-900/20 bg-stone-900/40 text-amber-200/40 transition-all hover:border-amber-600/30 hover:text-amber-200/70 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 ${
                  currentPage === i + 1
                    ? 'text-stone-950 shadow-lg'
                    : 'border border-amber-900/20 bg-stone-900/40 text-amber-200/40 hover:border-amber-600/30 hover:text-amber-200/70'
                }`}
                style={currentPage === i + 1 ? {
                  background: accentColor,
                  boxShadow: `0 2px 12px rgba(212, 164, 55, 0.2)`,
                } : {}}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-900/20 bg-stone-900/40 text-amber-200/40 transition-all hover:border-amber-600/30 hover:text-amber-200/70 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bottom ornamental divider */}
        {products.length > 0 && <div className="mt-8"><OrnamentalDivider /></div>}
      </div>
    </section>
  );
}
