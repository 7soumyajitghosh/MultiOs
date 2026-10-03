import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { WALLPAPERS } from '../../os/wallpapers';
import type { OSSettings } from '../../os/types';

export function LoginScreen({
  settings,
  onLogin,
}: {
  settings: OSSettings;
  onLogin: () => void;
}) {
  const { time, date } = useClock();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const wp = WALLPAPERS.find((w) => w.id === settings.wallpaperId) ?? WALLPAPERS[0];
  const bg = settings.darkMode && wp.darkCss ? wp.darkCss : wp.css;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    // Any password (or empty) logs in — demo OS. Empty is fastest.
    window.setTimeout(() => {
      setBusy(false);
      onLogin();
    }, 650);
  };

  // shake helper retained for wrong-password fantasy; not triggered since any pw works
  void shake;
  void setShake;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col overflow-hidden select-none" style={{ background: bg }}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {wp.blobs.map((b, i) => (
          <div key={i} className={`absolute rounded-full blur-[110px] ${b.className} ${b.color}`} />
        ))}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[28px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-white">
        <p className="text-[15px] font-medium text-white/80">{date}</p>
        <p className="mt-1 text-[64px] leading-none font-bold tracking-tight tabular-nums drop-shadow-lg sm:text-[84px]">
          {time}
        </p>

        <div className="mt-10 flex flex-col items-center animate-[fade-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
          <span className="flex size-20 items-center justify-center rounded-full bg-white/25 text-[28px] font-semibold backdrop-blur ring-1 ring-white/40 shadow-xl">
            {settings.userName.slice(0, 1).toUpperCase()}
          </span>
          <p className="mt-3 text-[17px] font-semibold">{settings.userName}</p>
          <p className="text-[12.5px] text-white/60">Enter any password to log in</p>

          <form onSubmit={submit} className="mt-4 flex items-center gap-2">
            <div className="flex h-9 w-56 items-center gap-1 rounded-full bg-white/20 pr-1 pl-4 ring-1 ring-white/30 backdrop-blur-xl focus-within:bg-white/25 focus-within:ring-white/50">
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/50"
              />
              <button
                type="submit"
                aria-label="Log in"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/25 text-white transition hover:bg-white/40"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
              </button>
            </div>
          </form>
          <button
            type="button"
            onClick={() => submit()}
            className="mt-3 cursor-pointer rounded-full px-4 py-1.5 text-[12.5px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {busy ? 'Welcome…' : 'Press Enter — no password needed'}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-6 pb-8 text-[12px] text-white/50">
        <span>Sleep</span>
        <span>Restart</span>
        <span>Shut Down</span>
      </div>
    </div>
  );
}
