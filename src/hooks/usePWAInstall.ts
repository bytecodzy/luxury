'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Hook to handle PWA install prompt on Android/Chrome.
 *
 * Captures the `beforeinstallprompt` event and provides a `promptInstall`
 * function that triggers the native install dialog.
 *
 * Returns:
 * - canInstall: Whether the app can be installed (PWA criteria met)
 * - promptInstall: Function to trigger the install dialog
 * - isInstalled: Whether the app is already installed
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt captured, canInstall=true');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
      console.log('[PWA] App installed successfully');
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available');
      // If no prompt is available, the app might already be installed
      // or the browser doesn't support PWA install
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`[PWA] User response to install prompt: ${outcome}`);

      // Clear the deferred prompt — it can only be used once
      deferredPromptRef.current = null;
      setCanInstall(false);

      return outcome === 'accepted';
    } catch (err) {
      console.error('[PWA] Error showing install prompt:', err);
      return false;
    }
  }, []);

  return { canInstall, promptInstall, isInstalled };
}
