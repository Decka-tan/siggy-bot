'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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
type RegionRow = { region: string; count: number; any?: number };
type RegionRoleRow = { region: string; members: number; contributors: number; rate: number; tiers: Record<string, number> };

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
  return (
    <span 
      className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold tracking-wide backdrop-blur-sm shadow-sm"
      style={{ color: c, borderColor: `${c}44`, backgroundColor: `${c}12` }}
    >
      {role}
    </span>
  );
}

/* ── SVG Donut ─────────────────────────────────────── */
function Donut({ rows, sum, centerValue }: { rows: DistRow[]; sum: number; centerValue: number }) {
  const size = 240, stroke = 24, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const [hovered, setHovered] = useState<DistRow | null>(null);
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center filter drop-shadow-[0_0_8px_rgba(255,255,255,0.02)]" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#121212" strokeWidth={stroke - 4} />
        {rows.map(d => {
          const len = (sum ? d.count / sum : 0) * circ;
          const currentOffset = offset;
          offset += len;

          return (
            <motion.circle 
              key={d.role} 
              cx={size / 2} 
              cy={size / 2} 
              r={r} 
              fill="none"
              stroke={color(d.role)} 
              strokeWidth={hovered?.role === d.role ? stroke + 3 : stroke} 
              strokeDasharray={`${len} ${circ - len}`}
              initial={{ strokeDashoffset: circ }} 
              animate={{ strokeDashoffset: -currentOffset }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} 
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
        <span className="font-display text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight transition-all">
          {hovered ? hovered.count.toLocaleString() : centerValue.toLocaleString()}
        </span>
        <span 
          className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#666] mt-0.5 max-w-[150px] truncate text-center"
          style={{ color: hovered ? color(hovered.role) : '#666' }}
        >
          {hovered ? hovered.role : 'members'}
        </span>
      </div>
    </div>
  );
}

/* ── Generic donut (label/value/color) ─────────────── */
function DonutG({ items, centerValue, centerLabel }: { items: { value: number; color: string; label: string }[]; centerValue: number; centerLabel: string }) {
  const size = 220, stroke = 22, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const sum = items.reduce((s, it) => s + it.value, 0) || 1;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#121212" strokeWidth={stroke - 4} />
        {items.map((it, i) => {
          const len = (it.value / sum) * circ;
          const currentOffset = offset;
          offset += len;

          return (
            <motion.circle 
              key={i} 
              cx={size / 2} 
              cy={size / 2} 
              r={r} 
              fill="none"
              stroke={it.color} 
              strokeWidth={hoveredIdx === i ? stroke + 3 : stroke} 
              strokeDasharray={`${len} ${circ - len}`}
              initial={{ strokeDashoffset: circ }} 
              animate={{ strokeDashoffset: -currentOffset }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} 
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
        <span className="font-display text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight">
          {hoveredIdx !== null ? items[hoveredIdx].value.toLocaleString() : centerValue.toLocaleString()}
        </span>
        <span 
          className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#666] mt-0.5 max-w-[140px] truncate text-center"
          style={{ color: hoveredIdx !== null ? items[hoveredIdx].color : '#666' }}
        >
          {hoveredIdx !== null ? items[hoveredIdx].label : centerLabel}
        </span>
      </div>
    </div>
  );
}

/* ── Vertical bar chart with gridlines ─────────────── */
function VBars({ rows, max }: { rows: DistRow[]; max: number }) {
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2 || 1;
  const top = Math.ceil(max / step) * step;
  const lines = 5;
  const gridVals = Array.from({ length: lines + 1 }, (_, i) => Math.round((top / lines) * (lines - i)));
  return (
    <div className="relative" style={{ height: 340 }}>
      {/* gridlines + y labels */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {gridVals.map((v, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-[#444] w-12 text-right shrink-0">{v.toLocaleString()}</span>
            <div className="flex-1 border-t border-dashed border-[#141414]" />
          </div>
        ))}
      </div>
      {/* bars */}
      <div className="absolute left-14 right-2 bottom-8 top-2 flex items-end justify-around gap-4">
        {rows.map((d, i) => {
          const c = color(d.role);
          return (
            <div key={d.role} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-15 bg-[#0d0d0d] border border-white/5 px-2.5 py-1 rounded text-[10px] font-mono shadow-xl whitespace-nowrap">
                <span className="text-white font-semibold">{d.count.toLocaleString()}</span> <span className="text-[#555]">({d.percent}%)</span>
              </div>
              <motion.div 
                className="w-full max-w-[48px] rounded-t-lg relative"
                initial={{ height: 0 }} 
                animate={{ height: `${(d.count / top) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ 
                  background: `linear-gradient(to top, ${c}15, ${c}40)`, 
                  border: `1.5px solid ${c}aa`, 
                  boxShadow: `0 0 20px ${c}1a` 
                }}
              >
                {/* Glossy top edge highlight */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-white/20 rounded-t-lg" />
              </motion.div>
            </div>
          );
        })}
      </div>
      {/* x labels */}
      <div className="absolute left-14 right-2 bottom-0 flex justify-around gap-4">
        {rows.map(d => (
          <span key={d.role} className="flex-1 text-center font-mono text-[9px] truncate font-medium text-[#666] uppercase tracking-wider">{d.role}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Growth line/area chart (cumulative members over months) ── */
function GrowthChart({ pts }: { pts: GrowthPt[] }) {
  const W = 800, H = 280, padL = 54, padB = 28, padT = 16, padR = 16;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (pts.length < 2) return <p className="text-[#555] text-sm font-mono">Not enough data.</p>;
  const maxCum = Math.max(...pts.map(p => p.cumulative));
  const niceMax = Math.ceil(maxCum / 10000) * 10000 || maxCum;
  
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / niceMax) * (H - padT - padB);
  
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.cumulative)}`).join(' ');
  const area = `${line} L ${x(pts.length - 1)} ${H - padB} L ${x(0)} ${H - padB} Z`;
  const grid = 4;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const px = x(i);
      const diff = Math.abs(px - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    setHoverIndex(closestIndex);
  };

  return (
    <svg 
      viewBox={`0 0 ${W} ${H}`} 
      className="w-full filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-crosshair" 
      style={{ height: 280 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {Array.from({ length: grid + 1 }).map((_, i) => {
        const v = (niceMax / grid) * (grid - i);
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#141414" strokeWidth="1" strokeDasharray="3,3" />
            <text x={padL - 10} y={yy + 3} textAnchor="end" fontSize="9" fill="#555" fontFamily="monospace" fontWeight="500">
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            </text>
          </g>
        );
      })}
      <motion.path d={area} fill="url(#grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
      <motion.path d={line} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} />
      {pts.map((p, i) => (i % Math.ceil(pts.length / 8) === 0 || i === pts.length - 1) && (
        <text key={p.month} x={x(i)} y={H - padB + 18} textAnchor="middle" fontSize="9" fill="#555" fontFamily="monospace">
          {p.month.slice(2)}
        </text>
      ))}

      {/* Interactive Tooltip / Crosshair */}
      {hoverIndex !== null && (
        <g>
          <line x1={x(hoverIndex)} y1={padT} x2={x(hoverIndex)} y2={H - padB} stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx={x(hoverIndex)} cy={y(pts[hoverIndex].cumulative)} r="5.5" fill="var(--color-accent)" stroke="#030303" strokeWidth="2.5" />
          <g transform={`translate(${x(hoverIndex) > W / 2 ? x(hoverIndex) - 150 : x(hoverIndex) + 14}, ${y(pts[hoverIndex].cumulative) - 30})`}>
            <rect width="136" height="42" rx="6" fill="#0b0b0b" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))" />
            <text x="12" y="17" fontSize="8" fill="#555" fontFamily="monospace" fontWeight="bold">DATE: {pts[hoverIndex].month}</text>
            <text x="12" y="30" fontSize="10" fill="#fff" fontFamily="monospace" fontWeight="bold">TOTAL: {pts[hoverIndex].cumulative.toLocaleString()}</text>
          </g>
        </g>
      )}
    </svg>
  );
}

function UpgradeCard({ u }: { u: Upgrade }) {
  const [err, setErr] = useState(false);
  const c = color(u.toRole);
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.015, borderColor: `${c}77`, boxShadow: `0 8px 20px -6px ${c}22` }}
      className="flex items-center gap-3 p-3 rounded-xl border bg-black/40 backdrop-blur-md border-white/5 transition-all duration-300"
    >
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#141414]" style={{ boxShadow: `0 0 0 1.5px ${c}77` }}>
        <Image src={err ? 'https://cdn.discordapp.com/embed/avatars/0.png' : (u.avatarUrl || `/api/avatar?id=${u.userId}`)}
          alt={u.displayName} fill className="object-cover" onError={() => setErr(true)} unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white/90 truncate tracking-wide">{u.displayName}</p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <RoleBadge role={u.fromRole} /><span className="text-[#333] text-[10px] font-bold">→</span><RoleBadge role={u.toRole} />
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-1">
        <span className="text-[9px] font-mono text-[#555] font-semibold uppercase">{relativeTime(u.at)}</span>
        {fmtDays(u.daysToPromo) && (
          <span className="text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded uppercase" style={{ color: c, backgroundColor: `${c}10`, border: `1px solid ${c}22` }}>
            {fmtDays(u.daysToPromo)} climb
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Card({ title, subtitle, children, className = '' }: any) {
  return (
    <div className={`rounded-2xl border bg-black/45 backdrop-blur-xl border-white/5 p-6 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden group ${className}`}>
      {/* Dynamic light ray background ornament */}
      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-white/[0.01] blur-3xl pointer-events-none group-hover:bg-white/[0.02] transition-colors duration-500" />
      {title && <h2 className="font-display text-xl uppercase tracking-wider text-white/90 mb-1">{title}</h2>}
      {subtitle && <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mb-6">{subtitle}</p>}
      {children}
    </div>
  );
}

export default function CommunityPage() {
  const [data, setData] = useState<{ stats: any; upgrades: any; insights: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'overview' | 'analytics' | 'insights'>('overview');
  const [regionMode, setRegionMode] = useState<'pure' | 'all'>('pure');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [rrSortMode, setRrSortMode] = useState<'count' | 'rate'>('count');
  const [regionRoleMode, setRegionRoleMode] = useState<'pure' | 'all'>('pure');

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
  const rawRegional: RegionRow[] = data?.insights?.insightsRegional ?? data?.insights?.regional ?? [];
  const totalGuild = data?.insights?.totalGuildMembers ?? 0;
  const multiRegion = data?.insights?.multiRegion ?? 0;
  const regional = rawRegional
    .map(r => ({ region: r.region, value: regionMode === 'all' ? (r.any ?? r.count) : r.count }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const regionSum = regional.reduce((s, r) => s + r.value, 0);
  const regionMax = Math.max(1, ...regional.map(r => r.value));

  const regionRoles: RegionRoleRow[] = regionRoleMode === 'pure'
    ? (data?.insights?.regionRolesPure ?? data?.insights?.regionRoles ?? [])
    : (data?.insights?.regionRoles ?? []);
  const TIER_ORDER = ['Radiant Ritualist', 'Zealot', 'Ritualist', 'Mage', 'ritty', 'bitty'];
  const rrSorted = [...regionRoles].sort((a, b) => {
    if (tierFilter === 'all' && rrSortMode === 'rate') {
      return b.rate - a.rate;
    }
    return tierFilter === 'all'
      ? b.contributors - a.contributors
      : (b.tiers[tierFilter] || 0) - (a.tiers[tierFilter] || 0);
  }).filter(r => tierFilter === 'all' || (r.tiers[tierFilter] || 0) > 0);
  const rrMax = Math.max(1, ...rrSorted.map(r => {
    if (tierFilter === 'all' && rrSortMode === 'rate') {
      return r.rate;
    }
    return tierFilter === 'all' ? r.contributors : (r.tiers[tierFilter] || 0);
  }));

  return (
    <div className="min-h-screen bg-[#030303] text-white relative overflow-hidden selection:bg-amber-400 selection:text-black">
      {/* Neon/Mesh Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-amber-500/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[60%] h-[70%] rounded-full bg-violet-600/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[50%] rounded-full bg-emerald-500/[0.02] blur-[140px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-24 relative z-10">

        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-emerald-400 font-bold">Live Synced Hourly</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none mb-1 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500">
              Ritual Community Stats
            </h1>
            <p className="text-[#555] text-xs font-mono tracking-wide">
              Server demographics & Contributor insights {updatedAt ? ` · updated ${relativeTime(updatedAt)}` : ''}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link href="/" className="px-4 py-2 rounded-xl text-xs font-mono font-semibold border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all">
              ← Back to Chat
            </Link>
          </div>
        </div>

        {/* Nav Switch */}
        <div className="mb-10 flex justify-center md:justify-start">
          <div className="relative inline-flex p-1 rounded-full border border-white/5 bg-black/60 backdrop-blur-xl">
            {(['overview', 'analytics', 'insights'] as const).map(v => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="relative px-6 py-2.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider transition-colors duration-300 z-10"
                  style={{ color: active ? '#000' : '#777' }}
                >
                  {active && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-20">{v}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Skeleton Loading */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div 
                  key={i} 
                  className="h-28 rounded-2xl border border-white/5 bg-black/45 animate-pulse relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 h-[450px] rounded-2xl border border-white/5 bg-black/45 animate-pulse" />
              <div className="lg:col-span-3 h-[450px] rounded-2xl border border-white/5 bg-black/45 animate-pulse" />
            </div>
          </div>
        )}

        {error && (
          <div className="py-20 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl p-6">
            <p className="text-red-400 font-mono text-sm">Engine status offline. The stats aggregator script has not executed yet.</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Members */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 }}
                className="rounded-2xl border border-white/5 p-5 relative overflow-hidden bg-black/45 backdrop-blur-xl shadow-lg group hover:border-amber-400/20 transition-all duration-300"
              >
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#555] font-bold">Total Discord Members</p>
                <p className="font-display text-3xl md:text-4xl text-white mt-2 font-black tracking-tight">
                  {(totalGuild || total).toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#666]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Total server population</span>
                </div>
              </motion.div>

              {/* Card 2: Contributor Count */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="rounded-2xl border border-white/5 p-5 relative overflow-hidden bg-black/45 backdrop-blur-xl shadow-lg group hover:border-violet-500/20 transition-all duration-300"
              >
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" />
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#555] font-bold">Active Contributors</p>
                <p className="font-display text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mt-2 font-black tracking-tight">
                  {total.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#666]">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>{totalGuild ? ((total / totalGuild) * 100).toFixed(1) : '0'}% contributor rate</span>
                </div>
              </motion.div>

              {/* Card 3: Recent Promotions */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="rounded-2xl border border-white/5 p-5 relative overflow-hidden bg-black/45 backdrop-blur-xl shadow-lg group hover:border-emerald-500/20 transition-all duration-300"
              >
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#555] font-bold">14d Promotions</p>
                <p className="font-display text-3xl md:text-4xl text-emerald-400 mt-2 font-black tracking-tight">
                  {upgrades.length}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">
                  <span>🚀 Active climbs</span>
                </div>
              </motion.div>

              {/* Card 4: Top Region */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="rounded-2xl border border-white/5 p-5 relative overflow-hidden bg-black/45 backdrop-blur-xl shadow-lg group hover:border-sky-500/20 transition-all duration-300"
              >
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/10 to-transparent" />
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#555] font-bold">Top Region</p>
                <p className="font-display text-2xl md:text-3xl text-white mt-3 truncate font-black tracking-tight uppercase">
                  {regional.length > 0 ? (REGION_LABEL[regional[0].region]?.split(' ')[1] || regional[0].region) : 'N/A'}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#666] truncate">
                  <span>{regional.length > 0 ? (REGION_LABEL[regional[0].region]?.split(' ')[0] || '📍') : '📍'} Main demographic</span>
                </div>
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              {/* ── OVERVIEW ── */}
              {view === 'overview' && (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {rows.map((d, i) => {
                    const c = color(d.role);
                    return (
                      <motion.div 
                        key={d.role}
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -5, borderColor: `${c}44`, boxShadow: `0 12px 30px -8px ${c}18` }}
                        className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden group transition-all duration-300"
                      >
                        {/* glow banner */}
                        <div className="h-[2px] w-full" style={{ backgroundColor: c, boxShadow: `0 0 16px ${c}` }} />
                        <div className="p-6 relative">
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at 80% 20%, ${c}, transparent 60%)` }} />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                              <span className="font-mono text-xs uppercase tracking-wider font-bold text-white/70">{d.role}</span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[#888]">{d.percent}%</span>
                            </div>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="font-display text-5xl tracking-tight text-white font-extrabold">{d.count.toLocaleString()}</span>
                              <span className="font-mono text-[9px] uppercase tracking-widest text-[#555] font-semibold">members</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* ── ANALYTICS ── */}
              {view === 'analytics' && (
                <motion.div 
                  key="analytics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="grid lg:grid-cols-5 gap-6">
                    <Card title="Composition" subtitle="Share by tier distribution (Hover slices for details)" className="lg:col-span-2 flex flex-col items-center">
                      <div className="flex flex-col items-center gap-6 w-full">
                        <Donut rows={rows} sum={sum} centerValue={total} />
                        <div className="w-full space-y-2.5 mt-2">
                          {rows.map(d => (
                            <div key={d.role} className="flex items-center gap-3 text-xs p-2 rounded-lg hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: color(d.role) }} />
                              <span className="flex-1 truncate text-white/70 font-semibold">{d.role}</span>
                              <span className="font-mono text-[#555] font-semibold">{d.count.toLocaleString()}</span>
                              <span className="font-mono font-bold text-white/80 w-10 text-right">{d.percent}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    <Card title="Ranking" subtitle="Tiers sorted by population size" className="lg:col-span-3">
                      <div className="space-y-2">
                        {rows.map((d, i) => {
                          const c = color(d.role);
                          return (
                            <div key={d.role} className="flex items-center gap-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] px-2 rounded-lg transition-all">
                              <span className="font-mono text-xs w-4 text-center shrink-0 font-bold text-[#444]">{i + 1}</span>
                              <span className="text-xs text-white/80 font-bold w-32 truncate shrink-0">{d.role}</span>
                              <div className="flex-1 h-2 rounded-full bg-[#121212] overflow-hidden border border-white/5">
                                <motion.div 
                                  className="h-full rounded-full" 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(d.count / maxCount) * 100}%` }}
                                  transition={{ delay: i * 0.05 + 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
                                  style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}55` }} 
                                />
                              </div>
                              <span className="font-mono text-xs text-white font-bold w-16 text-right shrink-0">{d.count.toLocaleString()}</span>
                              <span className="font-mono text-[10px] text-[#555] font-bold w-12 text-right shrink-0">{d.percent}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>

                  <Card title="Detailed Distribution" subtitle="Contributor density per tier scale">
                    <div className="mt-4">
                      <VBars rows={rows} max={maxCount} />
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ── INSIGHTS ── */}
              {view === 'insights' && (
                <motion.div 
                  key="insights"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {!data.insights ? (
                    <Card><p className="text-[#555] text-xs font-mono uppercase tracking-widest text-center py-6">Insights compiling under pipeline...</p></Card>
                  ) : (
                    <>
                      <Card title="Server Growth" subtitle={`${totalGuild.toLocaleString()} total members joined since launch (Hover chart to track dates)`}>
                        <div className="mt-4">
                          <GrowthChart pts={growth} />
                        </div>
                      </Card>

                      <div className="rounded-2xl border border-white/5 p-6 bg-black/45 backdrop-blur-xl shadow-lg relative overflow-hidden group">
                        <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-white/[0.01] blur-3xl pointer-events-none" />
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4 border-b border-white/[0.03] pb-6">
                          <div>
                            <h2 className="font-display text-xl uppercase tracking-wider text-white/95">Regional Communities</h2>
                            <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mt-0.5">
                              {regionMode === 'pure'
                                ? 'Single-region members only'
                                : `Region role holders · ${multiRegion.toLocaleString()} holding multiple regions`}
                            </p>
                          </div>
                          {/* mode toggle */}
                          <div className="inline-flex p-1 rounded-full border border-white/5 bg-black/60 shrink-0 self-start md:self-center">
                            {([['pure', 'Single-Region'], ['all', 'All-Region']] as const).map(([k, label]) => (
                              <button 
                                key={k} 
                                onClick={() => setRegionMode(k)}
                                className="px-4 py-1.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider transition-colors duration-300"
                                style={{ 
                                  backgroundColor: regionMode === k ? 'var(--color-accent)' : 'transparent', 
                                  color: regionMode === k ? '#000' : '#555' 
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-center gap-10">
                          <div className="shrink-0">
                            <DonutG
                              items={regional.map(r => ({ 
                                value: r.value, 
                                color: regionColor(r.region),
                                label: REGION_LABEL[r.region] || r.region
                              }))}
                              centerValue={regionSum}
                              centerLabel={regionMode === 'pure' ? 'single-region' : 'members'}
                            />
                          </div>
                          <div className="flex-1 w-full space-y-3">
                            {regional.map((r, i) => {
                              const c = regionColor(r.region);
                              const pct = regionSum ? ((r.value / regionSum) * 100).toFixed(1) : '0';
                              return (
                                <div key={r.region} className="flex items-center gap-2 sm:gap-3 py-1.5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] px-2 rounded transition-all">
                                  <span className="font-mono text-[10px] sm:text-xs w-4 sm:w-5 text-center shrink-0 font-bold text-[#444]">{i + 1}</span>
                                  <span className="text-xs w-20 xs:w-28 sm:w-36 truncate shrink-0 text-white/80 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: c }} />
                                    {REGION_LABEL[r.region] || r.region}
                                  </span>
                                  <div className="flex-1 h-2 rounded-full bg-[#121212] overflow-hidden border border-white/5">
                                    <motion.div 
                                      className="h-full rounded-full" 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${(r.value / regionMax) * 100}%` }}
                                      transition={{ delay: i * 0.04 + 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
                                      style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}44` }} 
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] sm:text-xs text-white font-bold w-10 sm:w-16 text-right shrink-0">{r.value.toLocaleString()}</span>
                                  <span className="font-mono text-[9px] sm:text-[10px] text-[#555] font-bold w-9 sm:w-11 text-right shrink-0">{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Region × Role */}
                      {regionRoles.length > 0 && (
                        <div className="rounded-2xl border border-white/5 p-6 bg-black/45 backdrop-blur-xl shadow-lg relative overflow-hidden group">
                          <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-white/[0.01] blur-3xl pointer-events-none" />
                          <div className="flex flex-col xl:flex-row xl:items-start justify-between mb-8 gap-5 border-b border-white/[0.03] pb-6">
                             <div className="space-y-3">
                              <div>
                                <h2 className="font-display text-xl uppercase tracking-wider text-white/95">Region × Role Distribution</h2>
                                <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mt-0.5">
                                  {tierFilter === 'all'
                                    ? 'Contributors per region categorized by tier composition'
                                    : `Regions producing the most ${tierFilter} tier contributors`}
                                </p>
                              </div>
                              {/* toggles */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* sort toggle */}
                                {tierFilter === 'all' && (
                                  <div className="inline-flex p-0.5 rounded-lg border border-white/5 bg-black/60 shrink-0">
                                    {(['count', 'rate'] as const).map(mode => (
                                      <button
                                        key={mode}
                                        onClick={() => setRrSortMode(mode)}
                                        className="px-3 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-200"
                                        style={{
                                          backgroundColor: rrSortMode === mode ? 'var(--color-accent)' : 'transparent',
                                          color: rrSortMode === mode ? '#000' : '#555',
                                        }}
                                      >
                                        Sort by {mode}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* region hold toggle */}
                                <div className="inline-flex p-0.5 rounded-lg border border-white/5 bg-black/60 shrink-0">
                                  {([['pure', 'Single-Region'], ['all', 'All-Region']] as const).map(([k, label]) => (
                                    <button
                                      key={k}
                                      onClick={() => setRegionRoleMode(k)}
                                      className="px-3 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-200"
                                      style={{
                                        backgroundColor: regionRoleMode === k ? 'var(--color-accent)' : 'transparent',
                                        color: regionRoleMode === k ? '#000' : '#555',
                                      }}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {/* tier selector */}
                            <div className="flex flex-wrap gap-1.5 max-w-xl self-start">
                              {(['all', ...TIER_ORDER] as const).map(t => {
                                const active = tierFilter === t;
                                const c = t === 'all' ? '#888' : color(t);
                                return (
                                  <button 
                                    key={t} 
                                    onClick={() => {
                                      setTierFilter(t);
                                      if (t !== 'all') setRrSortMode('count'); // force count for single tier view
                                    }}
                                    className="px-3 py-1.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border transition-all"
                                    style={{
                                      borderColor: active ? c : 'rgba(255,255,255,0.05)',
                                      backgroundColor: active ? `${c}22` : 'transparent',
                                      color: active ? c : '#555',
                                    }}
                                  >
                                    {t === 'all' ? 'All Tiers' : t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* tier legend (composition mode) */}
                          {tierFilter === 'all' && (
                            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 pb-4 border-b border-white/[0.02]">
                              {TIER_ORDER.map(tier => (
                                <span key={tier} className="flex items-center gap-2 text-[10px] font-mono text-[#666] font-bold uppercase tracking-wider">
                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color(tier) }} />
                                  {tier}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="space-y-4">
                            {rrSorted.map((r, i) => {
                              const val = tierFilter === 'all' ? r.contributors : (r.tiers[tierFilter] || 0);
                              return (
                                <div key={r.region} className="flex items-center gap-2 sm:gap-3 py-1 hover:bg-white/[0.01] px-2 rounded transition-all">
                                  <span className="font-mono text-[10px] sm:text-xs w-4 sm:w-5 text-center shrink-0 font-bold text-[#444]">{i + 1}</span>
                                  <span className="text-xs w-20 xs:w-28 sm:w-36 truncate shrink-0 text-white/80 font-bold">{REGION_LABEL[r.region] || r.region}</span>
                                  
                                  {/* stacked tier bar (all) or single tier bar */}
                                  <div className="flex-1 h-3 rounded bg-[#121212] overflow-hidden flex border border-white/5">
                                    {tierFilter === 'all'
                                      ? TIER_ORDER.map(tier => {
                                          const tv = r.tiers[tier] || 0;
                                          if (!tv) return null;
                                          return (
                                            <motion.div 
                                              key={tier} 
                                              initial={{ width: 0 }} 
                                              animate={{ width: `${(tv / rrMax) * 100}%` }}
                                              transition={{ duration: 0.8, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }} 
                                              style={{ backgroundColor: color(tier) }} 
                                              title={`${tier}: ${tv}`} 
                                            />
                                          );
                                        })
                                      : (
                                        <motion.div 
                                          initial={{ width: 0 }} 
                                          animate={{ width: `${(val / rrMax) * 100}%` }}
                                          transition={{ duration: 0.8, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }} 
                                          className="h-full rounded" 
                                          style={{ backgroundColor: color(tierFilter) }} 
                                        />
                                      )}
                                  </div>
                                  <span className="font-mono text-[10px] sm:text-xs text-white font-bold w-10 sm:w-14 text-right shrink-0">{val.toLocaleString()}</span>
                                  {tierFilter === 'all' && (
                                    <span className="font-mono text-[9px] sm:text-[10px] font-bold w-9 sm:w-12 text-right shrink-0 text-amber-400">{r.rate}%</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {tierFilter === 'all' && (
                            <p className="text-[9px] font-mono text-[#444] mt-5 uppercase tracking-wider font-semibold">Bar = tier composition · % = contributor rate (contributors ÷ region members)</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recently Upgraded — Overview only */}
            {view === 'overview' && !loading && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/5 p-6 bg-black/45 backdrop-blur-xl shadow-lg relative overflow-hidden group"
              >
                <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-white/[0.01] blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-white/[0.03] pb-5">
                  <div>
                    <h2 className="font-display text-xl uppercase tracking-wider text-white/95">Recently Upgraded</h2>
                    <p className="text-[10px] font-mono text-[#555] uppercase tracking-widest mt-0.5">Last 14 days activity logs</p>
                  </div>
                  <Link href="/promotion"
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all hover:bg-amber-400 hover:text-black"
                    style={{ borderColor: 'rgba(255, 215, 0, 0.2)', color: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' }}>
                    June Promotion Summary →
                  </Link>
                </div>
                {upgrades.length === 0 ? (
                  <p className="text-[#555] text-xs font-mono uppercase tracking-widest py-6 text-center">No upgrades tracked in the last 14 days.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {upgrades.map(u => <UpgradeCard key={`${u.userId}-${u.at}`} u={u} />)}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
