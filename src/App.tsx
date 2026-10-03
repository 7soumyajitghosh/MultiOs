import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AppWindow,
  Calculator,
  Compass,
  FileText,
  Folder,
  HardDrive,
  Info,
  Search,
  Settings as SettingsIcon,
  SquareTerminal,
  StickyNote,
} from 'lucide-react';
import { BootScreen } from './components/os/BootScreen';
import { LoginScreen } from './components/os/LoginScreen';
import { TopBar } from './components/os/TopBar';
import { Dock } from './components/os/Dock';
import { OSWindow } from './components/os/OSWindow';
import { Launchpad } from './components/os/Launchpad';
import { useWindowManager } from './hooks/useWindowManager';
import { WALLPAPERS } from './os/wallpapers';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppId, type OSSettings } from './os/types';
import { cn } from './lib/cn';
import { FinderApp } from './apps/FinderApp';
import { TerminalApp } from './apps/TerminalApp';
import { NotesApp } from './apps/NotesApp';
import { CalculatorApp } from './apps/CalculatorApp';
import { BrowserApp } from './apps/BrowserApp';
import { SettingsApp } from './apps/SettingsApp';
import { AboutApp } from './apps/AboutApp';
import { WorkspaceApp } from './apps/WorkspaceApp';
import { ActivityMonitorApp } from './apps/ActivityMonitorApp';
import { bootKernel, rebootKernel, shutdownKernel } from './system/kernel';

type Phase = 'boot' | 'login' | 'desktop' | 'off';

const APP_META: Record<AppId, { title: string }> = {
  finder: { title: 'Finder' },
  terminal: { title: 'Terminal' },
  notes: { title: 'Notes' },
  calculator: { title: 'Calculator' },
  browser: { title: 'Aurora Browser' },
  projects: { title: 'Aurora — Workspace' },
  activity: { title: 'Activity Monitor' },
  settings: { title: 'Settings' },
  about: { title: 'About Aurora' },
};

const DESKTOP_ICONS: { id: AppId | 'hd'; label: string; Icon: typeof Folder; bg: string }[] = [
  { id: 'hd', label: 'Macintosh HD', Icon: HardDrive, bg: 'linear-gradient(180deg,#e5e5ea,#8e8e93)' },
  { id: 'finder', label: 'Documents', Icon: Folder, bg: 'linear-gradient(180deg,#5ac8fa,#0071e3)' },
  { id: 'terminal', label: 'Terminal', Icon: SquareTerminal, bg: 'linear-gradient(180deg,#3a3a3c,#000)' },
  { id: 'notes', label: 'Notes', Icon: StickyNote, bg: 'linear-gradient(180deg,#ffd60a,#ff9f0a)' },
  { id: 'browser', label: 'Browser', Icon: Compass, bg: 'linear-gradient(180deg,#64d2ff,#0a84ff)' },
  { id: 'projects', label: 'Workspace', Icon: AppWindow, bg: 'linear-gradient(180deg,#bf5af2,#5e5ce6)' },
  { id: 'activity', label: 'Activity Monitor', Icon: Activity, bg: 'linear-gradient(180deg,#5ac8fa,#0a84ff)' },
];

export default function App() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [settings, setSettings] = useState<OSSettings>(() => {
    try {
      return loadSettings();
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [spotlight, setSpotlight] = useState(false);
  const [spotQuery, setSpotQuery] = useState('');
  const [spotCursor, setSpotCursor] = useState(0);
  const [launchpad, setLaunchpad] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const wm = useWindowManager();
  const dark = settings.darkMode;
  const spotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);
  const patchSettings = useCallback((p: Partial<OSSettings>) => setSettings((s) => ({ ...s, ...p })), []);

  const wp = WALLPAPERS.find((w) => w.id === settings.wallpaperId) ?? WALLPAPERS[0];
  const bg = dark && wp.darkCss ? wp.darkCss : wp.css;

  const visibleWins = useMemo(() => wm.windows.filter((w) => !w.minimized), [wm.windows]);
  const activeWin = useMemo(
    () => [...visibleWins].sort((a, b) => b.z - a.z)[0] ?? null,
    [visibleWins],
  );
  const running = useMemo(() => [...new Set(wm.windows.map((w) => w.appId))], [wm.windows]);
  const minimizedApps = useMemo(
    () => [...new Set(wm.windows.filter((w) => w.minimized).map((w) => w.appId))],
    [wm.windows],
  );

  const openApp = useCallback(
    (app: AppId) => {
      wm.openApp(app);
      setSpotlight(false);
      setLaunchpad(false);
    },
    [wm],
  );

  // global shortcuts
  useEffect(() => {
    if (phase !== 'desktop') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotQuery('');
        setSpotCursor(0);
        setSpotlight((v) => !v);
      } else if (e.key === 'Escape') {
        setSpotlight(false);
        setLaunchpad(false);
        setCtxMenu(null);
      }
      // Cmd+M minimize active
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm' && activeWin) {
        e.preventDefault();
        wm.minimizeWindow(activeWin.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, activeWin, wm]);

  useEffect(() => {
    if (spotlight) requestAnimationFrame(() => spotInputRef.current?.focus());
  }, [spotlight]);

  // open welcome windows on first login
  const didWelcome = useRef(false);
  const handleLogin = useCallback(() => {
    setPhase('desktop');
    // Bring up the userland process subsystem before any app renders.
    bootKernel();
    if (!didWelcome.current) {
      didWelcome.current = true;
      window.setTimeout(() => {
        wm.openApp('projects');
        window.setTimeout(() => wm.openApp('finder'), 350);
      }, 400);
    }
  }, [wm]);

  const handlePower = useCallback(
    (a: 'shutdown' | 'restart' | 'logout' | 'about') => {
      if (a === 'about') {
        wm.openApp('about');
      } else if (a === 'logout') {
        shutdownKernel();
        didWelcome.current = false;
        setPhase('login');
      } else if (a === 'restart') {
        rebootKernel();
        setPhase('boot');
      } else {
        shutdownKernel();
        setPhase('off');
      }
    },
    [wm],
  );

  const spotItems = useMemo(() => {
    const all: { id: AppId; label: string; hint: string; Icon: typeof Folder }[] = [
      { id: 'finder', label: 'Finder', hint: 'Browse files', Icon: Folder },
      { id: 'browser', label: 'Aurora Browser', hint: 'aurora://start', Icon: Compass },
      { id: 'terminal', label: 'Terminal', hint: 'zsh — type help', Icon: SquareTerminal },
      { id: 'notes', label: 'Notes', hint: 'Saved locally', Icon: StickyNote },
      { id: 'calculator', label: 'Calculator', hint: 'Calculate', Icon: Calculator },
      { id: 'projects', label: 'Workspace', hint: 'Projects & overview', Icon: AppWindow },
      { id: 'activity', label: 'Activity Monitor', hint: 'Tasks, CPU, memory', Icon: Activity },
      { id: 'settings', label: 'Settings', hint: 'Wallpaper, theme', Icon: SettingsIcon },
      { id: 'about', label: 'About Aurora', hint: 'System info', Icon: Info },
    ];
    const q = spotQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q));
  }, [spotQuery]);

  useEffect(() => setSpotCursor(0), [spotQuery]);

  const cycleWallpaper = useCallback(() => {
    setSettings((s) => {
      const i = WALLPAPERS.findIndex((w) => w.id === s.wallpaperId);
      return { ...s, wallpaperId: WALLPAPERS[(i + 1) % WALLPAPERS.length].id };
    });
  }, []);

  if (phase === 'boot') return <BootScreen onDone={() => setPhase('login')} />;
  if (phase === 'login') return <LoginScreen settings={settings} onLogin={handleLogin} />;
  if (phase === 'off') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white/60 select-none">
        <div className="flex size-14 items-center justify-center rounded-[16px] bg-white/10">
          <svg viewBox="0 0 32 32" className="size-7 opacity-50" fill="currentColor"><circle cx="11" cy="16" r="6" /><circle cx="21" cy="16" r="6" opacity=".5" /></svg>
        </div>
        <p className="mt-4 text-[14px]">Aurora is off</p>
        <button type="button" onClick={() => setPhase('boot')} className="mt-4 cursor-pointer rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20">
          ⏻ &nbsp;Power on
        </button>
      </div>
    );
  }

  const renderApp = (appId: AppId) => {
    switch (appId) {
      case 'finder':
        return <FinderApp dark={dark} />;
      case 'terminal':
        return <TerminalApp dark={dark} onOpenApp={openApp} />;
      case 'notes':
        return <NotesApp dark={dark} />;
      case 'calculator':
        return <CalculatorApp dark={dark} />;
      case 'browser':
        return <BrowserApp dark={dark} />;
      case 'settings':
        return <SettingsApp settings={settings} onUpdate={patchSettings} dark={dark} />;
      case 'about':
        return <AboutApp dark={dark} onOpenSettings={() => openApp('settings')} />;
      case 'projects':
        return <WorkspaceApp dark={dark} />;
      case 'activity':
        return <ActivityMonitorApp dark={dark} />;
    }
  };

  return (
    <div
      className={cn('relative flex h-dvh flex-col overflow-hidden select-none', dark ? 'text-white' : 'text-neutral-900')}
      style={{ background: bg }}
      onContextMenu={(e) => {
        // only desktop background triggers custom menu
        if ((e.target as HTMLElement).closest('[data-os-chrome]')) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onPointerDown={() => setCtxMenu(null)}
    >
      {/* wallpaper blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {wp.blobs.map((b, i) => (
          <div key={i} className={cn('absolute rounded-full blur-[110px]', b.className, b.color, dark && 'opacity-60')} />
        ))}
        <div className={cn('absolute inset-0', dark ? 'bg-[radial-gradient(ellipse_at_center,transparent_50%,rgb(0_0_0/0.35)_100%)]' : 'bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(30_41_59/0.08)_100%)]')} />
      </div>

      {/* brightness dimmer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[60] bg-black transition-opacity" style={{ opacity: 1 - settings.brightness }} />

      <div data-os-chrome className="relative z-40">
        <TopBar
          activeApp={activeWin?.appId ?? null}
          activeTitle={activeWin ? APP_META[activeWin.appId].title : 'Finder'}
          settings={settings}
          onUpdate={patchSettings}
          onOpenPalette={() => {
            setSpotQuery('');
            setSpotCursor(0);
            setSpotlight(true);
          }}
          onOpenApp={openApp}
          onAction={handlePower}
        />
      </div>

      {/* desktop stage */}
      <main className="relative z-10 min-h-0 flex-1">
        {/* desktop icons */}
        {settings.showDesktopIcons && (
          <div className="absolute top-3 right-3 left-3 grid max-w-[560px] grid-cols-4 gap-1 sm:grid-cols-5" style={{ direction: 'ltr' }}>
            {DESKTOP_ICONS.map(({ id, label, Icon, bg }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedIcon(label)}
                onDoubleClick={() => openApp(id === 'hd' ? 'finder' : (id as AppId))}
                className={cn(
                  'group flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] p-2.5',
                  selectedIcon === label ? 'bg-white/25 backdrop-blur ring-1 ring-white/40' : 'hover:bg-white/15',
                )}
              >
                <span className="flex size-12 items-center justify-center rounded-[13px] text-white shadow-lg ring-1 ring-white/30" style={{ background: bg }}>
                  <Icon className="size-6" strokeWidth={1.6} />
                </span>
                <span className={cn(
                  'max-w-full truncate rounded px-1.5 py-0.5 text-center text-[11.5px] font-medium leading-tight',
                  selectedIcon === label ? 'bg-[#0071e3] text-white' : dark ? 'bg-black/35 text-white' : 'bg-black/30 text-white',
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* hint when no windows */}
        {wm.windows.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={cn('rounded-[18px] border px-6 py-5 text-center backdrop-blur-xl', dark ? 'border-white/10 bg-black/30 text-white/70' : 'border-white/50 bg-white/45 text-neutral-600')}>
              <p className="text-[14px] font-semibold">Welcome to Aurora, {settings.userName}</p>
              <p className="mt-1 text-[12.5px] opacity-70">Double-click an icon, use the Dock, or press ⌘K for Spotlight</p>
            </div>
          </div>
        )}

        {/* windows */}
        {wm.windows
          .slice()
          .sort((a, b) => a.z - b.z)
          .map((w) => (
            <OSWindow
              key={w.id}
              win={w}
              active={activeWin?.id === w.id}
              accent={settings.accent}
              dark={dark}
              onFocus={() => wm.focusWindow(w.id)}
              onClose={() => wm.closeWindow(w.id)}
              onMinimize={() => wm.minimizeWindow(w.id)}
              onMaximize={() => wm.toggleMaximize(w.id)}
              onMove={(x, y) => wm.moveWindow(w.id, x, y)}
              onResize={(nw, nh, nx, ny) => wm.resizeWindow(w.id, nw, nh, nx, ny)}
              onSnap={(s) => wm.snapWindow(w.id, s)}
            >
              <div className="h-full" data-os-chrome onPointerDown={(e) => e.stopPropagation()}>
                {renderApp(w.appId)}
              </div>
            </OSWindow>
          ))}

        {/* desktop context menu */}
        {ctxMenu && (
          <div data-os-chrome className="fixed z-[70]" style={{ left: Math.min(ctxMenu.x, window.innerWidth - 230), top: Math.min(ctxMenu.y, window.innerHeight - 260) }}>
            <div className={cn('w-[220px] rounded-[12px] border p-1.5 shadow-2xl backdrop-blur-2xl animate-[scale-in_0.15s_ease-out_both]', dark ? 'border-white/15 bg-[#232327]/95 text-white' : 'border-black/10 bg-white/95 text-neutral-800')}>
              {[
                { label: 'Change Wallpaper', fn: cycleWallpaper },
                { label: settings.showDesktopIcons ? 'Hide Desktop Icons' : 'Show Desktop Icons', fn: () => patchSettings({ showDesktopIcons: !settings.showDesktopIcons }) },
                { label: settings.darkMode ? 'Light Appearance' : 'Dark Appearance', fn: () => patchSettings({ darkMode: !settings.darkMode }) },
              ].map((i) => (
                <button key={i.label} type="button" onClick={() => { i.fn(); setCtxMenu(null); }} className="flex w-full cursor-pointer items-center rounded-[8px] px-2.5 py-1.5 text-left text-[13px] hover:bg-[#0071e3] hover:text-white">
                  {i.label}
                </button>
              ))}
              <div className={cn('mx-2 my-1 h-px', dark ? 'bg-white/10' : 'bg-black/10')} />
              {[
                { label: 'Open Terminal', fn: () => openApp('terminal') },
                { label: 'About Aurora', fn: () => openApp('about') },
              ].map((i) => (
                <button key={i.label} type="button" onClick={() => { i.fn(); setCtxMenu(null); }} className="flex w-full cursor-pointer items-center rounded-[8px] px-2.5 py-1.5 text-left text-[13px] hover:bg-[#0071e3] hover:text-white">
                  {i.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* minimized windows strip (click to restore) */}
        {wm.windows.some((w) => w.minimized) && (
          <div data-os-chrome className="absolute bottom-20 left-3 flex max-w-[60vw] gap-1.5 overflow-x-auto">
            {wm.windows.filter((w) => w.minimized).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => wm.focusWindow(w.id)}
                className={cn('flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium backdrop-blur-xl transition hover:scale-105', dark ? 'border-white/15 bg-black/50 text-white' : 'border-white/50 bg-white/70 text-neutral-700 shadow')}
              >
                <FileText className="size-3.5" /> {w.title}
              </button>
            ))}
          </div>
        )}

        {launchpad && <Launchpad dark={dark} onOpen={openApp} onClose={() => setLaunchpad(false)} />}
      </main>

      <div data-os-chrome className="relative z-40">
        <Dock
          running={running}
          activeApp={activeWin?.appId ?? null}
          minimized={minimizedApps}
          dark={dark}
          onOpen={openApp}
          onLaunchpad={() => setLaunchpad(true)}
        />
      </div>

      {/* Spotlight */}
      {spotlight && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
          <button type="button" aria-label="Close Spotlight" onClick={() => setSpotlight(false)} className="absolute inset-0 cursor-default bg-black/25 backdrop-blur-sm" />
          <div className={cn('relative w-full max-w-[560px] overflow-hidden rounded-[16px] border shadow-2xl backdrop-blur-2xl animate-[scale-in_0.18s_ease-out_both]', dark ? 'border-white/15 bg-[#1e1e22]/95 text-white' : 'border-white/60 bg-white/90 text-neutral-800')}>
            <div className={cn('flex items-center gap-2.5 border-b px-4', dark ? 'border-white/10' : 'border-black/[0.06]')}>
              <Search aria-hidden className="size-4 shrink-0 opacity-50" />
              <input
                ref={spotInputRef}
                value={spotQuery}
                onChange={(e) => setSpotQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSpotCursor((c) => (spotItems.length ? (c + 1) % spotItems.length : 0));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSpotCursor((c) => (spotItems.length ? (c - 1 + spotItems.length) % spotItems.length : 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const hit = spotItems[spotCursor];
                    if (hit) openApp(hit.id);
                  }
                }}
                placeholder="Spotlight Search"
                className="h-12 w-full bg-transparent text-center text-[17px] outline-none placeholder:opacity-40"
              />
              <kbd className={cn('hidden shrink-0 rounded-[6px] border px-1.5 py-0.5 font-sans text-[10.5px] font-semibold sm:block', dark ? 'border-white/15 bg-white/10' : 'border-black/[0.08] bg-white')}>esc</kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              <p className={cn('px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-wide uppercase', dark ? 'text-white/40' : 'text-neutral-400')}>Applications</p>
              {spotItems.length === 0 && <p className="px-4 py-6 text-center text-[13px] opacity-60">No results for “{spotQuery}”</p>}
              {spotItems.map((app, i) => (
                <button
                  key={app.id}
                  type="button"
                  onMouseEnter={() => setSpotCursor(i)}
                  onClick={() => openApp(app.id)}
                  className={cn('flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left', i === spotCursor && (dark ? 'bg-white/10' : 'bg-[#0071e3]/[0.09]'))}
                >
                  <span className={cn('flex size-8 items-center justify-center rounded-[9px] border', dark ? 'border-white/10 bg-white/10' : 'border-black/[0.06] bg-white')}>
                    <app.Icon className="size-4" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{app.label}</span>
                    <span className={cn('block truncate text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>{app.hint}</span>
                  </span>
                  {i === spotCursor && <kbd className={cn('rounded px-1.5 py-0.5 font-sans text-[10.5px] font-semibold', dark ? 'bg-white/10' : 'bg-black/[0.06]')}>↵</kbd>}
                </button>
              ))}
            </div>
            <div className={cn('hidden items-center gap-4 border-t px-4 py-2 text-[11.5px] opacity-60 sm:flex', dark ? 'border-white/10' : 'border-black/[0.06]')}>
              <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
              <span className="ml-auto">⌘K anywhere</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
