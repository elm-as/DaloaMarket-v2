import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';
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
  const [isAndroid, setIsAndroid] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'app est déjà installée en mode Standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('pwa_installed') === 'true';

    if (isStandalone) return;

    // 2. Détection de la plateforme
    const ua = window.navigator.userAgent || '';
    const detectedIOS = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    const detectedAndroid = /android/i.test(ua);
    setIsIOS(detectedIOS);
    setIsAndroid(detectedAndroid);

    // 3. Vérifier si le prompt a été capturé avant le montage du composant
    if ((window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
      setIsVisible(true);
    }

    // 4. Écouter l'événement standard et l'événement personnalisé
    const handlePromptEvent = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as any).__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      (window as any).__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      setIsVisible(false);
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch (err) {}
    };

    window.addEventListener('beforeinstallprompt', handlePromptEvent);
    window.addEventListener('daloa:pwa-ready', () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
        setIsVisible(true);
      }
    });
    window.addEventListener('appinstalled', handleAppInstalled);

    // Si on est sur iOS Safari ou que le prompt est déjà disponible, afficher la bannière après un court délai
    const timer = setTimeout(() => {
      if (detectedIOS || (window as any).__deferredPwaPrompt || deferredPrompt) {
        setIsVisible(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePromptEvent);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt || (window as any).__deferredPwaPrompt;

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        setIsInstalling(true);
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          setIsVisible(false);
          try {
            localStorage.setItem('pwa_installed', 'true');
          } catch (err) {}
        }
        
        (window as any).__deferredPwaPrompt = null;
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.warn('[PWA] Prompt error, bascule vers le guide modal:', err);
      } finally {
        setIsInstalling(false);
      }
    }

    // Fallback: Si pas de deferredPrompt (iOS ou navigateur sans support direct)
    setShowGuideModal(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
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
            <div className="relative backdrop-blur-xl bg-white/95 shadow-2xl border border-orange-100/80 rounded-2xl p-3.5 flex items-center gap-3">
              {/* Logo Officiel DaloaMarket */}
              <div className="flex-shrink-0 relative w-12 h-12 rounded-xl bg-orange-50/80 border border-orange-100 p-1.5 shadow-sm flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="DaloaMarket Logo"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-gray-900 leading-tight">
                    DaloaMarket
                  </p>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    App
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {isIOS ? 'Ajouter à l\'écran d\'accueil iPhone' : 'Installer l\'application mobile'}
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="filled"
                  color="primary"
                  onClick={handleInstall}
                  loading={isInstalling}
                  className="whitespace-nowrap font-bold"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Installer
                </Button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL INSTRUCTIONS (pour iOS ou navigateurs sans prompt natif) */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-gray-100"
            >
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 p-2 shadow-sm flex items-center justify-center">
                  <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900">
                    Installer DaloaMarket
                  </h3>
                  <p className="text-xs text-gray-500">Ajouter à votre écran d'accueil en 2 gestes</p>
                </div>
              </div>

              <div className="space-y-4 my-6">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                          Appuyez sur Partager <Share2 className="w-3.5 h-3.5 inline text-orange-600" />
                        </p>
                        <p>Dans la barre en bas de votre navigateur Safari, touchez l'icône de partage.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                          Sélectionnez « Sur l'écran d'accueil » <PlusSquare className="w-3.5 h-3.5 inline text-orange-600" />
                        </p>
                        <p>Faites défiler le menu vers le bas et appuyez sur l'option.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                          Appuyez sur « Ajouter » <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" />
                        </p>
                        <p>En haut à droite de l'écran, confirmez pour créer l'icône sur votre téléphone.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold text-gray-900 mb-0.5">Ouvrez le menu Chrome</p>
                        <p>Appuyez sur les 3 points verticaux en haut à droite du navigateur.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold text-gray-900 mb-0.5">Sélectionnez « Installer l'application » ou « Ajouter à l'écran d'accueil »</p>
                        <p>L'icône DaloaMarket sera immédiatement créée sur votre écran d'accueil.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                variant="filled"
                color="primary"
                fullWidth
                onClick={() => {
                  setShowGuideModal(false);
                  handleDismiss();
                }}
              >
                C'est compris
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
