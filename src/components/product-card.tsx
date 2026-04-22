'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Star, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
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

export function ProductCard({ product }: { product: Product }) {
  const { selectProduct, addItem } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const mainImage = product.images[0] || '/images/placeholder.jpg';

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

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="card-glow group cursor-pointer overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/60"
      onClick={() => selectProduct(product.id)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-stone-800">
        {!imageError ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <span className="text-3xl text-amber-600/40">💎</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && (
            <span className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-950">
              Featured
            </span>
          )}
          {discount > 0 && (
            <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          )}
        </div>

        {/* Stock badge */}
        {product.stock <= 3 && product.stock > 0 && (
          <span className="absolute right-2 top-2 rounded bg-red-900/80 px-2 py-0.5 text-[10px] font-medium text-red-200">
            Only {product.stock} left
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70">
            <span className="rounded bg-stone-900 px-4 py-2 text-sm font-bold text-amber-200/60">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-amber-500/60">
          {product.category}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-amber-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < Math.floor(product.rating)
                  ? 'fill-amber-500 text-amber-500'
                  : 'text-amber-700/40'
              }`}
            />
          ))}
          <span className="ml-1 text-[10px] text-amber-200/40">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-amber-400">
            ${product.price.toLocaleString()}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-amber-200/30 line-through">
              ${product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`mt-3 w-full transition-all duration-300 ${
            isAdding
              ? 'bg-emerald-600 text-white scale-95'
              : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
          }`}
          size="sm"
        >
          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
          {isAdding ? 'Added!' : product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
        </Button>
      </div>
    </motion.div>
  );
}
