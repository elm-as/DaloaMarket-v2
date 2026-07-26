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
  totalEarnings: number;
  pendingEarnings: number;
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

      const totalViews = (listings || []).reduce(
        (sum, l) => sum + (l.view_count || 0),
        0
      );

      const activeListings = (listings || []).filter(
        (l) => l.status === 'active'
      ).length;

      // Count completed sales (orders where user is seller and status is delivered/completed)
      const { count: salesCount, error: salesError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', currentUserId)
        .in('status', ['delivered', 'completed']);

      if (salesError) throw salesError;

      // Count messages received
      const { count: msgCount, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId);

      if (msgError) throw msgError;

      // Fetch payouts
      const { data: payouts, error: payoutsError } = await (supabase as any)
        .from('payouts')
        .select('amount, status')
        .eq('user_id', currentUserId);

      if (payoutsError) throw payoutsError;

      const totalEarnings = (payouts || [])
        .filter((p: any) => p.status === 'paid' || p.status === 'completed')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const pendingEarnings = (payouts || [])
        .filter((p: any) => p.status === 'pending' || p.status === 'processing')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      setKpi({
        totalViews,
        messagesReceived: msgCount || 0,
        activeListings,
        salesCount: salesCount || 0,
        totalEarnings,
        pendingEarnings,
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
    <div className="w-full max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Button
          variant="text"
          color="secondary"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
        <h1 className="text-lg font-bold text-[var(--color-on-surface)]">
          Mes statistiques
        </h1>
      </div>

      <div className="px-4">
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
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[28px] p-6 text-white shadow-xl shadow-indigo-100">
                {/* Cercles décoratifs de fond */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Coins className="w-4 h-4" />
                  <span>Portefeuille Vendeur</span>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-white/70 font-medium">Revenus encaissés</p>
                  <p className="text-4xl font-extrabold tracking-tight mt-0.5">
                    {formatPrice(kpi.totalEarnings)}
                  </p>
                </div>

                <div className="h-[1px] bg-white/10 my-4" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/90">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/70 font-medium">En attente (~10 min)</p>
                      <p className="text-base font-bold text-white/95">
                        {formatPrice(kpi.pendingEarnings)}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/10 backdrop-blur-sm">
                    Sécurisé
                  </span>
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
                  label: 'Vues totales',
                  value: kpi.totalViews,
                  icon: <Eye className="w-6 h-6" />,
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                  desc: 'Visites sur vos fiches',
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
                  <Card elevation={1} padding="md" className="rounded-3xl border border-gray-100/50 hover:shadow-lg transition-all duration-200 h-full flex flex-col justify-between">
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