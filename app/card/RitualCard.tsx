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
  UR: 'UR', SSR: 'SSR', SR: 'SR', R: 'R', common: 'C',
};

const RARITY_COLOR: Record<Rarity, { bg: string; fg: string }> = {
  UR:     { bg: 'linear-gradient(120deg,#ff5fb8,#ffd84a,#5fffb8,#5fb8ff,#ff5fb8)', fg: '#0a0e0d' },
  SSR:    { bg: 'linear-gradient(120deg,#ffd84a,#ff8a3d,#ffd84a)', fg: '#0a0e0d' },
  SR:     { bg: 'linear-gradient(120deg,#c4b5fd,#a78bfa)', fg: '#0a0e0d' },
  R:      { bg: '#40FFAF', fg: '#0a0e0d' },
  common: { bg: '#1a1f1d', fg: '#9aa39e' },
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
  repScore?: number;
  artist?: string;
  network?: string;
  mintDate?: string;
  social?: string;
  contributions?: Contribution[];
}

const TypeIcon = ({ type, size = 18 }: { type: string; size?: number }) => {
  const s = size;
  const stroke = '#0a0e0d';
  const sw = Math.max(1.4, s / 14);
  switch (type) {
    case 'builder':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5l1.3 1.6 2-.5.4 2 1.9.8-.5 2 1.4 1.6-1.4 1.6.5 2-1.9.8-.4 2-2-.5L12 15.5l-1.3-1.6-2 .5-.4-2-1.9-.8.5-2L5.5 8l1.4-1.6-.5-2 1.9-.8.4-2 2 .5L12 2.5z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <circle cx="12" cy="9" r="2.2" fill={stroke}/>
        </svg>
      );
    case 'artist':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M15 3l6 6-9 9-5 1 1-5 7-7z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <path d="M13 5l6 6" stroke={stroke} strokeWidth={sw}/>
          <path d="M7 14l3 3" stroke={stroke} strokeWidth={sw}/>
        </svg>
      );
    case 'threadoor':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 7c4 0 4 4 8 4s4-4 8-4" stroke="currentColor" strokeWidth={sw * 1.3} strokeLinecap="round"/>
          <path d="M4 12c4 0 4 4 8 4s4-4 8-4" stroke="currentColor" strokeWidth={sw * 1.3} strokeLinecap="round"/>
          <path d="M4 17c4 0 4 4 8 4s4-4 8-4" stroke="currentColor" strokeWidth={sw * 1.3} strokeLinecap="round"/>
        </svg>
      );
    case 'yapper':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M3 5h18v11H10l-4 4v-4H3V5z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <circle cx="9" cy="10.5" r="1" fill={stroke}/>
          <circle cx="12" cy="10.5" r="1" fill={stroke}/>
          <circle cx="15" cy="10.5" r="1" fill={stroke}/>
        </svg>
      );
    case 'event-enjoyoor':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 20l9-15 2 4-9 11z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <rect x="16" y="4" width="3" height="3" fill="currentColor" stroke={stroke} strokeWidth={sw * 0.8}/>
          <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke={stroke} strokeWidth={sw * 0.8}/>
        </svg>
      );
    case 'moderator':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5l8-3z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke={stroke} strokeWidth={sw * 1.2} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'event-manager':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="1.5" fill="currentColor" stroke={stroke} strokeWidth={sw}/>
          <path d="M3 10h18" stroke={stroke} strokeWidth={sw}/>
          <path d="M8 3v4M16 3v4" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
          <path d="M11 14h4l-1 1.5L15 17h-4v-3z" fill={stroke}/>
        </svg>
      );
    case 'team':
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
          <circle cx="3" cy="8" r="1.4" fill={stroke}/>
          <circle cx="21" cy="8" r="1.4" fill={stroke}/>
          <circle cx="12" cy="5" r="1.4" fill={stroke}/>
        </svg>
      );
  }
};

export const RitualMark = ({ size = 14, color = '#40FFAF' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M12 5l6 11H6l6-11z" stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="13" r="1.6" fill={color}/>
  </svg>
);

const PfpPlaceholder = ({ seed = 'ritual', palette }: { seed?: string; palette?: string[] }) => {
  const hash = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }, [seed]);

  const rng = (i: number) => ((hash >> i) & 0xff) / 255;
  const c1 = palette?.[0] || '#40FFAF';
  const c2 = palette?.[1] || '#0a0e0d';
  const c3 = palette?.[2] || '#f9a8d4';

  const cells: { x: number; y: number; alt: boolean }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const v = rng((y * 3 + x) % 30);
      if (v > 0.45) cells.push({ x, y, alt: v > 0.75 });
    }
  }
  const uid = `pfp-${hash}`;

  return (
    <svg viewBox="0 0 50 50" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id={uid} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={c1} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <rect width="50" height="50" fill={`url(#${uid})`}/>
      <circle cx={10 + rng(1) * 30} cy={10 + rng(2) * 15} r={3 + rng(3) * 4} fill={c3} opacity="0.7"/>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={10 + c.x * 6} y={14 + c.y * 5} width="6" height="5" fill={c.alt ? c3 : '#0a0e0d'}/>
          <rect x={34 - c.x * 6} y={14 + c.y * 5} width="6" height="5" fill={c.alt ? c3 : '#0a0e0d'}/>
        </g>
      ))}
      <rect x="0" y="44" width="50" height="6" fill="#0a0e0d" opacity="0.6"/>
    </svg>
  );
};

const ContribRow = ({ item, accent }: { item: Contribution; accent: string }) => (
  <div className="rc-contrib">
    <div className="rc-contrib-icon" style={{ background: accent }}>
      <span style={{ color: '#0a0e0d', fontSize: '11px', fontWeight: 900, letterSpacing: '-0.02em' }}>
        {item.icon || '◆'}
      </span>
    </div>
    <div className="rc-contrib-body">
      <div className="rc-contrib-title">{item.title}</div>
      {item.flavor && <div className="rc-contrib-flavor">{item.flavor}</div>}
    </div>
  </div>
);

export function RitualCard({
  pfpUrl,
  name = 'anon.eth',
  joinDate = 'Mar 2024',
  setNumber = '001/3890',
  type = 'builder',
  rarity = 'common',
  repScore = 0,
  contributions = [],
  artist,
  network = 'Ritual',
  mintDate = 'Apr 12 \'25',
  social = '@anon',
}: CardData) {
  const t = TYPES[type] || TYPES.builder;
  const r = (rarity || 'common') as Rarity;
  const rarityClass = `rc-r-${r.toLowerCase()}`;

  return (
    <div className={`rc-root ${rarityClass}`} style={{ '--accent': t.color, '--accent-soft': t.soft, '--accent-deep': t.deep } as React.CSSProperties}>
      <div className="rc-foil-edge" aria-hidden="true"/>
      <div className="rc-frame">
        {(r === 'SSR' || r === 'UR') && <div className="rc-prism" aria-hidden="true"/>}

        <header className="rc-header">
          <div className="rc-header-left">
            <h2 className="rc-name" title={name}>{name}</h2>
            {r === 'UR' && <span className="rc-ur-badge">UR</span>}
          </div>
          <div className="rc-header-right">
            <span className="rc-rep">{(repScore || 0).toLocaleString()}</span>
            <span className="rc-rep-unit">rep</span>
            <div className="rc-type-circle" style={{ color: t.color }}>
              <TypeIcon type={type} size={20}/>
            </div>
          </div>
        </header>

        <div className="rc-art-wrap">
          <div className="rc-art-inner">
            {pfpUrl
              ? <img src={pfpUrl} alt={name} className="rc-art-img" crossOrigin="anonymous"/>
              : <PfpPlaceholder seed={name} palette={[t.color, t.deep, t.soft]}/>
            }
            {(r === 'SR' || r === 'SSR' || r === 'UR') && (
              <div className="rc-art-holo" aria-hidden="true"/>
            )}
            {(r === 'SSR' || r === 'UR') && (
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
          <span className="rc-cat-dot" style={{ background: t.color }}/>
          <span className="rc-cat-text">
            Ritual <strong>{t.label}</strong> · joined {joinDate}
          </span>
        </div>

        <div className="rc-actions">
          {(contributions.length > 0 ? contributions.slice(0, 2) : [{ title: '—', flavor: 'no contributions logged' }]).map((c, i) => (
            <ContribRow key={i} item={c} accent={t.color}/>
          ))}
        </div>

        <div className="rc-sub">
          <div className="rc-sub-cell">
            <span className="rc-sub-k">network</span>
            <span className="rc-sub-v">{network}</span>
          </div>
          <div className="rc-sub-cell">
            <span className="rc-sub-k">joined</span>
            <span className="rc-sub-v">{mintDate}</span>
          </div>
          <div className="rc-sub-cell">
            <span className="rc-sub-k">social</span>
            <span className="rc-sub-v">
              <svg width="9" height="9" viewBox="0 0 24 24" style={{ marginRight: 3, verticalAlign: '-1px' }}>
                <path d="M18 4h3l-7 8 8 12h-6l-5-7-6 7H2l8-9L2 4h6l4 6 6-6z" fill="currentColor"/>
              </svg>
              {social}
            </span>
          </div>
        </div>

        <footer className="rc-footer">
          <div className="rc-foot-left">
            <RitualMark size={11} color="#40FFAF"/>
            <span className="rc-set-num">{setNumber}</span>
            <span
              className="rc-rarity-badge"
              style={{ background: RARITY_COLOR[r].bg, color: RARITY_COLOR[r].fg }}
            >
              {RARITY_LABEL[r]}
            </span>
          </div>
          <div className="rc-foot-right">
            {artist && <span className="rc-artist">PFP by <strong>{artist}</strong></span>}
          </div>
        </footer>
      </div>
      <div className="rc-grain" aria-hidden="true"/>
    </div>
  );
}
