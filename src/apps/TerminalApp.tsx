import { useEffect, useRef, useState } from 'react';
import type { AppId } from '../os/types';

const HELP = `Available commands:
  help              show this help
  ls                list current directory
  cd <dir>          change directory (.. to go up)
  pwd               print working directory
  echo <text>       print text
  clear             clear terminal
  whoami            current user
  date              current date
  neofetch          system info
  open <app>        open app (finder, notes, browser, calc…)
  browser           open Prism Browser (private, Shields up)
  theme <dark|light> switch hint
  history           command history
  sudo <cmd>        pretend to be admin`;

const DIRS: Record<string, string[]> = {
  '/': ['Applications', 'Users', 'System'],
  '/Users': ['maya'],
  '/Users/maya': ['Documents', 'Desktop', 'Downloads', 'Pictures'],
  '/Users/maya/Documents': ['Roadmap 2026.md', 'Design tokens.json', 'Q3 review.pdf'],
  '/Users/maya/Desktop': ['Screenshot 2026-10-01.png', 'todo.txt'],
  '/Users/maya/Downloads': ['aurora-wallpapers.zip', 'prism-sdk.dmg'],
  '/Applications': ['Aurora Browser.app', 'Terminal.app', 'Notes.app'],
  '/System': ['Library', 'prismkernel'],
};

function resolve(cwd: string, arg?: string): string | null {
  if (!arg || arg === '.') return cwd;
  if (arg === '..') {
    if (cwd === '/') return '/';
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }
  const cand = cwd === '/' ? `/${arg}` : `${cwd}/${arg}`;
  if (DIRS[cand] || Object.values(DIRS).some((v) => cand.endsWith('/' + v.find((x) => x === arg)!))) return cand;
  // check child exists
  const kids = DIRS[cwd] ?? [];
  if (kids.includes(arg)) {
    // if it's a file, not cd-able
    if (arg.includes('.')) return null;
    return cand;
  }
  return null;
}

export function TerminalApp({ onOpenApp, dark }: { onOpenApp: (a: AppId) => void; dark: boolean }) {
  const [lines, setLines] = useState<string[]>([
    'Aurora Terminal — zsh 5.9 (aurora)',
    'Type `help` to see commands.',
    '',
  ]);
  const [cwd, setCwd] = useState('/Users/maya');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  const print = (s: string | string[]) => setLines((p) => [...p, ...(Array.isArray(s) ? s : [s])]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    print(`maya@aurora ${cwd.replace('/Users/maya', '~') || '/'} % ${cmd}`);
    if (!cmd) return;
    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHIdx(-1);
    const [bin, ...args] = cmd.split(/\s+/);
    switch (bin) {
      case 'help':
        print(HELP.split('\n'));
        break;
      case 'clear':
        setLines([]);
        break;
      case 'pwd':
        print(cwd);
        break;
      case 'whoami':
        print('maya');
        break;
      case 'date':
        print(new Date().toString());
        break;
      case 'echo':
        print(args.join(' '));
        break;
      case 'ls': {
        const kids = DIRS[cwd] ?? [];
        print(kids.length ? kids.join('   ') : '(empty)');
        break;
      }
      case 'cd': {
        const dest = resolve(cwd, args[0]);
        if (dest && DIRS[dest]) setCwd(dest);
        else print(`cd: no such directory: ${args[0] ?? ''}`);
        break;
      }
      case 'history':
        print(history.map((h, i) => `  ${i}  ${h}`));
        break;
      case 'neofetch':
        print([
          "        .-\"\"-.        maya@aurora",
          '       / .--. \\       ─────────────',
          '      | (    ) |      OS: Aurora 0.1.0 Prism x86_64',
          "       \\ '--' /       Kernel: prismkernel",
          "        '-..-'        Shell: zsh 5.9",
          '                     Resolution: 1920x1080',
          '                     WM: Aurora WindowServer',
        ]);
        break;
      case 'open': {
        const m: Record<string, AppId> = {
          finder: 'finder', files: 'finder',
          terminal: 'terminal',
          notes: 'notes', note: 'notes',
          calc: 'calculator', calculator: 'calculator',
          browser: 'browser', web: 'browser', prism: 'browser',
          settings: 'settings', prefs: 'settings',
          projects: 'projects', workspace: 'projects',
          about: 'about',
        };
        const t = m[(args[0] ?? '').toLowerCase()];
        if (t) {
          print(`opening ${t}…`);
          onOpenApp(t);
        } else print(`open: unknown app '${args[0] ?? ''}' — try: finder, terminal, notes, browser, calculator, settings`);
        break;
      }
      case 'browser':
        print('opening Prism Browser — Shields up…');
        onOpenApp('browser');
        break;
      case 'sudo':
        print('[sudo] maya is not in the sudoers file. This incident will be reported. (just kidding — nice try)');
        break;
      case 'theme':
        print('Tip: change appearance from Control Center (top-right) or the Settings app.');
        break;
      default:
        print(`zsh: command not found: ${bin}`);
    }
  };

  return (
    <div
      className="flex h-full flex-col font-mono text-[12.5px] leading-relaxed"
      style={{ background: dark ? '#0b0b0e' : '#1a1b26', color: '#e6e6eb' }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-3 whitespace-pre-wrap">
        {lines.map((l, i) => (
          <p key={i} className={l.startsWith('maya@') ? 'text-[#7ee787]' : l.startsWith('zsh:') || l.startsWith('cd:') ? 'text-[#ff7b72]' : 'text-[#e6e6eb]'}>
            {l || ' '}
          </p>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
            setInput('');
          }}
          className="flex items-center gap-2"
        >
          <span className="shrink-0 text-[#7ee787]">maya@aurora {cwd.replace('/Users/maya', '~') || '/'} %</span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                const n = Math.min(history.length - 1, hIdx + 1);
                if (history[n]) {
                  setHIdx(n);
                  setInput(history[n]);
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const n = hIdx - 1;
                setHIdx(Math.max(-1, n));
                setInput(n >= 0 ? history[n] : '');
              }
            }}
            className="w-full bg-transparent text-[#e6e6eb] caret-[#7ee787] outline-none"
            spellCheck={false}
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}
