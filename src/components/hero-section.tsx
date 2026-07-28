'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
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
  const appTheme = useStore((s) => s.appTheme);

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      setIsTransitioning(false);
    }, 600);
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
    <section
  className="relative overflow-hidden w-screen"
  style={{
    minHeight: '70vh',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',
  }}
>
      {/* Slideshow background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_IMAGES[currentImageIndex]}')` }}
        />
      </AnimatePresence>

      {/* Gold shimmer/pulse overlay — rotating gold gradient */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'linear-gradient(135deg, transparent 0%, rgba(219,175,54,0.06) 25%, transparent 50%, rgba(219,175,54,0.04) 75%, transparent 100%)',
            'linear-gradient(225deg, transparent 0%, rgba(219,175,54,0.08) 25%, transparent 50%, rgba(219,175,54,0.05) 75%, transparent 100%)',
            'linear-gradient(315deg, transparent 0%, rgba(219,175,54,0.06) 25%, transparent 50%, rgba(219,175,54,0.04) 75%, transparent 100%)',
            'linear-gradient(135deg, transparent 0%, rgba(219,175,54,0.06) 25%, transparent 50%, rgba(219,175,54,0.04) 75%, transparent 100%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* Dark gradient overlay */}
      <div className={`absolute inset-0 ${appTheme === 'light' ? 'bg-gradient-to-b from-stone-100/60 via-stone-200/70 to-stone-100/80' : 'bg-gradient-to-b from-stone-950/70 via-stone-950/80 to-stone-950/90'}`} />

      {/* Content — vertically centered */}
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col items-center text-center max-w-3xl mx-auto"
        >
          {/* CURATED LUXURY Badge — small uppercase, thin gold border, Sparkles icon */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-5 py-2"
          >
            <Sparkles className="h-3.5 w-3.5 luxury-accent-text opacity-70" />
            <span
              className="text-[11px] font-medium uppercase tracking-[0.25em] luxury-accent-text opacity-80"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              {t('hero.curatedLuxury')}
            </span>
          </motion.div>

          {/* Headline — Lora serif, "3 BOXES LUXURY" */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-wide"
            style={{ fontFamily: 'Lora, serif' }}
          >
            <span className={appTheme === 'light' ? 'text-stone-900' : 'text-amber-50'}>3 BOXES</span>
            <br />
            <span className={`font-light tracking-[0.2em] ${appTheme === 'light' ? 'text-stone-700' : 'text-amber-50/80'}`}>LUXURY</span>
          </motion.h1>

          {/* Decorative gold diamond divider (line + rotated square + line) */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="my-6 flex items-center gap-2"
          >
            <span className="luxury-accent-bg h-px w-8 sm:w-12 opacity-50" />
            <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
            <span className="luxury-accent-bg h-px w-8 sm:w-12 opacity-50" />
          </motion.div>

          {/* Subtitle — "Where Elegance Meets Craft" */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.8 }}
            className={`max-w-xl text-base sm:text-lg md:text-xl leading-relaxed font-light ${appTheme === 'light' ? 'text-stone-600' : 'text-amber-100/60'}`}
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Where Elegance Meets Craft
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.8 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            {/* Explore Collection — gold gradient button */}
            <Button
              onClick={() => {
                setCategory(null);
                setView('home');
                setTimeout(scrollToProducts, 100);
              }}
              className="group gap-2 h-11 px-8 text-sm font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
              style={{
                fontFamily: 'Urbanist, sans-serif',
                background: 'linear-gradient(135deg, #b8860b, #dbaf36, #f5d063)',
                color: '#0c0a09',
              }}
            >
              {t('hero.shopNow') || 'Explore Collection'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            {/* Gift Concierge — outline button with Gift icon */}
            <Button
              variant="outline"
              onClick={toggleGiftBuilder}
              className={`group gap-2 h-11 px-7 text-sm font-medium rounded-full transition-all duration-300 ${appTheme === 'light' ? 'border-amber-600/25 text-amber-700/80 hover:bg-amber-500/10 hover:text-amber-800 hover:border-amber-600/40' : 'border-amber-500/25 text-amber-200/80 hover:bg-amber-500/10 hover:text-amber-100 hover:border-amber-500/40'}`}
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              <Gift className="h-4 w-4" />
              Gift Builder
            </Button>
          </motion.div>
        </motion.div>

        {/* Animated scroll-down indicator with bouncing ChevronDown */}
        {/* <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          onClick={scrollToProducts}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 group"
        >
          <span
            className={`text-[11px] uppercase tracking-[0.2em] transition-colors ${appTheme === 'light' ? 'text-amber-600/35 group-hover:text-amber-600/60' : 'text-amber-400/35 group-hover:text-amber-400/60'}`}
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className={`h-4 w-4 transition-colors ${appTheme === 'light' ? 'text-amber-600/35 group-hover:text-amber-600/60' : 'text-amber-400/35 group-hover:text-amber-400/60'}`} />
          </motion.div>
        </motion.button> */}
      </div>

      {/* Slide indicator dots with gold accent on active */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (i === currentImageIndex) return;
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentImageIndex(i);
                setIsTransitioning(false);
              }, 400);
            }}
            className={`rounded-full transition-all duration-500 ${
              i === currentImageIndex
                ? 'h-2.5 w-2.5 luxury-accent-bg opacity-80 shadow-md shadow-amber-500/30'
                : `h-2 w-2 ${appTheme === 'light' ? 'bg-amber-600/25 hover:bg-amber-600/50' : 'bg-amber-400/25 hover:bg-amber-400/50'}`
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
