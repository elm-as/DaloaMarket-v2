import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Sparkles,
  Truck,
  ShieldCheck,
  ArrowRight,
  Plus,
  X,
} from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';

const ONBOARDING_SEEN_KEY = 'dm_welcome_seen_v2';

/**
 * Écran d'accueil immersif affiché UNIQUEMENT aux utilisateurs CONNECTÉS
 * qui ne l'ont pas encore vu (1ère connexion après inscription).
 * Permet un message personnalisé avec le prénom.
 */
export const WelcomeScreenModal: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, isProfileComplete } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Pas connecté → ne rien afficher
    if (!user) return;

    // Déjà vu → ne rien afficher
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (seen) return;

    // Profil pas encore complet → laisser la page CompleteProfile gérer
    if (!isProfileComplete) return;

    // Afficher après un court délai
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [user, isProfileComplete]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  };

  const handleExplore = () => {
    handleDismiss();
    navigate('/search');
  };

  const handleSell = () => {
    handleDismiss();
    navigate('/create-listing');
  };

  // Extraire le prénom
  const fullName =
    (userProfile?.full_name as string) ||
    (user?.user_metadata?.full_name as string) ||
    '';
  const firstName = fullName.trim().split(' ')[0] || '';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-[36px] bg-white p-6 sm:p-8 text-gray-900 shadow-2xl shadow-gray-950/20 border border-gray-100 z-10 my-auto"
          >
            {/* Close */}
            <button
              onClick={handleDismiss}
              aria-label="Fermer"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 active:scale-90 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30">
                <Sparkles className="h-7 w-7" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-extrabold text-orange-700 border border-orange-200/50 mb-2">
                <span>🌴 Bienvenue à Daloa</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-gray-900 leading-tight">
                {firstName ? (
                  <>
                    Content de te voir, <span className="text-orange-600">{firstName}</span> !
                  </>
                ) : (
                  <>
                    Bienvenue sur <span className="text-orange-600">DaloaMarket</span>
                  </>
                )}
              </h2>

              <p className="mt-1.5 text-xs text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                Ton compte est prêt ! Explore les boutiques de Daloa ou publie ta première annonce.
              </p>
            </div>

            {/* 3 avantages */}
            <div className="my-6 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-gray-50/80 p-3 border border-gray-100/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-gray-900 leading-none mb-0.5">
                    Tout le commerce local
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Smartphones, vêtements, mode et produits du marché aux meilleurs prix.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50/80 p-3 border border-gray-100/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-gray-900 leading-none mb-0.5">
                    Livraison en 30 à 60 min
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Les livreurs de Daloa vous livrent directement chez vous.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50/80 p-3 border border-gray-100/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-gray-900 leading-none mb-0.5">
                    Paiement 100% protégé
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Payez par Wave, Orange Money ou en espèces à la livraison.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                onClick={handleExplore}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-700 active:scale-[0.98] transition-all"
              >
                <span>Commencer mon shopping</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleSell}
                className="w-full flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 text-xs font-black text-gray-700 hover:bg-gray-50 hover:text-orange-600 active:scale-[0.98] transition-all"
              >
                <Store className="h-3.5 w-3.5 text-orange-500" />
                <span>Vous êtes commerçant ? Publier une annonce</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
