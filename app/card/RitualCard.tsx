'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { ABILITIES, PASSIVES } from '@/lib/abilities';

export const TYPES: Record<string, { label: string; color: string; soft: string; deep: string }> = {
  builder:          { label: 'Builder',        color: '#f59e0b', soft: '#fbbf24', deep: '#78350f' },
  artist:           { label: 'Artist',         color: '#ec4899', soft: '#f9a8d4', deep: '#831843' },
  threadoor:        { label: 'Threadoor',      color: '#22d3ee', soft: '#67e8f9', deep: '#155e75' },
  yapper:           { label: 'Yapper',         color: '#fb923c', soft: '#fdba74', deep: '#7c2d12' },
  'event-enjoyoor': { label: 'Event Enjoyoor', color: '#a3e635', soft: '#bef264', deep: '#365314' },
  moderator:        { label: 'Moderator',      color: '#94a3b8', soft: '#cbd5e1', deep: '#334155' },
  'event-manager':  { label: 'Event Manager',  color: '#a855f7', soft: '#c4b5fd', deep: '#4c1d95' },
  team:             { label: 'Team',           color: '#40FFAF', soft: '#7affc6', deep: '#0b4d33' },
  ambassador:       { label: 'Ambassador',     color: '#f43f5e', soft: '#fb7185', deep: '#881337' },
};

export const RARITY_OPTIONS = ['UR', 'SSR', 'SR', 'R', 'common'] as const;
export type Rarity = typeof RARITY_OPTIONS[number];

export const RARITY_LABEL: Record<Rarity, string> = {
  UR: 'ULTRA RARE', SSR: 'SS RARE', SR: 'SUPER RARE', R: 'RARE', common: 'COMMON',
};

const RARITY_STARS: Record<Rarity, string> = {
  UR: '★★★★★', SSR: '★★★★', SR: '★★★', R: '★★', common: '★',
};

const RARITY_BADGE_STYLE: Record<Rarity, React.CSSProperties> = {
  UR:     { background: 'linear-gradient(120deg,#ff5fb8,#ffd84a,#5fffb8,#5fb8ff)', color: '#0a0e0d' },
  SSR:    { background: 'linear-gradient(120deg,#FFD700,#FFA500)', color: '#0a0800' },
  SR:     { background: 'linear-gradient(120deg,#c084fc,#7c3aed)', color: '#fff' },
  R:      { background: 'linear-gradient(120deg,#60a5fa,#1d4ed8)', color: '#fff' },
  common: { background: 'linear-gradient(120deg,#40FFAF,#077345)', color: '#0a0e0d' },
};

export interface Contribution {
  icon?: string;
  title: string;
  flavor?: string;
}

export interface CardData {
  pfpUrl?: string;
  name?: string;
  userId?: string;
  joinDate?: string;
  setNumber?: string;
  type?: string;
  rarity?: Rarity;
  contributions?: Contribution[];
  artist?: string;
  social?: string;
  socialPlatform?: 'x' | 'discord';
  network?: string;
  rep?: number;
  atk?: number;
  def?: number;
  spd?: number;
}

/* ── Type icons ── */
const TypeIcon = ({ type, size = 18 }: { type: string; size?: number }) => {
  const s = size;
  const sw = Math.max(1.5, s / 12);
  const p = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'builder':
      return <svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    case 'artist':
      return <svg {...p}><circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
    case 'threadoor':
      return <svg {...p}><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>;
    case 'yapper':
      return <svg {...p}><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>;
    case 'event-enjoyoor':
      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'moderator':
      return <svg {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'event-manager':
      return <svg {...p}><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>;
    case 'team':
      return <svg {...p}><path d="M4 17L3 7l5.5 4L12 4l3.5 7L21 7l-1 10H4z"/><path d="M9 17v4M15 17v4"/></svg>;
    case 'ambassador':
      return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>;
    default:
      return <svg {...p}><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>;
  }
};

export const RitualMark = ({ size = 14, color = '#40FFAF' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M12 5l6 11H6l6-11z" stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="13" r="1.6" fill={color}/>
  </svg>
);

/* ── Pixel-art placeholder ── */
const PfpPlaceholder = ({ seed = 'ritual', typeColor }: { seed?: string; typeColor: string }) => {
  const hash = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }, [seed]);
  const rng = (i: number) => ((hash >> i) & 0xff) / 255;
  const cells: { x: number; y: number; alt: boolean }[] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++) {
      const v = rng((y * 3 + x) % 30);
      if (v > 0.45) cells.push({ x, y, alt: v > 0.75 });
    }
  const uid = `pfp-${hash}`;
  return (
    <svg viewBox="0 0 50 50" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id={uid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={typeColor} stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#050a07"/>
        </linearGradient>
      </defs>
      <rect width="50" height="50" fill={`url(#${uid})`}/>
      <circle cx={10 + rng(1)*30} cy={10 + rng(2)*15} r={3 + rng(3)*4} fill="#fff" opacity="0.25"/>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={10+c.x*6} y={14+c.y*5} width="6" height="5" fill={c.alt ? typeColor : '#0a0e0d'}/>
          <rect x={34-c.x*6} y={14+c.y*5} width="6" height="5" fill={c.alt ? typeColor : '#0a0e0d'}/>
        </g>
      ))}
      <rect x="0" y="44" width="50" height="6" fill="#0a0e0d" opacity="0.6"/>
    </svg>
  );
};

const ContribRow = ({ item }: { item: { icon?: React.ReactNode | string; title: string; flavor?: string; tag?: string } }) => (
  <div className="rc-contrib">
    <div className="rc-contrib-icon">
      <span style={{ fontSize: '10px', fontWeight: 900 }}>{item.icon || '◆'}</span>
    </div>
    <div className="rc-contrib-body">
      <div className="rc-contrib-title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {item.tag && (
          <span style={{
            fontSize: '6.5px', fontWeight: 900, letterSpacing: '0.1em',
            padding: '1px 3px', borderRadius: 3,
            background: item.tag === 'PSV' ? 'rgba(255,255,255,0.12)' : 'var(--rar-hi)',
            color: item.tag === 'PSV' ? 'rgba(255,255,255,0.55)' : '#0a0e0d',
            flexShrink: 0,
          }}>{item.tag}</span>
        )}
        {item.title}
      </div>
      {item.flavor && <div className="rc-contrib-flavor">{item.flavor}</div>}
    </div>
  </div>
);

/* ── Deterministic passive pick from userId — SR/SSR/UR only, scaled per tier ── */
function pickPassive(userId?: string, rarity?: string): { name: string; effect: string } | null {
  if (!PASSIVES.length) return null;
  const tier = rarity?.toLowerCase();
  if (tier !== 'sr' && tier !== 'ssr' && tier !== 'ur') return null;
  let h = 2166136261 >>> 0;
  const seed = userId || 'anon';
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const passive = PASSIVES[h % PASSIVES.length];
  return { name: passive.name, effect: passive[tier] };
}

/* ── Main card ── */
export function RitualCard({
  pfpUrl,
  name = 'anon.ritual',
  userId,
  joinDate = 'Mar 2024',
  setNumber = '001/3890',
  type = 'builder',
  rarity = 'common',
  contributions = [],
  artist,
  social = '@anon',
  socialPlatform = 'discord',
  network = 'Ritual',
  rep = 0,
  atk,
  def,
  spd,
}: CardData) {
  const t = TYPES[type] || TYPES.builder;
  const r = (rarity || 'common') as Rarity;
  const rarityClass = `rc-r-${r.toLowerCase()}`;

  const showHolo = r === 'SR' || r === 'SSR' || r === 'UR';
  const showSparks = r === 'SSR' || r === 'UR';
  const showPrism = r === 'SSR' || r === 'UR';

  const [flipped, setFlipped] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Extract dominant hue from PFP → dark tinted frame bg for SSR/UR
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !pfpUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // skip near-white and near-black pixels — they wash out the hue
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness < 20 || brightness > 235) continue;
          rSum += data[i]; gSum += data[i+1]; bSum += data[i+2]; count++;
        }
        if (count === 0) return;
        const r8 = rSum/count, g8 = gSum/count, b8 = bSum/count;
        // RGB → HSL
        const r1 = r8/255, g1 = g8/255, b1 = b8/255;
        const max = Math.max(r1,g1,b1), min = Math.min(r1,g1,b1), d = max - min;
        let h = 0;
        if (d > 0) {
          if (max === r1) h = ((g1-b1)/d + 6) % 6;
          else if (max === g1) h = (b1-r1)/d + 2;
          else h = (r1-g1)/d + 4;
          h = Math.round(h * 60);
        }
        // Dark saturated frame: hue from PFP, sat 50%, lightness 8% and 13%
        el.style.setProperty('--pfp-bg-a', `hsl(${h},50%,8%)`);
        el.style.setProperty('--pfp-bg-b', `hsl(${h},45%,13%)`);
      } catch { /* CORS blocked — fall back to rarity defaults */ }
    };
    img.src = pfpUrl;
  }, [pfpUrl, r]);

  // Spring state — same stiffness/damping as poke-holo
  const springRef = useRef({
    rotate:  { x: 0,  y: 0,  vx: 0, vy: 0  },
    glare:   { x: 50, y: 50, o: 0,  vx: 0,  vy: 0, vo: 0 },
    bg:      { x: 50, y: 50, vx: 0, vy: 0  },
  });
  const targetRef = useRef({
    rotate:  { x: 0,  y: 0  },
    glare:   { x: 50, y: 50, o: 0 },
    bg:      { x: 50, y: 50 },
  });
  const rafRef = useRef<number | null>(null);

  const runSpring = useCallback(() => {
    const S = 0.066, D = 0.25; // stiffness, damping — poke-holo values
    const s = springRef.current;
    const t = targetRef.current;
    const el = innerRef.current;
    if (!el) return;

    let dirty = false;

    const tick = (sp: { x: number; y: number; vx: number; vy: number }, tg: { x: number; y: number }) => {
      sp.vx += (tg.x - sp.x) * S; sp.vx *= (1 - D); sp.x += sp.vx;
      sp.vy += (tg.y - sp.y) * S; sp.vy *= (1 - D); sp.y += sp.vy;
      if (Math.abs(sp.vx) + Math.abs(sp.vy) > 0.001) dirty = true;
    };
    tick(s.rotate, t.rotate);
    tick(s.glare,  t.glare);
    tick(s.bg,     t.bg);

    // opacity spring
    s.glare.vo += (t.glare.o - s.glare.o) * S; s.glare.vo *= (1 - D); s.glare.o += s.glare.vo;
    if (Math.abs(s.glare.vo) > 0.001) dirty = true;

    // apply to DOM
    const gx = s.glare.x, gy = s.glare.y, o = s.glare.o;
    const fc = Math.min(1, Math.sqrt((gx/100 - 0.5) ** 2 + (gy/100 - 0.5) ** 2) / 0.5);
    el.style.setProperty('--pointer-x',          `${gx}%`);
    el.style.setProperty('--pointer-y',          `${gy}%`);
    el.style.setProperty('--pointer-from-left',  String(gx / 100));
    el.style.setProperty('--pointer-from-top',   String(gy / 100));
    el.style.setProperty('--pointer-from-center',String(fc));
    el.style.setProperty('--background-x',       `${s.bg.x}%`);
    el.style.setProperty('--background-y',       `${s.bg.y}%`);
    el.style.setProperty('--card-opacity',       String(o));
    el.style.transform = `rotateY(${s.rotate.x}deg) rotateX(${s.rotate.y}deg)`;

    rafRef.current = dirty ? requestAnimationFrame(runSpring) : null;
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (flipped) return;
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const my = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const t = targetRef.current;
    t.rotate.x = (mx - 0.5) * 100 / 3.5;
    t.rotate.y = -(my - 0.5) * 100 / 3.5;
    t.glare.x  = mx * 100;
    t.glare.y  = my * 100;
    t.glare.o  = 1;
    t.bg.x     = 37 + mx * 26;
    t.bg.y     = 37 + my * 26;
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(runSpring);
  };

  const onMouseLeave = () => {
    const t = targetRef.current;
    t.rotate.x = 0; t.rotate.y = 0;
    t.glare.x  = 50; t.glare.y = 50; t.glare.o = 0;
    t.bg.x     = 50; t.bg.y = 50;
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(runSpring);
  };

  // cleanup rAF on unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, [runSpring]);

  const ability  = ABILITIES[type] || null;
  const passive  = pickPassive(userId, r);

  // Row 1: active ability (type-based), Row 2: passive (userId-hash)
  const displayContribs: { icon?: React.ReactNode | string; title: string; flavor?: string; tag?: string; empty?: boolean }[] = [];
  if (ability) {
    displayContribs.push({ icon: <TypeIcon type={type} size={11}/> as unknown as string, title: ability.name, flavor: ability.effect, tag: 'Active' });
  }
  if (passive) {
    displayContribs.push({ icon: '◈', title: passive.name, flavor: passive.effect, tag: 'Passive' });
  } else {
    displayContribs.push({ empty: true, title: '' });
  }

  const cardStyle = { '--accent': t.color } as React.CSSProperties;

  return (
    <div
      className="rc-flip-wrap"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={innerRef}
        className={`rc-flip-inner${flipped ? ' is-flipped' : ''}`}
        onClick={() => setFlipped(f => !f)}
      >
        {/* ── Front face ── */}
        <div className={`rc-root rc-flip-front ${rarityClass}`} style={cardStyle}>
          <div className="rc-foil-edge" aria-hidden="true"/>
          <div className="rc-frame" ref={frameRef}>
            {/* texture + watermark — always present, very subtle */}
            <div className="rc-frame-texture" aria-hidden="true"/>
            <div className="rc-watermark" aria-hidden="true">
              <div className="rc-watermark-inner">
                <img src="/Logo_RItual_White.png" className="rc-wm-mark rc-wm-mark-center" alt=""/>
              </div>
            </div>
            {showPrism && <div className="rc-prism" aria-hidden="true"/>}

            <header className="rc-header">
              <div className="rc-header-left">
                <div className="rc-name-wrap" title={name}>
                  {(r === 'SSR' || r === 'UR') && (
                    <span className="rc-name-stroke" aria-hidden="true">{name}</span>
                  )}
                  <h2 className="rc-name">{name}</h2>
                </div>
                {r !== 'common' && <span className={`rc-rar-badge rc-rar-badge-${r.toLowerCase()}`}>{r}</span>}
              </div>
              <div className="rc-header-right">
                {rep > 0 && (r !== 'SSR' && r !== 'UR') && (
                  <div className="rc-rep">
                    <span className="rc-rep-label">REP</span>
                    <span className="rc-rep-val">{rep}</span>
                  </div>
                )}
                <div className="rc-type-circle" style={{ color: '#0a0e0d' }}>
                  <TypeIcon type={type} size={18}/>
                </div>
              </div>
            </header>

            {/* REP floats outside header for SSR/UR — doesn't affect header height */}
            {rep > 0 && (r === 'SSR' || r === 'UR') && (
              <div className="rc-rep-float">
                <span className="rc-rep-label">
                  <span className="rc-rep-stroke" aria-hidden="true">REP</span>
                  REP
                </span>
                <span className="rc-rep-val">
                  <span className="rc-rep-stroke" aria-hidden="true">{rep}</span>
                  {rep}
                </span>
              </div>
            )}

            <div className="rc-art-wrap">
              <div className="rc-art-inner">
                {pfpUrl
                  ? <img src={pfpUrl} alt={name} className="rc-art-img" crossOrigin="anonymous"/>
                  : <PfpPlaceholder seed={name} typeColor={t.color}/>
                }
                {showHolo && <div className="rc-art-holo" aria-hidden="true"/>}
                {showSparks && (
                  <>
                    <span className="rc-spark rc-spark-tl">✦</span>
                    <span className="rc-spark rc-spark-tr">✦</span>
                    <span className="rc-spark rc-spark-bl">✦</span>
                    <span className="rc-spark rc-spark-br">✦</span>
                  </>
                )}
              </div>
            </div>

            <div className="rc-category">
              <span className="rc-cat-dot"/>
              <span className="rc-cat-text">
                Ritual <strong>{t.label}</strong>
              </span>
            </div>

            <div className="rc-actions">
              {displayContribs.map((c, i) => (
                c.empty
                  ? <div key={i} className="rc-contrib-empty"/>
                  : <ContribRow key={i} item={c}/>
              ))}
            </div>

            <div className="rc-stats">
              <div className="rc-stat-cell">
                <span className="rc-stat-k">ATK</span>
                <span className="rc-stat-v">{atk ?? 0}</span>
              </div>
              <div className="rc-stat-cell rc-stat-def">
                <span className="rc-stat-k">DEF</span>
                <span className="rc-stat-v">{def ?? 0}</span>
              </div>
              <div className="rc-stat-cell rc-stat-spd">
                <span className="rc-stat-k">SPD</span>
                <span className="rc-stat-v">{spd ?? 0}</span>
              </div>
            </div>

            <div className="rc-sub">
              <div className="rc-sub-cell">
                <span className="rc-sub-k">joined</span>
                <span className="rc-sub-v" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {joinDate}
                </span>
              </div>
              <div className="rc-sub-cell">
                <span className="rc-sub-k">network</span>
                <span className="rc-sub-v" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {network}
                </span>
              </div>
              <div className="rc-sub-cell">
                <span className="rc-sub-k">social</span>
                <span className="rc-sub-v" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {socialPlatform === 'x'
                    ? <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M18 4h3l-7 8 8 12h-6l-5-7-6 7H2l8-9L2 4h6l4 6 6-6z"/></svg>
                    : <svg width="9" height="9" viewBox="0 0 127.14 96.36" fill="currentColor" style={{ flexShrink: 0 }}><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                  }
                  {social?.replace('@', '')}
                </span>
              </div>
            </div>

            <footer className="rc-footer">
              <div className="rc-foot-left">
                <img src="/Logo_RItual_White.png" alt="" className="rc-foot-logo"/>
                {setNumber && <span className="rc-set-num">{setNumber}</span>}
                <span className="rc-rarity-badge" style={RARITY_BADGE_STYLE[r]}>
                  {RARITY_LABEL[r]}
                </span>
              </div>
              <div className="rc-foot-right">
                <span className="rc-rar-stars">{RARITY_STARS[r]}</span>
                {artist && <span className="rc-artist">art by <strong>{artist}</strong></span>}
              </div>
            </footer>
          </div>

          {/* Holographic foil overlay — reacts to --mx / --my */}
          <div className="rc-holo" aria-hidden="true"/>
          <div className="rc-glare" aria-hidden="true"/>
          <div className="rc-grain" aria-hidden="true"/>
          <div className="rc-copyright" aria-hidden="true">2026 Ritual TCG · Made by Decka-chan</div>
        </div>

        {/* ── Back face — same for all rarities (Pokémon-style) ── */}
        <div className="rc-back">
          <div className="rc-back-foil" aria-hidden="true"/>
          <div className="rc-back-frame">
            <div className="rc-back-pattern" aria-hidden="true"/>
            <div className="rc-back-glow" aria-hidden="true"/>
            <div className="rc-back-content">
              <img src="/Logo_RItual_White.png" alt="Ritual" className="rc-back-mark"/>
              <div className="rc-back-title">RITUAL TCG</div>
              <div className="rc-back-divider"/>
            </div>
          </div>
          <div className="rc-grain" aria-hidden="true"/>
          <div className="rc-copyright" aria-hidden="true">2026 Ritual TCG · Made by Decka-chan</div>
        </div>
      </div>
    </div>
  );
}
