import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          className="fixed bottom-[80px] md:bottom-4 left-4 right-4 z-[60]" 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 300,
          }}
        >
          <div className="relative backdrop-blur-xl bg-white/85 shadow-[var(--elevation-4)] border border-white/30 rounded-[var(--radius-xl)] p-4 flex items-center gap-3">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white">
              <Download className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[var(--color-on-surface)]">
                Installer l application
              </p>
              <p className="text-[13px] text-[var(--color-on-surface-variant)]">
                Accès rapide depuis votre écran d'accueil
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
              <Button
                size="sm"
                variant="filled"
                color="primary"
                onClick={handleInstall}
              >
                Installer
              </Button>
              <button
                onClick={handleDismiss}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[var(--radius-full)] hover:bg-gray-100 active:scale-[0.97] transition-all duration-[var(--motion-fast)]"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-[var(--color-on-surface-variant)]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
