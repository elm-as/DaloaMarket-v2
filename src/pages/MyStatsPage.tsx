import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn, formatPrice } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  Tag,
  CheckCircle,
  BarChart3,
  Coins,
  Clock,
} from 'lucide-react';

interface KPIData {
  totalViews: number;
  messagesReceived: number;
  activeListings: number;
  salesCount: number;
  /** Articles vendus et livrés (montant des articles, hors livraison). */
  totalEarnings: number;
  /** Commandes pas encore livrées. */
  pendingEarnings: number;
  /** Virements vendeur réellement arrivés sur le Mobile Money. */
  paidOut: number;
}

const MyStatsPage: React.FC = () => {
  usePageTitle('Mes statistiques');
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const currentUserId = user.id;

      // Fetch all user's listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('status, view_count')
        .eq('user_id', currentUserId);

      if (listingsError) throw listingsError;

      // Vraies visites : visiteurs enregistrés (une personne par annonce, vous
      // exclu). `view_count` a été pré-rempli à l'import et ne sert plus qu'au
      // classement « Populaire à Daloa ».
      const { data: visitors } = await (supabase.rpc as any)('get_my_listing_visitors');
      const totalViews = Number(visitors) || 0;

      const activeListings = (listings || []).filter(
        (l) => l.status === 'active'
      ).length;

      // Fetch completed and pending orders for seller
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, product_amount, status')
        .eq('seller_id', currentUserId);

      if (ordersError) throw ordersError;

      const completedOrders = (orders || []).filter(
        (o) => o.status === 'delivered' || o.status === 'completed'
      );
      // Statuts réels de `orders` (CHECK) : les anciens filtres visaient aussi
      // des statuts de course (awaiting_pickup, picked_up…) qui n'y existent pas.
      const pendingOrders = (orders || []).filter((o) => ['pending', 'paid', 'in_transit'].includes(o.status));

      const salesCount = completedOrders.length;
      const orderCompletedEarnings = completedOrders.reduce(
        (sum, o) => sum + (o.product_amount || o.total_amount || 0),
        0
      );
      const orderPendingEarnings = pendingOrders.reduce(
        (sum, o) => sum + (o.product_amount || o.total_amount || 0),
        0
      );

      // Count messages received
      const { count: msgCount, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId);

      if (msgError) throw msgError;

      // Virements de vente uniquement : un remboursement d'achat ou une paie de
      // livreur n'est pas un revenu de vendeur. Ils ne s'ajoutent plus aux ventes
      // livrées, qu'ils comptaient une deuxième fois.
      const { data: payouts } = await (supabase as any)
        .from('payouts')
        .select('amount, status')
        .eq('user_id', currentUserId)
        .eq('type', 'seller');

      const paidOut = (payouts || [])
        .filter((p: any) => p.status === 'paid' || p.status === 'completed')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      setKpi({
        totalViews,
        messagesReceived: msgCount || 0,
        activeListings,
        salesCount,
        totalEarnings: orderCompletedEarnings,
        pendingEarnings: orderPendingEarnings,
        paidOut,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Impossible de charger vos statistiques.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full max-w-2xl mx-auto pb-20 bg-gray-50/70 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden flex items-center gap-3 px-4 pt-5 pb-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-b-[32px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <Button
          variant="text"
          color="secondary"
          className="relative z-10 !text-white bg-white/15 rounded-2xl"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
        <h1 className="relative z-10 text-xl font-extrabold tracking-tight text-white">
          Mes statistiques
        </h1>
      </div>

      <div className="relative z-10 px-4 -mt-6">
        {loading ? (
          <div className="space-y-6">
            {/* Wallet Skeleton */}
            <Card elevation={1} padding="lg" className="rounded-3xl h-44 bg-gray-100/50 flex flex-col justify-between">
              <div>
                <Skeleton width="120px" height="18px" />
                <Skeleton width="220px" height="38px" className="mt-3" />
              </div>
              <div className="flex justify-between items-center mt-4">
                <Skeleton width="160px" height="24px" />
                <Skeleton width="70px" height="22px" rounded="full" />
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} elevation={1} padding="md" className="rounded-3xl h-36">
                  <Skeleton width="44px" height="44px" rounded="lg" />
                  <Skeleton width="50%" height="28px" className="mt-3" />
                  <Skeleton width="80%" height="16px" className="mt-2" />
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchStats} />
        ) : !kpi || (kpi.totalViews === 0 && kpi.messagesReceived === 0 && kpi.activeListings === 0 && kpi.salesCount === 0) ? (
          <EmptyState
            icon={<BarChart3 className="w-16 h-16 opacity-40" />}
            title="Pas encore de statistiques"
            description="Publiez votre première annonce pour commencer à suivre vos performances."
            action={{
              label: 'Publier une annonce',
              onClick: () => navigate('/create-listing'),
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Section Financière (Portefeuille) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-[28px] p-6 text-white shadow-xl shadow-orange-200/60">
                {/* Cercles décoratifs de fond */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Coins className="w-4 h-4" />
                  <span>Portefeuille Vendeur</span>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-white/70 font-medium">Ventes livrées</p>
                  <p className="text-4xl font-extrabold tracking-tight mt-0.5">
                    {formatPrice(kpi.totalEarnings)}
                  </p>
                </div>

                <div className="h-[1px] bg-white/10 my-4" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 px-3 py-2.5">
                    <p className="text-[11px] text-white/75 font-medium">Versé sur Mobile Money</p>
                    <p className="text-base font-bold text-white">{formatPrice(kpi.paidOut)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2.5">
                    <p className="flex items-center gap-1 text-[11px] text-white/75 font-medium">
                      <Clock className="w-3 h-3" /> En cours
                    </p>
                    <p className="text-base font-bold text-white">{formatPrice(kpi.pendingEarnings)}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Titre des indicateurs de performance */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                Performances de vente
              </h2>
            </div>

            {/* Grille d'activité */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: 'Ventes terminées',
                  value: kpi.salesCount,
                  icon: <CheckCircle className="w-6 h-6" />,
                  color: 'text-violet-600',
                  bg: 'bg-violet-50',
                  desc: 'Commandes livrées',
                },
                {
                  label: 'Visiteurs',
                  value: kpi.totalViews,
                  icon: <Eye className="w-6 h-6" />,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                  desc: 'Personnes ayant vu vos annonces',
                },
                {
                  label: 'Messages reçus',
                  value: kpi.messagesReceived,
                  icon: <MessageSquare className="w-6 h-6" />,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                  desc: 'Négociations acheteurs',
                },
                {
                  label: 'Annonces actives',
                  value: kpi.activeListings,
                  icon: <Tag className="w-6 h-6" />,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  desc: 'Articles disponibles',
                },
              ].map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.05 + index * 0.05,
                    ease: [0.2, 0, 0, 1],
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                >
                  <Card elevation={1} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all duration-200 h-full flex flex-col justify-between">
                    <div>
                      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', card.bg)}>
                        <span className={card.color}>{card.icon}</span>
                      </div>
                      <p className="text-3xl font-extrabold text-[var(--color-on-surface)] mt-4">
                        {card.value.toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-bold text-[var(--color-on-surface)]">{card.label}</p>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">{card.desc}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStatsPage;