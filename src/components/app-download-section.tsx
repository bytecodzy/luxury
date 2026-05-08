'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Download,
  X,
  Check,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Star,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadSection() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect device
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      setShowInstructions(true);
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
      setShowInstructions(true);
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  if (isInstalled) return null;

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      desc: 'Instant loading with offline support',
    },
    {
      icon: Shield,
      title: 'Secure',
      desc: 'Safe & encrypted transactions',
    },
    {
      icon: Globe,
      title: 'Multi-Currency',
      desc: 'Shop in 10+ currencies',
    },
    {
      icon: Star,
      title: 'AI Powered',
      desc: 'Smart gift recommendations',
    },
  ];

  return (
    <section
      data-app-download-section
      id="app-download-section"
      className="relative overflow-hidden border-t border-amber-900/30 bg-gradient-to-b from-stone-950 via-stone-900/50 to-stone-950 py-16 sm:py-20"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-amber-700/5 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
              <Smartphone className="h-3.5 w-3.5" />
              Available as Android App
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-amber-50">Get the </span>
              <span className="luxury-text">3 BOXES LUXURY</span>
              <span className="text-amber-50"> App</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-amber-200/60 sm:text-lg">
              Install our app on your Android device for the ultimate luxury
              shopping experience. Browse, gift, and shop — anytime, anywhere.
            </p>
          </motion.div>

          {/* Main content */}
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left - Phone mockup & install */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              {/* Phone frame */}
              <div className="relative mx-auto w-64 sm:w-72">
                <div className="overflow-hidden rounded-[2.5rem] border-2 border-amber-500/30 bg-stone-900 p-2 shadow-2xl shadow-amber-900/20">
                  <div className="overflow-hidden rounded-[2rem] bg-stone-950">
                    {/* Status bar */}
                    <div className="flex items-center justify-between bg-stone-900 px-6 py-1.5">
                      <span className="text-[10px] text-amber-200/50">9:41</span>
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-amber-400/50" />
                        <div className="h-2 w-2 rounded-full bg-amber-400/50" />
                        <div className="h-2 w-4 rounded-full bg-amber-400/50" />
                      </div>
                    </div>
                    {/* App screen mockup */}
                    <div className="flex flex-col items-center px-4 py-6">
                      <div className="mb-3 h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-amber-400">3B</span>
                      </div>
                      <div className="mb-1 text-sm font-bold text-amber-100">
                        3 BOXES LUXURY
                      </div>
                      <div className="mb-4 text-[10px] text-amber-200/40">
                        Curated Luxury Gifting
                      </div>
                      {/* Category pills */}
                      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                        {['Watches', 'Jewelry', 'Leather', 'Fragrances'].map(
                          (cat) => (
                            <span
                              key={cat}
                              className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[9px] text-amber-300/70"
                            >
                              {cat}
                            </span>
                          )
                        )}
                      </div>
                      {/* Product cards mockup */}
                      <div className="grid w-full grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-lg bg-gradient-to-br from-stone-800 to-stone-900 border border-amber-500/10"
                          >
                            <div className="flex h-full items-center justify-center">
                              <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20" />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Bottom nav */}
                      <div className="mt-4 flex w-full justify-around border-t border-amber-500/10 pt-2">
                        {['🏠', '🔍', '🎁', '🛒', '👤'].map((emoji, i) => (
                          <span
                            key={i}
                            className="text-xs opacity-60"
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Notch */}
                <div className="absolute left-1/2 top-2 -translate-x-1/2 h-5 w-24 rounded-b-2xl bg-stone-900" />
                {/* Glow effect */}
                <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-amber-500/5 blur-xl" />
              </div>

              {/* Install button */}
              <div className="mt-8 flex flex-col items-center gap-3">
                {deferredPrompt ? (
                  <Button
                    size="lg"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="gap-2 bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25 px-8 py-6 text-base font-bold"
                  >
                    {isInstalling ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        Install Android App
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleInstallClick}
                    className="gap-2 bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25 px-8 py-6 text-base font-bold"
                  >
                    <Download className="h-5 w-5" />
                    {isMobile
                      ? 'Add to Home Screen'
                      : 'Get Android App'}
                  </Button>
                )}
                <p className="text-xs text-amber-200/40">
                  Free • No app store needed • Instant install
                </p>
              </div>
            </motion.div>

            {/* Right - Features & instructions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col justify-center"
            >
              {/* Features grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 backdrop-blur-sm"
                  >
                    <feature.icon className="mb-2 h-6 w-6 text-amber-400" />
                    <h4 className="text-sm font-semibold text-amber-100">
                      {feature.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-amber-200/40">
                      {feature.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Install instructions */}
              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-amber-500/20 bg-stone-900/80 p-5">
                      <h4 className="mb-3 text-sm font-bold text-amber-200">
                        How to Install on Your Device:
                      </h4>
                      {isIOS ? (
                        <ol className="space-y-2 text-xs text-amber-200/60">
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              1
                            </span>
                            <span>
                              Tap the <strong>Share button</strong> (box with up
                              arrow) in Safari
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              2
                            </span>
                            <span>
                              Scroll down and tap{' '}
                              <strong>&quot;Add to Home Screen&quot;</strong>
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              3
                            </span>
                            <span>
                              Tap <strong>&quot;Add&quot;</strong> to install the
                              app
                            </span>
                          </li>
                        </ol>
                      ) : (
                        <ol className="space-y-2 text-xs text-amber-200/60">
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              1
                            </span>
                            <span>
                              Open this website in{' '}
                              <strong>Chrome browser</strong> on your Android
                              phone
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              2
                            </span>
                            <span>
                              Tap the <strong>three-dot menu</strong> (⋮) in the
                              top right
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              3
                            </span>
                            <span>
                              Tap{' '}
                              <strong>
                                &quot;Install app&quot; or &quot;Add to Home
                                Screen&quot;
                              </strong>
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              4
                            </span>
                            <span>
                              Confirm by tapping{' '}
                              <strong>&quot;Install&quot;</strong>
                            </span>
                          </li>
                        </ol>
                      )}
                      <button
                        onClick={() => setShowInstructions(false)}
                        className="mt-3 text-xs text-amber-400/60 hover:text-amber-400 transition-colors"
                      >
                        Hide instructions
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick install info */}
              {!showInstructions && (
                <div className="rounded-xl border border-amber-500/15 bg-stone-900/50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-amber-200/80">
                    One-Tap Install
                  </h4>
                  <p className="text-xs text-amber-200/50 leading-relaxed">
                    Our Progressive Web App installs directly on your Android
                    device — no app store needed. It works just like a native
                    app: launches from your home screen, runs fullscreen, and
                    works offline. Get instant access to luxury gifting with a
                    single tap.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      'No App Store needed',
                      'Works offline',
                      'Auto-updates',
                      'Fullscreen mode',
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/10 bg-amber-500/5 px-2.5 py-0.5 text-[10px] text-amber-300/60"
                      >
                        <Check className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative: Open in browser */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => window.open('/app/', '_blank')}
                  className="flex items-center gap-2 text-sm text-amber-300/60 hover:text-amber-300 transition-colors"
                >
                  <Monitor className="h-4 w-4" />
                  Or try the Flutter Web App in your browser
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
