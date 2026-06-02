'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { animate, stagger } from 'animejs';
import promotions from '@/lib/promotions-june-2026.json';
import promotionAvatars from '@/lib/promotion-avatars.json';
import joinDates from '@/lib/promotion-join-dates.json';

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
  soulsmith: '#FFD700',
  architect: '#3b82f6',
  mage: '#1ABC9C',
  forerunner: '#f59e0b',
  ritty: '#a855f7',      // purple
  bitty: '#3b82f6',      // blue
  contributor: '#555',
};

type FilterType = 'all' | string;
type SearchResult = typeof promotions[0] | 'not-found' | 'idle';

function ResultOverlay({ result, query, onClose }: {
  result: SearchResult;
  query: string;
  onClose: () => void;
}) {
  const isFound = result !== 'not-found' && result !== 'idle';
  const member = isFound ? result as typeof promotions[0] : null;
  const color = member ? ROLE_COLOR[member.toRole] : '#333';
  const avatarUrl = member
    ? (promotionAvatars as Record<string, string>)[member.userId] || getDiscordAvatar(member.userId)
    : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 backdrop-blur-xl" style={{ backgroundColor: '#050505ee' }} />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-3xl mx-4 rounded-3xl overflow-hidden border"
          style={{
            backgroundColor: '#0a0a0a',
            borderColor: isFound ? `${color}44` : '#1a1a1a',
            boxShadow: isFound ? `0 0 80px ${color}22` : 'none',
          }}
        >
          {/* Close */}
          <button onClick={onClose}
            className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: '#555' }}>
            ✕
          </button>

          {isFound && member ? (
            /* ── PROMOTED ── */
            <div className="relative min-h-[420px] flex flex-col md:flex-row">
              {/* Left — color block */}
              <div className="relative md:w-2/5 flex items-end justify-center pt-10 pb-0 md:pb-0 overflow-hidden"
                style={{ background: `linear-gradient(160deg, ${color}18 0%, ${color}08 60%, transparent 100%)` }}>
                {/* Diagonal line accent */}
                <div className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%)`,
                    backgroundSize: '40px 40px',
                  }} />
                <div className="absolute top-0 right-0 w-px h-full opacity-20" style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }} />
                <Image
                  src="/Siggy_01/Face/Girl/Girl_Happy.png"
                  alt="Siggy happy"
                  width={300}
                  height={300}
                  className="relative z-10 drop-shadow-2xl"
                  unoptimized
                />
              </div>

              {/* Right — content */}
              <div className="md:w-3/5 flex flex-col justify-center px-8 py-10">
                <p className="font-mono text-xs tracking-[0.3em] uppercase mb-4" style={{ color: `${color}99` }}>
                  May 2026 Nomination Period
                </p>
                <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight leading-none mb-6"
                  style={{ color }}>
                  Promoted! 🎉
                </h2>

                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-6">
                  {avatarUrl && (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0"
                      style={{ boxShadow: `0 0 0 2px ${color}66` }}>
                      <Image src={avatarUrl} alt={member.displayName} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-lg leading-tight">{member.displayName}</p>
                    <p className="font-mono text-sm" style={{ color: '#555' }}>@{member.username}</p>
                  </div>
                </div>

                {/* Role change */}
                <div className="flex items-center gap-3 mb-8">
                  <RoleBadge role={member.fromRole} size="md" />
                  <span className="text-2xl" style={{ color: '#333' }}>→</span>
                  <RoleBadge role={member.toRole} size="md" />
                </div>

                <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
                  Your dedication to Ritual has been recognized. Welcome to the next level. 🌟
                </p>
              </div>
            </div>
          ) : (
            /* ── NOT PROMOTED ── */
            <div className="relative min-h-[400px] flex flex-col md:flex-row">
              {/* Left */}
              <div className="relative md:w-2/5 flex items-end justify-center pt-10 overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #1a1a1a 0%, transparent 100%)' }}>
                <div className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)`,
                    backgroundSize: '40px 40px',
                  }} />
                <Image
                  src="/Siggy_01/Face/Girl/Girl_Sad.png"
                  alt="Siggy sad"
                  width={280}
                  height={280}
                  className="relative z-10 drop-shadow-xl opacity-90"
                  unoptimized
                />
              </div>

              {/* Right */}
              <div className="md:w-3/5 flex flex-col justify-center px-8 py-10">
                <p className="font-mono text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#555' }}>
                  May 2026 Nomination Period
                </p>
                <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight leading-none mb-4" style={{ color: '#888' }}>
                  Not This<br />Time...
                </h2>
                <p className="font-semibold text-white mb-1">@{query.replace(/^@/, '')}</p>
                <div className="w-12 h-px mb-6" style={{ backgroundColor: '#333' }} />
                <p className="text-sm leading-relaxed mb-2" style={{ color: '#aaa' }}>
                  Every great Ritualist started somewhere.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#777' }}>
                  Keep showing up, keep contributing — your nomination will come. 🌱
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

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

function formatDays(days: number) {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const y = Math.floor(days / 365);
  const mo = Math.floor((days % 365) / 30);
  return mo > 0 ? `${y}y ${mo}mo` : `${y}y`;
}

function MemberCard({ member, avatarUrl: avatarFromApi }: { member: typeof promotions[0]; avatarUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = imgError ? getDiscordAvatar(member.userId) : (avatarFromApi || getDiscordAvatar(member.userId));
  const color = ROLE_COLOR[member.toRole] || '#fff';
  const joinInfo = (joinDates as Record<string, { daysToPromo: number }>)[member.userId];

  return (
    <div
      className="promo-card group relative flex flex-col rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-default"
      style={{
        backgroundColor: '#0a0a0a',
        borderColor: `${color}55`,
        boxShadow: `0 0 20px ${color}11`,
      }}
    >
      {/* Top: PFP full bleed */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={avatarUrl}
          alt={member.displayName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
          unoptimized
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 50%, #0a0a0a 100%)' }} />
      </div>

      {/* Bottom: info */}
      <div className="px-3 pb-3 -mt-4 relative z-10">
        <p className="font-semibold text-sm truncate text-white leading-tight" title={member.displayName}>
          {member.displayName}
        </p>
        <p className="text-xs truncate mb-2" style={{ color: '#555' }}>@{member.username}</p>
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <RoleBadge role={member.fromRole} />
          <span className="text-[#333] text-xs">→</span>
          <RoleBadge role={member.toRole} />
        </div>
        {joinInfo && (
          <p className="text-[10px] font-mono" style={{ color: '#444' }}>
            {formatDays(joinInfo.daysToPromo)} since join
          </p>
        )}
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
  const [searchResult, setSearchResult] = useState<SearchResult>('idle');
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<{userId:string;username:string;displayName:string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatars(promotionAvatars as Record<string, string>);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleQueryChange(val: string) {
    setQuery(val);
    setSearchResult('idle');
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await fetch(`/api/member?autocomplete=true&username=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      const results = (data.members || data || []).slice(0, 6);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch { setSuggestions([]); }
  }

  function selectSuggestion(m: {username:string;displayName:string}) {
    setQuery(m.username);
    setShowSuggestions(false);
    const found = GENUINE_PROMOS.find(p => p.username.toLowerCase() === m.username.toLowerCase());
    setSearchResult(found ?? 'not-found');
  }

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
      {/* Result Overlay */}
      {searchResult !== 'idle' && (
        <ResultOverlay
          result={searchResult}
          query={query}
          onClose={() => setSearchResult('idle')}
        />
      )}

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
          style={{ background: 'radial-gradient(ellipse, #FFD700 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="hero-line opacity-0 font-mono text-xs tracking-[0.3em] uppercase mb-6"
            style={{ color: '#666' }}>
            May 2026 Nomination Period · Results June 1, 2026
          </p>

          <h1 className="hero-line opacity-0 font-display text-6xl md:text-8xl lg:text-[110px] uppercase tracking-tight leading-none mb-6">
            Are You
          </h1>
          <h1 className="hero-line opacity-0 font-display text-6xl md:text-8xl lg:text-[110px] uppercase tracking-tight leading-none mb-10"
            style={{ color: '#FFD700', WebkitTextStroke: '1px #FFD700' }}>
            Upgraded?
          </h1>

          <p className="hero-line opacity-0 text-lg md:text-xl mb-10"
            style={{ color: '#888' }}>
            {GENUINE_PROMOS.length} members promoted in the May 2026 Nomination Period
          </p>

          {/* Search */}
          <div className="hero-line opacity-0 w-full max-w-lg mx-auto mb-8">
            <div ref={suggestRef} className="relative">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Your Discord username..."
                className="flex-1 px-5 py-3.5 rounded-xl border text-white placeholder:text-[#444] outline-none transition-all"
                style={{ backgroundColor: '#111', borderColor: '#222', fontSize: 15 }}
                onFocusCapture={e => (e.target.style.borderColor = '#FFD700')}
                onBlurCapture={e => (e.target.style.borderColor = '#222')}
                autoComplete="off"
              />
              <button type="submit"
                className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80 whitespace-nowrap"
                style={{ backgroundColor: '#FFD700', color: '#000' }}>
                Check
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border overflow-hidden z-50"
                style={{ backgroundColor: '#111', borderColor: '#222' }}>
                {suggestions.map(s => (
                  <button key={s.username} onMouseDown={() => selectSuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b last:border-0"
                    style={{ borderColor: '#1a1a1a' }}>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#222]">
                      <Image
                        src={s.avatarUrl || `/api/avatar?id=${s.userId}`}
                        alt={s.displayName}
                        fill className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{s.displayName}</div>
                      <div className="text-xs truncate" style={{ color: '#555' }}>@{s.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>

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
        <div className="flex flex-wrap justify-center gap-4 mb-14">
          {ALL_TO_ROLES.map(role => {
            const count = GENUINE_PROMOS.filter(m => m.toRole === role).length;
            const color = ROLE_COLOR[role];
            return (
              <div key={role} className="relative rounded-2xl p-6 border overflow-hidden text-center"
                style={{ borderColor: `${color}33`, backgroundColor: '#0a0a0a', minWidth: '140px' }}>
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
