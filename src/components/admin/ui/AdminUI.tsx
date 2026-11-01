import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Kit d'interface de la console d'administration DaloaMarket.
 * Direction visuelle : surface pierre chaude (#FAF9F6), bordures nettes,
 * typographie dense à chiffres tabulaires, accent orange réservé aux actions
 * primaires et états actifs.
 */

export const AdminPageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 border-b border-stone-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">{title}</h1>
      {description && (
        <p className="mt-0.5 text-sm text-stone-500">{description}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const AdminSection: React.FC<{
  title?: string;
  description?: string;
  icon?: LucideIcon;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, aside, footer, className, bodyClassName, children }) => (
  <section className={cn('rounded-xl border border-stone-200/90 bg-white shadow-2xs', className)}>
    {(title || aside) && (
      <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
              <Icon size={15} />
            </span>
          )}
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-stone-900">{title}</h2>}
            {description && (
              <p className="text-xs text-stone-500">{description}</p>
            )}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
    )}
    <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
    {footer && (
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 bg-stone-50/50 px-5 py-3 rounded-b-xl">
        {footer}
      </footer>
    )}
  </section>
);

export const AdminStatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  active?: boolean;
  onClick?: () => void;
}> = ({ label, value, icon: Icon, hint, tone = 'neutral', active = false, onClick }) => {
  const toneStyles = {
    neutral: 'text-stone-500 bg-stone-100',
    warning: 'text-amber-700 bg-amber-50',
    danger: 'text-red-700 bg-red-50',
    success: 'text-emerald-700 bg-emerald-50',
  }[tone];

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border bg-white p-4 text-left transition-all',
        active
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-100)]'
          : 'border-stone-200/90',
        onClick && 'cursor-pointer hover:border-stone-300 hover:bg-stone-50/60'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        {Icon && (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', toneStyles)}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-stone-500 truncate">{hint}</p>}
      </div>
    </Tag>
  );
};

export const AdminStatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
);

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
      <span className="block text-sm font-medium text-stone-900">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-stone-500">{description}</span>}
    </span>
    <span className="mt-0.5 flex shrink-0 items-center gap-2">
      <span className={cn('w-16 text-right text-xs font-medium', checked ? 'text-[var(--color-primary-dark)]' : 'text-stone-400')}>
        {checked ? 'Activé' : 'Désactivé'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--color-primary)]' : 'bg-stone-300'
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </span>
  </label>
);

export const AdminField: React.FC<{
  label: string;
  hint?: string;
  htmlFor?: string;
  rightLabel?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, hint, htmlFor, rightLabel, children }) => (
  <div className="py-1.5">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-stone-700">
        {label}
      </label>
      {rightLabel && <span className="text-xs text-stone-400 tabular-nums">{rightLabel}</span>}
    </div>
    {children}
    {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
  </div>
);

export const adminInputClass =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-100)]';

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
      'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
      variant === 'primary' && 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-2xs',
      variant === 'secondary' && 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
      variant === 'ghost' && 'text-stone-600 hover:bg-stone-100',
      className
    )}
  >
    {loading ? <Loader2 size={size === 'sm' ? 14 : 15} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : 15} />}
    {children}
  </button>
);

export type AdminBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export const AdminBadge: React.FC<{
  tone?: AdminBadgeTone;
  children: React.ReactNode;
}> = ({ tone = 'neutral', children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
      tone === 'neutral' && 'bg-stone-100 text-stone-700',
      tone === 'success' && 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      tone === 'warning' && 'bg-amber-50 text-amber-800 border border-amber-200/60',
      tone === 'danger' && 'bg-red-50 text-red-700 border border-red-200/60',
      tone === 'info' && 'bg-sky-50 text-sky-700 border border-sky-200/60',
      tone === 'accent' && 'bg-[var(--color-primary-50)] text-[var(--color-primary-dark)]'
    )}
  >
    {children}
  </span>
);

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
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
              active
                ? 'border-[var(--color-primary)] text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[11px] tabular-nums',
                  active ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
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

export const AdminEmpty: React.FC<{ icon?: LucideIcon; title: string; description?: string }> = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white px-6 py-10 text-center">
    {Icon && <Icon size={24} className="mb-2.5 text-stone-300" />}
    <p className="text-sm font-medium text-stone-700">{title}</p>
    {description && <p className="mt-1 max-w-sm text-xs text-stone-500">{description}</p>}
  </div>
);

export const AdminLoading: React.FC = () => (
  <div className="flex justify-center py-14">
    <Loader2 size={24} className="animate-spin text-stone-400" />
  </div>
);
