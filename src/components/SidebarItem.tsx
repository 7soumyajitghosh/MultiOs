import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  badge?: number | string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

/**
 * Single sidebar row with rounded selected pill.
 * Fully keyboard-operable via native <button>.
 */
export function SidebarItem({
  icon: Icon,
  label,
  badge,
  selected = false,
  disabled = false,
  onSelect,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={selected ? 'page' : undefined}
      onClick={onSelect}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-left text-[13.5px] leading-none',
        'transition-all duration-200 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'bg-black/[0.07] font-medium text-neutral-900 shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_1px_2px_rgb(0_0_0/0.05)]'
          : 'font-normal text-neutral-600 hover:bg-black/[0.045] hover:text-neutral-900 active:bg-black/[0.07] active:scale-[0.99]',
      )}
    >
      <Icon
        aria-hidden
        strokeWidth={selected ? 2.2 : 1.8}
        className={cn(
          'size-[17px] shrink-0 transition-colors duration-200',
          selected ? 'text-neutral-900' : 'text-neutral-500 group-hover:text-neutral-700',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span
          aria-label={`${badge} items`}
          className={cn(
            'flex h-[18px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
            selected
              ? 'bg-neutral-800/[0.08] text-neutral-700'
              : 'bg-black/[0.06] text-neutral-500',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
