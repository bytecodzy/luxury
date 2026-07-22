'use client';

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
  Ribbon,
  ChevronRight,
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
  'kids-shirts': Shirt,
  'kids-dresses': Ribbon,
  'home-decor': Home,
  'home-candles': Flame,
  'home-living': Home,
  'office-corporate-gifts': Building2,
  'office-desk': LayoutGrid,
  'office-stationery': Pen,
};

// ─── Accent colors for categories ───

const categoryAccentColors: Record<string, { bg: string; border: string; icon: string; hoverBg: string; glow: string }> = {
  couple: {
    bg: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.2)',
    icon: '#fb7185',
    hoverBg: 'rgba(244, 63, 94, 0.15)',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
  men: {
    bg: 'rgba(212, 164, 55, 0.08)',
    border: 'rgba(212, 164, 55, 0.2)',
    icon: '#d4a437',
    hoverBg: 'rgba(212, 164, 55, 0.15)',
    glow: 'rgba(212, 164, 55, 0.15)',
  },
  women: {
    bg: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.2)',
    icon: '#f472b6',
    hoverBg: 'rgba(236, 72, 153, 0.15)',
    glow: 'rgba(236, 72, 153, 0.15)',
  },
  kids: {
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.2)',
    icon: '#22d3ee',
    hoverBg: 'rgba(6, 182, 212, 0.15)',
    glow: 'rgba(6, 182, 212, 0.15)',
  },
  home: {
    bg: 'rgba(249, 115, 22, 0.08)',
    border: 'rgba(249, 115, 22, 0.2)',
    icon: '#fb923c',
    hoverBg: 'rgba(249, 115, 22, 0.15)',
    glow: 'rgba(249, 115, 22, 0.15)',
  },
  office: {
    bg: 'rgba(234, 179, 8, 0.08)',
    border: 'rgba(234, 179, 8, 0.2)',
    icon: '#facc15',
    hoverBg: 'rgba(234, 179, 8, 0.15)',
    glow: 'rgba(234, 179, 8, 0.15)',
  },
  'new-arrivals': {
    bg: 'rgba(212, 164, 55, 0.1)',
    border: 'rgba(212, 164, 55, 0.25)',
    icon: '#f5e6a3',
    hoverBg: 'rgba(212, 164, 55, 0.2)',
    glow: 'rgba(212, 164, 55, 0.2)',
  },
};

const defaultAccent = {
  bg: 'rgba(212, 164, 55, 0.08)',
  border: 'rgba(212, 164, 55, 0.2)',
  icon: '#d4a437',
  hoverBg: 'rgba(212, 164, 55, 0.15)',
  glow: 'rgba(212, 164, 55, 0.15)',
};

// ─── Component ───

export function CategoryGrid() {
  const { selectedCategory, setCategory } = useStore();
  const { t } = useTranslation();

  const { data } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  });

  const rawCategories = data?.categories;
  const categories = (Array.isArray(rawCategories) ? rawCategories : []).map((cat: Category) => ({
    ...cat,
    children: Array.isArray(cat.children) ? cat.children : [],
  }));

  // Find the parent category that matches the selected category
  const activeParent = selectedCategory
    ? categories.find(
        (cat) =>
          cat.slug === selectedCategory ||
          cat.children.some((sub) => sub.slug === selectedCategory)
      )
    : null;

  const subcategories = activeParent?.children ?? [];

  // Don't render if no category selected or no subcategories
  if (!selectedCategory || !activeParent || subcategories.length === 0) {
    return null;
  }

  const ParentIcon = parentCategoryIcons[activeParent.slug] || Gem;
  const accent = categoryAccentColors[activeParent.slug] || defaultAccent;

  return (
    <section className="py-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeParent.slug}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(28, 25, 23, 0.5)',
            backdropFilter: 'blur(16px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
            border: '1px solid rgba(212, 164, 55, 0.08)',
          }}
        >
          {/* Header row with parent category card */}
          <div className="p-5">
            <div className="flex items-center gap-4">
              {/* Category Icon Circle */}
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.2 }}
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl shrink-0"
                style={{
                  background: accent.bg,
                  border: `1.5px solid ${accent.border}`,
                }}
              >
                <ParentIcon className="h-6 w-6" style={{ color: accent.icon }} strokeWidth={1.5} />
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ boxShadow: `0 0 20px ${accent.glow}, 0 0 40px ${accent.glow}` }}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-amber-100 truncate">
                  {activeParent.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-amber-200/30 uppercase tracking-[0.2em] font-medium">
                    Browse subcategories
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                    style={{ background: accent.bg, color: accent.icon, border: `1px solid ${accent.border}` }}
                  >
                    {activeParent.productCount} items
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCategory(null)}
                className="text-[10px] text-amber-200/25 hover:text-amber-200/50 transition-colors uppercase tracking-[0.15em] font-medium shrink-0"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Subcategory cards — horizontal scroll on mobile, wrap on desktop */}
          <div className="px-5 pb-5">
            {/* Subcategory cards grid */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 md:flex-wrap scrollbar-thin">
              {/* "All" card */}
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setCategory(activeParent.slug)}
                className="group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all duration-300 shrink-0"
                style={{
                  background: selectedCategory === activeParent.slug ? accent.hoverBg : 'rgba(28, 25, 23, 0.3)',
                  border: `1.5px solid ${selectedCategory === activeParent.slug ? accent.border : 'rgba(212, 164, 55, 0.06)'}`,
                  color: selectedCategory === activeParent.slug ? accent.icon : 'rgba(212, 164, 55, 0.4)',
                  boxShadow: selectedCategory === activeParent.slug ? `0 0 12px ${accent.glow}` : 'none',
                }}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                All {activeParent.name}
              </motion.button>

              {/* Individual subcategory cards */}
              {subcategories.map((sub, i) => {
                const SubIcon = subcategoryIcons[sub.slug] || Gem;
                const isActive = selectedCategory === sub.slug;

                return (
                  <motion.button
                    key={sub.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => setCategory(sub.slug)}
                    className="group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all duration-300 shrink-0"
                    style={{
                      background: isActive ? accent.hoverBg : 'rgba(28, 25, 23, 0.3)',
                      border: `1.5px solid ${isActive ? accent.border : 'rgba(212, 164, 55, 0.06)'}`,
                      color: isActive ? accent.icon : 'rgba(212, 164, 55, 0.4)',
                      boxShadow: isActive ? `0 0 12px ${accent.glow}` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = accent.bg;
                        e.currentTarget.style.borderColor = accent.border;
                        e.currentTarget.style.color = accent.icon;
                        e.currentTarget.style.boxShadow = `0 0 12px ${accent.glow}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(28, 25, 23, 0.3)';
                        e.currentTarget.style.borderColor = 'rgba(212, 164, 55, 0.06)';
                        e.currentTarget.style.color = 'rgba(212, 164, 55, 0.4)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <SubIcon className="h-3.5 w-3.5" />
                    {sub.name}
                    {sub.productCount > 0 && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                        style={{
                          background: isActive ? `${accent.icon}20` : 'rgba(212, 164, 55, 0.06)',
                          color: isActive ? accent.icon : 'rgba(212, 164, 55, 0.3)',
                        }}
                      >
                        {sub.productCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
