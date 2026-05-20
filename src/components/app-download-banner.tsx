'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
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

    // Auto-dismiss after 15 seconds if not interacted
    const timer = setTimeout(() => {
      // Don't auto-dismiss - let user decide
    }, 15000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      // No prompt available, scroll to download section
      const downloadSection = document.querySelector(
        '[data-app-download-section]'
      );
      if (downloadSection) {
        downloadSection.scrollIntoView({ behavior: 'smooth' });
      }
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
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  // Don't show if installed or dismissed
  if (isInstalled || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 2 }}
        className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-lg sm:left-auto sm:right-4 sm:mx-0"
      >
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-900/20 p-4 shadow-2xl shadow-amber-900/20 backdrop-blur-lg">
          {/* Close button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute right-2 top-2 rounded-full p-1 text-amber-200/40 transition-colors hover:bg-amber-900/20 hover:text-amber-200"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Decorative glow */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />

          <div className="flex items-center gap-4">
            {/* App icon */}
            <div className="flex-shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20">
                <Smartphone className="h-7 w-7 text-amber-400" />
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-100">
                Install the App
              </h3>
              <p className="mt-0.5 text-xs text-amber-200/50 line-clamp-2">
                {deferredPrompt
                  ? 'Tap to install directly on your device — no app store needed!'
                  : 'Get the 3 BOXES LUXURY app for iOS & Android.'}
              </p>

              {/* Action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="bg-amber-600 text-stone-950 hover:bg-amber-500 h-8 gap-1.5 text-xs font-semibold"
                >
                  {isInstalling ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {deferredPrompt
                    ? isInstalling
                      ? 'Installing...'
                      : 'Install Now'
                    : 'Get the App'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('/', '_blank')}
                  className="border-amber-500/30 bg-amber-900/10 text-amber-300 hover:bg-amber-900/20 hover:text-amber-200 h-8 gap-1.5 text-xs"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Web App
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
