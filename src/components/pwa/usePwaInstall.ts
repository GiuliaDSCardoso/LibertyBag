import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'libertybag_pwa_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias de intervalo se dispensar

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // 1. Verifica se já está rodando como app standalone (Android, iOS ou Desktop)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return isStandaloneMedia || isIosStandalone;
    };

    const standaloneNow = checkStandalone();
    setIsStandalone(standaloneNow);

    if (standaloneNow) return;

    // 2. Verifica se é iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent || '';
    const isIosDevice =
      /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isIosDevice);

    // 3. Verifica se o usuário já dispensou recentemente
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const elapsed = Date.now() - Number(lastDismissed);
      if (elapsed < DISMISS_COOLDOWN_MS) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }

    // 4. Captura o evento nativo do Android / Chromium
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignora erro de localStorage
    }
  }, []);

  const resetDismissal = useCallback(() => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // Ignora
    }
  }, []);

  return {
    isStandalone,
    isIos,
    canInstallNative: Boolean(deferredPrompt),
    isInstallable: !isStandalone && (Boolean(deferredPrompt) || isIos),
    isDismissed,
    promptInstall,
    dismiss,
    resetDismissal
  };
}
