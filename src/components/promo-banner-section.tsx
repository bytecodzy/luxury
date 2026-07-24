'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function PromoBannerSection() {
  const { setCategory, setView } = useStore();
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';

  const handleShopNow = () => {
    setCategory(null);
    setView('home');
    setTimeout(() => {
      const el = document.getElementById('products-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: isLight
              ? 'linear-gradient(135deg, #fdf9f1, #f5e6a3, #dbaf36, #b8860b)'
              : 'linear-gradient(135deg, #1c1917, #3d2e0a, #dbaf36, #b8860b)',
          }}
        >
          {/* Gold shimmer background animation */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                'linear-gradient(90deg, transparent 0%, rgba(245,208,99,0.15) 50%, transparent 100%)',
                'linear-gradient(180deg, transparent 0%, rgba(245,208,99,0.15) 50%, transparent 100%)',
                'linear-gradient(270deg, transparent 0%, rgba(245,208,99,0.15) 50%, transparent 100%)',
                'linear-gradient(360deg, transparent 0%, rgba(245,208,99,0.15) 50%, transparent 100%)',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />

          {/* Content */}
          <div className="relative py-12 sm:py-16 lg:py-20 px-6 sm:px-8 text-center">
            {/* "20% OFF" heading with gold gradient on "% OFF" */}
            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
              style={{ fontFamily: "'Lora', serif" }}
            >
              <span className={isLight ? 'text-stone-900' : 'text-amber-50'}>20</span>
              <span
                className="luxury-accent-gradient-text"
                style={{
                  background: 'linear-gradient(135deg, #b8860b, #dbaf36, #f5d063)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                % OFF
              </span>
            </h2>

            {/* Use Code text */}
            <p
              className={`mt-4 text-sm sm:text-base font-medium ${isLight ? 'text-stone-700/80' : 'text-amber-100/60'}`}
              style={{ fontFamily: "'Urbanist', sans-serif" }}
            >
              Use Code: <span className="luxury-accent-text font-semibold">3BOXES20</span> at checkout
            </p>

            {/* Decorative diamond divider */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="luxury-accent-bg h-px w-6 opacity-40" />
              <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-50" />
              <span className="luxury-accent-bg h-px w-6 opacity-40" />
            </div>

            {/* Shop Now CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-8"
            >
              <Button
                onClick={handleShopNow}
                className="group gap-2 h-11 px-8 text-sm font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30"
                style={{
                  fontFamily: 'Urbanist, sans-serif',
                  background: 'linear-gradient(135deg, #b8860b, #dbaf36, #f5d063)',
                  color: '#0c0a09',
                }}
              >
                Shop Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
