import React from 'react';
import { formatPrice } from '../../lib/utils';

interface PriceRangeSliderProps {
  /** Borne basse réelle de la catégorie */
  min: number;
  /** Borne haute réelle de la catégorie */
  max: number;
  /** Valeur courante (chaîne vide = borne non contrainte) */
  valueMin: string;
  valueMax: string;
  onCommit: (nextMin: string, nextMax: string) => void;
}

const STEPS = 60;

function niceStep(min: number, max: number): number {
  const span = Math.max(max - min, 1);
  const raw = span / STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.max(magnitude * factor, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Curseur double pour le filtre de prix.
 *
 * Deux `input[type=range]` superposés : le pouce actif est déterminé par la
 * proximité de la valeur cliquée, ce qui évite le blocage classique où l'un des
 * deux pouces devient inatteignable une fois les bornes rapprochées.
 */
const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  min,
  max,
  valueMin,
  valueMax,
  onCommit,
}) => {
  const step = niceStep(min, max);
  const lowerBound = Math.floor(min / step) * step;
  const upperBound = Math.ceil(max / step) * step;
  const usable = upperBound > lowerBound;

  const parsedMin = Number.parseInt(valueMin, 10);
  const parsedMax = Number.parseInt(valueMax, 10);

  const [localMin, setLocalMin] = React.useState(() =>
    Number.isFinite(parsedMin) ? clamp(parsedMin, lowerBound, upperBound) : lowerBound,
  );
  const [localMax, setLocalMax] = React.useState(() =>
    Number.isFinite(parsedMax) ? clamp(parsedMax, lowerBound, upperBound) : upperBound,
  );

  // Resynchronisation quand les bornes changent (changement de catégorie) ou
  // quand les filtres sont réinitialisés depuis l'extérieur.
  React.useEffect(() => {
    const nextMin = Number.parseInt(valueMin, 10);
    const nextMax = Number.parseInt(valueMax, 10);
    setLocalMin(Number.isFinite(nextMin) ? clamp(nextMin, lowerBound, upperBound) : lowerBound);
    setLocalMax(Number.isFinite(nextMax) ? clamp(nextMax, lowerBound, upperBound) : upperBound);
  }, [valueMin, valueMax, lowerBound, upperBound]);

  const commit = (nextMin: number, nextMax: number) => {
    onCommit(
      nextMin > lowerBound ? String(nextMin) : '',
      nextMax < upperBound ? String(nextMax) : '',
    );
  };

  const handleMin = (raw: number) => {
    const next = Math.min(raw, localMax);
    setLocalMin(next);
    commit(next, localMax);
  };

  const handleMax = (raw: number) => {
    const next = Math.max(raw, localMin);
    setLocalMax(next);
    commit(localMin, next);
  };

  const span = upperBound - lowerBound || 1;
  const leftPct = ((localMin - lowerBound) / span) * 100;
  const rightPct = ((localMax - lowerBound) / span) * 100;

  if (!usable) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
        <span className="tabular-nums">{formatPrice(localMin)}</span>
        <span className="tabular-nums">{formatPrice(localMax)}</span>
      </div>

      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-600"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          aria-label="Prix minimum"
          min={lowerBound}
          max={upperBound}
          step={step}
          value={localMin}
          onChange={(e) => handleMin(Number(e.target.value))}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
          style={{ zIndex: localMin >= upperBound - step ? 5 : 3 }}
        />
        <input
          type="range"
          aria-label="Prix maximum"
          min={lowerBound}
          max={upperBound}
          step={step}
          value={localMax}
          onChange={(e) => handleMax(Number(e.target.value))}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
          style={{ zIndex: 4 }}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          aria-label="Prix minimum (FCFA)"
          placeholder={String(lowerBound)}
          value={valueMin}
          onChange={(e) => onCommit(e.target.value, valueMax)}
          className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
        />
        <span className="text-gray-300 font-bold">–</span>
        <input
          type="number"
          inputMode="numeric"
          aria-label="Prix maximum (FCFA)"
          placeholder={String(upperBound)}
          value={valueMax}
          onChange={(e) => onCommit(valueMin, e.target.value)}
          className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
        />
      </div>
    </div>
  );
};

export default PriceRangeSlider;
