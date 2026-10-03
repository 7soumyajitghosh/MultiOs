import { useEffect, useRef, useState } from 'react';
import { BatteryMedium, Bell, Bluetooth, ChevronLeft, Moon, Search, Sun, Wifi, WifiOff } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { cn } from '../../lib/cn';
import type { AppId, OSSettings } from '../../os/types';

interface Props {
  activeApp: AppId | null;
  activeTitle: string;
  settings: OSSettings;
  onUpdate: (patch: Partial<OSSettings>) => void;
  onOpenPalette: () => void;
  onOpenApp: (app: AppId) => void;
  onAction: (action: 'shutdown' | 'restart' | 'logout' | 'about') => void;
}

export function TopBar({ activeApp, activeTitle, settings, onUpdate, onOpenPalette, onOpenApp, onAction }: Props) {
  const { time, date } = useClock();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [ccOpen, setCcOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
        setCcOpen(false);
        setCalOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setCcOpen(false);
        setCalOpen(false);
      }
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  const now = new Date();
  const menus: Record<string, { label: string; fn?: () => void; disabled?: boolean }[]> = {
    File: [
      { label: 'New Window', fn: () => activeApp && onOpenApp(activeApp) },
      { label: 'Open…  ⌘O', fn: () => onOpenApp('finder') },
      { label: 'Close Window  ⌘W', disabled: !activeApp },
    ],
    Edit: [
      { label: 'Undo  ⌘Z' },
      { label: 'Cut  ⌘X' },
      { label: 'Copy  ⌘C' },
      { label: 'Paste  ⌘V' },
    ],
    View: [
      { label: settings.darkMode ? 'Light Appearance' : 'Dark Appearance', fn: () => onUpdate({ darkMode: !settings.darkMode }) },
      { label: settings.showDesktopIcons ? 'Hide Desktop Icons' : 'Show Desktop Icons', fn: () => onUpdate({ showDesktopIcons: !settings.showDesktopIcons }) },
    ],
    Window: [
      { label: 'Minimize  ⌘M' },
      { label: 'Zoom', fn: () => onOpenPalette() },
      { label: 'Bring All to Front', fn: () => onOpenPalette() },
    ],
    Help: [{ label: 'Aurora Help', fn: () => onOpenApp('about') }],
  };

  return (
    <div ref={rootRef} className="relative z-40">
      <header
        className={cn(
          'flex h-10 shrink-0 items-center gap-1 border-b px-3 text-[13px] backdrop-blur-xl select-none',
          settings.darkMode ? 'border-white/10 bg-black/45 text-white' : 'border-white/40 bg-white/60 text-neutral-800',
        )}
      >
        {/* logo menu */}
        <div className="relative">
          <button
            type="button"
            aria-label="Aurora menu"
            onClick={() => setOpenMenu(openMenu === 'logo' ? null : 'logo')}
            className={cn('flex size-7 items-center justify-center rounded-[7px] transition hover:bg-black/10', settings.darkMode && 'hover:bg-white/15 text-white')}
          >
            <svg viewBox="0 0 12 12" className="size-4" fill="currentColor" aria-hidden>
              <circle cx="4" cy="6" r="2.4" opacity=".9" />
              <circle cx="8.4" cy="6" r="2.4" opacity=".45" />
            </svg>
          </button>
          {openMenu === 'logo' && (
            <MenuPanel dark={settings.darkMode} onPick={(a) => { setOpenMenu(null); onAction(a as never); }}>
              <MenuItem label="About Aurora" fn={() => onAction('about')} dark={settings.darkMode} />
              <MenuSep dark={settings.darkMode} />
              <MenuItem label="Settings…" fn={() => onOpenApp('settings')} dark={settings.darkMode} />
              <MenuItem label="App Store…" disabled dark={settings.darkMode} />
              <MenuSep dark={settings.darkMode} />
              <MenuItem label="Sleep" dark={settings.darkMode} />
              <MenuItem label="Restart…" fn={() => onAction('restart')} dark={settings.darkMode} />
              <MenuItem label="Shut Down…" fn={() => onAction('shutdown')} dark={settings.darkMode} />
              <MenuSep dark={settings.darkMode} />
              <MenuItem label={`Log Out ${settings.userName}…`} fn={() => onAction('logout')} dark={settings.darkMode} />
            </MenuPanel>
          )}
        </div>

        <strong className="mr-1 hidden text-[13px] font-bold sm:block">{activeApp ? activeTitle : 'Finder'}</strong>

        <nav aria-label="Menu" className="hidden items-center md:flex">
          {Object.keys(menus).map((m) => (
            <div key={m} className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === m ? null : m)}
                className={cn(
                  'rounded-[6px] px-2.5 py-1 transition',
                  openMenu === m ? (settings.darkMode ? 'bg-white/15' : 'bg-black/10') : 'hover:bg-black/[0.07]',
                  settings.darkMode && openMenu !== m && 'hover:bg-white/10',
                )}
              >
                {m}
              </button>
              {openMenu === m && (
                <MenuPanel dark={settings.darkMode} onPick={() => setOpenMenu(null)}>
                  {menus[m].map((item) => (
                    <MenuItem key={item.label} label={item.label} fn={() => { setOpenMenu(null); item.fn?.(); }} disabled={item.disabled} dark={settings.darkMode} />
                  ))}
                </MenuPanel>
              )}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          {/* battery */}
          <span className={cn('hidden items-center gap-1 px-1.5 text-[12px] font-medium tabular-nums sm:flex', settings.darkMode ? 'text-white/80' : 'text-neutral-700')}>
            <span>82%</span>
            <BatteryMedium className="size-5" strokeWidth={1.6} />
          </span>
          <button
            type="button"
            aria-label={settings.wifi ? 'Wi-Fi on' : 'Wi-Fi off'}
            onClick={() => onUpdate({ wifi: !settings.wifi })}
            className={cn('rounded-[7px] p-1.5 transition hover:bg-black/10', settings.darkMode && 'text-white hover:bg-white/15')}
          >
            {settings.wifi ? <Wifi className="size-4" strokeWidth={1.9} /> : <WifiOff className="size-4" strokeWidth={1.9} />}
          </button>
          <button
            type="button"
            aria-label="Bluetooth"
            onClick={() => onUpdate({ bluetooth: !settings.bluetooth })}
            className={cn('hidden rounded-[7px] p-1.5 transition hover:bg-black/10 sm:block', settings.darkMode && 'text-white hover:bg-white/15', !settings.bluetooth && 'opacity-40')}
          >
            <Bluetooth className="size-4" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            aria-label="Search"
            onClick={onOpenPalette}
            className={cn('rounded-[7px] p-1.5 transition hover:bg-black/10', settings.darkMode && 'text-white hover:bg-white/15')}
          >
            <Search className="size-4" strokeWidth={1.9} />
          </button>
          {/* control center toggle */}
          <button
            type="button"
            aria-label="Control Center"
            aria-expanded={ccOpen}
            onClick={() => { setCcOpen((v) => !v); setCalOpen(false); setOpenMenu(null); }}
            className={cn('rounded-[7px] p-1.5 transition hover:bg-black/10', settings.darkMode && 'text-white hover:bg-white/15', ccOpen && 'bg-black/10')}
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" stroke="none" opacity=".85" />
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" />
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" />
              <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className={cn('relative rounded-[7px] p-1.5 transition hover:bg-black/10', settings.darkMode && 'text-white hover:bg-white/15')}
          >
            <Bell className="size-4" strokeWidth={1.9} />
            <span aria-hidden className="absolute top-1 right-1 size-[7px] rounded-full border border-white bg-red-500" />
          </button>
          <button
            type="button"
            onClick={() => { setCalOpen((v) => !v); setCcOpen(false); setOpenMenu(null); }}
            className={cn('ml-1 flex items-center gap-2 rounded-[7px] px-2 py-1 text-[12.5px] font-medium tabular-nums transition hover:bg-black/10', settings.darkMode ? 'text-white hover:bg-white/15' : 'text-neutral-700')}
          >
            <span className="hidden xl:inline opacity-60">{date}</span>
            <span>{time}{settings.clockSeconds ? `:${String(now.getSeconds()).padStart(2, '0')}` : ''}</span>
          </button>
        </div>
      </header>

      {/* Control center */}
      {ccOpen && (
        <div className={cn(
          'absolute top-11 right-3 w-[320px] rounded-[18px] border p-3 shadow-2xl backdrop-blur-2xl animate-[scale-in_0.18s_ease-out_both]',
          settings.darkMode ? 'border-white/15 bg-[#1c1c20]/90 text-white' : 'border-white/60 bg-white/80 text-neutral-800',
        )}>
          <div className="grid grid-cols-2 gap-2">
            <CCToggle icon={<Wifi className="size-4" />} label="Wi-Fi" sub={settings.wifi ? 'HomeNet-5G' : 'Off'} on={settings.wifi} onClick={() => onUpdate({ wifi: !settings.wifi })} accent="#0071e3" />
            <CCToggle icon={<Bluetooth className="size-4" />} label="Bluetooth" sub={settings.bluetooth ? 'On' : 'Off'} on={settings.bluetooth} onClick={() => onUpdate({ bluetooth: !settings.bluetooth })} accent="#0071e3" />
            <CCToggle icon={settings.darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />} label="Appearance" sub={settings.darkMode ? 'Dark' : 'Light'} on={settings.darkMode} onClick={() => onUpdate({ darkMode: !settings.darkMode })} accent="#6d5bd0" />
            <button
              type="button"
              onClick={() => { onOpenApp('settings'); setCcOpen(false); }}
              className={cn('flex items-center gap-2.5 rounded-[14px] p-2.5 text-left transition', settings.darkMode ? 'bg-white/10 hover:bg-white/15' : 'bg-black/[0.05] hover:bg-black/[0.08]')}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-neutral-500 text-white"><ChevronLeft className="size-4 rotate-180" /></span>
              <span><span className="block text-[12.5px] font-semibold">Settings</span><span className="block text-[11px] opacity-60">All controls</span></span>
            </button>
          </div>
          <div className={cn('mt-2 rounded-[14px] p-3', settings.darkMode ? 'bg-white/10' : 'bg-black/[0.05]')}>
            <label className="flex items-center justify-between text-[12px] font-medium">Display <span className="opacity-60 tabular-nums">{Math.round(settings.brightness * 100)}%</span></label>
            <input type="range" min={55} max={100} value={Math.round(settings.brightness * 100)} onChange={(e) => onUpdate({ brightness: Number(e.target.value) / 100 })} className="mt-2 w-full accent-[#0071e3]" />
            <label className="mt-3 flex items-center justify-between text-[12px] font-medium">Sound <span className="opacity-60 tabular-nums">{settings.volume}%</span></label>
            <input type="range" min={0} max={100} value={settings.volume} onChange={(e) => onUpdate({ volume: Number(e.target.value) })} className="mt-2 w-full accent-[#0071e3]" />
          </div>
        </div>
      )}

      {/* Calendar / notification center */}
      {calOpen && (
        <div className={cn(
          'absolute top-11 right-3 w-[320px] rounded-[18px] border p-4 shadow-2xl backdrop-blur-2xl animate-[scale-in_0.18s_ease-out_both]',
          settings.darkMode ? 'border-white/15 bg-[#1c1c20]/90 text-white' : 'border-white/60 bg-white/85 text-neutral-800',
        )}>
          <p className="text-[12px] font-semibold uppercase tracking-wide opacity-50">{date}</p>
          <p className="mt-0.5 text-[26px] font-bold tabular-nums">{time}</p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11.5px]">
            {['S','M','T','W','T','F','S'].map((d, i) => <span key={i} className="py-1 font-semibold opacity-40">{d}</span>)}
            {Array.from({ length: 35 }).map((_, i) => {
              const day = i - now.getDay() + 1;
              const inMonth = day >= 1 && day <= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const isToday = day === now.getDate();
              return (
                <span key={i} className={cn('flex size-7 items-center justify-center rounded-full tabular-nums', !inMonth && 'opacity-25', isToday && 'bg-[#ff3b30] font-bold text-white')}>{inMonth ? day : ''}</span>
              );
            })}
          </div>
          <div className={cn('mt-3 rounded-[12px] p-3 text-[12.5px]', settings.darkMode ? 'bg-white/10' : 'bg-black/[0.04]')}>
            <p className="font-semibold">3 notifications</p>
            <p className="mt-0.5 opacity-70">Review due today · 2 mentions · Backup completed</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuPanel({ children, dark }: { children: React.ReactNode; dark: boolean; onPick: (a: string) => void }) {
  return (
    <div className={cn(
      'absolute top-8 left-0 z-50 min-w-[220px] rounded-[12px] border p-1.5 shadow-2xl backdrop-blur-2xl animate-[scale-in_0.15s_ease-out_both]',
      dark ? 'border-white/15 bg-[#232327]/95 text-white' : 'border-black/10 bg-white/95 text-neutral-800',
    )}>
      {children}
    </div>
  );
}
function MenuItem({ label, fn, disabled, dark }: { label: string; fn?: () => void; disabled?: boolean; dark: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={fn}
      className={cn(
        'flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[13px]',
        disabled ? 'opacity-40' : dark ? 'hover:bg-[#0071e3] hover:text-white' : 'hover:bg-[#0071e3] hover:text-white',
      )}
    >
      {label}
    </button>
  );
}
function MenuSep({ dark }: { dark: boolean }) {
  return <div className={cn('mx-2 my-1 h-px', dark ? 'bg-white/10' : 'bg-black/10')} />;
}
function CCToggle({ icon, label, sub, on, onClick, accent }: { icon: React.ReactNode; label: string; sub: string; on: boolean; onClick: () => void; accent: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 rounded-[14px] bg-black/[0.05] p-2.5 text-left transition hover:bg-black/[0.08] dark:bg-white/10">
      <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: on ? accent : '#8e8e93' }}>{icon}</span>
      <span><span className="block text-[12.5px] font-semibold">{label}</span><span className="block text-[11px] opacity-60">{sub}</span></span>
    </button>
  );
}
