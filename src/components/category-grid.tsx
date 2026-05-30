'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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

// ─── Color maps for categories ───

const categoryGradients: Record<string, string> = {
  couple: 'from-rose-900/40 via-stone-900/60 to-stone-950/80',
  men: 'from-amber-900/40 via-stone-900/60 to-stone-950/80',
  women: 'from-pink-900/40 via-stone-900/60 to-stone-950/80',
  kids: 'from-cyan-900/40 via-stone-900/60 to-stone-950/80',
  home: 'from-orange-900/40 via-stone-900/60 to-stone-950/80',
  office: 'from-yellow-900/40 via-stone-900/60 to-stone-950/80',
  'new-arrivals': 'from-amber-800/50 via-stone-900/60 to-stone-950/80',
};

const categoryBorderColors: Record<string, string> = {
  couple: 'hover:border-rose-500/40 focus-visible:border-rose-500/50',
  men: 'hover:border-amber-500/40 focus-visible:border-amber-500/50',
  women: 'hover:border-pink-500/40 focus-visible:border-pink-500/50',
  kids: 'hover:border-cyan-500/40 focus-visible:border-cyan-500/50',
  home: 'hover:border-orange-500/40 focus-visible:border-orange-500/50',
  office: 'hover:border-yellow-500/40 focus-visible:border-yellow-500/50',
  'new-arrivals': 'hover:border-amber-400/40 focus-visible:border-amber-400/50',
};

const categoryIconColors: Record<string, string> = {
  couple: 'text-rose-400/70 group-hover:text-rose-400',
  men: 'text-amber-400/70 group-hover:text-amber-400',
  women: 'text-pink-400/70 group-hover:text-pink-400',
  kids: 'text-cyan-400/70 group-hover:text-cyan-400',
  home: 'text-orange-400/70 group-hover:text-orange-400',
  office: 'text-yellow-400/70 group-hover:text-yellow-400',
  'new-arrivals': 'text-amber-300/70 group-hover:text-amber-300',
};

const categoryActiveBorders: Record<string, string> = {
  couple: 'border-rose-500/50 shadow-rose-900/20',
  men: 'border-amber-500/50 shadow-amber-900/20',
  women: 'border-pink-500/50 shadow-pink-900/20',
  kids: 'border-cyan-500/50 shadow-cyan-900/20',
  home: 'border-orange-500/50 shadow-orange-900/20',
  office: 'border-yellow-500/50 shadow-yellow-900/20',
  'new-arrivals': 'border-amber-400/50 shadow-amber-800/20',
};

const categoryIconBg: Record<string, string> = {
  couple: 'bg-rose-500/10 group-hover:bg-rose-500/20',
  men: 'bg-amber-500/10 group-hover:bg-amber-500/20',
  women: 'bg-pink-500/10 group-hover:bg-pink-500/20',
  kids: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
  home: 'bg-orange-500/10 group-hover:bg-orange-500/20',
  office: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
  'new-arrivals': 'bg-amber-400/10 group-hover:bg-amber-400/20',
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
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-32 min-w-[120px] rounded-xl bg-stone-900/50 md:min-w-0"
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

      {/* ─── Category Cards (no background images) ─── */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 xl:grid-cols-7 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-700/50 [&::-webkit-scrollbar-track]:bg-transparent">
        {categories.map((cat, i) => {
          const IconComponent = parentCategoryIcons[cat.slug] || Gem;
          const isExpanded = expandedSlug === cat.slug;
          const hasChildren = cat.children.length > 0;

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => handleCategoryClick(cat)}
              className={`
                group relative flex flex-col items-center justify-center
                min-w-[120px] md:min-w-0
                overflow-hidden rounded-xl border p-5
                transition-all duration-300
                bg-gradient-to-br ${categoryGradients[cat.slug] || 'from-stone-900/40 to-stone-950/80'}
                ${isExpanded
                  ? `border-amber-500/50 shadow-lg ${categoryActiveBorders[cat.slug] || 'shadow-amber-900/20'}`
                  : `border-stone-800/50 ${categoryBorderColors[cat.slug] || 'hover:border-amber-600/40'} hover:shadow-lg hover:shadow-amber-900/10`
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
              `}
            >
              {/* Glow effect on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-amber-500/0 to-amber-500/0 opacity-0 transition-opacity duration-300 group-hover:via-amber-500/5 group-hover:to-amber-500/10 group-hover:opacity-100" />

              {/* Icon in accent circle */}
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${categoryIconBg[cat.slug] || 'bg-amber-500/10 group-hover:bg-amber-500/20'} group-hover:scale-110`}>
                <IconComponent className={`h-5 w-5 transition-colors duration-300 ${categoryIconColors[cat.slug] || 'text-amber-400/70 group-hover:text-amber-400'}`} strokeWidth={1.5} />
              </div>

              {/* Category Name */}
              <h3 className="text-sm font-semibold text-amber-100/90 transition-colors group-hover:text-amber-100">
                {cat.name}
              </h3>

              {/* Product Count */}
              <p className="mt-1 text-xs text-amber-200/40">
                {cat.productCount} {t('categories.items')}
              </p>

              {/* Expand indicator */}
              {hasChildren && (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-amber-400/40 transition-colors group-hover:text-amber-400/70"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
              )}

              {/* New Arrivals sparkle accent */}
              {cat.slug === 'new-arrivals' && (
                <div className="absolute right-2 top-2">
                  <Sparkles className="h-3 w-3 text-amber-400/50" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ─── Subcategory Chips ─── */}
      <AnimatePresence>
        {expandedCategory && expandedCategory.children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-amber-900/30 bg-stone-950/60 p-4 backdrop-blur-sm">
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
