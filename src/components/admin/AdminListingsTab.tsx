import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  CheckCircle,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Tag,
  MapPin,
  User,
  Phone,
  Store,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { cn, formatPrice, formatDate, getListingPath, formatWhatsAppPhone } from '../../lib/utils';

interface AdminListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  district: string;
  photos: string[];
  boosted_until: string | null;
  created_at: string;
  status: 'active' | 'sold' | 'deleted';
  contact_phone: string | null;
  stock: number;
  user?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    shop_name: string | null;
    shop_slug: string | null;
  } | null;
}

export const AdminListingsTab: React.FC = () => {
  const ITEMS_PER_PAGE = 25;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [listingSearch, setListingSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listingPage, setListingPage] = useState(0);
  const [listingTotal, setListingTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sold' | 'deleted'>('all');
  const [statusCounts, setStatusCounts] = useState({ all: 0, active: 0, sold: 0, deleted: 0 });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(listingSearch.trim());
      setListingPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [listingSearch]);

  // Fetch counts for all tabs
  const fetchCounts = useCallback(async () => {
    try {
      const [allRes, activeRes, soldRes, deletedRes] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'deleted'),
      ]);

      setStatusCounts({
        all: allRes.count || 0,
        active: activeRes.count || 0,
        sold: soldRes.count || 0,
        deleted: deletedRes.count || 0,
      });
    } catch (e) {
      console.warn('Error fetching counts:', e);
    }
  }, []);

  // Fetch listings with filters & pagination
  const fetchListings = useCallback(async (page = 0, currentSearch = debouncedSearch, status = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('listings')
        .select('*, user:users!listings_user_id_fkey(id, full_name, phone, avatar_url, shop_name, shop_slug)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (currentSearch) {
        query = query.or(`title.ilike.%${currentSearch}%,description.ilike.%${currentSearch}%,district.ilike.%${currentSearch}%,category.ilike.%${currentSearch}%`);
      }

      query = query.range(from, to);

      const { data, count, error: err } = await query;

      if (err) throw err;

      setListings((data as AdminListing[]) || []);
      setListingTotal(count || 0);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur chargement annonces : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchListings(listingPage, debouncedSearch, statusFilter);
  }, [fetchListings, listingPage, debouncedSearch, statusFilter]);

  const goToListingPage = (page: number) => {
    setListingPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateStatus = async (id: string, newStatus: 'active' | 'sold' | 'deleted') => {
    const actionLabel = newStatus === 'deleted' ? 'supprimer' : newStatus === 'sold' ? 'marquer comme vendue' : 'réactiver';
    if (newStatus === 'deleted' && !confirm(`Êtes-vous sûr de vouloir ${actionLabel} cette annonce ?`)) return;

    try {
      const { error: err } = await supabase.from('listings').update({ status: newStatus }).eq('id', id);
      if (err) throw err;

      toast.success(`Annonce passée en "${newStatus}" avec succès`);
      fetchCounts();
      fetchListings(listingPage);
    } catch (err: any) {
      toast.error('Erreur mise à jour : ' + err.message);
    }
  };

  const handleToggleBoost = async (id: string, isBoosted: boolean) => {
    try {
      const boostedUntil = isBoosted ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: err } = await supabase
        .from('listings')
        .update({ boosted_until: boostedUntil })
        .eq('id', id);

      if (err) throw err;

      toast.success(isBoosted ? 'Boost retiré' : 'Annonce boostée pour 7 jours 🚀');
      fetchListings(listingPage);
    } catch (err: any) {
      toast.error('Erreur boost : ' + err.message);
    }
  };

  const handleDeletePermanent = async (id: string, title: string) => {
    if (!confirm(`⚠️ SUPPRESSION DÉFINITIVE :\nVoulez-vous supprimer pour toujours l'annonce "${title}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const { error: err } = await supabase.from('listings').delete().eq('id', id);
      if (err) throw err;

      toast.success('Annonce définitivement supprimée de la base');
      fetchCounts();
      fetchListings(listingPage);
    } catch (err: any) {
      toast.error('Erreur suppression : ' + err.message);
    }
  };

  const handleShareToChannel = (l: AdminListing) => {
    const listingUrl = `https://daloamarket.com${getListingPath(l.id)}`;
    const text = `🛍️ NOUVEL ARRIVAGE SUR DALOA MARKET !

📦 *${l.title}*
💰 Prix : *${formatPrice(l.price)}*
📍 Quartier : ${l.district || 'Daloa'}
👤 Vendeur : ${l.user?.shop_name || l.user?.full_name || 'Vendeur DaloaMarket'}

👉 Voir l'article et commander en toute sécurité :
${listingUrl}

🛵 Livraison express partout à Daloa avec DaloaDelivery !`;

    navigator.clipboard.writeText(text);
    toast.success('Texte copié ! Ouverture de WhatsApp pour la chaîne...', { icon: '📢' });
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTopDigest = () => {
    const activeListings = listings.filter((l) => l.status === 'active').slice(0, 5);
    if (activeListings.length === 0) {
      toast.error('Aucune annonce active trouvée');
      return;
    }

    const itemsText = activeListings
      .map(
        (l, i) =>
          `${i + 1}. *${l.title}* — ${formatPrice(l.price)} (${l.district || 'Daloa'})\n👉 https://daloamarket.com${getListingPath(l.id)}`
      )
      .join('\n\n');

    const text = `🔥 ARRIVAGES DU JOUR SUR DALOA MARKET !

Découvrez les dernières pépites publiées aujourd'hui à Daloa :

${itemsText}

📱 Retrouvez toutes les annonces sur : https://daloamarket.com
🛵 Livraison rapide partout en ville !`;

    navigator.clipboard.writeText(text);
    toast.success('Digest des 5 annonces copié ! Ouverture de WhatsApp...', { icon: '🔥' });
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const totalPages = Math.ceil(listingTotal / ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-full">
      {/* Header avec Titre et Compteurs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            <span>Gestion des Annonces</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {statusCounts.all} annonces au total dans le catalogue DaloaMarket
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton Digest WhatsApp Chaîne */}
          <button
            onClick={handleShareTopDigest}
            disabled={loading}
            title="Générer et diffuser un résumé des 5 dernières annonces sur votre chaîne WhatsApp"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all border border-emerald-200/80 shadow-2xs active:scale-95"
          >
            <WhatsAppIcon size={14} className="w-3.5 h-3.5" />
            <span>📢 Digest Chaîne WhatsApp (Top 5)</span>
          </button>

          <button
            onClick={() => {
              fetchCounts();
              fetchListings(listingPage);
            }}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all border border-gray-200 shadow-2xs active:scale-95 self-start sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : ''} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Barre de recherche globale & Filtres */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par titre, quartier, catégorie (sur les 690+ annonces)..."
            value={listingSearch}
            onChange={(e) => setListingSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-900 focus:bg-white focus:border-orange-500 focus:outline-none transition-all"
          />
          {listingSearch && (
            <button
              onClick={() => setListingSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Onglets de filtrage par statut */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { key: 'all', label: 'Toutes', count: statusCounts.all },
              { key: 'active', label: 'Actives', count: statusCounts.active },
              { key: 'sold', label: 'Vendues', count: statusCounts.sold },
              { key: 'deleted', label: 'Supprimées', count: statusCounts.deleted },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setListingPage(0);
                }}
                className={cn(
                  'px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95 shadow-2xs',
                  isActive
                    ? 'bg-orange-500 text-white shadow-orange-500/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                    isActive ? 'bg-white/25 text-white' : 'bg-white text-gray-700'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {loading && listings.length === 0 ? (
        <div className="flex justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchListings(listingPage)} />
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <EmptyState
            title="Aucune annonce trouvée"
            description={debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : 'Aucune annonce dans cette catégorie.'}
            icon={<FileText size={48} className="text-gray-300" />}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Listings Table / Cards */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                    <th className="p-3.5 pl-5">Article</th>
                    <th className="p-3.5">Prix & Stock</th>
                    <th className="p-3.5">Vendeur & Contact</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5">Boost</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {listings.map((l) => {
                    const isBoosted = Boolean(l.boosted_until && new Date(l.boosted_until) > new Date());
                    const listingPath = getListingPath(l.id);
                    const thumbnail = l.photos?.[0] || '/logo.png';
                    const sellerPhone = l.contact_phone || l.user?.phone;
                    const waPhone = formatWhatsAppPhone(sellerPhone);

                    return (
                      <tr key={l.id} className="hover:bg-orange-50/30 transition-colors group">
                        {/* Article Info + Thumbnail */}
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-3 min-w-[240px] max-w-[320px]">
                            <a
                              href={listingPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200/60 shadow-2xs group/img block"
                            >
                              <img
                                src={thumbnail}
                                alt={l.title}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/logo.png';
                                }}
                              />
                              {l.photos?.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] font-black text-white px-1 rounded-md">
                                  +{l.photos.length - 1}
                                </span>
                              )}
                            </a>

                            <div className="min-w-0 flex-1">
                              <a
                                href={listingPath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-extrabold text-sm text-gray-900 hover:text-orange-600 flex items-center gap-1 group-hover:underline truncate"
                                title={l.title}
                              >
                                <span className="truncate">{l.title}</span>
                                <ExternalLink size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-orange-500" />
                              </a>

                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                <span className="inline-flex items-center gap-0.5 text-gray-600 font-bold">
                                  <Tag size={10} className="text-gray-400" />
                                  {l.category}
                                </span>
                                {l.district && (
                                  <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-0.5 truncate">
                                      <MapPin size={10} className="text-gray-400" />
                                      {l.district}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Prix & Stock */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-black text-sm text-gray-900">{formatPrice(l.price)}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <span className="font-bold">Stock :</span>
                            <span className={l.stock > 0 ? 'text-emerald-600 font-extrabold' : 'text-red-500 font-bold'}>
                              {l.stock > 0 ? l.stock : 'Épuisé'}
                            </span>
                          </div>
                        </td>

                        {/* Vendeur & Contact */}
                        <td className="p-3.5">
                          <div className="min-w-[150px]">
                            <div className="font-bold text-xs text-gray-900 truncate">
                              {l.user?.shop_name || l.user?.full_name || 'Utilisateur'}
                            </div>

                            {sellerPhone && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <a
                                  href={`tel:${sellerPhone}`}
                                  className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-0.5"
                                  title="Appeler"
                                >
                                  <Phone size={10} />
                                  <span>{sellerPhone}</span>
                                </a>

                                {waPhone && (
                                  <a
                                    href={`https://wa.me/${waPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    title="WhatsApp"
                                  >
                                    <WhatsAppIcon size={12} />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1',
                              l.status === 'sold'
                                ? 'bg-red-50 text-red-700 border border-red-200/60'
                                : l.status === 'deleted'
                                ? 'bg-gray-100 text-gray-600 border border-gray-200/60'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            )}
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                l.status === 'sold' ? 'bg-red-500' : l.status === 'deleted' ? 'bg-gray-400' : 'bg-emerald-500'
                              )}
                            />
                            {l.status === 'sold' ? 'Vendu' : l.status === 'deleted' ? 'Supprimé' : 'Actif'}
                          </span>
                        </td>

                        {/* Boost */}
                        <td className="p-3.5 whitespace-nowrap">
                          {isBoosted ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                              <Sparkles size={12} className="text-amber-500" />
                              <span>Boosté</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-semibold">Standard</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                          {formatDate(l.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Partage Chaîne WhatsApp */}
                            {l.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleShareToChannel(l)}
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all active:scale-95 flex items-center gap-1 font-bold text-[11px]"
                                title="Diffuser sur la chaîne WhatsApp"
                              >
                                <WhatsAppIcon size={14} className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Chaîne</span>
                              </button>
                            )}

                            {/* Boost / Unboost */}
                            <button
                              type="button"
                              onClick={() => handleToggleBoost(l.id, isBoosted)}
                              className={cn(
                                'p-2 rounded-xl text-xs font-bold transition-all active:scale-95',
                                isBoosted
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600'
                              )}
                              title={isBoosted ? 'Retirer le boost' : 'Booster pour 7 jours'}
                            >
                              <Sparkles size={14} />
                            </button>

                            {/* Mark Sold / Active */}
                            {l.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(l.id, 'sold')}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 active:scale-95 transition-all"
                                title="Marquer comme vendue"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}

                            {/* Reactivate if sold or deleted */}
                            {l.status !== 'active' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(l.id, 'active')}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 active:scale-95 transition-all"
                                title="Réactiver l'annonce"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}

                            {/* Soft Delete */}
                            {l.status !== 'deleted' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(l.id, 'deleted')}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 active:scale-95 transition-all"
                                title="Mettre à la corbeille (Supprimer)"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            {/* Permanent Delete (only if already deleted) */}
                            {l.status === 'deleted' && (
                              <button
                                type="button"
                                onClick={() => handleDeletePermanent(l.id, l.title)}
                                className="p-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 active:scale-95 transition-all font-black text-[10px]"
                                title="Supprimer définitivement"
                              >
                                <Trash2 size={14} className="text-red-700" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-xs font-bold text-gray-600">
            <div>
              Affichage de {listings.length > 0 ? listingPage * ITEMS_PER_PAGE + 1 : 0} à{' '}
              {Math.min((listingPage + 1) * ITEMS_PER_PAGE, listingTotal)} sur{' '}
              <span className="text-gray-900 font-extrabold">{listingTotal}</span> annonces
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => goToListingPage(listingPage - 1)}
                  disabled={listingPage === 0 || loading}
                  className="rounded-xl"
                >
                  Précédent
                </Button>

                <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 font-black text-xs">
                  Page {listingPage + 1} / {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outlined"
                  onClick={() => goToListingPage(listingPage + 1)}
                  disabled={listingPage + 1 >= totalPages || loading}
                  className="rounded-xl"
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
export default AdminListingsTab;
