import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface ContentCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: string;
  action?: ReactNode;
  children: ReactNode;
  hoverable?: boolean;
  className?: string;
}

/**
 * Neutral surface card: 12–16px radius, soft layered shadow,
 * subtle lift on hover. No heavy gradients.
 */
export function ContentCard({
  title,
  subtitle,
  icon: Icon,
  iconTone = 'bg-[#0071e3]/10 text-[#0071e3]',
  action,
  children,
  hoverable = true,
  className,
}: ContentCardProps) {
  return (
    <section
      aria-label={title || undefined}
      className={cn(
        'rounded-[14px] border border-black/[0.06] bg-white/75 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm',
        'transition-all duration-200 ease-out',
        hoverable && 'hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)]',
        className,
      )}
    >
      {(title || Icon || action) && (
        <div className="mb-3 flex items-start gap-3">
          {Icon && (
            <span
              aria-hidden
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                iconTone,
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.9} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="truncate text-[14px] font-semibold text-neutral-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-neutral-500">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
