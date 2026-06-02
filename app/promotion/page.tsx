'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { animate, stagger } from 'animejs';
import promotions from '@/lib/promotions-june-2026.json';

const ROLE_RANK: Record<string, number> = {
  ritualist: 7, soulsmith: 6, architect: 5, mage: 4,
  ritty: 3, bitty: 2, forerunner: 1, contributor: 0,
};

const ROLE_LABEL: Record<string, string> = {
  ritualist: 'Ritualist', soulsmith: 'Soulsmith', architect: 'Architect',
  mage: 'Mage', forerunner: 'Forerunner', ritty: 'ritty', bitty: 'bitty',
  contributor: 'No Role',
};

const ROLE_COLOR: Record<string, string> = {
  ritualist: '#22c55e',  // green
  soulsmith: '#a855f7',
  architect: '#3b82f6',
  mage: '#1ABC9C',
  forerunner: '#f59e0b',
  ritty: '#a855f7',      // purple
  bitty: '#3b82f6',      // blue
  contributor: '#555',
};

type FilterType = 'all' | string;

function getDiscordAvatar(userId: string) {
  const defaultIndex = (BigInt(userId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function RoleBadge({ role, size = 'sm' }: { role: string; size?: 'sm' | 'md' }) {
  const color = ROLE_COLOR[role] || '#555';
  return (
    <span
      className={`font-mono rounded-full border ${size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'}`}
      style={{ color, borderColor: color, backgroundColor: `${color}20` }}
    >
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function MemberCard({ member, avatarUrl: avatarFromApi }: { member: typeof promotions[0]; avatarUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = imgError ? getDiscordAvatar(member.userId) : (avatarFromApi || getDiscordAvatar(member.userId));
  const color = ROLE_COLOR[member.toRole] || '#fff';
  const isTop = ROLE_RANK[member.toRole] >= 3;

  return (
    <div
      className="promo-card group relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-2 cursor-default overflow-hidden"
      style={{
        backgroundColor: '#0a0a0a',
        borderColor: `${color}33`,
        boxShadow: isTop ? `0 0 30px ${color}22, inset 0 1px 0 ${color}22` : `inset 0 1px 0 ${color}11`,
      }}
    >
      {/* Glow bg */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}18 0%, transparent 70%)` }} />

      {/* Top badge */}
      {isTop && (
        <div className="absolute top-3 right-3 text-xs font-bold font-mono px-1.5 py-0.5 rounded"
          style={{ backgroundColor: color, color: '#000' }}>
          ↑
        </div>
      )}

      {/* Avatar */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden"
        style={{ boxShadow: `0 0 0 2px ${color}66, 0 0 16px ${color}44` }}>
        <Image src={avatarUrl} alt={member.displayName} fill className="object-cover"
          onError={() => setImgError(true)} unoptimized />
      </div>

      {/* Name */}
      <div className="text-center min-w-0 w-full">
        <p className="font-semibold text-sm truncate text-white" title={member.displayName}>
          {member.displayName}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: '#666' }}>@{member.username}</p>
      </div>

      {/* Role change */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <RoleBadge role={member.fromRole} />
        <span className="text-[#444] text-xs">→</span>
        <RoleBadge role={member.toRole} />
      </div>
    </div>
  );
}

const VALID_TRANSITIONS = new Set([
  'contributor→bitty',
  'bitty→ritty',
  'ritty→ritualist',
]);

const GENUINE_PROMOS = promotions.filter(
  m => VALID_TRANSITIONS.has(`${m.fromRole}→${m.toRole}`)
);

const ALL_TO_ROLES = [...new Set(GENUINE_PROMOS.map(m => m.toRole))]
  .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);

export default function PromotionPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<typeof promotions[0] | null | 'not-found' | 'idle'>('idle');
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/promotion-avatars').then(r => r.json()).then(setAvatars).catch(() => {});
  }, []);

  // Hero entrance animation
  useEffect(() => {
    if (!heroRef.current) return;
    animate('.hero-line', {
      opacity: [0, 1],
      translateY: [40, 0],
      delay: stagger(120),
      duration: 800,
      easing: 'easeOutExpo',
    });
  }, []);

  // Grid entrance animation when scrolled into view
  useEffect(() => {
    if (!gridRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animate('.promo-card', {
          opacity: [0, 1],
          translateY: [30, 0],
          scale: [0.95, 1],
          delay: stagger(30),
          duration: 500,
          easing: 'easeOutExpo',
        });
        obs.disconnect();
      }
    }, { threshold: 0.05 });
    obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, [filter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return;
    const found = GENUINE_PROMOS.find(
      m => m.username.toLowerCase() === q || m.displayName.toLowerCase() === q
    );
    setSearchResult(found ?? 'not-found');
  }

  function scrollToList() {
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const filtered = (filter === 'all' ? promotions : promotions.filter(m => m.toRole === filter))
    .filter(m => (ROLE_RANK[m.toRole] ?? 0) > (ROLE_RANK[m.fromRole] ?? 0));

  const sorted = [...filtered].sort((a, b) => (ROLE_RANK[b.toRole] ?? 0) - (ROLE_RANK[a.toRole] ?? 0));

  return (
    <div className="bg-[#050505] text-white">

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">

        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />

        {/* Radial glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #a855f7 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="hero-line opacity-0 font-mono text-xs tracking-[0.3em] uppercase mb-6"
            style={{ color: '#666' }}>
            May 2026 Nomination Period · Results June 1, 2026
          </p>

          <h1 className="hero-line opacity-0 font-display text-6xl md:text-8xl lg:text-[110px] uppercase tracking-tight leading-none mb-6">
            Are You
          </h1>
          <h1 className="hero-line opacity-0 font-display text-6xl md:text-8xl lg:text-[110px] uppercase tracking-tight leading-none mb-10"
            style={{ color: '#a855f7', WebkitTextStroke: '1px #a855f7' }}>
            Upgraded?
          </h1>

          <p className="hero-line opacity-0 text-lg md:text-xl mb-10"
            style={{ color: '#888' }}>
            {GENUINE_PROMOS.length} members promoted in the May 2026 Nomination Period
          </p>

          {/* Search */}
          <div className="hero-line opacity-0 w-full max-w-lg mx-auto mb-8">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSearchResult('idle'); }}
                placeholder="Your Discord username..."
                className="flex-1 px-5 py-3.5 rounded-xl border text-white placeholder:text-[#444] outline-none transition-all"
                style={{ backgroundColor: '#111', borderColor: '#222', fontSize: 15 }}
                onFocus={e => (e.target.style.borderColor = '#a855f7')}
                onBlur={e => (e.target.style.borderColor = '#222')}
              />
              <button type="submit"
                className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80 whitespace-nowrap"
                style={{ backgroundColor: '#a855f7', color: '#fff' }}>
                Check
              </button>
            </form>

            {searchResult !== 'idle' && (
              <div className="mt-4 rounded-2xl border overflow-hidden"
                style={{
                  borderColor: searchResult === 'not-found' ? '#1a1a1a' : `${ROLE_COLOR[(searchResult as any).toRole]}44`,
                  backgroundColor: '#0a0a0a',
                }}>
                {searchResult === 'not-found' ? (
                  <div className="flex items-end gap-6 px-6 pt-4 pb-0">
                    <Image
                      src="/Siggy_01/Face/Girl/Girl_Sad.png"
                      alt="Siggy sad"
                      width={100}
                      height={100}
                      className="shrink-0 opacity-90 drop-shadow-lg"
                      unoptimized
                    />
                    <div className="text-left pb-6">
                      <p className="font-display text-2xl uppercase tracking-wide mb-1" style={{ color: '#3a3a3a' }}>
                        Not This Time...
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
                        Every great Ritualist started without a role.<br />
                        Keep showing up. Your nomination is coming. 🌱
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-6 px-6 pt-4 pb-0"
                    style={{ background: `linear-gradient(135deg, ${ROLE_COLOR[(searchResult as any).toRole]}08 0%, transparent 60%)` }}>
                    <Image
                      src="/Siggy_01/Face/Girl/Girl_Happy.png"
                      alt="Siggy happy"
                      width={100}
                      height={100}
                      className="shrink-0 drop-shadow-lg"
                      unoptimized
                    />
                    <div className="text-left pb-6">
                      <p className="font-display text-2xl uppercase tracking-wide mb-2"
                        style={{ color: ROLE_COLOR[(searchResult as any).toRole] }}>
                        Congrats! 🎉
                      </p>
                      <p className="font-semibold text-white mb-3">{(searchResult as any).displayName}</p>
                      <div className="flex items-center gap-3">
                        <RoleBadge role={(searchResult as any).fromRole} size="md" />
                        <span style={{ color: '#444' }}>→</span>
                        <RoleBadge role={(searchResult as any).toRole} size="md" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scroll CTA */}
          <button onClick={scrollToList}
            className="hero-line opacity-0 flex flex-col items-center gap-2 mx-auto transition-colors hover:opacity-70"
            style={{ color: '#555' }}>
            <span className="font-mono text-xs tracking-[0.2em] uppercase">See who&apos;s upgraded</span>
            <span className="text-lg animate-bounce">↓</span>
          </button>
        </div>
      </section>

      {/* ── LIST ── */}
      <div ref={listRef} className="max-w-7xl mx-auto px-4 pb-24 pt-12">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {ALL_TO_ROLES.map(role => {
            const count = GENUINE_PROMOS.filter(m => m.toRole === role).length;
            const color = ROLE_COLOR[role];
            return (
              <div key={role} className="relative rounded-2xl p-6 border overflow-hidden"
                style={{ borderColor: `${color}33`, backgroundColor: '#0a0a0a' }}>
                <div className="absolute inset-0 opacity-10"
                  style={{ background: `radial-gradient(ellipse at 50% 100%, ${color} 0%, transparent 70%)` }} />
                <p className="relative text-4xl font-display" style={{ color }}>{count}</p>
                <p className="relative text-sm mt-1 font-mono" style={{ color: '#666' }}>{ROLE_LABEL[role]}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {(['all', ...ALL_TO_ROLES] as string[]).map(role => {
            const active = filter === role;
            const color = role === 'all' ? '#fff' : ROLE_COLOR[role];
            const count = role === 'all' ? GENUINE_PROMOS.length : GENUINE_PROMOS.filter(m => m.toRole === role).length;
            return (
              <button key={role} onClick={() => setFilter(role)}
                className="px-5 py-2 rounded-full text-sm font-mono border transition-all"
                style={{
                  borderColor: active ? color : '#222',
                  backgroundColor: active ? color : 'transparent',
                  color: active ? '#000' : '#555',
                }}>
                {role === 'all' ? 'All' : ROLE_LABEL[role]} ({count})
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sorted.map(member => (
            <MemberCard key={member.userId} member={member} avatarUrl={avatars[member.userId]} />
          ))}
        </div>
      </div>
    </div>
  );
}
