import { CopyButton } from './CopyButton';

// Shared look for the member and admin pages.

export const PAGE_CSS = `
body { background-color: #08080a !important; }
.inv-bg { background:
  radial-gradient(900px 420px at 50% -120px, rgba(255,215,0,0.10), transparent 70%),
  radial-gradient(600px 300px at 100% 0%, rgba(120,90,255,0.07), transparent 70%),
  #08080a; }
.inv-card { background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.07); }
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
details[open] .inv-chevron { transform: rotate(90deg); }
`;

const AVATAR_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#eab308'];

export function Initial({ name, size = 36, id }: { name: string; size?: number; id?: string | null }) {
  if (id) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/invoice/avatar/${id}`}
        alt={name}
        loading="lazy"
        className="shrink-0 rounded-full bg-white/5 object-cover ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
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

export function AccountBox({ bank, account, holder }: { bank?: string; account?: string; holder?: string }) {
  if (!account) {
    return <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-text-secondary">Rekening belum diisi, tanya langsung ke orangnya.</p>;
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/5">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-text-secondary">{bank || 'Rekening'} · a/n {holder || '-'}</p>
        <p className="select-all font-mono text-base font-bold tracking-wide">{account}</p>
      </div>
      <CopyButton value={account} />
    </div>
  );
}
