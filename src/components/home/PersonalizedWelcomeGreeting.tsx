import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Heart, Store, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';

const STORAGE_LAST_VISIT_KEY = 'dm_last_visit_timestamp';
const STORAGE_DISMISSED_DATE_KEY = 'dm_greeting_dismissed_date';

interface GreetingState {
  type: 'first_time' | 'long_time' | 'regular' | 'seller';
  greeting: string;
  subtext: string;
  badge: string;
  emoji: string;
}

export const PersonalizedWelcomeGreeting: React.FC = () => {
  const { user, userProfile } = useSupabase();
  const [greetingData, setGreetingData] = useState<GreetingState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dismissedDate = localStorage.getItem(STORAGE_DISMISSED_DATE_KEY);

    // Si déjà fermé aujourd'hui, on ne le réaffiche pas pour ne pas surcharger
    if (dismissedDate === todayStr) {
      return;
    }

    const now = Date.now();
    const lastVisitRaw = localStorage.getItem(STORAGE_LAST_VISIT_KEY);
    const lastVisit = lastVisitRaw ? parseInt(lastVisitRaw, 10) : null;

    // Mise à jour de la date de dernière visite
    localStorage.setItem(STORAGE_LAST_VISIT_KEY, now.toString());

    // Calcul de la période de la journée
    const hour = new Date().getHours();
    let timeGreeting = 'Bonjour';
    let timeEmoji = '☀️';
    if (hour >= 12 && hour < 18) {
      timeGreeting = 'Bon après-midi';
      timeEmoji = '🌤️';
    } else if (hour >= 18 && hour < 23) {
      timeGreeting = 'Bonsoir';
      timeEmoji = '🌙';
    } else if (hour >= 23 || hour < 5) {
      timeGreeting = 'Bonne nuit';
      timeEmoji = '🌟';
    }

    // Récupération du prénom
    const fullName = (userProfile?.full_name as string) || (user?.user_metadata?.full_name as string) || '';
    const firstName = fullName.trim().split(' ')[0];

    // 1. Première visite
    if (!lastVisit) {
      setGreetingData({
        type: 'first_time',
        greeting: firstName ? `Bienvenue sur DaloaMarket, ${firstName} !` : 'Bienvenue sur DaloaMarket !',
        subtext: 'Découvrez les meilleures boutiques et produits de Daloa avec livraison rapide.',
        badge: '✨ Première visite',
        emoji: '👋',
      });
      setIsVisible(true);
      return;
    }

    const daysSinceLastVisit = (now - lastVisit) / (1000 * 60 * 60 * 24);

    // 2. Vendeur actif
    const isSeller = Boolean(userProfile?.shop_name || userProfile?.shop_slug);
    if (isSeller && firstName) {
      setGreetingData({
        type: 'seller',
        greeting: `${timeGreeting} ${firstName} !`,
        subtext: `Votre boutique "${userProfile?.shop_name || 'DaloaMarket'}" est en ligne. Prêt pour de nouvelles ventes ?`,
        badge: '🏪 Espace Vendeur',
        emoji: '👑',
      });
      setIsVisible(true);
      return;
    }

    // 3. Retour après une absence (> 2 jours)
    if (daysSinceLastVisit >= 2) {
      setGreetingData({
        type: 'long_time',
        greeting: firstName ? `Ravi de vous revoir, ${firstName} !` : 'Ravi de vous revoir à Daloa !',
        subtext: 'Vous nous avez manqué ! De nouvelles annonces et offres exclusives ont été publiées.',
        badge: '🎉 Bon retour parmi nous',
        emoji: '✨',
      });
      setIsVisible(true);
      return;
    }

    // 4. Visiteur régulier (Aujourd'hui ou hier)
    setGreetingData({
      type: 'regular',
      greeting: firstName ? `${timeGreeting} ${firstName} !` : `${timeGreeting} et bienvenue !`,
      subtext: 'Trouvez vos articles préférés et profitez de la livraison directe à domicile.',
      badge: `${timeEmoji} ${timeGreeting}`,
      emoji: timeEmoji,
    });
    setIsVisible(true);
  }, [user, userProfile]);

  const handleDismiss = () => {
    setIsVisible(false);
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_DISMISSED_DATE_KEY, todayStr);
  };

  if (!greetingData) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="mb-4 relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md border border-white/40 p-3.5 sm:p-4 text-left shadow-lg shadow-orange-950/10"
        >
          {/* Subtle Background Glow */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-orange-400/10 blur-xl" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Animated Avatar / Emoji Badge */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/25 text-lg">
                <span>{greetingData.emoji}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/60">
                    <Sparkles className="w-2.5 h-2.5 text-orange-500" />
                    {greetingData.badge}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                  {greetingData.greeting}
                </h3>
                <p className="text-xs text-gray-600 font-medium leading-relaxed mt-0.5">
                  {greetingData.subtext}
                </p>

                {/* Quick contextual action */}
                {greetingData.type === 'seller' && userProfile?.shop_slug && (
                  <Link
                    to={`/shop/${userProfile.shop_slug}`}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-600 hover:text-orange-700 mt-1.5"
                  >
                    <span>Voir ma vitrine boutique</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Fermer le message"
              className="w-7 h-7 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 active:scale-90 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
