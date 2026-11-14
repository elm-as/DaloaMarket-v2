import React from 'react';
import { AlertTriangle, Check, FileText, KeyRound, Package, Utensils } from 'lucide-react';
import { cn } from '../../lib/utils';

export const EXPRESS_PACKAGE_TYPES = [
  { id: 'parcel', label: 'Colis standard', Icon: Package },
  { id: 'document', label: 'Pli / Document', Icon: FileText },
  { id: 'food', label: 'Repas', Icon: Utensils },
  { id: 'keys_urgent', label: 'Clés / Urgent', Icon: KeyRound },
] as const;

interface ExpressPackageSectionProps {
  packageType: string;
  onPackageTypeChange: (value: string) => void;
  packageDescription: string;
  onPackageDescriptionChange: (value: string) => void;
  isSealed: boolean;
  onToggleSealed: () => void;
  isFragile: boolean;
  onToggleFragile: () => void;
}

export const ExpressPackageSection: React.FC<ExpressPackageSectionProps> = ({
  packageType,
  onPackageTypeChange,
  packageDescription,
  onPackageDescriptionChange,
  isSealed,
  onToggleSealed,
  isFragile,
  onToggleFragile,
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
      <Package className="h-4 w-4 text-orange-600 shrink-0" />
      <h2>2. Type de colis</h2>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {EXPRESS_PACKAGE_TYPES.map(({ id, label, Icon }) => {
        const selected = packageType === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPackageTypeChange(id)}
            className={cn(
              'flex min-h-[48px] items-center justify-center sm:flex-col gap-2 sm:gap-1 rounded-xl border px-3 py-2 text-xs transition-colors',
              selected
                ? 'border-orange-600 bg-orange-50 text-orange-950 font-bold'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium',
            )}
          >
            <Icon className="h-4 w-4 text-orange-600 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onToggleSealed}
        className={cn(
          'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors',
          isSealed
            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50',
        )}
      >
        <Check className="h-3.5 w-3.5" />
        <span>Colis scellé</span>
      </button>
      <button
        type="button"
        onClick={onToggleFragile}
        className={cn(
          'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors',
          isFragile
            ? 'border-amber-600 bg-amber-50 text-amber-800'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50',
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Fragile</span>
      </button>
    </div>

    <div className="space-y-1">
      <label htmlFor="express-package-desc" className="block text-xs font-semibold text-slate-700">
        Précision utile pour le coursier (optionnel)
      </label>
      <input
        id="express-package-desc"
        name="package_description"
        type="text"
        value={packageDescription}
        onChange={(e) => onPackageDescriptionChange(e.target.value)}
        placeholder="Ex : Enveloppe A4, sac repas..."
        aria-describedby="express-privacy-hint"
        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-600 focus:outline-none"
      />
      <p id="express-privacy-hint" className="text-[11px] text-slate-500">
        Par sécurité, ne mentionnez ni la marque ni la valeur du contenu.
      </p>
    </div>
  </section>
);
