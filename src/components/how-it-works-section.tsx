'use client';

import { motion } from 'framer-motion';
import { Search, Camera, ShoppingBag } from 'lucide-react';

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Browse & Discover',
    description: 'Explore our curated collections of luxury goods from the world\'s finest makers',
  },
  {
    icon: Camera,
    number: '02',
    title: 'Virtual Try-On',
    description: 'Upload a selfie and see how products look on you with our AI-powered virtual try-on technology',
  },
  {
    icon: ShoppingBag,
    number: '03',
    title: 'Shop & Gift',
    description: 'Purchase with confidence or send luxury gifts with our AI gift assistant and premium packaging',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works-section" className="relative py-20 sm:py-28 lg:py-32">
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
              <span className="text-amber-50">How It </span>
              <span className="luxury-accent-text">Works</span>
            </h2>
          </motion.div>

          {/* Steps */}
          <div className="flex flex-col gap-8 sm:gap-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                className="group flex gap-5 sm:gap-6"
              >
                {/* Step indicator */}
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/15 bg-amber-500/[0.06] transition-all duration-300 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 flex-shrink-0">
                  <step.icon className="h-6 w-6 luxury-accent-text" />
                </div>

                {/* Step content */}
                <div className="pt-1">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] luxury-accent-text opacity-60" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                    Step {step.number}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-amber-100 sm:text-xl" style={{ fontFamily: 'Lora, serif' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-amber-200/45 leading-relaxed" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
