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
   Own visual language (not the Siggy dark system): aurora mesh
   gradients + grain, glass cards, gradient display type.
   Every asset here is generated in CSS/SVG or pulled from the
   PloPlo collection itself — nothing borrowed from /public/Siggy*.
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

type Payload = {
  updatedAt: number;
  badge: string;
  count: number;
  holders: Holder[];
};

type Activity = { contributions?: number; eventsWon?: number; eventsHosted?: number };

const BADGE_SLUG = 'ploplo-holder';
const OPENSEA = 'https://opensea.io/collection/ploplo-genesis';

const DISPLAY = 'var(--ploplo-display), ui-sans-serif, system-ui, sans-serif';
const BODY = 'var(--ploplo-body), ui-sans-serif, system-ui, sans-serif';

const INK = '#171233';
const BLUE = '#2F6BFF';
const VIOLET = '#7C5CFF';
const PINK = '#FF5FA2';
const SUN = '#FFC93C';
const MINT = '#5FE3C0';
const CORAL = '#FF7A6B';

const HEADLINE_GRADIENT = `linear-gradient(100deg, ${BLUE} 0%, ${VIOLET} 38%, ${PINK} 68%, #FF9F45 100%)`;

// Self-generated film grain — keeps the flat gradients from banding.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

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

// Each role gets a gradient, not a flat swatch.
const ROLE_GRADIENT: Record<string, string> = {
  'Radiant Ritualist': 'linear-gradient(135deg,#FFD86B,#FF9F45)',
  Zealot: 'linear-gradient(135deg,#FF8A7A,#FF4D6D)',
  Ritualist: 'linear-gradient(135deg,#7CF0CE,#35BDA0)',
  Mage: 'linear-gradient(135deg,#9BE0FF,#4FA8FF)',
  ritty: 'linear-gradient(135deg,#D3C1FF,#8E6BFF)',
  bitty: 'linear-gradient(135deg,#8FB4FF,#2F6BFF)',
  Forerunner: 'linear-gradient(135deg,#FFC59B,#FF8A45)',
  Initiate: 'linear-gradient(135deg,#B7EEFF,#63C7EA)',
  Blessed: 'linear-gradient(135deg,#FFF0BF,#FFD86B)',
  Cursed: 'linear-gradient(135deg,#DAD5E8,#A9A2BF)',
  Harmonic: 'linear-gradient(135deg,#CFE0FF,#8FB4FF)',
};
const OTHER_GRADIENT = 'linear-gradient(135deg,#E8E3F5,#C9C2DC)';

// Gradients too light for white type — these get ink text instead.
const LIGHT_FILLS = new Set(['other', 'Blessed', 'Cursed', 'Harmonic', 'Initiate']);
function onFill(role: string) {
  return LIGHT_FILLS.has(role) ? INK : '#fff';
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
function gradientFor(role: string | null) {
  return (role && ROLE_GRADIENT[role]) || OTHER_GRADIENT;
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

/* ── animated aurora + grain backdrop ── */
function Aurora() {
  const blobs = [
    { c: '#A8C4FF', s: 620, top: '-14%', left: '-12%', d: 19, x: 70, y: -50 },
    { c: '#FFC7E8', s: 560, top: '8%', left: '62%', d: 23, x: -60, y: 60 },
    { c: '#BFF3E3', s: 520, top: '58%', left: '-6%', d: 21, x: 80, y: -40 },
    { c: '#FFE3A8', s: 480, top: '66%', left: '58%', d: 25, x: -50, y: -60 },
  ];
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: 'linear-gradient(155deg,#FFF7EC 0%,#FBF0FF 42%,#EEF5FF 78%,#FFF3E9 100%)' }}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.s,
            height: b.s,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle at 40% 40%, ${b.c} 0%, ${b.c}00 68%)`,
            filter: 'blur(28px)',
            opacity: 0.85,
          }}
          animate={{ x: [0, b.x, 0], y: [0, b.y, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: b.d, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0" style={{ backgroundImage: GRAIN, opacity: 0.28, mixBlendMode: 'multiply' }} />
    </div>
  );
}

/* ── count-up that fires when scrolled into view ── */
function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
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
      className={`inline-block font-extrabold uppercase tracking-wide rounded-full ${
        big ? 'text-[11px] px-3.5 py-1.5' : 'text-[10px] px-2.5 py-1'
      }`}
      style={{
        color: onFill(role),
        backgroundImage: gradientFor(role),
        boxShadow: '0 6px 16px -8px rgba(23,18,51,.8), inset 0 1px 0 rgba(255,255,255,.45)',
        letterSpacing: '0.04em',
      }}
    >
      {role}
    </span>
  );
}

/* Gradient-ring wrapper: 1.5px gradient border around a glass card. */
function GradientRing({
  children,
  gradient,
  radius = 24,
  className = '',
  style,
}: {
  children: React.ReactNode;
  gradient: string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{ backgroundImage: gradient, borderRadius: radius, padding: 1.5, ...style }}
    >
      <div style={{ borderRadius: radius - 1.5, overflow: 'hidden', height: '100%' }}>{children}</div>
    </div>
  );
}

/* ── holder card ── */
function HolderCard({ holder, index, onClick }: { holder: Holder; index: number; onClick: () => void }) {
  const role = displayRoleOf(holder);
  const days = daysSince(holder.joinedAt);
  const g = gradientFor(role);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 14) * 0.022, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.18 } }}
      className="group text-left"
      style={{ fontFamily: BODY }}
    >
      <GradientRing gradient={g} radius={24} style={{ boxShadow: '0 22px 40px -26px rgba(23,18,51,.75)' }}>
        <div style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(14px)' }}>
          <div className="relative aspect-square overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundImage: g, opacity: 0.35 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={holder.avatarUrl}
              alt={holder.displayName}
              className="relative w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-16"
              style={{ background: 'linear-gradient(to top, rgba(255,255,255,.9), transparent)' }}
            />
            <div
              className="absolute bottom-2 right-2 w-12 h-12 rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-110"
              style={{ boxShadow: '0 6px 18px -6px rgba(23,18,51,.9), 0 0 0 2px rgba(255,255,255,.9)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          <div className="px-3.5 pt-3 pb-4">
            <p className="font-extrabold text-[15px] leading-tight truncate" style={{ color: INK }} title={holder.displayName}>
              {holder.displayName}
            </p>
            <p className="text-xs truncate mb-2.5" style={{ color: '#6D6690' }}>
              @{holder.username}
            </p>
            <div className="flex items-center justify-between gap-2">
              {role ? <RoleChip role={role} /> : <span className="text-[10px]" style={{ color: '#9A93B8' }}>no role</span>}
              {days !== null && (
                <span className="text-[10px] font-bold" style={{ color: '#9A93B8' }}>
                  {formatDays(days)}
                </span>
              )}
            </div>
          </div>
        </div>
      </GradientRing>
    </motion.button>
  );
}

/* ── detail modal ── */
function HolderModal({ holder, activity, onClose }: { holder: Holder; activity: Activity | null; onClose: () => void }) {
  const role = displayRoleOf(holder);
  const days = daysSince(holder.joinedAt);
  const g = gradientFor(role);

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
      style={{ backgroundColor: 'rgba(23,18,51,0.5)', backdropFilter: 'blur(10px)', fontFamily: BODY }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm"
      >
        <GradientRing gradient={g} radius={30} style={{ boxShadow: '0 40px 80px -30px rgba(23,18,51,.9)' }}>
          <div style={{ background: 'rgba(255,255,255,.94)' }}>
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full font-bold text-white"
              style={{ background: 'rgba(23,18,51,.55)', backdropFilter: 'blur(6px)' }}
            >
              ✕
            </button>

            <div className="relative aspect-square">
              <div className="absolute inset-0" style={{ backgroundImage: g, opacity: 0.4 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={holder.avatarUrl} alt={holder.displayName} className="relative w-full h-full object-cover" />
              <div
                className="absolute inset-x-0 bottom-0 h-24"
                style={{ background: 'linear-gradient(to top, rgba(255,255,255,.95), transparent)' }}
              />
              <div
                className="absolute bottom-3 left-4 w-20 h-20 rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 12px 30px -10px rgba(23,18,51,.9), 0 0 0 3px rgba(255,255,255,.95)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={nftFor(holder.userId)} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="px-5 pt-4 pb-6" style={{ color: INK }}>
              <p className="text-3xl font-extrabold leading-tight tracking-tight" style={{ fontFamily: DISPLAY }}>
                {holder.displayName}
              </p>
              <p className="text-sm mb-3" style={{ color: '#6D6690' }}>
                @{holder.username}
              </p>

              {role && (
                <div className="mb-4">
                  <RoleChip role={role} big />
                </div>
              )}

              {days !== null && (
                <div
                  className="rounded-2xl p-3.5 mb-3"
                  style={{ backgroundImage: g, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5)' }}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">Locked in for</p>
                  <p className="text-3xl font-extrabold leading-none mt-1 text-white" style={{ fontFamily: DISPLAY }}>
                    {formatDays(days)}
                  </p>
                  <p className="text-[11px] mt-1 text-white/75">joined {formatJoinDate(holder.joinedAt)}</p>
                </div>
              )}

              {activity && (activity.contributions || activity.eventsWon || activity.eventsHosted) ? (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { l: 'Contrib', v: activity.contributions ?? 0, g: 'linear-gradient(135deg,#7CF0CE,#35BDA0)' },
                    { l: 'Won', v: activity.eventsWon ?? 0, g: 'linear-gradient(135deg,#FFD86B,#FF9F45)' },
                    { l: 'Host', v: activity.eventsHosted ?? 0, g: 'linear-gradient(135deg,#D3C1FF,#8E6BFF)' },
                  ].map(t => (
                    <div key={t.l} className="rounded-xl p-2 text-center text-white" style={{ backgroundImage: t.g }}>
                      <div className="text-[8px] font-extrabold uppercase tracking-[0.16em] opacity-80">{t.l}</div>
                      <div className="text-xl font-extrabold leading-none" style={{ fontFamily: DISPLAY }}>
                        {t.v.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <a
                href={`/stats?u=${encodeURIComponent(holder.username)}`}
                className="block text-center px-3 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-[0.14em] text-white"
                style={{ background: INK }}
              >
                View on /stats
              </a>
            </div>
          </div>
        </GradientRing>
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
      style={{ backgroundColor: 'rgba(23,18,51,0.55)', backdropFilter: 'blur(12px)', fontFamily: BODY }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[32px] px-8 py-9 text-center overflow-hidden"
        style={{
          backgroundImage: found
            ? HEADLINE_GRADIENT
            : 'linear-gradient(135deg,#F2EDFF,#FFF3E9)',
          boxShadow: '0 50px 90px -35px rgba(23,18,51,.95)',
          color: found ? '#fff' : INK,
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN, opacity: 0.2, mixBlendMode: 'overlay' }} />

        {found && member ? (
          <div className="relative">
            <div
              className="w-28 h-28 mx-auto rounded-full overflow-hidden mb-5"
              style={{ boxShadow: '0 0 0 4px rgba(255,255,255,.9), 0 20px 40px -14px rgba(23,18,51,.9)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
            </div>
            <p className="text-5xl font-extrabold leading-none mb-3 tracking-tight" style={{ fontFamily: DISPLAY }}>
              You&apos;re in
            </p>
            <p className="font-extrabold text-lg leading-tight">{member.displayName}</p>
            <p className="text-sm opacity-80 mb-4">@{member.username}</p>
            {displayRoleOf(member) && (
              <span
                className="inline-block text-[11px] font-extrabold uppercase tracking-[0.14em] px-4 py-2 rounded-full"
                style={{ background: 'rgba(255,255,255,.92)', color: INK }}
              >
                {displayRoleOf(member)}
              </span>
            )}
          </div>
        ) : (
          <div className="relative">
            <div
              className="w-24 h-24 mx-auto rounded-full mb-5 flex items-center justify-center text-4xl font-extrabold"
              style={{ background: 'rgba(255,255,255,.85)', color: '#9A93B8', fontFamily: DISPLAY }}
            >
              ?
            </div>
            <p className="text-4xl font-extrabold leading-none mb-3 tracking-tight" style={{ fontFamily: DISPLAY }}>
              Not on the shelf
            </p>
            <p className="font-extrabold">@{query.replace(/^@/, '')}</p>
            <p className="text-sm opacity-70 mt-3">
              No PloPlo Holder badge on this account yet. Stick around the community — badges follow.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="relative mt-7 px-7 py-3 rounded-full text-[11px] font-extrabold uppercase tracking-[0.18em]"
          style={{ background: found ? 'rgba(255,255,255,.95)' : INK, color: found ? INK : '#fff' }}
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
  const heroSpin = useTransform(heroP, [0, 1], [0, 18]);

  const { scrollYProgress: bandP } = useScroll({ target: bandRef, offset: ['start end', 'end start'] });
  const rowLeft = useTransform(bandP, [0, 1], ['2%', '-38%']);
  const rowRight = useTransform(bandP, [0, 1], ['-38%', '2%']);
  const bandScale = useTransform(bandP, [0, 0.5, 1], [0.88, 1, 0.88]);
  const bandGlow = useTransform(bandP, [0, 0.5, 1], [0.25, 0.9, 0.25]);

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

  const floatCard = (src: string, alt: string) => (
    <div
      className="rounded-[28px] overflow-hidden"
      style={{
        boxShadow: '0 30px 60px -22px rgba(23,18,51,.65), 0 0 0 6px rgba(255,255,255,.65)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );

  // NOTE: no overflow-x-hidden on the root — it would become a scroll
  // container and silently break the sticky filter bar. Sections clip.
  return (
    <div className="relative" style={{ color: INK, fontFamily: BODY }}>
      <Aurora />

      <motion.div
        className="fixed top-0 left-0 right-0 h-[5px] z-[300] origin-left"
        style={{ scaleX: progress, backgroundImage: HEADLINE_GRADIENT }}
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
      >
        <motion.div style={{ y: floatA, rotate: heroSpin }} className="hidden md:block absolute left-[6%] top-[15%] w-40 lg:w-52">
          {floatCard(NFTS[0], 'PloPlo Genesis')}
        </motion.div>
        <motion.div style={{ y: floatB }} className="hidden lg:block absolute right-[8%] top-[10%] w-36 lg:w-44 rotate-6">
          {floatCard(NFTS[1], 'PloPlo Genesis')}
        </motion.div>
        <motion.div style={{ y: floatC }} className="hidden md:block absolute right-[11%] bottom-[11%] w-32 lg:w-40 -rotate-6">
          {floatCard(NFTS[2], 'PloPlo Genesis')}
        </motion.div>
        <motion.div style={{ y: floatB }} className="hidden xl:block absolute left-[9%] bottom-[9%] w-32 rotate-3">
          {floatCard(NFTS[3], 'PloPlo Genesis')}
        </motion.div>

        <motion.div style={{ y: heroTitleY, opacity: heroFade }} className="relative z-10 w-full max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block text-[11px] font-extrabold uppercase tracking-[0.26em] px-5 py-2.5 rounded-full mb-7"
            style={{
              background: 'rgba(255,255,255,.72)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 30px -14px rgba(23,18,51,.6), inset 0 1px 0 rgba(255,255,255,.9)',
              color: '#4B4370',
            }}
          >
            PloPlo Holder · Ritual community
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-extrabold uppercase leading-[0.95] md:leading-[0.88] tracking-tight text-[15vw] sm:text-[12vw] md:text-[9rem]"
            style={{ fontFamily: DISPLAY }}
          >
            <span className="block" style={{ color: INK }}>
              Are you
            </span>
            <span
              className="block"
              style={{
                backgroundImage: HEADLINE_GRADIENT,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 14px 26px rgba(124,92,255,.35))',
              }}
            >
              PloPlo?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-base md:text-lg font-medium"
            style={{ color: '#5A5280' }}
          >
            {data ? `${data.count} members` : '…'} hold the PloPlo Holder badge in the Ritual server.
          </motion.p>

          {/* mobile art strip — the floating cards are desktop-only */}
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
                  boxShadow: '0 18px 30px -16px rgba(23,18,51,.7), 0 0 0 4px rgba(255,255,255,.7)',
                  transform: `rotate(${[-5, 2, 5][i]}deg)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" />
              </div>
            ))}
          </motion.div>

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
                placeholder="your discord username…"
                autoComplete="off"
                className="flex-1 px-5 py-3.5 rounded-2xl font-medium outline-none"
                style={{
                  background: 'rgba(255,255,255,.8)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 10px 30px -18px rgba(23,18,51,.7)',
                  color: INK,
                }}
              />
              <button
                type="submit"
                className="px-7 py-3.5 rounded-2xl font-extrabold uppercase text-xs tracking-[0.14em] text-white transition-transform active:scale-95"
                style={{
                  backgroundImage: HEADLINE_GRADIENT,
                  boxShadow: '0 16px 30px -14px rgba(124,92,255,.9), inset 0 1px 0 rgba(255,255,255,.45)',
                }}
              >
                Check
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 text-left"
                style={{
                  background: 'rgba(255,255,255,.92)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 30px 60px -24px rgba(23,18,51,.7)',
                }}
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
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.avatarUrl || `/api/avatar?id=${s.userId}`}
                        alt={s.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{s.displayName}</div>
                      <div className="text-xs truncate" style={{ color: '#6D6690' }}>
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
          style={{ opacity: heroFade, color: '#6D6690' }}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em]"
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
        style={{ background: 'linear-gradient(165deg,#241C4D 0%,#171233 45%,#2B1740 100%)' }}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[420px] rounded-full pointer-events-none"
          style={{
            opacity: bandGlow,
            background: 'radial-gradient(ellipse, rgba(124,92,255,.85) 0%, rgba(255,95,162,.35) 45%, transparent 72%)',
            filter: 'blur(40px)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN, opacity: 0.22 }} />

        <motion.div style={{ x: rowLeft }} className="relative flex gap-5 mb-6 w-max">
          {marqueeRow.map((src, i) => (
            <div
              key={`a${i}`}
              className="w-40 md:w-56 aspect-square rounded-[26px] overflow-hidden shrink-0"
              style={{ boxShadow: '0 0 0 3px rgba(255,255,255,.18), 0 24px 50px -20px rgba(0,0,0,.9)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>

        <motion.div style={{ scale: bandScale }} className="relative z-10 text-center py-4 px-4">
          <p
            className="font-extrabold uppercase leading-[0.9] tracking-tight text-[14vw] md:text-[8rem]"
            style={{
              fontFamily: DISPLAY,
              backgroundImage: 'linear-gradient(100deg,#FFD86B,#FF9F45 40%,#FF5FA2 75%,#C7B4FF)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 18px 40px rgba(255,159,69,.35))',
            }}
          >
            <CountUp to={data?.count ?? 0} /> certified
          </p>
          <p className="text-xs md:text-sm font-extrabold uppercase tracking-[0.32em] mt-3" style={{ color: 'rgba(255,255,255,.55)' }}>
            PloPlo Genesis · on-chain art
          </p>
        </motion.div>

        <motion.div style={{ x: rowRight }} className="relative flex gap-5 mt-6 w-max">
          {marqueeRow.map((src, i) => (
            <div
              key={`b${i}`}
              className="w-40 md:w-56 aspect-square rounded-[26px] overflow-hidden shrink-0"
              style={{ boxShadow: '0 0 0 3px rgba(255,255,255,.18), 0 24px 50px -20px rgba(0,0,0,.9)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>
      </section>

      {/* ══ 3. STATS ══ */}
      <section className="relative min-h-screen flex flex-col justify-center px-5 py-24">
        <div className="max-w-5xl mx-auto w-full">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="font-extrabold uppercase text-[12vw] md:text-7xl leading-[0.95] mb-3 text-center tracking-tight"
            style={{
              fontFamily: DISPLAY,
              backgroundImage: HEADLINE_GRADIENT,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Who&apos;s inside
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-center font-medium mb-14"
            style={{ color: '#5A5280' }}
          >
            Holders split by their Ritual contributor role.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {data &&
              [...mainPresent, ...(otherCount > 0 ? ['other'] : [])].map((role, i) => {
                const count =
                  role === 'other' ? otherCount : data.holders.filter(h => displayRoleOf(h) === role).length;
                const g = role === 'other' ? OTHER_GRADIENT : gradientFor(role);
                return (
                  <motion.div
                    key={role}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6 }}
                    className="relative rounded-[26px] p-7 overflow-hidden"
                    style={{
                      color: onFill(role),
                      backgroundImage: g,
                      boxShadow: '0 30px 55px -28px rgba(23,18,51,.85), inset 0 1px 0 rgba(255,255,255,.5)',
                    }}
                  >
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN, opacity: 0.18, mixBlendMode: 'overlay' }} />
                    <p className="relative text-6xl font-extrabold leading-none tracking-tight" style={{ fontFamily: DISPLAY }}>
                      <CountUp to={count} />
                    </p>
                    <p className="relative text-xs font-extrabold uppercase tracking-[0.14em] mt-2.5 opacity-85">
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
            className="mt-14 mx-auto block w-max px-9 py-4 rounded-full font-extrabold uppercase tracking-[0.14em] text-xs text-white transition-transform hover:-translate-y-1"
            style={{
              backgroundImage: HEADLINE_GRADIENT,
              boxShadow: '0 24px 45px -18px rgba(124,92,255,.9), inset 0 1px 0 rgba(255,255,255,.45)',
            }}
          >
            View the collection on OpenSea ↗
          </motion.a>
        </div>
      </section>

      {/* ══ 4. ROSTER ══ */}
      <section className="relative px-4 pb-28">
        <div className="max-w-7xl mx-auto pt-16">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-extrabold uppercase text-[12vw] md:text-7xl leading-[0.95] text-center mb-10 tracking-tight"
            style={{ fontFamily: DISPLAY, color: INK }}
          >
            The shelf
          </motion.h2>

          {err && (
            <p className="text-center font-bold mb-8" style={{ color: CORAL }}>
              {err}
            </p>
          )}
          {!data && !err && (
            <p className="text-center mb-8" style={{ color: '#6D6690' }}>
              Loading registry…
            </p>
          )}

          {data && (
            <>
              <div className="sticky top-3 z-30 mb-10">
                <div
                  className="flex flex-wrap gap-1.5 justify-center p-2 rounded-2xl mx-auto w-max max-w-full"
                  style={{
                    background: 'rgba(255,255,255,.78)',
                    backdropFilter: 'blur(18px)',
                    boxShadow: '0 20px 40px -22px rgba(23,18,51,.75), inset 0 1px 0 rgba(255,255,255,.9)',
                  }}
                >
                  {(['all', ...mainPresent, ...(otherCount > 0 ? ['other'] : [])] as string[]).map(role => {
                    const active = filter === role;
                    const count =
                      role === 'all'
                        ? data.holders.length
                        : role === 'other'
                        ? otherCount
                        : data.holders.filter(h => displayRoleOf(h) === role).length;
                    const g = role === 'all' ? HEADLINE_GRADIENT : role === 'other' ? OTHER_GRADIENT : gradientFor(role);
                    return (
                      <button
                        key={role}
                        onClick={() => setFilter(role)}
                        className="px-4 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.1em] transition-all"
                        style={
                          active
                            ? {
                                backgroundImage: g,
                                color: role === 'all' ? '#fff' : onFill(role),
                                boxShadow: '0 10px 22px -12px rgba(23,18,51,.9)',
                              }
                            : { color: '#6D6690' }
                        }
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
                <p className="text-center mt-10" style={{ color: '#6D6690' }}>
                  No holders match this filter.
                </p>
              )}

              <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.2em] mt-16" style={{ color: '#9A93B8' }}>
                Updated {new Date(data.updatedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
      </section>

      {/* ══ footer ══ */}
      <footer
        className="relative px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden"
        style={{ background: 'linear-gradient(165deg,#241C4D 0%,#171233 60%,#2B1740 100%)', color: '#fff' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN, opacity: 0.2 }} />
        <p
          className="relative text-3xl font-extrabold uppercase leading-none tracking-tight"
          style={{
            fontFamily: DISPLAY,
            backgroundImage: HEADLINE_GRADIENT,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          PloPlo Holder
        </p>
        <div className="relative flex items-center gap-6 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,.65)' }}>
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
