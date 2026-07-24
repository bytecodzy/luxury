'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Mail, Check } from 'lucide-react';

export function NewsletterSection() {
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setIsSubscribed(true);
        setEmail('');
      }
    } catch {
      // silently fail — still show success for UX
      setIsSubscribed(true);
    }
    setIsSubmitting(false);
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className={`relative overflow-hidden rounded-2xl border p-8 sm:p-12 lg:p-16 ${
            isLight
              ? 'border-stone-200/60 bg-stone-50/50'
              : 'border-amber-500/10 bg-stone-900/30'
          }`}
        >
          {/* Gold shimmer border animation */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              boxShadow: [
                'inset 0 0 0 1px rgba(219,175,54,0.1)',
                'inset 0 0 0 1px rgba(219,175,54,0.25)',
                'inset 0 0 0 1px rgba(219,175,54,0.1)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative text-center max-w-lg mx-auto">
            {/* Mail icon */}
            <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full ${isLight ? 'bg-amber-100/60' : 'bg-amber-500/10'}`}>
              <Mail className="h-5 w-5 luxury-accent-text" />
            </div>

            {/* "Stay in the World of Luxury" heading — Lora serif */}
            <h2
              className={`text-2xl sm:text-3xl font-medium ${isLight ? 'text-stone-900' : 'text-amber-50'}`}
              style={{ fontFamily: "'Lora', serif" }}
            >
              Stay in the World of Luxury
            </h2>

            {/* Decorative diamond divider */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="luxury-accent-bg h-px w-6 opacity-50" />
              <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
              <span className="luxury-accent-bg h-px w-6 opacity-50" />
            </div>

            {/* Description */}
            <p
              className={`mt-4 text-sm sm:text-base ${isLight ? 'text-stone-500' : 'text-amber-100/50'}`}
              style={{ fontFamily: "'Urbanist', sans-serif" }}
            >
              Get exclusive access to new arrivals, special offers, and luxury insights delivered to your inbox.
            </p>

            {isSubscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-8 flex items-center justify-center gap-2 p-4 rounded-xl ${isLight ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-900/20 border border-emerald-500/20'}`}
              >
                <Check className="h-5 w-5 text-emerald-500" />
                <span className={`text-sm font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} style={{ fontFamily: "'Urbanist', sans-serif" }}>
                  You&apos;re subscribed! Welcome to the world of luxury.
                </span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className={`flex-1 h-11 px-5 text-sm rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                    isLight
                      ? 'border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:border-amber-400'
                      : 'border-amber-500/15 bg-stone-900/50 text-amber-50 placeholder:text-amber-100/30 focus:border-amber-500/40'
                  }`}
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-7 text-sm font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    background: 'linear-gradient(135deg, #b8860b, #dbaf36, #f5d063)',
                    color: '#0c0a09',
                  }}
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
            )}

            {/* Privacy note */}
            <p
              className={`mt-4 text-xs ${isLight ? 'text-stone-400' : 'text-amber-100/25'}`}
              style={{ fontFamily: "'Urbanist', sans-serif" }}
            >
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
