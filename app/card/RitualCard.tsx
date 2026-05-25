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
  UR: 'ULTRA RARE', SSR: 'SUPER RARE', SR: 'RARE', R: 'UNCOMMON', common: 'COMMON',
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
  const stroke = '#0a0e0d';
  const sw = Math.max(1.4, s / 14);
  switch (type) {
    case 'builder':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2.5l1.3 1.6 2-.5.4 2 1.9.8-.5 2 1.4 1.6-1.4 1.6.5 2-1.9.8-.4 2-2-.5L12 15.5l-1.3-1.6-2 .5-.4-2-1.9-.8.5-2L5.5 8l1.4-1.6-.5-2 1.9-.8.4-2 2 .5L12 2.5z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="12" cy="9" r="2.2" fill={stroke}/></svg>;
    case 'artist':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15 3l6 6-9 9-5 1 1-5 7-7z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M13 5l6 6M7 14l3 3" stroke={stroke} strokeWidth={sw}/></svg>;
    case 'threadoor':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 7c4 0 4 4 8 4s4-4 8-4" stroke="currentColor" strokeWidth={sw*1.3} strokeLinecap="round"/><path d="M4 12c4 0 4 4 8 4s4-4 8-4" stroke="currentColor" strokeWidth={sw*1.3} strokeLinecap="round"/><path d="M4 17c4 0 4 4 8 4s4-4 8-4" stroke="currentColor" strokeWidth={sw*1.3} strokeLinecap="round"/></svg>;
    case 'yapper':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 5h18v11H10l-4 4v-4H3V5z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="9" cy="10.5" r="1" fill={stroke}/><circle cx="12" cy="10.5" r="1" fill={stroke}/><circle cx="15" cy="10.5" r="1" fill={stroke}/></svg>;
    case 'moderator':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5l8-3z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke={stroke} strokeWidth={sw*1.2} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case 'event-manager':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="1.5" fill="currentColor" stroke={stroke} strokeWidth={sw}/><path d="M3 10h18" stroke={stroke} strokeWidth={sw}/><path d="M8 3v4M16 3v4" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/><path d="M11 14h4l-1 1.5L15 17h-4v-3z" fill={stroke}/></svg>;
    default: // team / crown
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="3" cy="8" r="1.4" fill={stroke}/><circle cx="21" cy="8" r="1.4" fill={stroke}/><circle cx="12" cy="5" r="1.4" fill={stroke}/></svg>;
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
            {r === 'UR' && <span className="rc-ur-badge">UR</span>}
          </div>
          <div className="rc-header-right">
            <div className="rc-type-circle" style={{ color: t.deep }}>
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
          <div className="rc-sub-cell" style={{ textAlign: 'center' }}>
            <span className="rc-sub-k">rep</span>
            <span className="rc-sub-v" style={{ color: 'var(--rar-hi)' }}>{rep > 0 ? rep.toLocaleString() : '—'}</span>
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
            <span className="rc-rarity-badge" style={RARITY_BADGE_STYLE[r]}>
              {RARITY_LABEL[r]}
            </span>
          </div>
          <div className="rc-foot-right">
            {artist && <span className="rc-artist">art by <strong>{artist}</strong></span>}
          </div>
        </footer>
      </div>
      <div className="rc-grain" aria-hidden="true"/>
    </div>
  );
}
