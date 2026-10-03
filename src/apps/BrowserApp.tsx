import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock,
  Download,
  ExternalLink,
  EyeOff,
  Fingerprint,
  Gem,
  Ghost,
  Globe,
  History,
  Home,
  Link2,
  Lock,
  MoreVertical,
  Newspaper,
  Plus,
  RotateCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/cn';

/* ============================================================================
 * Prism Browser — original private browser for MultiOs / Aurora Desktop.
 *
 * Brave-like privacy model, original implementation:
 *  - Prism Shields: per-site ad / tracker / fingerprint / cookie blocking
 *    + HTTPS upgrades, with deterministic demo counters.
 *  - Private tabs (no history), New-Tab privacy stats, Prism Search,
 *    bookmarks, history, downloads, Rewards + Wallet stubs, Reader view.
 * No Brave code, names, logos, or assets are used.
 * ========================================================================== */

type ShieldSettings = {
  shieldsUp: boolean;
  blockAds: boolean;
  blockTrackers: boolean;
  httpsUpgrade: boolean;
  blockFingerprint: boolean;
  blockCookies: boolean;
};

interface TabState {
  id: string;
  url: string;
  title: string;
  isPrivate: boolean;
  hist: string[];
  hIdx: number;
}

interface HistEntry {
  id: string;
  url: string;
  title: string;
  time: string;
}

interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
  color: string;
}

interface DlEntry {
  id: string;
  name: string;
  url: string;
  size: string;
  done: boolean;
}

interface GlobalStats {
  ads: number;
  trackers: number;
  savedMB: number;
  timeSec: number;
}

const H_KEY = 'prism-browser-history-v1';
const B_KEY = 'prism-browser-bookmarks-v1';
const S_KEY = 'prism-browser-stats-v1';
const D_KEY = 'prism-browser-shields-v1';
const R_KEY = 'prism-browser-rewards-v1';
const L_KEY = 'prism-browser-downloads-v1';

const DEFAULT_SHIELDS: ShieldSettings = {
  shieldsUp: true,
  blockAds: true,
  blockTrackers: true,
  httpsUpgrade: true,
  blockFingerprint: true,
  blockCookies: false,
};

const DEFAULT_BOOKMARKS: BookmarkEntry[] = [
  { id: 'b-start', title: 'Start', url: 'prism://start', color: '#0a84ff' },
  { id: 'b-docs', title: 'User Guide', url: 'prism://docs', color: '#5e5ce6' },
  { id: 'b-rewards', title: 'Rewards', url: 'prism://rewards', color: '#ff9f0a' },
  { id: 'b-github', title: 'GitHub', url: 'https://github.com', color: '#000000' },
];

const FEED = [
  { tag: 'Privacy', title: 'What fingerprinting actually collects — and what Shields stops', src: 'Prism Feed', mins: 6 },
  { tag: 'Performance', title: 'Blocking 3rd-party bloat: how pages load 2× faster with Shields up', src: 'Prism Feed', mins: 4 },
  { tag: 'MultiOs', title: 'prismkernel roadmap: netstack + framebuffer GUI after the shell', src: 'System', mins: 8 },
  { tag: 'How-to', title: 'Private tabs vs normal tabs: when history is never written', src: 'Prism Feed', mins: 3 },
];

/* Note: real-web search engines are intentionally absent. Most send
 * X-Frame-Options / CSP frame-ancestors and refuse iframe embedding, so linking
 * out to them from a sandboxed in-app browser is not viable here. The in-app
 * FEED above is the only content source. */

function uid(p: string) {
  return `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function hostOf(url: string): string {
  try {
    if (url.startsWith('prism://') || url.startsWith('aurora://')) return 'prism';
    return new URL(url).hostname || 'prism';
  } catch {
    return 'prism';
  }
}
function isInternal(url: string) {
  return url.startsWith('prism://') || url.startsWith('aurora://');
}
function internalPath(url: string): string {
  const u = url.replace('aurora://', 'prism://');
  if (!u.startsWith('prism://')) return u;
  const rest = u.slice('prism://'.length);
  const q = rest.indexOf('?');
  return q >= 0 ? rest.slice(0, q) : rest || 'start';
}
function queryOf(url: string): string {
  try {
    const u = new URL(url.replace('prism://', 'https://prism/').replace('aurora://', 'https://prism/'));
    return u.searchParams.get('q') ?? '';
  } catch {
    return '';
  }
}
function normalizeInput(raw: string): string {
  const t = raw.trim();
  if (!t) return 'prism://start';
  if (t.startsWith('prism://') || t.startsWith('aurora://')) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t)) return `https://${t}`;
  if (t === 'localhost' || t.startsWith('localhost:') || t.startsWith('localhost/')) return `http://${t}`;
  return `prism://search?q=${encodeURIComponent(t)}`;
}
function titleFor(url: string): string {
  if (url === 'prism://start' || url === 'aurora://start' || url === 'prism://newtab') return 'New Tab';
  const p = internalPath(url);
  if (url.includes('prism://search') || url.includes('aurora://search')) return `Search: ${queryOf(url).slice(0, 32) || '…'}`;
  const names: Record<string, string> = {
    private: 'Private Tab', history: 'History', bookmarks: 'Bookmarks', downloads: 'Downloads',
    settings: 'Settings', rewards: 'Prism Rewards', wallet: 'Prism Wallet', shields: 'About Shields',
    docs: 'User Guide', start: 'New Tab',
  };
  if (isInternal(url) && names[p]) return names[p];
  if (isInternal(url)) return url;
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}
/** Deterministic demo block counts per host (stand-in for a real filter engine). */
function countsFor(host: string, s: ShieldSettings) {
  if (host === 'prism' || !s.shieldsUp) return { ads: 0, trackers: 0, https: 0, fp: 0, cookies: 0 };
  const h = hashStr(host);
  return {
    ads: s.blockAds ? 2 + (h % 11) : 0,
    trackers: s.blockTrackers ? 3 + ((h >> 3) % 17) : 0,
    https: s.httpsUpgrade ? 1 + ((h >> 5) % 4) : 0,
    fp: s.blockFingerprint ? 1 + ((h >> 7) % 5) : 0,
    cookies: s.blockCookies ? (h >> 9) % 6 : 0,
  };
}
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...(Array.isArray(fallback) ? fallback : { ...fallback }), ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}
function loadArr<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const SEED_STATS: GlobalStats = { ads: 1284, trackers: 3417, savedMB: 312, timeSec: 11220 };

export function BrowserApp({ dark }: { dark: boolean }) {
  const [tabs, setTabs] = useState<TabState[]>([
    { id: 't1', url: 'prism://start', title: 'New Tab', isPrivate: false, hist: ['prism://start'], hIdx: 0 },
  ]);
  const [activeId, setActiveId] = useState('t1');
  const [addr, setAddr] = useState('prism://start');
  const [reloadKey, setReloadKey] = useState(0);
  const [reader, setReader] = useState(false);
  const [shieldsOpen, setShieldsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [engine, setEngine] = useState('Prism Search');

  const [history, setHistory] = useState<HistEntry[]>(() => loadArr(H_KEY, []));
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => loadArr(B_KEY, DEFAULT_BOOKMARKS));
  const [stats, setStats] = useState<GlobalStats>(() => loadJSON(S_KEY, SEED_STATS));
  const [shieldDefaults, setShieldDefaults] = useState<ShieldSettings>(() => loadJSON(D_KEY, DEFAULT_SHIELDS));
  const [hostOverrides, setHostOverrides] = useState<Record<string, ShieldSettings>>(() => {
    try {
      return JSON.parse(localStorage.getItem('prism-browser-hosts-v1') ?? '{}');
    } catch {
      return {};
    }
  });
  const [rewards, setRewards] = useState<{ enabled: boolean; balance: number; adsSeen: number }>(() =>
    loadJSON(R_KEY, { enabled: false, balance: 2.5, adsSeen: 14 }),
  );
  const [downloads, setDownloads] = useState<DlEntry[]>(() => loadArr(L_KEY, []));

  useEffect(() => {
    try { localStorage.setItem(H_KEY, JSON.stringify(history.slice(0, 200))); } catch { /* ignore */ }
  }, [history]);
  useEffect(() => {
    try { localStorage.setItem(B_KEY, JSON.stringify(bookmarks)); } catch { /* ignore */ }
  }, [bookmarks]);
  useEffect(() => {
    try { localStorage.setItem(S_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
  }, [stats]);
  useEffect(() => {
    try { localStorage.setItem(D_KEY, JSON.stringify(shieldDefaults)); } catch { /* ignore */ }
  }, [shieldDefaults]);
  useEffect(() => {
    try { localStorage.setItem('prism-browser-hosts-v1', JSON.stringify(hostOverrides)); } catch { /* ignore */ }
  }, [hostOverrides]);
  useEffect(() => {
    try { localStorage.setItem(R_KEY, JSON.stringify(rewards)); } catch { /* ignore */ }
  }, [rewards]);
  useEffect(() => {
    try { localStorage.setItem(L_KEY, JSON.stringify(downloads.slice(0, 50))); } catch { /* ignore */ }
  }, [downloads]);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const host = hostOf(active.url);
  const siteShields = hostOverrides[host] ?? shieldDefaults;
  const blocked = countsFor(host, siteShields);
  const blockedTotal = blocked.ads + blocked.trackers + blocked.fp + blocked.cookies;
  const isBookmarked = bookmarks.some((b) => b.url === active.url);
  const canBack = active.hIdx > 0;
  const canFwd = active.hIdx < active.hist.length - 1;

  const patchSite = (p: Partial<ShieldSettings>) => {
    const next = { ...(hostOverrides[host] ?? shieldDefaults), ...p };
    setHostOverrides((m) => ({ ...m, [host]: next }));
  };

  const nav = (raw: string, tabId?: string) => {
    const url = normalizeInput(raw);
    const title = titleFor(url);
    const tid = tabId ?? activeId;
    const tab = tabs.find((t) => t.id === tid);
    const priv = tab?.isPrivate ?? false;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        const hist = [...t.hist.slice(0, t.hIdx + 1), url].slice(-50);
        return { ...t, url, title, hist, hIdx: hist.length - 1 };
      }),
    );
    setAddr(url);
    setReader(false);
    setReloadKey((k) => k + 1);
    setShieldsOpen(false);
    setMenuOpen(false);
    if (!priv && !url.startsWith('prism://search') && !url.startsWith('aurora://search')) {
      // record main navigations (skip keystroke-by-keystroke search drafts)
      setHistory((h) => [{ id: uid('h'), url, title, time: new Date().toLocaleString() }, ...h].slice(0, 200));
    } else if (!priv) {
      setHistory((h) => [{ id: uid('h'), url, title, time: new Date().toLocaleString() }, ...h].slice(0, 200));
    }
    if (!isInternal(url)) {
      const c = countsFor(hostOf(url), hostOverrides[hostOf(url)] ?? shieldDefaults);
      const n = c.ads + c.trackers + c.fp;
      setStats((s) => ({
        ads: s.ads + c.ads,
        trackers: s.trackers + c.trackers,
        savedMB: Math.round((s.savedMB + n * 0.06) * 10) / 10,
        timeSec: s.timeSec + n * 2,
      }));
    }
  };

  const switchTab = (id: string) => {
    const t = tabs.find((x) => x.id === id);
    if (!t) return;
    setActiveId(id);
    setAddr(t.url);
    setReader(false);
    setShieldsOpen(false);
    setMenuOpen(false);
  };
  const openTab = (url = 'prism://start', isPrivate = false) => {
    const t: TabState = { id: uid('t'), url, title: titleFor(url), isPrivate, hist: [url], hIdx: 0 };
    setTabs((p) => [...p, t]);
    setActiveId(t.id);
    setAddr(url);
    setReader(false);
    setMenuOpen(false);
  };
  const closeTab = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const wasActive = id === activeId;

    if (tabs.length === 1) {
      // Closing the last tab resets to a *fresh* tab with a new id so the
      // page container key changes and the UI visibly resets even when the
      // closed tab was already on prism://start (reusing the id made the
      // close look like a no-op).
      const fresh: TabState = { id: uid('t'), url: 'prism://start', title: 'New Tab', isPrivate: false, hist: ['prism://start'], hIdx: 0 };
      setTabs([fresh]);
      setActiveId(fresh.id);
      setAddr(fresh.url);
      setReloadKey((k) => k + 1);
    } else {
      const next = tabs.filter((t) => t.id !== id);
      setTabs(next);
      if (wasActive) {
        // Focus the neighbour to the right, falling back to the left for the last tab.
        const focus = next[Math.min(idx, next.length - 1)];
        setActiveId(focus.id);
        setAddr(focus.url);
      }
    }

    if (wasActive) {
      setReader(false);
      setShieldsOpen(false);
      setMenuOpen(false);
    }
  };
  // Ctrl/Cmd+W closes the active browser tab (like a real browser).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeTab(activeId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, tabs]);
  const travel = (dir: -1 | 1) => {
    const ni = active.hIdx + dir;
    if (ni < 0 || ni >= active.hist.length) return;
    const url = active.hist[ni];
    setTabs((prev) => prev.map((t) => (t.id === active.id ? { ...t, url, title: titleFor(url), hIdx: ni } : t)));
    setAddr(url);
    setReader(false);
  };

  const toggleBookmark = () => {
    if (isBookmarked) {
      setBookmarks((b) => b.filter((x) => x.url !== active.url));
    } else {
      const palette = ['#0a84ff', '#5e5ce6', '#30d158', '#ff9f0a', '#ff453a', '#64d2ff'];
      setBookmarks((b) => [...b, { id: uid('b'), title: active.title, url: active.url, color: palette[b.length % palette.length] }]);
    }
  };

  const simulateDownload = (name: string, url: string, size: string) => {
    const d: DlEntry = { id: uid('d'), name, url, size, done: true };
    setDownloads((p) => [d, ...p].slice(0, 50));
  };

  const privateMode = active.isPrivate;
  const shellBg = privateMode ? '#1a1033' : dark ? '#1e1e22' : '#ffffff';
  const shellFg = privateMode || dark ? '#ffffff' : '#1d1d1f';

  const suggestions = useMemo(() => {
    const q = addr.trim().toLowerCase();
    if (!q || q.startsWith('prism://') || q.startsWith('http')) return [];
    const pool = [
      ...bookmarks.map((b) => ({ kind: 'bookmark', label: b.title, url: b.url })),
      ...history.slice(0, 8).map((h) => ({ kind: 'history', label: h.title, url: h.url })),
    ];
    return pool.filter((p) => p.label.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)).slice(0, 5);
  }, [addr, bookmarks, history]);

  return (
    <div className="flex h-full flex-col" style={{ background: shellBg, color: shellFg }}>
      {/* ---- tab strip (Brave-like, original Prism styling) ---- */}
      <div
        className={cn('flex items-center gap-1 border-b px-2 pt-2', privateMode ? 'border-purple-400/20 bg-[#241645]' : dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/[0.06] bg-[#ececf1]')}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={cn(
                  'flex max-w-48 min-w-28 cursor-pointer items-center gap-1.5 rounded-t-[10px] px-2.5 py-1.5 text-[12.5px]',
                  isActive
                    ? t.isPrivate
                      ? 'bg-[#1a1033] text-white shadow-sm ring-1 ring-purple-400/30'
                      : dark
                        ? 'bg-[#1e1e22] text-white'
                        : 'bg-white text-neutral-900 shadow-sm'
                    : 'opacity-60 hover:opacity-100',
                )}
              >
                {t.isPrivate ? <Ghost className="size-3.5 shrink-0 text-purple-300" /> : <Globe className="size-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <button
                  type="button"
                  aria-label="Close tab"
                  title="Close tab"
                  onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                  onAuxClick={(e) => { if (e.button === 1) { e.stopPropagation(); closeTab(t.id); } }}
                  onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); e.stopPropagation(); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 cursor-pointer rounded-[6px] p-1 hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => openTab()} aria-label="New tab" title="New tab (Ctrl+T)"
          className="cursor-pointer rounded-[8px] p-1.5 opacity-60 hover:bg-black/10 hover:opacity-100">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => openTab('prism://private', true)} aria-label="New private window" title="New private tab"
          className={cn('cursor-pointer rounded-[8px] p-1.5 hover:bg-black/10', privateMode ? 'text-purple-300' : 'opacity-60 hover:opacity-100')}>
          <Ghost className="size-4" />
        </button>
      </div>

      {/* ---- toolbar ---- */}
      <div className={cn('relative flex items-center gap-1.5 border-b px-2.5 py-2', privateMode ? 'border-purple-400/20' : dark ? 'border-white/10' : 'border-black/[0.06]')}>
        <button type="button" disabled={!canBack} onClick={() => travel(-1)} aria-label="Back"
          className="cursor-pointer rounded p-1.5 opacity-70 hover:bg-black/10 disabled:opacity-25">
          <ArrowLeft className="size-4" />
        </button>
        <button type="button" disabled={!canFwd} onClick={() => travel(1)} aria-label="Forward"
          className="cursor-pointer rounded p-1.5 opacity-70 hover:bg-black/10 disabled:opacity-25">
          <ArrowRight className="size-4" />
        </button>
        <button type="button" onClick={() => setReloadKey((k) => k + 1)} aria-label="Reload"
          className="cursor-pointer rounded p-1.5 opacity-70 hover:bg-black/10">
          <RotateCw className="size-4" />
        </button>
        <button type="button" onClick={() => nav(privateMode ? 'prism://private' : 'prism://start')} aria-label="Home"
          className="cursor-pointer rounded p-1.5 opacity-70 hover:bg-black/10">
          <Home className="size-4" />
        </button>

        {/* Shields button with blocked-count badge */}
        <button
          type="button"
          onClick={() => { setShieldsOpen((v) => !v); setMenuOpen(false); }}
          title="Prism Shields — privacy controls for this site"
          className={cn(
            'relative flex cursor-pointer items-center gap-1 rounded-[10px] px-2 py-1.5 text-[12px] font-semibold',
            siteShields.shieldsUp ? 'bg-orange-500/15 text-orange-500' : 'opacity-50 hover:bg-black/10',
          )}
        >
          {siteShields.shieldsUp ? <ShieldCheck className="size-4" /> : <Shield className="size-4" />}
          <span className="hidden sm:inline">Shields</span>
          {blockedTotal > 0 && (
            <span className="rounded-full bg-orange-500 px-1.5 py-px text-[10.5px] font-bold text-white">{blockedTotal}</span>
          )}
        </button>

        {/* omnibox */}
        <form onSubmit={(e) => { e.preventDefault(); nav(addr); }} className="relative min-w-0 flex-1">
          <div className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5',
            privateMode ? 'border-purple-400/30 bg-white/5' : dark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.04]',
          )}>
            {isInternal(active.url) ? <Zap className="size-3.5 shrink-0 text-teal-500" /> : siteShields.httpsUpgrade ? <Lock className="size-3.5 shrink-0 opacity-60" /> : <Globe className="size-3.5 shrink-0 opacity-60" />}
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={privateMode ? 'Search privately with Prism Search' : `Search ${engine} or enter address`}
              className="w-full bg-transparent text-[12.5px] outline-none"
            />
            <button type="button" onClick={toggleBookmark} aria-label="Bookmark this page" title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
              className={cn('cursor-pointer rounded p-0.5', isBookmarked ? 'text-amber-500' : 'opacity-50 hover:opacity-100')}>
              <Star className="size-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className={cn('absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-[12px] border shadow-xl',
              dark || privateMode ? 'border-white/10 bg-[#26262c] text-white' : 'border-black/10 bg-white text-neutral-800')}>
              {suggestions.map((s) => (
                <button key={s.url + s.label} type="button" onClick={() => nav(s.url)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-[#0a84ff]/10">
                  {s.kind === 'bookmark' ? <Star className="size-3.5 text-amber-500" /> : <History className="size-3.5 opacity-50" />}
                  <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                  <span className="max-w-40 truncate opacity-50">{s.url}</span>
                </button>
              ))}
              <button type="button" onClick={() => nav(addr)}
                className="flex w-full cursor-pointer items-center gap-2 border-t px-3 py-2 text-left text-[12.5px] font-medium hover:bg-[#0a84ff]/10"
                style={{ borderColor: 'rgba(127,127,127,.2)' }}>
                <Search className="size-3.5 opacity-60" /> Search for “{addr.trim()}”
              </button>
            </div>
          )}
        </form>

        {/* Rewards */}
        <button type="button" onClick={() => nav('prism://rewards')} title="Prism Rewards"
          className={cn('cursor-pointer rounded-[10px] p-1.5 hover:bg-black/10', rewards.enabled ? 'text-orange-500' : 'opacity-60')}>
          <Gem className="size-4" />
        </button>
        <button type="button" onClick={() => nav('prism://wallet')} aria-label="Wallet" title="Prism Wallet"
          className="cursor-pointer rounded-[10px] p-1.5 opacity-60 hover:bg-black/10 hover:opacity-100">
          <Wallet className="size-4" />
        </button>
        <button type="button" onClick={() => { setMenuOpen((v) => !v); setShieldsOpen(false); }} aria-label="Menu"
          className="cursor-pointer rounded-[10px] p-1.5 opacity-60 hover:bg-black/10 hover:opacity-100">
          <MoreVertical className="size-4" />
        </button>

        {/* Shields popover */}
        {shieldsOpen && (
          <div className={cn('absolute top-full left-2 z-40 mt-1 w-72 overflow-hidden rounded-[14px] border shadow-2xl',
            dark || privateMode ? 'border-white/10 bg-[#232327] text-white' : 'border-black/10 bg-white text-neutral-800')}>
            <div className="flex items-center justify-between bg-orange-500/10 px-3.5 py-2.5">
              <p className="text-[13px] font-bold">Prism Shields</p>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', siteShields.shieldsUp ? 'bg-orange-500 text-white' : 'bg-black/10')}>
                {siteShields.shieldsUp ? 'UP' : 'DOWN'}
              </span>
            </div>
            <p className="truncate px-3.5 pt-2 text-[12px] opacity-60">{host}</p>
            <div className="grid grid-cols-4 gap-1.5 px-3.5 py-2 text-center">
              {[
                { n: blocked.ads, l: 'Ads' }, { n: blocked.trackers, l: 'Trackers' },
                { n: blocked.https, l: 'HTTPS' }, { n: blocked.fp, l: 'F-print' },
              ].map((s) => (
                <div key={s.l} className={cn('rounded-[10px] border py-1.5', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-black/[0.03]')}>
                  <p className="text-[15px] font-bold text-orange-500">{s.n}</p>
                  <p className="text-[10.5px] opacity-60">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1 px-2 pb-2">
              <ShieldRow label="Shields up for this site" on={siteShields.shieldsUp} onFlip={() => patchSite({ shieldsUp: !siteShields.shieldsUp })} />
              <ShieldRow label="Block ads" on={siteShields.blockAds} onFlip={() => patchSite({ blockAds: !siteShields.blockAds })} icon={<Zap className="size-3.5" />} />
              <ShieldRow label="Block trackers" on={siteShields.blockTrackers} onFlip={() => patchSite({ blockTrackers: !siteShields.blockTrackers })} icon={<EyeOff className="size-3.5" />} />
              <ShieldRow label="Upgrade to HTTPS" on={siteShields.httpsUpgrade} onFlip={() => patchSite({ httpsUpgrade: !siteShields.httpsUpgrade })} icon={<Link2 className="size-3.5" />} />
              <ShieldRow label="Block fingerprinting" on={siteShields.blockFingerprint} onFlip={() => patchSite({ blockFingerprint: !siteShields.blockFingerprint })} icon={<Fingerprint className="size-3.5" />} />
              <button type="button" onClick={() => nav('prism://shields')}
                className="cursor-pointer rounded-[8px] px-2.5 py-1.5 text-left text-[12.5px] font-medium text-[#0a84ff] hover:bg-[#0a84ff]/10">
                What do Shields do?
              </button>
            </div>
          </div>
        )}

        {/* Menu popover */}
        {menuOpen && (
          <div className={cn('absolute top-full right-2 z-40 mt-1 w-60 overflow-hidden rounded-[14px] border p-1.5 shadow-2xl',
            dark || privateMode ? 'border-white/10 bg-[#232327] text-white' : 'border-black/10 bg-white text-neutral-800')}>
            {[
              { l: 'New tab', fn: () => openTab(), k: 'Ctrl+T' },
              { l: 'New private tab', fn: () => openTab('prism://private', true), k: '⇧⌘N' },
              { l: 'History', fn: () => nav('prism://history') },
              { l: 'Downloads', fn: () => nav('prism://downloads') },
              { l: 'Bookmarks', fn: () => nav('prism://bookmarks') },
              { l: 'Prism Rewards', fn: () => nav('prism://rewards') },
              { l: 'Prism Wallet', fn: () => nav('prism://wallet') },
              { l: 'Settings', fn: () => nav('prism://settings') },
            ].map((i) => (
              <button key={i.l} type="button" onClick={i.fn}
                className="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[13px] hover:bg-[#0a84ff] hover:text-white">
                <span>{i.l}</span>{i.k && <span className="text-[11px] opacity-50">{i.k}</span>}
              </button>
            ))}
            <div className="mx-2 my-1 h-px bg-black/10 dark:bg-white/10" />
            <button type="button" onClick={() => simulateDownload('prism-wallpapers.zip', active.url, '18.2 MB')}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] hover:bg-[#0a84ff] hover:text-white">
              <Download className="size-3.5" /> Download demo file
            </button>
          </div>
        )}
      </div>

      {/* ---- bookmark bar ---- */}
      {showBar && (
        <div className={cn('flex items-center gap-1 overflow-x-auto border-b px-2.5 py-1', privateMode ? 'border-purple-400/20' : dark ? 'border-white/10' : 'border-black/[0.06]')}>
          {bookmarks.map((b) => (
            <button key={b.id} type="button" onClick={() => nav(b.url)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-medium opacity-75 hover:bg-black/10 hover:opacity-100">
              <span className="flex size-4 items-center justify-center rounded-[5px] text-[10px] font-bold text-white" style={{ background: b.color }}>
                {b.title[0]?.toUpperCase()}
              </span>
              <span className="max-w-28 truncate">{b.title}</span>
            </button>
          ))}
          <button type="button" onClick={toggleBookmark} className="shrink-0 cursor-pointer rounded px-1.5 py-1 text-[12px] opacity-50 hover:opacity-100">
            {isBookmarked ? '★ Bookmarked' : '+ Bookmark this page'}
          </button>
        </div>
      )}

      {/* ---- page ---- */}
      <div className="min-h-0 flex-1 overflow-y-auto" key={`${active.id}-${active.url}-${reloadKey}`}>
        {renderPage()}
      </div>

      {/* ---- status bar ---- */}
      <div className={cn('flex shrink-0 items-center gap-3 border-t px-3 py-1 text-[11.5px]',
        privateMode ? 'border-purple-400/20 bg-[#241645] text-purple-200' : dark ? 'border-white/10 text-white/50' : 'border-black/[0.06] text-neutral-500')}>
        <span className="flex items-center gap-1">
          {siteShields.shieldsUp ? <ShieldCheck className="size-3 text-orange-500" /> : <Shield className="size-3" />}
          {siteShields.shieldsUp ? `Shields blocked ${blockedTotal} on ${host}` : `Shields down on ${host}`}
        </span>
        <span className="ml-auto hidden sm:inline">
          {stats.ads + stats.trackers} blocked · {stats.savedMB} MB saved · {Math.round(stats.timeSec / 60)} min saved
        </span>
        {privateMode && <span className="flex items-center gap-1 font-semibold"><EyeOff className="size-3" /> Private — history off</span>}
      </div>
    </div>
  );

  /* ============================ page router ============================ */
  function renderPage() {
    const url = active.url;
    if (url === 'prism://start' || url === 'prism://newtab' || url === 'aurora://start') return <NewTab />;
    if (url === 'prism://private') return <PrivateTab />;
    if (url.startsWith('prism://search') || url.startsWith('aurora://search')) return <SearchPage q={queryOf(url)} />;
    if (url === 'prism://history') return <HistoryPage />;
    if (url === 'prism://bookmarks') return <BookmarksPage />;
    if (url === 'prism://downloads') return <DownloadsPage />;
    if (url === 'prism://settings') return <SettingsPage />;
    if (url === 'prism://rewards') return <RewardsPage />;
    if (url === 'prism://wallet') return <WalletPage />;
    if (url === 'prism://shields') return <ShieldsPage />;
    if (url === 'prism://docs' || url === 'aurora://docs') return <DocsPage />;
    if (isInternal(url)) return <BlockedInternal url={url} />;
    return <ExternalPage url={url} />;
  }

  function pageWrap(children: React.ReactNode, narrow = true) {
    return <div className={cn('mx-auto w-full p-5 sm:p-7', narrow ? 'max-w-3xl' : 'max-w-5xl')}>{children}</div>;
  }

  /* ============================ New Tab (Brave-like stats) ============================ */
  function NewTab() {
    const hrs = Math.floor(stats.timeSec / 3600);
    const mins = Math.round((stats.timeSec % 3600) / 60);
    const [q, setQ] = useState('');
    const submitSearch = () => {
      const query = q.trim();
      if (!query) return;
      nav(`prism://search?q=${encodeURIComponent(query)}`);
    };
    return pageWrap(
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex size-13 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] p-3 text-white shadow-xl">
              <ShieldCheck className="size-7" />
            </div>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight">Prism Browser</h2>
            <p className="mt-0.5 text-[13px] opacity-60">Private, fast, and yours. Shields are up by default.</p>
          </div>
          <p className="text-right text-[12.5px] opacity-60">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}<br />
            <span className="text-[20px] font-bold opacity-100" style={{ color: shellFg }}>
              {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>

        {/* search */}
        <form onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
          className={cn('mt-4 flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-sm',
            dark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.03]')}>
          <Search className="size-4 opacity-50" />
          <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${engine} privately`} className="w-full bg-transparent text-[14px] outline-none" autoComplete="off" />
          <kbd className="hidden rounded border px-1.5 py-0.5 text-[10.5px] opacity-50 sm:block">↵</kbd>
        </form>

        {/* Brave-like stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: <Shield className="size-4 text-orange-500" />, big: `${(stats.ads + stats.trackers).toLocaleString()}`, small: 'Trackers & ads blocked' },
            { icon: <Zap className="size-4 text-teal-500" />, big: `${stats.savedMB} MB`, small: 'Bandwidth saved' },
            { icon: <Clock className="size-4 text-violet-500" />, big: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`, small: 'Time saved' },
          ].map((s) => (
            <div key={s.small} className={cn('rounded-[14px] border p-3', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-black/[0.02]')}>
              <div className="flex items-center gap-1.5">{s.icon}<p className="text-[16px] font-bold">{s.big}</p></div>
              <p className="mt-0.5 text-[11.5px] opacity-60">{s.small}</p>
            </div>
          ))}
        </div>

        {/* speed dial */}
        <p className="mt-5 mb-2 text-[12px] font-semibold tracking-wide uppercase opacity-50">Top sites</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ...bookmarks.slice(0, 4),
            { id: 'q-search', title: 'Prism Search', url: 'prism://search?q=prism+shields', color: '#0a84ff' },
            { id: 'q-feed', title: 'Prism Feed', url: 'prism://start', color: '#30d158' },
          ].slice(0, 6).map((q) => (
            <button key={q.id} type="button" onClick={() => nav(q.url)}
              className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border p-3 transition hover:-translate-y-0.5 hover:shadow-lg',
                dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
              <span className="flex size-9 items-center justify-center rounded-[10px] text-[15px] font-bold text-white" style={{ background: (q as BookmarkEntry).color ?? '#0a84ff' }}>
                {(q.title[0] ?? '?').toUpperCase()}
              </span>
              <span className="max-w-full truncate text-[12px] font-medium">{q.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {/* Rewards card */}
          <div className={cn('rounded-[14px] border p-4', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
            <div className="flex items-center gap-2"><Gem className="size-4 text-orange-500" /><p className="text-[13.5px] font-bold">Prism Rewards</p></div>
            <p className="mt-1 text-[12.5px] opacity-60">
              {rewards.enabled ? `On — ${rewards.balance.toFixed(2)} PTK earned from privacy-respecting ads.` : 'Opt in to earn tokens for ads that never track you.'}
            </p>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={() => nav('prism://rewards')}
                className="cursor-pointer rounded-[10px] bg-orange-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-orange-600">
                {rewards.enabled ? 'Open Rewards' : 'Enable Rewards'}
              </button>
              <button type="button" onClick={() => nav('prism://wallet')}
                className="cursor-pointer rounded-[10px] border px-3.5 py-1.5 text-[12.5px] font-medium opacity-70 hover:opacity-100" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
                Wallet
              </button>
            </div>
          </div>
          {/* Feed card */}
          <div className={cn('rounded-[14px] border p-4', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
            <div className="flex items-center gap-2"><Newspaper className="size-4 text-[#0a84ff]" /><p className="text-[13.5px] font-bold">Prism Feed</p></div>
            <div className="mt-2 flex flex-col gap-1.5">
              {FEED.slice(0, 2).map((a) => (
                <button key={a.title} type="button" onClick={() => nav(`prism://search?q=${encodeURIComponent(a.title)}`)}
                  className="cursor-pointer rounded-[10px] p-1.5 text-left text-[12.5px] font-medium hover:bg-black/5 dark:hover:bg-white/10">
                  <span className="mr-1.5 rounded bg-[#0a84ff]/10 px-1.5 py-px text-[10.5px] font-bold text-[#0a84ff]">{a.tag}</span>
                  {a.title}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[11.5px] opacity-40">Prism Browser for MultiOs · Shields model inspired by Brave · 100% original code & assets</p>
      </div>,
      false,
    );
  }

  function PrivateTab() {
    const [pq, setPq] = useState('');
    if (!active.isPrivate) {
      return pageWrap(
        <div className="text-center">
          <Ghost className="mx-auto size-10 opacity-50" />
          <h3 className="mt-2 text-[18px] font-bold">This is the private start page</h3>
          <p className="mt-1 text-[13px] opacity-60">Open it in a private tab to browse without writing history.</p>
          <button type="button" onClick={() => openTab('prism://private', true)}
            className="mt-3 cursor-pointer rounded-[10px] bg-purple-600 px-4 py-2 text-[13px] font-semibold text-white">
            Open private tab
          </button>
        </div>,
      );
    }
    return pageWrap(
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-[16px] bg-purple-600/20 ring-1 ring-purple-400/40">
          <EyeOff className="size-7 text-purple-300" />
        </div>
        <h3 className="mt-3 text-[22px] font-bold">Private window</h3>
        <p className="mx-auto mt-1 max-w-[46ch] text-[13px] opacity-60">
          History, cookies and form data are never written to disk in this tab.
          Shields stay up, and trackers are still blocked.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); const query = pq.trim(); if (query) nav(`prism://search?q=${encodeURIComponent(query)}`); }}
          className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-full border border-purple-400/30 bg-white/5 px-4 py-2.5">
          <Search className="size-4 opacity-50" />
          <input name="q" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search privately" className="w-full bg-transparent text-[14px] outline-none" autoComplete="off" />
        </form>
        <div className="mx-auto mt-4 flex max-w-md items-center justify-between rounded-[12px] border border-white/10 bg-white/5 px-3.5 py-2.5 text-left">
          <div><p className="text-[13px] font-semibold">Route via Prism Tor</p><p className="text-[12px] opacity-60">Hide your IP on this device (demo toggle)</p></div>
          <TorToggle />
        </div>
      </div>,
    );
  }

  function TorToggle() {
    const [on, setOn] = useState(false);
    return (
      <button type="button" onClick={() => setOn((v) => !v)} aria-pressed={on}
        className={cn('relative h-6 w-11 cursor-pointer rounded-full transition', on ? 'bg-purple-500' : 'bg-black/20 dark:bg-white/15')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </button>
    );
  }

  function SearchPage({ q }: { q: string }) {
    const results = useMemo(() => {
      const base = q || 'prism';
      const h = hashStr(base);
      return [0, 1, 2, 3, 4].map((i) => ({
        title: `${base} — ${['official guide', 'privacy review', 'docs & examples', 'community thread', 'release notes'][(h + i) % 5]}`,
        url: `https://${base.replace(/\s+/g, '').toLowerCase().slice(0, 18) || 'example'}.example/${['guide', 'review', 'docs', 't', 'notes'][(h + i) % 5]}`,
        desc: `Private result ${i + 1} for “${base}”. Served by ${engine} with 0 trackers, no profiling, Shields-compatible. This is a local demo index — open any result in the sandboxed viewer.`,
      }));
    }, [q]);
    return pageWrap(
      <div>
        <p className="flex items-center gap-1.5 text-[12px] opacity-60"><ShieldCheck className="size-3.5 text-teal-500" /> {engine} · private results · 0 trackers · ${(hashStr(q) % 40) + 8} ms</p>
        <h3 className="mt-1 text-[20px] font-bold">Results for “{q || '…'}”</h3>
        <div className="mt-3 flex flex-col gap-2">
          {results.map((r) => (
            <div key={r.url} className={cn('rounded-[12px] border p-3.5', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
              <button type="button" onClick={() => nav(r.url)} className="cursor-pointer text-left text-[14.5px] font-semibold text-[#0a84ff] hover:underline">
                {r.title}
              </button>
              <p className="truncate text-[12px] text-teal-600">{r.url}</p>
              <p className="mt-1 text-[13px] opacity-70">{r.desc}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => nav(r.url)} className="cursor-pointer rounded-[8px] bg-[#0a84ff] px-3 py-1 text-[12px] font-semibold text-white">Visit with Shields</button>
                <button type="button" onClick={() => { setBookmarks((b) => [...b, { id: uid('b'), title: r.title, url: r.url, color: '#0a84ff' }]); }}
                  className="cursor-pointer rounded-[8px] border px-3 py-1 text-[12px] font-medium opacity-70 hover:opacity-100" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
                  Bookmark
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  function HistoryPage() {
    const [q, setQ] = useState('');
    const list = history.filter((h) => !q || h.title.toLowerCase().includes(q.toLowerCase()) || h.url.toLowerCase().includes(q.toLowerCase()));
    return pageWrap(
      <div>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[20px] font-bold"><History className="size-5" /> History</h3>
          <button type="button" onClick={() => setHistory([])} className="flex cursor-pointer items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[12.5px] opacity-60 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100">
            <Trash2 className="size-3.5" /> Clear all
          </button>
        </div>
        <label className={cn('mt-3 flex items-center gap-2 rounded-[10px] border px-3 py-2', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/[0.03]')}>
          <Search className="size-3.5 opacity-50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search history" className="w-full bg-transparent text-[13px] outline-none" />
        </label>
        <div className="mt-3 flex flex-col gap-1">
          {list.length === 0 && <p className="py-8 text-center text-[13px] opacity-50">No history yet — or you&apos;ve been browsing privately. Nicely done.</p>}
          {list.map((h) => (
            <div key={h.id} className={cn('group flex items-center gap-2.5 rounded-[10px] border px-3 py-2', dark || privateMode ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.06] bg-white')}>
              <Globe className="size-4 shrink-0 opacity-40" />
              <button type="button" onClick={() => nav(h.url)} className="min-w-0 flex-1 cursor-pointer text-left">
                <span className="block truncate text-[13px] font-medium">{h.title}</span>
                <span className="block truncate text-[12px] opacity-50">{h.url} · {h.time}</span>
              </button>
              <button type="button" aria-label="Remove" onClick={() => setHistory((p) => p.filter((x) => x.id !== h.id))}
                className="cursor-pointer rounded p-1 opacity-0 group-hover:opacity-60 hover:bg-black/10"><X className="size-3.5" /></button>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  function BookmarksPage() {
    return pageWrap(
      <div>
        <h3 className="flex items-center gap-2 text-[20px] font-bold"><Bookmark className="size-5" /> Bookmarks</h3>
        <p className="mt-1 text-[13px] opacity-60">{bookmarks.length} saved · shown on the bookmark bar</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {bookmarks.map((b) => (
            <div key={b.id} className={cn('flex items-center gap-2.5 rounded-[12px] border p-3', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-bold text-white" style={{ background: b.color }}>
                {b.title[0]?.toUpperCase()}
              </span>
              <button type="button" onClick={() => nav(b.url)} className="min-w-0 flex-1 cursor-pointer text-left">
                <span className="block truncate text-[13.5px] font-semibold">{b.title}</span>
                <span className="block truncate text-[12px] opacity-50">{b.url}</span>
              </button>
              <button type="button" aria-label="Delete bookmark" onClick={() => setBookmarks((p) => p.filter((x) => x.id !== b.id))}
                className="cursor-pointer rounded p-1.5 opacity-50 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  function DownloadsPage() {
    return pageWrap(
      <div>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[20px] font-bold"><Download className="size-5" /> Downloads</h3>
          <button type="button" onClick={() => simulateDownload('prism-demo.pdf', active.url, '2.4 MB')}
            className="cursor-pointer rounded-[10px] bg-[#0a84ff] px-3.5 py-1.5 text-[12.5px] font-semibold text-white">
            Simulate download
          </button>
        </div>
        <p className="mt-1 text-[13px] opacity-60">Demo shelf — files are simulated locally, nothing leaves the browser.</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {downloads.length === 0 && <p className="py-8 text-center text-[13px] opacity-50">No downloads yet.</p>}
          {downloads.map((d) => (
            <div key={d.id} className={cn('flex items-center gap-3 rounded-[12px] border p-3', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-teal-500/15 text-teal-600"><Download className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">{d.name}</p>
                <p className="truncate text-[12px] opacity-50">{d.url} · {d.size} · complete</p>
              </div>
              <button type="button" onClick={() => setDownloads((p) => p.filter((x) => x.id !== d.id))}
                className="cursor-pointer rounded p-1.5 opacity-50 hover:bg-black/10 hover:opacity-100"><X className="size-4" /></button>
            </div>
          ))}
        </div>
        {downloads.length > 0 && (
          <button type="button" onClick={() => setDownloads([])} className="mt-2 cursor-pointer text-[12.5px] opacity-60 hover:opacity-100">Clear list</button>
        )}
      </div>,
    );
  }

  function SettingsPage() {
    return pageWrap(
      <div>
        <h3 className="flex items-center gap-2 text-[20px] font-bold"><Settings className="size-5" /> Browser settings</h3>
        <Section title="General">
          <Row label="Show bookmark bar" control={<Toggle on={showBar} onFlip={() => setShowBar((v) => !v)} />} />
          <Row label="Search engine" control={
            <select value={engine} onChange={(e) => setEngine(e.target.value)}
              className={cn('cursor-pointer rounded-[8px] border px-2 py-1 text-[12.5px]', dark || privateMode ? 'border-white/15 bg-[#2a2a30] text-white' : 'border-black/10 bg-white')}
            >
              {['Prism Search', 'Prism Lite', 'Aurora Index'].map((s) => <option key={s}>{s}</option>)}
            </select>
          } />
        </Section>
        <Section title="Shields defaults (new sites)">
          <Row label="Shields up" control={<Toggle on={shieldDefaults.shieldsUp} onFlip={() => setShieldDefaults((s) => ({ ...s, shieldsUp: !s.shieldsUp }))} />} />
          <Row label="Block ads" control={<Toggle on={shieldDefaults.blockAds} onFlip={() => setShieldDefaults((s) => ({ ...s, blockAds: !s.blockAds }))} />} />
          <Row label="Block trackers" control={<Toggle on={shieldDefaults.blockTrackers} onFlip={() => setShieldDefaults((s) => ({ ...s, blockTrackers: !s.blockTrackers }))} />} />
          <Row label="Upgrade to HTTPS" control={<Toggle on={shieldDefaults.httpsUpgrade} onFlip={() => setShieldDefaults((s) => ({ ...s, httpsUpgrade: !s.httpsUpgrade }))} />} />
          <Row label="Block fingerprinting" control={<Toggle on={shieldDefaults.blockFingerprint} onFlip={() => setShieldDefaults((s) => ({ ...s, blockFingerprint: !s.blockFingerprint }))} />} />
          <Row label="Block 3rd-party cookies" control={<Toggle on={shieldDefaults.blockCookies} onFlip={() => setShieldDefaults((s) => ({ ...s, blockCookies: !s.blockCookies }))} />} />
        </Section>
        <Section title="Privacy">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setHistory([])} className="cursor-pointer rounded-[10px] border px-3 py-1.5 text-[12.5px] font-medium hover:bg-black/5" style={{ borderColor: 'rgba(127,127,127,.3)' }}>Clear history</button>
            <button type="button" onClick={() => setDownloads([])} className="cursor-pointer rounded-[10px] border px-3 py-1.5 text-[12.5px] font-medium hover:bg-black/5" style={{ borderColor: 'rgba(127,127,127,.3)' }}>Clear downloads</button>
            <button type="button" onClick={() => { setStats(SEED_STATS); }} className="cursor-pointer rounded-[10px] border px-3 py-1.5 text-[12.5px] font-medium hover:bg-black/5" style={{ borderColor: 'rgba(127,127,127,.3)' }}>Reset stats</button>
            <button type="button" onClick={() => setHostOverrides({})} className="cursor-pointer rounded-[10px] border px-3 py-1.5 text-[12.5px] font-medium hover:bg-black/5" style={{ borderColor: 'rgba(127,127,127,.3)' }}>Reset per-site Shields</button>
          </div>
        </Section>
        <Section title="Rewards & Wallet">
          <Row label="Prism Rewards" control={<Toggle on={rewards.enabled} onFlip={() => setRewards((r) => ({ ...r, enabled: !r.enabled }))} />} />
          <p className="mt-1 text-[12.5px] opacity-60">Wallet is a local demo — no keys, no network, no real funds.</p>
        </Section>
        <Section title="About">
          <p className="text-[13px] leading-relaxed opacity-70">
            Prism Browser 0.1.0 for MultiOs “Prism”. Original implementation; privacy model inspired by Brave (Shields,
            private windows, rewards, wallet) with no Brave code or trademarks. External pages render in a sandboxed
            frame with a simulated block report.
          </p>
        </Section>
      </div>,
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className={cn('mt-4 rounded-[14px] border p-4', dark || privateMode ? 'border-white/10 bg-white/[0.03]' : 'border-black/[0.06] bg-black/[0.02]')}>
        <p className="mb-2 text-[12px] font-bold tracking-wide uppercase opacity-50">{title}</p>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    );
  }
  function Row({ label, control }: { label: string; control: React.ReactNode }) {
    return <div className="flex items-center justify-between gap-3 text-[13.5px] font-medium">{label}{control}</div>;
  }
  function Toggle({ on, onFlip }: { on: boolean; onFlip: () => void }) {
    return (
      <button type="button" onClick={onFlip} aria-pressed={on}
        className={cn('relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition', on ? 'bg-orange-500' : 'bg-black/20 dark:bg-white/15')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </button>
    );
  }

  function RewardsPage() {
    return pageWrap(
      <div>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ff9f0a] to-[#ff375f] text-white"><Gem className="size-5" /></span>
          <div>
            <h3 className="text-[20px] font-bold">Prism Rewards</h3>
            <p className="text-[12.5px] opacity-60">Earn for ads that respect you. Original demo — no real currency.</p>
          </div>
          <span className={cn('ml-auto rounded-full px-2.5 py-1 text-[12px] font-bold', rewards.enabled ? 'bg-teal-500/15 text-teal-600' : 'bg-black/10 opacity-60')}>
            {rewards.enabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className={cn('mt-4 rounded-[16px] border p-5 text-center', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-gradient-to-b from-orange-50 to-white')}>
          <p className="text-[12px] font-semibold tracking-wide uppercase opacity-50">Estimated balance</p>
          <p className="mt-1 text-[36px] font-bold">{rewards.balance.toFixed(2)} <span className="text-[15px] opacity-60">PTK</span></p>
          <p className="text-[12.5px] opacity-60">{rewards.adsSeen} privacy-respecting ads seen this month</p>
          <div className="mt-3 flex justify-center gap-2">
            {!rewards.enabled ? (
              <button type="button" onClick={() => setRewards((r) => ({ ...r, enabled: true }))}
                className="cursor-pointer rounded-[10px] bg-orange-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-orange-600">
                Enable Rewards
              </button>
            ) : (
              <>
                <button type="button"
                  onClick={() => setRewards((r) => ({ ...r, balance: Math.round((r.balance + 0.05) * 100) / 100, adsSeen: r.adsSeen + 1 }))}
                  className="cursor-pointer rounded-[10px] bg-orange-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-600">
                  View demo ad (+0.05)
                </button>
                <button type="button" onClick={() => setRewards((r) => ({ ...r, enabled: false }))}
                  className="cursor-pointer rounded-[10px] border px-4 py-2 text-[13px] font-medium opacity-70 hover:opacity-100" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
                  Turn off
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 rounded-[14px] border border-black/[0.06] p-4 text-[13px] leading-relaxed opacity-70 dark:border-white/10">
          How it differs from surveillance ads: Rewards ads are matched on-device, never uploaded. Turn Shields down
          and you&apos;ll see the difference — this demo keeps Shields up everywhere.
        </div>
      </div>,
    );
  }

  function WalletPage() {
    const [sent, setSent] = useState(false);
    return pageWrap(
      <div>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#0a84ff]/15 text-[#0a84ff]"><Wallet className="size-5" /></span>
          <div>
            <h3 className="text-[20px] font-bold">Prism Wallet</h3>
            <p className="text-[12.5px] opacity-60">Local demo — sample accounts, no network, no real assets.</p>
          </div>
        </div>
        {[
          { n: 'Everyday', a: 'prism:7f3a…9c2e', b: '12.40 PTK', c: '#0a84ff' },
          { n: 'Savings', a: 'prism:b81d…44af', b: '108.05 PTK', c: '#30d158' },
        ].map((w) => (
          <div key={w.a} className={cn('mt-2.5 flex items-center gap-3 rounded-[14px] border p-3.5', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
            <span className="flex size-9 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: w.c }}>{w.n[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold">{w.n}</p>
              <p className="truncate font-mono text-[12px] opacity-50">{w.a}</p>
            </div>
            <p className="text-[14px] font-bold">{w.b}</p>
          </div>
        ))}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => { setSent(true); window.setTimeout(() => setSent(false), 2200); }}
            className="flex-1 cursor-pointer rounded-[10px] bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white">
            Send 1.00 PTK (demo)
          </button>
          <button type="button" onClick={() => simulateDownload('prism-wallet-backup.txt', 'prism://wallet', '1 KB')}
            className="cursor-pointer rounded-[10px] border px-4 py-2 text-[13px] font-medium opacity-70 hover:opacity-100" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
            Back up
          </button>
        </div>
        {sent && <p className="mt-2 rounded-[10px] bg-teal-500/10 px-3 py-2 text-center text-[12.5px] font-medium text-teal-600">Demo transfer complete — nothing left the browser.</p>}
        <p className="mt-3 rounded-[10px] bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-600">
          Never share a recovery phrase with any site. This demo has no real phrase — a real wallet would show one here exactly once.
        </p>
      </div>,
    );
  }

  function ShieldsPage() {
    return pageWrap(
      <div>
        <h3 className="flex items-center gap-2 text-[20px] font-bold"><ShieldCheck className="size-5 text-orange-500" /> About Prism Shields</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed opacity-70">
          Shields are the Brave-inspired privacy layer of Prism Browser: block the trackers, keep the page working.
          Everything below is computed locally in this demo — per-site toggles live in the Shields panel in the toolbar.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            { t: 'Ads', d: 'Removes ad slots and ad-network requests before they load. Pages get lighter and faster.' },
            { t: 'Trackers', d: 'Strips known cross-site trackers and bounce trackers. Counts appear on the Shields badge.' },
            { t: 'HTTPS upgrades', d: 'Rewrites http:// to https:// where the host supports it.' },
            { t: 'Fingerprinting', d: 'Randomizes or blocks canvas, audio, font and hardware signals used to identify you.' },
            { t: 'Cookies', d: 'Optional 3rd-party cookie blocking. Off by default so logins keep working.' },
          ].map((x) => (
            <div key={x.t} className={cn('rounded-[12px] border p-3.5', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-white shadow-sm')}>
              <p className="text-[13.5px] font-bold">{x.t}</p>
              <p className="mt-0.5 text-[13px] opacity-70">{x.d}</p>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => nav('prism://start')}
          className="mt-3 cursor-pointer rounded-[10px] bg-orange-500 px-4 py-2 text-[13px] font-semibold text-white">
          Back to New Tab
        </button>
      </div>,
    );
  }

  function DocsPage() {
    return pageWrap(
      <article className="text-[13.5px] leading-relaxed opacity-90">
        <h3 className="text-[20px] font-bold" style={{ color: shellFg }}>Aurora OS — User Guide</h3>
        <p className="mt-2 opacity-70">This desktop is a fully client-side simulation of an operating system. Windows can be dragged, resized, tiled, minimized, and maximized.</p>
        <p className="mt-2 rounded-[10px] bg-orange-500/10 px-3 py-2 text-[12.5px] font-medium text-orange-600">
          Browsing with Prism: Shields up by default · <button type="button" className="cursor-pointer underline" onClick={() => openTab('prism://private', true)}>try a private tab</button> · Rewards live at prism://rewards
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {[
            'Drag a title bar to move. Drag to screen edges to tile left / right, or to the top to maximize.',
            'Shields panel (toolbar): toggle ads / trackers / HTTPS / fingerprinting per site.',
            'Omnibox: type a URL, or plain words to search with Prism Search.',
            'Use ⌘K / Ctrl+K for Spotlight to launch any app instantly.',
            'Open Control Center (top-right) for Wi-Fi, dark mode, brightness and volume.',
            'Terminal understands ls, cd, open <app>, neofetch and more.',
            'Notes persist to localStorage. Settings persist wallpaper + theme.',
          ].map((t) => (
            <li key={t} className={cn('rounded-[10px] border p-2.5', dark || privateMode ? 'border-white/10 bg-white/5' : 'border-black/[0.06] bg-black/[0.02]')}>{t}</li>
          ))}
        </ul>
      </article>,
    );
  }

  function BlockedInternal({ url }: { url: string }) {
    return pageWrap(
      <div className="py-10 text-center opacity-70">
        <Globe className="mx-auto size-10" strokeWidth={1.2} />
        <p className="mt-2 text-[14px] font-semibold" style={{ color: shellFg }}>Unknown internal page</p>
        <p className="mx-auto mt-1 max-w-[44ch] text-[12.5px]"><code className="rounded bg-black/10 px-1">{url}</code> isn&apos;t a known prism:// page yet.</p>
        <button type="button" onClick={() => nav('prism://start')} className="mt-3 cursor-pointer rounded-[10px] bg-[#0a84ff] px-4 py-2 text-[13px] font-medium text-white">Back to start</button>
      </div>,
    );
  }

  /* ============================ External (sandboxed + Shields banner + Reader) ============================ */
  function ExternalPage({ url }: { url: string }) {
    const h = hostOf(url);
    const c = countsFor(h, siteShields);
    const total = c.ads + c.trackers + c.fp + c.cookies;
    if (reader) {
      return pageWrap(
        <article>
          <p className="text-[12px] opacity-50">Reader view · {h} · trackers stripped</p>
          <h3 className="mt-1 text-[22px] font-bold">{titleFor(url)}</h3>
          <p className="mt-1 text-[12.5px] opacity-50">{url}</p>
          <div className="mt-3 flex flex-col gap-3 text-[14px] leading-relaxed opacity-80">
            <p>This is Prism Reader: the page text without its trackers, pop-ups, or auto-play. The live site stays loaded below in a sandboxed frame — Reader is just the calm version.</p>
            <p>Shields blocked {total} items here ({c.ads} ads, {c.trackers} trackers{c.fp ? `, ${c.fp} fingerprint attempts` : ''}). In the full MultiOs build with a real netstack, this filtering would happen before bytes render.</p>
            <p>Tip: toggle the bookmark star to keep this page on your bookmark bar.</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setReader(false)} className="cursor-pointer rounded-[10px] bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white">Back to live page</button>
            <button type="button" onClick={() => window.open(url, '_blank', 'noopener')} className="cursor-pointer rounded-[10px] border px-4 py-2 text-[13px] font-medium opacity-70 hover:opacity-100" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
              Open externally
            </button>
          </div>
        </article>,
      );
    }
    return (
      <div className="flex h-full min-h-[420px] flex-col">
        <div className={cn('flex flex-wrap items-center gap-2 border-b px-4 py-2 text-[12.5px]',
          dark || privateMode ? 'border-white/10 bg-orange-500/10' : 'border-black/[0.06] bg-orange-50')}>
          <ShieldCheck className="size-4 shrink-0 text-orange-500" />
          <p>
            <span className="font-bold">Shields blocked {total}</span>
            <span className="opacity-70"> — {c.ads} ads · {c.trackers} trackers · {c.https} HTTPS upgrades{c.fp ? ` · ${c.fp} fingerprint` : ''} on {h}</span>
          </p>
          <span className="ml-auto flex gap-1.5">
            <button type="button" onClick={() => setReader(true)} className="cursor-pointer rounded-[8px] border px-2.5 py-1 font-medium hover:bg-black/5" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
              Reader view
            </button>
            <button type="button" onClick={() => window.open(url, '_blank', 'noopener')} title="Open in system browser"
              className="flex cursor-pointer items-center gap-1 rounded-[8px] border px-2.5 py-1 font-medium hover:bg-black/5" style={{ borderColor: 'rgba(127,127,127,.3)' }}>
              <ExternalLink className="size-3" /> Open
            </button>
          </span>
        </div>
        <iframe
          key={url + reloadKey}
          title={url}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="min-h-[480px] w-full flex-1 bg-white"
        />
        <p className="px-4 py-1.5 text-[11.5px] opacity-40">
          Sandboxed frame · some sites refuse framing (X-Frame-Options) and will appear blank — use Open to view them outside. Counters are deterministic demo values for {h}.
        </p>
      </div>
    );
  }
}

function ShieldRow({ label, on, onFlip, icon }: { label: string; on: boolean; onFlip: () => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-black/5 dark:hover:bg-white/5">
      <span className="flex items-center gap-1.5">{icon}{label}</span>
      <button type="button" onClick={onFlip} aria-pressed={on}
        className={cn('relative h-5.5 w-10 shrink-0 cursor-pointer rounded-full transition', on ? 'bg-orange-500' : 'bg-black/20 dark:bg-white/15')}
        style={{ height: 22, width: 40 }}
      >
        <span className={cn('absolute top-[3px] size-[16px] rounded-full bg-white shadow transition-all', on ? 'left-[21px]' : 'left-[3px]')} />
      </button>
    </div>
  );
}
