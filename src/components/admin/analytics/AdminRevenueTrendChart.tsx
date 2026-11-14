import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { cn, formatPrice } from '../../../lib/utils';
import { AdminSection } from '../ui/AdminUI';
import type { DailyAnalyticsPoint } from './adminAnalytics.types';

type TrendMetric = 'gmv' | 'ordersCount' | 'newUsers' | 'newListings';

const METRIC_META: Record<
  TrendMetric,
  { label: string; colorClass: string; fillHex: string; format: (n: number) => string }
> = {
  gmv: {
    label: 'Volume (FCFA)',
    colorClass: 'bg-[var(--color-primary)]',
    fillHex: '#FF7F00',
    format: (n) => formatPrice(n),
  },
  ordersCount: {
    label: 'Commandes',
    colorClass: 'bg-stone-900',
    fillHex: '#1c1917',
    format: (n) => `${n} cmd`,
  },
  newUsers: {
    label: 'Inscriptions',
    colorClass: 'bg-emerald-600',
    fillHex: '#059669',
    format: (n) => `${n} membre${n > 1 ? 's' : ''}`,
  },
  newListings: {
    label: 'Annonces',
    colorClass: 'bg-amber-600',
    fillHex: '#d97706',
    format: (n) => `${n} annonce${n > 1 ? 's' : ''}`,
  },
};

function formatCompactAxisValue(val: number, metric: TrendMetric): string {
  if (metric !== 'gmv') return String(val);
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
  return String(val);
}

interface AdminRevenueTrendChartProps {
  series: DailyAnalyticsPoint[];
  periodDays: number;
}

export const AdminRevenueTrendChart: React.FC<AdminRevenueTrendChartProps> = ({
  series,
  periodDays,
}) => {
  const [metric, setMetric] = useState<TrendMetric>('gmv');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const meta = METRIC_META[metric];

  const { maxVal, totalVal, peakIdx, tickStep } = useMemo(() => {
    let max = 0;
    let total = 0;
    let bestIdx = Math.max(0, series.length - 1);
    series.forEach((point, idx) => {
      const value = point[metric];
      total += value;
      if (value >= max) {
        max = value;
        bestIdx = idx;
      }
    });
    const step = series.length > 20 ? Math.ceil(series.length / 7) : series.length > 10 ? 2 : 1;
    return { maxVal: Math.max(max, 1), totalVal: total, peakIdx: bestIdx, tickStep: step };
  }, [series, metric]);

  const activeIdx = hoveredIdx !== null && series[hoveredIdx] ? hoveredIdx : peakIdx;
  const activePoint = series[activeIdx];
  const avgPerDay = series.length > 0 ? Math.round(totalVal / series.length) : 0;

  return (
    <AdminSection
      icon={BarChart3}
      title={`Activité quotidienne (${periodDays} derniers jours)`}
      description="Survolez ou touchez un jour pour afficher le détail exact."
      aside={
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-0.5">
          {(Object.keys(METRIC_META) as TrendMetric[]).map((key) => {
            const active = metric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMetric(key);
                  setHoveredIdx(null);
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  active
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                    : 'text-stone-500 hover:text-stone-800'
                )}
              >
                {METRIC_META[key].label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4 border-b border-stone-100 pb-3">
        <div className="flex flex-wrap items-baseline gap-5">
          <div>
            <p className="text-[11px] font-medium text-stone-500">Total période</p>
            <p className="text-lg font-bold text-stone-900 tabular-nums">{meta.format(totalVal)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-stone-500">Moyenne / jour</p>
            <p className="text-sm font-semibold text-stone-700 tabular-nums">{meta.format(avgPerDay)}</p>
          </div>
        </div>

        {activePoint && (
          <div className="rounded-lg border border-stone-200/80 bg-stone-50 px-3 py-1.5 text-xs">
            <span className="font-semibold text-stone-900 tabular-nums">{activePoint.date}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span className="font-bold text-stone-900 tabular-nums">
              {meta.format(activePoint[metric])}
            </span>
            {metric !== 'ordersCount' && (
              <span className="ml-2 text-stone-500 tabular-nums">
                ({activePoint.ordersCount} cmd)
              </span>
            )}
          </div>
        )}
      </div>

      {series.length === 0 ? (
        <p className="py-12 text-center text-xs text-stone-400">
          Aucune donnée sur cette période.
        </p>
      ) : (
        <div className="relative">
          <div className="flex gap-2">
            {/* Échelle verticale */}
            <div className="flex h-44 w-11 shrink-0 flex-col justify-between pb-6 text-right text-[10px] font-medium text-stone-400 tabular-nums">
              <span>{formatCompactAxisValue(maxVal, metric)}</span>
              <span>{formatCompactAxisValue(Math.round(maxVal / 2), metric)}</span>
              <span>0</span>
            </div>

            {/* Barres SVG / Flex réactives */}
            <div className="relative flex-1 min-w-0 overflow-x-auto pb-1 scrollbar-none">
              <div className={cn('relative', series.length > 18 && 'min-w-[440px]')}>
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                  <div className="border-t border-dashed border-stone-200/80" />
                  <div className="border-t border-dashed border-stone-200/80" />
                  <div className="border-t border-stone-200" />
                </div>

                <div
                  className="relative flex h-44 items-end gap-[2px] pb-6"
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {series.map((point, idx) => {
                    const val = point[metric];
                    const pct = val > 0 ? Math.max(4, Math.round((val / maxVal) * 100)) : 0;
                    const isActive = idx === activeIdx;
                    const showLabel = idx % tickStep === 0 || idx === series.length - 1;

                    return (
                      <div
                        key={point.date}
                        className="group relative flex h-full flex-1 flex-col items-center justify-end"
                        onMouseEnter={() => setHoveredIdx(idx)}
                      >
                        <button
                          type="button"
                          aria-label={`${point.date} : ${meta.format(val)}`}
                          onFocus={() => setHoveredIdx(idx)}
                          onClick={() => setHoveredIdx(idx)}
                          className="flex h-full w-full items-end justify-center px-[1px] focus:outline-none"
                        >
                          <span
                            style={{ height: `${pct}%`, backgroundColor: val > 0 ? meta.fillHex : '#e7e5e4' }}
                            className={cn(
                              'w-full rounded-t-xs transition-all',
                              val === 0 && 'h-[2px]!',
                              isActive ? 'opacity-100 ring-1 ring-stone-900/20' : 'opacity-75 group-hover:opacity-100'
                            )}
                          />
                        </button>
                        {showLabel && (
                          <span className="pointer-events-none absolute -bottom-5 text-[10px] font-medium text-stone-400 tabular-nums whitespace-nowrap">
                            {point.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminSection>
  );
};
