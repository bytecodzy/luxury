'use client';

import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Search, ShoppingCart, Package, Menu, X, LogIn, LogOut, User, Shield, Gift, Sparkles, Download, Heart, UserCircle, Baby, Home, Briefcase, ChevronDown, Building2, Sun, Moon, Users, Crown, Palette } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LocaleSwitcher, LocaleSwitcherMobile } from '@/components/locale-switcher';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { showToast } from '@/hooks/use-toast-notification';
import type { LucideIcon } from 'lucide-react';
import type { ThemeColor } from '@/lib/store';

interface CategoryChild {
  name: string;
  slug: string;
}

interface CategoryNavItem {
  name: string;
  slug: string;
  icon: LucideIcon;
  children: CategoryChild[];
  scrollToId?: string; // If set, clicking scrolls to this section ID on the home page
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
  {
    name: 'Kids',
    slug: 'kids',
    icon: Baby,
    children: [
      { name: 'Toys & Games', slug: 'kids-toys' },
      { name: 'Kids Fashion', slug: 'kids-fashion' },
      { name: 'Shirts (5-18 yrs)', slug: 'kids-shirts' },
      { name: 'Dresses (5-18 yrs)', slug: 'kids-dresses' },
    ],
  },
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
  {
    name: 'Family Packs',
    slug: 'family-packs',
    icon: Package,
    children: [],
    scrollToId: 'family-pack-section',
  },
  {
    name: 'Social',
    slug: 'social-connections',
    icon: Users,
    children: [],
    scrollToId: 'social-connections-section',
  },
  {
    name: 'Curate',
    slug: '3boxes-curate',
    icon: Crown,
    children: [],
    scrollToId: '3boxes-curate-section',
  },
];

export function Header() {
  const { searchQuery, setSearch, setView, cartItems, setCategory, selectedCategory, authUser, setAuthView, clearAuth, toggleGiftBuilder, appTheme, setAppTheme, appThemeColor, setAppThemeColor } = useStore();
  const { t } = useTranslation();
  const { canInstall, promptInstall } = usePWAInstall();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeColorPickerOpen, setThemeColorPickerOpen] = useState(false);
  const themeColorPickerRef = useRef<HTMLDivElement>(null);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const themeColors: { id: ThemeColor; label: string; color: string }[] = [
    { id: 'royal-gold', label: 'Royal Gold', color: '#d4a437' },
    { id: 'rose-elegance', label: 'Rose Elegance', color: '#e11d48' },
    { id: 'emerald-luxe', label: 'Emerald Luxe', color: '#059669' },
    { id: 'sapphire-classic', label: 'Sapphire Classic', color: '#2563eb' },
    { id: 'onyx-noir', label: 'Onyx Noir', color: '#a3a3a3' },
  ];

  // Close theme color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (themeColorPickerRef.current && !themeColorPickerRef.current.contains(e.target as Node)) {
        setThemeColorPickerOpen(false);
      }
    }
    if (themeColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [themeColorPickerOpen]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(localSearch);
      setCategory(null);
      setView('home');
    },
    [localSearch, setSearch, setCategory, setView]
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

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

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-600/20 text-red-400 border-red-600/30',
    user: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    agent: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    team: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    corporate: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  };

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md ${appTheme === 'light' ? 'border-b border-amber-200/50 bg-white/95' : 'border-b border-amber-900/30 bg-stone-950/95'}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-24 items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => {
              setView('home');
              setSearch('');
              setLocalSearch('');
              setCategory(null);
            }}
            className="flex-shrink-0 flex items-center gap-3 group"
          >
            <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
              <Image
                src="/images/logo-uploaded.png"
                alt="3 Boxes Luxury Logo"
                width={96}
                height={96}
                className={`h-20 w-20 object-contain sm:h-24 sm:w-24 ${
                  appTheme === 'light'
                    ? 'contrast-110 brightness-95 saturate-130'
                    : 'contrast-150 brightness-130 saturate-130 mix-blend-lighten drop-shadow-[0_0_14px_rgba(255,215,0,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]'
                }`}
                priority
              />
            </div>
            <h1 className="gold-shimmer text-2xl font-bold tracking-widest sm:text-3xl hidden sm:block ml-1">
              3 BOXES LUXURY
            </h1>
          </button>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-xl md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/60" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={t('common.searchPlaceholder')}
                className="w-full border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:ring-amber-600/30"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch('');
                    setSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 hover:text-amber-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Install App Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (canInstall) {
                  promptInstall();
                } else {
                  const section = document.getElementById('app-download');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="hidden lg:flex items-center gap-1.5 border-amber-500/40 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-500/60"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs font-medium">Install App</span>
            </Button>

            {/* Theme Toggle (Desktop) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
              className={`hidden md:flex ${appTheme === 'light' ? 'text-stone-600 hover:bg-amber-100/50 hover:text-amber-700' : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400'}`}
              aria-label={appTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {appTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Theme Color Picker (Desktop) */}
            <div className="relative hidden md:block" ref={themeColorPickerRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setThemeColorPickerOpen(!themeColorPickerOpen)}
                className={`${appTheme === 'light' ? 'text-stone-600 hover:bg-amber-100/50 hover:text-amber-700' : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400'}`}
                aria-label="Change theme color"
              >
                <Palette className="h-5 w-5" />
              </Button>
              <AnimatePresence>
                {themeColorPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 z-[100] rounded-xl border border-amber-500/20 bg-stone-950/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/40"
                    style={{ minWidth: '170px' }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.15em] text-amber-400/60 mb-2 px-1">Theme Color</p>
                    <div className="space-y-1">
                      {themeColors.map((tc) => (
                        <button
                          key={tc.id}
                          onClick={() => {
                            setAppThemeColor(tc.id);
                            setThemeColorPickerOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                            appThemeColor === tc.id
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'text-amber-200/60 hover:bg-amber-500/10 hover:text-amber-200/90'
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded-full border-2 flex-shrink-0 transition-shadow"
                            style={{
                              backgroundColor: tc.color,
                              borderColor: appThemeColor === tc.id ? '#fff' : tc.color,
                              boxShadow: appThemeColor === tc.id ? `0 0 8px ${tc.color}80` : 'none',
                            }}
                          />
                          <span className="text-xs font-medium">{tc.label}</span>
                          {appThemeColor === tc.id && (
                            <svg className="ml-auto h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Locale Switcher (Desktop) */}
            <LocaleSwitcher />

            {/* Orders */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('orders')}
              className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label={t('common.orders')}
            >
              <Package className="h-5 w-5" />
            </Button>

            {/* Gift Builder */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleGiftBuilder}
              className="hidden sm:flex items-center gap-1.5 text-amber-300/80 hover:bg-amber-900/20 hover:text-amber-300 border border-amber-600/30 hover:border-amber-500/50"
            >
              <Gift className="h-4 w-4" />
              <span className="text-xs font-medium">{t('nav.giftBuilder')}</span>
              <Sparkles className="h-3 w-3 text-amber-400/60" />
            </Button>

            {/* Login / Profile */}
            {authUser ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDashboard}
                  className="hidden sm:flex items-center gap-2 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600/20 text-xs font-bold text-amber-400">
                    {authUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-24 truncate text-sm">{authUser.name}</span>
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${roleBadge[authUser.role] || ''}`}>
                    {authUser.role}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDashboard}
                  className="sm:hidden text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
                  aria-label={t('common.myDashboard')}
                >
                  <Shield className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { clearAuth(); setView('home'); showToast('success', 'You have been signed out successfully.') }}
                  className="text-amber-200/40 hover:bg-red-900/20 hover:text-red-400"
                  aria-label={t('common.signOut')}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="default"
                onClick={() => setAuthView('login')}
                className="border-amber-600/50 bg-amber-900/20 text-amber-300 hover:bg-amber-600/30 hover:text-amber-100 hover:border-amber-500/60 gap-2 px-4 py-2 font-medium shadow-sm shadow-amber-900/20"
                aria-label={t('common.signIn')}
              >
                <LogIn className="h-5 w-5" />
                <span className="text-sm">{t('common.signIn')}</span>
              </Button>
            )}

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('cart')}
              className="relative text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label={t('common.viewCart')}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-stone-950"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400 md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="border-amber-900/30 bg-stone-950">
                <SheetTitle className="flex items-center gap-2">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <Image
                      src="/images/logo-uploaded.png"
                      alt="3 Boxes Luxury Logo"
                      width={56}
                      height={56}
                      className={`h-14 w-14 object-contain ${
                        appTheme === 'light'
                          ? 'contrast-110 brightness-95 saturate-130'
                          : 'contrast-150 brightness-130 saturate-130 mix-blend-lighten drop-shadow-[0_0_14px_rgba(255,215,0,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]'
                      }`}
                    />
                  </div>
                  <span className="gold-shimmer text-lg font-bold tracking-widest">
                    3 BOXES LUXURY
                  </span>
                </SheetTitle>
                <div className="mt-8 flex flex-col gap-4">
                  <form onSubmit={handleSearch} className="md:hidden">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/60" />
                      <Input
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder={t('common.searchPlaceholder')}
                        className="w-full border-amber-900/40 bg-stone-900/50 pl-10 text-amber-50 placeholder:text-amber-200/30"
                      />
                    </div>
                  </form>
                  <button
                    onClick={() => {
                      setView('home');
                      setSearch('');
                      setLocalSearch('');
                      setCategory(null);
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    {t('nav.home')}
                  </button>
                  {authUser ? (
                    <>
                      <button
                        onClick={() => {
                          handleDashboard();
                          setMobileMenuOpen(false);
                        }}
                        className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                      >
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t('common.myDashboard')} ({authUser.role})
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          clearAuth();
                          setView('home');
                          setMobileMenuOpen(false);
                          showToast('success', 'You have been signed out successfully.')
                        }}
                        className="rounded-md px-4 py-2 text-left text-red-400/80 transition-colors hover:bg-red-900/20 hover:text-red-400"
                      >
                        <span className="flex items-center gap-2">
                          <LogOut className="h-4 w-4" />
                          {t('common.signOut')}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setAuthView('login');
                        setMobileMenuOpen(false);
                      }}
                      className="rounded-md px-4 py-3 text-left text-amber-100 font-medium transition-colors bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30"
                    >
                      <span className="flex items-center gap-2">
                        <LogIn className="h-5 w-5" />
                        {t('common.signIn')}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setView('cart');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    {t('common.cart')} ({totalItems})
                  </button>
                  <button
                    onClick={() => {
                      setView('orders');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    {t('common.orders')}
                  </button>
                  <button
                    onClick={() => {
                      toggleGiftBuilder();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-300/90 transition-colors hover:bg-amber-900/20 hover:text-amber-300 flex items-center gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    {t('nav.giftBuilder')}
                    <Sparkles className="h-3 w-3 text-amber-400/60" />
                  </button>

                  {/* Quick section links */}
                  <div className="my-3 border-t border-amber-900/20 pt-3">
                    <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400/50">Explore</p>
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const el = document.getElementById('family-pack-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Family Packs
                    </button>
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const el = document.getElementById('social-connections-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Social Connections
                    </button>
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setTimeout(() => {
                          const el = document.getElementById('3boxes-curate-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      3BOXES Curate
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (canInstall) {
                        promptInstall();
                      } else {
                        const section = document.getElementById('app-download');
                        section?.scrollIntoView({ behavior: 'smooth' });
                      }
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-3 text-left text-amber-100 font-medium transition-colors bg-amber-600/10 border border-amber-500/30 hover:bg-amber-600/20 flex items-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Install App
                  </button>

                  {/* Mobile Locale Switcher */}
                  <LocaleSwitcherMobile />

                  {/* Mobile Theme Color Picker */}
                  <div className="my-3 border-t border-amber-900/20 pt-3">
                    <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400/50">Theme Color</p>
                    <div className="flex items-center gap-3 px-4">
                      {themeColors.map((tc) => (
                        <button
                          key={tc.id}
                          onClick={() => {
                            setAppThemeColor(tc.id);
                          }}
                          className="flex flex-col items-center gap-1"
                          aria-label={tc.label}
                        >
                          <span
                            className="h-6 w-6 rounded-full border-2 transition-shadow"
                            style={{
                              backgroundColor: tc.color,
                              borderColor: appThemeColor === tc.id ? '#fff' : tc.color,
                              boxShadow: appThemeColor === tc.id ? `0 0 10px ${tc.color}80` : 'none',
                            }}
                          />
                          <span className="text-[8px] text-amber-200/50 leading-tight">{tc.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className={`border-t ${appTheme === 'light' ? 'border-amber-200/40 bg-white/95' : 'border-amber-900/20 bg-stone-950/90'}`}>
        <div className="container mx-auto px-4">
          {/* Desktop: horizontal row with hover/click dropdowns */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Category navigation">
            {CATEGORY_NAV.map((cat) => {
              const Icon = cat.icon;
              const hasChildren = cat.children.length > 0;
              const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);

              // Helper: handle nav item click — either scroll to section or set category
              const handleNavClick = () => {
                if (cat.scrollToId) {
                  // Scroll to section on home page
                  setView('home');
                  setCategory(null);
                  // Use setTimeout to ensure the home view is rendered before scrolling
                  setTimeout(() => {
                    const el = document.getElementById(cat.scrollToId!);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                } else {
                  setCategory(cat.slug);
                }
              };

              if (!hasChildren) {
                // No subcategories — click directly sets filter or scrolls to section
                return (
                  <button
                    key={cat.slug}
                    onClick={handleNavClick}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
                      isActive
                        ? 'bg-amber-900/30 text-amber-300'
                        : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.name}
                    {cat.scrollToId && (
                      <span className="ml-1 rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        New
                      </span>
                    )}
                    {cat.slug === 'new-arrivals' && !cat.scrollToId && (
                      <span className="ml-1 rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        New
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <div
                  key={cat.slug}
                  className="group relative"
                  onMouseEnter={() => {
                    const el = document.getElementById(`dropdown-${cat.slug}`);
                    if (el) { el.style.visibility = 'visible'; el.style.opacity = '1'; }
                  }}
                  onMouseLeave={() => {
                    const el = document.getElementById(`dropdown-${cat.slug}`);
                    if (el) { el.style.visibility = 'hidden'; el.style.opacity = '0'; }
                  }}
                >
                  <button
                    onClick={() => setCategory(cat.slug)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
                      isActive
                        ? 'bg-amber-900/30 text-amber-300'
                        : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.name}
                    <ChevronDown className="h-3 w-3 text-amber-500/50 transition-transform group-hover:rotate-180" />
                  </button>

                  {/* Dropdown */}
                  <div
                    id={`dropdown-${cat.slug}`}
                    style={{ visibility: 'hidden', opacity: 0, transition: 'all 0.2s' }}
                    className="absolute top-full left-0 z-50 mt-0.5 min-w-[200px] rounded-lg border border-amber-900/30 bg-stone-950/98 backdrop-blur-md shadow-xl shadow-black/40 py-2"
                  >
                    {/* Parent category "All" link */}
                    <button
                      onClick={() => { setCategory(cat.slug); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-amber-300/90 font-medium transition-colors hover:bg-amber-900/20 hover:text-amber-200"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      All {cat.name}
                    </button>
                    <div className="mx-3 my-1 border-t border-amber-900/20" />
                    {cat.children.map((child) => (
                      <button
                        key={child.slug}
                        onClick={() => { setCategory(child.slug); }}
                        className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-amber-900/20 hover:text-amber-300 ${
                          selectedCategory === child.slug
                            ? 'text-amber-300 bg-amber-900/20'
                            : 'text-amber-200/60'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          selectedCategory === child.slug ? 'bg-amber-400' : 'bg-amber-600/50'
                        }`} />
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Mobile: horizontal scrollable row without dropdowns */}
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto py-2 scrollbar-thin" aria-label="Category navigation">
            {CATEGORY_NAV.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);
              const handleMobileNavClick = () => {
                if (cat.scrollToId) {
                  setView('home');
                  setCategory(null);
                  setTimeout(() => {
                    const el = document.getElementById(cat.scrollToId!);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                } else {
                  setCategory(cat.slug);
                }
              };
              return (
                <button
                  key={cat.slug}
                  onClick={handleMobileNavClick}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-md whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-900/30 text-amber-300'
                      : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
