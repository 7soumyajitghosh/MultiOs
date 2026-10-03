import { Check, User } from 'lucide-react';
import { WALLPAPERS } from '../os/wallpapers';
import type { OSSettings } from '../os/types';
import { cn } from '../lib/cn';

export function SettingsApp({
  settings, onUpdate, dark,
}: {
  settings: OSSettings;
  onUpdate: (p: Partial<OSSettings>) => void;
  dark: boolean;
}) {
  const Row = ({ label, desc, control }: { label: string; desc?: string; control: React.ReactNode }) => (
    <div className={cn('flex items-center gap-3 rounded-[12px] border p-3', dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/[0.06] bg-white/70')}>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13.5px] font-medium', dark ? 'text-white' : 'text-neutral-900')}>{label}</p>
        {desc && <p className={cn('text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>{desc}</p>}
      </div>
      {control}
    </div>
  );

  const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn('relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition', on ? 'bg-[#34c759]' : dark ? 'bg-white/20' : 'bg-black/20')}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );

  return (
    <div className={cn('h-full overflow-y-auto p-4', dark ? 'text-white' : 'text-neutral-900')}>
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {/* profile */}
        <div className={cn('flex items-center gap-3 rounded-[14px] border p-4', dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/[0.06] bg-white/70')}>
          <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-[#5ac8fa] to-[#0071e3] text-[20px] font-bold text-white">
            {settings.userName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <User className="size-3.5 opacity-50" />
              <input
                value={settings.userName}
                onChange={(e) => onUpdate({ userName: e.target.value.slice(0, 20) || 'Maya' })}
                className="w-full bg-transparent text-[15px] font-semibold outline-none"
              />
            </div>
            <p className={cn('text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>Aurora Account • Administrator</p>
          </div>
        </div>

        <h4 className={cn('mt-1 text-[12px] font-semibold uppercase tracking-wide', dark ? 'text-white/40' : 'text-neutral-400')}>Appearance</h4>
        <div className={cn('rounded-[14px] border p-3', dark ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.06] bg-black/[0.02]')}>
          <p className="mb-2 text-[13px] font-medium">Wallpaper</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {WALLPAPERS.map((w) => {
              const sel = w.id === settings.wallpaperId;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onUpdate({ wallpaperId: w.id })}
                  title={w.name}
                  className={cn('group relative h-14 cursor-pointer overflow-hidden rounded-[10px] ring-2 transition', sel ? 'ring-[#0071e3]' : 'ring-transparent hover:ring-black/20')}
                  style={{ background: dark && w.darkCss ? w.darkCss : w.css }}
                >
                  {sel && (
                    <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-[#0071e3] text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                  <span className={cn('absolute bottom-1 left-1.5 text-[10px] font-semibold drop-shadow', dark ? 'text-white' : 'text-neutral-700')}>{w.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Row label="Dark mode" desc="Darker menus, docks and windows." control={<Toggle on={settings.darkMode} onClick={() => onUpdate({ darkMode: !settings.darkMode })} label="Dark mode" />} />
            <Row
              label="Accent color"
              desc="Used for selections and highlights."
              control={
                <div className="flex gap-1.5">
                  {['#0071e3', '#5e5ce6', '#ff375f', '#ff9f0a', '#30d158'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Accent ${c}`}
                      onClick={() => onUpdate({ accent: c })}
                      className={cn('size-6 cursor-pointer rounded-full ring-2 ring-offset-1 transition', settings.accent === c ? 'ring-black/40 dark:ring-white/70' : 'ring-transparent')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              }
            />
          </div>
        </div>

        <h4 className={cn('mt-1 text-[12px] font-semibold uppercase tracking-wide', dark ? 'text-white/40' : 'text-neutral-400')}>Desktop & Clock</h4>
        <div className="flex flex-col gap-2">
          <Row label="Show desktop icons" desc="Finder shortcuts on the wallpaper." control={<Toggle on={settings.showDesktopIcons} onClick={() => onUpdate({ showDesktopIcons: !settings.showDesktopIcons })} label="Desktop icons" />} />
          <Row label="Wi-Fi" desc={settings.wifi ? 'Connected to HomeNet-5G' : 'Disconnected'} control={<Toggle on={settings.wifi} onClick={() => onUpdate({ wifi: !settings.wifi })} label="Wi-Fi" />} />
          <Row label="Bluetooth" desc={settings.bluetooth ? 'On' : 'Off'} control={<Toggle on={settings.bluetooth} onClick={() => onUpdate({ bluetooth: !settings.bluetooth })} label="Bluetooth" />} />
          <Row label="Display brightness" desc={`${Math.round(settings.brightness * 100)}%`} control={<input type="range" min={55} max={100} value={Math.round(settings.brightness * 100)} onChange={(e) => onUpdate({ brightness: Number(e.target.value) / 100 })} className="w-36 accent-[#0071e3]" />} />
          <Row label="Volume" desc={`${settings.volume}%`} control={<input type="range" min={0} max={100} value={settings.volume} onChange={(e) => onUpdate({ volume: Number(e.target.value) })} className="w-36 accent-[#0071e3]" />} />
        </div>
        <p className={cn('pb-2 text-center text-[11.5px]', dark ? 'text-white/30' : 'text-neutral-400')}>Settings save automatically to this browser.</p>
      </div>
    </div>
  );
}
