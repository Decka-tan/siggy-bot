'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#c58d04',
  'Zealot': '#9e6bff',
  'Ritualist': '#34d399',
  'Mage': '#b059bc',
  'ritty': '#826bc2',
  'bitty': '#3498db',
};

const REGION_COLOR: Record<string, string> = {
  'Komunitas Indonesia': '#ef4444', 'Viet Community': '#eab308', 'Chinese Community': '#f97316',
  'Korean Community': '#3b82f6', 'Japanese Community': '#ec4899', 'Thai Community': '#14b8a6',
  'Indian Community': '#f59e0b', 'Arabic Comunity': '#22c55e', 'Russian Community': '#06b6d4',
  'Ukraine Community': '#0ea5e9', 'Türkiye Topluluğu': '#dc2626', 'Naija Community': '#16a34a',
  'Filipinas': '#a855f7', 'português': '#84cc16',
};
const regionColor = (r: string) => REGION_COLOR[r] || '#888';
const REGION_LABEL: Record<string, string> = {
  'Komunitas Indonesia': '🇮🇩 Indonesia', 'Viet Community': '🇻🇳 Vietnam', 'Chinese Community': '🇨🇳 China',
  'Korean Community': '🇰🇷 Korea', 'Japanese Community': '🇯🇵 Japan', 'Thai Community': '🇹🇭 Thailand',
  'Indian Community': '🇮🇳 India', 'Arabic Comunity': '🌙 Arabic', 'Russian Community': '🇷🇺 Russia',
  'Ukraine Community': '🇺🇦 Ukraine', 'Türkiye Topluluğu': '🇹🇷 Türkiye', 'Naija Community': '🇳🇬 Nigeria',
  'Filipinas': '🇵🇭 Philippines', 'português': '🇵🇹 Portuguese',
};

type DistRow = { role: string; count: number; percent: number; contributor: boolean };
type Upgrade = { userId: string; username: string; displayName: string; fromRole: string; toRole: string; at: number; avatarUrl?: string; daysToPromo?: number | null };
type GrowthPt = { month: string; count: number; cumulative: number };
type RegionRow = { region: string; count: number };

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

/* ── Vertical bar chart with gridlines ─────────────── */
function VBars({ rows, max }: { rows: DistRow[]; max: number }) {
  // round max up to a nice gridline value
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2 || 1;
  const top = Math.ceil(max / step) * step;
  const lines = 5;
  const gridVals = Array.from({ length: lines + 1 }, (_, i) => Math.round((top / lines) * (lines - i)));
  return (
    <div className="relative" style={{ height: 320 }}>
      {/* gridlines + y labels */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {gridVals.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[#444] w-10 text-right shrink-0">{v.toLocaleString()}</span>
            <div className="flex-1 border-t" style={{ borderColor: '#141414' }} />
          </div>
        ))}
      </div>
      {/* bars */}
      <div className="absolute left-12 right-0 bottom-[18px] top-0 flex items-end justify-around gap-2">
        {rows.map((d, i) => {
          const c = color(d.role);
          return (
            <div key={d.role} className="flex-1 flex flex-col items-center justify-end h-full">
              <motion.div className="w-full max-w-[54px] rounded-t-md"
                initial={{ height: 0 }} animate={{ height: `${(d.count / top) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                style={{ backgroundColor: `${c}33`, border: `1.5px solid ${c}`, boxShadow: `0 0 14px ${c}33` }} />
            </div>
          );
        })}
      </div>
      {/* x labels */}
      <div className="absolute left-12 right-0 bottom-0 flex justify-around gap-2">
        {rows.map(d => (
          <span key={d.role} className="flex-1 text-center font-mono text-[9px] truncate" style={{ color: '#555' }}>{d.role}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Growth line/area chart (cumulative members over months) ── */
function GrowthChart({ pts }: { pts: GrowthPt[] }) {
  const W = 800, H = 280, padL = 48, padB = 28, padT = 12, padR = 12;
  if (pts.length < 2) return <p className="text-[#555] text-sm font-mono">Not enough data.</p>;
  const maxCum = Math.max(...pts.map(p => p.cumulative));
  const niceMax = Math.ceil(maxCum / 20000) * 20000 || maxCum;
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / niceMax) * (H - padT - padB);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.cumulative)}`).join(' ');
  const area = `${line} L ${x(pts.length - 1)} ${H - padB} L ${x(0)} ${H - padB} Z`;
  const grid = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 280 }}>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: grid + 1 }).map((_, i) => {
        const v = (niceMax / grid) * (grid - i);
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#141414" />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="#444" fontFamily="monospace">
              {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
            </text>
          </g>
        );
      })}
      <motion.path d={area} fill="url(#grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
      <motion.path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
      {pts.map((p, i) => (i % Math.ceil(pts.length / 8) === 0 || i === pts.length - 1) && (
        <text key={p.month} x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize="9" fill="#555" fontFamily="monospace">
          {p.month.slice(2)}
        </text>
      ))}
    </svg>
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
  const [data, setData] = useState<{ stats: any; upgrades: any; insights: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'overview' | 'analytics' | 'insights'>('overview');

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

  const growth: GrowthPt[] = data?.insights?.growth ?? [];
  const regional: RegionRow[] = data?.insights?.regional ?? [];
  const totalGuild = data?.insights?.totalGuildMembers ?? 0;
  const regionSum = regional.reduce((s, r) => s + r.count, 0);
  const regionMax = Math.max(1, ...regional.map(r => r.count));

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
          {(['overview', 'analytics', 'insights'] as const).map(v => (
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
            <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a' }}>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#555] mb-1">Total ranked members</p>
              <p className="font-display text-5xl md:text-6xl" style={{ color: 'var(--color-accent)' }}>{total.toLocaleString()}</p>
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
                {/* Composition donut (left, wider) + Ranking (right) */}
                <div className="grid lg:grid-cols-5 gap-6">
                  <Card title="Composition" subtitle="Share by role" className="lg:col-span-2">
                    <div className="flex flex-col items-center gap-5">
                      <Donut rows={rows} sum={sum} centerValue={total} />
                      <div className="w-full space-y-1.5">
                        {rows.map(d => (
                          <div key={d.role} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color(d.role) }} />
                            <span className="flex-1 truncate text-[#ccc]">{d.role}</span>
                            <span className="font-mono text-xs text-[#555]">{d.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card title="Ranking" subtitle="Roles by size" className="lg:col-span-3">
                    <div className="space-y-1">
                      {rows.map((d, i) => {
                        const c = color(d.role);
                        return (
                          <div key={d.role} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#161616' }}>
                            <span className="font-mono text-xs w-4 text-center shrink-0" style={{ color: '#444' }}>{i + 1}</span>
                            <span className="text-sm text-[#ccc] w-28 truncate shrink-0">{d.role}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#161616' }}>
                              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(d.count / maxCount) * 100}%` }}
                                transition={{ delay: i * 0.05 + 0.1, duration: 0.6 }} style={{ backgroundColor: c }} />
                            </div>
                            <span className="font-mono text-sm text-white w-14 text-right shrink-0">{d.count.toLocaleString()}</span>
                            <span className="font-mono text-xs text-[#555] w-12 text-right shrink-0">{d.percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Distribution — full width vertical bars */}
                <Card title="Distribution" subtitle="Members per role">
                  <VBars rows={rows} max={maxCount} />
                </Card>
              </>
            )}

            {/* ── INSIGHTS ── */}
            {view === 'insights' && (
              <>
                {!data.insights ? (
                  <Card><p className="text-[#555] text-sm font-mono">Insights not generated yet. Wait for the next hourly run.</p></Card>
                ) : (
                  <>
                    <Card title="Server Growth" subtitle={`${totalGuild.toLocaleString()} members joined since launch · cumulative`}>
                      <GrowthChart pts={growth} />
                    </Card>

                    <Card title="Regional Communities" subtitle="Members per regional role">
                      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                        {regional.map((r, i) => {
                          const c = regionColor(r.region);
                          const pct = regionSum ? ((r.count / regionSum) * 100).toFixed(1) : '0';
                          return (
                            <div key={r.region} className="flex items-center gap-3 py-1.5">
                              <span className="text-sm w-32 truncate shrink-0 text-[#ccc]">{REGION_LABEL[r.region] || r.region}</span>
                              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#161616' }}>
                                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(r.count / regionMax) * 100}%` }}
                                  transition={{ delay: i * 0.04 + 0.1, duration: 0.6 }} style={{ backgroundColor: c }} />
                              </div>
                              <span className="font-mono text-sm text-white w-14 text-right shrink-0">{r.count.toLocaleString()}</span>
                              <span className="font-mono text-xs text-[#555] w-10 text-right shrink-0">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </>
                )}
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
