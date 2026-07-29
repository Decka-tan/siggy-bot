'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   PloPlo Holder registry — standalone landing.

   Rules for this page, on purpose:
   · no gradients anywhere (fills, text, borders) — flat colour only
   · no blurred blobs — the background is a tiled star pattern, the
     same star silhouette the characters are built from
   · rounded chunky type (Baloo 2 / Fredoka) to match the 3D toys
   · shadows are hard offsets, never soft glows
   Header/Footer are suppressed for this route.
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

type Payload = { updatedAt: number; badge: string; count: number; holders: Holder[] };
type Activity = { contributions?: number; eventsWon?: number; eventsHosted?: number };

const BADGE_SLUG = 'ploplo-holder';
const OPENSEA = 'https://opensea.io/collection/ploplo-genesis';

const DISPLAY = 'var(--ploplo-display), ui-rounded, system-ui, sans-serif';
const BODY = 'var(--ploplo-body), ui-rounded, system-ui, sans-serif';

const INK = '#1B1633';
const CREAM = '#FFF3DE';
const BLUE = '#2C7BE5';
const YELLOW = '#FFC93C';
const PINK = '#FF9EC4';
const MINT = '#6FD3A9';
const LILAC = '#B9A7F0';
const CORAL = '#FF7A6B';

// The PloPlo silhouette, tiled. This is the page's texture — not a blur.
function starTile(color: string, opacity: number) {
  const c = encodeURIComponent(color);
  return (
    // 120-unit artwork rendered into a 58px tile → fine texture, not bedsheet.
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58' viewBox='0 0 120 120'%3E` +
    `%3Cg fill='${c}' fill-opacity='${opacity}'%3E` +
    `%3Cpath d='M30 14 L38 32 L57 34 L43 47 L47 66 L30 56 L13 66 L17 47 L3 34 L22 32 Z'/%3E` +
    `%3Cpath d='M90 74 L98 92 L117 94 L103 107 L107 126 L90 116 L73 126 L77 107 L63 94 L82 92 Z'/%3E` +
    `%3C/g%3E%3C/svg%3E")`
  );
}

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

// Flat swatches only.
const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': YELLOW,
  Zealot: CORAL,
  Ritualist: MINT,
  Mage: '#7EC8F2',
  ritty: LILAC,
  bitty: BLUE,
  Forerunner: '#FFA45C',
  Initiate: '#8FDCEF',
  Blessed: '#FFE49B',
  Cursed: '#C8C2D8',
  Harmonic: PINK,
};
const OTHER_COLOR = '#DDD5C4';

// Swatches dark enough to carry white type.
const DARK_FILLS = new Set([BLUE, CORAL]);
function inkOrWhite(c: string) {
  return DARK_FILLS.has(c) ? '#fff' : INK;
}

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
function colorFor(role: string | null) {
  return (role && ROLE_COLOR[role]) || OTHER_COLOR;
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
function nftFor(userId: string) {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n = (n * 31 + userId.charCodeAt(i)) % 9973;
  return NFTS[n % NFTS.length];
}

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
  const c = colorFor(role);
  return (
    <span
      className={`inline-block font-semibold uppercase rounded-full ${big ? 'text-[11px] px-3 py-1.5' : 'text-[10px] px-2.5 py-1'}`}
      style={{ background: c, color: inkOrWhite(c), border: `2px solid ${INK}`, letterSpacing: '0.03em' }}
    >
      {role}
    </span>
  );
}

function HolderCard({ holder, index, onClick }: { holder: Holder; index: number; onClick: () => void }) {
  const role = displayRoleOf(holder);
  const days = daysSince(holder.joinedAt);
  const c = colorFor(role);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 14) * 0.02, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.15 } }}
      className="group text-left rounded-3xl overflow-hidden"
      style={{ background: '#fff', border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, fontFamily: BODY }}
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: c }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={holder.avatarUrl}
          alt={holder.displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full overflow-hidden"
          style={{ border: `3px solid ${INK}`, background: '#fff' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3.5" style={{ borderTop: `3px solid ${INK}` }}>
        <p className="font-semibold text-[15px] leading-tight truncate" style={{ color: INK }} title={holder.displayName}>
          {holder.displayName}
        </p>
        <p className="text-xs truncate mb-2.5" style={{ color: '#6F6885' }}>
          @{holder.username}
        </p>
        <div className="flex items-center justify-between gap-2">
          {role ? <RoleChip role={role} /> : <span className="text-[10px]" style={{ color: '#9A93AC' }}>no role</span>}
          {days !== null && (
            <span className="text-[10px] font-semibold" style={{ color: '#9A93AC' }}>
              {formatDays(days)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function HolderModal({ holder, activity, onClose }: { holder: Holder; activity: Activity | null; onClose: () => void }) {
  const role = displayRoleOf(holder);
  const days = daysSince(holder.joinedAt);
  const c = colorFor(role);

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
      style={{ background: 'rgba(27,22,51,0.82)', fontFamily: BODY }}
    >
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[28px] overflow-hidden"
        style={{ background: '#fff', border: `4px solid ${INK}`, boxShadow: `9px 9px 0 ${INK}` }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full font-semibold"
          style={{ background: CREAM, border: `3px solid ${INK}`, color: INK }}
        >
          ✕
        </button>

        <div className="relative aspect-square" style={{ background: c }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={holder.avatarUrl} alt={holder.displayName} className="w-full h-full object-cover" />
          <div
            className="absolute bottom-3 left-3 w-20 h-20 rounded-2xl overflow-hidden"
            style={{ border: `4px solid ${INK}`, background: '#fff' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="px-5 pt-4 pb-6" style={{ borderTop: `4px solid ${INK}`, color: INK }}>
          <p className="text-3xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
            {holder.displayName}
          </p>
          <p className="text-sm mb-3" style={{ color: '#6F6885' }}>
            @{holder.username}
          </p>

          {role && (
            <div className="mb-4">
              <RoleChip role={role} big />
            </div>
          )}

          {days !== null && (
            <div className="rounded-2xl p-3.5 mb-3" style={{ background: CREAM, border: `3px solid ${INK}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#6F6885' }}>
                Locked in for
              </p>
              <p className="text-3xl leading-none mt-1" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
                {formatDays(days)}
              </p>
              <p className="text-[11px] mt-1" style={{ color: '#6F6885' }}>
                joined {formatJoinDate(holder.joinedAt)}
              </p>
            </div>
          )}

          {activity && (activity.contributions || activity.eventsWon || activity.eventsHosted) ? (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { l: 'Contrib', v: activity.contributions ?? 0, c: MINT },
                { l: 'Won', v: activity.eventsWon ?? 0, c: YELLOW },
                { l: 'Host', v: activity.eventsHosted ?? 0, c: LILAC },
              ].map(t => (
                <div key={t.l} className="rounded-xl p-2 text-center" style={{ background: t.c, border: `3px solid ${INK}` }}>
                  <div className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: INK, opacity: 0.65 }}>
                    {t.l}
                  </div>
                  <div className="text-xl leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
                    {t.v.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <a
            href={`/stats?u=${encodeURIComponent(holder.username)}`}
            className="block text-center px-3 py-3 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ background: INK, color: CREAM }}
          >
            View on /stats
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
      style={{ background: 'rgba(27,22,51,0.85)', fontFamily: BODY }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[30px] px-8 py-9 text-center"
        style={{ background: found ? YELLOW : CREAM, border: `4px solid ${INK}`, boxShadow: `11px 11px 0 ${INK}`, color: INK }}
      >
        {found && member ? (
          <>
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden mb-5" style={{ border: `4px solid ${INK}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
            </div>
            <p className="text-5xl leading-none mb-3" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              You&apos;re in
            </p>
            <p className="font-semibold text-lg leading-tight">{member.displayName}</p>
            <p className="text-sm mb-4" style={{ color: '#6F6885' }}>
              @{member.username}
            </p>
            {displayRoleOf(member) && <RoleChip role={displayRoleOf(member)!} big />}
          </>
        ) : (
          <>
            <div
              className="w-24 h-24 mx-auto rounded-full mb-5 flex items-center justify-center text-4xl"
              style={{ background: '#fff', border: `4px solid ${INK}`, fontFamily: DISPLAY, fontWeight: 800 }}
            >
              ?
            </div>
            <p className="text-4xl leading-none mb-3" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              Not on the shelf
            </p>
            <p className="font-semibold">@{query.replace(/^@/, '')}</p>
            <p className="text-sm mt-3" style={{ color: '#6F6885' }}>
              No PloPlo Holder badge on this account yet.
            </p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-7 px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ background: INK, color: CREAM }}
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

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroTitleY = useTransform(heroP, [0, 1], [0, -130]);
  const heroFade = useTransform(heroP, [0, 0.75], [1, 0]);
  const floatA = useTransform(heroP, [0, 1], [0, -250]);
  const floatB = useTransform(heroP, [0, 1], [0, -110]);
  const floatC = useTransform(heroP, [0, 1], [0, -360]);
  const heroSpin = useTransform(heroP, [0, 1], [0, 14]);

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
    return data.holders.find(x => x.username.toLowerCase() === q || x.displayName.toLowerCase() === q) ?? 'not-found';
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

  const floatCard = (src: string) => (
    <div className="rounded-[26px] overflow-hidden" style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" />
    </div>
  );

  // No overflow-x-hidden on the root — it would break the sticky filter bar.
  return (
    <div className="relative" style={{ color: INK, fontFamily: BODY, background: CREAM }}>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[6px] z-[300] origin-left"
        style={{ scaleX: progress, background: BLUE, borderBottom: `2px solid ${INK}` }}
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

      {/* ══ 1. HERO ══ */}
      <section
        ref={heroRef}
        className="relative h-screen min-h-[640px] flex items-center justify-center px-5 overflow-hidden"
        style={{ background: CREAM, backgroundImage: starTile(INK, 0.05) }}
      >
        <motion.div style={{ y: floatA, rotate: heroSpin }} className="hidden md:block absolute left-[7%] top-[17%] w-36 lg:w-48">
          {floatCard(NFTS[0])}
        </motion.div>
        <motion.div style={{ y: floatB }} className="hidden lg:block absolute right-[9%] top-[13%] w-32 lg:w-40 rotate-6">
          {floatCard(NFTS[1])}
        </motion.div>
        <motion.div style={{ y: floatC }} className="hidden md:block absolute right-[12%] bottom-[14%] w-28 lg:w-36 -rotate-6">
          {floatCard(NFTS[2])}
        </motion.div>
        <motion.div style={{ y: floatB }} className="hidden xl:block absolute left-[10%] bottom-[12%] w-28 rotate-3">
          {floatCard(NFTS[3])}
        </motion.div>

        <motion.div style={{ y: heroTitleY, opacity: heroFade }} className="relative z-10 w-full max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-block text-[11px] font-semibold uppercase tracking-[0.22em] px-5 py-2.5 rounded-full mb-8"
            style={{ background: '#fff', border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}
          >
            PloPlo Holder · Ritual community
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="uppercase leading-[0.92] text-[12vw] sm:text-[10vw] md:text-[7rem]"
            style={{ fontFamily: DISPLAY, fontWeight: 800 }}
          >
            <span className="block" style={{ color: INK }}>
              Are you
            </span>
            <span className="block" style={{ color: BLUE }}>
              PloPlo Holder?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.26 }}
            className="mt-6 text-base md:text-lg"
            style={{ color: '#5B5473' }}
          >
            {data ? `${data.count} members` : '…'} hold the PloPlo Holder badge in the Ritual server.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="flex md:hidden justify-center gap-3 mt-6"
          >
            {NFTS.slice(0, 3).map((src, i) => (
              <div
                key={src}
                className="w-20 h-20 rounded-2xl overflow-hidden"
                style={{ border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, transform: `rotate(${[-5, 2, 5][i]}deg)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" />
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
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
                placeholder="your discord username…"
                autoComplete="off"
                className="flex-1 px-5 py-3.5 rounded-2xl outline-none"
                style={{ background: '#fff', border: `3px solid ${INK}`, color: INK }}
              />
              <button
                type="submit"
                className="px-7 py-3.5 rounded-2xl font-semibold uppercase text-xs tracking-[0.12em] transition-transform active:translate-y-1"
                style={{ background: YELLOW, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, color: INK }}
              >
                Check
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 text-left"
                style={{ background: '#fff', border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}` }}
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
                      <div className="text-sm font-semibold truncate">{s.displayName}</div>
                      <div className="text-xs truncate" style={{ color: '#6F6885' }}>
                        @{s.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>

        <motion.button
          onClick={() => bandRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ opacity: heroFade, color: '#6F6885' }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
        >
          scroll
          <motion.span animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-lg">
            ↓
          </motion.span>
        </motion.button>
      </section>

      {/* ══ 2. MARQUEE BAND ══ */}
      <section
        ref={bandRef}
        className="relative h-screen min-h-[620px] flex flex-col justify-center overflow-hidden"
        style={{ background: INK, backgroundImage: starTile('%23ffffff', 0.05), borderTop: `4px solid ${INK}` }}
      >
        <motion.div style={{ x: rowLeft }} className="flex gap-5 mb-7 w-max">
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

        <motion.div style={{ scale: bandScale }} className="relative z-10 text-center py-4 px-4">
          <p className="uppercase leading-[0.95] text-[14vw] md:text-[8rem]" style={{ fontFamily: DISPLAY, fontWeight: 800, color: YELLOW }}>
            <CountUp to={data?.count ?? 0} /> certified
          </p>
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.3em] mt-3" style={{ color: 'rgba(255,243,222,.55)' }}>
            PloPlo Genesis · on-chain art
          </p>
        </motion.div>

        <motion.div style={{ x: rowRight }} className="flex gap-5 mt-7 w-max">
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

      {/* ══ 3. STATS ══ */}
      <section
        className="relative min-h-screen flex flex-col justify-center px-5 py-24"
        style={{ background: PINK, backgroundImage: starTile(INK, 0.06), borderTop: `4px solid ${INK}` }}
      >
        <div className="max-w-5xl mx-auto w-full">
          <motion.h2
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="uppercase text-[12vw] md:text-7xl leading-[0.95] mb-3 text-center"
            style={{ fontFamily: DISPLAY, fontWeight: 800, color: INK }}
          >
            Who&apos;s inside
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="text-center mb-14"
            style={{ color: '#5B5473' }}
          >
            Holders split by their Ritual contributor role.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {data &&
              [...mainPresent, ...(otherCount > 0 ? ['other'] : [])].map((role, i) => {
                const count = role === 'other' ? otherCount : data.holders.filter(h => displayRoleOf(h) === role).length;
                const c = role === 'other' ? OTHER_COLOR : colorFor(role);
                return (
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5 }}
                    className="rounded-[26px] p-7"
                    style={{ background: c, color: inkOrWhite(c), border: `4px solid ${INK}`, boxShadow: `7px 7px 0 ${INK}` }}
                  >
                    <p className="text-6xl leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
                      <CountUp to={count} />
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] mt-2.5 opacity-75">
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
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-14 mx-auto block w-max px-9 py-4 rounded-full font-semibold uppercase tracking-[0.12em] text-xs transition-transform hover:-translate-y-1"
            style={{ background: INK, color: CREAM, border: `4px solid ${INK}`, boxShadow: `6px 6px 0 ${CREAM}` }}
          >
            View the collection on OpenSea ↗
          </motion.a>
        </div>
      </section>

      {/* ══ 4. ROSTER ══ */}
      <section
        className="relative px-4 pb-28"
        style={{ background: CREAM, backgroundImage: starTile(INK, 0.05), borderTop: `4px solid ${INK}` }}
      >
        <div className="max-w-7xl mx-auto pt-16">
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="uppercase text-[12vw] md:text-7xl leading-[0.95] text-center mb-10"
            style={{ fontFamily: DISPLAY, fontWeight: 800, color: INK }}
          >
            The shelf
          </motion.h2>

          {err && (
            <p className="text-center font-semibold mb-8" style={{ color: CORAL }}>
              {err}
            </p>
          )}
          {!data && !err && (
            <p className="text-center mb-8" style={{ color: '#6F6885' }}>
              Loading registry…
            </p>
          )}

          {data && (
            <>
              <div className="sticky top-4 z-30 mb-10">
                <div
                  className="flex flex-wrap gap-1.5 justify-center p-2 rounded-2xl mx-auto w-max max-w-full"
                  style={{ background: '#fff', border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}` }}
                >
                  {(['all', ...mainPresent, ...(otherCount > 0 ? ['other'] : [])] as string[]).map(role => {
                    const active = filter === role;
                    const count =
                      role === 'all'
                        ? data.holders.length
                        : role === 'other'
                        ? otherCount
                        : data.holders.filter(h => displayRoleOf(h) === role).length;
                    const c = role === 'all' ? BLUE : role === 'other' ? OTHER_COLOR : colorFor(role);
                    return (
                      <button
                        key={role}
                        onClick={() => setFilter(role)}
                        className="px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
                        style={active ? { background: c, color: inkOrWhite(c) } : { color: '#6F6885' }}
                      >
                        {role === 'all' ? 'All' : role === 'other' ? 'Other' : role} ({count})
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

              {sorted.length === 0 && (
                <p className="text-center mt-10" style={{ color: '#6F6885' }}>
                  No holders match this filter.
                </p>
              )}

              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] mt-16" style={{ color: '#9A93AC' }}>
                Updated {new Date(data.updatedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
      </section>

      <footer
        className="relative px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ background: INK, backgroundImage: starTile('%23ffffff', 0.05), color: CREAM, borderTop: `4px solid ${INK}` }}
      >
        <p className="text-3xl uppercase leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, color: YELLOW }}>
          PloPlo Holder
        </p>
        <div className="flex items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,243,222,.6)' }}>
          <a href="/genesis" className="hover:text-white transition-colors">
            Genesis 1000
          </a>
          <a href="/stats" className="hover:text-white transition-colors">
            Stats
          </a>
          <a href={OPENSEA} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            OpenSea ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
