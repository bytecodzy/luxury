'use client';

import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-amber-900/30 bg-stone-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="logo-flashy">
                <Image
                  src="/images/logo.png"
                  alt="3 Boxes Luxury Logo"
                  width={44}
                  height={44}
                  className="h-11 w-auto"
                />
              </div>
              <h3 className="gold-shimmer text-lg font-bold tracking-widest">
                3 BOXES LUXURY
              </h3>
            </div>
            <p className="mt-2 text-sm text-amber-200/50">
              {t('footer.description')}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.shop')}
            </h4>
            <ul className="mt-3 space-y-2">
              {[t('categories.watches'), t('categories.jewelry'), t('categories.leatherGoods'), t('categories.fragrances'), t('categories.fashion'), t('categories.homeLiving'), t('categories.sarees'), t('categories.fashion')].map((item, i) => (
                <li key={i}>
                  <span className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer">
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
              {[t('footer.aboutUs'), t('footer.careers'), t('footer.press'), t('footer.sustainability')].map((item, i) => (
                <li key={i}>
                  <span className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer">
                    {item}
                  </span>
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
              {[t('footer.contactUs'), t('footer.shippingReturns'), t('footer.faq'), t('footer.sizeGuide')].map((item, i) => (
                <li key={i}>
                  <span className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-amber-900/20 pt-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-amber-200/40">
              &copy; {new Date().getFullYear()} 3 BOXES LUXURY. {t('footer.rights')}
            </p>
            <p className="text-xs text-amber-200/30">
              {t('footer.crafted')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
