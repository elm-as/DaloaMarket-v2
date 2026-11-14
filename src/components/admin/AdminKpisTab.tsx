import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShoppingBag,
  Package,
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  Banknote,
  Lightbulb,
  BadgeCheck,
  Bell,
  Truck,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ErrorState } from '../ui/ErrorState';
import { cn, formatPrice, formatDate } from '../../lib/utils';
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts';
import { fetchAdminOrdersFromServer } from './deliveries/adminOrdersApi';
import { fetchAdminAnalytics } from './analytics/adminAnalyticsApi';
import {
  ANALYTICS_PERIOD_OPTIONS,
  type AdminAnalyticsData,
  type AnalyticsPeriodDays,
} from './analytics/adminAnalytics.types';
import { AdminRevenueTrendChart } from './analytics/AdminRevenueTrendChart';
import { AdminBreakdownCharts } from './analytics/AdminBreakdownCharts';
import {
  AdminPageHeader,
  AdminStatGrid,
  AdminStatCard,
  AdminSection,
  AdminBadge,
  AdminButton,
  AdminLoading,
  type AdminBadgeTone,
} from './ui/AdminUI';

interface RecentOrderRow {
  id: string;
  status: string;
  total_amount: number;
  delivery_mode: string | null;
  payment_method: string | null;
  created_at: string;
  listing?: {
    title: string;
    photos?: string[] | null;
  } | null;
}

const ORDER_STATUS_BADGE: Record<string, { label: string; tone: AdminBadgeTone }> = {
  pending: { label: 'En attente', tone: 'warning' },
  paid: { label: 'Payée', tone: 'info' },
  funded: { label: 'Financée', tone: 'info' },
  confirmed: { label: 'Confirmée', tone: 'info' },
  in_transit: { label: 'En livraison', tone: 'info' },
  delivered: { label: 'Livrée', tone: 'success' },
  completed: { label: 'Terminée', tone: 'success' },
  disputed: { label: 'Litige', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
  refunded: { label: 'Remboursée', tone: 'neutral' },
};

function formatDeltaLabel(deltaPct: number, days: AnalyticsPeriodDays): string {
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct}% vs ${days}j préc.`;
}

export const AdminKpisTab: React.FC = () => {
  const navigate = useNavigate();
  const { counts } = useAdminPendingCounts(true);
  const [periodDays, setPeriodDays] = useState<AnalyticsPeriodDays>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([]);

  const fetchDashboardData = useCallback(async (days: AnalyticsPeriodDays) => {
    setError(null);
    try {
      const [analyticsData, serverPayload] = await Promise.all([
        fetchAdminAnalytics(days),
        fetchAdminOrdersFromServer(),
      ]);
      setAnalytics(analyticsData);

      if (serverPayload?.kpis?.recentOrders) {
        setRecentOrders(serverPayload.kpis.recentOrders);
        return;
      }

      const { data: recent, error: recentErr } = await supabase
        .from('orders')
        .select('id, status, total_amount, delivery_mode, payment_method, created_at, listing:listings(title, photos)')
        .order('created_at', { ascending: false })
        .limit(6);
      if (recentErr) {
        console.warn('[AdminKpisTab] Fallback commandes récentes:', recentErr.message);
      }
      setRecentOrders((recent as RecentOrderRow[]) || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le tableau de bord');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(periodDays);
  }, [fetchDashboardData, periodDays]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(periodDays);
  };

  if (loading || !analytics) return <AdminLoading />;
  if (error) return <ErrorState message={error} onRetry={() => fetchDashboardData(periodDays)} />;

  const { summary } = analytics;
  const alertsCount = (counts.litiges || 0) + (counts.signalements || 0);

  const todo = [
    { label: 'Litiges à arbitrer', count: counts.litiges, icon: ShieldAlert, path: '/admin/litiges', tone: 'danger' as const },
    { label: 'Versements en attente', count: counts.payouts_en_attente, icon: Banknote, path: '/admin/versements', tone: 'warning' as const },
    { label: 'Signalements à examiner', count: counts.signalements, icon: AlertTriangle, path: '/admin/reports', tone: 'warning' as const },
    { label: 'Avis sans réponse', count: counts.avis_sans_reponse, icon: MessageSquare, path: '/admin/feedbacks', tone: 'neutral' as const },
    { label: 'Idées à trier', count: counts.suggestions, icon: Lightbulb, path: '/admin/features', tone: 'neutral' as const },
    { label: 'Pièces livreurs (DaloaDelivery)', count: counts.kyc_a_verifier, icon: BadgeCheck, path: null, tone: 'neutral' as const },
  ].filter((t) => t.count > 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tableau de bord"
        description="Indicateurs commerciaux, graphiques d'évolution et priorités d'exploitation."
        actions={
          <>
            <div
              role="group"
              aria-label="Période d'analyse"
              className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5"
            >
              {ANALYTICS_PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriodDays(opt.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors',
                    periodDays === opt.value
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <AdminButton icon={Bell} size="sm" onClick={() => navigate('/admin/notifications')}>
              Nouvelle notification
            </AdminButton>
            <AdminButton icon={RefreshCw} size="sm" loading={refreshing} onClick={handleRefresh}>
              Actualiser
            </AdminButton>
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label={`Volume validé (${periodDays}j)`}
          icon={TrendingUp}
          tone="success"
          value={formatPrice(summary.gmv)}
          hint={`${formatDeltaLabel(summary.gmvDeltaPct, periodDays)} · Panier moy. ${formatPrice(summary.avgOrderValue)}`}
          onClick={() => navigate('/admin/livraisons')}
        />
        <AdminStatCard
          label={`Commandes (${periodDays}j)`}
          icon={Package}
          value={summary.ordersCount}
          hint={`${formatDeltaLabel(summary.ordersDeltaPct, periodDays)} · ${summary.completionRatePct}% livrées`}
          onClick={() => navigate('/admin/livraisons')}
        />
        <AdminStatCard
          label="Annonces en ligne"
          icon={ShoppingBag}
          value={summary.activeListingsCount}
          hint={`+${summary.newListingsCount} sur ${periodDays}j (${formatDeltaLabel(summary.newListingsDeltaPct, periodDays)})`}
          onClick={() => navigate('/admin/listings')}
        />
        <AdminStatCard
          label={alertsCount > 0 ? 'Membres & Alertes' : 'Membres inscrits'}
          icon={alertsCount > 0 ? AlertTriangle : Users}
          tone={alertsCount > 0 ? 'danger' : 'neutral'}
          value={alertsCount > 0 ? `${summary.totalUsersCount} · ${alertsCount} alerte(s)` : summary.totalUsersCount}
          hint={`+${summary.newUsersCount} inscrits (${formatDeltaLabel(summary.newUsersDeltaPct, periodDays)})`}
          onClick={() => navigate(alertsCount > 0 ? '/admin/litiges' : '/admin/users')}
        />
      </AdminStatGrid>

      <AdminRevenueTrendChart series={analytics.dailySeries} periodDays={periodDays} />

      <AdminBreakdownCharts analytics={analytics} />

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        <AdminSection
          icon={Truck}
          title="Dernières commandes & courses"
          description="Suivi en temps réel des achats et retraits sur la plateforme."
          aside={
            <button
              type="button"
              onClick={() => navigate('/admin/livraisons')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary-dark)] hover:underline"
            >
              Tout voir <ArrowRight size={13} />
            </button>
          }
          bodyClassName="p-0"
        >
          {recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-stone-400">Aucune commande enregistrée pour le moment.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentOrders.map((order) => {
                const st = ORDER_STATUS_BADGE[order.status] || { label: order.status, tone: 'neutral' as const };
                const photo = order.listing?.photos?.[0];
                const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
                const isCash = order.payment_method === 'cod' || order.payment_method === 'cash_at_shop';

                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/livraisons')}
                      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {photo ? (
                          <img src={photo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover border border-stone-200/80" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                            <Package size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-stone-900">
                            {order.listing?.title || `Commande #${order.id.slice(0, 6)}`}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500">
                            <span className="font-mono">#{order.id.slice(0, 6)}</span>
                            <span>·</span>
                            <span>{isPickup ? 'Retrait boutique' : 'Livraison'}</span>
                            <span>·</span>
                            <span>{isCash ? 'Espèces' : 'En ligne'}</span>
                            <span>·</span>
                            <span>{formatDate(order.created_at)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-bold text-stone-900 tabular-nums">
                          {formatPrice(order.total_amount)}
                        </span>
                        <AdminBadge tone={st.tone}>{st.label}</AdminBadge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Actions prioritaires"
          description="Éléments en attente de validation ou d'arbitrage."
          bodyClassName="p-0"
        >
          {todo.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
              <CheckCircle2 size={24} className="mb-2 text-emerald-500" />
              <p className="text-xs font-semibold text-stone-800">Tout est à jour</p>
              <p className="mt-0.5 text-xs text-stone-500">Aucun litige, signalement ou versement en attente.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {todo.map((t) => {
                const Icon = t.icon;
                const toneBadge = t.tone === 'danger' ? 'danger' : t.tone === 'warning' ? 'warning' : 'neutral';
                const iconBox =
                  t.tone === 'danger'
                    ? 'bg-red-50 text-red-600'
                    : t.tone === 'warning'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-stone-100 text-stone-600';
                const inner = (
                  <>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBox}`}>
                        <Icon size={15} />
                      </span>
                      <span className="truncate text-xs font-medium text-stone-800">{t.label}</span>
                    </span>
                    <AdminBadge tone={toneBadge}>{t.count}</AdminBadge>
                  </>
                );
                return (
                  <li key={t.label}>
                    {t.path ? (
                      <button
                        type="button"
                        onClick={() => navigate(t.path!)}
                        className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left transition-colors hover:bg-stone-50"
                      >
                        {inner}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-5 py-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSection>
      </div>
    </div>
  );
};
