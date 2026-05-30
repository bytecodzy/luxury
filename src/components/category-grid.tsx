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

// ─── Accent color map for active states ───

const categoryAccent: Record<string, string> = {
  couple: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  men: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  women: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
  kids: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
  home: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  office: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  'new-arrivals': 'text-amber-300 border-amber-400/40 bg-amber-400/10',
};

const categoryAccentText: Record<string, string> = {
  couple: 'text-rose-400',
  men: 'text-amber-400',
  women: 'text-pink-400',
  kids: 'text-cyan-400',
  home: 'text-orange-400',
  office: 'text-yellow-400',
  'new-arrivals': 'text-amber-300',
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
      <section className="py-4">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/80 to-stone-900" />
          <div className="relative flex items-center gap-2 overflow-x-auto px-4 py-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-stone-800/60" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4">
      <div className="relative overflow-hidden rounded-2xl border border-amber-900/20">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/category-bg.png')" }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/80 to-stone-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/30" />

        {/* Subtle golden glow at top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        {/* Content */}
        <div className="relative px-4 py-4 sm:px-6 sm:py-5">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-700/40 [&::-webkit-scrollbar-track]:bg-transparent">
            {categories.map((cat, i) => {
              const IconComponent = parentCategoryIcons[cat.slug] || Gem;
              const isExpanded = expandedSlug === cat.slug;
              const hasChildren = cat.children.length > 0;

              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => handleCategoryClick(cat)}
                  className={`
                    group relative inline-flex items-center gap-1.5 whitespace-nowrap
                    rounded-full border px-3.5 py-1.5
                    text-xs font-medium transition-all duration-200
                    backdrop-blur-sm
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                    ${isExpanded
                      ? `border-amber-500/40 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10 ${categoryAccent[cat.slug] || ''}`
                      : 'border-white/10 bg-white/5 text-amber-200/60 hover:border-amber-500/30 hover:bg-white/10 hover:text-amber-200/90'
                    }
                  `}
                >
                  <IconComponent className={`h-3 w-3 ${isExpanded ? (categoryAccentText[cat.slug] || 'text-amber-400') : 'text-amber-400/50 group-hover:text-amber-400/80'}`} strokeWidth={1.5} />
                  {cat.name}
                  {hasChildren && (
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-0.5"
                    >
                      <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                    </motion.span>
                  )}
                  {cat.slug === 'new-arrivals' && (
                    <Sparkles className="h-2.5 w-2.5 text-amber-400/60" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* ─── Subcategory Chips (compact) ─── */}
          <AnimatePresence>
            {expandedCategory && expandedCategory.children.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
                  {/* "All" chip */}
                  <button
                    onClick={() => {
                      setActiveSubcategory(null);
                      setCategory(expandedCategory.slug);
                    }}
                    className={`
                      inline-flex items-center gap-1 rounded-full border px-2.5 py-1
                      text-[11px] font-medium transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                      ${activeSubcategory === null
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                        : 'border-white/10 bg-white/5 text-amber-200/40 hover:border-amber-500/20 hover:text-amber-200/70'
                      }
                    `}
                  >
                    <LayoutGrid className="h-2.5 w-2.5" />
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
                        transition={{ duration: 0.12 }}
                        onClick={() => handleSubcategoryClick(sub, expandedCategory.slug)}
                        className={`
                          inline-flex items-center gap-1 rounded-full border px-2.5 py-1
                          text-[11px] font-medium transition-all duration-200
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                          ${isActive
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                            : 'border-white/10 bg-white/5 text-amber-200/40 hover:border-amber-500/20 hover:text-amber-200/70'
                          }
                        `}
                      >
                        <SubIcon className="h-2.5 w-2.5" />
                        {sub.name}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom golden accent line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>
    </section>
  );
}
