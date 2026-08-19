import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Sparkles,
  Truck,
  ShieldCheck,
  Zap,
  ArrowRight,
  Plus,
  X,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';

const STORAGE_WELCOME_SEEN_SESSION = 'dm_welcome_modal_seen_session';
const STORAGE_LAST_SEEN_KEY = 'dm_welcome_last_seen_time';

export const WelcomeScreenModal: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [userState, setUserState] = useState<'new' | 'returning' | 'seller'>('new');

  useEffect(() => {
    // 1. Ne pas réafficher si déjà fermé dans la même session de navigation
    const seenSession = sessionStorage.getItem(STORAGE_WELCOME_SEEN_SESSION);
    if (seenSession) return;

    const now = Date.now();
    const lastSeenRaw = localStorage.getItem(STORAGE_LAST_SEEN_KEY);
    const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) : null;

    // Déterminer l'état du visiteur
    if (!lastSeen) {
      setUserState('new');
    } else if (userProfile?.shop_name || userProfile?.shop_slug) {
      setUserState('seller');
    } else {
      setUserState('returning');
    }

    // Ouvrir la modale après un très court délai de 400ms pour un effet d'accueil fluide
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [userProfile]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem(STORAGE_WELCOME_SEEN_SESSION, 'true');
    localStorage.setItem(STORAGE_LAST_SEEN_KEY, Date.now().toString());
  };

  const handleGoToBuy = () => {
    handleClose();
    navigate('/search');
  };

  const handleGoToSell = () => {
    handleClose();
    if (userProfile?.shop_slug) {
      navigate(`/shop/${userProfile.shop_slug}`);
    } else {
      navigate('/create-listing');
    }
  };

  const fullName = (userProfile?.full_name as string) || (user?.user_metadata?.full_name as string) || '';
  const firstName = fullName.trim().split(' ')[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Overlay sombre avec flou intense */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 p-5 sm:p-8 text-white shadow-2xl shadow-orange-950/50 border border-white/20 z-10 my-auto"
          >
            {/* Effets lumineux d'arrière-plan */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-yellow-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-orange-950/40 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            {/* Bouton Fermer */}
            <button
              onClick={handleClose}
              aria-label="Fermer"
              className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-2xl bg-black/20 text-white/80 backdrop-blur-md transition-all hover:bg-black/40 hover:text-white active:scale-90 border border-white/15"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header / Titre */}
            <div className="relative z-10 text-center mb-6 pt-1">
              {/* Badge d'accueil */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-200 border border-white/25 shadow-inner mb-3">
                <Sparkles className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                <span>
                  {userState === 'new'
                    ? '✨ Bienvenue à Daloa'
                    : userState === 'seller'
                    ? '👑 Espace Vendeur Pro'
                    : '🎉 Heureux de vous revoir'}
                </span>
              </div>

              {/* Grand Titre en gras */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                {firstName ? (
                  <>
                    Salut <span className="text-amber-200">{firstName}</span> !<br />
                    Que voulez-vous faire aujourd&apos;hui ?
                  </>
                ) : (
                  <>
                    Bienvenue sur <span className="text-amber-200">DaloaMarket</span> !
                  </>
                )}
              </h2>

              <p className="mt-2 text-xs sm:text-sm font-medium text-orange-100/90 max-w-md mx-auto leading-relaxed">
                La plateforme n°1 à Daloa pour acheter des articles locaux au meilleur prix et vendre sans commission.
              </p>
            </div>

            {/* Les 2 Grands Choix : Acheter ou Vendre */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {/* Option 1 : Acheter */}
              <button
                onClick={handleGoToBuy}
                className="group relative overflow-hidden rounded-3xl bg-white p-4 sm:p-5 text-left text-gray-900 shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] border border-white flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/50 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/30 group-hover:rotate-6 transition-transform">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black text-orange-600 border border-orange-200/50">
                      Shopping
                    </span>
                  </div>

                  <h3 className="text-base font-black text-gray-900 leading-snug">
                    Je veux Acheter
                  </h3>
                  <p className="mt-1 text-[11px] font-medium text-gray-500 leading-relaxed">
                    Explorez les boutiques, téléphones, vêtements et produits livrés chez vous.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-black text-orange-600 group-hover:text-orange-700">
                  <span>Voir les offres</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 2 : Vendre */}
              <button
                onClick={handleGoToSell}
                className="group relative overflow-hidden rounded-3xl bg-white/15 backdrop-blur-md p-4 sm:p-5 text-left text-white shadow-xl transition-all duration-200 hover:bg-white/25 hover:scale-[1.02] active:scale-[0.98] border border-white/30 flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-gray-950 shadow-md shadow-amber-400/30 group-hover:-rotate-6 transition-transform">
                      <Store className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-amber-300/20 px-2.5 py-0.5 text-[10px] font-black text-amber-200 border border-amber-200/30">
                      0% Frais
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white leading-snug">
                    Je veux Vendre
                  </h3>
                  <p className="mt-1 text-[11px] font-medium text-orange-100/80 leading-relaxed">
                    Créez votre boutique et partagez votre catalogue directement sur WhatsApp.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/15 text-xs font-black text-amber-200 group-hover:text-amber-100">
                  <span>{userProfile?.shop_slug ? 'Accéder à ma boutique' : 'Publier une annonce'}</span>
                  <Plus className="h-4 w-4 group-hover:scale-125 transition-transform" />
                </div>
              </button>
            </div>

            {/* Piliers de réassurance DaloaMarket */}
            <div className="relative z-10 grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-center text-white/90">
              <div className="flex flex-col items-center gap-1">
                <Truck className="h-4 w-4 text-amber-200" />
                <span className="text-[10px] font-bold leading-tight">Livraison Express</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-amber-200" />
                <span className="text-[10px] font-bold leading-tight">Paiement Sécurisé</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap className="h-4 w-4 text-amber-200" />
                <span className="text-[10px] font-bold leading-tight">Commerces 100% Daloa</span>
              </div>
            </div>

            {/* Bouton Continuer direct */}
            <div className="relative z-10 mt-5 text-center">
              <button
                onClick={handleClose}
                className="text-[11px] font-extrabold text-orange-200 hover:text-white transition-colors underline underline-offset-4 active:scale-95"
              >
                Explorer directement la page d&apos;accueil →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
