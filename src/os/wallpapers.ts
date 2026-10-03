export interface Wallpaper {
  id: string;
  name: string;
  /** css background */
  css: string;
  darkCss?: string;
  blobs: { className: string; color: string }[];
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'aurora',
    name: 'Aurora Dawn',
    css: 'linear-gradient(160deg,#f2f4f9 0%,#dbe6f6 35%,#cfd9f2 60%,#e8ddf0 100%)',
    darkCss: 'linear-gradient(160deg,#0b1226 0%,#16244d 40%,#2b1f4d 70%,#0e152e 100%)',
    blobs: [
      { className: '-top-32 -left-24 size-[480px]', color: 'bg-[#5b9cf6]/40' },
      { className: 'top-1/3 -right-32 size-[520px]', color: 'bg-[#a47df0]/35' },
      { className: '-bottom-40 left-1/4 size-[460px]', color: 'bg-[#f6a88f]/30' },
    ],
  },
  {
    id: 'sequoia',
    name: 'Sequoia',
    css: 'linear-gradient(165deg,#d7e8d5 0%,#a9cdb4 35%,#6fa287 65%,#dfe9d8 100%)',
    darkCss: 'linear-gradient(165deg,#07130e 0%,#0e2b1f 45%,#123a2a 70%,#060d0a 100%)',
    blobs: [
      { className: '-top-24 left-1/4 size-[500px]', color: 'bg-[#7fe0a8]/35' },
      { className: 'bottom-0 -right-24 size-[460px]', color: 'bg-[#2f7d5b]/30' },
      { className: 'top-1/2 -left-32 size-[420px]', color: 'bg-[#e8f5c8]/30' },
    ],
  },
  {
    id: 'desert',
    name: 'Desert Dusk',
    css: 'linear-gradient(160deg,#fdf0e3 0%,#f7cfa8 35%,#e89b7a 65%,#c96f5e 100%)',
    darkCss: 'linear-gradient(160deg,#1c0f0a 0%,#4d2113 45%,#7a3a1e 70%,#140907 100%)',
    blobs: [
      { className: '-top-20 right-1/4 size-[520px]', color: 'bg-[#ffb35c]/40' },
      { className: '-bottom-32 -left-20 size-[480px]', color: 'bg-[#ff6b4a]/30' },
      { className: 'top-1/3 left-1/3 size-[380px]', color: 'bg-[#ffe9a8]/35' },
    ],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    css: 'linear-gradient(160deg,#dfe6f5 0%,#a9bce0 40%,#6d84c4 70%,#d7d2ee 100%)',
    darkCss: 'linear-gradient(160deg,#04060f 0%,#0d1734 40%,#1c2a5e 70%,#05070f 100%)',
    blobs: [
      { className: 'top-10 left-10 size-[460px]', color: 'bg-[#4d7fff]/35' },
      { className: 'bottom-0 right-0 size-[520px]', color: 'bg-[#9d6bff]/30' },
      { className: 'top-1/2 left-1/2 size-[380px]', color: 'bg-[#5ce1ff]/25' },
    ],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    css: 'linear-gradient(160deg,#f4f4f6 0%,#d9d9de 45%,#b9bcc6 75%,#ececf0 100%)',
    darkCss: 'linear-gradient(160deg,#0a0a0c 0%,#1a1a1f 50%,#2a2a32 75%,#050507 100%)',
    blobs: [
      { className: '-top-24 left-1/3 size-[480px]', color: 'bg-[#ffffff]/40' },
      { className: '-bottom-24 right-1/4 size-[440px]', color: 'bg-[#8a8f9e]/30' },
      { className: 'top-1/3 -left-20 size-[400px]', color: 'bg-[#c9ccd6]/35' },
    ],
  },
];
