import React from 'react';
import { CreditCard, MapPin, PieChart, Wallet } from 'lucide-react';
import { formatPrice } from '../../../lib/utils';
import { AdminSection } from '../ui/AdminUI';
import type { AdminAnalyticsData, BreakdownItem } from './adminAnalytics.types';

const DONUT_COLORS = ['#FF7F00', '#1c1917', '#059669', '#64748b'];

function RankedBarList({
  items,
  emptyLabel,
  barColorClass = 'bg-stone-800',
  showAmount = false,
}: {
  items: BreakdownItem[];
  emptyLabel: string;
  barColorClass?: string;
  showAmount?: boolean;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-xs text-stone-400">{emptyLabel}</p>;
  }
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const widthPct = Math.max(4, Math.round((item.count / maxCount) * 100));
        return (
          <li key={item.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-stone-700">{item.label}</span>
              <span className="shrink-0 font-semibold text-stone-900 tabular-nums">
                {item.count}
                {showAmount && item.amount != null ? ` · ${formatPrice(item.amount)}` : ''}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full rounded-full transition-all ${barColorClass}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface AdminBreakdownChartsProps {
  analytics: AdminAnalyticsData;
}

export const AdminBreakdownCharts: React.FC<AdminBreakdownChartsProps> = ({ analytics }) => {
  const { breakdowns, financials, summary } = analytics;
  const totalPaymentOrders = breakdowns.paymentMethods.reduce((s, p) => s + p.count, 0);
  const totalPayoutsFlow = financials.paidPayoutsAmount + financials.pendingPayoutsAmount;
  const paidPayoutsPct =
    totalPayoutsFlow > 0 ? Math.round((financials.paidPayoutsAmount / totalPayoutsFlow) * 100) : 0;

  let cumulativePct = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Paiements & Modes de livraison (Donut SVG) */}
      <AdminSection
        icon={CreditCard}
        title="Modes de paiement & Remise"
        description={`Répartition sur les ${analytics.periodDays} derniers jours.`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f5f5f4" strokeWidth="13" />
              {totalPaymentOrders > 0 &&
                breakdowns.paymentMethods.map((seg, idx) => {
                  const pct = seg.count / totalPaymentOrders;
                  const dash = pct * circumference;
                  const offset = -cumulativePct * circumference;
                  cumulativePct += pct;
                  return (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                      strokeWidth="13"
                      strokeDasharray={`${dash} ${circumference}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-bold text-stone-900 tabular-nums">
                {totalPaymentOrders}
              </span>
              <span className="text-[10px] font-medium text-stone-400">commandes</span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 min-w-0">
            {breakdowns.paymentMethods.length === 0 ? (
              <p className="text-xs text-stone-400">Aucune commande sur la période.</p>
            ) : (
              breakdowns.paymentMethods.map((item, idx) => {
                const pct =
                  totalPaymentOrders > 0 ? Math.round((item.count / totalPaymentOrders) * 100) : 0;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      />
                      <span className="truncate font-medium text-stone-700">{item.label}</span>
                    </div>
                    <span className="shrink-0 font-semibold text-stone-900 tabular-nums">
                      {pct}% · {formatPrice(item.amount || 0)}
                    </span>
                  </div>
                );
              })
            )}

            <div className="border-t border-stone-100 pt-2.5">
              <RankedBarList
                items={breakdowns.deliveryModes}
                emptyLabel="Aucun mode enregistré"
                barColorClass="bg-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>
      </AdminSection>

      {/* 2. Santé financière & Performance */}
      <AdminSection
        icon={Wallet}
        title="Revenus plateforme & Trésorerie"
        description="Commissions, monétisation et suivi des reversements vendeurs/livreurs."
      >
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-stone-200/80 bg-stone-50/70 p-3">
            <p className="text-[11px] font-medium text-stone-500">Revenus période</p>
            <p className="mt-0.5 text-lg font-bold text-stone-900 tabular-nums">
              {formatPrice(financials.totalPlatformRevenue)}
            </p>
            <p className="mt-0.5 text-[11px] text-stone-500 tabular-nums">
              Com. {formatPrice(financials.commissions)} · Boost {formatPrice(financials.monetizationRevenue)}
            </p>
          </div>
          <div className="rounded-lg border border-stone-200/80 bg-stone-50/70 p-3">
            <p className="text-[11px] font-medium text-stone-500">Panier moyen</p>
            <p className="mt-0.5 text-lg font-bold text-stone-900 tabular-nums">
              {formatPrice(summary.avgOrderValue)}
            </p>
            <p className="mt-0.5 text-[11px] text-stone-500 tabular-nums">
              Livrées {summary.completionRatePct}% · Annulées {summary.cancellationRatePct}%
            </p>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-stone-100 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-stone-700">Reversements déjà payés</span>
            <span className="font-bold text-emerald-700 tabular-nums">
              {formatPrice(financials.paidPayoutsAmount)} ({paidPayoutsPct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${paidPayoutsPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 tabular-nums">
            <span>En attente : {formatPrice(financials.pendingPayoutsAmount)} ({financials.pendingPayoutsCount})</span>
            <span>Boutiques Pro actives : {summary.activeProUsers}</span>
          </div>
        </div>
      </AdminSection>

      {/* 3. Statuts des commandes & Flotte livreurs */}
      <AdminSection
        icon={PieChart}
        title="Tunnel des commandes"
        description={`Coursiers vérifiés : ${summary.verifiedDriversCount} (${summary.onlineDriversCount} disponibles)`}
      >
        <RankedBarList
          items={breakdowns.orderStatuses}
          emptyLabel="Aucune commande sur cette période."
          barColorClass="bg-stone-800"
        />
      </AdminSection>

      {/* 4. Top Catégories & Quartiers de Daloa */}
      <AdminSection
        icon={MapPin}
        title="Catalogue & Implantation Daloa"
        description="Catégories dominantes du catalogue et quartiers les plus actifs."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Top catégories actives
            </p>
            <RankedBarList
              items={breakdowns.topCategories}
              emptyLabel="Aucune catégorie"
              barColorClass="bg-[var(--color-primary)]"
            />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Top quartiers (membres)
            </p>
            <RankedBarList
              items={breakdowns.topDistricts}
              emptyLabel="Aucun quartier renseigné"
              barColorClass="bg-emerald-600"
            />
          </div>
        </div>
      </AdminSection>
    </div>
  );
};
