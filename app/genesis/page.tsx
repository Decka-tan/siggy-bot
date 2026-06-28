'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { animate, stagger } from 'animejs';

type Holder = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string | null;
  topRole: string | null;
  fallbackRole?: string | null;
};

type Payload = {
  updatedAt: number;
  badge: string;
  count: number;
  holders: Holder[];
};

type Activity = {
  contributions?: number;
  eventsWon?: number;
  eventsHosted?: number;
};

// Order matters — drives filter-pill order and color lookup priority.
const ROLE_RANK: Record<string, number> = {
  'Radiant Ritualist': 9,
  Zealot: 8,
  Ritualist: 7,
  Mage: 4,
  ritty: 3,
  bitty: 2,
  Forerunner: 1,
  Initiate: 0.5,
  Blessed: 0.3,
  Harmonic: 0.2,
  Cursed: 0.1,
};

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#FFD700',
  Zealot: '#ef4444',
  Ritualist: '#22c55e',
  Mage: '#1ABC9C',
  ritty: '#a855f7',
  bitty: '#3b82f6',
  Forerunner: '#f59e0b',
  Initiate: '#06b6d4',
  Blessed: '#fde68a',
  Cursed: '#9ca3af',
  Harmonic: '#60a5fa',
};

const GOLD = '#FFD700';

function displayRoleOf(h: Holder): string | null {
  return h.topRole || h.fallbackRole || null;
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function formatDays(days: number) {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const y = Math.floor(days / 365);
  const mo = Math.floor((days % 365) / 30);
  return mo > 0 ? `${y}y ${mo}mo` : `${y}y`;
}

function RoleBadge({ role, size = 'sm' }: { role: string; size?: 'sm' | 'md' }) {
  const color = ROLE_COLOR[role] || '#555';
  return (
    <span
      className={`font-mono rounded-full border ${size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'}`}
      style={{ color, borderColor: color, backgroundColor: `${color}20` }}
    >
      {role}
    </span>
  );
}

const FOUND_LINES = [
  'nya~ found you!',
  '*flicks tail* a real one',
  '*purrs* certified Genesis',
  'oooh prime Genesis spotted',
  'diamond paws 💎 confirmed',
  '*adjusts cat ears* respect',
  'early bird gets the NFT 🎴',
  '*tail wag* legend status',
  'meow meow, holder detected',
  'sigma Genesis behavior',
];
const NOT_FOUND_LINES = [
  '*sad meow* not on the list',
  'hmm... I don\'t see you nya',
  '*flicks tail* better luck next time',
  'you missed the mint 😿',
  'not a holder... yet?',
  '*ears droop* nope',
  'who are you again? 🤔',
  '*tilts head* nada',
];

function SpeechBubble({ text, color }: { text: string; color: string }) {
  return (
    <div
      className="absolute z-20 px-4 py-2 rounded-2xl border font-mono text-xs whitespace-nowrap"
      style={{
        top: '8%',
        left: '50%',
        transform: 'translateX(-50%) rotate(-3deg)',
        backgroundColor: '#fff',
        color: '#0a0a0a',
        borderColor: color,
        boxShadow: `0 4px 18px ${color}44`,
      }}
    >
      {text}
      {/* tail */}
      <span
        className="absolute"
        style={{
          bottom: -8,
          left: '40%',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `10px solid #fff`,
        }}
      />
    </div>
  );
}

function ResultOverlay({
  result,
  query,
  activity,
  onClose,
}: {
  result: Holder | 'not-found';
  query: string;
  activity: Activity | null;
  onClose: () => void;
}) {
  const isFound = result !== 'not-found';
  const member = isFound ? (result as Holder) : null;
  const role = member ? displayRoleOf(member) : null;
  const color = role ? ROLE_COLOR[role] || GOLD : GOLD;
  const line = useMemo(
    () => (isFound ? FOUND_LINES : NOT_FOUND_LINES)[Math.floor(Math.random() * (isFound ? FOUND_LINES : NOT_FOUND_LINES).length)],
    [isFound],
  );

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
        <div className="absolute inset-0 backdrop-blur-xl" style={{ backgroundColor: '#050505ee' }} />

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
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: '#555' }}
          >
            ✕
          </button>

          {isFound && member ? (
            <div className="relative min-h-[420px] flex flex-col md:flex-row">
              <div
                className="relative md:w-2/5 flex items-end justify-center pt-10 pb-0 overflow-hidden"
                style={{ background: `linear-gradient(160deg, ${color}18 0%, ${color}08 60%, transparent 100%)` }}
              >
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%)`,
                    backgroundSize: '40px 40px',
                  }}
                />
                <div className="absolute top-0 right-0 w-px h-full opacity-20" style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }} />
                <SpeechBubble text={line} color={color} />
                <Image
                  src="/Siggy_01/Face/Girl/Girl_Happy.png"
                  alt="Siggy happy"
                  width={300}
                  height={300}
                  className="relative z-10 drop-shadow-2xl"
                  unoptimized
                />
              </div>

              <div className="md:w-3/5 flex flex-col justify-center px-8 py-10">
                <p className="font-mono text-xs tracking-[0.3em] uppercase mb-4" style={{ color: `${color}99` }}>
                  Prime Genesis · 1 of 1,000
                </p>
                <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight leading-none mb-6" style={{ color }}>
                  Genesis 🎴
                </h2>

                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0" style={{ boxShadow: `0 0 0 2px ${color}66` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg leading-tight">{member.displayName}</p>
                    <p className="font-mono text-sm" style={{ color: '#555' }}>@{member.username}</p>
                  </div>
                </div>

                {role && (
                  <div className="flex items-center gap-3 mb-6">
                    <RoleBadge role={role} size="md" />
                  </div>
                )}

                {(() => {
                  const d = daysSince(member.joinedAt);
                  if (d === null) return null;
                  return (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: '#888' }}>
                      Locked in for <span className="font-bold" style={{ color }}>{formatDays(d)}</span> since joining Ritual. Owns a Genesis NFT — one of the first 1,000 to deploy an agent on testnet. 🔥
                    </p>
                  );
                })()}

                {activity && ((activity.contributions ?? 0) || (activity.eventsWon ?? 0) || (activity.eventsHosted ?? 0)) ? (
                  <div className="grid grid-cols-3 gap-2">
                    <ActivityTile label="Contrib" value={activity.contributions ?? 0} accent="#22c55e" />
                    <ActivityTile label="Won" value={activity.eventsWon ?? 0} accent={GOLD} />
                    <ActivityTile label="Host" value={activity.eventsHosted ?? 0} accent="#a855f7" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="relative min-h-[400px] flex flex-col md:flex-row">
              <div
                className="relative md:w-2/5 flex items-end justify-center pt-10 overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #1a1a1a 0%, transparent 100%)' }}
              >
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)`,
                    backgroundSize: '40px 40px',
                  }}
                />
                <SpeechBubble text={line} color="#666" />
                <Image
                  src="/Siggy_01/Face/Girl/Girl_Sad.png"
                  alt="Siggy sad"
                  width={280}
                  height={280}
                  className="relative z-10 drop-shadow-xl opacity-90"
                  unoptimized
                />
              </div>

              <div className="md:w-3/5 flex flex-col justify-center px-8 py-10">
                <p className="font-mono text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#555' }}>
                  Genesis 1000 Registry
                </p>
                <h2 className="font-display text-5xl md:text-6xl uppercase tracking-tight leading-none mb-4" style={{ color: '#888' }}>
                  Not on<br />the list…
                </h2>
                <p className="font-semibold text-white mb-1">@{query.replace(/^@/, '')}</p>
                <div className="w-12 h-px mb-6" style={{ backgroundColor: '#333' }} />
                <p className="text-sm leading-relaxed mb-2" style={{ color: '#aaa' }}>
                  This member isn&apos;t in the Genesis 1000 registry.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#777' }}>
                  Deploy an agent on testnet to mint the Genesis NFT — slots fill fast. 🌱
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MemberModal({
  holder,
  activity,
  onClose,
}: {
  holder: Holder;
  activity: Activity | null;
  onClose: () => void;
}) {
  const role = displayRoleOf(holder);
  const color = role ? ROLE_COLOR[role] || GOLD : GOLD;
  const days = daysSince(holder.joinedAt);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 backdrop-blur-xl" style={{ backgroundColor: '#050505cc' }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-2xl border overflow-hidden"
          style={{ backgroundColor: '#0a0a0a', borderColor: `${color}44`, boxShadow: `0 0 60px ${color}18` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm hover:bg-white/10 transition-all"
            style={{ color: '#555' }}
          >
            ✕
          </button>

          <div className="relative w-full aspect-square overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={holder.avatarUrl} alt={holder.displayName} className="w-full h-full object-cover" />
          </div>

          <div className="px-5 pt-5 pb-6 relative z-10">
            <p className="font-display text-2xl uppercase tracking-tight text-white leading-tight mb-0.5">{holder.displayName}</p>
            <p className="text-sm font-mono mb-4" style={{ color: '#555' }}>@{holder.username}</p>

            {role && (
              <div className="flex items-center gap-2 mb-4">
                <RoleBadge role={role} size="md" />
              </div>
            )}

            {days !== null && (
              <div className="rounded-xl p-3 border mb-3" style={{ borderColor: `${color}22`, backgroundColor: `${color}08` }}>
                <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: `${color}88` }}>Locked in for</p>
                <p className="text-2xl font-display" style={{ color }}>{formatDays(days)}</p>
                <p className="text-xs mt-0.5" style={{ color: '#444' }}>since joining · {formatJoinDate(holder.joinedAt)}</p>
              </div>
            )}

            {activity && (activity.contributions || activity.eventsWon || activity.eventsHosted) && (
              <div className="grid grid-cols-3 gap-2">
                <ActivityTile label="Contrib" value={activity.contributions ?? 0} accent="#22c55e" />
                <ActivityTile label="Won" value={activity.eventsWon ?? 0} accent={GOLD} />
                <ActivityTile label="Host" value={activity.eventsHosted ?? 0} accent="#a855f7" />
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <a
                href={`/stats?u=${encodeURIComponent(holder.username)}`}
                className="flex-1 text-center px-3 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider border transition"
                style={{ borderColor: '#222', color: '#ccc' }}
              >
                View on /stats
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActivityTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg p-2 border text-center" style={{ borderColor: '#1a1a1a', backgroundColor: '#050505' }}>
      <div className="text-[8px] font-mono uppercase tracking-widest opacity-50">{label}</div>
      <div className="text-lg font-black font-mono" style={{ color: accent }}>{value.toLocaleString()}</div>
    </div>
  );
}

function MemberCard({ holder, onClick }: { holder: Holder; onClick: () => void }) {
  const role = displayRoleOf(holder);
  const color = role ? ROLE_COLOR[role] || GOLD : GOLD;
  const days = daysSince(holder.joinedAt);

  return (
    <div
      onClick={onClick}
      className="genesis-card group relative flex flex-col rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      style={{
        backgroundColor: '#0a0a0a',
        borderColor: `${color}55`,
        boxShadow: `0 0 20px ${color}11`,
      }}
    >
      <div className="relative w-full aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={holder.avatarUrl}
          alt={holder.displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, #0a0a0a 100%)' }} />
      </div>

      <div className="px-3 pb-3 -mt-4 relative z-10">
        <p className="font-semibold text-sm truncate text-white leading-tight" title={holder.displayName}>
          {holder.displayName}
        </p>
        <p className="text-xs truncate mb-2" style={{ color: '#555' }}>@{holder.username}</p>
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          {role ? <RoleBadge role={role} /> : <span className="text-[10px] font-mono" style={{ color: '#555' }}>No role</span>}
        </div>
        {days !== null && (
          <p className="text-[10px] font-mono" style={{ color: '#444' }}>{formatDays(days)} since join</p>
        )}
      </div>
    </div>
  );
}

export default function GenesisPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Holder | 'not-found' | 'idle'>('idle');
  const [activityByUser, setActivityByUser] = useState<Record<string, Activity> | null>(null);
  const [selected, setSelected] = useState<Holder | null>(null);
  const [suggestions, setSuggestions] = useState<Holder[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/badge/genesis-1000')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(e => setErr(`Failed to load (${e})`));

    fetch('/api/community')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.activity?.byUser) setActivityByUser(d.activity.byUser);
      })
      .catch(() => {});
  }, []);

  // Deep-link: /genesis?u=username opens modal on load.
  useEffect(() => {
    if (!data) return;
    const u = new URLSearchParams(window.location.search).get('u');
    if (!u) return;
    const t = data.holders.find(h => h.username.toLowerCase() === u.toLowerCase());
    if (t) setSelected(t);
  }, [data]);

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

  // Grid stagger when in view
  useEffect(() => {
    if (!gridRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate('.genesis-card', {
            opacity: [0, 1],
            translateY: [30, 0],
            scale: [0.95, 1],
            delay: stagger(30),
            duration: 500,
            easing: 'easeOutExpo',
          });
          obs.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, [filter, data]);

  // Outside click for suggestions
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    setSearchResult('idle');
    if (!data || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const needle = val.trim().toLowerCase().replace(/^@/, '');
    const matches = data.holders
      .filter(h => h.username.toLowerCase().includes(needle) || h.displayName.toLowerCase().includes(needle))
      .slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }

  function selectSuggestion(h: Holder) {
    setQuery(h.username);
    setShowSuggestions(false);
    setSearchResult(h);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return;
    const found = data.holders.find(
      h => h.username.toLowerCase() === q || h.displayName.toLowerCase() === q,
    );
    setSearchResult(found ?? 'not-found');
  }

  function scrollToList() {
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // Main roles get their own filter pill; the rest (Mage, Blessed, Cursed,
  // Harmonic, no-role) collapse into a single "Other" bucket.
  const MAIN_ROLES = ['Radiant Ritualist', 'Zealot', 'Ritualist', 'ritty', 'bitty', 'Forerunner'];
  const isMain = (r: string | null) => !!r && MAIN_ROLES.includes(r);

  const mainPresent = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const h of data.holders) {
      const r = displayRoleOf(h);
      if (r && isMain(r)) set.add(r);
    }
    return [...set].sort((a, b) => (ROLE_RANK[b] ?? -1) - (ROLE_RANK[a] ?? -1));
  }, [data]);

  const otherCount = useMemo(
    () => (data ? data.holders.filter(h => !isMain(displayRoleOf(h))).length : 0),
    [data],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.holders;
    if (filter === 'other') return data.holders.filter(h => !isMain(displayRoleOf(h)));
    return data.holders.filter(h => displayRoleOf(h) === filter);
  }, [data, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ra = ROLE_RANK[displayRoleOf(a) || ''] ?? -1;
      const rb = ROLE_RANK[displayRoleOf(b) || ''] ?? -1;
      if (rb !== ra) return rb - ra;
      return (a.joinedAt || '').localeCompare(b.joinedAt || '');
    });
  }, [filtered]);

  return (
    <div className="bg-[#050505] text-white">
      {/* Card modal */}
      <AnimatePresence>
        {selected && (
          <MemberModal
            holder={selected}
            activity={activityByUser?.[selected.userId] || null}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* Search result overlay */}
      {searchResult !== 'idle' && (
        <ResultOverlay
          result={searchResult}
          query={query}
          activity={
            searchResult !== 'not-found'
              ? activityByUser?.[(searchResult as Holder).userId] || null
              : null
          }
          onClose={() => setSearchResult('idle')}
        />
      )}

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #FFD700 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="hero-line opacity-0 font-mono text-xs tracking-[0.3em] uppercase mb-6" style={{ color: '#666' }}>
            Prime Genesis · First 1,000 Agent Deployers
          </p>

          <h1 className="hero-line opacity-0 font-display text-5xl md:text-7xl lg:text-8xl uppercase tracking-tight leading-[1.05] mb-2">
            Are You
          </h1>
          <h1
            className="hero-line opacity-0 font-display text-5xl md:text-7xl lg:text-8xl uppercase tracking-tight leading-[1.05] mb-10"
            style={{ color: GOLD }}
          >
            Genesis 1000 Holder?
          </h1>

          <p className="hero-line opacity-0 text-lg md:text-xl mb-10" style={{ color: '#888' }}>
            {data ? `${data.count} members` : 'Loading…'} locked into the Genesis 1000 registry
          </p>

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
                  onFocusCapture={e => (e.target.style.borderColor = GOLD)}
                  onBlurCapture={e => (e.target.style.borderColor = '#222')}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80 whitespace-nowrap"
                  style={{ backgroundColor: GOLD, color: '#000' }}
                >
                  Check
                </button>
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl border overflow-hidden z-50 text-left"
                  style={{ backgroundColor: '#111', borderColor: '#222' }}
                >
                  {suggestions.map(s => (
                    <button
                      key={s.userId}
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b last:border-0"
                      style={{ borderColor: '#1a1a1a' }}
                    >
                      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[#222]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.avatarUrl} alt={s.displayName} className="w-full h-full object-cover" />
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

          <button
            onClick={scrollToList}
            className="hero-line opacity-0 flex flex-col items-center gap-2 mx-auto transition-colors hover:opacity-70"
            style={{ color: '#555' }}
          >
            <span className="font-mono text-xs tracking-[0.2em] uppercase">See the holders</span>
            <span className="text-lg animate-bounce">↓</span>
          </button>
        </div>
      </section>

      {/* ── LIST ── */}
      <div ref={listRef} className="max-w-7xl mx-auto px-4 pb-24 pt-12">
        {err && <p className="text-center text-red-400 mb-8">{err}</p>}
        {!data && !err && <p className="text-center opacity-50 mb-8">Loading registry…</p>}

        {data && (
          <>
            {/* Per-role count tiles (main roles + Other bucket) */}
            <div className="flex flex-wrap justify-center gap-4 mb-14">
              {mainPresent.map(role => {
                const count = data.holders.filter(h => displayRoleOf(h) === role).length;
                const color = ROLE_COLOR[role] || GOLD;
                return (
                  <div
                    key={role}
                    className="relative rounded-2xl p-6 border overflow-hidden text-center"
                    style={{ borderColor: `${color}33`, backgroundColor: '#0a0a0a', minWidth: '140px' }}
                  >
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ background: `radial-gradient(ellipse at 50% 100%, ${color} 0%, transparent 70%)` }}
                    />
                    <p className="relative text-4xl font-display" style={{ color }}>{count}</p>
                    <p className="relative text-sm mt-1 font-mono" style={{ color: '#666' }}>{role}</p>
                  </div>
                );
              })}
              {otherCount > 0 && (
                <div
                  className="relative rounded-2xl p-6 border overflow-hidden text-center"
                  style={{ borderColor: '#33333355', backgroundColor: '#0a0a0a', minWidth: '140px' }}
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ background: `radial-gradient(ellipse at 50% 100%, #888 0%, transparent 70%)` }}
                  />
                  <p className="relative text-4xl font-display" style={{ color: '#888' }}>{otherCount}</p>
                  <p className="relative text-sm mt-1 font-mono" style={{ color: '#666' }}>Other</p>
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-10 justify-center">
              {(['all', ...mainPresent, ...(otherCount > 0 ? ['other'] : [])] as string[]).map(role => {
                const active = filter === role;
                const color = role === 'all' ? '#fff' : role === 'other' ? '#888' : ROLE_COLOR[role] || GOLD;
                const count =
                  role === 'all'
                    ? data.holders.length
                    : role === 'other'
                    ? otherCount
                    : data.holders.filter(h => displayRoleOf(h) === role).length;
                const label = role === 'all' ? 'All' : role === 'other' ? 'Other' : role;
                return (
                  <button
                    key={role}
                    onClick={() => setFilter(role)}
                    className="px-5 py-2 rounded-full text-sm font-mono border transition-all"
                    style={{
                      borderColor: active ? color : '#222',
                      backgroundColor: active ? color : 'transparent',
                      color: active ? '#000' : '#555',
                    }}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sorted.map(h => (
                <MemberCard key={h.userId} holder={h} onClick={() => setSelected(h)} />
              ))}
            </div>

            {sorted.length === 0 && (
              <p className="text-center opacity-50 mt-8">No holders for this filter.</p>
            )}

            <p className="text-center text-xs opacity-30 mt-12 font-mono">
              Updated {new Date(data.updatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
