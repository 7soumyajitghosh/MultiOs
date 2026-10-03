import { Cpu, HardDrive, MemoryStick, Monitor } from 'lucide-react';
import { cn } from '../lib/cn';

export function AboutApp({ dark, onOpenSettings }: { dark: boolean; onOpenSettings: () => void }) {
  const specs = [
    { Icon: Monitor, label: 'Display', value: '1920 × 1080 Retina' },
    { Icon: Cpu, label: 'Chip', value: 'Prism X1 (8-core)' },
    { Icon: MemoryStick, label: 'Memory', value: '16 GB unified' },
    { Icon: HardDrive, label: 'Storage', value: '512 GB SSD' },
  ];
  return (
    <div className={cn('flex h-full flex-col items-center overflow-y-auto p-6 text-center', dark ? 'text-white' : 'text-neutral-900')}>
      <div className="flex size-16 items-center justify-center rounded-[18px] bg-neutral-900 text-white shadow-xl dark:bg-white dark:text-black">
        <svg viewBox="0 0 32 32" className="size-8" fill="currentColor" aria-hidden>
          <circle cx="11" cy="16" r="6" opacity=".9" />
          <circle cx="21" cy="16" r="6" opacity=".45" />
        </svg>
      </div>
      <h3 className="mt-3 text-[22px] font-bold tracking-tight">Aurora</h3>
      <p className={cn('text-[12.5px]', dark ? 'text-white/50' : 'text-neutral-500')}>Version 0.1.0 “Prism” • prismkernel</p>
      <p className={cn('mt-1 font-mono text-[11px]', dark ? 'text-white/35' : 'text-neutral-400')}>MultiOs hobby OS — web simulation</p>

      <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2 text-left">
        {specs.map(({ Icon, label, value }) => (
          <div key={label} className={cn('rounded-[12px] border p-3', dark ? 'border-white/10 bg-white/[0.05]' : 'border-black/[0.06] bg-black/[0.02]')}>
            <Icon className="size-4 opacity-50" />
            <p className="mt-1.5 text-[11.5px] opacity-50">{label}</p>
            <p className="text-[13px] font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onOpenSettings} className="cursor-pointer rounded-[10px] bg-[#0071e3] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0077ed]">
          System Settings…
        </button>
      </div>
      <p className={cn('mt-4 max-w-[44ch] text-[11.5px] leading-relaxed', dark ? 'text-white/35' : 'text-neutral-400')}>
        Original educational OS. No Linux, BSD, Windows or macOS code included — only standard build tools.
      </p>
    </div>
  );
}
