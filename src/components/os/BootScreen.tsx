import { useEffect, useState } from 'react';

const LOGS = [
  'prismkernel 0.1.0 — init',
  '[memory] map parsed: 62 usable regions',
  '[cpu] GDT reloaded, IDT 256 gates',
  '[pic] remapped 0x20–0x2F, PIT 100Hz',
  '[input] PS/2 keyboard ready',
  '[fs] mounting mfs volume / … ok',
  '[display] framebuffer 1920x1080x32',
  '[session] starting window server …',
  '[session] loading Aurora Desktop …',
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const dur = 2600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // ease out
      setProgress(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      setLogIndex(Math.min(LOGS.length - 1, Math.floor(p * LOGS.length)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(onDone, 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white select-none">
      <div className="flex size-20 items-center justify-center rounded-[22px] bg-[#0a0a0c] ring-1 ring-white/15 shadow-[0_0_80px_rgb(0_113_227/0.35)]">
        <svg viewBox="0 0 32 32" className="size-10" fill="white" aria-hidden>
          <circle cx="11" cy="16" r="6" opacity=".9" />
          <circle cx="21" cy="16" r="6" opacity=".45" />
        </svg>
      </div>
      <p className="mt-6 text-[22px] font-semibold tracking-tight">Aurora</p>
      <p className="mt-1 font-mono text-[11px] text-white/40">MultiOs 0.1.0 “Prism”</p>

      <div className="mt-8 h-[5px] w-52 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-8 h-24 overflow-hidden font-mono text-[11px] leading-relaxed text-white/35 text-center">
        {LOGS.slice(0, logIndex + 1).slice(-4).map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-4 rounded px-3 py-1 font-mono text-[11px] text-white/30 hover:text-white/70"
      >
        skip →
      </button>
    </div>
  );
}
