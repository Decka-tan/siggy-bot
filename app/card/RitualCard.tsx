'use client';

import { useId, useMemo } from 'react';

export const TYPES: Record<string, { label: string; color: string; soft: string; deep: string }> = {
  builder:          { label: 'Builder',        color: '#f59e0b', soft: '#fbbf24', deep: '#78350f' },
  artist:           { label: 'Artist',         color: '#ec4899', soft: '#f9a8d4', deep: '#831843' },
  threadoor:        { label: 'Threadoor',      color: '#22d3ee', soft: '#67e8f9', deep: '#155e75' },
  yapper:           { label: 'Yapper',         color: '#fb923c', soft: '#fdba74', deep: '#7c2d12' },
  'event-enjoyoor': { label: 'Event Enjoyoor', color: '#a3e635', soft: '#bef264', deep: '#365314' },
  moderator:        { label: 'Moderator',      color: '#94a3b8', soft: '#cbd5e1', deep: '#334155' },
  'event-manager':  { label: 'Event Manager',  color: '#a855f7', soft: '#c4b5fd', deep: '#4c1d95' },
  team:             { label: 'Team',           color: '#40FFAF', soft: '#7affc6', deep: '#0b4d33' },
};

export const RARITY_OPTIONS = ['UR', 'SSR', 'SR', 'R', 'common'] as const;
export type Rarity = typeof RARITY_OPTIONS[number];

export const RARITY_LABEL: Record<Rarity, string> = {
  UR: 'ULTRA RARE', SSR: 'SS RARE', SR: 'SUPER RARE', R: 'RARE', common: 'COMMON',
};

const RARITY_STARS: Record<Rarity, string> = {
  UR: '★★★★', SSR: '★★★', SR: '★★', R: '★', common: '●',
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
  joinDate?: string;
  setNumber?: string;
  type?: string;
  rarity?: Rarity;
  contributions?: Contribution[];
  artist?: string;
  social?: string;
  network?: string;
  rep?: number;
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
    default: // team - crown
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

const ContribRow = ({ item, accent }: { item: Contribution; accent: string }) => (
  <div className="rc-contrib">
    <div className="rc-contrib-icon" style={{ background: accent }}>
      <span style={{ color: '#0a0e0d', fontSize: '10px', fontWeight: 900 }}>{item.icon || '◆'}</span>
    </div>
    <div className="rc-contrib-body">
      <div className="rc-contrib-title">{item.title}</div>
      {item.flavor && <div className="rc-contrib-flavor">{item.flavor}</div>}
    </div>
  </div>
);

/* ── Main card ── */
export function RitualCard({
  pfpUrl,
  name = 'anon.ritual',
  joinDate = 'Mar 2024',
  setNumber = '001/3890',
  type = 'builder',
  rarity = 'common',
  contributions = [],
  artist,
  social = '@anon',
  network = 'Ritual',
  rep = 0,
}: CardData) {
  const t = TYPES[type] || TYPES.builder;
  const r = (rarity || 'common') as Rarity;
  const rarityClass = `rc-r-${r.toLowerCase()}`;

  const showHolo = r === 'SR' || r === 'SSR' || r === 'UR';
  const showSparks = r === 'SSR' || r === 'UR';
  const showPrism = r === 'SSR' || r === 'UR';

  const displayContribs = contributions.length > 0
    ? contributions.slice(0, 2)
    : [{ icon: '◆', title: '—', flavor: '' }];

  return (
    <div className={`rc-root ${rarityClass}`} style={{ '--accent': t.color } as React.CSSProperties}>
      <div className="rc-foil-edge" aria-hidden="true"/>
      <div className="rc-frame">
        {showPrism && <div className="rc-prism" aria-hidden="true"/>}

        {/* ── Header: name + type only ── */}
        <header className="rc-header">
          <div className="rc-header-left">
            <h2 className="rc-name" title={name}>{name}</h2>
            {r !== 'common' && <span className={`rc-rar-badge rc-rar-badge-${r.toLowerCase()}`}>{r}</span>}
          </div>
          <div className="rc-header-right">
            {rep > 0 && (
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

        {/* ── Art window ── */}
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

        {/* ── Category bar ── */}
        <div className="rc-category">
          <span className="rc-cat-dot"/>
          <span className="rc-cat-text">
            Ritual <strong>{t.label}</strong>
          </span>
        </div>

        {/* ── Contributions ── */}
        <div className="rc-actions">
          {displayContribs.map((c, i) => (
            <ContribRow key={i} item={c} accent={t.color}/>
          ))}
        </div>

        {/* ── Sub-strip: live data only ── */}
        <div className="rc-sub">
          <div className="rc-sub-cell">
            <span className="rc-sub-k">joined</span>
            <span className="rc-sub-v">{joinDate}</span>
          </div>
          <div className="rc-sub-cell">
            <span className="rc-sub-k">network</span>
            <span className="rc-sub-v">{network}</span>
          </div>
          <div className="rc-sub-cell">
            <span className="rc-sub-k">social</span>
            <span className="rc-sub-v" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M18 4h3l-7 8 8 12h-6l-5-7-6 7H2l8-9L2 4h6l4 6 6-6z"/></svg>
              {social?.replace('@', '')}
            </span>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="rc-footer">
          <div className="rc-foot-left">
            <RitualMark size={10} color="var(--rar-hi, #40FFAF)"/>
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
      <div className="rc-grain" aria-hidden="true"/>
    </div>
  );
}
