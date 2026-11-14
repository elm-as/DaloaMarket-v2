import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { attachContactPhones } from '../../lib/contacts';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { cn } from '../../lib/utils';
import { AdminPageHeader, AdminButton } from './ui/AdminUI';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import {
  buildListingsDigestShareText,
  buildListingWhatsAppShareText,
  type AdminListing,
  type AdminListingStatusCounts,
  type AdminListingStatusFilter,
} from './listings/adminListings.types';
import { AdminListingsDesktopTable } from './listings/AdminListingsDesktopTable';
import { AdminListingsMobileList } from './listings/AdminListingsMobileList';

const ITEMS_PER_PAGE = 25;

export const AdminListingsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [listingSearch, setListingSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listingPage, setListingPage] = useState(0);
  const [listingTotal, setListingTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AdminListingStatusFilter>('all');
  const [statusCounts, setStatusCounts] = useState<AdminListingStatusCounts>({
    all: 0,
    active: 0,
    sold: 0,
    deleted: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(listingSearch.trim());
      setListingPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [listingSearch]);

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

  const fetchListings = useCallback(
    async (page = 0, currentSearch = debouncedSearch, status = statusFilter) => {
      setLoading(true);
      setError(null);
      try {
        const from = page * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        let query = supabase
          .from('listings')
          .select('*, user:users!listings_user_id_fkey(id, full_name, avatar_url, shop_name, shop_slug)', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (status !== 'all') query = query.eq('status', status);
        if (currentSearch) {
          query = query.or(
            `title.ilike.%${currentSearch}%,description.ilike.%${currentSearch}%,district.ilike.%${currentSearch}%,category.ilike.%${currentSearch}%`,
          );
        }
        const { data, count, error: err } = await query.range(from, to);
        if (err) throw err;

        await attachContactPhones(((data as any[]) || []).map((l) => l.user));
        setListings((data as unknown as AdminListing[]) || []);
        setListingTotal(count || 0);
      } catch (err: any) {
        setError(err.message);
        toast.error('Erreur chargement annonces : ' + err.message);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter],
  );

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => {
    fetchListings(listingPage, debouncedSearch, statusFilter);
  }, [fetchListings, listingPage, debouncedSearch, statusFilter]);

  const goToListingPage = (page: number) => {
    setListingPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateStatus = async (id: string, newStatus: 'active' | 'sold' | 'deleted') => {
    const actionLabel = newStatus === 'deleted' ? 'supprimer' : newStatus === 'sold' ? 'marquer comme vendue' : 'réactiver';
    if (
      newStatus === 'deleted' &&
      !(await confirmDialog({ message: `Êtes-vous sûr de vouloir ${actionLabel} cette annonce ?`, confirmLabel: 'Confirmer', danger: true }))
    ) return;
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
      const { error: err } = await supabase.from('listings').update({ boosted_until: boostedUntil }).eq('id', id);
      if (err) throw err;
      toast.success(isBoosted ? 'Boost retiré' : 'Annonce boostée pour 7 jours');
      fetchListings(listingPage);
    } catch (err: any) {
      toast.error('Erreur boost : ' + err.message);
    }
  };

  const handleDeletePermanent = async (id: string, title: string) => {
    const ok = await confirmDialog({
      title: 'Suppression définitive',
      message: `Voulez-vous supprimer pour toujours l'annonce « ${title} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      const [{ count: orderCount }, { count: itemCount }] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('listing_id', id),
        supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('listing_id', id),
      ]);
      const linked = Math.max(orderCount || 0, itemCount || 0);
      if (linked > 0) {
        toast.error(
          `Suppression définitive impossible : ${linked} commande${linked > 1 ? 's' : ''} liée${linked > 1 ? 's' : ''} à cette annonce.`,
          { duration: 7000 },
        );
        return;
      }
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
    const text = buildListingWhatsAppShareText(l);
    navigator.clipboard.writeText(text);
    toast.success('Texte copié. Ouverture de WhatsApp...');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTopDigest = () => {
    const text = buildListingsDigestShareText(listings);
    if (!text) {
      toast.error('Aucune annonce active trouvée');
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success('Digest des 5 annonces copié. Ouverture de WhatsApp...');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const totalPages = Math.ceil(listingTotal / ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-full space-y-6">
      <AdminPageHeader
        title="Annonces"
        description={`${statusCounts.all} annonces au total dans le catalogue.`}
        actions={
          <>
            <AdminButton onClick={handleShareTopDigest} disabled={loading}>
              <WhatsAppIcon size={14} className="h-3.5 w-3.5" />
              Résumé WhatsApp
            </AdminButton>
            <AdminButton icon={RefreshCw} loading={loading} onClick={() => { fetchCounts(); fetchListings(listingPage); }}>
              Actualiser
            </AdminButton>
          </>
        }
      />

      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400" />
          <label htmlFor="admin-listings-search" className="sr-only">Rechercher dans les annonces</label>
          <input
            id="admin-listings-search"
            type="text"
            placeholder="Rechercher par titre, quartier, catégorie..."
            value={listingSearch}
            onChange={(e) => setListingSearch(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pr-16 pl-10 text-sm font-medium text-gray-900 transition-all focus:border-orange-500 focus:bg-white focus:outline-none"
          />
          {listingSearch && (
            <button
              type="button"
              onClick={() => setListingSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Effacer
            </button>
          )}
        </div>

        <div role="tablist" aria-label="Filtre de statut des annonces" className="flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([
            { key: 'all', label: 'Toutes', count: statusCounts.all },
            { key: 'active', label: 'Actives', count: statusCounts.active },
            { key: 'sold', label: 'Vendues', count: statusCounts.sold },
            { key: 'deleted', label: 'Supprimées', count: statusCounts.deleted },
          ] as const).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => { setStatusFilter(tab.key); setListingPage(0); }}
                className={cn(
                  'flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-semibold transition-all',
                  isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', isActive ? 'bg-white/25 text-white' : 'bg-white text-gray-700')}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && listings.length === 0 ? (
        <div className="flex justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchListings(listingPage)} />
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <EmptyState title="Aucune annonce trouvée" description={debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : 'Aucune annonce dans cette catégorie.'} icon={<FileText size={48} className="text-gray-300" />} />
        </div>
      ) : (
        <div className="space-y-4">
          <AdminListingsDesktopTable
            listings={listings}
            onShare={handleShareToChannel}
            onToggleBoost={handleToggleBoost}
            onUpdateStatus={handleUpdateStatus}
            onDeletePermanent={handleDeletePermanent}
          />
          <AdminListingsMobileList
            listings={listings}
            onShare={handleShareToChannel}
            onToggleBoost={handleToggleBoost}
            onUpdateStatus={handleUpdateStatus}
            onDeletePermanent={handleDeletePermanent}
          />

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-xs font-bold text-gray-600 shadow-sm sm:flex-row tabular-nums">
            <div>
              Affichage de {listings.length > 0 ? listingPage * ITEMS_PER_PAGE + 1 : 0} à{' '}
              {Math.min((listingPage + 1) * ITEMS_PER_PAGE, listingTotal)} sur <span className="font-semibold text-gray-900">{listingTotal}</span> annonces
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outlined" onClick={() => goToListingPage(listingPage - 1)} disabled={listingPage === 0 || loading} className="rounded-xl">Précédent</Button>
                <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-800">Page {listingPage + 1} / {totalPages}</span>
                <Button size="sm" variant="outlined" onClick={() => goToListingPage(listingPage + 1)} disabled={listingPage + 1 >= totalPages || loading} className="rounded-xl">Suivant</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
export default AdminListingsTab;
