import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bell,
  Clock,
  Sparkles,
  Smartphone,
  ShoppingBag,
  PlusCircle,
  Zap,
  ShieldCheck,
  Bike,
  CheckCircle2,
  Copy,
  ChevronRight,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { cn, formatDate } from '../../lib/utils';
import { broadcastPushNotification } from '../../lib/pushNotifications';

interface NotificationTemplate {
  id: string;
  category: 'pwa' | 'publish' | 'buy' | 'events' | 'trust' | 'drivers';
  categoryLabel: string;
  categoryIcon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  url: string;
  recommendedTime: string;
}

const TEMPLATES: NotificationTemplate[] = [
  // 📲 1. Installation PWA / Application Mobile
  {
    id: 'pwa-general',
    category: 'pwa',
    categoryLabel: 'Installation App',
    categoryIcon: Smartphone,
    title: "📲 Installe DaloaMarket sur ton écran d'accueil !",
    body: "Plus besoin de chercher dans ton navigateur ! Accède à tes annonces et commandes en 1 clic avec l'application mobile.",
    url: '/',
    recommendedTime: 'Soirée (vers 18h30) ou week-end',
  },
  {
    id: 'pwa-speed',
    category: 'pwa',
    categoryLabel: 'Installation App',
    categoryIcon: Smartphone,
    title: '⚡ Plus rapide et moins de connexion consommée !',
    body: "Installe l'app DaloaMarket en 2 secondes : navigation ultra-fluide et économie sur ton forfait internet.",
    url: '/',
    recommendedTime: 'Midi entre 12h30 et 13h30',
  },
  {
    id: 'pwa-sellers',
    category: 'pwa',
    categoryLabel: 'Installation App',
    categoryIcon: Smartphone,
    title: '🔔 Ne rate aucun client : installe ton application !',
    body: "Reçois des alertes directes dès qu'un acheteur t'écrit ou passe commande à Daloa. Ajoute l'app sur ton téléphone.",
    url: '/create-listing',
    recommendedTime: 'Matin vers 09h30',
  },
  {
    id: 'pwa-drivers',
    category: 'pwa',
    categoryLabel: 'Installation App',
    categoryIcon: Smartphone,
    title: "🛵 Installe l'application DaloaDelivery sur ton téléphone !",
    body: 'Reçois les alertes sonores de courses express en direct à Daloa et valide tes livraisons en 1 clic.',
    url: 'https://livreur.daloamarket.com/dashboard',
    recommendedTime: 'Matin vers 08h30 ou 11h30',
  },

  // 🎯 2. Inciter à Publier / Vendre
  {
    id: 'pub-passive',
    category: 'publish',
    categoryLabel: 'Vente & Dépôt',
    categoryIcon: PlusCircle,
    title: '💰 Une annonce aujourd’hui, de l’argent qui rentre demain !',
    body: "Publie ton article en 1 minute : il reste visible 24h/24 auprès de milliers d'acheteurs à Daloa. Ne laisse pas dormir tes produits !",
    url: '/create-listing',
    recommendedTime: 'Mercredi ou Jeudi vers 12h30',
  },
  {
    id: 'pub-declutter',
    category: 'publish',
    categoryLabel: 'Vente & Dépôt',
    categoryIcon: PlusCircle,
    title: '📦 Transforme tes objets inutilisés en cash !',
    body: 'Un téléphone, un vêtement ou un appareil qui traîne chez toi ? Dépose ton annonce gratuitement et trouve un acheteur à Daloa aujourd’hui.',
    url: '/create-listing',
    recommendedTime: 'Samedi matin entre 09h00 et 11h00',
  },
  {
    id: 'pub-shop',
    category: 'publish',
    categoryLabel: 'Vente & Dépôt',
    categoryIcon: PlusCircle,
    title: '🏬 Commerçants de Daloa : vendez sans bouger de votre boutique !',
    body: 'Créez votre catalogue en ligne sur DaloaMarket et bénéficiez de la livraison express partout en ville.',
    url: '/create-listing',
    recommendedTime: 'Mardi ou Jeudi matin vers 10h00',
  },

  // 🛍️ 3. Booster les Achats & Nouveautés
  {
    id: 'buy-friday',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    categoryIcon: ShoppingBag,
    title: '🔥 De nouveaux articles sont arrivés à Daloa !',
    body: 'Électronique, mode, motos... Découvre les dernières offres publiées près de chez toi et fais de bonnes affaires.',
    url: '/',
    recommendedTime: 'Vendredi soir vers 18h30',
  },
  {
    id: 'buy-tech',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    categoryIcon: ShoppingBag,
    title: '📱 À la recherche d’un bon téléphone à bon prix ?',
    body: 'iPhone, Samsung, tablettes et accessoires disponibles dès maintenant à Daloa. Compare les prix et commande en toute sécurité.',
    url: '/c/electronique',
    recommendedTime: 'Mercredi vers 13h00',
  },
  {
    id: 'buy-fashion',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    categoryIcon: ShoppingBag,
    title: '👗 Prépare ton week-end avec du style !',
    body: 'Vêtements, chaussures et accessoires tendance en vente à Daloa. Fais-toi livrer directement chez toi.',
    url: '/c/mode',
    recommendedTime: 'Jeudi ou Vendredi vers 17h00',
  },

  // ⚡ 4. Événements & Moments Clés
  {
    id: 'event-weekend',
    category: 'events',
    categoryLabel: 'Moments Clés',
    categoryIcon: Zap,
    title: '🎉 Le week-end commence, les bonnes affaires aussi !',
    body: 'Parcours des centaines d’articles disponibles à Daloa et contacte directement les vendeurs.',
    url: '/',
    recommendedTime: 'Samedi vers 11h00',
  },
  {
    id: 'event-payday',
    category: 'events',
    categoryLabel: 'Moments Clés',
    categoryIcon: Zap,
    title: '💼 C’est la fin du mois : fais-toi plaisir malin !',
    body: 'Trouve ce dont tu as besoin à prix imbattable sur DaloaMarket : électronique, électroménager, mode et plus.',
    url: '/',
    recommendedTime: 'Entre le 28 et le 2 du mois vers 19h00',
  },

  // 🔒 5. Confiance & Sécurité Séquestre
  {
    id: 'trust-escrow',
    category: 'trust',
    categoryLabel: 'Sécurité & Séquestre',
    categoryIcon: ShieldCheck,
    title: '🔒 Achetez l’esprit tranquille avec DaloaPay Séquestre',
    body: 'Votre argent reste bloqué en sécurité et n’est versé au vendeur qu’après vérification et validation de votre code OTP.',
    url: '/how-it-works',
    recommendedTime: 'Lundi ou Mardi vers 14h00',
  },

  // 🛵 6. Recrutement Livreurs DaloaDelivery
  {
    id: 'driver-recruit',
    category: 'drivers',
    categoryLabel: 'Livreurs DaloaDelivery',
    categoryIcon: Bike,
    title: '🛵 Tu as une moto à Daloa ? Gagne de l’argent chaque jour !',
    body: 'Rejoins le réseau DaloaDelivery : reçois des courses directement sur ton téléphone et sois payé instantanément.',
    url: 'https://livreur.daloamarket.com/inscription',
    recommendedTime: 'Lundi ou Mercredi vers 10h00',
  },
];

export const AdminNotificationsTab: React.FC = () => {
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifUrl, setNotifUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchNotifHistory = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setNotifHistory(data || []);
  }, []);

  useEffect(() => {
    fetchNotifHistory();
  }, [fetchNotifHistory]);

  const applyTemplate = (t: NotificationTemplate) => {
    setNotifTitle(t.title);
    setNotifBody(t.body);
    setNotifUrl(t.url);

    // Scroll fluide vers le formulaire
    const formElement = document.getElementById('notif-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    toast.success('Modèle chargé ! Vous pouvez le modifier ou l’envoyer.', { icon: '✨' });
  };

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const sendNotification = async () => {
    if (!notifTitle || !notifBody) {
      toast.error('Titre et corps requis');
      return;
    }
    setLoading(true);
    try {
      const res = await broadcastPushNotification({
        title: notifTitle,
        body: notifBody,
        url: notifUrl || '/',
      });

      if (res && res.success) {
        toast.success(
          res.sent && res.sent > 0
            ? `Notification diffusée sur ${res.sent} appareil(s) !`
            : 'Notification enregistrée et diffusée !'
        );
        setNotifTitle('');
        setNotifBody('');
        setNotifUrl('');
        fetchNotifHistory();
      } else {
        // Fallback local en cas d'indisponibilité du serveur
        const { error: err } = await supabase.from('notifications').insert({
          title: notifTitle,
          body: notifBody,
          url: notifUrl || null,
        });
        if (err) throw err;
        toast.success('Notification enregistrée dans la base');
        setNotifTitle('');
        setNotifBody('');
        setNotifUrl('');
        fetchNotifHistory();
      }
    } catch (err: any) {
      console.error('Erreur diffusion notification:', err);
      toast.error("Erreur lors de l'envoi de la notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-orange-600" />
          Centre des Notifications Push
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Sélectionnez un modèle pré-rédigé en 1 clic, personnalisez-le et diffusez-le à tous vos abonnés.
        </p>
      </div>

      {/* 🌟 CATALOGUE DE MODÈLES PRÊTS À L'EMPLOI */}
      <div className="bg-gradient-to-br from-orange-50/70 via-white to-amber-50/50 p-5 rounded-3xl border border-orange-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                Modèles Pré-Rédigés & Formats Clés
              </h3>
              <p className="text-[11px] text-gray-500">
                Cliquez sur un modèle pour remplir instantanément le formulaire d'envoi
              </p>
            </div>
          </div>

          {/* Filtres par Catégorie */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'pwa', label: '📲 App / PWA' },
              { key: 'publish', label: '💰 Vendre' },
              { key: 'buy', label: '🛍️ Acheter' },
              { key: 'events', label: '⚡ Week-end' },
              { key: 'trust', label: '🔒 Séquestre' },
              { key: 'drivers', label: '🛵 Livreurs' },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all',
                  selectedCategory === cat.key
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-orange-100/60 border border-gray-200/80'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille des Modèles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {filteredTemplates.map((t) => {
            const IconComp = t.categoryIcon;
            return (
              <motion.div
                key={t.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => applyTemplate(t)}
                className="bg-white p-4 rounded-2xl border border-gray-200/80 hover:border-orange-400/80 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-100/70 text-orange-900 text-[10px] font-extrabold uppercase tracking-wide">
                      <IconComp className="w-3 h-3 text-orange-600" />
                      {t.categoryLabel}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
                      {t.url}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 group-hover:text-orange-600 transition-colors leading-snug">
                    {t.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                    {t.body}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t.recommendedTime}
                  </span>
                  <span className="text-xs font-bold text-orange-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Charger ce modèle <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ✍️ FORMULAIRE D'ÉDITION & DIFFUSION */}
      <div id="notif-form-section">
        <Card className="p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm bg-white space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader title="Éditeur de Notification Push" />
            {(notifTitle || notifBody || notifUrl) && (
              <button
                onClick={() => {
                  setNotifTitle('');
                  setNotifBody('');
                  setNotifUrl('');
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-600 transition-colors"
              >
                Effacer
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {/* Titre */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700">Titre de la notification</label>
                <span className={cn('text-[10px] font-mono', notifTitle.length > 50 ? 'text-amber-600 font-bold' : 'text-gray-400')}>
                  {notifTitle.length}/50 car.
                </span>
              </div>
              <input
                type="text"
                placeholder="Ex: 📲 Installe DaloaMarket sur ton écran d'accueil !"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            {/* Corps */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700">Corps du message</label>
                <span className={cn('text-[10px] font-mono', notifBody.length > 130 ? 'text-amber-600 font-bold' : 'text-gray-400')}>
                  {notifBody.length}/130 car.
                </span>
              </div>
              <textarea
                placeholder="Ex: Plus besoin de chercher dans ton navigateur ! Accède à tes annonces en 1 clic..."
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                disabled={loading}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
              />
            </div>

            {/* URL */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Lien de redirection (URL)</label>
              <input
                type="text"
                placeholder="Ex: / ou /create-listing ou /c/electronique"
                value={notifUrl}
                onChange={(e) => setNotifUrl(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            {/* Live Preview Box */}
            {(notifTitle || notifBody) && (
              <div className="p-3.5 bg-gray-900 text-white rounded-2xl shadow-md border border-gray-800 space-y-1 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-orange-600 flex items-center justify-center text-[10px] font-black">
                    DM
                  </div>
                  <span className="text-[11px] font-bold text-gray-300">Aperçu smartphone</span>
                  <span className="text-[10px] text-gray-500 ml-auto">Maintenant</span>
                </div>
                <p className="text-xs font-bold text-white pt-1">{notifTitle || 'Titre de la notification'}</p>
                <p className="text-xs text-gray-300 line-clamp-2">{notifBody || 'Corps du message...'}</p>
              </div>
            )}

            {/* Bouton d'envoi */}
            <Button
              onClick={sendNotification}
              fullWidth
              disabled={loading || !notifTitle.trim() || !notifBody.trim()}
              className="py-3.5 rounded-2xl font-black text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/30 active:scale-[0.98] transition-all"
            >
              <Send size={18} className="mr-2" />
              {loading ? 'Diffusion en cours sur les téléphones...' : 'Diffuser la notification à tous les abonnés'}
            </Button>
          </div>
        </Card>
      </div>

      {/* 📜 HISTORIQUE DES NOTIFICATIONS */}
      <div>
        <SectionHeader title="Historique des diffusions récentes" />
        {notifHistory.length === 0 ? (
          <EmptyState title="Aucune notification envoyée" />
        ) : (
          <div className="space-y-2 mt-3">
            {notifHistory.map((n) => (
              <Card key={n.id} className="p-4 rounded-2xl flex items-start gap-3 shadow-xs border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                  {n.url && (
                    <span className="inline-block mt-1 text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Cible: {n.url}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                    <Clock size={11} />
                    {formatDate(n.created_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminNotificationsTab;
