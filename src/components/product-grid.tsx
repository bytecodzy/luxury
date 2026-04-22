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
import { useState } from 'react';

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
}

export function ProductGrid() {
  const { searchQuery, selectedCategory, setCategory } = useStore();
  const [sort, setSort] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, sort],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('sort', sort);
      params.set('limit', '50');
      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
  });

  const products: Product[] = data?.products ?? [];

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
          {/* Category Filter */}
          {(selectedCategory || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategory(null);
                useStore.getState().setSearch('');
              }}
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
            onClick={() => {
              setCategory(null);
              useStore.getState().setSearch('');
            }}
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
