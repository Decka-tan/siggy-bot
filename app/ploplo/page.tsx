'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useInView,
} from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   PloPlo Holder registry — standalone landing.
   Deliberately does NOT follow the Siggy dark design system:
   the PloPlo art is bright 3D toy-like, so the page is a cream
   "toy shelf" with chunky ink borders and scroll-driven motion.
   Header/Footer are suppressed for this route (see layout comps).
   ───────────────────────────────────────────────────────────── */

type Holder = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string | null;
  topRole: string | null;
  fallbackRole?: string | null;
  contributorRole?: string | null;
};

type Payload = {
  updatedAt: number;
  badge: string;
  count: number;
  holders: Holder[];
};

type Activity = { contributions?: number; eventsWon?: number; eventsHosted?: number };

const BADGE_SLUG = 'ploplo-holder';
const OPENSEA = 'https://opensea.io/collection/ploplo-genesis';

// Palette pulled from the NFT art itself.
const INK = '#141024';
const CREAM = '#FFF4E3';
const BLUE = '#2F6BFF';
const SUN = '#FFC93C';
const LILAC = '#C7B4FF';
const MINT = '#7FE3C0';
const CORAL = '#FF7A6B';

// On-chain art (ERC-1155 0x3f63…5047), pinned locally + downscaled.
const NFTS = [
  '/ploplo/3862.webp',
  '/ploplo/4003.webp',
  '/ploplo/4150.webp',
  '/ploplo/3876.webp',
  '/ploplo/4061.webp',
  '/ploplo/3984.webp',
  '/ploplo/4108.webp',
  '/ploplo/3884.webp',
  '/ploplo/4215.webp',
  '/ploplo/3948.webp',
];

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

// Re-mapped onto the toy palette so chips read on cream.
const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': SUN,
  Zealot: CORAL,
  Ritualist: MINT,
  Mage: '#8AD8FF',
  ritty: LILAC,
  bitty: BLUE,
  Forerunner: '#FFB07C',
  Initiate: '#9EE7FF',
  Blessed: '#FFE7A3',
  Cursed: '#CFCADA',
  Harmonic: '#B9D4FF',
};

const MAIN_ROLES = ['Radiant Ritualist', 'Zealot', 'Ritualist', 'ritty', 'bitty'];

function displayRoleOf(h: Holder) {
  return h.topRole || h.fallbackRole || null;
}
function bucketRoleOf(h: Holder) {
  return h.contributorRole ?? null;
}
function isMain(r: string | null) {
  return !!r && MAIN_ROLES.includes(r);
}
function daysSince(iso: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}
function formatDays(d: number) {
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  const y = Math.floor(d / 365);
  const mo = Math.floor((d % 365) / 30);
  return mo > 0 ? `${y}y ${mo}mo` : `${y}y`;
}
function formatJoinDate(iso: string | null) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
// Deterministic NFT per holder, so a member always gets the same sticker.
function nftFor(userId: string) {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n = (n * 31 + userId.charCodeAt(i)) % 9973;
  return NFTS[n % NFTS.length];
}

/* ── count-up that fires when scrolled into view ── */
function CountUp({ to, duration = 1100 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{v.toLocaleString()}</span>;
}

function RoleChip({ role, big = false }: { role: string; big?: boolean }) {
  const c = ROLE_COLOR[role] || '#DDD6C7';
  return (
    <span
      className={`inline-block font-bold uppercase tracking-wide rounded-full ${
        big ? 'text-xs px-3 py-1.5' : 'text-[10px] px-2.5 py-1'
      }`}
      style={{ backgroundColor: c, color: INK, border: `2px solid ${INK}` }}
    >
      {role}
    </span>
  );
}

/* ── holder card ── */
function HolderCard({ holder, index, onClick }: { holder: Holder; index: number; onClick: () => void }) {
  const role = displayRoleOf(holder);
  const days = daysSince(holder.joinedAt);
  const tilt = [-2.2, 1.6, -1.1, 2.4, -1.8][index % 5];

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 26, rotate: tilt * 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 12) * 0.02, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotate: 0, y: -8, transition: { duration: 0.18 } }}
      className="group text-left rounded-[22px] overflow-hidden"
      style={{ backgroundColor: '#fff', border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}
    >
      <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: CREAM }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={holder.avatarUrl}
          alt={holder.displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        {/* NFT sticker */}
        <div
          className="absolute bottom-1.5 right-1.5 w-12 h-12 rounded-full overflow-hidden rotate-6 transition-transform duration-300 group-hover:rotate-0"
          style={{ border: `3px solid ${INK}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      <div className="px-3 pt-3 pb-3.5" style={{ borderTop: `3px solid ${INK}` }}>
        <p className="font-bold text-[15px] leading-tight truncate" style={{ color: INK }} title={holder.displayName}>
          {holder.displayName}
        </p>
        <p className="text-xs truncate mb-2 opacity-60" style={{ color: INK }}>
          @{holder.username}
        </p>
        <div className="flex items-center justify-between gap-2">
          {role ? <RoleChip role={role} /> : <span className="text-[10px] opacity-50">no role</span>}
          {days !== null && (
            <span className="text-[10px] font-bold opacity-50" style={{ color: INK }}>
              {formatDays(days)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── detail modal ── */
function HolderModal({ holder, activity, onClose }: { holder: Holder; activity: Activity | null; onClose: () => void }) {
  const role = displayRoleOf(holder);
  const days = daysSince(holder.joinedAt);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(20,16,36,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[26px] overflow-hidden"
        style={{ backgroundColor: '#fff', border: `4px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}` }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full font-bold"
          style={{ backgroundColor: CREAM, border: `3px solid ${INK}`, color: INK }}
        >
          ✕
        </button>

        <div className="relative aspect-square" style={{ backgroundColor: CREAM }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={holder.avatarUrl} alt={holder.displayName} className="w-full h-full object-cover" />
          <div
            className="absolute bottom-3 left-3 w-20 h-20 rounded-2xl overflow-hidden -rotate-6"
            style={{ border: `4px solid ${INK}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="px-5 pt-5 pb-6" style={{ borderTop: `4px solid ${INK}`, color: INK }}>
          <p className="font-display text-3xl uppercase leading-none tracking-tight">{holder.displayName}</p>
          <p className="text-sm opacity-60 mb-3">@{holder.username}</p>

          {role && (
            <div className="mb-4">
              <RoleChip role={role} big />
            </div>
          )}

          {days !== null && (
            <div className="rounded-2xl p-3 mb-3" style={{ backgroundColor: CREAM, border: `3px solid ${INK}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Locked in for</p>
              <p className="font-display text-3xl leading-none mt-0.5">{formatDays(days)}</p>
              <p className="text-[11px] opacity-55 mt-1">joined {formatJoinDate(holder.joinedAt)}</p>
            </div>
          )}

          {activity && (activity.contributions || activity.eventsWon || activity.eventsHosted) ? (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { l: 'Contrib', v: activity.contributions ?? 0, c: MINT },
                { l: 'Won', v: activity.eventsWon ?? 0, c: SUN },
                { l: 'Host', v: activity.eventsHosted ?? 0, c: LILAC },
              ].map(t => (
                <div
                  key={t.l}
                  className="rounded-xl p-2 text-center"
                  style={{ backgroundColor: t.c, border: `3px solid ${INK}` }}
                >
                  <div className="text-[8px] font-bold uppercase tracking-widest opacity-70">{t.l}</div>
                  <div className="font-display text-xl leading-none">{t.v.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : null}

          <a
            href={`/stats?u=${encodeURIComponent(holder.username)}`}
            className="block text-center px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: INK, color: CREAM }}
          >
            View on /stats
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── search verdict ── */
function Verdict({ result, query, onClose }: { result: Holder | 'not-found'; query: string; onClose: () => void }) {
  const found = result !== 'not-found';
  const member = found ? (result as Holder) : null;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(20,16,36,0.6)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: found ? -3 : 2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[28px] px-7 py-8 text-center"
        style={{
          backgroundColor: found ? SUN : CREAM,
          border: `4px solid ${INK}`,
          boxShadow: `12px 12px 0 ${INK}`,
          color: INK,
        }}
      >
        {found && member ? (
          <>
            <div
              className="w-28 h-28 mx-auto rounded-full overflow-hidden mb-4 -rotate-3"
              style={{ border: `4px solid ${INK}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
            </div>
            <p className="font-display text-5xl uppercase leading-none mb-2">You&apos;re in!</p>
            <p className="font-bold text-lg leading-tight">{member.displayName}</p>
            <p className="text-sm opacity-60 mb-4">@{member.username}</p>
            {displayRoleOf(member) && <RoleChip role={displayRoleOf(member)!} big />}
          </>
        ) : (
          <>
            <div
              className="w-24 h-24 mx-auto rounded-full mb-4 flex items-center justify-center font-display text-5xl"
              style={{ backgroundColor: '#fff', border: `4px solid ${INK}` }}
            >
              ?
            </div>
            <p className="font-display text-5xl uppercase leading-none mb-2">Not on the shelf</p>
            <p className="font-bold">@{query.replace(/^@/, '')}</p>
            <p className="text-sm opacity-65 mt-3">
              Belum megang badge PloPlo Holder. Nongkrong terus di community, badge-nya nyusul.
            </p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-6 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{ backgroundColor: INK, color: CREAM }}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function PloPloPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [verdict, setVerdict] = useState<Holder | 'not-found' | 'idle'>('idle');
  const [activityByUser, setActivityByUser] = useState<Record<string, Activity> | null>(null);
  const [selected, setSelected] = useState<Holder | null>(null);
  type Suggestion = { userId: string; username: string; displayName: string; avatarUrl?: string };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  /* ── scroll rigs ── */
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroTitleY = useTransform(heroP, [0, 1], [0, -140]);
  const heroFade = useTransform(heroP, [0, 0.75], [1, 0]);
  const floatA = useTransform(heroP, [0, 1], [0, -260]);
  const floatB = useTransform(heroP, [0, 1], [0, -120]);
  const floatC = useTransform(heroP, [0, 1], [0, -380]);
  const heroSpin = useTransform(heroP, [0, 1], [0, 24]);

  const { scrollYProgress: bandP } = useScroll({ target: bandRef, offset: ['start end', 'end start'] });
  const rowLeft = useTransform(bandP, [0, 1], ['2%', '-38%']);
  const rowRight = useTransform(bandP, [0, 1], ['-38%', '2%']);
  const bandScale = useTransform(bandP, [0, 0.5, 1], [0.9, 1, 0.9]);

  useEffect(() => {
    fetch(`/api/badge/${BADGE_SLUG}`)
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

  // Deep link: /ploplo?u=username
  useEffect(() => {
    if (!data) return;
    const u = new URLSearchParams(window.location.search).get('u');
    if (!u) return;
    const t = data.holders.find(h => h.username.toLowerCase() === u.toLowerCase());
    if (t) setSelected(t);
  }, [data]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function onQueryChange(val: string) {
    setQuery(val);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`/api/member?autocomplete=true&username=${encodeURIComponent(val.trim())}`);
      const json = await res.json();
      const results = ((json.members || json || []) as Suggestion[]).slice(0, 6);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function resolve(nameOrHandle: string): Holder | 'not-found' {
    if (!data) return 'not-found';
    const q = nameOrHandle.trim().toLowerCase().replace(/^@/, '');
    return (
      data.holders.find(x => x.username.toLowerCase() === q || x.displayName.toLowerCase() === q) ?? 'not-found'
    );
  }

  const mainPresent = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const h of data.holders) {
      const r = bucketRoleOf(h);
      if (r && isMain(r)) set.add(r);
    }
    return [...set].sort((a, b) => (ROLE_RANK[b] ?? -1) - (ROLE_RANK[a] ?? -1));
  }, [data]);

  const otherCount = useMemo(
    () => (data ? data.holders.filter(h => !isMain(bucketRoleOf(h))).length : 0),
    [data],
  );

  const sorted = useMemo(() => {
    if (!data) return [];
    const base =
      filter === 'all'
        ? data.holders
        : filter === 'other'
        ? data.holders.filter(h => !isMain(bucketRoleOf(h)))
        : data.holders.filter(h => bucketRoleOf(h) === filter);
    return [...base].sort((a, b) => {
      const ra = ROLE_RANK[displayRoleOf(a) || ''] ?? -1;
      const rb = ROLE_RANK[displayRoleOf(b) || ''] ?? -1;
      if (rb !== ra) return rb - ra;
      return (a.joinedAt || '').localeCompare(b.joinedAt || '');
    });
  }, [data, filter]);

  const marqueeRow = [...NFTS, ...NFTS];

  return (
    // NOTE: no overflow-x-hidden here — it would turn this into a scroll
    // container and silently kill the sticky filter bar. Sections clip their own.
    <div style={{ backgroundColor: CREAM, color: INK }} className="relative">
      {/* scroll progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[6px] z-[300] origin-left"
        style={{ scaleX: progress, backgroundColor: BLUE, borderBottom: `2px solid ${INK}` }}
      />

      <AnimatePresence>
        {selected && (
          <HolderModal
            holder={selected}
            activity={activityByUser?.[selected.userId] || null}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {verdict !== 'idle' && <Verdict result={verdict} query={query} onClose={() => setVerdict('idle')} />}
      </AnimatePresence>

      {/* ══ 1. HERO — full viewport ══ */}
      <section
        ref={heroRef}
        className="relative h-screen min-h-[640px] flex items-center justify-center px-5 overflow-hidden"
      >
        {/* dotted paper */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${INK}22 1.6px, transparent 1.6px)`,
            backgroundSize: '26px 26px',
          }}
        />
        {/* blobs */}
        <div
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-40 blur-2xl"
          style={{ backgroundColor: LILAC }}
        />
        <div
          className="absolute -bottom-32 -right-20 w-[460px] h-[460px] rounded-full opacity-40 blur-2xl"
          style={{ backgroundColor: MINT }}
        />

        {/* floating NFTs */}
        <motion.div style={{ y: floatA, rotate: heroSpin }} className="hidden md:block absolute left-[6%] top-[15%] w-40 lg:w-52">
          <div style={{ border: `4px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, borderRadius: 26, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFTS[0]} alt="PloPlo Genesis" className="w-full h-full object-cover" />
          </div>
        </motion.div>
        <motion.div style={{ y: floatB }} className="hidden lg:block absolute right-[8%] top-[10%] w-36 lg:w-44 rotate-6">
          <div style={{ border: `4px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, borderRadius: 26, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFTS[1]} alt="PloPlo Genesis" className="w-full h-full object-cover" />
          </div>
        </motion.div>
        <motion.div style={{ y: floatC }} className="hidden md:block absolute right-[11%] bottom-[11%] w-32 lg:w-40 -rotate-6">
          <div style={{ border: `4px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, borderRadius: 26, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFTS[2]} alt="PloPlo Genesis" className="w-full h-full object-cover" />
          </div>
        </motion.div>
        <motion.div style={{ y: floatB }} className="hidden xl:block absolute left-[9%] bottom-[9%] w-32 rotate-3">
          <div style={{ border: `4px solid ${INK}`, boxShadow: `10px 10px 0 ${INK}`, borderRadius: 26, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NFTS[3]} alt="PloPlo Genesis" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        <motion.div style={{ y: heroTitleY, opacity: heroFade }} className="relative z-10 w-full max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block text-[11px] font-bold uppercase tracking-[0.28em] px-4 py-2 rounded-full mb-7"
            style={{ backgroundColor: '#fff', border: `3px solid ${INK}` }}
          >
            PloPlo Holder · Ritual community
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-display uppercase leading-[1.12] md:leading-[0.92] text-[14vw] sm:text-[11vw] md:text-[8.5rem]"
          >
            <span className="block">Are you</span>
            <span
              className="block"
              style={{
                color: BLUE,
                WebkitTextStroke: `2px ${INK}`,
                textShadow: `5px 5px 0 ${INK}`,
                letterSpacing: '0.02em',
              }}
            >
              PloPlo?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-7 text-base md:text-lg font-medium opacity-70"
          >
            {data ? `${data.count} orang` : '…'} megang badge PloPlo Holder di server Ritual.
          </motion.p>

          {/* mobile: the floating art is hidden, so show a compact strip instead */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="flex md:hidden justify-center gap-3 mt-6"
          >
            {NFTS.slice(0, 3).map((src, i) => (
              <div
                key={src}
                className="w-20 h-20 rounded-2xl overflow-hidden"
                style={{
                  border: `3px solid ${INK}`,
                  boxShadow: `5px 5px 0 ${INK}`,
                  transform: `rotate(${[-5, 2, 5][i]}deg)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" />
              </div>
            ))}
          </motion.div>

          {/* check form */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            ref={suggestRef}
            className="relative max-w-md mx-auto mt-7"
          >
            <form
              onSubmit={e => {
                e.preventDefault();
                if (query.trim()) setVerdict(resolve(query));
              }}
              className="flex gap-2"
            >
              <input
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="username discord lo…"
                autoComplete="off"
                className="flex-1 px-5 py-3.5 rounded-2xl font-medium outline-none"
                style={{ backgroundColor: '#fff', border: `3px solid ${INK}`, color: INK }}
              />
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl font-bold uppercase text-sm tracking-wide transition-transform active:translate-y-1"
                style={{ backgroundColor: SUN, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, color: INK }}
              >
                Cek
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 text-left"
                style={{ backgroundColor: '#fff', border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}
              >
                {suggestions.map(s => (
                  <button
                    key={s.userId}
                    onMouseDown={() => {
                      setQuery(s.username);
                      setShowSuggestions(false);
                      setVerdict(resolve(s.username));
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${INK}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.avatarUrl || `/api/avatar?id=${s.userId}`}
                        alt={s.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{s.displayName}</div>
                      <div className="text-xs opacity-55 truncate">@{s.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>

        <motion.button
          onClick={() => bandRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ opacity: heroFade }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          scroll
          <motion.span animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-lg">
            ↓
          </motion.span>
        </motion.button>
      </section>

      {/* ══ 2. MARQUEE BAND — full viewport, scroll-driven ══ */}
      <section
        ref={bandRef}
        className="relative h-screen min-h-[620px] flex flex-col justify-center overflow-hidden"
        style={{ backgroundColor: INK, color: CREAM }}
      >
        <motion.div style={{ x: rowLeft }} className="flex gap-5 mb-5 w-max">
          {marqueeRow.map((src, i) => (
            <div
              key={`a${i}`}
              className="w-40 md:w-56 aspect-square rounded-[26px] overflow-hidden shrink-0"
              style={{ border: `4px solid ${CREAM}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>

        <motion.div style={{ scale: bandScale }} className="relative z-10 text-center py-6 px-4">
          <p className="font-display uppercase leading-[0.9] text-[13vw] md:text-[7rem]" style={{ color: SUN }}>
            <CountUp to={data?.count ?? 0} /> certified
          </p>
          <p className="text-sm md:text-base font-bold uppercase tracking-[0.3em] opacity-70 mt-2">
            PloPlo Genesis · on-chain art
          </p>
        </motion.div>

        <motion.div style={{ x: rowRight }} className="flex gap-5 mt-5 w-max">
          {marqueeRow.map((src, i) => (
            <div
              key={`b${i}`}
              className="w-40 md:w-56 aspect-square rounded-[26px] overflow-hidden shrink-0"
              style={{ border: `4px solid ${CREAM}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>
      </section>

      {/* ══ 3. STATS — full viewport ══ */}
      <section className="relative min-h-screen flex flex-col justify-center px-5 py-24">
        <div className="max-w-5xl mx-auto w-full">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="font-display uppercase text-[12vw] md:text-7xl leading-[0.9] mb-3 text-center"
          >
            Siapa aja
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-center opacity-65 font-medium mb-14"
          >
            Pecahan holder berdasarkan role kontributor di Ritual.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {data &&
              [...mainPresent, ...(otherCount > 0 ? ['other'] : [])].map((role, i) => {
                const count =
                  role === 'other' ? otherCount : data.holders.filter(h => displayRoleOf(h) === role).length;
                const c = role === 'other' ? '#E4DCCB' : ROLE_COLOR[role] || SUN;
                return (
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 36, rotate: i % 2 ? 2 : -2 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-[26px] p-7"
                    style={{ backgroundColor: c, border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
                  >
                    <p className="font-display text-6xl leading-none">
                      <CountUp to={count} />
                    </p>
                    <p className="text-sm font-bold uppercase tracking-wide mt-2 opacity-75">
                      {role === 'other' ? 'Other' : role}
                    </p>
                  </motion.div>
                );
              })}
          </div>

          <motion.a
            href={OPENSEA}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-14 mx-auto block w-max px-8 py-4 rounded-full font-bold uppercase tracking-wider text-sm transition-transform hover:-translate-y-1"
            style={{ backgroundColor: BLUE, color: '#fff', border: `4px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}
          >
            Lihat koleksi di OpenSea ↗
          </motion.a>
        </div>
      </section>

      {/* ══ 4. ROSTER ══ */}
      <section className="relative px-4 pb-28" style={{ backgroundColor: '#FBE8CC' }}>
        <div className="max-w-7xl mx-auto pt-20">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display uppercase text-[12vw] md:text-7xl leading-[0.9] text-center mb-10"
          >
            The shelf
          </motion.h2>

          {err && (
            <p className="text-center font-bold mb-8" style={{ color: CORAL }}>
              {err}
            </p>
          )}
          {!data && !err && <p className="text-center opacity-55 mb-8">Loading registry…</p>}

          {data && (
            <>
              {/* sticky filter bar */}
              <div className="sticky top-3 z-30 mb-10">
                <div
                  className="flex flex-wrap gap-2 justify-center p-2.5 rounded-2xl mx-auto w-max max-w-full"
                  style={{ backgroundColor: CREAM, border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}` }}
                >
                  {(['all', ...mainPresent, ...(otherCount > 0 ? ['other'] : [])] as string[]).map(role => {
                    const active = filter === role;
                    const count =
                      role === 'all'
                        ? data.holders.length
                        : role === 'other'
                        ? otherCount
                        : data.holders.filter(h => displayRoleOf(h) === role).length;
                    const c = role === 'all' ? BLUE : role === 'other' ? '#E4DCCB' : ROLE_COLOR[role] || SUN;
                    return (
                      <button
                        key={role}
                        onClick={() => setFilter(role)}
                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-transform active:translate-y-0.5"
                        style={{
                          backgroundColor: active ? c : 'transparent',
                          color: active && role === 'all' ? '#fff' : INK,
                          border: `3px solid ${active ? INK : 'transparent'}`,
                        }}
                      >
                        {role === 'all' ? 'Semua' : role === 'other' ? 'Other' : role} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {sorted.map((h, i) => (
                  <HolderCard key={h.userId} holder={h} index={i} onClick={() => setSelected(h)} />
                ))}
              </div>

              {sorted.length === 0 && <p className="text-center opacity-55 mt-10">Gak ada holder di filter ini.</p>}

              <p className="text-center text-xs font-bold uppercase tracking-widest opacity-40 mt-16">
                Updated {new Date(data.updatedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
      </section>

      {/* ══ footer strip ══ */}
      <footer
        className="px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ backgroundColor: INK, color: CREAM }}
      >
        <p className="font-display uppercase text-2xl leading-none">PloPlo Holder</p>
        <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-widest">
          <a href="/genesis" className="hover:opacity-70 transition-opacity">
            Genesis 1000
          </a>
          <a href="/stats" className="hover:opacity-70 transition-opacity">
            Stats
          </a>
          <a href={OPENSEA} target="_blank" rel="noreferrer" className="hover:opacity-70 transition-opacity">
            OpenSea ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
