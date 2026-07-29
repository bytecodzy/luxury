'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X, SlidersHorizontal, ChevronDown, ChevronRight, Diamond,
  Filter, RotateCcw, Heart, User, UserCircle, Home, Briefcase,
  Sparkles, Gift, Baby, ShoppingCart, Eye, ArrowLeft,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { getProxiedImageUrl } from '@/lib/image-utils';
import { QuickViewDialog } from '@/components/quick-view-dialog';

// ─── Types ───────────────────────────────────────────────────────────

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

// ─── Category Icon Map ───────────────────────────────────────────────

const categoryIcons: Record<string, LucideIcon> = {
  couple: Heart,
  men: User,
  women: UserCircle,
  kids: Baby,
  home: Home,
  office: Briefcase,
  'new-arrivals': Sparkles,
  combos: Gift,
};

// ─── Category Accent Colors ─────────────────────────────────────────

const categoryAccentColors: Record<string, { bg: string; border: string; icon: string; glow: string }> = {
  couple: { bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.2)', icon: '#fb7185', glow: 'rgba(244, 63, 94, 0.15)' },
  men: { bg: 'rgba(212, 164, 55, 0.08)', border: 'rgba(212, 164, 55, 0.2)', icon: '#d4a437', glow: 'rgba(212, 164, 55, 0.15)' },
  women: { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.2)', icon: '#f472b6', glow: 'rgba(236, 72, 153, 0.15)' },
  kids: { bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.2)', icon: '#22d3ee', glow: 'rgba(6, 182, 212, 0.15)' },
  home: { bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.2)', icon: '#fb923c', glow: 'rgba(249, 115, 22, 0.15)' },
  office: { bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.2)', icon: '#facc15', glow: 'rgba(234, 179, 8, 0.15)' },
  'new-arrivals': { bg: 'rgba(212, 164, 55, 0.1)', border: 'rgba(212, 164, 55, 0.25)', icon: '#f5e6a3', glow: 'rgba(212, 164, 55, 0.2)' },
  combos: { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.2)', icon: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)' },
};

const defaultAccent = { bg: 'rgba(212, 164, 55, 0.08)', border: 'rgba(212, 164, 55, 0.2)', icon: '#d4a437', glow: 'rgba(212, 164, 55, 0.15)' };

// ─── Filter Options ──────────────────────────────────────────────────

const PRODUCT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Products' },
  { value: 'own', label: 'Our Collection' },
  { value: 'external', label: 'External Platforms' },
];

const PRICE_RANGE_OPTIONS = [
  { value: 'all', label: 'Any Price' },
  { value: 'under-1000', label: 'Under ₹1,000', min: 0, max: 1000 },
  { value: '1000-2500', label: '₹1,000 - ₹2,500', min: 1000, max: 2500 },
  { value: '2500-5000', label: '₹2,500 - ₹5,000', min: 2500, max: 5000 },
  { value: '5000-10000', label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
  { value: '10000-25000', label: '₹10,000 - ₹25,000', min: 10000, max: 25000 },
  { value: '25000+', label: '₹25,000+', min: 25000, max: null },
];

const COLOR_OPTIONS = [
  { value: 'gold', label: 'Gold', color: '#d4a437' },
  { value: 'rose-gold', label: 'Rose Gold', color: '#b76e79' },
  { value: 'silver', label: 'Silver', color: '#c0c0c0' },
  { value: 'black', label: 'Black', color: '#1c1917' },
  { value: 'white', label: 'White', color: '#f5f5f4' },
  { value: 'red', label: 'Red', color: '#dc2626' },
  { value: 'blue', label: 'Blue', color: '#2563eb' },
  { value: 'green', label: 'Green', color: '#16a34a' },
  { value: 'purple', label: 'Purple', color: '#7c3aed' },
  { value: 'pink', label: 'Pink', color: '#ec4899' },
];

const DISCOUNT_OPTIONS = [
  { value: 'all', label: 'Any Discount' },
  { value: '10+', label: '10% or more' },
  { value: '20+', label: '20% or more' },
  { value: '30+', label: '30% or more' },
  { value: '50+', label: '50% or more' },
];

// ─── Sub-Category Sidebar Data ───────────────────────────────────────

interface SubCategory {
  name: string;
  slug: string;
}

const CATEGORY_SUBCATEGORIES: Record<string, SubCategory[]> = {
  couple: [{ name: 'Couple Friendly', slug: 'couple-friendly' }],
  men: [
    { name: 'Accessories', slug: 'men-accessories' },
    { name: 'Shirts', slug: 'men-shirts' },
    { name: 'T-Shirts & Polos', slug: 'men-tshirts' },
    { name: 'Fragrances', slug: 'men-fragrances' },
    { name: 'Watches', slug: 'men-watches' },
    { name: 'Leather Goods', slug: 'men-leather' },
  ],
  women: [
    { name: 'Jewelry', slug: 'women-jewelry' },
    { name: 'Sarees', slug: 'women-sarees' },
    { name: 'Fashion', slug: 'women-fashion' },
    { name: 'Fragrances', slug: 'women-fragrances' },
    { name: 'Accessories', slug: 'women-accessories' },
  ],
  home: [
    { name: 'Home Décor', slug: 'home-decor' },
    { name: 'Candles & Fragrances', slug: 'home-candles' },
    { name: 'Living', slug: 'home-living' },
  ],
  office: [
    { name: 'Corporate Gifts', slug: 'office-corporate-gifts' },
    { name: 'Desk Accessories', slug: 'office-desk' },
    { name: 'Stationery', slug: 'office-stationery' },
  ],
  'new-arrivals': [],
  combos: [
    { name: 'Combo Boxes', slug: 'combos-boxes' },
    { name: 'Custom Boxes', slug: 'custom-boxes' },
  ],
};

// ─── Filter Sidebar Component ────────────────────────────────────────

function FilterSidebar({
  isDark,
  accent,
  selectedCategory,
  subCategoryFilter,
  setSubCategoryFilter,
  productTypeFilter,
  setProductTypeFilter,
  priceRangeFilter,
  setPriceRangeFilter,
  colorFilter,
  setColorFilter,
  discountFilter,
  setDiscountFilter,
  sort,
  setSort,
  clearFilters,
  hasActiveFilters,
  productCount,
}: {
  isDark: boolean;
  accent: typeof defaultAccent;
  selectedCategory: string | null;
  subCategoryFilter: string;
  setSubCategoryFilter: (v: string) => void;
  productTypeFilter: string;
  setProductTypeFilter: (v: string) => void;
  priceRangeFilter: string;
  setPriceRangeFilter: (v: string) => void;
  colorFilter: string;
  setColorFilter: (v: string) => void;
  discountFilter: string;
  setDiscountFilter: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  productCount: number;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    products: true,
    price: true,
    color: true,
    discounts: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const subcategories = selectedCategory ? CATEGORY_SUBCATEGORIES[selectedCategory] || [] : [];

  const sectionHeaderStyle = {
    color: isDark ? 'rgba(245, 230, 163, 0.7)' : 'rgba(28, 25, 23, 0.7)',
  };

  const selectTriggerStyle = {
    background: isDark ? 'rgba(28, 25, 23, 0.4)' : 'rgba(255, 255, 255, 0.9)',
    borderColor: isDark ? 'rgba(219, 175, 54, 0.12)' : 'rgba(212, 164, 55, 0.2)',
    color: isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.6)',
  };

  const selectContentStyle = {
    background: isDark ? 'rgba(28, 25, 23, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    borderColor: isDark ? 'rgba(219, 175, 54, 0.15)' : 'rgba(212, 164, 55, 0.2)',
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: isDark ? 'rgba(28, 25, 23, 0.5)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
        border: isDark ? '1px solid rgba(219, 175, 54, 0.08)' : '1px solid rgba(212, 164, 55, 0.15)',
      }}
    >
      {/* Header — fixed at top of sidebar */}
      <div className="p-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: isDark ? '1px solid rgba(219, 175, 54, 0.08)' : '1px solid rgba(212, 164, 55, 0.12)' }}>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: accent.icon }} />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent.icon }}>
            Filters
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className="text-[10px] font-bold px-2 py-0.5"
            style={{
              background: accent.bg,
              color: accent.icon,
              border: `1px solid ${accent.border}`,
            }}
          >
            {productCount} items
          </Badge>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium transition-colors"
              style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.4)' }}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Scrollable filter body — scrolls independently */}
      <div className="overflow-y-auto flex-1 overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: isDark ? 'rgba(219, 175, 54, 0.15) transparent' : 'rgba(212, 164, 55, 0.2) transparent' }}>
        <div className="p-4 space-y-1">
          {/* ── Categories Section ── */}
          {subcategories.length > 0 && (
            <div className="pb-3" style={{ borderBottom: isDark ? '1px solid rgba(219, 175, 54, 0.06)' : '1px solid rgba(212, 164, 55, 0.1)' }}>
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between py-2 group"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={sectionHeaderStyle}>
                  Categories
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedSections.categories ? 'rotate-180' : ''}`}
                  style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.3)' }}
                />
              </button>
              <AnimatePresence>
                {expandedSections.categories && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pt-1">
                      {/* All option */}
                      <button
                        onClick={() => setSubCategoryFilter('all')}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
                        style={{
                          background: subCategoryFilter === 'all' ? accent.hoverBg || accent.bg : 'transparent',
                          color: subCategoryFilter === 'all' ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                          border: subCategoryFilter === 'all' ? `1px solid ${accent.border}` : '1px solid transparent',
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        All {selectedCategory?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </button>
                      {subcategories.map((sub) => (
                        <button
                          key={sub.slug}
                          onClick={() => setSubCategoryFilter(sub.slug)}
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
                          style={{
                            background: subCategoryFilter === sub.slug ? accent.hoverBg || accent.bg : 'transparent',
                            color: subCategoryFilter === sub.slug ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                            border: subCategoryFilter === sub.slug ? `1px solid ${accent.border}` : '1px solid transparent',
                          }}
                        >
                          <ChevronRight className="h-3 w-3" />
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Products Section ── */}
          <div className="py-3" style={{ borderBottom: isDark ? '1px solid rgba(219, 175, 54, 0.06)' : '1px solid rgba(212, 164, 55, 0.1)' }}>
            <button
              onClick={() => toggleSection('products')}
              className="w-full flex items-center justify-between py-1 group"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={sectionHeaderStyle}>
                Products
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedSections.products ? 'rotate-180' : ''}`}
                style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.3)' }}
              />
            </button>
            <AnimatePresence>
              {expandedSections.products && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2">
                    {PRODUCT_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setProductTypeFilter(opt.value)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
                        style={{
                          background: productTypeFilter === opt.value ? accent.hoverBg || accent.bg : 'transparent',
                          color: productTypeFilter === opt.value ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                          border: productTypeFilter === opt.value ? `1px solid ${accent.border}` : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Price Range Section ── */}
          <div className="py-3" style={{ borderBottom: isDark ? '1px solid rgba(219, 175, 54, 0.06)' : '1px solid rgba(212, 164, 55, 0.1)' }}>
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between py-1 group"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={sectionHeaderStyle}>
                Price Range
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedSections.price ? 'rotate-180' : ''}`}
                style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.3)' }}
              />
            </button>
            <AnimatePresence>
              {expandedSections.price && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2">
                    {PRICE_RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPriceRangeFilter(opt.value)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
                        style={{
                          background: priceRangeFilter === opt.value ? accent.hoverBg || accent.bg : 'transparent',
                          color: priceRangeFilter === opt.value ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                          border: priceRangeFilter === opt.value ? `1px solid ${accent.border}` : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Color Section ── */}
          <div className="py-3" style={{ borderBottom: isDark ? '1px solid rgba(219, 175, 54, 0.06)' : '1px solid rgba(212, 164, 55, 0.1)' }}>
            <button
              onClick={() => toggleSection('color')}
              className="w-full flex items-center justify-between py-1 group"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={sectionHeaderStyle}>
                Color
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedSections.color ? 'rotate-180' : ''}`}
                style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.3)' }}
              />
            </button>
            <AnimatePresence>
              {expandedSections.color && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => setColorFilter('all')}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium transition-all duration-200"
                      style={{
                        background: colorFilter === 'all' ? accent.hoverBg || accent.bg : 'transparent',
                        color: colorFilter === 'all' ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                        border: colorFilter === 'all' ? `1px solid ${accent.border}` : `1px solid ${isDark ? 'rgba(219, 175, 54, 0.1)' : 'rgba(212, 164, 55, 0.15)'}`,
                      }}
                    >
                      All
                    </button>
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setColorFilter(colorFilter === opt.value ? 'all' : opt.value)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium transition-all duration-200"
                        style={{
                          background: colorFilter === opt.value ? accent.hoverBg || accent.bg : 'transparent',
                          color: colorFilter === opt.value ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                          border: colorFilter === opt.value ? `1px solid ${accent.border}` : `1px solid ${isDark ? 'rgba(219, 175, 54, 0.1)' : 'rgba(212, 164, 55, 0.15)'}`,
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: opt.color,
                            boxShadow: colorFilter === opt.value ? `0 0 6px ${opt.color}` : 'none',
                          }}
                        />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Discounts Section ── */}
          <div className="py-3">
            <button
              onClick={() => toggleSection('discounts')}
              className="w-full flex items-center justify-between py-1 group"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={sectionHeaderStyle}>
                Discounts
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedSections.discounts ? 'rotate-180' : ''}`}
                style={{ color: isDark ? 'rgba(245, 230, 163, 0.3)' : 'rgba(28, 25, 23, 0.3)' }}
              />
            </button>
            <AnimatePresence>
              {expandedSections.discounts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2">
                    {DISCOUNT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDiscountFilter(opt.value)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
                        style={{
                          background: discountFilter === opt.value ? accent.hoverBg || accent.bg : 'transparent',
                          color: discountFilter === opt.value ? accent.icon : isDark ? 'rgba(245, 230, 163, 0.5)' : 'rgba(28, 25, 23, 0.5)',
                          border: discountFilter === opt.value ? `1px solid ${accent.border}` : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Sort ── */}
          <div className="pt-3" style={{ borderTop: isDark ? '1px solid rgba(219, 175, 54, 0.06)' : '1px solid rgba(212, 164, 55, 0.1)' }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] block mb-2" style={sectionHeaderStyle}>
              Sort By
            </span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full text-xs h-8 rounded-lg" style={selectTriggerStyle}>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl" style={selectContentStyle}>
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
    </div>
  );
}

// ─── Main CategoryShopPage Component ─────────────────────────────────

export function CategoryShopPage() {
  const { selectedCategory, setCategory, setView, appTheme, selectProduct, addItem } = useStore();
  const { format } = useCurrency();
  const isDark = appTheme === 'dark';
  const isLight = appTheme === 'light';
  const accent = categoryAccentColors[selectedCategory || ''] || defaultAccent;

  // Filter state
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [discountFilter, setDiscountFilter] = useState('all');
  const [sort, setSort] = useState('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const itemsPerPage = 12;

  // Determine the effective category for the API call
  const effectiveCategory = subCategoryFilter !== 'all' ? subCategoryFilter : selectedCategory;

  // Price range for API
  const priceRange = PRICE_RANGE_OPTIONS.find((o) => o.value === priceRangeFilter);

  // Discount percentage for API
  const discountMin = discountFilter !== 'all' ? parseInt(discountFilter) : null;

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (effectiveCategory) params.set('category', effectiveCategory);
    params.set('sort', sort);
    params.set('limit', '50');
    if (productTypeFilter === 'own') params.set('source', 'own');
    if (productTypeFilter === 'external') params.set('source', 'external');
    if (priceRange) {
      params.set('priceMin', String(priceRange.min));
      if (priceRange.max !== null) params.set('priceMax', String(priceRange.max));
    }
    if (colorFilter !== 'all') params.set('color', colorFilter);
    if (discountMin) params.set('discountMin', String(discountMin));
    return params.toString();
  }, [effectiveCategory, sort, productTypeFilter, priceRangeFilter, colorFilter, discountFilter]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [queryParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['category-shop', queryParams],
    queryFn: () => fetch(`/api/products?${queryParams}`).then((r) => r.json()),
    enabled: !!selectedCategory,
  });

  const rawProducts = data?.products;
  const products: Product[] = Array.isArray(rawProducts) ? rawProducts : [];

  // Client-side color filter (since API may not support color natively)
  const filteredProducts = useMemo(() => {
    let result = products;
    if (colorFilter !== 'all') {
      result = result.filter((p) =>
        p.tags?.some((tag) => tag.toLowerCase().includes(colorFilter)) ||
        p.name?.toLowerCase().includes(colorFilter) ||
        p.description?.toLowerCase().includes(colorFilter)
      );
    }
    if (discountMin) {
      result = result.filter((p) => {
        if (!p.compareAtPrice || p.compareAtPrice <= p.price) return false;
        const discount = Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
        return discount >= discountMin;
      });
    }
    return result;
  }, [products, colorFilter, discountMin]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const clearFilters = () => {
    setSubCategoryFilter('all');
    setProductTypeFilter('all');
    setPriceRangeFilter('all');
    setColorFilter('all');
    setDiscountFilter('all');
    setSort('featured');
  };

  const hasActiveFilters = subCategoryFilter !== 'all' || productTypeFilter !== 'all' ||
    priceRangeFilter !== 'all' || colorFilter !== 'all' || discountFilter !== 'all';

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

  // Theme-aware card styling (matching home page FeaturedProductsSection)
  const cardBg = isLight ? 'bg-white/80' : 'bg-stone-900/50';
  const cardBorder = isLight ? 'border-stone-200/60' : 'border-amber-500/8';
  const cardHoverBorder = isLight ? 'hover:border-amber-400/40' : 'hover:border-amber-500/20';
  const textPrimary = isLight ? 'text-stone-800' : 'text-amber-50';
  const textSecondary = isLight ? 'text-stone-500' : 'text-amber-100/60';

  const CategoryIcon = categoryIcons[selectedCategory || ''] || Diamond;

  const categoryTitle = selectedCategory
    ? selectedCategory.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'All Products';

  // Active filter badges for mobile
  const activeFilterCount = [subCategoryFilter, productTypeFilter, priceRangeFilter, colorFilter, discountFilter]
    .filter((v) => v !== 'all').length;

  return (
    <div className="py-6 sm:py-8">
      {/* ── Category Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 sm:mb-8"
      >
        <div
          className="rounded-2xl p-5 sm:p-6 flex items-center gap-4"
          style={{
            background: isDark ? 'rgba(28, 25, 23, 0.5)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: isDark ? 'blur(16px) saturate(1.2)' : 'none',
            border: isDark ? '1px solid rgba(219, 175, 54, 0.08)' : '1px solid rgba(212, 164, 55, 0.15)',
          }}
        >
          <div
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl shrink-0"
            style={{ background: accent.bg, border: `1.5px solid ${accent.border}` }}
          >
            <CategoryIcon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: accent.icon }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-amber-100' : 'text-stone-900'}`}
              style={{ fontFamily: "'Lora', serif" }}
            >
              {categoryTitle}
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-amber-200/40' : 'text-stone-500'}`}>
              {filteredProducts.length} products found
            </p>
          </div>
          <button
            onClick={() => { setCategory(null); setView('home'); }}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-full font-medium transition-all duration-300 shrink-0"
            style={{
              background: isDark ? 'rgba(219, 175, 54, 0.12)' : 'rgba(212, 164, 55, 0.1)',
              border: `1.5px solid ${isDark ? 'rgba(219, 175, 54, 0.25)' : 'rgba(212, 164, 55, 0.3)'}`,
              color: isDark ? 'rgba(245, 230, 163, 0.8)' : 'rgba(120, 90, 20, 0.8)',
              boxShadow: isDark ? '0 0 12px rgba(219, 175, 54, 0.08)' : '0 0 8px rgba(212, 164, 55, 0.06)',
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </button>
        </div>
      </motion.div>

      {/* ── Main Layout: Sidebar + Products ── */}
      <div className="flex gap-6">
        {/* ── Desktop Sidebar (hidden on mobile) ── */}
        <div className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-120px)] flex flex-col">
            <FilterSidebar
              isDark={isDark}
              accent={accent}
              selectedCategory={selectedCategory}
              subCategoryFilter={subCategoryFilter}
              setSubCategoryFilter={setSubCategoryFilter}
              productTypeFilter={productTypeFilter}
              setProductTypeFilter={setProductTypeFilter}
              priceRangeFilter={priceRangeFilter}
              setPriceRangeFilter={setPriceRangeFilter}
              colorFilter={colorFilter}
              setColorFilter={setColorFilter}
              discountFilter={discountFilter}
              setDiscountFilter={setDiscountFilter}
              sort={sort}
              setSort={setSort}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              productCount={filteredProducts.length}
            />
          </div>
        </div>

        {/* ── Product Grid Area ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile filter bar */}
          <div className="lg:hidden mb-4 flex items-center gap-2">
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 h-9 rounded-lg text-xs"
                  style={{
                    borderColor: isDark ? 'rgba(219, 175, 54, 0.2)' : 'rgba(212, 164, 55, 0.25)',
                    color: isDark ? 'rgba(245, 230, 163, 0.6)' : 'rgba(28, 25, 23, 0.6)',
                    background: isDark ? 'transparent' : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span
                      className="ml-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: accent.bg, color: accent.icon, border: `1px solid ${accent.border}` }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className={`w-[300px] ${isDark ? 'bg-stone-950 border-amber-900/20' : 'bg-[#fdf9f1] border-amber-200/40'}`}
              >
                <SheetTitle className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-amber-100' : 'text-stone-800'}`}>
                  Filters
                </SheetTitle>
                <div className="mt-4">
                  <FilterSidebar
                    isDark={isDark}
                    accent={accent}
                    selectedCategory={selectedCategory}
                    subCategoryFilter={subCategoryFilter}
                    setSubCategoryFilter={setSubCategoryFilter}
                    productTypeFilter={productTypeFilter}
                    setProductTypeFilter={setProductTypeFilter}
                    priceRangeFilter={priceRangeFilter}
                    setPriceRangeFilter={setPriceRangeFilter}
                    colorFilter={colorFilter}
                    setColorFilter={setColorFilter}
                    discountFilter={discountFilter}
                    setDiscountFilter={setDiscountFilter}
                    sort={sort}
                    setSort={setSort}
                    clearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                    productCount={filteredProducts.length}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Active filter chips on mobile */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {subCategoryFilter !== 'all' && (
                  <Badge
                    className="shrink-0 text-[10px] px-2 py-0.5 cursor-pointer"
                    style={{ background: accent.bg, color: accent.icon, border: `1px solid ${accent.border}` }}
                    onClick={() => setSubCategoryFilter('all')}
                  >
                    {subCategoryFilter.replace(/-/g, ' ')} <X className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                )}
                {priceRangeFilter !== 'all' && (
                  <Badge
                    className="shrink-0 text-[10px] px-2 py-0.5 cursor-pointer"
                    style={{ background: accent.bg, color: accent.icon, border: `1px solid ${accent.border}` }}
                    onClick={() => setPriceRangeFilter('all')}
                  >
                    {PRICE_RANGE_OPTIONS.find(o => o.value === priceRangeFilter)?.label} <X className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                )}
                {colorFilter !== 'all' && (
                  <Badge
                    className="shrink-0 text-[10px] px-2 py-0.5 cursor-pointer"
                    style={{ background: accent.bg, color: accent.icon, border: `1px solid ${accent.border}` }}
                    onClick={() => setColorFilter('all')}
                  >
                    {colorFilter} <X className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                )}
                {discountFilter !== 'all' && (
                  <Badge
                    className="shrink-0 text-[10px] px-2 py-0.5 cursor-pointer"
                    style={{ background: accent.bg, color: accent.icon, border: `1px solid ${accent.border}` }}
                    onClick={() => setDiscountFilter('all')}
                  >
                    {discountFilter}%+ off <X className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Loading skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl animate-pulse"
                  style={{
                    background: isDark ? 'rgba(28, 25, 23, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                    border: isDark ? '1px solid rgba(219, 175, 54, 0.08)' : '1px solid rgba(212, 164, 55, 0.15)',
                  }}
                >
                  <div className="aspect-[4/5]" style={{ background: isDark ? 'rgba(41, 37, 36, 0.4)' : 'rgba(245, 245, 244, 0.6)' }} />
                  <div className="p-4 space-y-3">
                    <div className="h-2.5 w-16 rounded-full" style={{ background: isDark ? 'rgba(41, 37, 36, 0.5)' : 'rgba(245, 245, 244, 0.6)' }} />
                    <div className="h-4 w-3/4 rounded-full" style={{ background: isDark ? 'rgba(41, 37, 36, 0.5)' : 'rgba(245, 245, 244, 0.6)' }} />
                    <div className="h-5 w-20 rounded-full" style={{ background: isDark ? 'rgba(41, 37, 36, 0.5)' : 'rgba(245, 245, 244, 0.6)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: isDark ? 'rgba(219, 175, 54, 0.08)' : 'rgba(212, 164, 55, 0.1)',
                  border: isDark ? '1px solid rgba(219, 175, 54, 0.15)' : '1px solid rgba(212, 164, 55, 0.2)',
                }}
              >
                <Diamond className="h-8 w-8" style={{ color: accent.icon, opacity: 0.5 }} />
              </div>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-amber-100' : 'text-stone-900'}`}>
                No products found
              </h3>
              <p className={`mt-2 text-sm max-w-sm ${isDark ? 'text-amber-200/30' : 'text-stone-400'}`}>
                Try adjusting your filters to discover more products.
              </p>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  className="mt-6 font-semibold rounded-lg"
                  style={{ background: accent.icon, color: '#1c1917' }}
                >
                  Clear All Filters
                </Button>
              )}
            </motion.div>
          ) : (
            <>
              {/* Product grid — home page style cards */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
              >
                {paginatedProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                    className={`group cursor-pointer rounded-xl ${cardBg} border ${cardBorder} ${cardHoverBorder} transition-all duration-300 overflow-hidden relative`}
                    onClick={() => selectProduct(product.id)}
                  >
                    {/* Product image — aspect-[4/5] with hover overlay */}
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

                      {/* Product name */}
                      <h3
                        className={`mt-1.5 text-sm sm:text-base font-normal ${textPrimary} line-clamp-1 transition-colors`}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: isDark ? 'rgba(28, 25, 23, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                      border: isDark ? '1px solid rgba(219, 175, 54, 0.15)' : '1px solid rgba(212, 164, 55, 0.2)',
                      color: isDark ? 'rgba(245, 230, 163, 0.4)' : 'rgba(28, 25, 23, 0.5)',
                    }}
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 ${
                        currentPage === i + 1 ? 'shadow-lg' : ''
                      }`}
                      style={
                        currentPage === i + 1
                          ? {
                              background: accent.icon,
                              color: '#1c1917',
                              boxShadow: `0 2px 12px rgba(219, 175, 54, 0.2)`,
                            }
                          : {
                              background: isDark ? 'rgba(28, 25, 23, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                              border: isDark ? '1px solid rgba(219, 175, 54, 0.15)' : '1px solid rgba(212, 164, 55, 0.2)',
                              color: isDark ? 'rgba(245, 230, 163, 0.4)' : 'rgba(28, 25, 23, 0.5)',
                            }
                      }
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: isDark ? 'rgba(28, 25, 23, 0.4)' : 'rgba(255, 255, 255, 0.9)',
                      border: isDark ? '1px solid rgba(219, 175, 54, 0.15)' : '1px solid rgba(212, 164, 55, 0.2)',
                      color: isDark ? 'rgba(245, 230, 163, 0.4)' : 'rgba(28, 25, 23, 0.5)',
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick View Dialog */}
      <QuickViewDialog
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        product={quickViewProduct as any}
      />
    </div>
  );
}
