import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Restrained desktop-style button with hover lift + press feedback.
 * Single blue accent reserved for `primary`; everything else neutral.
 */
export function PrimaryButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  children,
  ...rest
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex cursor-pointer select-none items-center justify-center gap-2 font-medium whitespace-nowrap',
        'rounded-[10px] transition-all duration-200 ease-out',
        'hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[13.5px]',
        variant === 'primary' &&
          'bg-[#0071e3] text-white shadow-[0_1px_2px_rgb(0_113_227/0.4),0_4px_12px_-2px_rgb(0_113_227/0.35)] hover:bg-[#0077ed] hover:shadow-[0_2px_4px_rgb(0_113_227/0.35),0_8px_20px_-4px_rgb(0_113_227/0.45)] active:bg-[#0060c5]',
        variant === 'secondary' &&
          'border border-black/[0.08] bg-white/80 text-neutral-800 shadow-[0_1px_2px_rgb(0_0_0/0.06)] backdrop-blur hover:border-black/[0.12] hover:bg-white hover:shadow-[0_2px_8px_rgb(0_0_0/0.08)] active:bg-neutral-100',
        variant === 'ghost' &&
          'text-neutral-700 hover:bg-black/[0.05] active:bg-black/[0.08]',
        variant === 'danger' &&
          'border border-red-500/20 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200/70',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        icon && (
          <span aria-hidden className="flex size-4 items-center justify-center">
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
}
