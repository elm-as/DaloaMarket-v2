import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Kit d'interface de l'administration.
 *
 * Une seule direction visuelle, celle du tableau de bord : fond gris clair,
 * cartes blanches bordées, titres courts, couleur d'accent réservée à l'action
 * principale et aux états. Pas de dégradés, d'ombres fortes ni d'emoji dans
 * les titres. Chaque écran admin se compose de ces briques.
 */

/* ── En-tête de page ──────────────────────────────────────────────────────── */

export const AdminPageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-xl font-bold text-[var(--color-on-surface)]">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{description}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ── Carte de section ─────────────────────────────────────────────────────── */

export const AdminSection: React.FC<{
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Pastille d'état à droite du titre (ex. « Active »). */
  aside?: React.ReactNode;
  /** Barre d'actions en bas de carte (ex. bouton Enregistrer). */
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, aside, footer, className, bodyClassName, children }) => (
  <section className={cn('rounded-2xl border border-gray-200 bg-white', className)}>
    {(title || aside) && (
      <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Icon size={16} />
            </span>
          )}
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{description}</p>
            )}
          </div>
        </div>
        {aside}
      </header>
    )}
    <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
    {footer && (
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
        {footer}
      </footer>
    )}
  </section>
);

/* ── Indicateur chiffré (style KPI) ───────────────────────────────────────── */

export const AdminStatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}> = ({ label, value, icon: Icon, hint, tone = 'neutral', onClick }) => {
  const toneClass = {
    neutral: 'text-gray-500',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    success: 'text-emerald-600',
  }[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-gray-200 bg-white p-4 text-left',
        onClick && 'transition-colors hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon size={18} className={toneClass} />}
        <span className="text-sm text-[var(--color-on-surface-variant)]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-on-surface)] tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Tag>
  );
};

export const AdminStatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
);

/* ── Interrupteur avec libellé ────────────────────────────────────────────── */

export const AdminToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled }) => (
  <label
    className={cn(
      'flex items-start justify-between gap-4 py-3',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    )}
  >
    <span className="min-w-0">
      <span className="block text-sm font-medium text-[var(--color-on-surface)]">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-gray-500">{description}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  </label>
);

/* ── Champ de formulaire ──────────────────────────────────────────────────── */

export const AdminField: React.FC<{
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}> = ({ label, hint, htmlFor, children }) => (
  <div className="py-2">
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--color-on-surface)]">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

export const adminInputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-100)]';

/* ── Boutons ──────────────────────────────────────────────────────────────── */

export const AdminButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    loading?: boolean;
    icon?: LucideIcon;
    size?: 'sm' | 'md';
  }
> = ({ variant = 'secondary', loading, icon: Icon, size = 'md', className, children, disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
      variant === 'primary' && 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]',
      variant === 'secondary' && 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
      className
    )}
  >
    {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : 16} />}
    {children}
  </button>
);

/* ── Pastille d'état ──────────────────────────────────────────────────────── */

export type AdminBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export const AdminBadge: React.FC<{
  tone?: AdminBadgeTone;
  children: React.ReactNode;
}> = ({ tone = 'neutral', children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
      tone === 'neutral' && 'bg-gray-100 text-gray-700',
      tone === 'success' && 'bg-emerald-50 text-emerald-700',
      tone === 'warning' && 'bg-amber-50 text-amber-700',
      tone === 'danger' && 'bg-red-50 text-red-700',
      tone === 'info' && 'bg-blue-50 text-blue-700',
      tone === 'accent' && 'bg-[var(--color-primary-50)] text-[var(--color-primary-dark)]'
    )}
  >
    {children}
  </span>
);

/* ── Onglets internes à une page ──────────────────────────────────────────── */

export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-gray-200">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-[var(--color-primary)] text-[var(--color-on-surface)]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── États vides / chargement ─────────────────────────────────────────────── */

export const AdminEmpty: React.FC<{ icon?: LucideIcon; title: string; description?: string }> = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
    {Icon && <Icon size={28} className="mb-3 text-gray-300" />}
    <p className="text-sm font-medium text-gray-700">{title}</p>
    {description && <p className="mt-1 max-w-sm text-xs text-gray-500">{description}</p>}
  </div>
);

export const AdminLoading: React.FC = () => (
  <div className="flex justify-center py-16">
    <Loader2 size={28} className="animate-spin text-gray-400" />
  </div>
);
