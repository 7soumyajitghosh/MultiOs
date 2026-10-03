import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  titleId?: string;
}

/**
 * Proper centered dialog window: dimmed backdrop, glass card,
 * title bar with close control, ESC + backdrop-click to dismiss.
 */
export function Modal({ open, onClose, title, subtitle, children, footer, titleId }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-neutral-900/35 backdrop-blur-sm animate-[scale-in_0.2s_ease-out_both]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titleId ? undefined : title}
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[calc(100dvh-3rem)] w-full max-w-[480px] flex-col overflow-hidden',
          'rounded-[18px] border border-white/60 bg-white/90 shadow-[var(--shadow-popover)] backdrop-blur-2xl',
          'animate-[scale-in_0.22s_cubic-bezier(0.22,1,0.36,1)_both]',
        )}
      >
        {/* Title bar */}
        <div className="flex shrink-0 items-start gap-3 border-b border-black/[0.06] bg-white/60 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-neutral-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[8px] p-1.5 text-neutral-400 transition-colors duration-150 hover:bg-black/[0.06] hover:text-neutral-800"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] bg-white/60 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
