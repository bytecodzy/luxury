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
import { Skeleton } from '@/components/ui/skeleton';
import { X, SlidersHorizontal } from 'lucide-react';
import { useState, useMemo } from 'react';

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

export function ProductGrid() {
  const { searchQuery, selectedCategory, setCategory } = useStore();
  const [sort, setSort] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, sort, sourceFilter, platformFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('sort', sort);
      params.set('limit', '50');
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
      if (platformFilter && platformFilter !== 'all') params.set('platform', platformFilter);
      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
  });

  const products: Product[] = data?.products ?? [];

  // Compute which platforms have products in current results (unfiltered by platform)
  const availablePlatforms = useMemo(() => {
    const prods = data?.products;
    if (!prods) return [];
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
  };

  const hasActiveFilters = selectedCategory || searchQuery || sourceFilter !== 'all' || platformFilter !== 'all';

  return (
    <section className="py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-100 sm:text-2xl">
            {searchQuery
              ? `Results for "${searchQuery}"`
              : selectedCategory
              ? `${selectedCategory.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`
              : 'All Products'}
          </h2>
          {!isLoading && (
            <p className="mt-1 text-sm text-amber-200/40">
              {data?.total ?? 0} items
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Clear button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          {/* Sort */}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="border-amber-900/30 bg-stone-900">
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-200/40">Source:</span>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-xs h-8">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="border-amber-900/30 bg-stone-900">
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="own">Our Collection</SelectItem>
              <SelectItem value="external">External Platforms</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Platform Filter Chips */}
      {availablePlatforms.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-amber-200/40 mr-1">Platform:</span>
          {/* "All" chip */}
          <button
            onClick={() => setPlatformFilter('all')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              platformFilter === 'all'
                ? 'border-amber-500/50 bg-amber-600/20 text-amber-300'
                : 'border-amber-900/20 bg-stone-900/40 text-amber-200/50 hover:border-amber-600/30 hover:text-amber-200/70'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            All
          </button>
          {/* Platform chips */}
          {availablePlatforms.map((p) => {
            const slug = p.value;
            const isActive = platformFilter === slug;
            return (
              <button
                key={slug}
                onClick={() => setPlatformFilter(isActive ? 'all' : slug)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? PLATFORM_CHIP_ACTIVE_BG[slug] || 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                    : 'border-amber-900/20 bg-stone-900/40 text-amber-200/50 hover:border-amber-600/30 hover:text-amber-200/70'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT_COLORS[slug] || 'bg-emerald-500'}`} />
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/60">
              <Skeleton className="aspect-square bg-stone-800" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-3 w-16 bg-stone-800" />
                <Skeleton className="h-4 w-3/4 bg-stone-800" />
                <Skeleton className="h-5 w-20 bg-stone-800" />
                <Skeleton className="h-8 w-full bg-stone-800" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl">🔍</span>
          <h3 className="mt-4 text-lg font-semibold text-amber-100">No products found</h3>
          <p className="mt-2 text-sm text-amber-200/40">
            Try adjusting your search or filter criteria
          </p>
          <Button
            onClick={clearFilters}
            variant="outline"
            className="mt-4 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
          >
            View All Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
