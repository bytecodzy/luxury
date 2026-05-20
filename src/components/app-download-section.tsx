'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Download,
  Check,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Star,
  Monitor,
  Share2,
  QrCode,
  Info,
  Chrome,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'other';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
  return 'other';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function AppDownloadSection() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>('other');
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [manifestLinked, setManifestLinked] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Detect device
    const ua = navigator.userAgent;
    const mobile = /Android|iPhone|iPad|iPod/i.test(ua);
    setIsMobile(mobile);
    setIsIOS(/iPhone|iPod/i.test(ua));
    setIsIPad(/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setBrowser(detectBrowser());

    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Check if manifest is linked
    const manifestEl = document.querySelector('link[rel="manifest"]');
    setManifestLinked(!!manifestEl);

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwRegistered(!!reg);
      });
    }

    // Aggressive beforeinstallprompt listener — capture immediately
    // Some browsers fire this early; we use a ref to avoid stale closures
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      setPromptAvailable(true);
    };

    // Listen on both window and document for maximum capture reliability
    window.addEventListener('beforeinstallprompt', handler);
    document.addEventListener('beforeinstallprompt', handler);

    // Also listen for appinstalled
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
      setPromptAvailable(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    // Check display mode change (app installed and launched)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const mediaHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', mediaHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      document.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      mediaQuery.removeEventListener('change', mediaHandler);
    };
  }, []);

  // For iOS and browsers without beforeinstallprompt, auto-show instructions after a delay
  useEffect(() => {
    if (isInstalled) return;
    // On iOS, automatically show instructions since beforeinstallprompt never fires
    if (isIOS && !promptAvailable) {
      const timer = setTimeout(() => {
        setShowInstructions(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    // On other mobile browsers without prompt after a while, show instructions
    if (isMobile && !promptAvailable) {
      const timer = setTimeout(() => {
        setShowInstructions(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isIOS, isMobile, promptAvailable, isInstalled]);

  const handleInstallClick = useCallback(async () => {
    // Use ref to avoid stale closure
    const prompt = deferredPromptRef.current || deferredPrompt;

    if (prompt) {
      setIsInstalling(true);
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
        setShowInstructions(true);
      } finally {
        setDeferredPrompt(null);
        deferredPromptRef.current = null;
        setPromptAvailable(false);
        setIsInstalling(false);
      }
    } else {
      // No native prompt available — show manual instructions
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  // Share handler for devices that support Web Share API
  const handleShare = useCallback(async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '3 BOXES LUXURY',
          text: 'Install the 3 BOXES LUXURY app for the ultimate luxury shopping experience',
          url,
        });
      } catch (err) {
        // User cancelled or share failed — copy URL as fallback
        if ((err as DOMException).name !== 'AbortError') {
          await navigator.clipboard?.writeText(url);
        }
      }
    } else {
      // Fallback: copy URL to clipboard
      await navigator.clipboard?.writeText(url);
    }
  }, []);

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

  // Determine the browser-specific instruction
  const getBrowserIcon = () => {
    switch (browser) {
      case 'safari':
        return <Compass className="h-4 w-4 text-blue-400" />;
      case 'chrome':
        return <Chrome className="h-4 w-4 text-green-400" />;
      case 'edge':
        return <Chrome className="h-4 w-4 text-blue-300" />;
      case 'samsung':
        return <Globe className="h-4 w-4 text-purple-400" />;
      case 'firefox':
        return <Globe className="h-4 w-4 text-orange-400" />;
      default:
        return <Globe className="h-4 w-4 text-amber-400" />;
    }
  };

  const getBrowserName = () => {
    switch (browser) {
      case 'safari': return 'Safari';
      case 'chrome': return 'Chrome';
      case 'edge': return 'Edge';
      case 'samsung': return 'Samsung Internet';
      case 'firefox': return 'Firefox';
      default: return 'your browser';
    }
  };

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
              Available on iOS & Android
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-amber-50">Get the </span>
              <span className="luxury-text">3 BOXES LUXURY</span>
              <span className="text-amber-50"> App</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-amber-200/60 sm:text-lg">
              Install our app on your iPhone or Android device for the ultimate luxury
              shopping experience. Browse, gift, and shop — anytime, anywhere.
            </p>
            {/* PWA readiness indicator */}
            {!promptAvailable && !isIOS && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-300/50">
                {getBrowserIcon()}
                <span>Detected: {getBrowserName()} • PWA Ready: {manifestLinked && swRegistered ? '✓' : '⟳'}</span>
              </div>
            )}
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

              {/* Install button — always visible */}
              <div className="mt-8 flex flex-col items-center gap-3">
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
                  ) : promptAvailable ? (
                    <>
                      <Download className="h-5 w-5" />
                      Install App Now
                    </>
                  ) : isIOS ? (
                    <>
                      <Download className="h-5 w-5" />
                      Add to Home Screen
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      {isMobile ? 'Install App' : 'Get the App'}
                    </>
                  )}
                </Button>

                {/* Prominent Chrome menu tip — shown when no native prompt */}
                {!promptAvailable && !isIOS && isMobile && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300/70"
                  >
                    <Info className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                    <span>
                      Tip: Tap <strong>⋮ menu</strong> → <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong> in {getBrowserName()}
                    </span>
                  </motion.div>
                )}

                {/* iOS Safari share tip — shown prominently */}
                {isIOS && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300/70"
                  >
                    <Share2 className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                    <span>
                      Tap <strong>Share</strong> <span className="inline-block">⬆️</span> → <strong>&quot;Add to Home Screen&quot;</strong> in Safari
                    </span>
                  </motion.div>
                )}

                <p className="text-xs text-amber-200/40">
                  Free • Works on iOS & Android • Instant install
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

              {/* Install instructions — always shown on iOS, toggleable on others */}
              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-amber-500/20 bg-stone-900/80 p-5">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-200">
                        {getBrowserIcon()}
                        How to Install on {getBrowserName()}:
                      </h4>
                      {isIOS ? (
                        <ol className="space-y-3 text-xs text-amber-200/60">
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              1
                            </span>
                            <span>
                              Tap the <strong className="text-amber-300/80">Share button</strong> (box with up
                              arrow <Share2 className="inline h-3 w-3" />) at the bottom of Safari
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              2
                            </span>
                            <span>
                              Scroll down and tap{' '}
                              <strong className="text-amber-300/80">&quot;Add to Home Screen&quot;</strong>
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              3
                            </span>
                            <span>
                              Tap <strong className="text-amber-300/80">&quot;Add&quot;</strong> to install the
                              app on your home screen
                            </span>
                          </li>
                        </ol>
                      ) : browser === 'samsung' ? (
                        <ol className="space-y-3 text-xs text-amber-200/60">
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              1
                            </span>
                            <span>
                              Tap the <strong className="text-amber-300/80">☰ menu</strong> (three horizontal lines) at the bottom
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              2
                            </span>
                            <span>
                              Tap <strong className="text-amber-300/80">&quot;Add page to&quot; → &quot;Home screen&quot;</strong>
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              3
                            </span>
                            <span>
                              Tap <strong className="text-amber-300/80">&quot;Add&quot;</strong> to confirm
                            </span>
                          </li>
                        </ol>
                      ) : (
                        <ol className="space-y-3 text-xs text-amber-200/60">
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              1
                            </span>
                            <span>
                              Open this website in{' '}
                              <strong className="text-amber-300/80">{getBrowserName()} browser</strong> on your
                              device
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              2
                            </span>
                            <span>
                              Tap the <strong className="text-amber-300/80">three-dot menu</strong> (⋮) in the
                              top right
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                              3
                            </span>
                            <span>
                              Tap{' '}
                              <strong className="text-amber-300/80">
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
                              <strong className="text-amber-300/80">&quot;Install&quot;</strong>
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
                    Our Progressive Web App installs directly on your iPhone or
                    Android device — no app store needed. It works just like a
                    native app: launches from your home screen, runs fullscreen,
                    and works offline. Get instant access to luxury gifting with
                    a single tap.
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

              {/* Desktop: Share / QR code section */}
              {!isMobile && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-xl border border-amber-500/15 bg-stone-900/50 p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200/80">
                      <QrCode className="h-4 w-4 text-amber-400" />
                      Get it on your phone
                    </h4>
                    <p className="mb-3 text-xs text-amber-200/50 leading-relaxed">
                      Scan the QR code or share the link to install on your mobile device.
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Simple SVG QR code placeholder */}
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-white p-1.5">
                        <svg viewBox="0 0 100 100" className="h-full w-full">
                          {/* QR code pattern — simplified decorative representation */}
                          <rect x="0" y="0" width="100" height="100" fill="white"/>
                          {/* Position detection patterns */}
                          <rect x="5" y="5" width="25" height="25" fill="black"/>
                          <rect x="8" y="8" width="19" height="19" fill="white"/>
                          <rect x="11" y="11" width="13" height="13" fill="black"/>
                          <rect x="70" y="5" width="25" height="25" fill="black"/>
                          <rect x="73" y="8" width="19" height="19" fill="white"/>
                          <rect x="76" y="11" width="13" height="13" fill="black"/>
                          <rect x="5" y="70" width="25" height="25" fill="black"/>
                          <rect x="8" y="73" width="19" height="19" fill="white"/>
                          <rect x="11" y="76" width="13" height="13" fill="black"/>
                          {/* Data modules */}
                          <rect x="35" y="5" width="5" height="5" fill="black"/>
                          <rect x="45" y="5" width="5" height="5" fill="black"/>
                          <rect x="55" y="5" width="5" height="5" fill="black"/>
                          <rect x="35" y="15" width="5" height="5" fill="black"/>
                          <rect x="50" y="15" width="5" height="5" fill="black"/>
                          <rect x="60" y="15" width="5" height="5" fill="black"/>
                          <rect x="35" y="25" width="5" height="5" fill="black"/>
                          <rect x="45" y="25" width="5" height="5" fill="black"/>
                          <rect x="5" y="35" width="5" height="5" fill="black"/>
                          <rect x="15" y="35" width="5" height="5" fill="black"/>
                          <rect x="30" y="35" width="5" height="5" fill="black"/>
                          <rect x="40" y="35" width="5" height="5" fill="black"/>
                          <rect x="50" y="35" width="5" height="5" fill="black"/>
                          <rect x="65" y="35" width="5" height="5" fill="black"/>
                          <rect x="80" y="35" width="5" height="5" fill="black"/>
                          <rect x="90" y="35" width="5" height="5" fill="black"/>
                          <rect x="5" y="45" width="5" height="5" fill="black"/>
                          <rect x="20" y="45" width="5" height="5" fill="black"/>
                          <rect x="35" y="45" width="5" height="5" fill="black"/>
                          <rect x="55" y="45" width="5" height="5" fill="black"/>
                          <rect x="70" y="45" width="5" height="5" fill="black"/>
                          <rect x="85" y="45" width="5" height="5" fill="black"/>
                          <rect x="10" y="55" width="5" height="5" fill="black"/>
                          <rect x="25" y="55" width="5" height="5" fill="black"/>
                          <rect x="40" y="55" width="5" height="5" fill="black"/>
                          <rect x="60" y="55" width="5" height="5" fill="black"/>
                          <rect x="75" y="55" width="5" height="5" fill="black"/>
                          <rect x="90" y="55" width="5" height="5" fill="black"/>
                          <rect x="35" y="65" width="5" height="5" fill="black"/>
                          <rect x="50" y="65" width="5" height="5" fill="black"/>
                          <rect x="65" y="65" width="5" height="5" fill="black"/>
                          <rect x="80" y="65" width="5" height="5" fill="black"/>
                          <rect x="35" y="75" width="5" height="5" fill="black"/>
                          <rect x="45" y="75" width="5" height="5" fill="black"/>
                          <rect x="60" y="75" width="5" height="5" fill="black"/>
                          <rect x="75" y="75" width="5" height="5" fill="black"/>
                          <rect x="90" y="75" width="5" height="5" fill="black"/>
                          <rect x="35" y="85" width="5" height="5" fill="black"/>
                          <rect x="55" y="85" width="5" height="5" fill="black"/>
                          <rect x="70" y="85" width="5" height="5" fill="black"/>
                          <rect x="85" y="85" width="5" height="5" fill="black"/>
                          {/* Alignment pattern */}
                          <rect x="40" y="40" width="15" height="15" fill="black"/>
                          <rect x="43" y="43" width="9" height="9" fill="white"/>
                          <rect x="45" y="45" width="5" height="5" fill="black"/>
                        </svg>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShare}
                          className="gap-2 border-amber-500/30 text-amber-300/70 hover:bg-amber-500/10 hover:text-amber-300"
                        >
                          <Share2 className="h-4 w-4" />
                          Share Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.origin);
                          }}
                          className="gap-2 border-amber-500/30 text-amber-300/70 hover:bg-amber-500/10 hover:text-amber-300"
                        >
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile: Share button */}
              {isMobile && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-sm text-amber-300/60 hover:text-amber-300 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    Share this app with friends
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => window.open('/', '_blank')}
                    className="flex items-center gap-2 text-sm text-amber-300/60 hover:text-amber-300 transition-colors"
                  >
                    <Monitor className="h-4 w-4" />
                    Or try the app in your browser
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Desktop: open in browser */}
              {!isMobile && (
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    onClick={() => window.open('/', '_blank')}
                    className="flex items-center gap-2 text-sm text-amber-300/60 hover:text-amber-300 transition-colors"
                  >
                    <Monitor className="h-4 w-4" />
                    Or try the app in your browser
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
