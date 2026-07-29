'use client';

import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { Smartphone, Download, Phone, Mail, MessageCircle } from 'lucide-react';
import { useStore } from '@/lib/store';

export function Footer() {
  const { t } = useTranslation();
  const setView = useStore((s) => s.setView);
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';

  const handleInstallApp = () => {
    // Try to trigger PWA install prompt
    const event = new Event('trigger-pwa-install');
    window.dispatchEvent(event);

    // Fallback: scroll to the app download section
    const downloadSection = document.getElementById('app-download-section');
    if (downloadSection) {
      downloadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="mt-auto border-t border-amber-900/30 bg-stone-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <Image
                  src="/images/logo-uploaded.png"
                  alt="3 Boxes Luxury Logo"
                  width={256}
                  height={256}
                  className={`h-64 w-64 object-contain ${
                    isLight
                      ? 'contrast-110 brightness-95 saturate-130'
                      : 'contrast-150 brightness-130 saturate-130 mix-blend-lighten drop-shadow-[0_0_14px_rgba(255,215,0,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]'
                  }`}
                />
              </div>
             
            </div>
            <p className="mt-2 text-sm text-amber-200/50">
              {t('footer.description')}
            </p>
            {/* Social / Contact Icons */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://wa.me/919611533511"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="tel:+919611533511"
                aria-label="Call us"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href="mailto:info@3boxes.in"
                aria-label="Email us"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.shop')}
            </h4>
            <ul className="mt-3 space-y-2">
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
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.company')}
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: t('footer.aboutUs'), view: 'about' },
                { label: t('footer.careers'), url: 'https://3boxesjobs.com/' },
                { label: t('footer.press'), view: 'press' },
              ].map((item, i) => (
                <li key={i}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-amber-200/50 transition-colors hover:text-amber-400"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span
                      className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                      onClick={() => setView(item.view)}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.support')}
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <span
                  className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                  onClick={() => setView('contact')}
                >
                  {t('footer.contactUs')}
                </span>
                <p className="mt-0.5 text-xs text-amber-200/30">
                  info@3boxes.in
                </p>
              </li>
              {[
                { label: t('footer.shippingReturns'), view: 'shipping' },
                { label: t('footer.faq'), view: 'faq' },
                { label: t('footer.sizeGuide'), view: 'size-guide' },
                { label: t('footer.trackOrder'), view: 'track-order' },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.policies')}
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: t('footer.privacyPolicy'), view: 'privacy-policy' },
                { label: t('footer.termsOfService'), view: 'terms-of-service' },
                { label: t('footer.securityPolicy'), view: 'security-policy' },
                { label: t('footer.cookiePolicy'), view: 'cookie-policy' },
                { label: t('footer.refundPolicy'), view: 'refund-policy' },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
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
        <div className="mt-8 border-t border-amber-900/20 pt-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
                Install App
              </h4>
              <p className="mt-1 text-sm text-amber-200/50">
                Install our app directly — no app store needed. Shop luxury gifts on the go.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-600/10 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-500/50"
              >
                <Smartphone className="h-4 w-4" />
                Install Android App
              </button>
              <button
                onClick={() => window.open('/app/', '_blank')}
                className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-stone-900/50 px-3 py-2 text-sm text-amber-200/60 transition-colors hover:bg-stone-800/50 hover:text-amber-200 hover:border-amber-500/30"
              >
                <Download className="h-4 w-4" />
                Flutter Web App
              </button>
              {/* <div className="flex items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800/50">
                  <span className="text-lg">📱</span>
                </div>
                 <div className="text-[10px] text-amber-200/30">
                  Progressive Web App<br />Works offline &amp; fullscreen
                </div>
              </div> */}
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-6 border-t border-amber-900/20 pt-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-amber-200/40">
              &copy; 2024 3 Boxes Luxury Curations. {t('footer.rights')} {t('footer.crafted')}
            </p>
            <p className="text-xs text-amber-200/30">
              Bengaluru, India | info@3boxes.in
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
