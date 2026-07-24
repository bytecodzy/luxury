'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'The jewelry collection is absolutely breathtaking. Every piece feels like it was handpicked just for me. The gift concierge made finding the perfect anniversary gift effortless.',
    author: 'Priya Sharma',
    role: 'Jewelry Collector',
    rating: 5,
  },
  {
    quote: 'I discovered luxury watches I never knew existed. The virtual try-on feature was a game-changer — I could see exactly how each watch looked on my wrist before ordering.',
    author: 'Arjun Mehta',
    role: 'Watch Enthusiast',
    rating: 5,
  },
  {
    quote: 'From sarees to fragrances, every product exudes quality. The curated bundles for family gifts saved me hours of browsing. Truly a one-stop luxury destination.',
    author: 'Natasha Kapoor',
    role: 'Fashion Connoisseur',
    rating: 5,
  },
];

export function TestimonialsSection() {
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-medium ${isLight ? 'text-stone-900' : 'text-amber-50'}`}
            style={{ fontFamily: "'Lora', serif" }}
          >
            What Our Clients Say
          </h2>
          {/* Gold diamond divider */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="luxury-accent-bg h-px w-8 opacity-60" />
            <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
            <span className="luxury-accent-bg h-px w-8 opacity-60" />
          </div>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className={`relative overflow-hidden rounded-xl border p-6 sm:p-8 transition-all duration-300 group ${
                isLight
                  ? 'border-stone-200/60 bg-white/80 hover:border-amber-400/30 hover:bg-amber-50/30'
                  : 'border-amber-500/10 bg-stone-900/30 hover:border-amber-500/25 hover:bg-amber-500/[0.06]'
              }`}
            >
              {/* Gold shimmer border animation */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                  boxShadow: [
                    'inset 0 0 0 1px rgba(219,175,54,0.05)',
                    'inset 0 0 0 1px rgba(219,175,54,0.2)',
                    'inset 0 0 0 1px rgba(219,175,54,0.05)',
                  ],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              />

              {/* Quote icon — gold accent */}
              <div className={`mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full ${isLight ? 'bg-amber-100/60' : 'bg-amber-500/10'}`}>
                <Quote className="h-4 w-4 luxury-accent-text" />
              </div>

              {/* Star ratings — gold accent */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 luxury-accent-text fill-current"
                  />
                ))}
              </div>

              {/* Quote text */}
              <p
                className={`text-sm sm:text-base leading-relaxed ${isLight ? 'text-stone-600' : 'text-amber-100/50'}`}
                style={{ fontFamily: "'Urbanist', sans-serif" }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Author info */}
              <div className="mt-6 pt-4 border-t border-amber-500/10">
                <p
                  className={`text-sm font-medium ${isLight ? 'text-stone-800' : 'text-amber-50'}`}
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  {testimonial.author}
                </p>
                <p
                  className={`text-xs mt-1 luxury-accent-text opacity-70`}
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
