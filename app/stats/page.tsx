'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as htmlToImage from 'html-to-image';

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#c58d04',
  'Zealot': '#9e6bff',
  'Ritualist': '#34d399',
  'Mage': '#b059bc',
  'ritty': '#826bc2',
  'bitty': '#3498db',
  'Siggy Soulsmith': '#f59e0b',
  'Siggy Architect': '#f59e0b',
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

type DistRow = { role: string; count: number; percent: number; pureCount?: number; purePercent?: number; contributor: boolean };
type Upgrade = { userId: string; username: string; displayName: string; fromRole: string; toRole: string; at: number; avatarUrl?: string; daysToPromo?: number | null };
type GrowthPt = { month: string; count: number; cumulative: number };
type RegionRow = { region: string; count: number; any?: number };
type RegionRoleRow = { region: string; members: number; contributors: number; rate: number; tiers: Record<string, number> };

const color = (r: string) => ROLE_COLOR[r] || '#888';

/* ── Profile card backgrounds (deterministic per user) ── */
const PROFILE_BGS = [
  '/vn-bg-stars.jpg',
  '/vn-bg-lake.jpg',
  '/vn-bg-sunset.jpg',
  '/bg-night-sky.jpg',
  '/vn-bg/1.jpg',
  '/vn-bg/2.jpg',
  '/vn-bg/3.jpg',
  '/vn-bg/4.jpg',
];
function pickProfileBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PROFILE_BGS[h % PROFILE_BGS.length];
}

/* ── Dominant colour of an avatar (for card border/accent) ── */
function dominantColor(img: HTMLImageElement): string | null {
  const c = document.createElement('canvas');
  const w = 24, h = 24; c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, w, h).data; } catch { return null; }
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  if (!n) return null;
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
  // lift very dark/muted averages so the accent reads as a colour
  const max = Math.max(r, g, b);
  if (max < 80) { const k = 80 / (max || 1); r = Math.min(255, r * k); g = Math.min(255, g * k); b = Math.min(255, b * k); }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

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
      className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-transparent font-semibold tracking-wide backdrop-blur-sm shadow-sm"
      style={{ color: c, backgroundColor: `${c}16` }}
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
  const [data, setData] = useState<{ stats: any; upgrades: any; insights: any; activity: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'overview' | 'analytics' | 'insights'>('overview');
  const [lbMode, setLbMode] = useState<'contributions' | 'eventsWon' | 'eventsHosted'>('contributions');
  const [lbSearch, setLbSearch] = useState('');
  const [lbWindow, setLbWindow] = useState<'all' | 'month'>('all');
  const [distMode, setDistMode] = useState<'all' | 'pure'>('all');
  const [regionMode, setRegionMode] = useState<'pure' | 'all'>('pure');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [rrSortMode, setRrSortMode] = useState<'count' | 'rate'>('count');
  const [regionRoleMode, setRegionRoleMode] = useState<'pure' | 'all'>('pure');

  // Member Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [memberProfile, setMemberProfile] = useState<any | null>(null);
  const [cardAccent, setCardAccent] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [searchError, setSearchError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAutocomplete = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsAutocompleting(true);
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(q)}&autocomplete=true`);
      const payload = await res.json();
      setSearchResults(payload.members || []);
      setShowAutocomplete(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsAutocompleting(false);
    }
  };

  const handleInput = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(val), 300);
  };

  const selectMember = async (userId: string) => {
    setSearching(true);
    setSearchError('');
    setShowAutocomplete(false);
    try {
      const res = await fetch(`/api/member?userId=${userId}`);
      const payload = await res.json();
      if (payload.success && payload.member) {
        setMemberProfile(payload.member);
        setIsModalOpen(false);
      } else {
        setSearchError(payload.error || 'Member not found');
      }
    } catch {
      setSearchError('Search engine failed to resolve member');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetch('/api/community').then(r => r.ok ? r.json() : Promise.reject())
      .then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  // Extract dominant colour from the looked-up member's avatar (same-origin
  // proxy → canvas isn't tainted) for the card border/accent.
  useEffect(() => {
    setCardAccent(null);
    const url = memberProfile?.pfpUrl;
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { try { const c = dominantColor(img); if (c) setCardAccent(c); } catch {} };
    img.src = url;
  }, [memberProfile?.pfpUrl]);

  const exportCard = async (share: boolean) => {
    if (!cardRef.current || savingCard) return;
    setSavingCard(true);
    try {
      const opts = {
        pixelRatio: 2,
        cacheBust: true,
        filter: (node: any) => !(node instanceof HTMLElement && node.classList?.contains('no-export')),
      };
      const fname = `${memberProfile.username || 'ritual'}-card.png`;
      if (share && typeof navigator !== 'undefined' && navigator.share) {
        const blob = await htmlToImage.toBlob(cardRef.current, opts);
        const file = blob && new File([blob], fname, { type: 'image/png' });
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${memberProfile.displayName} · Ritual` });
          return;
        }
      }
      const dataUrl = await htmlToImage.toPng(cardRef.current, opts);
      const a = document.createElement('a');
      a.href = dataUrl; a.download = fname; a.click();
    } catch (e) {
      console.error('[card export]', e);
    } finally {
      setSavingCard(false);
    }
  };

  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(searchQuery)}`);
      const payload = await res.json();
      if (payload.success && payload.member) {
        setMemberProfile(payload.member);
        setIsModalOpen(false);
      } else {
        setSearchError(payload.error || 'Member not found');
        setMemberProfile(null);
      }
    } catch {
      setSearchError('Search engine failed to resolve member');
      setMemberProfile(null);
    } finally {
      setSearching(false);
    }
  };

  const dist: DistRow[] = data?.stats?.distribution ?? [];
  const rows = dist
    .map(d => distMode === 'pure'
      ? { ...d, count: d.pureCount ?? d.count, percent: d.purePercent ?? d.percent }
      : d)
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count); // biggest first
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
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowAutocomplete(false);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-amber-400 text-black hover:opacity-90 transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.15)] flex items-center gap-2 max-w-[320px] truncate"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {memberProfile ? memberProfile.displayName : 'Connect your Discord'}
            </button>
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
                  className="space-y-6"
                >
                  {/* Member Dashboard Profile Section */}
                  {!memberProfile ? null : (
                    <motion.div
                      ref={cardRef}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border p-8 relative overflow-hidden group shadow-2xl bg-[#0a0a0a]"
                      style={{
                        borderColor: cardAccent ? `${cardAccent}` : 'rgba(255,255,255,0.1)',
                        boxShadow: cardAccent ? `0 0 40px -12px ${cardAccent}` : undefined,
                      }}
                    >
                      {/* Blurred avatar → one ambient tone background */}
                      <div className="absolute inset-0 z-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={memberProfile.pfpUrl} alt="" className="w-full h-full object-cover scale-[1.6] blur-[60px] opacity-50 select-none" />
                      </div>
                      <div className="absolute inset-0 bg-black/80 z-0" />

                      {/* Top border highlight (accent) */}
                      <div className="absolute top-0 inset-x-0 h-[2px] z-10" style={{ background: cardAccent ? `linear-gradient(to right, transparent, ${cardAccent}, transparent)` : 'linear-gradient(to right, transparent, rgba(251,191,36,0.3), transparent)' }} />

                      {/* Floating Siggy Sprite in Background */}
                      <div className="absolute right-0 bottom-0 w-80 h-80 opacity-[0.11] pointer-events-none z-0 select-none translate-x-12 translate-y-12 group-hover:scale-105 group-hover:opacity-[0.15] transition-all duration-700">
                        <Image
                          src="/siggy-transparent.png"
                          alt=""
                          fill
                          className="object-contain object-bottom-right"
                          unoptimized
                        />
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-white/[0.03] relative z-10">
                        {/* Profile Info */}
                        <div className="flex items-center gap-5">
                          <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 bg-[#141414] ring-2 ring-offset-4 ring-offset-black" style={{ boxShadow: cardAccent ? `0 0 0 2px ${cardAccent}` : undefined }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={memberProfile.pfpUrl} alt={memberProfile.displayName} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-2xl font-black text-white tracking-tight">{memberProfile.displayName}</h3>
                            <p className="text-xs text-[#555] font-mono mt-0.5">@{memberProfile.username}</p>
                            <p className="text-[10px] font-mono text-amber-400/80 mt-2 uppercase font-bold tracking-widest flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Joined {memberProfile.joinDate}
                            </p>
                          </div>
                        </div>

                        {/* Actions (excluded from the exported image) */}
                        <div className="no-export flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => exportCard(true)}
                            disabled={savingCard}
                            title="Share card"
                            className="px-3 py-2 rounded-xl text-[10px] font-mono font-bold border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5"/></svg>
                            Share
                          </button>
                          <button
                            onClick={() => exportCard(false)}
                            disabled={savingCard}
                            title="Save card as image"
                            className="px-3 py-2 rounded-xl text-[10px] font-mono font-bold border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
                            {savingCard ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setMemberProfile(null); setSearchQuery(''); setSearchError(''); }}
                            className="px-4 py-2 rounded-xl text-[10px] font-mono font-bold border border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all uppercase tracking-wider"
                          >
                            Change
                          </button>
                        </div>
                      </div>

                      {/* Stats & Roles Content */}
                      <div className="mt-8 grid lg:grid-cols-5 gap-8 relative z-10">
                        {/* Discord Activity Stats (Left 3 Columns) */}
                        <div className="lg:col-span-3 space-y-6 w-full">
                          <h4 className="text-[10px] font-mono text-[#555] uppercase tracking-widest font-bold">Activity Metrics</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.02] flex flex-col justify-center min-w-0">
                              <span className="text-[10px] font-mono text-[#555] block uppercase font-bold tracking-wider mb-2 truncate">Contributions</span>
                              <span className="text-2xl font-mono font-black text-amber-400 truncate">{(memberProfile.contributionsCount || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.02] flex flex-col justify-center min-w-0">
                              <span className="text-[10px] font-mono text-[#555] block uppercase font-bold tracking-wider mb-2 truncate">Events Won</span>
                              <span className="text-2xl font-mono font-black text-violet-400 truncate">{(memberProfile.eventsWonCount || 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.02] flex flex-col justify-center min-w-0">
                              <span className="text-[10px] font-mono text-[#555] block uppercase font-bold tracking-wider mb-2 truncate">Events Hosted</span>
                              <span className="text-2xl font-mono font-black text-sky-400 truncate">{(memberProfile.eventsHostedCount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Your Rank */}
                          {(memberProfile.contribRank || memberProfile.wonRank || memberProfile.hostedRank) && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-mono text-[#555] uppercase tracking-widest font-bold">Your Rank</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {([
                                  ['Contributor', memberProfile.contribRank, memberProfile.rankTotals?.contributions, '#fbbf24'],
                                  ['Event Winner', memberProfile.wonRank, memberProfile.rankTotals?.eventsWon, '#a78bfa'],
                                  ['Event Host', memberProfile.hostedRank, memberProfile.rankTotals?.eventsHosted, '#38bdf8'],
                                ] as const).map(([label, rank, total, c]) => (
                                  <div key={label} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.02] flex flex-col justify-center">
                                    <span className="text-[9px] font-mono text-[#555] uppercase font-bold tracking-wider truncate">{label}</span>
                                    {rank ? (
                                      <>
                                        <span className="text-lg font-mono font-black" style={{ color: c }}>#{rank.toLocaleString()}</span>
                                        {total ? <span className="text-[9px] font-mono text-[#555]">top {Math.max(1, Math.round((rank / total) * 100))}% of {total.toLocaleString()}</span> : null}
                                      </>
                                    ) : (
                                      <span className="text-sm font-mono font-bold text-[#444]">—</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Roles Held (Right 2 Columns) */}
                        <div className="lg:col-span-2 space-y-4">
                          <h4 className="text-[10px] font-mono text-[#555] uppercase tracking-widest font-bold">
                            Roles Held <span className="text-[#444]">({memberProfile.roles.length})</span>
                          </h4>
                          <div className="flex flex-wrap gap-2 content-start">
                            {memberProfile.roles.map((r: string) => (
                              <RoleBadge key={r} role={r} />
                            ))}
                            {memberProfile.roles.length === 0 && (
                              <span className="text-[#444] text-xs font-mono uppercase tracking-wider">No roles assigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Active Membership Duration — full width, bottom */}
                      <div className="mt-8 flex items-center justify-between text-[10px] font-mono text-[#444] uppercase tracking-wider bg-white/[0.01] p-3.5 rounded-xl border border-white/[0.01] relative z-10">
                        <span>Active Membership Duration</span>
                        <span className="text-white font-bold">{memberProfile.days} days</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Role distribution header + All vs Pure toggle */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="font-display text-lg uppercase tracking-wider text-white/95">Role Distribution</h2>
                      <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mt-0.5">
                        {distMode === 'pure'
                          ? 'Pure — each member counted once at their highest tier'
                          : 'All — each member counted in every role they hold'}
                      </p>
                    </div>
                    <div className="inline-flex p-1 rounded-full border border-white/5 bg-black/60 shrink-0">
                      {([['all', 'All Roles'], ['pure', 'Pure Tier']] as const).map(([k, label]) => (
                        <button
                          key={k}
                          onClick={() => setDistMode(k)}
                          className="px-4 py-1.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider transition-colors duration-300"
                          style={{
                            backgroundColor: distMode === k ? 'var(--color-accent)' : 'transparent',
                            color: distMode === k ? '#000' : '#555',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overview Roles list cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  </div>
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
                  {/* All vs Pure toggle */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
                      {distMode === 'pure'
                        ? 'Pure — each member counted once at their highest tier'
                        : 'All — each member counted in every role they hold'}
                    </p>
                    <div className="inline-flex p-1 rounded-full border border-white/5 bg-black/60 shrink-0">
                      {([['all', 'All Roles'], ['pure', 'Pure Tier']] as const).map(([k, label]) => (
                        <button
                          key={k}
                          onClick={() => setDistMode(k)}
                          className="px-4 py-1.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider transition-colors duration-300"
                          style={{
                            backgroundColor: distMode === k ? 'var(--color-accent)' : 'transparent',
                            color: distMode === k ? '#000' : '#555',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

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
                            <div key={d.role} className="flex items-center gap-2 sm:gap-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01] px-2 rounded-lg transition-all">
                              <span className="font-mono text-xs w-4 text-center shrink-0 font-bold text-[#444]">{i + 1}</span>
                              <span className="text-xs text-white/80 font-bold w-16 sm:w-32 truncate shrink-0">{d.role}</span>
                              <div className="flex-1 min-w-[40px] h-2 rounded-full bg-[#121212] overflow-hidden border border-white/5">
                                <motion.div
                                  className="h-full rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(d.count / maxCount) * 100}%` }}
                                  transition={{ delay: i * 0.05 + 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}55` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] sm:text-xs text-white font-bold w-12 sm:w-16 text-right shrink-0">{d.count.toLocaleString()}</span>
                              <span className="font-mono text-[10px] text-[#555] font-bold w-8 sm:w-12 text-right shrink-0">{d.percent}%</span>
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

              {/* ── LEADERBOARD (inside Insights) ── */}
              {view === 'insights' && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {!data.activity ? (
                    <Card><p className="text-[#555] text-xs font-mono uppercase tracking-widest text-center py-6">Leaderboard compiling under pipeline...</p></Card>
                  ) : (
                    <div className="rounded-2xl border border-white/5 p-6 bg-black/45 backdrop-blur-xl shadow-lg relative overflow-hidden">
                      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-white/[0.01] blur-3xl pointer-events-none" />
                      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4 border-b border-white/[0.03] pb-6">
                        <div>
                          <h2 className="font-display text-xl uppercase tracking-wider text-white/95">
                            {lbMode === 'contributions' ? 'Top Contributors' : lbMode === 'eventsWon' ? 'Top Event Winners' : 'Top Event Hosts'}
                          </h2>
                          <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mt-0.5">
                            {(lbWindow === 'month' ? `${data.activity.monthLabel || 'This month'} · ` : 'All time · ')}
                            {lbMode === 'contributions'
                              ? 'ranked by contribution posts'
                              : lbMode === 'eventsWon'
                              ? 'ranked by events won'
                              : 'ranked by events hosted'}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start md:self-center">
                          <div className="inline-flex p-1 rounded-full border border-white/5 bg-black/60">
                            {([['all', 'All Time'], ['month', 'This Month']] as const).map(([k, label]) => (
                              <button
                                key={k}
                                onClick={() => setLbWindow(k)}
                                className="px-3.5 py-1.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider transition-colors duration-300"
                                style={{ backgroundColor: lbWindow === k ? 'var(--color-accent)' : 'transparent', color: lbWindow === k ? '#000' : '#555' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div className="inline-flex p-1 rounded-full border border-white/5 bg-black/60">
                            {([['contributions', 'Contributions'], ['eventsWon', 'Won'], ['eventsHosted', 'Hosted']] as const).map(([k, label]) => (
                              <button
                                key={k}
                                onClick={() => setLbMode(k)}
                                className="px-3.5 py-1.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider transition-colors duration-300"
                                style={{ backgroundColor: lbMode === k ? 'var(--color-accent)' : 'transparent', color: lbMode === k ? '#000' : '#555' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative mb-5">
                        <input
                          value={lbSearch}
                          onChange={e => setLbSearch(e.target.value)}
                          placeholder="Search name in top 100…"
                          className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white placeholder:text-[#555] focus:outline-none focus:border-white/20 transition-colors"
                        />
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                      </div>

                      {(() => {
                        const key = lbWindow === 'month' ? `${lbMode}Month` : lbMode;
                        const listFull = (data.activity[key] as any[]) || [];
                        const accent = lbMode === 'contributions' ? '#fbbf24' : lbMode === 'eventsWon' ? '#a78bfa' : '#38bdf8';
                        if (listFull.length === 0) {
                          return <p className="text-[#444] text-xs font-mono uppercase tracking-wider text-center py-8">No data yet</p>;
                        }
                        const q = lbSearch.trim().toLowerCase();
                        const filtering = q.length > 0;
                        const list = filtering
                          ? listFull.filter(u => (u.displayName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
                          : listFull;

                        // movement indicator vs previous daily run
                        const Move = (delta: number | null | undefined) => {
                          if (delta == null) return <span className="text-[8px] font-mono font-bold text-sky-400/80 px-1 py-0.5 rounded bg-sky-400/10">NEW</span>;
                          if (delta > 0) return <span className="text-[9px] font-mono font-bold text-emerald-400">▲{delta}</span>;
                          if (delta < 0) return <span className="text-[9px] font-mono font-bold text-rose-400">▼{-delta}</span>;
                          return <span className="text-[9px] font-mono font-bold text-[#444]">–</span>;
                        };

                        const Row = (u: any) => (
                          <div
                            key={u.userId}
                            className="flex items-center gap-2 sm:gap-4 py-2.5 px-2 sm:px-3 rounded-xl border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-all"
                          >
                            <span className="font-mono text-xs sm:text-sm w-6 sm:w-8 text-center shrink-0 font-black text-[#444]">{u.rank}</span>
                            <span className="w-7 text-center shrink-0">{Move(u.delta)}</span>
                            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 bg-[#141414] ring-1 ring-white/10">
                              <Image src={u.avatarUrl} alt={u.displayName} fill className="object-cover" unoptimized />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm text-white/90 font-bold truncate">{u.displayName}</p>
                              <p className="text-[9px] sm:text-[10px] text-[#555] font-mono truncate">@{u.username}</p>
                            </div>
                            <span className="font-mono text-sm sm:text-base font-black w-12 sm:w-16 text-right shrink-0" style={{ color: accent }}>
                              {u.count.toLocaleString()}
                            </span>
                          </div>
                        );

                        // While searching: flat ranked list of matches (no podium)
                        if (filtering) {
                          return list.length === 0
                            ? <p className="text-[#444] text-xs font-mono uppercase tracking-wider text-center py-8">No match in top 100</p>
                            : <div className="space-y-1">{list.map(Row)}</div>;
                        }

                        const MEDAL = ['#fbbf24', '#cbd5e1', '#d97706'];
                        const top3 = list.slice(0, 3);
                        const rest = list.slice(3);
                        const order = [1, 0, 2].filter(i => top3[i]); // podium order: 2nd, 1st, 3rd
                        return (
                          <>
                            {/* Podium */}
                            <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8 pt-2">
                              {order.map(rank => {
                                const u = top3[rank];
                                const c = MEDAL[rank];
                                const isFirst = rank === 0;
                                const size = isFirst ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-14 h-14 sm:w-16 sm:h-16';
                                return (
                                  <div key={u.userId} className="flex flex-col items-center min-w-0" style={{ width: isFirst ? 120 : 96 }}>
                                    {isFirst && <div className="text-lg sm:text-xl mb-1 leading-none">👑</div>}
                                    <div className={`relative ${size} rounded-full overflow-hidden shrink-0 bg-[#141414]`} style={{ boxShadow: `0 0 0 3px ${c}, 0 0 22px ${c}55` }}>
                                      <Image src={u.avatarUrl} alt={u.displayName} fill className="object-cover" unoptimized />
                                    </div>
                                    <div
                                      className="mt-2 w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-black shrink-0"
                                      style={{ backgroundColor: c, color: '#000' }}
                                    >
                                      {rank + 1}
                                    </div>
                                    <div className="mt-1 h-3 flex items-center">{Move(u.delta)}</div>
                                    <p className="mt-0.5 text-[11px] sm:text-sm text-white font-bold truncate max-w-full text-center px-1">{u.displayName}</p>
                                    <p className="font-mono font-black text-sm sm:text-lg" style={{ color: accent }}>{u.count.toLocaleString()}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Rank 4+ */}
                            <div className="space-y-1">{rest.map(Row)}</div>
                          </>
                        );
                      })()}
                      {data.activity.updatedAt && (
                        <p className="text-[9px] font-mono text-[#444] mt-5 uppercase tracking-wider font-semibold">
                          Updated {relativeTime(data.activity.updatedAt)} · refreshed daily
                        </p>
                      )}
                    </div>
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
      {/* Floating Connect Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]/90 p-8 shadow-2xl backdrop-blur-2xl z-10"
            >
              {/* Orb Glow Ornament */}
              <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-amber-400/[0.04] blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display text-xl uppercase tracking-wider text-white">Connect Discord</h3>
                  <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mt-1">Search & resolve your contributor profile</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-white/50 hover:text-white hover:border-white/10 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Form with Autocomplete Resolver */}
              <div className="space-y-4 relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleInput(e.target.value)}
                    placeholder="Search by username (e.g. kanzwafir)..."
                    className="w-full bg-black/85 border border-white/10 rounded-xl px-4 py-3.5 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-amber-400/40 transition-all"
                  />
                  {isAutocompleting && (
                    <div className="absolute right-4 top-3.5 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Autocomplete Dropdown list (Username Resolver) */}
                {showAutocomplete && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0d0d] shadow-2xl z-25 divide-y divide-white/[0.03]">
                    {searchResults.map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => selectMember(m.userId)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full bg-[#141414] object-cover border border-white/10"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{m.displayName}</span>
                            <span className="text-[9px] font-mono text-[#555]">@{m.username}</span>
                          </div>
                        </div>
                        {m.contributorRole && (
                          <span 
                            className="text-[9px] font-mono px-2 py-0.5 rounded border border-transparent font-semibold uppercase tracking-wider"
                            style={{ 
                              color: ROLE_COLOR[m.contributorRole] || '#888',
                              backgroundColor: `${ROLE_COLOR[m.contributorRole] || '#888'}12` 
                            }}
                          >
                            {m.contributorRole}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSearchMember}
                  disabled={searching || !searchQuery.trim()}
                  className="w-full py-3.5 rounded-xl text-xs font-mono font-bold bg-amber-400 text-black hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.15)] flex items-center justify-center gap-2"
                >
                  {searching ? 'Loading...' : 'Connect Account'}
                </button>
              </div>

              {searchError && (
                <p className="text-red-400 text-xs font-mono mt-4 text-center animate-pulse">{searchError}</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
