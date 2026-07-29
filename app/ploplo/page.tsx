'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   PloPlo Holder registry — standalone landing.

   Art direction follows a cosmic reference: deep navy night sky,
   a big glowing disc as the anchor, thin orbit lines, layered
   hills. The PloPlo NFTs are cut into circles and placed ON the
   orbits so they read as planets in the scene rather than
   stickers floating over it.
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

/* Palette lifted from the reference image. */
const NIGHT = '#0E1330';
const DEEP = '#1A2150';
const INDIGO = '#2B3272';
const HAZE = '#5A61A6';
const LAVENDER = '#B9B7E0';
const MIST = '#E6E6F7';
const PEACH = '#F5C9A8';
const PINK = '#E98BA0';

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

// Muted tints that sit inside the night palette — all light enough
// to carry NIGHT-coloured type.
const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': PEACH,
  Zealot: '#FF8B87',
  Ritualist: '#8FD3C8',
  Mage: '#8FB8E8',
  ritty: '#A9A5E4',
  bitty: '#7C86D6',
  Forerunner: '#E8B98F',
  Initiate: '#9FD5E8',
  Blessed: '#F2DFAE',
  Cursed: '#A7A3BF',
  Harmonic: PINK,
};
const OTHER_COLOR = '#8B90BC';

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

/* Deterministic starfield — seeded so SSR and client agree. */
function makeStars(count: number, seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: count }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    r: 0.5 + rnd() * 1.6,
    o: 0.25 + rnd() * 0.65,
  }));
}
const HERO_STARS = makeStars(150, 7);
const PAGE_STARS = makeStars(90, 21);

function StarField({ stars, className = '' }: { stars: ReturnType<typeof makeStars>; className?: string }) {
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} aria-hidden>
      {stars.map((st, i) => (
        <circle key={i} cx={`${st.x}%`} cy={`${st.y}%`} r={st.r} fill="#fff" opacity={st.o} />
      ))}
    </svg>
  );
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
  return (
    <span
      className={`inline-block font-semibold uppercase rounded-full ${big ? 'text-[11px] px-3 py-1.5' : 'text-[10px] px-2.5 py-1'}`}
      style={{ background: colorFor(role), color: NIGHT, letterSpacing: '0.04em' }}
    >
      {role}
    </span>
  );
}

/* ── holder card: a small planet dossier ── */
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
      transition={{ duration: 0.45, delay: Math.min(index, 14) * 0.02, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.15 } }}
      className="group text-left rounded-3xl overflow-hidden"
      style={{ background: DEEP, border: `1px solid ${INDIGO}`, fontFamily: BODY }}
    >
      <div className="relative aspect-square flex items-center justify-center p-4">
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, ${INDIGO} 0%, ${DEEP} 68%)` }} />
        <div
          className="relative w-full aspect-square rounded-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.05]"
          style={{ boxShadow: `0 0 0 2px ${c}55, 0 14px 34px -12px ${NIGHT}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={holder.avatarUrl} alt={holder.displayName} className="w-full h-full object-cover" />
        </div>
        <div
          className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full overflow-hidden"
          style={{ boxShadow: `0 0 0 2px ${DEEP}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3.5" style={{ borderTop: `1px solid ${INDIGO}` }}>
        <p className="font-semibold text-[15px] leading-tight truncate" style={{ color: MIST }} title={holder.displayName}>
          {holder.displayName}
        </p>
        <p className="text-xs truncate mb-2.5" style={{ color: HAZE }}>
          @{holder.username}
        </p>
        <div className="flex items-center justify-between gap-2">
          {role ? <RoleChip role={role} /> : <span className="text-[10px]" style={{ color: HAZE }}>no role</span>}
          {days !== null && (
            <span className="text-[10px] font-semibold" style={{ color: HAZE }}>
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
      style={{ background: 'rgba(14,19,48,0.86)', fontFamily: BODY }}
    >
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[28px] overflow-hidden"
        style={{ background: DEEP, border: `1px solid ${INDIGO}`, boxShadow: `0 50px 90px -40px #000` }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full font-semibold"
          style={{ background: INDIGO, color: MIST }}
        >
          ✕
        </button>

        <div className="relative aspect-square flex items-center justify-center p-7">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 40%, ${INDIGO} 0%, ${DEEP} 70%)` }} />
          <StarField stars={PAGE_STARS} />
          <div
            className="relative w-full aspect-square rounded-full overflow-hidden"
            style={{ boxShadow: `0 0 0 3px ${c}66, 0 0 60px -6px ${c}55` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={holder.avatarUrl} alt={holder.displayName} className="w-full h-full object-cover" />
          </div>
          <div
            className="absolute bottom-4 left-4 w-16 h-16 rounded-full overflow-hidden"
            style={{ boxShadow: `0 0 0 3px ${DEEP}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="px-5 pt-4 pb-6" style={{ borderTop: `1px solid ${INDIGO}`, color: MIST }}>
          <p className="text-3xl leading-tight" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
            {holder.displayName}
          </p>
          <p className="text-sm mb-3" style={{ color: HAZE }}>
            @{holder.username}
          </p>

          {role && (
            <div className="mb-4">
              <RoleChip role={role} big />
            </div>
          )}

          {days !== null && (
            <div className="rounded-2xl p-3.5 mb-3" style={{ background: INDIGO }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: LAVENDER }}>
                Locked in for
              </p>
              <p className="text-3xl leading-none mt-1" style={{ fontFamily: DISPLAY, fontWeight: 800, color: PEACH }}>
                {formatDays(days)}
              </p>
              <p className="text-[11px] mt-1" style={{ color: HAZE }}>
                joined {formatJoinDate(holder.joinedAt)}
              </p>
            </div>
          )}

          {activity && (activity.contributions || activity.eventsWon || activity.eventsHosted) ? (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { l: 'Contrib', v: activity.contributions ?? 0, c: '#8FD3C8' },
                { l: 'Won', v: activity.eventsWon ?? 0, c: PEACH },
                { l: 'Host', v: activity.eventsHosted ?? 0, c: '#A9A5E4' },
              ].map(t => (
                <div key={t.l} className="rounded-xl p-2 text-center" style={{ background: INDIGO }}>
                  <div className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: HAZE }}>
                    {t.l}
                  </div>
                  <div className="text-xl leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, color: t.c }}>
                    {t.v.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <a
            href={`/stats?u=${encodeURIComponent(holder.username)}`}
            className="block text-center px-3 py-3 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ background: MIST, color: NIGHT }}
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
      style={{ background: 'rgba(14,19,48,0.9)', fontFamily: BODY }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[30px] px-8 py-9 text-center overflow-hidden"
        style={{ background: DEEP, border: `1px solid ${INDIGO}`, color: MIST }}
      >
        <StarField stars={PAGE_STARS} />

        {found && member ? (
          <div className="relative">
            <div
              className="w-28 h-28 mx-auto rounded-full overflow-hidden mb-5"
              style={{ boxShadow: `0 0 0 3px ${PEACH}, 0 0 70px -6px ${PEACH}99` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
            </div>
            <p className="text-5xl leading-none mb-3" style={{ fontFamily: DISPLAY, fontWeight: 800, color: PEACH }}>
              You&apos;re in
            </p>
            <p className="font-semibold text-lg leading-tight">{member.displayName}</p>
            <p className="text-sm mb-4" style={{ color: HAZE }}>
              @{member.username}
            </p>
            {displayRoleOf(member) && <RoleChip role={displayRoleOf(member)!} big />}
          </div>
        ) : (
          <div className="relative">
            <div
              className="w-24 h-24 mx-auto rounded-full mb-5 flex items-center justify-center text-4xl"
              style={{ background: INDIGO, color: HAZE, fontFamily: DISPLAY, fontWeight: 800 }}
            >
              ?
            </div>
            <p className="text-4xl leading-none mb-3" style={{ fontFamily: DISPLAY, fontWeight: 800 }}>
              Not in orbit
            </p>
            <p className="font-semibold">@{query.replace(/^@/, '')}</p>
            <p className="text-sm mt-3" style={{ color: HAZE }}>
              No PloPlo Holder badge on this account yet.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="relative mt-7 px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ background: MIST, color: NIGHT }}
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
  const heroTitleY = useTransform(heroP, [0, 1], [0, -120]);
  const heroFade = useTransform(heroP, [0, 0.8], [1, 0]);
  const discScale = useTransform(heroP, [0, 1], [1, 1.25]);
  // Planets drift at different depths — far ones barely move.
  const planetFar = useTransform(heroP, [0, 1], [0, -70]);
  const planetMid = useTransform(heroP, [0, 1], [0, -190]);
  const planetNear = useTransform(heroP, [0, 1], [0, -330]);
  const hillsY = useTransform(heroP, [0, 1], [0, 90]);
  const starsY = useTransform(heroP, [0, 1], [0, -40]);

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

  /* A PloPlo cut into a circle and lit from one side, so it reads as
     a planet sitting on the orbit line. `ring` adds a Saturn band. */
  const planet = (src: string, ring?: string) => (
    <div className="relative w-full aspect-square">
      {ring && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            width: '168%',
            height: '46%',
            border: `6px solid ${ring}`,
            transform: 'translate(-50%,-50%) rotate(-18deg)',
            opacity: 0.85,
          }}
        />
      )}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" />
        {/* terminator shading ties the planet to the scene's light */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(120deg, rgba(14,19,48,0) 38%, rgba(14,19,48,.72) 100%)` }}
        />
      </div>
    </div>
  );

  // No overflow-x-hidden on the root — it would break the sticky filter bar.
  return (
    <div className="relative" style={{ color: MIST, fontFamily: BODY, background: NIGHT }}>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[4px] z-[300] origin-left"
        style={{ scaleX: progress, background: PEACH }}
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

      {/* ══ 1. HERO — cosmic scene ══ */}
      <section
        ref={heroRef}
        className="relative h-screen min-h-[680px] overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${NIGHT} 0%, #171E45 42%, #2A2F63 72%, #4A4A85 100%)` }}
      >
        <motion.div style={{ y: starsY }} className="absolute inset-0">
          <StarField stars={HERO_STARS} />
        </motion.div>

        {/* orbit lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden preserveAspectRatio="none">
          <line x1="-5%" y1="34%" x2="105%" y2="16%" stroke={LAVENDER} strokeWidth="1" opacity="0.28" />
          <line x1="-5%" y1="58%" x2="105%" y2="30%" stroke={LAVENDER} strokeWidth="1" opacity="0.2" />
          <line x1="-5%" y1="12%" x2="105%" y2="46%" stroke={LAVENDER} strokeWidth="1" opacity="0.16" />
        </svg>

        {/* the glowing disc — a moon rising behind the hills */}
        <motion.div
          style={{ scale: discScale }}
          className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[62%] rounded-full"
        >
          <div
            className="rounded-full"
            style={{
              width: 'min(56vw, 440px)',
              height: 'min(56vw, 440px)',
              background: `radial-gradient(circle at 50% 34%, #C9CBEC 0%, #8E93C8 46%, #5C63A6 78%, #3C4285 100%)`,
              boxShadow: `0 0 0 10px rgba(255,255,255,.92), 0 0 150px 45px rgba(255,255,255,.4)`,
            }}
          />
        </motion.div>

        {/* planets on the orbits */}
        <motion.div style={{ y: planetFar }} className="absolute left-[4%] top-[9%] w-24 md:w-36 lg:w-44 opacity-95">
          {planet(NFTS[0])}
        </motion.div>
        <motion.div style={{ y: planetMid }} className="absolute right-[5%] top-[26%] w-28 md:w-40 lg:w-52">
          {planet(NFTS[1], PEACH)}
        </motion.div>
        <motion.div style={{ y: planetFar }} className="absolute right-[24%] top-[8%] w-12 md:w-16 lg:w-20 opacity-90">
          {planet(NFTS[2])}
        </motion.div>
        <motion.div style={{ y: planetNear }} className="absolute left-[13%] bottom-[16%] w-20 md:w-28 lg:w-36">
          {planet(NFTS[3])}
        </motion.div>
        <motion.div style={{ y: planetMid }} className="hidden md:block absolute left-[27%] top-[6%] w-10 lg:w-14 opacity-90">
          {planet(NFTS[4])}
        </motion.div>

        {/* layered hills */}
        <motion.div style={{ y: hillsY }} className="absolute inset-x-0 bottom-0 h-[38%]">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
            <path d="M0 190 C 190 120, 330 205, 520 175 C 700 145, 850 210, 1030 180 C 1200 150, 1330 200, 1440 175 L1440 400 L0 400 Z" fill="#5C5F94" opacity="0.85" />
            <path d="M0 250 C 210 195, 380 265, 560 240 C 760 210, 900 275, 1090 245 C 1250 220, 1350 265, 1440 245 L1440 400 L0 400 Z" fill="#3B3E73" />
            <path d="M0 315 C 240 275, 420 335, 640 312 C 860 288, 1010 340, 1200 318 C 1320 305, 1390 325, 1440 315 L1440 400 L0 400 Z" fill="#232750" />
          </svg>
        </motion.div>

        {/* copy */}
        <motion.div
          style={{ y: heroTitleY, opacity: heroFade }}
          className="relative z-10 h-full flex flex-col items-center px-5 text-center pt-[13vh]"
        >
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-block text-[10px] font-semibold uppercase tracking-[0.26em] px-5 py-2 rounded-full mb-7"
            style={{ background: 'rgba(230,230,247,.12)', color: MIST, border: `1px solid rgba(230,230,247,.28)` }}
          >
            PloPlo Holder · Ritual community
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="uppercase leading-[0.94] text-[11vw] sm:text-[9vw] md:text-[6.5rem] max-w-4xl"
            style={{ fontFamily: DISPLAY, fontWeight: 800, color: MIST, textShadow: '0 6px 40px rgba(14,19,48,.65)' }}
          >
            <span className="block">Are you</span>
            <span className="block">PloPlo Holder?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.26 }}
            className="mt-6 text-sm md:text-base max-w-md"
            style={{ color: MIST }}
          >
            {data ? `${data.count} members` : '…'} hold the PloPlo Holder badge in the Ritual server.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            ref={suggestRef}
            className="relative w-full max-w-md mt-7"
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
                className="flex-1 px-5 py-3.5 rounded-full outline-none placeholder:text-[#6E74A8]"
                style={{ background: 'rgba(14,19,48,.72)', border: `1px solid ${HAZE}`, color: MIST }}
              />
              <button
                type="submit"
                className="px-7 py-3.5 rounded-full font-semibold uppercase text-xs tracking-[0.12em] transition-transform active:scale-95"
                style={{ background: PEACH, color: NIGHT }}
              >
                Check
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 text-left"
                style={{ background: DEEP, border: `1px solid ${INDIGO}` }}
              >
                {suggestions.map(s => (
                  <button
                    key={s.userId}
                    onMouseDown={() => {
                      setQuery(s.username);
                      setShowSuggestions(false);
                      setVerdict(resolve(s.username));
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.avatarUrl || `/api/avatar?id=${s.userId}`}
                        alt={s.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: MIST }}>
                        {s.displayName}
                      </div>
                      <div className="text-xs truncate" style={{ color: HAZE }}>
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
          style={{ opacity: heroFade, color: MIST }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
        >
          scroll
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-base">
            ↓
          </motion.span>
        </motion.button>
      </section>

      {/* ══ 2. MARQUEE BAND ══ */}
      <section
        ref={bandRef}
        className="relative h-screen min-h-[620px] flex flex-col justify-center overflow-hidden"
        style={{ background: NIGHT }}
      >
        <StarField stars={PAGE_STARS} />

        <motion.div style={{ x: rowLeft }} className="relative flex gap-5 mb-7 w-max">
          {marqueeRow.map((src, i) => (
            <div key={`a${i}`} className="w-36 md:w-52 aspect-square rounded-full overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>

        <motion.div style={{ scale: bandScale }} className="relative z-10 text-center py-4 px-4">
          <p className="uppercase leading-[0.95] text-[13vw] md:text-[7.5rem]" style={{ fontFamily: DISPLAY, fontWeight: 800, color: PEACH }}>
            <CountUp to={data?.count ?? 0} /> certified
          </p>
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.3em] mt-3" style={{ color: HAZE }}>
            PloPlo Genesis · on-chain art
          </p>
        </motion.div>

        <motion.div style={{ x: rowRight }} className="relative flex gap-5 mt-7 w-max">
          {marqueeRow.map((src, i) => (
            <div key={`b${i}`} className="w-36 md:w-52 aspect-square rounded-full overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>
      </section>

      {/* ══ 3. STATS ══ */}
      <section className="relative min-h-screen flex flex-col justify-center px-5 py-24" style={{ background: DEEP }}>
        <StarField stars={PAGE_STARS} />
        <div className="relative max-w-5xl mx-auto w-full">
          <motion.h2
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="uppercase text-[12vw] md:text-7xl leading-[0.95] mb-3 text-center"
            style={{ fontFamily: DISPLAY, fontWeight: 800, color: MIST }}
          >
            Who&apos;s inside
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="text-center mb-14"
            style={{ color: LAVENDER }}
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
                    className="relative rounded-[26px] p-7 overflow-hidden"
                    style={{ background: NIGHT, border: `1px solid ${INDIGO}` }}
                  >
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ background: c, opacity: 0.16 }} />
                    <p className="relative text-6xl leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, color: c }}>
                      <CountUp to={count} />
                    </p>
                    <p className="relative text-xs font-semibold uppercase tracking-[0.12em] mt-2.5" style={{ color: LAVENDER }}>
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
            style={{ background: MIST, color: NIGHT }}
          >
            View the collection on OpenSea ↗
          </motion.a>
        </div>
      </section>

      {/* ══ 4. ROSTER ══ */}
      <section className="relative px-4 pb-28" style={{ background: NIGHT }}>
        <StarField stars={PAGE_STARS} />
        <div className="relative max-w-7xl mx-auto pt-16">
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="uppercase text-[12vw] md:text-7xl leading-[0.95] text-center mb-10"
            style={{ fontFamily: DISPLAY, fontWeight: 800, color: MIST }}
          >
            The constellation
          </motion.h2>

          {err && (
            <p className="text-center font-semibold mb-8" style={{ color: '#FF8B87' }}>
              {err}
            </p>
          )}
          {!data && !err && (
            <p className="text-center mb-8" style={{ color: HAZE }}>
              Loading registry…
            </p>
          )}

          {data && (
            <>
              <div className="sticky top-4 z-30 mb-10">
                <div
                  className="flex flex-wrap gap-1.5 justify-center p-2 rounded-full mx-auto w-max max-w-full"
                  style={{ background: 'rgba(26,33,80,.92)', border: `1px solid ${INDIGO}`, backdropFilter: 'blur(8px)' }}
                >
                  {(['all', ...mainPresent, ...(otherCount > 0 ? ['other'] : [])] as string[]).map(role => {
                    const active = filter === role;
                    const count =
                      role === 'all'
                        ? data.holders.length
                        : role === 'other'
                        ? otherCount
                        : data.holders.filter(h => displayRoleOf(h) === role).length;
                    const c = role === 'all' ? MIST : role === 'other' ? OTHER_COLOR : colorFor(role);
                    return (
                      <button
                        key={role}
                        onClick={() => setFilter(role)}
                        className="px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
                        style={active ? { background: c, color: NIGHT } : { color: LAVENDER }}
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
                <p className="text-center mt-10" style={{ color: HAZE }}>
                  No holders match this filter.
                </p>
              )}

              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] mt-16" style={{ color: HAZE }}>
                Updated {new Date(data.updatedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
      </section>

      <footer
        className="relative px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ background: DEEP, borderTop: `1px solid ${INDIGO}` }}
      >
        <p className="text-3xl uppercase leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, color: PEACH }}>
          PloPlo Holder
        </p>
        <div className="flex items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: HAZE }}>
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
