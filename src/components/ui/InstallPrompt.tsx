import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'app est déjà installée en mode Standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return; // Déjà installée, pas besoin de bannière

    // Vérifier si déjà masquée pendant cette session
    const dismissedSession = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissedSession) return;

    // 2. Détecter iOS (Safari sur iPhone / iPad)
    const ua = window.navigator.userAgent;
    const detectedIOS = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(detectedIOS);

    if (detectedIOS) {
      // Sur iOS, 'beforeinstallprompt' n'existe pas -> afficher directement la bannière d'aide
      setIsVisible(true);
    } else {
      // Sur Android / Chrome -> écouter 'beforeinstallprompt'
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsVisible(true);
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }

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
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            className="fixed bottom-[80px] md:bottom-4 left-4 right-4 z-[60] max-w-md mx-auto"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
          >
            <div className="relative backdrop-blur-xl bg-white/95 shadow-2xl border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Download className="w-6 h-6 animate-bounce" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  Installer DaloaMarket
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isIOS ? 'Accès direct depuis votre écran d\'accueil iOS' : 'Accès rapide sans passer par le navigateur'}
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="filled"
                  color="primary"
                  onClick={handleInstall}
                  className="whitespace-nowrap"
                >
                  {isIOS ? 'Comment faire ?' : 'Installer'}
                </Button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL INSTRUCTIONS iOS */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-gray-100"
            >
              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                  📱
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Installer sur iPhone / iPad</h3>
                  <p className="text-xs text-gray-500">Ajouter DaloaMarket à votre écran d'accueil</p>
                </div>
              </div>

              <div className="space-y-4 my-6">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold text-gray-900 mb-0.5">Appuyez sur le bouton Partager 📤</p>
                    <p>Dans la barre en bas de votre navigateur Safari, touchez l'icône de partage (le carré avec une flèche vers le haut).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold text-gray-900 mb-0.5">Sélectionnez « Sur l'écran d'accueil » ➕</p>
                    <p>Faites défiler le menu vers le bas et appuyez sur l'option avec un **+**.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold text-gray-900 mb-0.5">Appuyez sur « Ajouter » 🚀</p>
                    <p>En haut à droite de l'écran, confirmez pour créer l'application sur votre téléphone.</p>
                  </div>
                </div>
              </div>

              <Button
                variant="filled"
                color="primary"
                fullWidth
                onClick={() => {
                  setShowIosModal(false);
                  handleDismiss();
                }}
              >
                C'est compris !
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
