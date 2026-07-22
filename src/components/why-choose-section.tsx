'use client';

import { motion } from 'framer-motion';
import { Cpu, BadgeCheck, Gift, Shield } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: Cpu,
    title: 'AI-Powered Experience',
    description: 'Virtual try-on, style recommendations, and personalized suggestions powered by advanced AI',
  },
  {
    icon: BadgeCheck,
    title: 'Curated Selection',
    description: 'Every product handpicked by our luxury experts for quality, craftsmanship, and exclusivity',
  },
  {
    icon: Gift,
    title: 'Gift Concierge',
    description: 'AI gift assistant that understands relationships, occasions, and preferences to find the perfect gift',
  },
  {
    icon: Shield,
    title: 'Secure & Trusted',
    description: 'Bank-grade security, authentic products, and hassle-free returns for complete peace of mind',
  },
];

export function WhyChooseSection() {
  return (
    <section id="why-choose-section" className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-[150px] luxury-glow-bg" style={{ opacity: 0.3 }} />
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
              Our Promise
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-amber-50/90">Why Choose </span>
              <span className="gold-shimmer">3 Boxes Luxury</span>
            </h2>
          </motion.div>

          {/* Main content */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left - Feature cards */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  className="group rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/25 hover:bg-amber-500/[0.06] hover:-translate-y-1"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl luxury-glow-bg transition-colors group-hover:bg-amber-500/15">
                    <feature.icon className="h-6 w-6 luxury-accent-text" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-amber-100">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-amber-200/45 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Right - Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 shadow-2xl shadow-black/30">
                <div className="aspect-[4/3] relative bg-gradient-to-br from-stone-900 to-stone-950">
                  <Image
                    src="/images/infographics/why-choose-us.png"
                    alt="Why Choose 3 Boxes Luxury"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/30 to-transparent" />
                </div>
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 h-28 w-28 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] -z-10" />
              <div className="absolute -top-4 -left-4 h-20 w-20 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] -z-10" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
