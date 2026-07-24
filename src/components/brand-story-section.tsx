'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Globe, ArrowRight } from 'lucide-react';

const stats = [
  { icon: Crown, value: '500+', label: 'Premium Brands' },
  { icon: Sparkles, value: '10K+', label: 'Curated Products' },
  { icon: Globe, value: '50+', label: 'Countries Served' },
];

export function BrandStorySection() {
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';

  return (
    <section className="py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left — Lifestyle image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-2xl"
          >
            <div className="aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]">
              <img
                src="/images/hero-bg-3.png"
                alt="Luxury lifestyle"
                className="h-full w-full object-cover rounded-2xl"
                loading="lazy"
              />
            </div>
            {/* Gold accent corner overlay */}
            <div
              className="absolute top-0 left-0 w-24 h-24 opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(219,175,54,0.2) 0%, transparent 60%)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-24 h-24 opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(315deg, rgba(219,175,54,0.2) 0%, transparent 60%)',
              }}
            />
          </motion.div>

          {/* Right — Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col"
          >
            {/* Gold accent line divider */}
            <div className="flex items-center gap-2 mb-6">
              <span className="luxury-accent-bg h-px w-6 opacity-60" />
              <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
              <span className="luxury-accent-bg h-px w-6 opacity-60" />
            </div>

            {/* "Where Elegance Meets Craft" heading — Lora serif */}
            <h2
              className={`text-3xl sm:text-4xl lg:text-5xl font-medium leading-tight ${isLight ? 'text-stone-900' : 'text-amber-50'}`}
              style={{ fontFamily: "'Lora', serif" }}
            >
              Where Elegance<br />
              <span className="luxury-accent-text">Meets Craft</span>
            </h2>

            {/* Brand description */}
            <p
              className={`mt-6 text-sm sm:text-base leading-relaxed ${isLight ? 'text-stone-600' : 'text-amber-100/50'}`}
              style={{ fontFamily: "'Urbanist', sans-serif" }}
            >
              3 Boxes Luxury is India&apos;s premier luxury gifting destination. We curate the finest watches, jewelry, leather goods, fragrances, and fashion from the world&apos;s most prestigious brands. Every experience is crafted to perfection — from personalized gift recommendations to virtual try-ons powered by advanced AI.
            </p>

            {/* Stats — 500+ Brands, 10K+ Products, 50+ Countries */}
            <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  className={`text-center rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
                    isLight
                      ? 'border-stone-200/60 bg-stone-50/50 hover:border-amber-400/30 hover:bg-amber-50/30'
                      : 'border-amber-500/10 bg-amber-500/[0.03] hover:border-amber-500/25 hover:bg-amber-500/[0.06]'
                  }`}
                >
                  <stat.icon className="h-4 w-4 luxury-accent-text mx-auto mb-2" />
                  <div
                    className="text-xl sm:text-2xl font-bold luxury-accent-text"
                    style={{ fontFamily: "'Urbanist', sans-serif" }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className={`mt-1 text-xs uppercase tracking-wider ${isLight ? 'text-stone-500' : 'text-amber-200/40'}`}
                    style={{ fontFamily: "'Urbanist', sans-serif" }}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Explore More — gold CTA */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-8"
            >
              <button
                onClick={() => {
                  const el = document.getElementById('about-portal-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group gap-2 inline-flex items-center text-sm font-medium transition-all duration-300 luxury-accent-text hover:opacity-80`}
                style={{ fontFamily: "'Urbanist', sans-serif" }}
              >
                Explore More
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
