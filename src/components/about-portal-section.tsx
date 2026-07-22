'use client';

import { motion } from 'framer-motion';
import { Crown, Sparkles, Globe, Cpu } from 'lucide-react';
import Image from 'next/image';

const stats = [
  { icon: Crown, value: '500+', label: 'Premium Brands' },
  { icon: Sparkles, value: '10,000+', label: 'Curated Products' },
  { icon: Cpu, value: 'AI-Powered', label: 'Virtual Try-On' },
  { icon: Globe, value: '50+', label: 'Countries Served' },
];

export function AboutPortalSection() {
  return (
    <section id="about-portal-section" className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-1/3 h-64 w-64 rounded-full blur-[150px] luxury-glow-bg" style={{ opacity: 0.4 }} />
        <div className="absolute right-0 bottom-1/4 h-48 w-48 rounded-full blur-[120px] luxury-glow-bg" style={{ opacity: 0.3 }} />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] luxury-accent-text" style={{ opacity: 0.8 }}>
              About Us
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-amber-50/90">Discover </span>
              <span className="gold-shimmer">3 Boxes Luxury</span>
            </h2>
          </motion.div>

          {/* Main content - split layout */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left - Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 shadow-2xl shadow-black/30">
                <div className="aspect-[4/3] relative bg-gradient-to-br from-stone-900 to-stone-950">
                  <Image
                    src="/images/infographics/about-portal.png"
                    alt="About 3 Boxes Luxury Portal"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  {/* Decorative overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/30 to-transparent" />
                </div>
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] -z-10" />
              <div className="absolute -top-4 -left-4 h-16 w-16 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] -z-10" />
            </motion.div>

            {/* Right - Text & Stats */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col"
            >
              <p className="text-base text-amber-100/55 sm:text-lg leading-relaxed mb-8">
                3 Boxes Luxury is India&apos;s premier luxury gifting destination. We curate the finest watches, jewelry, leather goods, fragrances, and fashion from the world&apos;s most prestigious brands. Our AI-powered platform makes luxury accessible — from virtual try-ons to personalized gift recommendations, every experience is crafted to perfection.
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                    className="group rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/25 hover:bg-amber-500/[0.06]"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg luxury-glow-bg">
                      <stat.icon className="h-5 w-5 luxury-accent-text" />
                    </div>
                    <div className="text-2xl font-bold gold-shimmer sm:text-3xl">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs text-amber-200/40 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
