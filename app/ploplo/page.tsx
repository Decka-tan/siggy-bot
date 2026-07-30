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

/* The full PloPlo Genesis collection: token 1-940 maps to metadata index
   3849-4788 (index = tokenId + 3848). Tiles are 300px copies used for the
   wall and the card stickers; the ten hero planets stay at 720px. */
const TILE_FROM = 3849;
const TILE_COUNT = 940;
const tile = (i: number) => `/ploplo/tiles/${TILE_FROM + (((i % TILE_COUNT) + TILE_COUNT) % TILE_COUNT)}.webp`;

// Hero/marquee art, kept at full size.
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

/* A fresh random slice of the collection on every load. Generated in an
   effect (never during render) so the server and client markup agree. */
function useRandomTiles(count: number) {
  const [tiles, setTiles] = useState<string[]>(() =>
    Array.from({ length: count }, (_, i) => tile(i * 7)),
  );

  useEffect(() => {
    const picked = new Set<number>();
    while (picked.size < Math.min(count, TILE_COUNT)) {
      picked.add(Math.floor(Math.random() * TILE_COUNT));
    }
    setTiles([...picked].map(tile));
  }, [count]);

  return tiles;
}

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
/* No per-holder NFT is shown anywhere: pinning a specific token to a member
   reads as a claim of ownership, and we have no wallet↔Discord mapping to
   back that up. Collection art only appears as decoration (hero, band, wall). */

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

function StarField({
  stars,
  className = '',
  twinkle = false,
}: {
  stars: ReturnType<typeof makeStars>;
  className?: string;
  twinkle?: boolean;
}) {
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} aria-hidden>
      {twinkle && (
        <style>{`
          @keyframes ploplo-twinkle {
            0%, 100% { opacity: var(--o); transform: scale(1); }
            50%      { opacity: calc(var(--o) * 0.18); transform: scale(0.7); }
          }
          .ploplo-star { animation: ploplo-twinkle var(--d) ease-in-out infinite; animation-delay: var(--t); transform-box: fill-box; transform-origin: center; }
          @media (prefers-reduced-motion: reduce) { .ploplo-star { animation: none; } }
        `}</style>
      )}
      {stars.map((st, i) => (
        <circle
          key={i}
          className={twinkle ? 'ploplo-star' : undefined}
          cx={`${st.x}%`}
          cy={`${st.y}%`}
          r={st.r}
          fill="#fff"
          opacity={st.o}
          style={
            twinkle
              ? ({
                  ['--o' as string]: st.o,
                  ['--d' as string]: `${2.4 + (i % 7) * 0.9}s`,
                  ['--t' as string]: `${(i % 13) * 0.37}s`,
                } as React.CSSProperties)
              : undefined
          }
        />
      ))}
    </svg>
  );
}

/* Occasional shooting star for the roster's night sky. */
function ShootingStars() {
  const shots = [
    { top: '12%', left: '8%', delay: 0, dur: 2.2, gap: 11 },
    { top: '34%', left: '58%', delay: 5.5, dur: 2.6, gap: 14 },
    { top: '68%', left: '26%', delay: 9, dur: 2.4, gap: 17 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {shots.map((s, i) => (
        <motion.div
          key={i}
          className="absolute h-px"
          style={{
            top: s.top,
            left: s.left,
            width: 160,
            background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.9))`,
            rotate: '18deg',
          }}
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: [0, 1, 0], x: [-60, 260] }}
          transition={{ duration: s.dur, repeat: Infinity, repeatDelay: s.gap, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* Small decorative planets drifting behind the roster grid. Pure shapes
   in the page palette — colour and motion without more imagery. */
function DriftingPlanets() {
  const bodies = [
    { c: '#F5C9A8', size: 74, top: '6%', left: '4%', dur: 15, ring: true },
    { c: '#E98BA0', size: 40, top: '22%', right: '7%', dur: 19 },
    { c: '#8FD3C8', size: 26, top: '48%', left: '9%', dur: 13 },
    { c: '#A9A5E4', size: 58, top: '63%', right: '5%', dur: 17, ring: true },
    { c: '#7C86D6', size: 32, top: '82%', left: '6%', dur: 21 },
    { c: '#9FD5E8', size: 20, top: '36%', right: '18%', dur: 12 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block" aria-hidden>
      {bodies.map((b, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: b.top, left: b.left, right: b.right, width: b.size, height: b.size }}
          animate={{ y: [0, -18, 0], x: [0, i % 2 ? 10 : -10, 0] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{ background: b.c, opacity: 0.5, boxShadow: `0 0 40px -6px ${b.c}` }}
          />
          {b.ring && (
            <div
              className="absolute left-1/2 top-1/2 rounded-[50%]"
              style={{
                width: '180%',
                height: '44%',
                border: `2px solid ${b.c}`,
                opacity: 0.4,
                transform: 'translate(-50%,-50%) rotate(-20deg)',
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* Soft colour transition so neighbouring sections don't hard-cut. */
function Seam({ from, to, height = 'h-24 md:h-32' }: { from: string; to: string; height?: string }) {
  return (
    <div className={`relative w-full ${height}`} style={{ background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }}>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-40"
        style={{ background: `linear-gradient(90deg, transparent, ${HAZE}, transparent)`, opacity: 0.5 }}
      />
    </div>
  );
}

/* The hand-built CSS/SVG version of the scene. Kept as an alternative
   to the painted background — open /ploplo?scene=css to compare. */
function GeneratedScene({
  starsY,
  discScale,
  hillsY,
}: {
  starsY: ReturnType<typeof useTransform>;
  discScale: ReturnType<typeof useTransform>;
  hillsY: ReturnType<typeof useTransform>;
}) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${NIGHT} 0%, #171E45 42%, #2A2F63 72%, #4A4A85 100%)` }}
      />
      <motion.div style={{ y: starsY }} className="absolute inset-0">
        <StarField stars={HERO_STARS} />
      </motion.div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden preserveAspectRatio="none">
        <line x1="-5%" y1="34%" x2="105%" y2="16%" stroke={LAVENDER} strokeWidth="1" opacity="0.28" />
        <line x1="-5%" y1="58%" x2="105%" y2="30%" stroke={LAVENDER} strokeWidth="1" opacity="0.2" />
        <line x1="-5%" y1="12%" x2="105%" y2="46%" stroke={LAVENDER} strokeWidth="1" opacity="0.16" />
      </svg>

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

      <motion.div style={{ y: hillsY }} className="absolute inset-x-0 bottom-0 h-[38%]">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 190 C 190 120, 330 205, 520 175 C 700 145, 850 210, 1030 180 C 1200 150, 1330 200, 1440 175 L1440 400 L0 400 Z"
            fill="#5C5F94"
            opacity="0.85"
          />
          <path
            d="M0 250 C 210 195, 380 265, 560 240 C 760 210, 900 275, 1090 245 C 1250 220, 1350 265, 1440 245 L1440 400 L0 400 Z"
            fill="#3B3E73"
          />
          <path
            d="M0 315 C 240 275, 420 335, 640 312 C 860 288, 1010 340, 1200 318 C 1320 305, 1390 325, 1440 315 L1440 400 L0 400 Z"
            fill="#232750"
          />
        </svg>
      </motion.div>
    </>
  );
}

/* Pull a dominant colour out of a member's avatar so each card is lit by
   their own PFP. Avatars are served through /api/proxy-avatar, i.e. same
   origin, so the canvas never taints. Falls back to the role colour. */
function useAvatarColor(src: string) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      try {
        const N = 16;
        const cv = document.createElement('canvas');
        cv.width = N;
        cv.height = N;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);

        // Weight each pixel by how colourful it is, so a grey background
        // doesn't drown out the subject.
        let r = 0;
        let g = 0;
        let b = 0;
        let w = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          const weight = (max - min) / 255 + 0.12;
          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          w += weight;
        }
        if (!w) return;
        r /= w;
        g /= w;
        b /= w;

        // Push it toward a usable tint: keep the hue, force enough
        // lightness/saturation to read against the night background.
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;
        const scale = l < 0.42 ? 0.42 / Math.max(l, 0.06) : l > 0.78 ? 0.78 / l : 1;
        const hex = (v: number) =>
          Math.round(Math.min(255, Math.max(0, v * scale)))
            .toString(16)
            .padStart(2, '0');
        if (!cancelled) setColor(`#${hex(r)}${hex(g)}${hex(b)}`);
      } catch {
        /* canvas unavailable — keep the role colour */
      }
    };

    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}

/* Wall of PloPlos used as a section background: 7 across, every other row
   crawling the opposite way, then buried under a heavy scrim so it never
   competes with the content sitting on top. */
function PloPloWall({ rows = 6, scrim = 0.9 }: { rows?: number; scrim?: number }) {
  // 7 across per screen; each row gets its own random draw from the 940.
  const pool = useRandomTiles(rows * 7);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 flex flex-col justify-center gap-[2vw]">
        {Array.from({ length: rows }, (_, r) => {
          const toLeft = r % 2 === 1;
          const row = pool.slice(r * 7, r * 7 + 7);
          // Tripled so the -33.333% loop is seamless.
          const strip = [...row, ...row, ...row];
          return (
            <motion.div
              key={r}
              className="flex gap-[2vw] w-max"
              animate={{ x: toLeft ? ['0%', '-33.333%'] : ['-33.333%', '0%'] }}
              transition={{ duration: 52 + r * 9, repeat: Infinity, ease: 'linear' }}
            >
              {strip.map((src, i) => (
                <div key={`${r}-${i}`} className="w-[13vw] aspect-square rounded-2xl overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </motion.div>
          );
        })}
      </div>
      <div className="absolute inset-0" style={{ background: `rgba(14,19,48,${scrim})` }} />
    </div>
  );
}

// The wall is masked at top and bottom so it dissolves into the section
// edges instead of ending on a hard line.
const WALL_MASK =
  'linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)';

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
  const pfp = useAvatarColor(holder.avatarUrl);
  const c = pfp ?? colorFor(role);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 14) * 0.02, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.15 } }}
      className="group text-left rounded-3xl overflow-hidden"
      style={{ background: DEEP, border: `1px solid ${c}66`, fontFamily: BODY }}
    >
      {/* the whole tile takes the member's own colour — the grid reads as a
          mosaic of PFP palettes rather than a wall of navy */}
      <div className="relative aspect-square flex items-center justify-center p-4">
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{ background: `radial-gradient(circle at 50% 34%, ${c} 0%, ${c} 42%, ${c}C4 78%, ${c}8A 100%)` }}
        />
        <div
          className="relative w-full aspect-square rounded-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.05]"
          style={{ boxShadow: `0 0 0 3px rgba(255,255,255,.55), 0 16px 34px -12px rgba(14,19,48,.85)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={holder.avatarUrl} alt={holder.displayName} className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3.5" style={{ borderTop: `2px solid ${c}` }}>
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
            <p className="text-sm mt-3" style={{ color: LAVENDER }}>
              This account doesn&apos;t carry the PloPlo Holder role yet. Did you mint?
            </p>
            <p className="text-sm mt-2" style={{ color: HAZE }}>
              If you already own one, the role only lands once your wallet is linked. Drop it in{' '}
              <span className="font-semibold" style={{ color: PEACH }}>
                #wallet-connection
              </span>{' '}
              on the Ritual Discord and you&apos;ll show up here on the next scan.
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
  // /ploplo?scene=css renders the hand-built CSS/SVG sky instead of the painting.
  const [cssScene, setCssScene] = useState(false);

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
    setCssScene(new URLSearchParams(window.location.search).get('scene') === 'css');
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

  // Two independent random draws so the band's rows never mirror each other.
  const bandTop = useRandomTiles(14);
  const bandBottom = useRandomTiles(14);

  /* A PloPlo cut into a circle and lit from one side, so it reads as
     a planet sitting on the orbit line. `ring` adds a Saturn band. */
  const planet = (src: string, ring?: string, drift = 0) => (
    // idle bob, independent of the scroll-driven y on the wrapper
    <motion.div
      className="relative w-full aspect-square"
      animate={{ y: [0, -10 - drift, 0], rotate: [0, drift > 2 ? 3 : -2, 0] }}
      transition={{ duration: 7 + drift, repeat: Infinity, ease: 'easeInOut' }}
    >
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
    </motion.div>
  );

  // No overflow-x-hidden on the root — it would break the sticky filter bar.
  return (
    <div className="relative" style={{ color: MIST, fontFamily: BODY, background: NIGHT }}>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[4px] z-[300] origin-left"
        style={{ scaleX: progress, background: PEACH }}
      />

      {/* ── page nav (the global Siggy header is suppressed here) ── */}
      {/* centring lives on this wrapper: framer-motion owns `transform` on the
          header itself, so a Tailwind -translate-x-1/2 there would be wiped */}
      <div className="fixed top-3 inset-x-0 z-[280] flex justify-center px-2 pointer-events-none">
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="pointer-events-auto"
      >
        <nav
          className="flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            background: 'rgba(14,19,48,.72)',
            border: `1px solid ${INDIGO}`,
            backdropFilter: 'blur(14px)',
          }}
        >
          <a
            href="/"
            className="px-3.5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-white"
            style={{ color: LAVENDER }}
          >
            Siggy
          </a>
          <a
            href="/genesis"
            className="px-3.5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-white"
            style={{ color: LAVENDER }}
          >
            Genesis
          </a>
          <span
            className="px-3.5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{ background: PEACH, color: NIGHT }}
          >
            PloPlo
          </span>
          <a
            href="/stats"
            className="px-3.5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-white"
            style={{ color: LAVENDER }}
          >
            Stats
          </a>
          <a
            href={OPENSEA}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:block px-3.5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-white"
            style={{ color: LAVENDER }}
          >
            OpenSea ↗
          </a>
        </nav>
      </motion.header>
      </div>

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
      <section ref={heroRef} className="relative h-screen min-h-[680px] overflow-hidden" style={{ background: NIGHT }}>
        {cssScene ? (
          <GeneratedScene starsY={starsY} discScale={discScale} hillsY={hillsY} />
        ) : (
          <>
            {/* The scene is the artwork; it drifts slightly on scroll. */}
            <motion.div style={{ scale: discScale, y: starsY }} className="absolute inset-0" aria-hidden>
              <div
                className="absolute inset-[-4%]"
                style={{ background: `url(/ploplo/hero.webp) center 42% / cover no-repeat` }}
              />
            </motion.div>
            {/* scrim: keeps type readable and hides the upscale softness */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(14,19,48,.45) 0%, rgba(14,19,48,.18) 34%, rgba(14,19,48,.30) 68%, rgba(14,19,48,.72) 100%)`,
              }}
            />
          </>
        )}

        {/* PloPlo planets, sat on the artwork's own orbit arcs and empty sky */}
        <motion.div style={{ y: planetFar }} className="absolute left-[4%] top-[8%] w-24 md:w-32 lg:w-40 opacity-95">
          {planet(NFTS[0], undefined, 1)}
        </motion.div>
        <motion.div style={{ y: planetMid }} className="absolute right-[9%] top-[15%] w-24 md:w-32 lg:w-40">
          {planet(NFTS[1], PEACH, 3)}
        </motion.div>
        <motion.div style={{ y: planetFar }} className="hidden md:block absolute left-[25%] top-[6%] w-11 lg:w-14 opacity-90">
          {planet(NFTS[2], undefined, 4)}
        </motion.div>
        {/* these two ride the lower arcs painted into the scene */}
        <motion.div style={{ y: planetNear }} className="absolute left-[11%] bottom-[16%] w-16 md:w-24 lg:w-28">
          {planet(NFTS[3], undefined, 2)}
        </motion.div>
        <motion.div style={{ y: planetMid }} className="hidden md:block absolute right-[34%] bottom-[27%] w-10 lg:w-12 opacity-90">
          {planet(NFTS[4], undefined, 5)}
        </motion.div>

        {/* copy */}
        <motion.div
          style={{ y: heroTitleY, opacity: heroFade }}
          className="relative z-10 h-full flex flex-col items-center justify-center px-5 text-center"
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

      <Seam from="rgba(14,19,48,0)" to={NIGHT} height="h-16 md:h-20" />

      {/* ══ 2. MARQUEE BAND ══ */}
      <section
        ref={bandRef}
        className="relative h-screen min-h-[620px] flex flex-col justify-center overflow-hidden"
        style={{ background: NIGHT }}
      >
        <StarField stars={PAGE_STARS} />

        <motion.div style={{ x: rowLeft }} className="relative flex gap-5 mb-7 w-max">
          {[...bandTop, ...bandTop].map((src, i) => (
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
          {[...bandBottom, ...bandBottom].map((src, i) => (
            <div key={`b${i}`} className="w-36 md:w-52 aspect-square rounded-full overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="PloPlo Genesis" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </motion.div>
      </section>

      <Seam from={NIGHT} to={DEEP} />

      {/* ══ 3. STATS ══ */}
      <section className="relative min-h-screen flex flex-col justify-center px-5 py-24 overflow-hidden" style={{ background: DEEP }}>
        <div className="absolute inset-0" style={{ maskImage: WALL_MASK, WebkitMaskImage: WALL_MASK }}>
          <PloPloWall rows={6} scrim={0.9} />
        </div>
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

      <Seam from={DEEP} to={NIGHT} />

      {/* ══ 4. ROSTER ══ */}
      {/* deliberately quiet: just a night sky, so the colour-filled tiles carry it */}
      {/* no overflow-hidden here: it clips the sticky filter bar */}
      <section className="relative px-4 pb-28" style={{ background: NIGHT }}>
        <StarField stars={PAGE_STARS} twinkle />
        <ShootingStars />
        <DriftingPlanets />
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
              {/* clears the fixed page nav above it */}
              <div className="sticky top-[74px] z-30 mb-10">
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

          {/* ── how to get listed ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="relative mt-20 mx-auto max-w-3xl rounded-[28px] px-7 py-10 md:px-12 md:py-12 text-center overflow-hidden"
            style={{ background: DEEP, border: `1px solid ${INDIGO}` }}
          >
            <StarField stars={PAGE_STARS} />
            <div className="relative">
              <p className="uppercase text-4xl md:text-5xl leading-none" style={{ fontFamily: DISPLAY, fontWeight: 800, color: MIST }}>
                Not seeing yours?
              </p>
              <p className="mt-5 text-sm md:text-base leading-relaxed" style={{ color: LAVENDER }}>
                Siggy only picks up holders who have linked their wallet to Discord. If your PloPlo
                isn&apos;t up here, the mint is fine — the link is what&apos;s missing.
              </p>
              <p className="mt-4 text-sm md:text-base leading-relaxed" style={{ color: HAZE }}>
                Head to the Ritual Discord, post your wallet in{' '}
                <span
                  className="inline-block px-2.5 py-1 rounded-full font-semibold align-middle"
                  style={{ background: INDIGO, color: PEACH }}
                >
                  #wallet-connection
                </span>{' '}
                and once the PloPlo Holder role lands you&apos;ll be highlighted here on the next
                hourly scan.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Seam from={NIGHT} to={DEEP} height="h-20 md:h-24" />

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
