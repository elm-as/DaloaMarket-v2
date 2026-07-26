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
  filled: 'text-white shadow-[var(--elevation-2)] hover:shadow-[var(--elevation-3)]',
  outlined: 'bg-transparent border-2 hover:bg-opacity-5',
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
    primary: 'border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]',
    secondary: 'border-[var(--color-secondary)] text-[var(--color-secondary)] hover:bg-[var(--color-secondary-50)]',
    error: 'border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-light)]',
    success: 'border-[var(--color-success)] text-[var(--color-success)] hover:bg-[var(--color-success-light)]',
  },
  tonal: {
    primary: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-100)]',
    secondary: 'bg-[var(--color-secondary-50)] text-[var(--color-secondary-700)] hover:bg-[var(--color-secondary-100)]',
    error: 'bg-[var(--color-error-light)] text-red-700 hover:bg-red-100',
    success: 'bg-[var(--color-success-light)] text-emerald-700 hover:bg-emerald-100',
  },
  text: {
    primary: 'text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]',
    secondary: 'text-[var(--color-secondary)] hover:bg-[var(--color-secondary-50)]',
    error: 'text-[var(--color-error)] hover:bg-[var(--color-error-light)]',
    success: 'text-[var(--color-success)] hover:bg-[var(--color-success-light)]',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-[var(--radius-md)]',
  lg: 'h-14 px-8 text-[17px] gap-2.5 rounded-[var(--radius-lg)]',
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
