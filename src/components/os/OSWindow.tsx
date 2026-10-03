import { useRef, type ReactNode } from 'react';
import { WindowControls } from '../WindowControls';
import { cn } from '../../lib/cn';
import type { WindowState } from '../../os/types';

interface Props {
  win: WindowState;
  active: boolean;
  accent: string;
  dark: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number, x?: number, y?: number) => void;
  onSnap: (side: 'left' | 'right' | null) => void;
  children: ReactNode;
}

const TOP = 40;

export function OSWindow({
  win, active, accent, dark, onFocus, onClose, onMinimize, onMaximize, onMove, onResize, onSnap, children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  if (win.minimized) return null;

  const isMobile = window.innerWidth < 640;
  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: TOP, width: '100vw', height: `calc(100dvh - ${TOP}px - 84px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  const startDrag = (e: React.PointerEvent) => {
    if (isMobile || win.maximized) return;
    // Never hijack clicks on interactive titlebar controls (traffic lights,
    // tile buttons, etc.): capturing the pointer here would retarget the
    // click to the titlebar and the button's onClick would never fire.
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [data-nodrag]')) return;
    onFocus();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const nx = d.ox + (e.clientX - d.sx);
    const ny = Math.max(TOP, d.oy + (e.clientY - d.sy));
    d.moved = true;
    onMove(nx, ny);
    // snap hint: drag to top => maximize, sides => halves
    if (e.clientY <= 4) onSnap(null);
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    if (e.clientY <= 2) onMaximize();
    else if (e.clientX <= 2) onSnap('left');
    else if (e.clientX >= window.innerWidth - 2) onSnap('right');
  };

  const startResize =
    (dir: 'se' | 'e' | 's') => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onFocus();
      const el = ref.current;
      if (!el) return;
      const sx = e.clientX;
      const sy = e.clientY;
      const ow = win.w;
      const oh = win.h;
      const move = (ev: PointerEvent) => {
        const dw = ev.clientX - sx;
        const dh = ev.clientY - sy;
        if (dir === 'se') onResize(ow + dw, oh + dh);
        else if (dir === 'e') onResize(ow + dw, oh);
        else onResize(ow, oh + dh);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${win.title} window`}
      onPointerDown={onFocus}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button, [data-nodrag]')) return;
        if ((e.target as HTMLElement).closest('[data-titlebar]') && !isMobile) onMaximize();
      }}
      className={cn(
        'absolute flex min-h-0 flex-col overflow-hidden border backdrop-blur-2xl',
        'animate-[scale-in_0.18s_cubic-bezier(0.22,1,0.36,1)_both]',
        win.maximized || isMobile ? 'rounded-none' : 'rounded-[14px]',
        dark
          ? 'border-white/15 bg-[#1e1e22]/85 shadow-[0_32px_80px_-12px_rgb(0_0_0/0.6)]'
          : 'border-white/50 bg-[#f5f5f7]/85 shadow-[0_32px_80px_-12px_rgb(0_0_0/0.35)]',
        !active && 'brightness-[0.97]',
      )}
      style={{
        ...style,
        boxShadow: active
          ? '0 32px 80px -12px rgb(0 0 0 / 0.4), 0 0 0 0.5px rgb(0 0 0 / 0.1)'
          : '0 16px 48px -12px rgb(0 0 0 / 0.25)',
      }}
    >
      {/* title bar */}
      <div
        data-titlebar
        onPointerDown={startDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        className={cn(
          'flex h-11 shrink-0 cursor-default items-center gap-3 border-b px-4 touch-none select-none',
          dark ? 'border-white/10 bg-white/[0.06]' : 'border-black/[0.06] bg-white/55',
          win.maximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
      >
        <div data-nodrag className="flex items-center">
          <WindowControls
            maximized={win.maximized}
            onClose={onClose}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
          />
        </div>
        <p className={cn(
          'pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[13px] font-semibold sm:flex',
          dark ? 'text-white/80' : 'text-neutral-700',
        )}>
          {win.title}
        </p>
        <div className="ml-auto flex items-center gap-1" data-nodrag>
          {!win.maximized && (
            <>
              <button
                type="button"
                title="Tile left"
                onClick={() => onSnap('left')}
                className={cn('hidden rounded px-1.5 py-1 text-[11px] sm:block', dark ? 'text-white/50 hover:bg-white/10' : 'text-neutral-400 hover:bg-black/5')}
              >◧</button>
              <button
                type="button"
                title="Tile right"
                onClick={() => onSnap('right')}
                className={cn('hidden rounded px-1.5 py-1 text-[11px] sm:block', dark ? 'text-white/50 hover:bg-white/10' : 'text-neutral-400 hover:bg-black/5')}
              >◨</button>
            </>
          )}
        </div>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-hidden', dark ? 'text-neutral-100' : 'text-neutral-900')}>
        {children}
      </div>

      {/* resize handles */}
      {!win.maximized && (
        <>
          <div onPointerDown={startResize('e')} className="absolute top-11 right-0 bottom-4 w-2 cursor-ew-resize touch-none" />
          <div onPointerDown={startResize('s')} className="absolute right-4 bottom-0 left-4 h-2 cursor-ns-resize touch-none" />
          <div
            onPointerDown={startResize('se')}
            className={cn('absolute right-1.5 bottom-1.5 size-4 cursor-nwse-resize touch-none', dark ? 'text-white/30' : 'text-neutral-400')}
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="currentColor"><path d="M14 14h-3v1.5h4.5V15H14v-1zm0-4h-1.5v3H14v-3zM10 14H8.5v1.5H11V14h-1z" opacity=".8" /></svg>
          </div>
        </>
      )}
      {/* accent line for active window */}
      {active && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/5" style={{ boxShadow: `inset 0 1px 0 ${accent}22` }} />}
    </div>
  );
}
