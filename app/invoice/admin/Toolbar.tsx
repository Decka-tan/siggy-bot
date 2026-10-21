'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

type Creator = { value: string; label: string; id: string | null; count: number };

// Filters live in the URL, so marking someone paid (a server action that
// re-renders the same URL) never resets them.
export function Toolbar({ creators, total, shown }: { creators: Creator[]; total: number; shown: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [pending, start] = useTransition();
  const status = params.get('status') || '';
  const creator = params.get('creator') || '';
  const first = useRef(true);

  const push = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) v ? next.set(k, v) : next.delete(k);
    next.delete('limit');
    start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => push({ q: q.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const seg = (value: string, label: string) => (
    <button
      type="button"
      onClick={() => push({ status: value })}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${status === value ? 'bg-accent text-black shadow' : 'text-text-secondary hover:text-text-primary'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="inv-card sticky top-[57px] z-10 space-y-3 rounded-2xl p-3 shadow-xl shadow-black/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10">
          <svg className="h-4 w-4 shrink-0 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari judul invoice atau nama orang…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary/60"
          />
          {pending && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />}
          {q && !pending && (
            <button type="button" onClick={() => setQ('')} className="shrink-0 rounded-md px-1.5 text-xs text-text-secondary hover:bg-white/10 hover:text-text-primary">✕</button>
          )}
        </label>
        <div className="flex shrink-0 rounded-xl bg-black/40 p-1 ring-1 ring-white/10">
          {seg('', 'Semua')}
          {seg('unpaid', 'Belum lunas')}
          {seg('paid', 'Lunas')}
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => push({ creator: '' })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${!creator ? 'bg-white text-black ring-white' : 'text-text-secondary ring-white/10 hover:text-text-primary'}`}
        >
          Semua pembuat
        </button>
        {creators.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => push({ creator: creator === c.value ? '' : c.value })}
            className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-bold ring-1 transition ${creator === c.value ? 'bg-accent/15 text-accent ring-accent/50' : 'text-text-secondary ring-white/10 hover:text-text-primary'}`}
          >
            {c.id ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/invoice/avatar/${c.id}`} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">{c.label[0]?.toUpperCase()}</span>
            )}
            {c.label}
            <span className="text-[10px] opacity-60">{c.count}</span>
          </button>
        ))}
        <span className="ml-auto shrink-0 pl-3 text-xs text-text-secondary">{shown} dari {total}</span>
      </div>
    </div>
  );
}
