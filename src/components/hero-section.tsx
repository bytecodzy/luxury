'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Gift, Sparkles, ArrowRight, Crown, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useCallback, useRef } from 'react';

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
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax effect
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const parallaxOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

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

  const scrollToAbout = () => {
    const el = document.getElementById('about-portal-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Parallax Background Layer */}
      <motion.div
        style={{ y: parallaxY }}
        className="absolute inset-0 w-full h-[130%] -top-[15%]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${HERO_IMAGES[currentImageIndex]}')` }}
          />
        </AnimatePresence>
      </motion.div>

      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/40 to-stone-950/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/60 via-transparent to-stone-950/60" />

      {/* Decorative ambient light using theme color */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] luxury-glow-bg" />
        <div className="absolute right-1/4 bottom-1/3 h-56 w-56 rounded-full blur-[100px] luxury-glow-bg" style={{ opacity: 0.6 }} />
        <div className="absolute left-1/2 top-0 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>

      {/* Floating particles using theme accent color */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="golden-particle"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 22}%`,
              width: `${1.5 + (i % 3)}px`,
              height: `${1.5 + (i % 3)}px`,
              background: `rgba(var(--luxury-accent-rgb, 212, 164, 55), ${0.12 + (i % 3) * 0.08})`,
              animationDuration: `${9 + i * 2}s`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}
      </div>

      {/* Content — vertically centered in viewport */}
      <motion.div
        style={{ opacity: parallaxOpacity }}
        className="relative flex min-h-[100vh] flex-col items-center justify-center px-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          {/* Luxury Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-6 py-2.5 backdrop-blur-md"
          >
            <Crown className="h-4 w-4 luxury-accent-text" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] luxury-accent-text" style={{ opacity: 0.85 }}>
              {t('hero.curatedLuxury')}
            </span>
          </motion.div>

          {/* Headline — more refined typography */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 1 }}
            className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05]"
          >
            <span className="gold-shimmer">3 BOXES</span>
            <br />
            <span className="text-amber-50/90 font-light tracking-[0.15em]">LUXURY</span>
          </motion.h1>

          {/* Ornamental divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.75, duration: 1 }}
            className="my-7 flex items-center gap-3"
          >
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/40 sm:w-24" />
            <div className="h-1 w-1 rotate-45 border luxury-accent-border bg-amber-500/20" />
            <div className="h-px w-4 luxury-accent-bg opacity-30" />
            <div className="h-2 w-2 rotate-45 border luxury-accent-border bg-amber-500/10" />
            <div className="h-px w-4 luxury-accent-bg opacity-30" />
            <div className="h-1 w-1 rotate-45 border luxury-accent-border bg-amber-500/20" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/40 sm:w-24" />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="max-w-2xl text-base text-amber-100/55 sm:text-lg md:text-xl leading-relaxed font-light"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-5"
          >
            <Button
              onClick={() => {
                setCategory(null);
                setView('home');
                setTimeout(scrollToProducts, 100);
              }}
              className="group relative overflow-hidden bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400 transition-all duration-500 hover:shadow-xl hover:shadow-amber-600/30 gap-2 h-12 px-8 text-sm font-semibold rounded-full"
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
              className="border-amber-500/25 bg-amber-500/[0.05] text-amber-300 hover:bg-amber-500/15 hover:text-amber-100 hover:border-amber-500/50 gap-2 backdrop-blur-md h-12 px-7 text-sm font-medium rounded-full transition-all duration-300"
            >
              <Gift className="h-4 w-4" />
              {t('hero.giftBuilder')}
              <Sparkles className="h-3.5 w-3.5 luxury-accent-text opacity-60" />
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-12 flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-amber-200/25"
          >
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full luxury-accent-bg opacity-40" />
              Premium Quality
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full luxury-accent-bg opacity-40" />
              Curated Selection
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full luxury-accent-bg opacity-40" />
              AI Style Preview
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator — luxury styling */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          onClick={scrollToAbout}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 group"
        >
          <span className="text-[9px] uppercase tracking-[0.25em] text-amber-400/30 group-hover:text-amber-400/60 transition-colors">Discover</span>
          <div className="relative">
            <div className="h-10 w-6 rounded-full border border-amber-500/20 group-hover:border-amber-500/40 transition-colors flex items-start justify-center pt-2">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-1.5 w-1.5 rounded-full luxury-accent-bg opacity-60"
              />
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* Slide indicator dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
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
                ? 'h-1 w-10 bg-gradient-to-r from-amber-500/80 to-amber-400/60'
                : 'h-1 w-1 bg-amber-400/20 hover:bg-amber-400/40'
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
