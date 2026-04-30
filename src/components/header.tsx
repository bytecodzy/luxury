'use client';

import { useStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Search, ShoppingCart, Package, Menu, X } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function Header() {
  const { searchQuery, setSearch, setView, cartItems, setCategory } = useStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-amber-900/30 bg-stone-950/95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => {
              setView('home');
              setSearch('');
              setLocalSearch('');
              setCategory(null);
            }}
            className="flex-shrink-0 flex items-center gap-2"
          >
            <Image
              src="/images/logo.png"
              alt="3 Boxes Luxury Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <h1 className="gold-shimmer text-xl font-bold tracking-widest sm:text-2xl hidden sm:block">
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
                placeholder="Search luxury items..."
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
            {/* Orders */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('orders')}
              className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label="View orders"
            >
              <Package className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('cart')}
              className="relative text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label="View cart"
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
                  <Image
                    src="/images/logo.png"
                    alt="3 Boxes Luxury Logo"
                    width={32}
                    height={32}
                    className="h-8 w-auto"
                  />
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
                        placeholder="Search luxury items..."
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
                    Home
                  </button>
                  <button
                    onClick={() => {
                      setView('cart');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    Cart ({totalItems})
                  </button>
                  <button
                    onClick={() => {
                      setView('orders');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    Orders
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
