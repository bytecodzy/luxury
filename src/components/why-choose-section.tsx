'use client';

import { motion } from 'framer-motion';
import { Cpu, BadgeCheck, Gift, Shield } from 'lucide-react';

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
    <section id="why-choose-section" className="relative py-20 sm:py-28 lg:py-32">
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
              <span className="text-amber-50">Why Choose </span>
              <span className="luxury-accent-text">3 Boxes Luxury</span>
            </h2>
          </motion.div>

          {/* Features grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="group rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-6 transition-all duration-300 hover:border-amber-500/25 hover:bg-amber-500/[0.06]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl luxury-glow-bg transition-colors group-hover:bg-amber-500/15">
                  <feature.icon className="h-5 w-5 luxury-accent-text" />
                </div>
                <h3 className="mb-2 text-base font-bold text-amber-100" style={{ fontFamily: 'Lora, serif' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-amber-200/45 leading-relaxed" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
