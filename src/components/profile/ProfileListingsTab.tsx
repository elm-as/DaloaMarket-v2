import React, { useState, useEffect, useCallback } from 'react';
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
import { initiatePayment } from '../../lib/payment';
import toast from 'react-hot-toast';
import { BOOST_CREDIT_COSTS, PRO_FREE_BOOST_DURATION_DAYS } from '../../lib/featureFlags';
import { cn } from '../../lib/utils';

interface ProfileListingsTabProps {
  userId: string;
  activeCount: number;
}



export const ProfileListingsTab: React.FC<ProfileListingsTabProps> = ({ userId, activeCount }) => {
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useSupabase();
  const [myListings, setMyListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostingListingId, setBoostingListingId] = useState<string | null>(null);
  const [selectedBoostOption, setSelectedBoostOption] = useState<'free_pro' | 1 | 2 | 7>('free_pro');
  const [isConfirmingBoost, setIsConfirmingBoost] = useState(false);

  // Check if user is eligible for free PRO boost slot
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;
  
  // Le boost pro est utilisable une seule fois. On vérifie si la colonne est false.
  const canUseFreeProBoost = isPro && (userProfile?.pro_free_boost_used === false || userProfile?.pro_free_boost_used === null);

  // Set default selection based on eligibility
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
        // Call the free boost RPC (duration = 2 days for PRO)
        const { data, error } = await supabase.rpc('free_boost_listing' as any, {
          p_listing_id: boostingListingId,
        });

        if (error) throw error;
        const res = data as any;
        if (res?.success) {
          toast.success('Votre annonce a été boostée gratuitement !');
          setMyListings(prev =>
            prev.map(l => (l.id === boostingListingId ? { ...l, boosted_until: res.boosted_until } : l))
          );
          setBoostModalOpen(false);
        } else {
          toast.error(
            res?.reason === 'already_boosted'
              ? 'Vous utilisez déjà votre boost gratuit.'
              : 'Erreur lors du boost gratuit.'
          );
        }
      } else {
        // Call the credit boost RPC
        const durationDays = selectedBoostOption;
        const { data, error } = await supabase.rpc('buy_boost_with_credits' as any, {
          p_listing_id: boostingListingId,
          p_duration_days: durationDays,
        });

        if (error) throw error;
        const res = data as any;
        if (res?.success) {
          toast.success(`Annonce boostée pour ${durationDays} jour(s) !`);
          setMyListings(prev =>
            prev.map(l => (l.id === boostingListingId ? { ...l, boosted_until: res.boosted_until } : l))
          );
          // Refresh user profile so the header updates with the new credit count
          await refreshUserProfile();
          setBoostModalOpen(false);
        } else {
          if (res?.reason === 'insufficient_credits') {
            toast.error('Nombre de crédits insuffisant.');
          } else {
            toast.error('Erreur lors de l\'achat du boost.');
          }
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
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyListings(data || []);
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

  const handleMarkSold = async (listingId: string) => {
    try {
      const { error } = await supabase.rpc('mark_listing_as_sold', {
        p_listing_id: listingId,
      });
      if (error) throw error;
      setMyListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: 'sold' } : l))
      );
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
      const { error } = await supabase.rpc('delete_listing_secure', {
        p_listing_id: deletingListingId,
      });
      if (error) throw error;
      setMyListings((prev) => prev.filter((l) => l.id !== deletingListingId));
      setDeleteModalOpen(false);
      setDeletingListingId(null);
    } catch (err) {
      console.error('Error deleting listing:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {!listingsLoading && !listingsError && myListings.length > 0 && (
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-3">
          Vous avez {activeCount} annonce{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
        </p>
      )}
      {listingsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="200px" rounded="lg" />
          ))}
        </div>
      ) : listingsError ? (
        <ErrorState message={listingsError} onRetry={fetchMyListings} />
      ) : myListings.length === 0 ? (
        <EmptyState
          icon={<Package className="w-16 h-16 opacity-40" />}
          title="Vos placards débordent ?"
          description="Publiez une annonce dès maintenant et vendez près de chez vous."
          action={{
            label: 'Publier une annonce',
            onClick: () => navigate('/create-listing'),
          }}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {myListings.map((listing) => (
            <MiniListingCard
              key={listing.id}
              listing={listing}
              onMarkSold={handleMarkSold}
              onDelete={handleDeleteClick}
              onBoost={openBoostModal}
              loadingBoost={boostingListingId === listing.id}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingListingId(null);
        }}
        title="Supprimer l'annonce"
      >
        <p className="text-sm text-gray-600 mb-4">
          Êtes-vous sûr de vouloir supprimer cette annonce? Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={() => {
              setDeleteModalOpen(false);
              setDeletingListingId(null);
            }}
          >
            Annuler
          </Button>
          <Button
            variant="filled"
            color="error"
            fullWidth
            loading={deleting}
            onClick={handleDeleteConfirm}
          >
            Supprimer
          </Button>
        </div>
      </Modal>

      {/* Boost Options Modal */}
      <Modal
        isOpen={boostModalOpen}
        onClose={() => {
          if (!isConfirmingBoost) {
            setBoostModalOpen(false);
            setBoostingListingId(null);
          }
        }}
        title="Sponsoriser l'annonce (Boost)"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[var(--color-surface-variant)]/40 border border-[var(--color-outline)]/40 p-4 rounded-2xl">
            <div className="flex items-center gap-2.5 text-[var(--color-on-surface)]">
              <Coins size={18} className="text-yellow-600 dark:text-yellow-500 fill-yellow-500/10" />
              <div className="text-left">
                <span className="text-xs text-[var(--color-on-surface-variant)] block">Votre solde</span>
                <span className="text-sm font-black">
                  {userProfile?.listing_credits ?? 0} crédit{(userProfile?.listing_credits ?? 0) > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {(userProfile?.listing_credits ?? 0) === 0 && (
              <button
                onClick={() => {
                  setBoostModalOpen(false);
                  navigate('/acheter-pack');
                }}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline active:scale-95 transition-transform"
              >
                Recharger
              </button>
            )}
          </div>

          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Sélectionnez une formule pour propulser votre annonce en tête des résultats de recherche.
          </p>

          <div className="space-y-2.5">
            {/* Option 1: Free PRO boost slot if available */}
            {canUseFreeProBoost && (
              <div
                onClick={() => setSelectedBoostOption('free_pro')}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                  selectedBoostOption === 'free_pro' 
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-sm' 
                    : 'border-[var(--color-outline)] bg-[var(--color-surface)] hover:border-[var(--color-on-surface-variant)]/40'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <Sparkles size={18} className="fill-yellow-500/10" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[var(--color-on-surface)] block">
                      Boost Gratuit Vendeur PRO
                    </span>
                    <span className="text-[10px] font-medium text-[var(--color-on-surface-variant)] block">
                      Utilisable 1 fois par abonnement
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">Gratuit</span>
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                    selectedBoostOption === 'free_pro' ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-outline)]"
                  )}>
                    {selectedBoostOption === 'free_pro' && <Check size={10} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            )}

            {/* Credit-based boost options */}
            {BOOST_CREDIT_COSTS.map((opt) => {
              const isSelected = selectedBoostOption === opt.days;
              const hasCredits = (userProfile?.listing_credits ?? 0) >= opt.credits;
              return (
                <div 
                  key={opt.days}
                  onClick={() => setSelectedBoostOption(opt.days)}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all",
                    isSelected 
                      ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-sm' 
                      : 'border-[var(--color-outline)] bg-[var(--color-surface)] hover:border-[var(--color-on-surface-variant)]/40',
                    !hasCredits && selectedBoostOption !== 'free_pro' ? 'opacity-80' : ''
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-[var(--color-primary)]">
                      <Zap size={18} className="fill-[var(--color-primary)]/10" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-[var(--color-on-surface)] block">
                        Boost {opt.label}
                      </span>
                      <span className="text-[10px] text-[var(--color-on-surface-variant)] block mt-0.5">
                        {opt.days === 7 ? 'Visibilité maximale pendant 1 semaine' : `Remontez l'annonce pendant ${opt.days} jour(s)`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-on-surface)]">
                      {opt.credits} crédit{opt.credits > 1 ? 's' : ''}
                    </span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                      isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-outline)]"
                    )}>
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insufficient credits warning */}
          {(() => {
            if (selectedBoostOption === 'free_pro') return null;
            const selectedCost = BOOST_CREDIT_COSTS.find(o => o.days === selectedBoostOption)?.credits ?? 0;
            const hasCredits = (userProfile?.listing_credits ?? 0) >= selectedCost;
            
            if (!hasCredits) {
              return (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded-xl text-red-600 dark:text-red-400 mt-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] leading-normal">
                    <span className="font-semibold block">Crédits insuffisants</span>
                    Il vous manque {selectedCost - (userProfile?.listing_credits ?? 0)} crédit(s) pour acheter ce boost.
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Action buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              disabled={isConfirmingBoost}
              onClick={() => {
                setBoostModalOpen(false);
                setBoostingListingId(null);
              }}
              className="py-3 rounded-xl border-[var(--color-outline)] text-[var(--color-on-surface-variant)]"
            >
              Annuler
            </Button>

            {(() => {
              if (selectedBoostOption === 'free_pro') {
                return (
                  <Button
                    variant="filled"
                    color="primary"
                    fullWidth
                    loading={isConfirmingBoost}
                    onClick={handleBoostExecute}
                    className="py-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-variant)] text-white font-semibold"
                  >
                    Activer (Gratuit)
                  </Button>
                );
              }
              const selectedCost = BOOST_CREDIT_COSTS.find(o => o.days === selectedBoostOption)?.credits ?? 0;
              const hasCredits = (userProfile?.listing_credits ?? 0) >= selectedCost;

              if (hasCredits) {
                return (
                  <Button
                    variant="filled"
                    color="primary"
                    fullWidth
                    loading={isConfirmingBoost}
                    onClick={handleBoostExecute}
                    className="py-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-variant)] text-white font-semibold"
                  >
                    Confirmer ({selectedCost} cr.)
                  </Button>
                );
              } else {
                return (
                  <Button
                    variant="filled"
                    color="primary"
                    fullWidth
                    onClick={() => {
                      setBoostModalOpen(false);
                      navigate('/acheter-pack');
                    }}
                    className="py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold shadow-sm border-0"
                  >
                    Acheter des crédits
                  </Button>
                );
              }
            })()}
          </div>
        </div>
      </Modal>
    </>
  );
};

