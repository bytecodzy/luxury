'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Gift, Sparkles, ArrowRight, Crown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function HeroSection() {
  const { setView, setCategory, toggleGiftBuilder } = useStore();
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      {/* Subtle luxury background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900/80 to-stone-950" />

      {/* Decorative golden accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full bg-amber-500/[0.04] blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-48 w-48 rounded-full bg-amber-600/[0.03] blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center text-center"
        >
          {/* Luxury Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5"
          >
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400/90">
              {t('hero.curatedLuxury')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          >
            <span className="luxury-text">3 BOXES</span>{' '}
            <span className="text-amber-50">LUXURY</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-3 max-w-lg text-sm text-amber-100/60 sm:text-base"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              onClick={() => {
                setCategory(null);
                setView('home');
              }}
              className="bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25 gap-2"
            >
              {t('hero.shopNow')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={toggleGiftBuilder}
              className="border-amber-500/50 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 hover:text-amber-100 hover:border-amber-500/60 gap-2"
            >
              <Gift className="h-4 w-4" />
              {t('hero.giftBuilder')}
              <Sparkles className="h-3 w-3 text-amber-400/70" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
    </section>
  );
}
