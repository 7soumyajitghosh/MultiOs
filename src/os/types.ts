export type AppId =
  | 'finder'
  | 'terminal'
  | 'notes'
  | 'calculator'
  | 'browser'
  | 'projects'
  | 'settings'
  | 'about';

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** snapped halves */
  snap?: 'left' | 'right' | null;
  prevBounds?: { x: number; y: number; w: number; h: number };
}

export interface OSSettings {
  wallpaperId: string;
  darkMode: boolean;
  accent: string;
  userName: string;
  showDesktopIcons: boolean;
  clockSeconds: boolean;
  brightness: number; // 0.5 - 1
  volume: number; // 0-100
  wifi: boolean;
  bluetooth: boolean;
}

export const DEFAULT_SETTINGS: OSSettings = {
  wallpaperId: 'aurora',
  darkMode: false,
  accent: '#0071e3',
  userName: 'Maya',
  showDesktopIcons: true,
  clockSeconds: false,
  brightness: 1,
  volume: 65,
  wifi: true,
  bluetooth: true,
};

const KEY = 'aurora-os-settings-v1';

export function loadSettings(): OSSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: OSSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
