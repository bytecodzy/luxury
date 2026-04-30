'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function HeroSection() {
  const { setView, setCategory } = useStore();

  return (
    <section className="relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.png"
          alt="Luxury background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/70 to-stone-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-20 sm:py-28 lg:py-36">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-6"
          >
            <Image
              src="/images/logo.png"
              alt="3 Boxes Luxury Logo"
              width={80}
              height={80}
              className="h-16 w-auto sm:h-20 drop-shadow-[0_0_20px_rgba(217,165,80,0.4)]"
              priority
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-sm font-medium uppercase tracking-[0.3em] text-amber-400/80"
          >
            Curated Luxury
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            <span className="luxury-text">3 BOXES</span>{' '}
            <span className="text-amber-50">LUXURY</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-4 text-lg text-amber-100/70 sm:text-xl"
          >
            Discover Timeless Elegance
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-3 max-w-lg text-sm text-amber-200/50 sm:text-base"
          >
            Experience the finest selection of watches, jewelry, sarees, men&apos;s shirts &amp; t-shirts, leather goods, and more from the world&apos;s most prestigious makers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Button
              onClick={() => {
                setCategory(null);
                setView('home');
              }}
              size="lg"
              className="bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25"
            >
              Shop Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setCategory(null);
                setView('home');
              }}
              className="border-amber-700/50 text-amber-200 hover:bg-amber-900/20 hover:text-amber-100"
            >
              Explore Collection
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--background)] to-transparent" />
    </section>
  );
}
