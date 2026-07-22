'use client';

import { motion } from 'framer-motion';
import { Search, Camera, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

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
    <section id="how-it-works-section" className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-72 w-72 rounded-full blur-[150px] luxury-glow-bg" style={{ opacity: 0.3 }} />
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
              Simple & Elegant
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-amber-50/90">How It </span>
              <span className="gold-shimmer">Works</span>
            </h2>
          </motion.div>

          {/* Main content */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left - Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative order-2 lg:order-1"
            >
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 shadow-2xl shadow-black/30">
                <div className="aspect-[4/3] relative bg-gradient-to-br from-stone-900 to-stone-950">
                  <Image
                    src="/images/infographics/how-it-works.png"
                    alt="How 3 Boxes Luxury Works"
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
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] -z-10" />
            </motion.div>

            {/* Right - Steps */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col gap-6 order-1 lg:order-2"
            >
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
                  className="group relative flex gap-5"
                >
                  {/* Step indicator with connecting line */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/15 bg-amber-500/[0.06] backdrop-blur-sm transition-all duration-300 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 flex-shrink-0">
                      <step.icon className="h-6 w-6 luxury-accent-text" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="mt-2 h-12 w-px bg-gradient-to-b from-amber-500/20 to-transparent" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="pt-1 pb-4">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] luxury-accent-text opacity-60">
                      Step {step.number}
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-amber-100 sm:text-xl">
                      {step.title}
                    </h3>
                    <p className="text-sm text-amber-200/45 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
