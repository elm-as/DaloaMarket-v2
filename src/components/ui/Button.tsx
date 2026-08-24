import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'filled' | 'outlined' | 'tonal' | 'text';
type ButtonColor = 'primary' | 'secondary' | 'error' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  filled: 'text-white shadow-sm hover:shadow-md',
  outlined: 'bg-transparent border border-current hover:bg-opacity-5',
  tonal: 'bg-opacity-12 hover:bg-opacity-16',
  text: 'bg-transparent hover:bg-gray-100',
};

const colorStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
  filled: {
    primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)]',
    secondary: 'bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-600)]',
    error: 'bg-[var(--color-error)] hover:bg-red-600',
    success: 'bg-[var(--color-success)] hover:bg-emerald-600',
  },
  outlined: {
    primary: 'border-orange-500 text-orange-600 hover:bg-orange-50/50',
    secondary: 'border-gray-300 text-gray-700 hover:bg-gray-50',
    error: 'border-red-500 text-red-600 hover:bg-red-50',
    success: 'border-emerald-500 text-emerald-600 hover:bg-emerald-50',
  },
  tonal: {
    primary: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    error: 'bg-red-50 text-red-700 hover:bg-red-100',
    success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  text: {
    primary: 'text-orange-600 hover:bg-orange-50',
    secondary: 'text-gray-700 hover:bg-gray-100',
    error: 'text-red-600 hover:bg-red-50',
    success: 'text-emerald-600 hover:bg-emerald-50',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3.5 py-1.5 text-xs font-semibold gap-1.5 rounded-xl leading-tight',
  md: 'min-h-[42px] px-4 py-2 text-sm font-semibold gap-2 rounded-xl leading-tight',
  lg: 'min-h-[46px] px-5 py-2.5 text-sm sm:text-base font-bold gap-2 rounded-xl leading-tight',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  color = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  // Normalize variant aliases (e.g. 'outline' -> 'outlined')
  const normalizedVariant: ButtonVariant = (variant as string) === 'outline' ? 'outlined' : variant;
  const safeVariant: ButtonVariant = variantStyles[normalizedVariant] ? normalizedVariant : 'filled';
  const safeColor: ButtonColor = colorStyles[safeVariant]?.[color] ? color : 'primary';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-[var(--motion-fast)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[safeVariant],
        colorStyles[safeVariant][safeColor],
        sizeStyles[size] || sizeStyles.md,
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};
