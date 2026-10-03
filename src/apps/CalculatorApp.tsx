import { useState } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '../lib/cn';

export function CalculatorApp({ dark }: { dark: boolean }) {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d: string) => {
    if (display === 'Error') {
      setDisplay(d);
      setFresh(false);
      return;
    }
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
    } else {
      if (d === '.' && display.includes('.')) return;
      setDisplay(display === '0' && d !== '.' ? d : display + d);
    }
  };

  const calc = (a: number, b: number, o: string): number => {
    switch (o) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const setOperator = (o: string) => {
    const cur = parseFloat(display);
    if (acc !== null && op && !fresh) {
      const r = calc(acc, cur, op);
      if (!isFinite(r)) {
        setDisplay('Error');
        setAcc(null);
        setOp(null);
        setFresh(true);
        return;
      }
      setAcc(r);
      setDisplay(String(Math.round(r * 1e10) / 1e10));
    } else {
      setAcc(cur);
    }
    setOp(o);
    setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const r = calc(acc, parseFloat(display), op);
    setDisplay(!isFinite(r) ? 'Error' : String(Math.round(r * 1e10) / 1e10));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };
  const negate = () => setDisplay((d) => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : '-' + d));
  const pct = () => setDisplay((d) => String(parseFloat(d) / 100));

  const Btn = ({ label, fn, kind = 'num', span = false }: { label: React.ReactNode; fn: () => void; kind?: 'num' | 'fn' | 'op' | 'eq'; span?: boolean }) => (
    <button
      type="button"
      onClick={fn}
      className={cn(
        'h-14 cursor-pointer rounded-full text-[17px] font-medium transition active:scale-95 active:brightness-125',
        span && 'col-span-2 !rounded-[28px] text-left pl-6',
        kind === 'num' && (dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/[0.06] text-neutral-900 hover:bg-black/[0.09]'),
        kind === 'fn' && (dark ? 'bg-white/25 text-black hover:bg-white/35' : 'bg-black/[0.12] text-neutral-900 hover:bg-black/[0.16]'),
        kind === 'op' && 'bg-[#ff9f0a] text-white hover:bg-[#ffb340]',
        kind === 'eq' && 'bg-[#0071e3] text-white hover:bg-[#0077ed]',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn('flex h-full flex-col p-4', dark ? 'bg-[#1c1c1e] text-white' : 'bg-[#f5f5f7] text-neutral-900')}>
      <p className={cn('px-1 text-right text-[11px] tabular-nums', dark ? 'text-white/40' : 'text-neutral-400')}>
        {acc !== null && op ? `${acc} ${op}` : ' '}
      </p>
      <p className="flex min-h-[64px] items-center justify-end overflow-hidden px-1 text-[44px] font-light tracking-tight tabular-nums">
        {display.length > 9 ? display.slice(0, 9) + '…' : display}
      </p>
      <div className="mt-2 grid flex-1 grid-cols-4 content-end gap-2">
        <Btn label="AC" fn={clear} kind="fn" />
        <Btn label="+/−" fn={negate} kind="fn" />
        <Btn label="%" fn={pct} kind="fn" />
        <Btn label="÷" fn={() => setOperator('÷')} kind="op" />
        <Btn label="7" fn={() => inputDigit('7')} />
        <Btn label="8" fn={() => inputDigit('8')} />
        <Btn label="9" fn={() => inputDigit('9')} />
        <Btn label="×" fn={() => setOperator('×')} kind="op" />
        <Btn label="4" fn={() => inputDigit('4')} />
        <Btn label="5" fn={() => inputDigit('5')} />
        <Btn label="6" fn={() => inputDigit('6')} />
        <Btn label="−" fn={() => setOperator('−')} kind="op" />
        <Btn label="1" fn={() => inputDigit('1')} />
        <Btn label="2" fn={() => inputDigit('2')} />
        <Btn label="3" fn={() => inputDigit('3')} />
        <Btn label="+" fn={() => setOperator('+')} kind="op" />
        <Btn label="0" fn={() => inputDigit('0')} span />
        <Btn label="." fn={() => inputDigit('.')} />
        <Btn label="=" fn={equals} kind="eq" />
        <button type="button" onClick={() => setDisplay((d) => (d.length <= 1 ? '0' : d.slice(0, -1)))} aria-label="Backspace" className={cn('col-span-4 mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] opacity-60 hover:opacity-100', dark ? 'bg-white/5 text-white' : 'bg-black/[0.04] text-neutral-600')}>
          <Delete className="size-4" /> delete
        </button>
      </div>
    </div>
  );
}
