import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Coins, Zap, Sparkles, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import MiniListingCard from '../listings/MiniListingCard';
import { useSupabase } from '../../hooks/useSupabase';
import { usePhase } from '../../contexts/PhaseContext';
import toast from 'react-hot-toast';
import { BOOST_CREDIT_COSTS } from '../../lib/featureFlags';
import { cn } from '../../lib/utils';

interface ProfileListingsTabProps {
  userId: string;
  activeCount: number;
  initialFilter?: 'active' | 'sold';
}

function buildOrphanListing(id: string, embedded: any, price: number, createdAt: string) {
  if (embedded) return { ...embedded, status: embedded.status || 'deleted' };
  return {
    id,
    title: 'Article vendu (annonce supprimée)',
    price,
    photos: [],
    status: 'deleted',
    created_at: createdAt,
    isSyntheticOrphan: true,
  };
}

export const ProfileListingsTab: React.FC<ProfileListingsTabProps> = ({
  userId,
  initialFilter = 'active',
}) => {
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useSupabase();
  const { enableBoost } = usePhase();
  const [filter, setFilter] = useState<'active' | 'sold'>(initialFilter);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [salesByListing, setSalesByListing] = useState<Record<string, number>>({});
  const [orphanSoldListings, setOrphanSoldListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostingListingId, setBoostingListingId] = useState<string | null>(null);
  const [selectedBoostOption, setSelectedBoostOption] = useState<'free_pro' | 1 | 2 | 7>('free_pro');
  const [isConfirmingBoost, setIsConfirmingBoost] = useState(false);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;
  const canUseFreeProBoost = isPro && (userProfile?.pro_free_boost_used === false || userProfile?.pro_free_boost_used === null);

  const openBoostModal = (listingId: string) => {
    setBoostingListingId(listingId);
    setSelectedBoostOption(canUseFreeProBoost ? 'free_pro' : 1);
    setBoostModalOpen(true);
  };

  const handleBoostExecute = async () => {
    if (!boostingListingId || !user) return;
    setIsConfirmingBoost(true);
    try {
      if (selectedBoostOption === 'free_pro') {
        const { data, error } = await supabase.rpc('free_boost_listing' as any, { p_listing_id: boostingListingId });
        if (error) throw error;
        const res = data as any;
        if (res?.success) {
          toast.success('Votre annonce a été boostée gratuitement !');
          setMyListings((prev) => prev.map((l) => (l.id === boostingListingId ? { ...l, boosted_until: res.boosted_until } : l)));
          setBoostModalOpen(false);
        } else {
          toast.error(res?.reason === 'already_boosted' ? 'Vous utilisez déjà votre boost gratuit.' : 'Erreur lors du boost gratuit.');
        }
      } else {
        const durationDays = selectedBoostOption;
        const { data, error } = await supabase.rpc('buy_boost_with_credits' as any, {
          p_listing_id: boostingListingId,
          p_duration_days: durationDays,
        });
        if (error) throw error;
        const res = data as any;
        if (res?.success) {
          toast.success(`Annonce boostée pour ${durationDays} jour(s) !`);
          setMyListings((prev) => prev.map((l) => (l.id === boostingListingId ? { ...l, boosted_until: res.boosted_until } : l)));
          await refreshUserProfile();
          setBoostModalOpen(false);
        } else {
          toast.error(res?.reason === 'insufficient_credits' ? 'Nombre de crédits insuffisant.' : "Erreur lors de l'achat du boost.");
        }
      }
    } catch (err: any) {
      console.error('Boost purchase error:', err);
      toast.error('Une erreur est survenue lors de la validation.');
    } finally {
      setIsConfirmingBoost(false);
    }
  };

  const fetchMyListings = useCallback(async () => {
    if (!userId) return;
    setListingsLoading(true);
    setListingsError(null);
    try {
      const [listingsRes, ordersRes] = await Promise.all([
        supabase.from('listings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, listing_id, quantity, product_amount, total_amount, created_at, listings:listing_id(*), order_items(listing_id, quantity, unit_price, product_amount, listings:listing_id(*))')
          .eq('seller_id', userId)
          .in('status', ['delivered', 'completed'])
          .order('created_at', { ascending: false }),
      ]);

      if (listingsRes.error) throw listingsRes.error;
      const fetched = listingsRes.data || [];
      setMyListings(fetched);

      const knownIds = new Set(fetched.map((l: any) => l.id));
      const map: Record<string, number> = {};
      const orphansById = new Map<string, any>();

      for (const o of (ordersRes.data || []) as any[]) {
        const items = Array.isArray(o.order_items) && o.order_items.length > 0 ? o.order_items : null;
        if (items) {
          for (const it of items) {
            const lid = it.listing_id || `order_${o.id}`;
            map[lid] = (map[lid] || 0) + (it.quantity || 1);
            if (!knownIds.has(lid) && !orphansById.has(lid)) {
              const price = it.unit_price || it.product_amount || o.product_amount || o.total_amount || 0;
              orphansById.set(lid, buildOrphanListing(lid, it.listings, price, o.created_at));
            }
          }
        } else {
          const lid = o.listing_id || `order_${o.id}`;
          map[lid] = (map[lid] || 0) + (o.quantity || 1);
          if (!knownIds.has(lid) && !orphansById.has(lid)) {
            const price = o.product_amount || o.total_amount || 0;
            orphansById.set(lid, buildOrphanListing(lid, o.listings, price, o.created_at));
          }
        }
      }

      setSalesByListing(map);
      setOrphanSoldListings(Array.from(orphansById.values()));
    } catch (err) {
      console.error('Error fetching listings:', err);
      setListingsError('Impossible de charger vos annonces.');
    } finally {
      setListingsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const activeListings = useMemo(() => myListings.filter((l) => l.status === 'active'), [myListings]);
  const soldListings = useMemo(() => {
    const fromListings = myListings.filter((l) => l.status === 'sold' || (salesByListing[l.id] || 0) > 0);
    return [...fromListings, ...orphanSoldListings];
  }, [myListings, salesByListing, orphanSoldListings]);

  const totalSalesUnits = useMemo(
    () => Object.values(salesByListing).reduce((sum, count) => sum + count, 0),
    [salesByListing]
  );
  const soldTabCount = Math.max(soldListings.length, totalSalesUnits);
  const displayedListings = filter === 'active' ? activeListings : soldListings;

  const handleMarkSold = async (listingId: string) => {
    try {
      const { error } = await supabase.rpc('mark_listing_as_sold', { p_listing_id: listingId });
      if (error) throw error;
      setMyListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: 'sold' } : l)));
    } catch (err) {
      console.error('Error marking as sold:', err);
    }
  };

  const handleDeleteClick = (listingId: string) => {
    setDeletingListingId(listingId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingListingId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_listing_secure', { p_listing_id: deletingListingId });
      if (error) throw error;
      setMyListings((prev) => prev.map((l) => (l.id === deletingListingId ? { ...l, status: 'deleted' } : l)));
      setDeleteModalOpen(false);
      setDeletingListingId(null);
    } catch (err) {
      console.error('Error deleting listing:', err);
    } finally {
      setDeleting(false);
    }
  };

  const creditsBalance = (userProfile as any)?.boost_credits ?? userProfile?.listing_credits ?? 0;

  return (
    <>
      {enableBoost && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-orange-100 bg-white px-3.5 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Zap className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-gray-900">
                Crédits de Boost : <span className="text-orange-600 tabular-nums">{creditsBalance}</span>
              </p>
              <p className="truncate text-[11px] text-gray-500">Propulsez vos annonces en tête des résultats</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/acheter-pack')}
            className="shrink-0 rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-orange-600 transition-colors hover:bg-orange-100"
          >
            Acheter un pack
          </button>
        </div>
      )}

      <div className="mb-3 flex rounded-2xl bg-white p-1 ring-1 ring-gray-200">
        {([
          { id: 'active', label: `En vente · ${activeListings.length}` },
          { id: 'sold', label: `Vendues · ${soldTabCount}` },
        ] as const).map((tab) => {
          const selected = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex-1 rounded-xl py-2 text-xs font-bold transition-colors tabular-nums',
                selected ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {listingsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="200px" rounded="lg" />
          ))}
        </div>
      ) : listingsError ? (
        <ErrorState message={listingsError} onRetry={fetchMyListings} />
      ) : displayedListings.length === 0 ? (
        <EmptyState
          icon={<Package className="w-16 h-16 opacity-40" />}
          title={filter === 'active' ? 'Aucune annonce en vente' : 'Aucune annonce vendue'}
          description={
            filter === 'active'
              ? 'Publiez une annonce dès maintenant et vendez près de chez vous.'
              : 'Vos articles marqués comme vendus ou ayant fait l’objet d’une vente apparaîtront ici.'
          }
          action={filter === 'active' ? { label: 'Publier une annonce', onClick: () => navigate('/create-listing') } : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {displayedListings.map((listing) => (
            <MiniListingCard
              key={listing.id}
              listing={listing}
              salesCount={salesByListing[listing.id] || 0}
              onMarkSold={handleMarkSold}
              onDelete={handleDeleteClick}
              onBoost={enableBoost ? openBoostModal : undefined}
              loadingBoost={boostingListingId === listing.id}
            />
          ))}
        </div>
      )}

      <Modal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setDeletingListingId(null); }} title="Supprimer l'annonce">
        <p className="text-sm text-gray-600 mb-4">Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.</p>
        <div className="flex gap-3">
          <Button variant="outlined" color="secondary" fullWidth onClick={() => { setDeleteModalOpen(false); setDeletingListingId(null); }}>Annuler</Button>
          <Button variant="filled" color="error" fullWidth loading={deleting} onClick={handleDeleteConfirm}>Supprimer</Button>
        </div>
      </Modal>

      <Modal isOpen={boostModalOpen} onClose={() => { if (!isConfirmingBoost) { setBoostModalOpen(false); setBoostingListingId(null); } }} title="Sponsoriser l'annonce (Boost)">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[var(--color-surface-variant)]/40 border border-[var(--color-outline)]/40 p-4 rounded-2xl">
            <div className="flex items-center gap-2.5 text-[var(--color-on-surface)]">
              <Coins size={18} className="text-yellow-600 dark:text-yellow-500 fill-yellow-500/10" />
              <div className="text-left">
                <span className="text-xs text-[var(--color-on-surface-variant)] block">Votre solde</span>
                <span className="text-sm font-black">{creditsBalance} crédit{creditsBalance > 1 ? 's' : ''}</span>
              </div>
            </div>
            {creditsBalance === 0 && (
              <button onClick={() => { setBoostModalOpen(false); navigate('/acheter-pack'); }} className="text-xs font-bold text-[var(--color-primary)] hover:underline">Recharger</button>
            )}
          </div>

          <div className="space-y-2.5">
            {canUseFreeProBoost && (
              <div onClick={() => setSelectedBoostOption('free_pro')} className={cn('flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all', selectedBoostOption === 'free_pro' ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-sm' : 'border-[var(--color-outline)] bg-[var(--color-surface)]')}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600"><Sparkles size={18} /></div>
                  <div className="text-left">
                    <span className="text-xs font-bold block">Boost Gratuit Vendeur PRO</span>
                    <span className="text-[10px] text-gray-500 block">Utilisable 1 fois par abonnement</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-600">Gratuit</span>
              </div>
            )}
            {BOOST_CREDIT_COSTS.map((opt) => {
              const isSelected = selectedBoostOption === opt.days;
              return (
                <div key={opt.days} onClick={() => setSelectedBoostOption(opt.days)} className={cn('flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all', isSelected ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-sm' : 'border-[var(--color-outline)] bg-[var(--color-surface)]')}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-[var(--color-primary)]"><Zap size={18} /></div>
                    <div className="text-left">
                      <span className="text-xs font-bold block">Boost {opt.label}</span>
                      <span className="text-[10px] text-gray-500 block mt-0.5">{opt.days === 7 ? 'Visibilité maximale pendant 1 semaine' : `Remontez l'annonce pendant ${opt.days} jour(s)`}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{opt.credits} crédit{opt.credits > 1 ? 's' : ''}</span>
                    <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center', isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-outline)]')}>
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedBoostOption !== 'free_pro' && creditsBalance < (BOOST_CREDIT_COSTS.find((o) => o.days === selectedBoostOption)?.credits ?? 0) && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 rounded-xl text-red-600 mt-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="text-[11px] leading-normal">
                <span className="font-semibold block">Crédits insuffisants</span>
                Rechargez vos crédits pour activer ce boost.
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="outlined" color="secondary" fullWidth disabled={isConfirmingBoost} onClick={() => { setBoostModalOpen(false); setBoostingListingId(null); }}>Annuler</Button>
            {selectedBoostOption === 'free_pro' || creditsBalance >= (BOOST_CREDIT_COSTS.find((o) => o.days === selectedBoostOption)?.credits ?? 0) ? (
              <Button variant="filled" color="primary" fullWidth loading={isConfirmingBoost} onClick={handleBoostExecute}>
                {selectedBoostOption === 'free_pro' ? 'Activer (Gratuit)' : `Confirmer (${BOOST_CREDIT_COSTS.find((o) => o.days === selectedBoostOption)?.credits ?? 0} cr.)`}
              </Button>
            ) : (
              <Button variant="filled" color="primary" fullWidth onClick={() => { setBoostModalOpen(false); navigate('/acheter-pack'); }}>Acheter des crédits</Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
