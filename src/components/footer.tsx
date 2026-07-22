'use client';

import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { Smartphone, Download, Phone, Mail, MessageCircle, Crown } from 'lucide-react';
import { useStore, type View } from '@/lib/store';
import { motion } from 'framer-motion';

export function Footer() {
  const { t } = useTranslation();
  const setView = useStore((s) => s.setView);

  const handleInstallApp = () => {
    // Try to trigger PWA install prompt
    const event = new Event('trigger-pwa-install');
    window.dispatchEvent(event);

    // Fallback: scroll to the app download section
    const downloadSection = document.getElementById('app-download');
    if (downloadSection) {
      downloadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="mt-auto relative overflow-hidden">
      {/* Top gradient border */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      {/* Main footer with gradient */}
      <div className="bg-gradient-to-b from-stone-950 via-stone-950 to-stone-950">
        {/* Upper section with subtle background pattern */}
        <div className="relative">
          {/* Decorative ambient glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-0 h-48 w-48 rounded-full blur-[100px] luxury-glow-bg" style={{ opacity: 0.15 }} />
            <div className="absolute right-1/4 top-0 h-48 w-48 rounded-full blur-[100px] luxury-glow-bg" style={{ opacity: 0.1 }} />
          </div>

          <div className="relative container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6">
              {/* Brand */}
              <div className="sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <Image
                      src="/images/logo-uploaded.png"
                      alt="3 Boxes Luxury Logo"
                      width={64}
                      height={64}
                      className="h-16 w-16 object-contain contrast-150 brightness-130 saturate-130 mix-blend-lighten drop-shadow-[0_0_14px_rgba(255,215,0,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]"
                    />
                  </div>
                  <h3 className="gold-shimmer text-lg font-bold tracking-widest">
                    3 BOXES LUXURY
                  </h3>
                </div>
                <p className="mt-3 text-sm text-amber-200/45 leading-relaxed">
                  {t('footer.description')}
                </p>
                {/* Social / Contact Icons */}
                <div className="mt-5 flex items-center gap-3">
                  <a
                    href="https://wa.me/919611533511"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chat on WhatsApp"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/[0.04] text-amber-200/50 transition-all duration-300 hover:bg-amber-600/15 hover:text-amber-300 hover:border-amber-500/30 hover:-translate-y-0.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  <a
                    href="tel:+919611533511"
                    aria-label="Call us"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/[0.04] text-amber-200/50 transition-all duration-300 hover:bg-amber-600/15 hover:text-amber-300 hover:border-amber-500/30 hover:-translate-y-0.5"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <a
                    href="mailto:info@3boxes.in"
                    aria-label="Email us"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/[0.04] text-amber-200/50 transition-all duration-300 hover:bg-amber-600/15 hover:text-amber-300 hover:border-amber-500/30 hover:-translate-y-0.5"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Shop */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] luxury-accent-text" style={{ opacity: 0.75 }}>
                  {t('footer.shop')}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {[
                    t('categories.watches'),
                    t('categories.jewelry'),
                    t('categories.leatherGoods'),
                    t('categories.fragrances'),
                    t('categories.fashion'),
                    t('categories.homeLiving'),
                    t('categories.sarees'),
                    'Kids Fashion',
                  ].map((item, i) => (
                    <li key={i}>
                      <span
                        className="text-sm text-amber-200/40 transition-colors hover:text-amber-400 cursor-pointer"
                        onClick={() => setView('shop')}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] luxury-accent-text" style={{ opacity: 0.75 }}>
                  {t('footer.company')}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {([
                    { label: t('footer.aboutUs'), view: 'about' as View },
                    { label: t('footer.ourDivisions'), view: 'divisions' as View },
                    { label: t('footer.careers'), view: 'careers' as View },
                    { label: t('footer.press'), view: 'press' as View },
                    { label: t('footer.sustainability'), view: 'sustainability' as View },
                  ]).map((item, i) => (
                    <li key={i}>
                      <span
                        className="text-sm text-amber-200/40 transition-colors hover:text-amber-400 cursor-pointer"
                        onClick={() => setView(item.view)}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] luxury-accent-text" style={{ opacity: 0.75 }}>
                  {t('footer.support')}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  <li>
                    <span
                      className="text-sm text-amber-200/40 transition-colors hover:text-amber-400 cursor-pointer"
                      onClick={() => setView('contact')}
                    >
                      {t('footer.contactUs')}
                    </span>
                    <p className="mt-0.5 text-xs text-amber-200/25">
                      info@3boxes.in · +91 9611533511
                    </p>
                  </li>
                  {([
                    { label: t('footer.shippingReturns'), view: 'shipping' as View },
                    { label: t('footer.faq'), view: 'faq' as View },
                    { label: t('footer.sizeGuide'), view: 'size-guide' as View },
                    { label: t('footer.trackOrder'), view: 'track-order' as View },
                  ]).map((item, i) => (
                    <li key={i}>
                      <span
                        className="text-sm text-amber-200/40 transition-colors hover:text-amber-400 cursor-pointer"
                        onClick={() => setView(item.view)}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Policies */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] luxury-accent-text" style={{ opacity: 0.75 }}>
                  {t('footer.policies')}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {([
                    { label: t('footer.privacyPolicy'), view: 'privacy-policy' as View },
                    { label: t('footer.termsOfService'), view: 'terms-of-service' as View },
                    { label: t('footer.securityPolicy'), view: 'security-policy' as View },
                    { label: t('footer.cookiePolicy'), view: 'cookie-policy' as View },
                    { label: t('footer.refundPolicy'), view: 'refund-policy' as View },
                  ]).map((item, i) => (
                    <li key={i}>
                      <span
                        className="text-sm text-amber-200/40 transition-colors hover:text-amber-400 cursor-pointer"
                        onClick={() => setView(item.view)}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Install App Section - Full Width */}
            <div className="mt-10 border-t border-amber-500/10 pt-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] luxury-accent-text" style={{ opacity: 0.75 }}>
                    Install App
                  </h4>
                  <p className="mt-1.5 text-sm text-amber-200/40">
                    Install our app directly — no app store needed. Shop luxury gifts on the go.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleInstallApp}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-600/10 px-4 py-2.5 text-sm text-amber-300 transition-colors hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-500/35"
                  >
                    <Smartphone className="h-4 w-4" />
                    Install Android App
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => window.open('/app/', '_blank')}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-stone-900/50 px-4 py-2.5 text-sm text-amber-200/50 transition-colors hover:bg-stone-800/50 hover:text-amber-200 hover:border-amber-500/25"
                  >
                    <Download className="h-4 w-4" />
                    Flutter Web App
                  </motion.button>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800/50">
                      <Crown className="h-4 w-4 luxury-accent-text opacity-50" />
                    </div>
                    <div className="text-[10px] text-amber-200/25">
                      Progressive Web App<br />Works offline &amp; fullscreen
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="border-t border-amber-500/10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
              <p className="text-xs text-amber-200/30">
                &copy; 2024 3 Boxes Luxury Curations. {t('footer.rights')} {t('footer.crafted')}
              </p>
              <p className="text-xs text-amber-200/20">
                Bengaluru, India | info@3boxes.in | +91 9611533511
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
