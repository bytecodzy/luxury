'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Heart,
  User,
  UserCircle,
  Baby,
  Home,
  Briefcase,
  Sparkles,
  Gem,
  Watch,
  Shirt,
  Flower2,
  ToyBrick,
  Pen,
  Flame,
  Building2,
  LayoutGrid,
  ChevronDown,
  Ribbon,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Types ───

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount: number;
  parentId: string | null;
  order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount: number;
  parentId: string | null;
  order: number;
  children: Subcategory[];
}

// ─── Icon Maps ───

const parentCategoryIcons: Record<string, LucideIcon> = {
  couple: Heart,
  men: User,
  women: UserCircle,
  kids: Baby,
  home: Home,
  office: Briefcase,
  'new-arrivals': Sparkles,
};

const subcategoryIcons: Record<string, LucideIcon> = {
  'couple-friendly': Heart,
  'men-accessories': Gem,
  'men-shirts': Shirt,
  'men-tshirts': Shirt,
  'men-fragrances': Flower2,
  'men-watches': Watch,
  'men-leather': Briefcase,
  'women-jewelry': Gem,
  'women-sarees': Ribbon,
  'women-fashion': Shirt,
  'women-fragrances': Flower2,
  'women-accessories': Gem,
  'kids-toys': ToyBrick,
  'kids-fashion': Shirt,
  'home-decor': Home,
  'home-candles': Flame,
  'home-living': Home,
  'office-corporate-gifts': Building2,
  'office-desk': LayoutGrid,
  'office-stationery': Pen,
};

// Category image paths
const categoryImages: Record<string, string> = {
  couple: '/images/categories/couple.jpg',
  men: '/images/categories/men.jpg',
  women: '/images/categories/women.jpg',
  kids: '/images/categories/kids.jpg',
  home: '/images/categories/home.jpg',
  office: '/images/categories/office.jpg',
  'new-arrivals': '/images/categories/new-arrivals.jpg',
};

// ─── Color maps for categories ───

const categoryAccentColors: Record<string, string> = {
  couple: 'from-rose-500/80 to-rose-900/90',
  men: 'from-amber-500/80 to-amber-900/90',
  women: 'from-pink-500/80 to-pink-900/90',
  kids: 'from-cyan-500/80 to-cyan-900/90',
  home: 'from-orange-500/80 to-orange-900/90',
  office: 'from-yellow-500/80 to-yellow-900/90',
  'new-arrivals': 'from-amber-400/80 to-amber-800/90',
};

const categoryBorderColors: Record<string, string> = {
  couple: 'hover:border-rose-400/50',
  men: 'hover:border-amber-400/50',
  women: 'hover:border-pink-400/50',
  kids: 'hover:border-cyan-400/50',
  home: 'hover:border-orange-400/50',
  office: 'hover:border-yellow-400/50',
  'new-arrivals': 'hover:border-amber-300/50',
};

// ─── Component ───

export function CategoryGrid() {
  const { setCategory } = useStore();
  const { t } = useTranslation();
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  });

  const categories = (data?.categories ?? []).map((cat: Category) => ({
    ...cat,
    children: cat.children ?? [],
  }));

  const expandedCategory = categories.find((c) => c.slug === expandedSlug);

  const handleCategoryClick = (cat: Category) => {
    if (cat.children.length > 0) {
      setExpandedSlug(expandedSlug === cat.slug ? null : cat.slug);
      setActiveSubcategory(null);
    } else {
      setExpandedSlug(null);
      setActiveSubcategory(null);
      setCategory(cat.slug);
    }
  };

  const handleSubcategoryClick = (sub: Subcategory, parentSlug: string) => {
    setActiveSubcategory(sub.slug === activeSubcategory ? null : sub.slug);
    setCategory(sub.slug);
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <section className="py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[3/4] rounded-xl bg-stone-900/50"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-100 sm:text-2xl">
            {t('categories.title')}
          </h2>
          <p className="mt-1 text-xs text-amber-200/40">
            Browse our curated collections
          </p>
        </div>
      </div>

      {/* ─── Category Cards with Images ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {categories.map((cat, i) => {
          const IconComponent = parentCategoryIcons[cat.slug] || Gem;
          const isExpanded = expandedSlug === cat.slug;
          const hasChildren = cat.children.length > 0;
          const imageSrc = categoryImages[cat.slug];

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => handleCategoryClick(cat)}
              className={`
                group relative flex flex-col items-center justify-end
                overflow-hidden rounded-xl border
                transition-all duration-300 aspect-[3/4]
                ${isExpanded
                  ? 'border-amber-400/50 shadow-lg shadow-amber-900/20'
                  : `border-stone-800/40 ${categoryBorderColors[cat.slug] || 'hover:border-amber-600/40'} hover:shadow-lg hover:shadow-amber-900/10`
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
              `}
            >
              {/* Background Image */}
              {imageSrc && (
                <div className="absolute inset-0">
                  <Image
                    src={imageSrc}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 14vw"
                  />
                  {/* Dark overlay gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${categoryAccentColors[cat.slug] || 'from-stone-800/90 to-stone-900/70'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                </div>
              )}

              {/* Fallback gradient if no image */}
              {!imageSrc && (
                <div className={`absolute inset-0 bg-gradient-to-br ${categoryAccentColors[cat.slug] || 'from-stone-800 to-stone-900'}`} />
              )}

              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-500/0 via-amber-500/0 to-amber-500/0 opacity-0 transition-opacity duration-300 group-hover:from-amber-500/5 group-hover:via-amber-500/5 group-hover:to-amber-500/10 group-hover:opacity-100" />

              {/* Content at bottom */}
              <div className="relative z-10 w-full p-3 text-center">
                {/* Icon */}
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20 group-hover:scale-110">
                  <IconComponent className="h-4.5 w-4.5 text-white/90" strokeWidth={1.5} />
                </div>

                {/* Category Name */}
                <h3 className="text-xs font-semibold text-white/95 sm:text-sm transition-colors group-hover:text-white">
                  {cat.name}
                </h3>

                {/* Product Count */}
                <p className="mt-0.5 text-[10px] text-white/50">
                  {cat.productCount} {t('categories.items')}
                </p>

                {/* Expand indicator */}
                {hasChildren && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-1 text-white/40 transition-colors group-hover:text-white/70"
                  >
                    <ChevronDown className="mx-auto h-3 w-3" />
                  </motion.div>
                )}

                {/* New Arrivals sparkle */}
                {cat.slug === 'new-arrivals' && (
                  <div className="absolute right-2 top-2">
                    <Sparkles className="h-3 w-3 text-amber-300/70" />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ─── Subcategory Chips ─── */}
      <AnimatePresence>
        {expandedCategory && expandedCategory.children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-amber-900/30 bg-stone-950/80 p-4 backdrop-blur-sm">
              {/* Subcategory header */}
              <div className="mb-3 flex items-center gap-2">
                {(() => {
                  const ParentIcon = parentCategoryIcons[expandedCategory.slug] || Gem;
                  return <ParentIcon className="h-4 w-4 text-amber-400/70" strokeWidth={1.5} />;
                })()}
                <span className="text-sm font-medium text-amber-200/70">
                  {expandedCategory.name} — Browse
                </span>
              </div>

              {/* Chips row */}
              <div className="flex flex-wrap gap-2">
                {/* "All" chip */}
                <button
                  onClick={() => {
                    setActiveSubcategory(null);
                    setCategory(expandedCategory.slug);
                  }}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
                    text-xs font-medium transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                    ${activeSubcategory === null
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10'
                      : 'border-stone-700/50 bg-stone-900/50 text-amber-200/50 hover:border-amber-600/30 hover:bg-stone-900/80 hover:text-amber-200/80'
                    }
                  `}
                >
                  <LayoutGrid className="h-3 w-3" />
                  All
                </button>

                {/* Individual subcategory chips */}
                {expandedCategory.children.map((sub) => {
                  const SubIcon = subcategoryIcons[sub.slug] || Gem;
                  const isActive = activeSubcategory === sub.slug;

                  return (
                    <motion.button
                      key={sub.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleSubcategoryClick(sub, expandedCategory.slug)}
                      className={`
                        inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
                        text-xs font-medium transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                        ${isActive
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10'
                          : 'border-stone-700/50 bg-stone-900/50 text-amber-200/50 hover:border-amber-600/30 hover:bg-stone-900/80 hover:text-amber-200/80'
                        }
                      `}
                    >
                      <SubIcon className="h-3 w-3" />
                      {sub.name}
                      <span className="ml-0.5 text-[10px] text-amber-300/30">
                        {sub.productCount}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
