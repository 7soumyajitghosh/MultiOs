import { useCallback, useRef, useState } from 'react';
import type { AppId, WindowState } from '../os/types';

const APP_TITLES: Record<AppId, string> = {
  finder: 'Finder',
  terminal: 'Terminal',
  notes: 'Notes',
  calculator: 'Calculator',
  browser: 'Aurora Browser',
  projects: 'Aurora — Workspace',
  activity: 'Activity Monitor',
  settings: 'Settings',
  about: 'About This Mac',
};

function cascadeOffset(count: number) {
  return (count % 8) * 28;
}

function defaultSize(appId: AppId, vw: number, vh: number) {
  const small = vw < 640;
  if (small) return { w: vw, h: vh - 88, x: 0, y: 0 };
  switch (appId) {
    case 'terminal':
      return { w: 620, h: 420, x: 0, y: 0 };
    case 'calculator':
      return { w: 320, h: 480, x: 0, y: 0 };
    case 'notes':
      return { w: 760, h: 520, x: 0, y: 0 };
    case 'activity':
      return { w: 940, h: 600, x: 0, y: 0 };
    case 'browser':
      return { w: 900, h: 600, x: 0, y: 0 };
    case 'finder':
      return { w: 840, h: 540, x: 0, y: 0 };
    case 'settings':
      return { w: 780, h: 560, x: 0, y: 0 };
    case 'about':
      return { w: 560, h: 420, x: 0, y: 0 };
    default:
      return { w: Math.min(1020, vw - 80), h: Math.min(660, vh - 140), x: 0, y: 0 };
  }
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zRef = useRef(10);
  const idRef = useRef(0);

  const openApp = useCallback(
    (appId: AppId) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let opened = false;
      setWindows((prev) => {
        // Single-instance for calculator/settings/about — focus if open
        const single = ['calculator', 'settings', 'about'].includes(appId);
        const existing = prev.find((w) => w.appId === appId);
        if (single && existing) {
          opened = true;
          zRef.current += 1;
          return prev.map((w) =>
            w.id === existing.id ? { ...w, minimized: false, z: zRef.current } : w,
          );
        }
        const d = defaultSize(appId, vw, vh);
        const n = prev.length;
        const off = cascadeOffset(n);
        const w = Math.min(d.w, vw - (vw < 640 ? 0 : 16));
        const h = Math.min(d.h, vh - 120);
        const x = d.x || Math.max(8, (vw - w) / 2 + off - 60);
        const y = d.y || Math.max(48, (vh - h) / 2 - 20 + off - 40);
        zRef.current += 1;
        idRef.current += 1;
        const win: WindowState = {
          id: `w-${Date.now()}-${idRef.current}`,
          appId,
          title: APP_TITLES[appId],
          x: vw < 640 ? 0 : x,
          y: vw < 640 ? 40 : y,
          w,
          h,
          z: zRef.current,
          minimized: false,
          maximized: vw < 640,
          snap: null,
        };
        opened = true;
        return [...prev, win];
      });
      return opened;
    },
    [],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: string) => {
    zRef.current += 1;
    const z = zRef.current;
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        zRef.current += 1;
        if (!w.maximized) {
          return {
            ...w,
            maximized: true,
            snap: null,
            prevBounds: { x: w.x, y: w.y, w: w.w, h: w.h },
            z: zRef.current,
          };
        }
        const p = w.prevBounds;
        return {
          ...w,
          maximized: false,
          ...(p ? { x: p.x, y: p.y, w: p.w, h: p.h } : {}),
          z: zRef.current,
        };
      }),
    );
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y, snap: null } : w)));
  }, []);

  const resizeWindow = useCallback((id: string, w: number, h: number, x?: number, y?: number) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id
          ? {
              ...win,
              w: Math.max(280, w),
              h: Math.max(200, h),
              ...(x !== undefined ? { x } : {}),
              ...(y !== undefined ? { y } : {}),
              maximized: false,
              snap: null,
            }
          : win,
      ),
    );
  }, []);

  const snapWindow = useCallback((id: string, side: 'left' | 'right' | null) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const topBar = 40;
    const dockReserve = 90;
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (!side) {
          const p = w.prevBounds;
          return { ...w, snap: null, ...(p ? { x: p.x, y: p.y, w: p.w, h: p.h } : {}) };
        }
        const prevBounds = w.snap ? w.prevBounds : { x: w.x, y: w.y, w: w.w, h: w.h };
        return {
          ...w,
          snap: side,
          maximized: false,
          minimized: false,
          prevBounds,
          x: side === 'left' ? 0 : vw / 2,
          y: topBar,
          w: vw / 2,
          h: vh - topBar - dockReserve,
        };
      }),
    );
  }, []);

  const closeApp = useCallback((appId: AppId) => {
    setWindows((prev) => prev.filter((w) => w.appId !== appId));
  }, []);

  return {
    windows,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    resizeWindow,
    snapWindow,
    closeApp,
    setWindows,
  };
}

export type WindowManager = ReturnType<typeof useWindowManager>;
