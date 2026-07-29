'use client';

import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  Search, ShoppingCart, Menu, X, LogIn, LogOut, User,
  Heart, UserCircle, Baby, Home, Briefcase,
  ChevronDown, Sun, Moon, Users, Crown, Watch, Gem, Sparkles,
  Mic, Image as ImageIcon, Package,
  Box,
  Gift
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LocaleSwitcher, LocaleSwitcherMobile } from '@/components/locale-switcher';
import { showToast } from '@/hooks/use-toast-notification';
import type { LucideIcon } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   CATEGORY NAVIGATION DATA
   ═══════════════════════════════════════════════════════════════════ */
interface CategoryChild {
  name: string;
  slug: string;
}

interface CategoryNavItem {
  name: string;
  slug: string;
  icon: LucideIcon;
  children: CategoryChild[];
  scrollToId?: string;
  viewId?: string;
}

const CATEGORY_NAV: CategoryNavItem[] = [
  {
    name: 'Couple',
    slug: 'couple',
    icon: Heart,
    children: [
      { name: 'Couple Friendly', slug: 'couple-friendly' },
    ],
  },
  {
    name: 'Men',
    slug: 'men',
    icon: User,
    children: [
      { name: 'Accessories', slug: 'men-accessories' },
      { name: 'Shirts', slug: 'men-shirts' },
      { name: 'T-Shirts & Polos', slug: 'men-tshirts' },
      { name: 'Fragrances', slug: 'men-fragrances' },
      { name: 'Watches', slug: 'men-watches' },
      { name: 'Leather Goods', slug: 'men-leather' },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    icon: UserCircle,
    children: [
      { name: 'Jewelry', slug: 'women-jewelry' },
      { name: 'Sarees', slug: 'women-sarees' },
      { name: 'Fashion', slug: 'women-fashion' },
      { name: 'Fragrances', slug: 'women-fragrances' },
      { name: 'Accessories', slug: 'women-accessories' },
    ],
  },
  // {
  //   name: 'Kids',
  //   slug: 'kids',
  //   icon: Baby,
  //   children: [
  //     { name: 'Toys & Games', slug: 'kids-toys' },
  //     { name: 'Kids Fashion', slug: 'kids-fashion' },
  //     { name: 'Shirts (5-18 yrs)', slug: 'kids-shirts' },
  //     { name: 'Dresses (5-18 yrs)', slug: 'kids-dresses' },
  //   ],
  // },
  // {
  //   name: 'Watches',
  //   slug: 'watches',
  //   icon: Watch,
  //   children: [
  //     { name: 'Men\'s Watches', slug: 'men-watches' },
  //     { name: 'Women\'s Watches', slug: 'women-watches' },
  //     { name: 'Couple Watch Sets', slug: 'couple-watches' },
  //   ],
  // },
  // {
  //   name: 'Jewelry',
  //   slug: 'jewelry',
  //   icon: Gem,
  //   children: [
  //     { name: 'Rings', slug: 'jewelry-rings' },
  //     { name: 'Earrings', slug: 'jewelry-earrings' },
  //     { name: 'Necklaces', slug: 'jewelry-necklaces' },
  //     { name: 'Bracelets', slug: 'jewelry-bracelets' },
  //     { name: 'Jewelry Sets', slug: 'jewelry-sets' },
  //   ],
  // },
  // {
  //   name: 'Sarees',
  //   slug: 'sarees',
  //   icon: Sparkles,
  //   children: [
  //     { name: 'Silk Sarees', slug: 'sarees-silk' },
  //     { name: 'Cotton Sarees', slug: 'sarees-cotton' },
  //     { name: 'Designer Sarees', slug: 'sarees-designer' },
  //   ],
  // },
  {
    name: 'Home',
    slug: 'home',
    icon: Home,
    children: [
      { name: 'Home Décor', slug: 'home-decor' },
      { name: 'Candles & Fragrances', slug: 'home-candles' },
      { name: 'Living', slug: 'home-living' },
    ],
  },
  {
    name: 'Office',
    slug: 'office',
    icon: Briefcase,
    children: [
      { name: 'Corporate Gifts', slug: 'office-corporate-gifts' },
      { name: 'Desk Accessories', slug: 'office-desk' },
      { name: 'Stationery', slug: 'office-stationery' },
    ],
  },
  {
    name: 'New Arrivals',
    slug: 'new-arrivals',
    icon: Sparkles,
    children: [],
  },
//   {
//     name: 'Family Packs',
//     slug: 'family-packs',
//     icon: Package,
//     children: [],
//     viewId: 'family-packs',
//   },
//   {
//     name: 'Social',
//     slug: 'social-connections',
//     icon: Users,
//     children: [],
//     viewId: 'social-connections',
//   },
  // {
  //   name: 'Curate',
  //   slug: '3boxes-curate',
  //   icon: Crown,
  //   children: [],
  //   viewId: '3boxes-curate',
  // },
  {
    name: 'Combos',
    slug: 'combos',
    icon: Gift,
    children: [
      { name: 'Combo Boxes', slug: 'combos-boxes' },
      { name: 'Custom Boxes', slug: 'custom-boxes' },
    ],
  },
 ];

/* ═══════════════════════════════════════════════════════════════════
   ANNOUNCEMENT BAR TEXT
   ═══════════════════════════════════════════════════════════════════ */
const ANNOUNCEMENT_TEXT = "Free Shipping on Orders Over ₹5,000 | Curated Luxury Gifts | New Arrivals Every Week";

/* ═══════════════════════════════════════════════════════════════════
   ROLE BADGE STYLES
   ═══════════════════════════════════════════════════════════════════ */
const roleBadgeDark: Record<string, string> = {
  admin: 'bg-red-600/20 text-red-400 border-red-600/30',
  user: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  agent: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  team: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  corporate: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
};

const roleBadgeLight: Record<string, string> = {
  admin: 'bg-red-100 text-red-600 border-red-200',
  user: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  agent: 'bg-blue-100 text-blue-600 border-blue-200',
  team: 'bg-purple-100 text-purple-600 border-purple-200',
  corporate: 'bg-amber-100 text-amber-600 border-amber-200',
};

/* ═══════════════════════════════════════════════════════════════════
   HEADER COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function Header() {
  const {
    searchQuery, setSearch, setView, cartItems, setCategory,
    selectedCategory, authUser, setAuthView, clearAuth,
    appTheme, setAppTheme,
  } = useStore();
  const { t } = useTranslation();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      // hysteresis: collapse only past 120, expand only when back under 40
      setScrolled((prev) => {
        if (!prev && y > 120) return true;
        if (prev && y < 40) return false;
        return prev;
      });
      ticking = false;
    });
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isDark = appTheme === 'dark';
  const isLight = appTheme === 'light';

  // Theme-aware styling helpers
  const mutedText = isDark ? 'text-amber-200/70' : 'text-stone-600';
  const mutedTextHover = isDark ? 'hover:text-amber-400' : 'hover:text-amber-700';
  const iconBg = isDark ? 'hover:bg-amber-900/20' : 'hover:bg-amber-50';
  const bgSurface = isDark ? 'bg-stone-950' : 'bg-[#fdf9f1]';
  const bgSurface95 = isDark ? 'bg-stone-950/95' : 'bg-[#fdf9f1]/95';
  const borderColor = isDark ? 'border-amber-900/30' : 'border-amber-200/50';
  const borderColorLight = isDark ? 'border-amber-900/20' : 'border-amber-200/40';

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    if (searchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchDropdownOpen]);

  // Sync local search with global state
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(localSearch);
      setCategory(null);
      setView('home');
      setSearchDropdownOpen(false);
    },
    [localSearch, setSearch, setCategory, setView]
  );

  // ── Voice search using Web Speech API ──────────────────────────────
  // Falls back to a friendly toast if the browser doesn't support it.
  const handleVoiceSearch = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast(
        'error',
        'Voice search is not supported in your browser. Please use Chrome, Edge, or Safari.'
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setVoiceListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setLocalSearch(transcript);
        setSearch(transcript);
        setCategory(null);
        setView('home');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event?.error);
      if (event?.error === 'not-allowed') {
        showToast('error', 'Microphone permission was denied. Please allow mic access to use voice search.');
      } else {
        showToast('error', 'Voice search failed. Please try again.');
      }
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      showToast('error', 'Voice search could not start. Please try again.');
    }
  }, [setSearch, setCategory, setView]);

  // ── Image search ───────────────────────────────────────────────────
  // Opens a hidden file picker; the chosen image is logged + toasted for now.
  // A real image-search backend can be wired in later without touching UI.
  const handleImageSearch = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just inform the user — image search backend not wired.
      showToast('info', `Image selected: ${file.name}. Image search will be available soon.`);
    }
    // Reset so the same file can be picked again later
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDashboard = () => {
    if (!authUser) return;
    switch (authUser.role) {
      case 'admin': setView('admin-dashboard'); break;
      case 'user': setView('user-dashboard'); break;
      case 'agent': setView('agent-dashboard'); break;
      case 'team': setView('team-dashboard'); break;
      case 'corporate': setView('corporate-dashboard'); break;
    }
  };

  // Helper: handle nav item click
  const handleNavClick = (cat: CategoryNavItem) => {
    if (cat.viewId) {
      setView(cat.viewId as any);
    } else if (cat.scrollToId) {
      setView('home');
      setCategory(null);
      setTimeout(() => {
        const el = document.getElementById(cat.scrollToId!);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      setCategory(cat.slug);
      setView('shop');
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     ICON BUTTON COMPONENT (reusable for header icons)
     Slightly bigger icons than before (h-5 w-5 instead of h-[18px]).
     ═══════════════════════════════════════════════════════════════════ */
  const IconButton = ({ icon: Icon, onClick, ariaLabel, className = '', badge = null, active = false }: {
    icon: LucideIcon;
    onClick: () => void;
    ariaLabel: string;
    className?: string;
    badge?: React.ReactNode;
    active?: boolean;
  }) => (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`relative group ${active ? (isDark ? 'text-amber-400' : 'text-amber-600') : mutedText} ${iconBg} ${mutedTextHover} transition-all duration-300 rounded-full h-11 w-11 hover:shadow-[0_0_14px_rgba(var(--luxury-accent-rgb,219,175,54),0.3)] ${className}`}
      aria-label={ariaLabel}
    >
      <Icon className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
      {badge}
    </Button>
  );

  /* ═══════════════════════════════════════════════════════════════════
     SEARCH BAR — inline form with placeholder + mic + image buttons
     Shared between desktop (always visible) and mobile (expanded).
     `compact` triggers a slightly smaller padding for mobile.
     ═══════════════════════════════════════════════════════════════════ */
  const SearchBar = ({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) => (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        {/* Search icon on the left */}
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-amber-600/60' : 'text-amber-500/60'} ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />

        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search..."
          autoFocus={autoFocus}
          className={`w-full ${compact ? 'pl-9 pr-20 h-10 text-sm' : 'pl-11 pr-24 h-11 text-sm'} rounded-full transition-all duration-200 ${
            isDark
              ? 'border-amber-900/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:bg-stone-900/80'
              : 'border-amber-200/60 bg-white text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white'
          }`}
          aria-label="Search products"
        />

        {/* Mic + Image buttons on the right (inside the input) */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleVoiceSearch}
            aria-label="Voice search"
            title="Voice search"
            className={`flex items-center justify-center rounded-full transition-all duration-200 ${
              compact ? 'h-7 w-7' : 'h-8 w-8'
            } ${
              voiceListening
                ? (isDark ? 'bg-red-500/30 text-red-300 animate-pulse' : 'bg-red-100 text-red-600 animate-pulse')
                : (isDark
                  ? 'text-amber-300/70 hover:bg-amber-500/15 hover:text-amber-200'
                  : 'text-amber-600/70 hover:bg-amber-100 hover:text-amber-700')
            }`}
          >
            <Mic className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
          </button>

          <button
            type="button"
            onClick={handleImageSearch}
            aria-label="Image search"
            title="Image search"
            className={`flex items-center justify-center rounded-full transition-all duration-200 ${
              compact ? 'h-7 w-7' : 'h-8 w-8'
            } ${
              isDark
                ? 'text-amber-300/70 hover:bg-amber-500/15 hover:text-amber-200'
                : 'text-amber-600/70 hover:bg-amber-100 hover:text-amber-700'
            }`}
          >
            <ImageIcon className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
          </button>
        </div>

        {/* Clear button when there's text */}
        {localSearch && (
          <button
            type="button"
            onClick={() => { setLocalSearch(''); setSearch(''); }}
            className={`absolute right-[88px] top-1/2 -translate-y-1/2 ${isDark ? 'text-amber-200/40 hover:text-amber-200' : 'text-stone-400 hover:text-stone-600'}`}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md transition-colors duration-500 ${bgSurface95} border-b ${borderColor}`}>
      {/* Hidden file input for image search */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ═══════════════════════════════════════════════════════════════
          ROW 1: ANNOUNCEMENT BAR — gold gradient, scrolling marquee,
                 pauses on hover. Same gold gradient for both themes.
          ═══════════════════════════════════════════════════════════════ */}
      <div className={`announcement-bar announcement-marquee relative overflow-hidden transition-all duration-300 ${scrolled ? 'max-h-0 opacity-0 py-0' : 'max-h-20 opacity-100'}`}>
        {/* Gold gradient background — theme gold (#dbaf36) with champagne edges */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f5e6a3] via-[#dbaf36] to-[#f5e6a3]" />
        {/* Subtle top/bottom depth lines */}
        <div className="absolute inset-x-0 top-0 h-px bg-[#92700c]/40" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[#92700c]/40" />
        <div className="announcement-shimmer absolute inset-0" />

        {/* Scrolling track — two identical copies for seamless left-to-right loop.
            Hover on the bar pauses the animation via CSS. */}
        <div
          className="announcement-marquee-track relative py-2 text-xs font-semibold tracking-wide text-black"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          <span>{ANNOUNCEMENT_TEXT}</span>
          <span aria-hidden="true">{ANNOUNCEMENT_TEXT}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 2: MAIN HEADER — Logo centered, search inline, icons flanking
          ═══════════════════════════════════════════════════════════════ */}
      <div className={`border-b ${borderColorLight} transition-all duration-300 overflow-hidden ${scrolled ? 'max-h-0 opacity-0 border-b-0' : 'max-h-[120px] opacity-100'}`}>
        <div className="container mx-auto px-4">
          {/* ───────── Desktop layout: 3-column with centered logo ───────── */}
          <div className="hidden md:flex items-center justify-between h-[88px] gap-4">

            {/* LEFT: Logo */}
            <button
              onClick={() => {
                setView('home');
                setSearch('');
                setLocalSearch('');
                setCategory(null);
              }}
              className="flex-shrink-0 flex items-center gap-3 group"
            >
              <div className="relative flex h-32 w-32 items-center justify-center">
                <Image
                  src="/images/logo-uploaded.png"
                  alt="3 Boxes Luxury Logo"
                  width={128}
                  height={128}
                  className={`h-32 w-32 object-contain transition-all duration-500 group-hover:scale-105 ${
                    isLight
                      ? 'contrast-110 brightness-95 saturate-130'
                      : 'contrast-130 brightness-110 saturate-120'
                  }`}
                  priority
                />
              </div>
              <h1
                className="logo-shimmer-text hidden lg:block text-xl font-bold tracking-[0.25em] transition-all duration-500"
                style={{ fontFamily: 'Lora, serif' }}
              >
                3 BOXES LUXURY
              </h1>
            </button>

            {/* CENTER: Inline Search Bar */}
            <div className="flex-1 max-w-xl mx-auto">
              <SearchBar />
            </div>

            {/* RIGHT GROUP: Theme toggle, Locale, Auth, Wishlist, Cart */}
            <div className="flex items-center gap-1 flex-shrink-0">

              {/* Theme Toggle (Dark/Light) */}
              <IconButton
                icon={isDark ? Sun : Moon}
                onClick={() => setAppTheme(isDark ? 'light' : 'dark')}
                ariaLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              />

              {/* Locale / Currency Switcher (moved here per request) */}
              <LocaleSwitcher />

              {/* Auth Button */}
              {authUser ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDashboard}
                    className={`relative group ${mutedText} ${iconBg} ${mutedTextHover} transition-all duration-300 rounded-full h-11 w-11 hover:shadow-[0_0_14px_rgba(var(--luxury-accent-rgb,219,175,54),0.3)]`}
                    aria-label={t('common.myDashboard')}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 group-hover:scale-110 ${
                      isDark ? 'bg-amber-600/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {authUser.name.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { clearAuth(); setView('home'); showToast('success', 'You have been signed out successfully.') }}
                    className={`${isDark ? 'text-amber-200/40 hover:bg-red-900/20 hover:text-red-400' : 'text-stone-400 hover:bg-red-50 hover:text-red-500'} transition-all duration-300 rounded-full h-9 w-9`}
                    aria-label={t('common.signOut')}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <IconButton
                  icon={LogIn}
                  onClick={() => setAuthView('login')}
                  ariaLabel={t('common.signIn')}
                />
              )}

              {/* Wishlist (Heart) — added before Cart */}
              <IconButton
                icon={Heart}
                onClick={() => setView('wishlist')}
                ariaLabel="View wishlist"
              />

              {/* Cart with bounce animation */}
              <div className="relative">
                <motion.div
                  key={totalItems}
                  initial={totalItems > 0 ? { scale: 1.2 } : { scale: 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <IconButton
                    icon={ShoppingCart}
                    onClick={() => setView('cart')}
                    ariaLabel={t('common.viewCart')}
                    badge={
                      <AnimatePresence>
                        {totalItems > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              isDark ? 'bg-[var(--luxury-accent,#dbaf36)] text-stone-950' : 'bg-[var(--luxury-accent,#dbaf36)] text-white'
                            }`}
                          >
                            {totalItems}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    }
                  />
                </motion.div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MOBILE LAYOUT: Hamburger + Logo + Search toggle + Wishlist + Cart
              ═══════════════════════════════════════════════════════════════ */}
          <div className="flex md:hidden items-center justify-between h-[56px]">
            {/* Hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${mutedText} ${iconBg} ${mutedTextHover} transition-all duration-300 h-11 w-11`}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className={`border ${borderColor} ${bgSurface}`}>
                <SheetTitle className="flex items-center gap-2">
                  <div className="relative flex h-28 w-28 items-center justify-center">
                    <Image
                      src="/images/logo-uploaded.png"
                      alt="3 Boxes Luxury Logo"
                      width={112}
                      height={112}
                      className={`h-28 w-28 object-contain ${
                        isLight ? 'contrast-110 brightness-95 saturate-130' : 'contrast-130 brightness-110 saturate-120'
                      }`}
                    />
                  </div>
                  <span className={`gold-shimmer text-lg font-bold tracking-widest`}>
                    3 BOXES LUXURY
                  </span>
                </SheetTitle>
                <div className="mt-8 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
                  {/* Search (compact, with mic + image buttons inside) */}
                  <SearchBar compact />

                  {/* Home */}
                  <button
                    onClick={() => { setView('home'); setSearch(''); setLocalSearch(''); setCategory(null); setMobileMenuOpen(false); }}
                    className={`rounded-md px-4 py-2 text-left transition-colors ${isDark ? 'text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-400' : 'text-stone-700 hover:bg-amber-50 hover:text-amber-700'}`}
                  >
                    {t('nav.home')}
                  </button>

                  {/* Auth */}
                  {authUser ? (
                    <>
                      <button
                        onClick={() => { handleDashboard(); setMobileMenuOpen(false); }}
                        className={`rounded-md px-4 py-2 text-left transition-colors flex items-center gap-2 ${isDark ? 'text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-400' : 'text-stone-700 hover:bg-amber-50 hover:text-amber-700'}`}
                      >
                        <User className="h-4 w-4" />
                        {t('common.myDashboard')} ({authUser.role})
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                          isDark ? (roleBadgeDark[authUser.role] || '') : (roleBadgeLight[authUser.role] || '')
                        }`}>
                          {authUser.role}
                        </span>
                      </button>
                      <button
                        onClick={() => { clearAuth(); setView('home'); setMobileMenuOpen(false); showToast('success', 'You have been signed out successfully.') }}
                        className={`rounded-md px-4 py-2 text-left transition-colors flex items-center gap-2 ${isDark ? 'text-red-400/80 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}
                      >
                        <LogOut className="h-4 w-4" />
                        {t('common.signOut')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setAuthView('login'); setMobileMenuOpen(false); }}
                      className={`rounded-md px-4 py-3 text-left font-medium transition-colors flex items-center gap-2 ${isDark
                        ? 'text-amber-100 bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30'
                        : 'text-white bg-[var(--luxury-accent,#dbaf36)] border border-amber-400 hover:bg-amber-500'
                      }`}
                    >
                      <LogIn className="h-5 w-5" />
                      {t('common.signIn')}
                    </button>
                  )}

                  {/* Wishlist */}
                  <button
                    onClick={() => { setView('wishlist'); setMobileMenuOpen(false); }}
                    className={`rounded-md px-4 py-2 text-left transition-colors flex items-center gap-2 ${isDark ? 'text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-400' : 'text-stone-700 hover:bg-amber-50 hover:text-amber-700'}`}
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </button>

                  {/* Cart */}
                  <button
                    onClick={() => { setView('cart'); setMobileMenuOpen(false); }}
                    className={`rounded-md px-4 py-2 text-left transition-colors flex items-center gap-2 ${isDark ? 'text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-400' : 'text-stone-700 hover:bg-amber-50 hover:text-amber-700'}`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {t('common.cart')} ({totalItems})
                  </button>

                  {/* Quick Section Links */}
                  <div className={`my-3 border-t pt-3 ${isDark ? 'border-amber-900/20' : 'border-amber-200/40'}`}>
                    <p className={`px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-amber-400/50' : 'text-amber-600/50'}`}>Explore</p>
                    {CATEGORY_NAV.map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => { handleNavClick(cat); setMobileMenuOpen(false); }}
                        className={`rounded-md px-4 py-2 w-full text-left transition-colors flex items-center gap-2 ${isDark ? 'text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-400' : 'text-stone-600 hover:bg-amber-50 hover:text-amber-700'}`}
                      >
                        <cat.icon className="h-4 w-4" />
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => { setAppTheme(isDark ? 'light' : 'dark'); }}
                    className={`rounded-md px-4 py-2 text-left transition-colors flex items-center gap-2 ${isDark ? 'text-amber-200/80 hover:bg-amber-900/20' : 'text-stone-600 hover:bg-amber-50'}`}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>

                  {/* Locale Switcher (mobile drawer) */}
                  <LocaleSwitcherMobile />
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo (Mobile) */}
            <button
              onClick={() => { setView('home'); setSearch(''); setLocalSearch(''); setCategory(null); }}
              className="flex items-center gap-2 group"
            >
              <div className="relative flex h-24 w-24 items-center justify-center">
                <Image
                  src="/images/logo-uploaded.png"
                  alt="3 Boxes Luxury Logo"
                  width={96}
                  height={96}
                  className={`h-24 w-24 object-contain transition-all duration-300 group-hover:scale-105 ${
                    isLight ? 'contrast-110 brightness-95 saturate-130' : 'contrast-130 brightness-110 saturate-120'
                  }`}
                  priority
                />
              </div>
              <span className="logo-shimmer-text text-sm font-bold tracking-[0.2em] hidden xs:block" style={{ fontFamily: 'Lora, serif' }}>
                3 BOXES
              </span>
            </button>

            {/* Right side: Search toggle, Wishlist, Cart */}
            <div className="flex items-center gap-0.5">
              {/* Search toggle (expands search bar below) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
                className={`relative ${mutedText} ${iconBg} ${mutedTextHover} transition-all duration-300 h-11 w-11 rounded-full`}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Wishlist */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('wishlist')}
                className={`relative ${mutedText} ${iconBg} ${mutedTextHover} transition-all duration-300 h-11 w-11 rounded-full`}
                aria-label="View wishlist"
              >
                <Heart className="h-5 w-5" />
              </Button>

              {/* Cart */}
              <motion.div
                key={totalItems}
                initial={totalItems > 0 ? { scale: 1.2 } : { scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView('cart')}
                  className={`relative ${mutedText} ${iconBg} ${mutedTextHover} transition-all duration-300 h-11 w-11 rounded-full`}
                  aria-label={t('common.viewCart')}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={`absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-bold ${
                          isDark ? 'bg-[var(--luxury-accent,#dbaf36)] text-stone-950' : 'bg-[var(--luxury-accent,#dbaf36)] text-white'
                        }`}
                      >
                        {totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Mobile Search Dropdown — uses SearchBar (compact) so mic + image buttons are inside */}
          <AnimatePresence>
            {searchDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden"
              >
                <div className="px-4 pb-3 pt-1">
                  <SearchBar compact autoFocus />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 3: CATEGORY ICONS ROW
          ═══════════════════════════════════════════════════════════════ */}
      <div className={`${bgSurface}`}>
        <div className="container mx-auto px-4">
          {/* Desktop: Icon circles with labels and dropdowns */}
          <div className="hidden md:flex items-center gap-4 py-1.5">

            {/* Compact logo — only visible when scrolled */}
            {scrolled && (
              <button
                onClick={() => { setView('home'); setSearch(''); setLocalSearch(''); setCategory(null); }}
                className="flex-shrink-0 flex items-center gap-2"
                aria-label="Home"
              >
                <Image
                  src="/images/logo-uploaded.png"
                  alt="3 Boxes Luxury"
                  width={112}
                  height={112}
                  className="h-28 w-28 object-contain"
                  priority
                />
              </button>
            )}

            {/* Category nav */}
            <nav
              className={`flex flex-wrap items-center gap-2 ${scrolled ? 'flex-1 justify-start' : 'flex-1 justify-center'}`}
              aria-label="Category navigation"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              {CATEGORY_NAV.map((cat) => {
                const Icon = cat.icon;
                const hasChildren = cat.children.length > 0;
                const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);

                if (!hasChildren) {
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => handleNavClick(cat)}
                      className={`category-icon-btn group flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-300 ${
                        isActive
                          ? (isDark
                            ? 'bg-[var(--luxury-glow,rgba(219,175,54,0.15))] border-[var(--luxury-accent,#dbaf36)]/40 text-amber-300 shadow-[0_0_15px_rgba(var(--luxury-accent-rgb,219,175,54),0.2)]'
                            : 'bg-amber-50 border-[var(--luxury-accent,#dbaf36)] text-amber-700 shadow-[0_0_10px_rgba(var(--luxury-accent-rgb,219,175,54),0.15)]')
                          : (isDark
                            ? 'text-amber-200/60 hover:bg-amber-900/10 border border-amber-900/20 hover:border-amber-600/30'
                            : 'text-stone-500 hover:bg-amber-50 border border-amber-200/30 hover:border-amber-300')
                      } ${cat.slug === 'new-arrivals' || cat.viewId ? 'relative' : ''}`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                        isActive
                          ? (isDark ? 'border-[var(--luxury-accent,#dbaf36)] bg-amber-900/30' : 'border-[var(--luxury-accent,#dbaf36)] bg-amber-100')
                          : (isDark ? 'border-amber-800/30 group-hover:border-amber-500/50 group-hover:shadow-[0_0_8px_rgba(var(--luxury-accent-rgb,219,175,54),0.25)]' : 'border-amber-200 group-hover:border-amber-300 group-hover:shadow-[0_0_8px_rgba(var(--luxury-accent-rgb,219,175,54),0.2)]')
                      }`}>
                        <Icon className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 ${isActive ? 'luxury-accent-text' : ''}`} />
                      </div>
                      <span className={`text-[11px] font-medium tracking-wide whitespace-nowrap ${isActive ? 'luxury-accent-text' : ''}`}>
                        {cat.name}
                      </span>
                      {cat.slug === 'new-arrivals' && (
                        <span className={`absolute -top-1 -right-1 rounded-full px-1.5 text-[8px] font-bold uppercase tracking-wider ${
                          isDark ? 'bg-[var(--luxury-accent,#dbaf36)] text-stone-950' : 'bg-[var(--luxury-accent,#dbaf36)] text-white'
                        }`}>
                          New
                        </span>
                      )}
                      {cat.viewId && (
                        <span className={`absolute -top-1 -right-1 rounded-full px-1.5 text-[8px] font-bold uppercase tracking-wider ${
                          isDark ? 'bg-amber-600/30 text-amber-400' : 'bg-amber-100 text-amber-600'
                        }`}>
                          ★
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <div
                    key={cat.slug}
                    className="group relative"
                    onMouseEnter={() => setHoveredCategory(cat.slug)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <button
                      onClick={() => handleNavClick(cat)}
                      className={`category-icon-btn flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all duration-300 ${
                        isActive
                          ? (isDark
                            ? 'bg-[var(--luxury-glow,rgba(219,175,54,0.15))] border-[var(--luxury-accent,#dbaf36)]/40 text-amber-300 shadow-[0_0_15px_rgba(var(--luxury-accent-rgb,219,175,54),0.2)]'
                            : 'bg-amber-50 border-[var(--luxury-accent,#dbaf36)] text-amber-700 shadow-[0_0_10px_rgba(var(--luxury-accent-rgb,219,175,54),0.15)]')
                          : (isDark
                            ? 'text-amber-200/60 hover:bg-amber-900/10 border border-amber-900/20 hover:border-amber-600/30'
                            : 'text-stone-500 hover:bg-amber-50 border border-amber-200/30 hover:border-amber-300')
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                        isActive
                          ? (isDark ? 'border-[var(--luxury-accent,#dbaf36)] bg-amber-900/30' : 'border-[var(--luxury-accent,#dbaf36)] bg-amber-100')
                          : (isDark ? 'border-amber-800/30 group-hover:border-amber-500/50 group-hover:shadow-[0_0_8px_rgba(var(--luxury-accent-rgb,219,175,54),0.25)]' : 'border-amber-200 group-hover:border-amber-300 group-hover:shadow-[0_0_8px_rgba(var(--luxury-accent-rgb,219,175,54),0.2)]')
                      }`}>
                        <Icon className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 ${isActive ? 'luxury-accent-text' : ''}`} />
                      </div>
                      <span className={`text-[11px] font-medium tracking-wide whitespace-nowrap flex items-center gap-0.5 ${isActive ? 'luxury-accent-text' : ''}`}>
                        {cat.name}
                        <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${hoveredCategory === cat.slug ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {hoveredCategory === cat.slug && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute top-full left-1/2 -translate-x-1/2 z-50 mt-1 min-w-[180px] rounded-xl border py-2 shadow-xl ${isDark
                            ? 'border-amber-900/30 bg-stone-950/98 backdrop-blur-md shadow-black/40'
                            : 'border-amber-200 bg-white/98 backdrop-blur-md shadow-amber-200/40'
                          }`}
                        >
                          {/* Parent "All" link */}
                          <button
                            onClick={() => { setCategory(cat.slug); setView('shop'); setHoveredCategory(null); }}
                            className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${isDark
                              ? 'text-amber-300/90 hover:bg-amber-900/20 hover:text-amber-200'
                              : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            All {cat.name}
                          </button>
                          <div className={`mx-3 my-1 border-t ${isDark ? 'border-amber-900/20' : 'border-amber-200/40'}`} />
                          {cat.children.map((child) => (
                            <button
                              key={child.slug}
                              onClick={() => { setCategory(child.slug); setView('shop'); setHoveredCategory(null); }}
                              className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                                selectedCategory === child.slug
                                  ? (isDark ? 'text-amber-300 bg-amber-900/20' : 'text-amber-700 bg-amber-50')
                                  : (isDark ? 'text-amber-200/60 hover:bg-amber-900/10 hover:text-amber-300' : 'text-stone-500 hover:bg-amber-50 hover:text-amber-700')
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                selectedCategory === child.slug
                                  ? 'bg-[var(--luxury-accent,#dbaf36)]'
                                  : (isDark ? 'bg-amber-600/50' : 'bg-stone-300')
                              }`} />
                              {child.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* Right-side compact toolbar — only when scrolled */}
            {scrolled && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-56">
                  <SearchBar compact />
                </div>
                <IconButton
                  icon={Heart}
                  label="Wishlist"
                  onClick={() => setView('wishlist')}
                />
                <IconButton
                  icon={ShoppingCart}
                  label="Cart"
                  onClick={() => setView('cart')}
                />
              </div>
            )}

          </div>

          {/* Mobile: Horizontal scrollable icon row */}
          <nav className="md:hidden flex items-center gap-2 overflow-x-auto py-2 custom-scrollbar" aria-label="Category navigation" style={{ fontFamily: 'Urbanist, sans-serif' }}>
            {CATEGORY_NAV.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);

              return (
                <button
                  key={cat.slug}
                  onClick={() => handleNavClick(cat)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? (isDark ? 'bg-[var(--luxury-glow,rgba(219,175,54,0.15))] text-amber-300' : 'bg-amber-50 text-amber-700')
                      : (isDark ? 'text-amber-200/60 hover:bg-amber-900/10' : 'text-stone-500 hover:bg-amber-50')
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 ${
                    isActive
                      ? (isDark ? 'border-[var(--luxury-accent,#dbaf36)] bg-amber-900/30' : 'border-[var(--luxury-accent,#dbaf36)] bg-amber-100')
                      : (isDark ? 'border-amber-800/30' : 'border-amber-200')
                  }`}>
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'luxury-accent-text' : ''}`} />
                  </div>
                  <span className={`text-[9px] font-medium tracking-wide whitespace-nowrap ${isActive ? 'luxury-accent-text' : ''}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
