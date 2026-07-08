'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { animate, stagger } from 'animejs';
import {
  Activity,
  CalendarDays,
  Check,
  Clipboard,
  Crown,
  Flame,
  Search,
  Trophy,
  X,
} from 'lucide-react';

type TargetRole = 'All' | 'Ritualist' | 'Ritty' | 'Ritty Bitty';
type SortMode = 'score' | 'discordStats' | 'rank' | 'votes';

type Nominee = {
  id: string;
  username: string;
  displayName: string;
  userId: string | null;
  avatar: string | null;
  targetRole: Exclude<TargetRole, 'All'>;
  targetRoleSlug: string;
  leaderboardRank: number;
  nominations: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  score: number;
  discordStatsScore: number;
  scoreFormula: string;
  discordStatsFormula: string;
  confidence: 'strong' | 'solid' | 'watch' | 'early';
  currentRole: string;
  roles: string[];
  joinedAt: string | null;
  eligibility: 'promotion-candidate' | 'already-at-or-above-target' | 'needs-role-review';
  contributionsCount: number;
  eventsCount: number;
  eventsWonCount: number | null;
  eventsHostedCount: number | null;
  globalMessages: number;
  impactStatement: string | null;
  voteCommand: string;
  voteInstructions: string;
  signalSummary: string;
  source: {
    localDiscordData: boolean;
    liveDiscordApi: boolean;
    r2MemberActivity: boolean;
    r2MemberActivityAvailable: boolean;
    discordApiAvailable: boolean;
    discordMentionId: string | null;
  };
};

type ApiData = {
  round: string;
  generatedAt: string;
  voteFlow: string;
  nominees: Nominee[];
  targets: Array<{
    targetRole: Exclude<TargetRole, 'All'>;
    count: number;
    nominations: number;
    upvotes: number;
    downvotes: number;
  }>;
};

const TARGETS: TargetRole[] = ['All', 'Ritualist', 'Ritty', 'Ritty Bitty'];
const SORTS: Array<{ value: SortMode; label: string }> = [
  { value: 'score', label: 'Vote score' },
  { value: 'discordStats', label: 'Discord stats' },
  { value: 'rank', label: 'Board rank' },
  { value: 'votes', label: 'Net votes' },
];

const GOLD = '#FFD700';
const TARGET_COLOR: Record<string, string> = {
  Ritualist: '#22c55e',
  Ritty: '#a855f7',
  'Ritty Bitty': '#3b82f6',
};
const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#FFD700',
  Zealot: '#ef4444',
  Ritualist: '#22c55e',
  Mage: '#1ABC9C',
  'Siggy Soulsmith': '#f59e0b',
  'Siggy Architect': '#f59e0b',
  ritty: '#a855f7',
  bitty: '#3b82f6',
  Ritty: '#a855f7',
  'Ritty Bitty': '#3b82f6',
  Forerunner: '#f59e0b',
  Initiate: '#06b6d4',
  Unranked: '#666',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function roleColor(role: string) {
  return ROLE_COLOR[role] || '#888';
}

function targetColor(role: string) {
  return TARGET_COLOR[role] || GOLD;
}

function targetBadgeLabel(role: string) {
  if (role === 'Ritty Bitty') return 'Bitty';
  return role;
}

function joinDate(value: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function avatarCandidates(nominee: Nominee) {
  return [
    nominee.avatar,
    nominee.userId ? `/api/avatar?id=${encodeURIComponent(nominee.userId)}` : null,
    nominee.username ? `/api/avatar?username=${encodeURIComponent(nominee.username)}` : null,
  ].filter((src, index, list): src is string => Boolean(src) && list.indexOf(src) === index);
}

function sortNominees(rows: Nominee[], sort: SortMode) {
  return [...rows].sort((a, b) => {
    if (sort === 'rank') return a.leaderboardRank - b.leaderboardRank;
    if (sort === 'votes') return b.netVotes - a.netVotes || b.score - a.score;
    if (sort === 'discordStats') return b.discordStatsScore - a.discordStatsScore || b.score - a.score;
    return b.score - a.score;
  });
}

function Avatar({ nominee, size = 'md' }: { nominee: Nominee; size?: 'sm' | 'md' | 'lg' }) {
  const classes = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-14 w-14 text-xl',
    lg: 'h-20 w-20 text-3xl',
  };
  const sources = avatarCandidates(nominee);
  const [srcIndex, setSrcIndex] = useState(0);
  const src = sources[srcIndex];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nominee.displayName}
        className={`${classes[size]} shrink-0 rounded-full border border-[#1a1a1a] object-cover`}
        onError={() => setSrcIndex((index) => index + 1)}
      />
    );
  }

  return (
    <div className={`${classes[size]} shrink-0 rounded-full border border-[#1a1a1a] bg-[#111]`} aria-label="Discord avatar unavailable" />
  );
}

function SquareAvatar({ nominee }: { nominee: Nominee }) {
  const sources = avatarCandidates(nominee);
  const [srcIndex, setSrcIndex] = useState(0);
  const src = sources[srcIndex];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nominee.displayName}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={() => setSrcIndex((index) => index + 1)}
      />
    );
  }

  return (
    <div className="h-full w-full bg-[#111]" aria-label="Discord avatar unavailable" />
  );
}

function RoleBadge({ role, label }: { role: string; label?: string }) {
  const color = roleColor(role);
  return (
    <span
      className="inline-flex max-w-full items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
      style={{ color, backgroundColor: role === 'Unranked' ? '#141414' : `${color}18` }}
    >
      <span className="truncate">{label || role}</span>
    </span>
  );
}

function StatTile({ label, value, icon, accent = GOLD }: { label: string; value: number; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#171717] bg-[#050505] p-3 text-left">
      <div className="flex items-center gap-2">
        {icon ? <span style={{ color: accent }}>{icon}</span> : null}
        <span className="font-display text-2xl leading-none" style={{ color: accent }}>{fmt(value)}</span>
      </div>
      <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-wider text-[#666]">{label}</p>
    </div>
  );
}

function NomineeCard({ nominee, onSelect }: { nominee: Nominee; onSelect: (nominee: Nominee) => void }) {
  const accent = targetColor(nominee.targetRole);

  return (
    <button
      onClick={() => onSelect(nominee)}
      className="nomination-card group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: '#0a0a0a',
        borderColor: '#151515',
        boxShadow: `0 0 20px ${accent}11`,
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#111]">
        <SquareAvatar nominee={nominee} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 48%, #0a0a0a 100%)' }} />
        <div className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 font-display text-xl leading-none backdrop-blur" style={{ color: accent }}>
          #{nominee.leaderboardRank}
        </div>
      </div>

      <div className="relative z-10 -mt-5 px-3 pb-3">
        <h3 className="truncate text-sm font-semibold leading-tight text-white" title={nominee.displayName}>{nominee.displayName}</h3>
        <p className="mt-0.5 truncate font-mono text-xs text-[#555]">@{nominee.username}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <RoleBadge role={nominee.currentRole || 'Unranked'} />
          <span className="self-center font-mono text-[10px] uppercase tracking-wider text-[#555]">to</span>
          <RoleBadge role={nominee.targetRole} label={targetBadgeLabel(nominee.targetRole)} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <MiniMetric label="Contrib" value={nominee.contributionsCount} accent="#22c55e" />
          <MiniMetric label="Won/Host" value={(nominee.eventsWonCount || 0) + (nominee.eventsHostedCount || 0)} accent="#a855f7" />
          <MiniMetric label="Chat" value={nominee.globalMessages} accent="#60a5fa" />
        </div>
      </div>
    </button>
  );
}

function MiniMetric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-[#151515] bg-[#050505] px-2 py-1.5">
      <div className="truncate font-mono text-sm font-black leading-none" style={{ color: accent }}>{fmt(value)}</div>
      <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-wider text-[#555]">{label}</div>
    </div>
  );
}

function DetailModal({ nominee, onClose, onCopy, copied }: { nominee: Nominee; onClose: () => void; onCopy: (nominee?: Nominee) => void; copied: boolean }) {
  const accent = targetColor(nominee.targetRole);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 18 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border bg-[#0a0a0a]"
        style={{ borderColor: `${accent}55`, boxShadow: `0 0 80px ${accent}18` }}
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#777] transition hover:text-white" aria-label="Close nomination detail">
          <X className="h-5 w-5" />
        </button>

        <div className="grid md:grid-cols-[0.42fr_0.58fr]">
          <div className="relative flex min-h-[300px] items-end justify-center overflow-hidden p-8" style={{ background: `linear-gradient(160deg, ${accent}22 0%, ${accent}08 62%, transparent 100%)` }}>
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `linear-gradient(135deg, ${accent} 25%, transparent 25%, transparent 75%, ${accent} 75%)`, backgroundSize: '40px 40px' }} />
            <div className="relative z-10 flex flex-col items-center text-center">
              <Avatar nominee={nominee} size="lg" />
              <h2 className="mt-5 max-w-full break-words font-display text-5xl uppercase leading-none text-white">{nominee.displayName}</h2>
              <p className="mt-2 font-mono text-sm text-[#666]">@{nominee.username}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <RoleBadge role={nominee.currentRole || 'Unranked'} />
                <span className="self-center font-mono text-[10px] uppercase tracking-wider text-[#555]">to</span>
                <RoleBadge role={nominee.targetRole} label={targetBadgeLabel(nominee.targetRole)} />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: `${accent}bb` }}>
              Vote profile
            </p>
            <p className="mt-4 text-sm leading-6 text-[#aaa]">{nominee.signalSummary}</p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Score" value={nominee.score} icon={<Trophy className="h-4 w-4" />} accent={accent} />
              <StatTile label="Nominations" value={nominee.nominations} icon={<Crown className="h-4 w-4" />} accent={GOLD} />
              <StatTile label="Upvotes" value={nominee.upvotes} icon={<Flame className="h-4 w-4" />} accent="#22c55e" />
              <StatTile label="Downvotes" value={nominee.downvotes} accent="#ef4444" />
              <StatTile label="Contrib" value={nominee.contributionsCount} icon={<Activity className="h-4 w-4" />} accent="#60a5fa" />
              <StatTile label="Events" value={nominee.eventsCount} icon={<CalendarDays className="h-4 w-4" />} accent="#a855f7" />
              <StatTile label="Won" value={nominee.eventsWonCount || 0} icon={<Trophy className="h-4 w-4" />} accent="#f59e0b" />
              <StatTile label="Hosted" value={nominee.eventsHostedCount || 0} icon={<CalendarDays className="h-4 w-4" />} accent="#38bdf8" />
            </div>

            <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: `${accent}30`, backgroundColor: `${accent}10` }}>
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: accent }}>How to vote</p>
              <p className="mt-2 text-sm leading-6 text-white">{nominee.voteInstructions}</p>
              <button onClick={() => onCopy(nominee)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-85" style={{ backgroundColor: accent }}>
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy vote steps'}
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              <Info label="Joined" value={joinDate(nominee.joinedAt)} />
              <Info label="Discord ID" value={nominee.userId || nominee.source.discordMentionId || 'Unknown'} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#171717] bg-white/[0.025] px-4 py-3">
      <span className="shrink-0 text-sm text-[#777]">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default function NominationClient({ initialData }: { initialData: ApiData }) {
  const [data, setData] = useState<ApiData>(initialData);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<TargetRole>('All');
  const [sort, setSort] = useState<SortMode>('score');
  const [selected, setSelected] = useState<Nominee | null>(null);
  const [copied, setCopied] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nominees = data.nominees || [];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim().replace(/^@/, '');
    const rows = nominees
      .filter((nominee) => target === 'All' || nominee.targetRole === target)
      .filter((nominee) => {
        if (!q) return true;
        return (
          nominee.username.toLowerCase().includes(q) ||
          nominee.displayName.toLowerCase().includes(q) ||
          nominee.currentRole.toLowerCase().includes(q) ||
          nominee.roles.some((role) => role.toLowerCase().includes(q))
        );
      });
    return sortNominees(rows, sort);
  }, [nominees, query, sort, target]);

  const topNominee = useMemo(() => sortNominees(nominees, 'score')[0] || null, [nominees]);

  const totals = useMemo(() => ({
    nominees: nominees.length,
  }), [nominees]);

  const targetStats = useMemo(() => {
    return (['Ritualist', 'Ritty', 'Ritty Bitty'] as const).map((role) => {
      const rows = nominees.filter((nominee) => nominee.targetRole === role);
      return {
        role,
        count: rows.length,
      };
    });
  }, [nominees]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/nominations')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: ApiData | null) => {
        if (!cancelled && payload?.nominees?.length) setData(payload);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;
    animate('.nomination-hero-line', {
      translateY: [18, 0],
      delay: stagger(110),
      duration: 800,
      easing: 'easeOutExpo',
    });
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      animate('.nomination-card', {
        translateY: [12, 0],
        scale: [0.985, 1],
        delay: stagger(28),
        duration: 520,
        easing: 'easeOutExpo',
      });
      observer.disconnect();
    }, { threshold: 0.05 });
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [filtered.length, target, sort]);

  async function copyVoteSteps(nominee = filtered[0] || topNominee) {
    if (!nominee) return;
    await navigator.clipboard.writeText(nominee.voteInstructions);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  function scrollToList() {
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#050505] text-white">
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 opacity-20" style={{ background: `radial-gradient(ellipse, ${GOLD} 0%, transparent 70%)` }} />

        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <p className="nomination-hero-line mb-6 font-mono text-xs uppercase tracking-[0.3em] text-[#666]">
            {initialData.round || 'July 2026 nomination round'}
          </p>
          <h1 className="nomination-hero-line font-display text-[42px] uppercase leading-[1.02] sm:text-5xl md:text-7xl lg:text-8xl">
            Who Deserves
          </h1>
          <h1 className="nomination-hero-line mb-8 font-display text-[42px] uppercase leading-[1.02] sm:text-5xl md:text-7xl lg:text-8xl" style={{ color: GOLD }}>
            The Next Role?
          </h1>
          <p className="nomination-hero-line mx-auto mb-10 max-w-[330px] text-base leading-7 text-[#888] sm:max-w-2xl md:text-lg">
            Search nominees, compare their role path, and copy the exact vote steps before opening Discord.
          </p>

          <div className="nomination-hero-line mx-auto mb-8 max-w-[calc(100vw-32px)] sm:max-w-2xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#555]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Discord username, display name, or role..."
                className="w-full rounded-xl border border-[#222] bg-[#111] py-4 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-[#444] focus:border-[#FFD700]"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="rounded-xl border border-[#222] bg-[#111] px-4 py-3 font-mono text-xs uppercase tracking-wider text-white outline-none transition focus:border-[#FFD700]"
              >
                {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button onClick={scrollToList} className="rounded-xl px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:opacity-85" style={{ backgroundColor: GOLD }}>
                View list
              </button>
            </div>
          </div>

          <div className="nomination-hero-line -mx-4 mb-10 flex max-w-[100vw] flex-nowrap justify-start gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
            {TARGETS.map((item) => {
              const active = target === item;
              const color = item === 'All' ? GOLD : targetColor(item);
              const count = item === 'All' ? nominees.length : nominees.filter((nominee) => nominee.targetRole === item).length;
              return (
                <button
                  key={item}
                  onClick={() => setTarget(item)}
                  className="rounded-full border px-5 py-2 font-mono text-sm transition-all"
                  style={{
                    borderColor: active ? color : '#222',
                    backgroundColor: active ? color : 'transparent',
                    color: active ? '#000' : '#666',
                  }}
                >
                  {item} ({count})
                </button>
              );
            })}
          </div>

          <button
            onClick={scrollToList}
            className="nomination-hero-line mx-auto flex flex-col items-center gap-2 text-[#555] transition-colors hover:text-[#888]"
          >
            <span className="font-mono text-xs uppercase tracking-[0.2em]">See all nominees</span>
            <span className="text-lg animate-bounce">v</span>
          </button>
        </div>
      </section>

      <section id="nominees" ref={listRef} className="mx-auto max-w-7xl px-4 pb-24 pt-12">
        <div className="mb-14 flex flex-wrap justify-center gap-4">
          <div className="relative min-w-[140px] overflow-hidden rounded-2xl border border-[#FFD700]/30 bg-[#0a0a0a] p-6 text-center">
            <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at 50% 100%, ${GOLD} 0%, transparent 70%)` }} />
            <p className="relative font-display text-4xl leading-none" style={{ color: GOLD }}>{totals.nominees}</p>
            <p className="relative mt-1 font-mono text-sm text-[#666]">All nominees</p>
          </div>
          {targetStats.map((item) => {
            const color = targetColor(item.role);
            return (
              <button
                key={item.role}
                onClick={() => setTarget(item.role)}
                className="relative min-w-[140px] overflow-hidden rounded-2xl border bg-[#0a0a0a] p-6 text-center transition hover:-translate-y-0.5"
                style={{ borderColor: `${color}33` }}
              >
                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at 50% 100%, ${color} 0%, transparent 70%)` }} />
                <p className="relative font-display text-4xl leading-none" style={{ color }}>{item.count}</p>
                <p className="relative mt-1 font-mono text-sm text-[#666]">{item.role}</p>
              </button>
            );
          })}
        </div>

        <div className="mb-8 flex flex-col gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#666]">Candidate board</p>
            <h2 className="mt-2 font-display text-4xl uppercase leading-none text-white md:text-5xl">
              {filtered.length.toLocaleString()} nominees
            </h2>
          </div>
          <button onClick={() => copyVoteSteps()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1a1a1a] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/5">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            Copy top vote steps
          </button>
        </div>

        {filtered.length ? (
          <div ref={gridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((nominee) => (
              <NomineeCard key={nominee.id} nominee={nominee} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-10 text-center text-[#777]">
            No nominees match this search.
          </div>
        )}

        <p className="mt-12 text-center font-mono text-xs uppercase tracking-[0.25em] text-[#333]">
          Generated {new Date(initialData.generatedAt).toLocaleString()}
        </p>
      </section>

      <AnimatePresence>
        {selected ? (
          <DetailModal nominee={selected} onClose={() => setSelected(null)} onCopy={copyVoteSteps} copied={copied} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
