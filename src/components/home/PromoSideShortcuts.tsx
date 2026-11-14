import React from 'react';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

interface PromoSideShortcutsProps {
  onOpenExpress: () => void;
  onOpenBoost: () => void;
}

export const PromoSideShortcuts: React.FC<PromoSideShortcutsProps> = ({
  onOpenExpress,
  onOpenBoost,
}) => (
  <div className="hidden lg:flex lg:col-span-4 flex-col gap-3 h-[200px]">
    <button
      type="button"
      onClick={onOpenExpress}
      className="flex-1 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 p-3.5 text-left text-white border border-slate-800 hover:bg-slate-800 transition-colors"
    >
      <div className="min-w-0 space-y-0.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-300">
          <Zap className="h-3 w-3" /> Express 30 min
        </span>
        <p className="text-sm font-black leading-tight">Coursier Hors-Market</p>
        <p className="text-[11px] text-slate-300 font-medium tabular-nums">
          Colis & repas dès 500 FCFA
        </p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>

    <button
      type="button"
      onClick={onOpenBoost}
      className="flex-1 flex items-center justify-between gap-3 rounded-2xl bg-orange-600 p-3.5 text-left text-white hover:bg-orange-700 transition-colors"
    >
      <div className="min-w-0 space-y-0.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
          <Sparkles className="h-3 w-3" /> Visibilité Vendeur
        </span>
        <p className="text-sm font-black leading-tight">Booster mes annonces</p>
        <p className="text-[11px] text-orange-100 font-medium tabular-nums">
          En tête de liste dès 100 FCFA
        </p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  </div>
);
