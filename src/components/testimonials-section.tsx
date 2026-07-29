'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useRef } from 'react';

const testimonials = [
  {
    quote:
      'The jewelry collection is absolutely breathtaking. Every piece feels like it was handpicked just for me. The gift concierge made finding the perfect anniversary gift effortless.',
    author: 'Priya Sharma',
    role: 'Jewelry Collector',
    rating: 5,
  },
  {
    quote:
      'I discovered luxury watches I never knew existed. The virtual try-on feature was a game-changer — I could see exactly how each watch looked on my wrist before ordering.',
    author: 'Arjun Mehta',
    role: 'Watch Enthusiast',
    rating: 5,
  },
  {
    quote:
      'From sarees to fragrances, every product exudes quality. The curated bundles for family gifts saved me hours of browsing. Truly a one-stop luxury destination.',
    author: 'Natasha Kapoor',
    role: 'Fashion Connoisseur',
    rating: 5,
  },
  {
    quote:
      'Elegant packaging, timely delivery, and an unmatched shopping experience. The attention to detail on every order shows how much they care about their customers.',
    author: 'Rohan Verma',
    role: 'Regular Buyer',
    rating: 5,
  },
  {
    quote:
      'The corporate gifting portal is a lifesaver. We onboarded 200 recipients in minutes and everyone loved the curated hampers.',
    author: 'Aisha Khan',
    role: 'HR Director',
    rating: 5,
  },
  {
    quote:
      'The gold shimmer, the fragrances, the sarees — it feels like walking into a boutique. Truly a luxury destination online.',
    author: 'Meera Iyer',
    role: 'Long-time Client',
    rating: 5,
  },
];

// Random-looking but stable rotation for each card
const ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4];

export function TestimonialsSection() {
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Convert vertical wheel to horizontal scroll when hovering the testimonials
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollerRef.current) return;
    // Only hijack vertical scroll (deltaY); allow trackpad horizontal (deltaX) natively
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      scrollerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-medium ${
              isLight ? 'text-stone-900' : 'text-amber-50'
            }`}
            style={{ fontFamily: "'Lora', serif" }}
          >
            What Our Clients Say
          </h2>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="luxury-accent-bg h-px w-8 opacity-60" />
            <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
            <span className="luxury-accent-bg h-px w-8 opacity-60" />
          </div>
        </motion.div>
      </div>

      {/* Full-width rope + polaroids track */}
      <div className="relative w-full">
        {/* The rope — a horizontal twisted band across the whole section */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-12 h-3 z-10"
          style={{
            background:
              'repeating-linear-gradient(90deg, #8b5a2b 0px, #b98551 6px, #8b5a2b 12px, #6b4423 18px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25), inset 0 -2px 2px rgba(0,0,0,0.3)',
            borderRadius: '3px',
          }}
        />

        {/* Horizontal scroller for the polaroid cards */}
        <div
          ref={scrollerRef}
          onWheel={handleWheel}
          className="relative flex gap-6 sm:gap-8 overflow-x-auto pb-20 pt-6 px-8 sm:px-12 scroll-smooth"
          // style={{ scrollbarWidth: 'thin' }}
        >
          {testimonials.map((t, i) => {
            const rotate = ROTATIONS[i % ROTATIONS.length];
            return (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, type: 'spring', stiffness: 90 }}
                whileHover={{ rotate: 0, y: -6, scale: 1.03 }}
                style={{ rotate: `${rotate}deg`, transformOrigin: 'top center' }}
                className="relative flex-shrink-0 w-64 sm:w-72 md:w-80 pt-10"
              >
                {/* Clothespin (peg) sitting on top of the card */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 flex flex-col items-center">
                  {/* Metal spring line */}
                  <div className="h-2 w-6 rounded-sm bg-stone-400 shadow-sm" />
                  {/* Wooden peg */}
                  <div
                    className="h-6 w-4 rounded-b-sm"
                    style={{
                      background:
                        'linear-gradient(180deg, #d9a469 0%, #b57d3f 55%, #8a5a26 100%)',
                      boxShadow:
                        'inset -1px 0 1px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>

                {/* Polaroid card */}
                <div
                  className={`rounded-sm shadow-xl p-4 sm:p-5 pb-8 border ${
                    isLight
                      ? 'bg-[#fdfaf3] border-stone-200'
                      : 'bg-[#f6f1e4] border-stone-300/70'
                  }`}
                  style={{
                    boxShadow:
                      '0 10px 22px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Star rating */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 luxury-accent-text fill-current" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p
                    className="text-[13px] sm:text-sm leading-relaxed text-stone-700 line-clamp-6"
                    style={{ fontFamily: "'Urbanist', sans-serif" }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author strip on the bottom (like a handwritten caption) */}
                  <div className="mt-5 pt-3 border-t border-stone-300/60">
                    <p
                      className="text-sm font-semibold text-stone-900"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {t.author}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 tracking-wide uppercase luxury-accent-text opacity-80"
                      style={{ fontFamily: "'Urbanist', sans-serif" }}
                    >
                      {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}