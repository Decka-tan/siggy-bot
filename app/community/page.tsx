'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#FFD700',
  'Zealot': '#ef4444',
  'Ritualist': '#22c55e',
  'Siggy Soulsmith': '#ec4899',
  'Siggy Architect': '#06b6d4',
  'Mage': '#14b8a6',
  'ritty': '#a855f7',
  'bitty': '#3b82f6',
};

type DistRow = { role: string; count: number; percent: number; contributor: boolean };
type Upgrade = { userId: string; username: string; displayName: string; fromRole: string; toRole: string; at: number; avatarUrl?: string; daysToPromo?: number | null };

const color = (r: string) => ROLE_COLOR[r] || '#888';

function relativeTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtDays(d?: number | null) {
  if (d == null) return null;
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  const y = Math.floor(d / 365), mo = Math.floor((d % 365) / 30);
  return mo > 0 ? `${y}y ${mo}mo` : `${y}y`;
}

function RoleBadge({ role }: { role: string }) {
  const c = color(role);
  return <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
    style={{ color: c, borderColor: c, backgroundColor: `${c}20` }}>{role}</span>;
}

/* ── SVG Donut ─────────────────────────────────────── */
function Donut({ rows, sum, centerValue }: { rows: DistRow[]; sum: number; centerValue: number }) {
  const size = 240, stroke = 30, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#161616" strokeWidth={stroke} />
        {rows.map(d => {
          const len = (sum ? d.count / sum : 0) * circ;
          const seg = (
            <motion.circle key={d.role} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={color(d.role)} strokeWidth={stroke} strokeDasharray={`${len} ${circ - len}`}
              initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: -offset }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl">{centerValue.toLocaleString()}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">members</span>
      </div>
    </div>
  );
}

function UpgradeCard({ u }: { u: Upgrade }) {
  const [err, setErr] = useState(false);
  const c = color(u.toRole);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: '#0a0a0a', borderColor: `${c}44` }}>
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#1a1a1a]" style={{ boxShadow: `0 0 0 2px ${c}55` }}>
        <Image src={err ? 'https://cdn.discordapp.com/embed/avatars/0.png' : (u.avatarUrl || `/api/avatar?id=${u.userId}`)}
          alt={u.displayName} fill className="object-cover" onError={() => setErr(true)} unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{u.displayName}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <RoleBadge role={u.fromRole} /><span className="text-[#444] text-xs">→</span><RoleBadge role={u.toRole} />
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className="text-[10px] font-mono" style={{ color: '#555' }}>{relativeTime(u.at)}</span>
        {fmtDays(u.daysToPromo) && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: c, backgroundColor: `${c}15` }}>
            {fmtDays(u.daysToPromo)} climb
          </span>
        )}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = '' }: any) {
  return (
    <div className={`rounded-2xl border p-6 ${className}`} style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a' }}>
      {title && <h2 className="font-display text-xl uppercase tracking-wide">{title}</h2>}
      {subtitle && <p className="text-xs font-mono text-[#555] mb-5">{subtitle}</p>}
      {children}
    </div>
  );
}

export default function CommunityPage() {
  const [data, setData] = useState<{ stats: any; upgrades: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    fetch('/api/community').then(r => r.ok ? r.json() : Promise.reject())
      .then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const dist: DistRow[] = data?.stats?.distribution ?? [];
  const rows = dist.filter(d => d.count > 0).sort((a, b) => b.count - a.count); // biggest first
  const sum = rows.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(1, ...rows.map(d => d.count));
  const total = data?.stats?.totalMembers ?? 0;
  const updatedAt = data?.stats?.updatedAt;

  const upgrades: Upgrade[] = [...(data?.upgrades?.upgrades ?? [])].sort((a, b) => {
    const dayA = Math.floor(a.at / 86400000), dayB = Math.floor(b.at / 86400000);
    if (dayA !== dayB) return dayB - dayA;
    return (a.daysToPromo ?? 1e9) - (b.daysToPromo ?? 1e9);
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-6xl mx-auto px-4 py-20">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-green-500">Updates every hour</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none mb-1">Ritual Analytics</h1>
          <p className="text-[#555] text-sm font-mono">
            Live distribution{updatedAt ? ` · synced ${relativeTime(updatedAt)}` : ''}
          </p>
        </div>

        {/* Nav switch */}
        <div className="inline-flex p-1 rounded-full border mb-8" style={{ borderColor: '#1a1a1a', backgroundColor: '#0a0a0a' }}>
          {(['overview', 'analytics'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-6 py-2 rounded-full text-sm font-mono capitalize transition-all"
              style={{ backgroundColor: view === v ? 'var(--color-accent)' : 'transparent', color: view === v ? '#000' : '#666' }}>
              {v}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-[#555] font-mono">Loading...</p>}
        {error && <p className="text-center text-[#555] font-mono">Stats not available yet. The hourly job may not have run.</p>}

        {data && (
          <div className="space-y-6">
            {/* Total card */}
            <div className="rounded-2xl border p-6 flex items-baseline gap-4" style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a' }}>
              <span className="font-display text-5xl md:text-6xl" style={{ color: 'var(--color-accent)' }}>{total.toLocaleString()}</span>
              <span className="font-mono text-xs uppercase tracking-widest text-[#555]">ranked members · {rows.length} roles</span>
            </div>

            {/* ── OVERVIEW ── */}
            {view === 'overview' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rows.map((d, i) => {
                  const c = color(d.role);
                  return (
                    <motion.div key={d.role}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="rounded-2xl border relative overflow-hidden"
                      style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a' }}>
                      {/* top accent bar */}
                      <div className="h-1 w-full" style={{ backgroundColor: c, boxShadow: `0 0 12px ${c}` }} />
                      <div className="p-6 relative">
                        <div className="absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(circle at 100% 0%, ${c}, transparent 65%)` }} />
                        <div className="relative">
                          {/* header row: role name + % pill */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-mono text-xs uppercase tracking-wider font-semibold" style={{ color: '#ddd' }}>{d.role}</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ color: '#888', backgroundColor: '#161616' }}>{d.percent}%</span>
                          </div>
                          {/* big count */}
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-5xl tracking-tight text-white">{d.count.toLocaleString()}</span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">members</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {view === 'analytics' && (
              <>
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Composition donut */}
                  <Card title="Composition" subtitle="Share by role">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <Donut rows={rows} sum={sum} centerValue={total} />
                      <div className="flex-1 w-full space-y-1.5">
                        {rows.map(d => (
                          <div key={d.role} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color(d.role) }} />
                            <span className="flex-1 truncate text-[#ccc]">{d.role}</span>
                            <span className="font-mono text-xs text-[#555]">{d.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Distribution bars */}
                  <Card title="Distribution" subtitle="Members per role">
                    <div className="space-y-3">
                      {rows.map((d, i) => {
                        const c = color(d.role);
                        return (
                          <div key={d.role}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-[#ccc]">{d.role}</span>
                              <span className="font-mono text-xs"><span style={{ color: c }}>{d.count}</span> <span className="text-[#555]">· {d.percent}%</span></span>
                            </div>
                            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#161616' }}>
                              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(d.count / maxCount) * 100}%` }}
                                transition={{ delay: i * 0.04 + 0.1, duration: 0.6, ease: 'easeOut' }} style={{ backgroundColor: c }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Ranking */}
                <Card title="Ranking" subtitle="Roles by size">
                  <div className="space-y-1">
                    {rows.map((d, i) => {
                      const c = color(d.role);
                      return (
                        <div key={d.role} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#161616' }}>
                          <span className="font-display text-lg w-6 text-center" style={{ color: '#444' }}>{i + 1}</span>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                          <span className="flex-1 text-sm text-[#ccc]">{d.role}</span>
                          <span className="font-mono text-sm text-white">{d.count.toLocaleString()}</span>
                          <span className="font-mono text-xs text-[#555] w-12 text-right">{d.percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}

            {/* Recently Upgraded (always) */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a' }}>
              <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
                <div>
                  <h2 className="font-display text-xl uppercase tracking-wide">Recently Upgraded</h2>
                  <p className="text-xs font-mono text-[#555]">last 14 days</p>
                </div>
                <Link href="/promotion"
                  className="shrink-0 px-4 py-2 rounded-full text-xs font-mono border transition-all hover:opacity-80"
                  style={{ borderColor: '#FFD70055', color: '#FFD700', backgroundColor: '#FFD70010' }}>
                  See June 2026 Promotion →
                </Link>
              </div>
              {upgrades.length === 0 ? (
                <p className="text-[#555] text-sm font-mono">No upgrades in the last 14 days yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[520px] overflow-y-auto pr-1">
                  {upgrades.map(u => <UpgradeCard key={`${u.userId}-${u.at}`} u={u} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
