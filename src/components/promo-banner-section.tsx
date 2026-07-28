'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Facebook,
  Twitter,
  Youtube,
  Instagram,
  Smartphone,
  Apple,
  Play,
} from 'lucide-react';
import { useState } from 'react';
import { showToast } from '@/hooks/use-toast-notification';

/* ═════════════════════════════════════════════════════════════════════
   PromoBannerSection
   ─────────────────────────────────────────────────────────────────────
   A two-block luxury promo banner that mirrors the Myntra-style layout
   from the reference screenshot, re-skinned in the 3 BOXES LUXURY royal
   gold theme.

   Layout:
     ┌─────────────────────────────────────────────────────────────┐
     │  HERO:   20% OFF  ·  Use Code: [3BOXES20] at checkout       │
     │          [Shop Now →]                                       │
     ├──────────────────────┬──────────────────────────────────────┤
     │  LEFT (mobile/app)   │  RIGHT (trust badges)                │
     │  EXPERIENCE 3 BOXES  │  ✓ 100% AUTHENTIC guarantee          │
     │  LUXURY ON MOBILE    │       for all products at            │
     │  [Google Play][App ] │       3boxesluxury.com               │
     │                      │                                      │
     │  KEEP IN TOUCH       │  ↻ Return within 14 days             │
     │  [f][t][yt][ig]      │       of receiving your order        │
     └──────────────────────┴──────────────────────────────────────┘
   ═════════════════════════════════════════════════════════════════════ */

export function PromoBannerSection() {
  const { setCategory, setView } = useStore();
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';

  const [copied, setCopied] = useState(false);

  /* ── Hero CTA ──────────────────────────────────────────────────────── */
  const handleShopNow = () => {
    setCategory(null);
    setView('home');
    setTimeout(() => {
      const el = document.getElementById('products-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  /* ── Copy coupon to clipboard ──────────────────────────────────────── */
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('3BOXES20');
      setCopied(true);
      showToast('success', 'Code copied — apply 3BOXES20 at checkout');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('info', 'Coupon code: 3BOXES20');
    }
  };

  /* ── App install (reuses PWA install event used by footer.tsx) ─────── */
  const handleInstallApp = () => {
    window.dispatchEvent(new Event('trigger-pwa-install'));
    const el = document.getElementById('app-download-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Social links (kept identical to footer for consistency) ──────── */
  const socials = [
    { Icon: Facebook,  href: 'https://facebook.com/3boxesluxury',  label: 'Facebook'  },
    { Icon: Twitter,   href: 'https://twitter.com/3boxesluxury',   label: 'Twitter'   },
    { Icon: Youtube,   href: 'https://youtube.com/3boxesluxury',  label: 'YouTube'   },
    { Icon: Instagram, href: 'https://instagram.com/3boxesluxury', label: 'Instagram' },
  ];

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <section className="py-12 sm:py-16" aria-label="Promo banner">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/15"
          style={{
            background: isLight
              ? 'linear-gradient(135deg, #fdf9f1 0%, #f5e6a3 45%, #dbaf36 80%, #b8860b 100%)'
              : 'linear-gradient(135deg, #1c1917 0%, #2a1f0a 45%, #3d2e0a 75%, #1c1917 100%)',
          }}
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                'linear-gradient(90deg, transparent 0%, rgba(245,208,99,0.12) 50%, transparent 100%)',
                'linear-gradient(180deg, transparent 0%, rgba(245,208,99,0.12) 50%, transparent 100%)',
                'linear-gradient(270deg, transparent 0%, rgba(245,208,99,0.12) 50%, transparent 100%)',
                'linear-gradient(360deg, transparent 0%, rgba(245,208,99,0.12) 50%, transparent 100%)',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Soft radial gold glow */}
          <div
            className="absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              width: 480,
              height: 480,
              background: isLight
                ? 'radial-gradient(circle, rgba(219,175,54,0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(219,175,54,0.18) 0%, transparent 70%)',
            }}
          />

          <div className="relative p-6 sm:p-8 lg:p-10">
            {/* ═════════════════════════════════════════════════════════════
                HERO — 20% OFF · 3BOXES20
                ═════════════════════════════════════════════════════════ */}
            <div className="text-center">
              {/* Eyebrow chip */}
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
                  isLight
                    ? 'border-amber-700/30 bg-amber-50/60 text-amber-900'
                    : 'border-amber-500/30 bg-amber-500/[0.08] text-amber-200'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full luxury-accent-bg" />
                Limited Time Offer
              </div>

              {/* 20% OFF headline */}
              <h2
                className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-6xl"
                style={{ fontFamily: "'Lora', serif" }}
              >
                <span className={isLight ? 'text-stone-900' : 'text-amber-50'}>20</span>
                <span
                  className="luxury-accent-gradient-text"
                  style={{
                    background: 'linear-gradient(135deg, #b8860b 0%, #dbaf36 50%, #f5d063 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  % OFF
                </span>
              </h2>

              {/* Use Code · chip · at checkout */}
              <div
                className={`mt-4 flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base ${
                  isLight ? 'text-stone-700/80' : 'text-amber-100/70'
                }`}
                style={{ fontFamily: "'Urbanist', sans-serif" }}
              >
                <span>Use Code:</span>

                {/* Click-to-copy coupon chip */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`group inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm font-semibold tracking-wider transition-all ${
                    isLight
                      ? 'border-amber-700/40 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-700/60'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-400/60'
                  }`}
                  aria-label="Copy coupon code 3BOXES20"
                >
                  3BOXES20
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
                  )}
                </button>

                <span>at First Order on App</span>
              </div>

              {/* Decorative diamond divider */}
              <div className="mt-5 flex items-center justify-center gap-2">
                <span className="luxury-accent-bg h-px w-6 opacity-40" />
                <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-50" />
                <span className="luxury-accent-bg h-px w-6 opacity-40" />
              </div>

              {/* Shop Now CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-7"
              >
                <Button
                  onClick={handleShopNow}
                  className="group gap-2 h-11 px-8 text-sm font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/30"
                  style={{
                    fontFamily: 'Urbanist, sans-serif',
                    background: 'linear-gradient(135deg, #b8860b 0%, #dbaf36 50%, #f5d063 100%)',
                    color: '#0c0a09',
                  }}
                >
                  Shop Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </motion.div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                Divider
                ═════════════════════════════════════════════════════════ */}
            <div
              className={`my-8 h-px w-full sm:my-10 ${
                isLight ? 'bg-amber-700/15' : 'bg-amber-500/15'
              }`}
            />

            {/* ═════════════════════════════════════════════════════════════
                Two-column block — Myntra-style footer-as-promo
                ═════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
              {/* ── LEFT COLUMN: App download + social ────────────────── */}
              <div>
                {/* Experience 3 BOXES LUXURY on mobile */}
                <h3
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                    isLight ? 'text-stone-800' : 'text-amber-200'
                  }`}
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  Experience 3 BOXES LUXURY on Mobile
                </h3>

                {/* App download badges */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {/* Google Play badge */}
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className={`group flex items-center gap-3 rounded-xl px-5 py-2.5 transition-all hover:scale-[1.03] ${
                      isLight
                        ? 'bg-stone-900 text-amber-50 hover:bg-stone-800'
                        : 'bg-stone-950 border border-amber-500/25 text-amber-50 hover:border-amber-500/50 hover:bg-stone-900'
                    }`}
                    aria-label="Install on Google Play"
                  >
                    <Play className="h-6 w-6 fill-current" />
                    <div className="text-left leading-tight">
                      <div className="text-[10px] font-normal uppercase tracking-wider opacity-70">
                        Get it on
                      </div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </button>

                  {/* App Store badge */}
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className={`group flex items-center gap-3 rounded-xl px-5 py-2.5 transition-all hover:scale-[1.03] ${
                      isLight
                        ? 'bg-stone-900 text-amber-50 hover:bg-stone-800'
                        : 'bg-stone-950 border border-amber-500/25 text-amber-50 hover:border-amber-500/50 hover:bg-stone-900'
                    }`}
                    aria-label="Download on the App Store"
                  >
                    <Apple className="h-6 w-6 fill-current" />
                    <div className="text-left leading-tight">
                      <div className="text-[10px] font-normal uppercase tracking-wider opacity-70">
                        Download on the
                      </div>
                      <div className="text-sm font-semibold">App Store</div>
                    </div>
                  </button>
                </div>

                {/* PWA install alternative (matches footer.tsx behavior) */}
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className={`mt-3 inline-flex items-center gap-1.5 text-xs transition-colors ${
                    isLight
                      ? 'text-stone-700/70 hover:text-amber-800'
                      : 'text-amber-200/50 hover:text-amber-200'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  or install the Progressive Web App — works offline &amp; fullscreen
                </button>

                {/* Keep in touch */}
                <h4
                  className={`mt-8 text-xs font-semibold uppercase tracking-[0.18em] ${
                    isLight ? 'text-stone-800/80' : 'text-amber-200/80'
                  }`}
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  Keep in Touch
                </h4>

                {/* Social icon row */}
                <div className="mt-3 flex items-center gap-3">
                  {socials.map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
                        isLight
                          ? 'bg-stone-900/90 text-amber-50 hover:bg-amber-600 hover:text-stone-900 hover:scale-105'
                          : 'bg-stone-800/70 text-amber-200/80 hover:bg-amber-500/15 hover:text-amber-200 hover:scale-105 border border-amber-500/15 hover:border-amber-500/40'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* ── RIGHT COLUMN: Trust badges ────────────────────────── */}
              <div className="flex flex-col gap-6 sm:gap-8">
                {/* Trust badge 1 — 100% Authentic */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${
                      isLight
                        ? 'border-amber-700/40 bg-amber-50/80 text-amber-800'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <p
                      className={`text-base font-semibold ${
                        isLight ? 'text-stone-900' : 'text-amber-50'
                      }`}
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      100% Authentic
                    </p>
                    <p
                      className={`mt-0.5 text-sm leading-relaxed ${
                        isLight ? 'text-stone-600/80' : 'text-amber-200/55'
                      }`}
                    >
                      guarantee for all products at{' '}
                      <span className={`font-medium ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                        3boxesluxury.com
                      </span>
                    </p>
                  </div>
                </div>

                {/* Trust badge 2 — Return within 14 days */}
                <div className="flex items-start gap-4">
                  <div
                    className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${
                      isLight
                        ? 'border-amber-700/40 bg-amber-50/80 text-amber-800'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    <RefreshCw className="h-6 w-6" />
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        isLight
                          ? 'bg-amber-700 text-amber-50'
                          : 'bg-amber-500 text-stone-950'
                      }`}
                    >
                      14
                    </span>
                  </div>
                  <div>
                    <p
                      className={`text-base font-semibold ${
                        isLight ? 'text-stone-900' : 'text-amber-50'
                      }`}
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      Return within 14 days
                    </p>
                    <p
                      className={`mt-0.5 text-sm leading-relaxed ${
                        isLight ? 'text-stone-600/80' : 'text-amber-200/55'
                      }`}
                    >
                      of receiving your order — no questions asked, hassle-free returns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
