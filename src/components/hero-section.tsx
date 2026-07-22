'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, ArrowRight, Crown, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useCallback } from 'react';

const HERO_IMAGES = [
  '/images/hero-bg.png',
  '/images/hero-bg-2.png',
  '/images/hero-bg-3.png',
  '/images/hero-bg-4.png',
];

const SLIDE_INTERVAL = 6000;

export function HeroSection() {
  const { setView, setCategory, toggleGiftBuilder } = useStore();
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      setIsTransitioning(false);
    }, 800);
  }, []);

  useEffect(() => {
    const timer = setInterval(advanceSlide, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [advanceSlide]);

  const scrollToProducts = () => {
    const el = document.getElementById('products-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '92vh' }}>
      {/* Rotating Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_IMAGES[currentImageIndex]}')` }}
        />
      </AnimatePresence>

      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/90 via-stone-950/50 to-stone-950/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-transparent to-stone-950/70" />

      {/* Decorative golden ambient light */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.04] blur-[100px]" />
        <div className="absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-amber-600/[0.03] blur-[80px]" />
        <div className="absolute left-1/2 top-0 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>

      {/* Floating golden particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="golden-particle"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              background: `rgba(212, 164, 55, ${0.15 + (i % 3) * 0.1})`,
              animationDuration: `${8 + i * 2}s`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content — vertically centered in viewport */}
      <div className="relative flex min-h-[92vh] flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center text-center"
        >
          {/* Luxury Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-5 py-2 backdrop-blur-md"
          >
            <Crown className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/90">
              {t('hero.curatedLuxury')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="gold-shimmer">3 BOXES</span>{' '}
            <span className="text-amber-50/90">LUXURY</span>
          </motion.h1>

          {/* Ornamental divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="my-5 flex items-center gap-3"
          >
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/50 sm:w-20" />
            <div className="h-1.5 w-1.5 rotate-45 border border-amber-500/50 bg-amber-500/30" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50 sm:w-20" />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="max-w-xl text-sm text-amber-100/60 sm:text-base md:text-lg leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              onClick={() => {
                setCategory(null);
                setView('home');
                setTimeout(scrollToProducts, 100);
              }}
              className="group relative overflow-hidden bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400 transition-all duration-500 hover:shadow-xl hover:shadow-amber-600/30 gap-2 h-11 px-7 text-sm font-semibold rounded-full"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('hero.shopNow')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-white/20 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleGiftBuilder}
              className="border-amber-500/30 bg-amber-500/[0.06] text-amber-300 hover:bg-amber-500/15 hover:text-amber-100 hover:border-amber-500/50 gap-2 backdrop-blur-md h-11 px-6 text-sm font-medium rounded-full transition-all duration-300"
            >
              <Gift className="h-4 w-4" />
              {t('hero.giftBuilder')}
              <Sparkles className="h-3.5 w-3.5 text-amber-400/60" />
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-10 flex items-center gap-6 text-[10px] uppercase tracking-[0.15em] text-amber-200/30"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-amber-500/40" />
              Premium Quality
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-amber-500/40" />
              Curated Selection
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-amber-500/40" />
              AI Style Preview
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          onClick={scrollToProducts}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-amber-400/40 hover:text-amber-400/70 transition-colors"
        >
          <span className="text-[9px] uppercase tracking-[0.2em]">Explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>
      </div>

      {/* Slide indicator dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentImageIndex(i);
                setIsTransitioning(false);
              }, 400);
            }}
            className={`rounded-full transition-all duration-700 ${
              i === currentImageIndex
                ? 'h-1 w-8 bg-gradient-to-r from-amber-500/80 to-amber-400/60'
                : 'h-1 w-1 bg-amber-400/25 hover:bg-amber-400/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Bottom golden line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </section>
  );
}
