'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppDownloadBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
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
                Get the 3 BOXES LUXURY App
              </h3>
              <p className="mt-0.5 text-xs text-amber-200/50 line-clamp-2">
                Browse luxury gifts, track orders, and get AI recommendations — all in our beautiful mobile app.
              </p>

              {/* Action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.open('/app/', '_blank')}
                  className="bg-amber-600 text-stone-950 hover:bg-amber-500 h-8 gap-1.5 text-xs font-semibold"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Open App
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = '/downloads/3boxes-luxury-app.zip';
                    a.download = '3boxes-luxury-app.zip';
                    a.click();
                  }}
                  className="border-amber-500/30 bg-amber-900/10 text-amber-300 hover:bg-amber-900/20 hover:text-amber-200 h-8 gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
