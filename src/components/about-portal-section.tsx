'use client';

import { motion } from 'framer-motion';
import { Crown, Sparkles, Globe, Cpu } from 'lucide-react';

const stats = [
  { icon: Crown, value: '500+', label: 'Premium Brands' },
  { icon: Sparkles, value: '10,000+', label: 'Curated Products' },
  { icon: Cpu, value: 'AI-Powered', label: 'Virtual Try-On' },
  { icon: Globe, value: '50+', label: 'Countries Served' },
];

export function AboutPortalSection() {
  return (
    <section id="about-portal-section" className="relative py-20 sm:py-28 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <div className="mx-auto h-px w-12 luxury-accent-bg opacity-50 mb-6" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: 'Lora, serif' }}>
              <span className="text-amber-50">Discover </span>
              <span className="luxury-accent-text">3 Boxes Luxury</span>
            </h2>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-center text-base text-amber-100/50 sm:text-lg leading-relaxed mb-14" style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            3 Boxes Luxury is India&apos;s premier luxury gifting destination. We curate the finest watches, jewelry, leather goods, fragrances, and fashion from the world&apos;s most prestigious brands. Our AI-powered platform makes luxury accessible — from virtual try-ons to personalized gift recommendations, every experience is crafted to perfection.
          </motion.p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="group rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-5 sm:p-6 transition-all duration-300 hover:border-amber-500/25 hover:bg-amber-500/[0.06] text-center"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg luxury-glow-bg">
                  <stat.icon className="h-5 w-5 luxury-accent-text" />
                </div>
                <div className="text-2xl font-bold luxury-accent-text sm:text-3xl" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-amber-200/40 uppercase tracking-wider" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
