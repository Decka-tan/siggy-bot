import { CopyButton } from './CopyButton';
import { formatCurrency } from './lib/data';

// Shared look for the member and admin pages.

export const PAGE_CSS = `
body { background-color: #07070a !important; }
.inv-bg { background:
  radial-gradient(1100px 520px at 15% -160px, rgba(255,215,0,0.13), transparent 70%),
  radial-gradient(800px 420px at 95% -60px, rgba(139,92,246,0.14), transparent 70%),
  radial-gradient(700px 500px at 50% 110%, rgba(16,185,129,0.06), transparent 70%),
  #07070a; }
.inv-card { background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018)); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(8px); }
.inv-hero { background:
  radial-gradient(500px 260px at 85% 20%, rgba(255,215,0,0.22), transparent 70%),
  radial-gradient(420px 260px at 0% 100%, rgba(139,92,246,0.25), transparent 70%),
  linear-gradient(135deg, #15131c, #0d0d12); border: 1px solid rgba(255,215,0,0.18); }
.inv-grain { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.05'/></svg>"); }
.inv-rise { animation: invRise .5s cubic-bezier(.2,.8,.2,1) both; }
.inv-rise-2 { animation-delay: .06s } .inv-rise-3 { animation-delay: .12s } .inv-rise-4 { animation-delay: .18s }
@keyframes invRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.inv-float { animation: invFloat 5s ease-in-out infinite; }
@keyframes invFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
details[open] .inv-chevron { transform: rotate(90deg); }
@media (prefers-reduced-motion: reduce) { .inv-rise, .inv-float { animation: none } }
`;

const AVATAR_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#eab308'];

function colorOf(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Initial({ name, size = 36, id }: { name: string; size?: number; id?: string | null }) {
  if (id) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/invoice/avatar/${id}`}
        alt={name}
        loading="lazy"
        className="shrink-0 rounded-full bg-white/5 object-cover ring-2 ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }
  const color = colorOf(name);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `${color}26`, color, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  );
}

export function Siggy({ mood = 'default', size = 40 }: { mood?: 'default' | 'happy' | 'sad' | 'shy' | 'shock'; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/siggy-girl-${mood}.png`}
      alt="Siggy"
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-white object-cover ring-2 ring-accent/60"
      style={{ width: size, height: size }}
    />
  );
}

export function Chevron() {
  return (
    <svg className="inv-chevron h-4 w-4 shrink-0 text-text-secondary transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1">
      <h2 className="text-sm font-bold tracking-tight text-text-primary">{children}</h2>
      {aside && <span className="text-xs text-text-secondary">{aside}</span>}
    </div>
  );
}

export function StatTile({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'amber' | 'emerald' | 'violet' }) {
  const color = { default: 'text-text-primary', amber: 'text-amber-400', emerald: 'text-emerald-400', violet: 'text-violet-300' }[tone];
  return (
    <div className="inv-card rounded-2xl p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
      <p className={`mt-1.5 text-lg font-bold tracking-tight sm:text-xl ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

// Plain CSS bars; no chart library on a 2GB box.
export function MonthBars({ months }: { months: { key: string; label: string; amount: number; count: number }[] }) {
  const max = Math.max(...months.map(m => m.amount), 1);
  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {months.map((m, i) => {
        const last = i === months.length - 1;
        return (
          <div key={m.key} className="group flex flex-1 flex-col items-center gap-1.5" title={`${m.label}: ${formatCurrency(m.amount)} · ${m.count} tagihan`}>
            <span className={`text-[10px] font-mono ${last ? 'text-accent' : 'text-text-secondary'}`}>{Math.round(m.amount / 1000)}rb</span>
            {/* Fixed-height track so the bar's % is of the track, not of the labels too. */}
            <div className="relative h-28 w-full">
              <div
                className={`absolute inset-x-0 bottom-0 rounded-t-lg transition-all ${last ? 'bg-gradient-to-t from-amber-500 to-accent shadow-[0_0_20px_rgba(255,215,0,0.35)]' : 'bg-gradient-to-t from-white/10 to-white/30 group-hover:from-white/20 group-hover:to-white/45'}`}
                style={{ height: `${Math.max(4, (m.amount / max) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] capitalize text-text-secondary">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const BANK_STYLE: Record<string, string> = {
  bca: 'from-[#0b3b8c] via-[#0e4fb8] to-[#1d6fe0]',
  mandiri: 'from-[#0a2d5e] via-[#123f7a] to-[#f2a900]',
  bni: 'from-[#0b5560] via-[#0e7480] to-[#f37021]',
  bri: 'from-[#00305f] via-[#00529c] to-[#0d79c9]',
  jago: 'from-[#ff8a00] via-[#f9a826] to-[#ffd166]',
};

// The creator's account drawn like a bank card, with a copy button.
export function AccountBox({ bank, account, holder }: { bank?: string; account?: string; holder?: string }) {
  if (!account) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-text-secondary">
        Rekening belum diisi. Tanya langsung ke orangnya ya.
      </div>
    );
  }
  const key = Object.keys(BANK_STYLE).find(k => (bank || '').toLowerCase().includes(k));
  const grad = key ? BANK_STYLE[key] : 'from-[#2a2438] via-[#3a2f55] to-[#5b4a8a]';
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${grad} p-4 text-white shadow-lg shadow-black/40`}>
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-sm font-black italic tracking-wide">{(bank || 'Bank').replace(/^bank\s+/i, '').toUpperCase()}</span>
        <CopyButton value={account} />
      </div>
      <p className="relative mt-4 select-all font-mono text-lg font-bold tracking-[0.15em] sm:text-xl">{account}</p>
      <p className="relative mt-1 text-[11px] uppercase tracking-wider text-white/75">a/n {holder || '-'}</p>
    </div>
  );
}

export function StatusPill({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Lunas</span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">Belum</span>
  );
}
