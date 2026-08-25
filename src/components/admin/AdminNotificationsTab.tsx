import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Tag,
  MessageCircle,
  Share2,
  ChevronRight,
  HeartHandshake,
  Search
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
  category: 'whatsapp' | 'pwa' | 'publish' | 'buy' | 'events' | 'trust' | 'drivers' | 'reactivate';
  categoryLabel: string;
  categoryIcon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  url: string;
  recommendedTime: string;
}

const TEMPLATES: NotificationTemplate[] = [
  // 💬 0. LEVIER A — CATALOGUE WHATSAPP & STATUT VENDEUR
  {
    id: 'whatsapp-no-blur',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    categoryIcon: MessageCircle,
    title: "📲 Fini d'envoyer 30 photos floues sur ton statut WhatsApp !",
    body: "Partage simplement le lien de ta boutique DaloaMarket. Tes clients voient tous tes articles avec prix et photos nettes en 1 clic.",
    url: '/profile?tab=shop',
    recommendedTime: 'Matin entre 08h30 et 10h00',
  },
  {
    id: 'whatsapp-pro-time',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    categoryIcon: Share2,
    title: "💼 Gagne du temps : ton catalogue complet en 1 seul lien",
    body: "Ne perds plus des heures à répéter les prix en inbox ! Mets le lien de ta boutique DaloaMarket dans ton statut et sur tes groupes.",
    url: '/profile?tab=shop',
    recommendedTime: 'Après-midi entre 13h30 et 15h00',
  },
  {
    id: 'whatsapp-direct-contact',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    categoryIcon: MessageCircle,
    title: "💬 Partage ta vitrine : tes clients te contactent en direct",
    body: "En voyant ta boutique DaloaMarket, tes clients découvrent tout ton stock et peuvent t'écrire ou t'appeler directement sur WhatsApp.",
    url: '/profile?tab=shop',
    recommendedTime: 'Samedi matin entre 08h30 et 10h30',
  },
  {
    id: 'whatsapp-new-arrivals',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    categoryIcon: Share2,
    title: "🚀 Nouvel arrivage ? Partage ton lien en statut aujourd'hui !",
    body: "Dépose tes nouveautés sur DaloaMarket et partage le lien dans ton statut WhatsApp pour faire exploser tes ventes du jour.",
    url: '/create-listing',
    recommendedTime: 'Mercredi ou Vendredi vers 11h00',
  },
  {
    id: 'whatsapp-join-channel',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    categoryIcon: MessageCircle,
    title: "🛍️ Rejoins la chaîne WhatsApp officielle DaloaMarket !",
    body: "Sois le premier alerté des nouveaux arrivages, ventes flash et promotions à Daloa. Clique pour t'abonner !",
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Soirée vers 19h00 ou week-end',
  },
  {
    id: 'whatsapp-deals-channel',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    categoryIcon: Sparkles,
    title: "⚡ Bons plans en direct : rejoins notre chaîne WhatsApp",
    body: "Découvre les meilleures pépites publiées chaque jour à Daloa directement dans ton onglet Actus WhatsApp.",
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Midi vers 12h30 ou Vendredi soir',
  },

  // 📲 1. INSTALLATION PWA / APPLICATION MOBILE
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

  // 💰 2. INCITER À PUBLIER & VENDRE
  {
    id: 'pub-passive',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    categoryIcon: PlusCircle,
    title: '💰 Une annonce aujourd’hui, de l’argent qui rentre demain !',
    body: "Publie ton article en 1 minute : il reste visible 24h/24 auprès de milliers d'acheteurs à Daloa. Ne laisse pas dormir tes produits !",
    url: '/create-listing',
    recommendedTime: 'Mercredi ou Jeudi vers 12h30',
  },
  {
    id: 'pub-declutter',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    categoryIcon: PlusCircle,
    title: '📦 Transforme tes objets inutilisés en cash !',
    body: 'Un téléphone, un vêtement ou un appareil qui traîne chez toi ? Dépose ton annonce gratuitement et trouve un acheteur à Daloa aujourd’hui.',
    url: '/create-listing',
    recommendedTime: 'Samedi matin entre 09h00 et 11h00',
  },
  {
    id: 'pub-shop',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    categoryIcon: PlusCircle,
    title: '🏬 Commerçants de Daloa : vendez sans bouger de votre boutique !',
    body: 'Créez votre catalogue en ligne sur DaloaMarket et bénéficiez de la livraison express partout en ville.',
    url: '/create-listing',
    recommendedTime: 'Mardi ou Jeudi matin vers 10h00',
  },
  {
    id: 'pub-vehicles',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    categoryIcon: PlusCircle,
    title: '🏍️ Vends ta moto ou ta voiture rapidement à Daloa !',
    body: 'Des centaines d’acheteurs cherchent des engins roulants tous les jours. Dépose ton annonce avec photos en 2 minutes.',
    url: '/create-listing',
    recommendedTime: 'Samedi vers 10h30',
  },
  {
    id: 'pub-pro-badge',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    categoryIcon: PlusCircle,
    title: '👑 Passe Vendeur PRO et multiplie tes ventes par 5 !',
    body: 'Obtiens le badge vérifié, une commission réduite à 2.5% et une visibilité maximale en tête de liste.',
    url: '/devenir-pro',
    recommendedTime: 'Lundi matin vers 09h00',
  },

  // 🛍️ 3. ACHATS, NOUVEAUTÉS & CATÉGORIES
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
  {
    id: 'buy-motos',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    categoryIcon: ShoppingBag,
    title: '🏍️ Motos Haojue, TVS, Boxer disponibles à Daloa !',
    body: 'Trouve la moto idéale pour tes déplacements ou ton activité à des prix défiant toute concurrence.',
    url: '/c/vehicules',
    recommendedTime: 'Samedi vers 11h00',
  },
  {
    id: 'buy-home',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    categoryIcon: ShoppingBag,
    title: '📺 Équipe ta maison au meilleur prix à Daloa !',
    body: 'Smart TV, réfrigérateurs, ventilateurs et meubles disponibles immédiatement près de chez toi.',
    url: '/c/maison-deco',
    recommendedTime: 'Dimanche après-midi vers 15h00',
  },

  // ⚡ 4. ÉVÉNEMENTS, WEEK-END & FIN DE MOIS
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
  {
    id: 'event-sunday-deals',
    category: 'events',
    categoryLabel: 'Moments Clés',
    categoryIcon: Zap,
    title: '☕ Dimanche tranquille : explore les ventes flash !',
    body: 'Installe-toi confortablement et découvre les offres exclusives disponibles ce dimanche à Daloa.',
    url: '/',
    recommendedTime: 'Dimanche matin vers 10h00',
  },
  {
    id: 'event-rentree',
    category: 'events',
    categoryLabel: 'Moments Clés',
    categoryIcon: Zap,
    title: '🎒 Prépare la rentrée sans te ruiner à Daloa !',
    body: 'Fournitures, sacs, ordinateurs portables et tenues scolaires à prix direct particulier.',
    url: '/search',
    recommendedTime: 'Période de rentrée scolaire vers 14h00',
  },

  // 🔒 5. SÉCURITÉ, CONFIANCE & SÉQUESTRE
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
  {
    id: 'trust-fast-delivery',
    category: 'trust',
    categoryLabel: 'Sécurité & Séquestre',
    categoryIcon: ShieldCheck,
    title: '⚡ Livraison en moins de 45 minutes partout à Daloa !',
    body: 'Commandez en ligne et recevez votre colis à Commerce, Tazibouo, Lobia ou Kennedy sans vous déplacer.',
    url: '/how-it-works',
    recommendedTime: 'Mercredi ou Vendredi vers 11h30',
  },

  // 🔄 6. RÉACTIVATION DES INACTIFS
  {
    id: 'reactivate-missed',
    category: 'reactivate',
    categoryLabel: 'Réactivation',
    categoryIcon: HeartHandshake,
    title: '👋 Tu nous as manqué ! Découvre les nouveautés à Daloa',
    body: 'Des dizaines de nouvelles annonces ont été publiées cette semaine dans ton quartier. Viens jeter un coup d’œil !',
    url: '/',
    recommendedTime: 'Samedi après-midi vers 16h00',
  },
  {
    id: 'reactivate-price-drop',
    category: 'reactivate',
    categoryLabel: 'Réactivation',
    categoryIcon: Tag,
    title: '📉 Des baisses de prix viennent d’avoir lieu à Daloa !',
    body: 'Plusieurs vendeurs ont réduit leurs tarifs aujourd’hui. C’est le moment idéal pour faire une bonne affaire.',
    url: '/search',
    recommendedTime: 'Mardi soir vers 19h00',
  },

  // 🛵 7. LIVREURS DALOADELIVERY
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
  {
    id: 'driver-online',
    category: 'drivers',
    categoryLabel: 'Livreurs DaloaDelivery',
    categoryIcon: Bike,
    title: '🛵 Forte demande de livraisons en cours à Daloa !',
    body: 'Passez en ligne sur votre cockpit DaloaDelivery : plusieurs colis attendent d’être pris en charge dès maintenant.',
    url: 'https://livreur.daloamarket.com/dashboard',
    recommendedTime: 'Midi (12h00) ou Soir (18h00)',
  },
];

export const AdminNotificationsTab: React.FC = () => {
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifUrl, setNotifUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'sellers' | 'buyers' | 'drivers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'composer' | 'templates' | 'history'>('composer');

  const fetchNotifHistory = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifHistory(data || []);
  }, []);

  useEffect(() => {
    fetchNotifHistory();
  }, [fetchNotifHistory]);

  const applyTemplate = (t: NotificationTemplate) => {
    setNotifTitle(t.title);
    setNotifBody(t.body);
    setNotifUrl(t.url);
    setActiveTab('composer');

    toast.success('Modèle injecté dans le studio !', {
      icon: '✨',
      style: { borderRadius: '14px', background: '#18181b', color: '#fff', fontSize: '13px' }
    });
  };

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error('Veuillez renseigner le titre et le corps du message');
      return;
    }
    setLoading(true);
    try {
      const res = await broadcastPushNotification({
        title: notifTitle.trim(),
        body: notifBody.trim(),
        url: notifUrl.trim() || '/',
      });

      if (res && res.success) {
        toast.success(
          res.sent && res.sent > 0
            ? `🚀 Notification diffusée avec succès sur ${res.sent} appareil(s) !`
            : '✨ Notification enregistrée et diffusée à tous les abonnés !',
          { duration: 4000 }
        );
        setNotifTitle('');
        setNotifBody('');
        setNotifUrl('');
        fetchNotifHistory();
      } else {
        const { error: err } = await supabase.from('notifications').insert({
          title: notifTitle.trim(),
          body: notifBody.trim(),
          url: notifUrl.trim() || null,
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

  const quickLinks = [
    { label: 'Accueil', url: '/' },
    { label: 'Publier Annonce', url: '/create-listing' },
    { label: 'Ma Boutique', url: '/profile?tab=shop' },
    { label: 'Réglages Boutique', url: '/settings?tab=boutique' },
    { label: 'Mon Compte', url: '/settings?tab=compte' },
    { label: 'Chaîne WhatsApp', url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U' },
    { label: 'Cockpit Livreur', url: 'https://livreur.daloamarket.com/dashboard' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* 🚀 BANDEAU HAUT - STATS & STATUS EN DIRECT */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-zinc-900 to-orange-950 p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-orange-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Service Push Web & Mobile Opérationnel
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Studio des Notifications
              <span className="text-xs px-2.5 py-1 rounded-lg bg-orange-500 text-white font-extrabold tracking-wide uppercase">
                Pro
              </span>
            </h1>
            <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
              Créez, simulez en temps réel et diffusez vos alertes push pour booster les ventes, attirer sur WhatsApp ou mobiliser les livreurs.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <div className="text-2xl font-black text-white">{TEMPLATES.length}</div>
              <div className="text-[11px] font-medium text-gray-400">Modèles prêts</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <div className="text-2xl font-black text-orange-400">{notifHistory.length}</div>
              <div className="text-[11px] font-medium text-gray-400">Diffusions faites</div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center flex flex-col justify-center">
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                100% Gratuit
              </div>
              <div className="text-[11px] font-medium text-gray-400 mt-0.5">Illimité PWA</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setActiveTab('composer')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
              activeTab === 'composer'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Studio & Simulation
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
              activeTab === 'templates'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Tag className="w-4 h-4" />
            Bibliothèque de Modèles ({TEMPLATES.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Clock className="w-4 h-4" />
            Historique ({notifHistory.length})
          </button>
        </div>
      </div>

      {/* 🎨 CONTENU PRINCIPAL PAR ONGLET */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLONNE GAUCHE (7 cols) : ÉDITEUR STUDIO */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-orange-600" />
                    Rédacteur d'alerte push
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Personnalisez votre message ou choisissez un modèle rapide</p>
                </div>
                {(notifTitle || notifBody || notifUrl) && (
                  <button
                    onClick={() => {
                      setNotifTitle('');
                      setNotifBody('');
                      setNotifUrl('');
                    }}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Effacer tout
                  </button>
                )}
              </div>

              {/* Audience Selector */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Audience Cible</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: '📢 Tous', desc: 'Tout Daloa' },
                    { id: 'sellers', label: '🛍️ Vendeurs', desc: 'Commerces' },
                    { id: 'buyers', label: '🛒 Acheteurs', desc: 'Clients' },
                    { id: 'drivers', label: '🛵 Livreurs', desc: 'Flotte DD' },
                  ].map((aud) => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setTargetAudience(aud.id as any)}
                      className={cn(
                        'p-2.5 rounded-2xl border text-left transition-all',
                        targetAudience === aud.id
                          ? 'bg-orange-50/80 border-orange-500 text-orange-950 ring-1 ring-orange-500'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-600'
                      )}
                    >
                      <div className="font-extrabold text-xs">{aud.label}</div>
                      <div className="text-[10px] text-gray-400">{aud.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">Titre percutant (avec émoji)</label>
                  <span className={cn('text-[11px] font-mono font-medium', notifTitle.length > 45 ? 'text-amber-600 font-bold' : 'text-gray-400')}>
                    {notifTitle.length}/50 car.
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: 📲 Fini d'envoyer 30 photos floues sur WhatsApp !"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/40 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Corps */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">Corps du message (clair et incitatif)</label>
                  <span className={cn('text-[11px] font-mono font-medium', notifBody.length > 120 ? 'text-amber-600 font-bold' : 'text-gray-400')}>
                    {notifBody.length}/130 car.
                  </span>
                </div>
                <textarea
                  placeholder="Ex: Partage le lien de ta boutique DaloaMarket dans ton statut pour que tes clients voient tes prix et photos en 1 clic..."
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/40 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* URL Cible */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">Lien de redirection au clic</label>
                <input
                  type="text"
                  placeholder="Ex: /profile ou /create-listing ou https://whatsapp.com/channel/..."
                  value={notifUrl}
                  onChange={(e) => setNotifUrl(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/40 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />

                {/* Quick link shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">Raccourcis :</span>
                  {quickLinks.map((ql) => (
                    <button
                      key={ql.label}
                      type="button"
                      onClick={() => setNotifUrl(ql.url)}
                      className={cn(
                        'text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors',
                        notifUrl === ql.url
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      {ql.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouton de diffusion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={sendNotification}
                  disabled={loading || !notifTitle.trim() || !notifBody.trim()}
                  className={cn(
                    'w-full py-4 px-6 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2.5 shadow-lg transition-all',
                    loading || !notifTitle.trim() || !notifBody.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:brightness-110 active:scale-[0.99] shadow-orange-500/30'
                  )}
                >
                  <Send className={cn('w-4 h-4', loading && 'animate-spin')} />
                  {loading ? 'Diffusion en cours sur les smartphones...' : 'Diffuser la Notification Push Instantanément'}
                </button>
              </div>

            </div>
          </div>

          {/* COLONNE DROITE (5 cols) : SIMULATEUR SMARTPHONE INTERACTIF */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-gradient-to-b from-gray-900 to-zinc-950 rounded-3xl p-6 border border-gray-800 shadow-2xl text-white">
              
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                    Aperçu Écran Verrouillé
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Temps réel
                </span>
              </div>

              {/* Phone Mockup Frame */}
              <div className="relative mx-auto w-full max-w-[320px] rounded-[36px] bg-black/90 p-4 border-[6px] border-zinc-800 shadow-inner space-y-4">
                
                {/* Notch / Dynamic Island */}
                <div className="mx-auto w-24 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
                </div>

                {/* Clock */}
                <div className="text-center py-2">
                  <div className="text-4xl font-light tracking-tight text-white/90">
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[11px] font-medium text-gray-400 capitalize">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
                </div>

                {/* Notification Bubble */}
                <motion.div
                  key={`${notifTitle}-${notifBody}`}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-3.5 shadow-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-gray-300">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center font-black text-[10px] text-white shadow-sm">
                        DM
                      </div>
                      <div className="leading-tight">
                        <span className="text-[11px] font-black text-white block">DALOA MARKET</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">À l'instant</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-extrabold text-white leading-tight">
                      {notifTitle || '📲 Titre de votre notification...'}
                    </div>
                    <div className="text-[11px] text-gray-300 leading-snug line-clamp-3">
                      {notifBody || 'Le corps de votre message s’affichera ici exactement comme sur l’écran des utilisateurs.'}
                    </div>
                  </div>

                  {notifUrl && (
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-semibold">
                      <span>Redirection : {notifUrl}</span>
                      <span>Ouvrir ↗</span>
                    </div>
                  )}
                </motion.div>

                {/* Bottom lock screen icon */}
                <div className="flex justify-around pt-4 text-gray-500 text-xs">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">🔦</div>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">📷</div>
                </div>
              </div>

              {/* Shortcut to Library */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => setActiveTab('templates')}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explorer les {TEMPLATES.length} modèles prêts à l'emploi
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 📚 ONGLET BIBLIOTHÈQUE DE MODÈLES */}
      {activeTab === 'templates' && (
        <div className="space-y-5">
          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par mot-clé (ex: WhatsApp, Moto, Week-end, PWA, Vendeur...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="text-xs font-bold text-gray-500">
                {filteredTemplates.length} modèle(s) trouvé(s)
              </div>
            </div>

            {/* Catégories Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: 'all', label: `Tous (${TEMPLATES.length})` },
                { key: 'whatsapp', label: '💬 WhatsApp & Chaîne (6)' },
                { key: 'pwa', label: '📲 App PWA (4)' },
                { key: 'publish', label: '💰 Vendre (5)' },
                { key: 'buy', label: '🛍️ Acheter (5)' },
                { key: 'events', label: '⚡ Week-end (4)' },
                { key: 'trust', label: '🔒 Séquestre (2)' },
                { key: 'reactivate', label: '🔄 Réactivation (2)' },
                { key: 'drivers', label: '🛵 Livreurs (2)' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all',
                    selectedCategory === cat.key
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille des Modèles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((t) => {
              const IconComp = t.categoryIcon;
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200/90 hover:border-orange-400 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 text-[11px] font-extrabold">
                        <IconComp className="w-3.5 h-3.5 text-orange-600" />
                        {t.categoryLabel}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
                        {t.url}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-orange-600 transition-colors leading-snug">
                      {t.title}
                    </h4>

                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {t.body}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {t.recommendedTime}
                    </span>

                    <button
                      onClick={() => applyTemplate(t)}
                      className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white font-extrabold text-xs transition-all flex items-center gap-1"
                    >
                      Utiliser <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 📜 ONGLET HISTORIQUE */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-extrabold text-sm text-gray-900">
              Historique des 30 dernières diffusions
            </h3>
            <button
              onClick={fetchNotifHistory}
              className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
            >
              <Clock className="w-3 h-3" /> Actualiser
            </button>
          </div>

          {notifHistory.length === 0 ? (
            <EmptyState title="Aucune notification diffusée pour le moment" />
          ) : (
            <div className="divide-y divide-gray-100">
              {notifHistory.map((n) => (
                <div key={n.id} className="py-3.5 flex items-start justify-between gap-4 hover:bg-gray-50/50 p-2 rounded-2xl transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs sm:text-sm text-gray-900">{n.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{n.body}</div>
                      {n.url && (
                        <span className="inline-block mt-1 text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                          Cible: {n.url}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-gray-400 font-medium">
                      {formatDate(n.created_at)}
                    </div>
                    <button
                      onClick={() => {
                        setNotifTitle(n.title);
                        setNotifBody(n.body);
                        setNotifUrl(n.url || '');
                        setActiveTab('composer');
                      }}
                      className="mt-1 text-[11px] font-extrabold text-orange-600 hover:text-orange-700 block"
                    >
                      Réutiliser ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </motion.div>
  );
};

export default AdminNotificationsTab;
