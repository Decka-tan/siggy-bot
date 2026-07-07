'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clipboard,
  Crown,
  Filter,
  Flame,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
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
  { value: 'votes', label: 'Votes' },
];

const TARGET_COLOR: Record<string, string> = {
  Ritualist: '#35d07f',
  Ritty: '#a78bfa',
  'Ritty Bitty': '#38bdf8',
};

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#ffd76a',
  Zealot: '#f87171',
  Ritualist: '#35d07f',
  Mage: '#2dd4bf',
  'Siggy Soulsmith': '#f59e0b',
  'Siggy Architect': '#f59e0b',
  ritty: '#a78bfa',
  bitty: '#38bdf8',
  Forerunner: '#fbbf24',
  Initiate: '#67e8f9',
  Unranked: '#8a8a8a',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function initials(name: string) {
  return name.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'SG';
}

function joinDate(value: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function confidenceLabel(value: Nominee['confidence']) {
  if (value === 'strong') return 'Strong';
  if (value === 'solid') return 'Solid';
  if (value === 'watch') return 'Watch';
  return 'Early';
}

function eligibilityCopy(value: Nominee['eligibility']) {
  if (value === 'promotion-candidate') return 'Needs push';
  if (value === 'already-at-or-above-target') return 'Role check';
  return 'Review role';
}

function roleColor(role: string) {
  return ROLE_COLOR[role] || '#8a8a8a';
}

function targetColor(role: string) {
  return TARGET_COLOR[role] || '#ffd700';
}

export default function NominationClient({ initialData }: { initialData: ApiData }) {
  const [data] = useState<ApiData | null>(initialData);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<TargetRole>('All');
  const [sort, setSort] = useState<SortMode>('score');
  const [selected, setSelected] = useState<Nominee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelected(initialData.nominees.slice().sort((a, b) => b.score - a.score)[0] || null);
    setLoading(false);
  }, [initialData]);

  const nominees = data?.nominees || [];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return nominees
      .filter((nominee) => target === 'All' || nominee.targetRole === target)
      .filter((nominee) => {
        if (!q) return true;
        return (
          nominee.username.toLowerCase().includes(q) ||
          nominee.displayName.toLowerCase().includes(q) ||
          nominee.currentRole.toLowerCase().includes(q) ||
          nominee.roles.some((role) => role.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sort === 'rank') return a.leaderboardRank - b.leaderboardRank;
        if (sort === 'votes') return b.netVotes - a.netVotes || b.score - a.score;
        if (sort === 'discordStats') return b.discordStatsScore - a.discordStatsScore || b.score - a.score;
        return b.score - a.score;
      });
  }, [nominees, query, sort, target]);

  const totals = useMemo(() => {
    return {
      nominees: nominees.length,
      nominations: nominees.reduce((sum, row) => sum + row.nominations, 0),
      upvotes: nominees.reduce((sum, row) => sum + row.upvotes, 0),
      enriched: nominees.filter((row) => row.source.localDiscordData).length,
    };
  }, [nominees]);

  const featured = selected || filtered[0] || nominees[0] || null;
  const topByTarget = useMemo(() => {
    return (['Ritualist', 'Ritty', 'Ritty Bitty'] as const)
      .map((role) => nominees.filter((nominee) => nominee.targetRole === role).sort((a, b) => b.score - a.score)[0])
      .filter(Boolean) as Nominee[];
  }, [nominees]);

  async function copyVoteSteps(nominee = featured) {
    if (!nominee) return;
    await navigator.clipboard.writeText(nominee.voteInstructions);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  return (
    <main className="min-h-[100dvh] bg-[#050505] text-white">
      <section className="relative min-h-[100dvh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,215,0,0.16),transparent_28%),radial-gradient(circle_at_18%_86%,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,#050505,#0b0b0b_52%,#050505)]" />
        <div className="absolute inset-0 opacity-[0.09]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

        <div className="relative mx-auto grid min-h-[100dvh] max-w-[1500px] grid-rows-[auto_1fr] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffd700]/30 bg-[#ffd700]/10 text-[#ffd700]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#a8a8a8]">Siggy Bot</p>
                <p className="text-sm font-medium text-white">Nomination intelligence</p>
              </div>
            </div>
            <button
              onClick={() => copyVoteSteps()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ffd700] px-4 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffe66d] active:translate-y-px"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              Vote steps
            </button>
          </header>

          <div className="grid items-center gap-8 py-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-10">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd700]">
                <Target className="h-4 w-4" />
                July 2026 nomination round
              </div>
              <h1 className="font-display text-5xl uppercase leading-[0.9] tracking-wide text-[#ffd700] sm:text-7xl xl:text-8xl">
                Vote with context.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#b8b8b8] sm:text-lg">
                Review each nominee by target role, Discord profile, current role, contribution count, event activity, and vote signal before spending a vote.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#777]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search nominee, role, display name"
                    className="h-13 w-full rounded-2xl border border-white/10 bg-black/45 py-4 pl-12 pr-4 text-sm outline-none placeholder:text-[#777] focus:border-[#ffd700]/70"
                  />
                </label>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortMode)}
                    className="h-13 rounded-2xl border border-white/10 bg-black/45 px-4 py-4 font-mono text-xs uppercase tracking-wider text-white outline-none focus:border-[#ffd700]/70"
                  >
                    {SORTS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <a
                    href="#nominees"
                    className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-[#ffd700] transition hover:border-[#ffd700]/50 active:translate-y-px"
                    aria-label="Open nominees"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {TARGETS.map((item) => {
                  const active = target === item;
                  return (
                    <button
                      key={item}
                      onClick={() => setTarget(item)}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition active:translate-y-px ${
                        active ? 'border-[#ffd700] bg-[#ffd700] text-black' : 'border-white/10 bg-white/[0.04] text-[#b8b8b8] hover:border-[#ffd700]/50 hover:text-[#ffd700]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat label="Nominees" value={totals.nominees} icon={<Users className="h-4 w-4" />} />
                <HeroStat label="Nominations" value={totals.nominations} icon={<Crown className="h-4 w-4" />} />
                <HeroStat label="Upvotes" value={totals.upvotes} icon={<Flame className="h-4 w-4" />} />
                <HeroStat label="Profiles" value={totals.enriched} icon={<ShieldCheck className="h-4 w-4" />} />
              </div>
            </div>

            <div className="min-w-0">
              {loading ? <FeaturedSkeleton /> : error ? <ErrorPanel message={error} /> : featured ? (
                <FeaturedNominee nominee={featured} onInspect={setSelected} onCopy={copyVoteSteps} copied={copied} />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090909]" aria-label="Vote instructions">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd700]">How voting works</p>
            <p className="mt-1 text-sm text-[#cfcfcf]">Run <span className="font-mono text-white">/leaderboard_nomination</span>, scroll until you find the nominee, click <span className="font-mono text-white">My votes</span>, then vote.</p>
          </div>
          <button
            onClick={() => copyVoteSteps()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ffd700]/30 bg-[#ffd700]/10 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#ffd700] transition hover:bg-[#ffd700]/15 active:translate-y-px"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            Copy exact steps
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffd700]">Featured by target</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Highest signal candidates</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#9a9a9a]">
            Target role is the leaderboard category. Current role is pulled from local Discord role data when available.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {topByTarget.map((nominee) => (
            <button key={nominee.id} onClick={() => setSelected(nominee)} className="text-left">
              <MiniFeature nominee={nominee} />
            </button>
          ))}
        </div>
      </section>

      <section id="nominees" className="mx-auto max-w-[1500px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-[#b8b8b8]">
            <Filter className="h-4 w-4 text-[#ffd700]" />
            Showing {filtered.length.toLocaleString()} of {nominees.length.toLocaleString()} nominees
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TARGETS.map((item) => (
              <button
                key={item}
                onClick={() => setTarget(item)}
                className={`whitespace-nowrap rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition ${
                  target === item ? 'border-[#ffd700] bg-[#ffd700] text-black' : 'border-white/10 bg-white/[0.03] text-[#aaa] hover:border-[#ffd700]/40'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => <CardSkeleton key={index} />)}
          </div>
        ) : error ? (
          <ErrorPanel message={error} />
        ) : filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((nominee) => (
              <NomineeCard key={nominee.id} nominee={nominee} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-[#aaa]">No nominees match this search.</div>
        )}
      </section>

      {selected ? <DetailDrawer nominee={selected} onClose={() => setSelected(null)} onCopy={copyVoteSteps} copied={copied} /> : null}
    </main>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffd700]/10 text-[#ffd700]">{icon}</div>
      <div className="text-2xl font-semibold text-white">{fmt(value)}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#888]">{label}</div>
    </div>
  );
}

function Avatar({ nominee, size = 'lg' }: { nominee: Nominee; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'h-11 w-11 rounded-xl text-base',
    md: 'h-14 w-14 rounded-2xl text-xl',
    lg: 'h-20 w-20 rounded-3xl text-2xl',
    xl: 'h-28 w-28 rounded-[28px] text-4xl',
  };
  if (nominee.avatar) {
    return <img src={nominee.avatar} alt="" className={`${sizes[size]} border border-white/10 object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} flex items-center justify-center border border-white/10 bg-[#111] font-display text-[#ffd700]`}>
      {initials(nominee.displayName || nominee.username)}
    </div>
  );
}

function RolePath({ nominee }: { nominee: Nominee }) {
  const current = nominee.currentRole || 'Unranked';
  const target = nominee.targetRole;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: roleColor(current), borderColor: `${roleColor(current)}66`, backgroundColor: `${roleColor(current)}16` }}>
        Current: {current}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#777]" />
      <span className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: targetColor(target), borderColor: `${targetColor(target)}66`, backgroundColor: `${targetColor(target)}16` }}>
        Nominated for: {target}
      </span>
    </div>
  );
}

function FeaturedNominee({ nominee, onInspect, onCopy, copied }: { nominee: Nominee; onInspect: (nominee: Nominee) => void; onCopy: (nominee?: Nominee) => void; copied: boolean }) {
  const accent = targetColor(nominee.targetRole);
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d0d]/90 shadow-2xl shadow-black/50">
      <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 80% 0%, ${accent}24, transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent 45%)` }} />
      <div className="relative grid gap-6 p-5 sm:p-7 xl:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-start">
          <Avatar nominee={nominee} size="xl" />
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#888]">Leaderboard rank</div>
            <div className="mt-1 text-3xl font-semibold" style={{ color: accent }}>#{nominee.leaderboardRank}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#ffd700]/30 bg-[#ffd700]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#ffd700]">
              {confidenceLabel(nominee.confidence)} signal
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#bbb]">
              {eligibilityCopy(nominee.eligibility)}
            </span>
          </div>
          <h2 className="truncate text-4xl font-semibold tracking-tight text-white sm:text-5xl">{nominee.displayName}</h2>
          <p className="mt-2 truncate text-lg text-[#b8b8b8]">@{nominee.username}</p>
          <div className="mt-4">
            <RolePath nominee={nominee} />
          </div>
          <p className="mt-5 line-clamp-3 max-w-2xl text-sm leading-6 text-[#b8b8b8]">{nominee.signalSummary}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Score" value={nominee.score} icon={<Trophy className="h-4 w-4" />} />
            <Metric label="Net votes" value={nominee.netVotes} icon={<Flame className="h-4 w-4" />} />
            <Metric label="Contrib" value={nominee.contributionsCount} icon={<Activity className="h-4 w-4" />} />
            <Metric label="Events" value={nominee.eventsCount} icon={<CalendarDays className="h-4 w-4" />} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onInspect(nominee)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffd700] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffe66d] active:translate-y-px">
              Inspect profile
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onCopy(nominee)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#ffd700]/50 hover:text-[#ffd700] active:translate-y-px">
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              Copy vote steps
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniFeature({ nominee }: { nominee: Nominee }) {
  const accent = targetColor(nominee.targetRole);
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#ffd700]/40 hover:bg-white/[0.055]">
      <div className="flex items-start gap-3">
        <Avatar nominee={nominee} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-lg font-semibold">{nominee.displayName}</h3>
            <span className="font-mono text-sm" style={{ color: accent }}>#{nominee.leaderboardRank}</span>
          </div>
          <p className="truncate text-sm text-[#9a9a9a]">@{nominee.username}</p>
          <div className="mt-3">
            <RolePath nominee={nominee} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallStat label="Score" value={nominee.score} />
        <SmallStat label="Up" value={nominee.upvotes} />
        <SmallStat label="Act" value={nominee.contributionsCount + nominee.eventsCount} />
      </div>
    </div>
  );
}

function NomineeCard({ nominee, onSelect }: { nominee: Nominee; onSelect: (nominee: Nominee) => void }) {
  const accent = targetColor(nominee.targetRole);
  return (
    <button onClick={() => onSelect(nominee)} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#ffd700]/40 hover:bg-[#101010]">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" style={{ background: `radial-gradient(circle at 88% 0%, ${accent}18, transparent 36%)` }} />
      <div className="relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar nominee={nominee} size="md" />
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold text-white">{nominee.displayName}</h3>
            <p className="mt-1 truncate text-sm text-[#9a9a9a]">@{nominee.username}</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#777]">Rank</div>
          <div className="text-lg font-semibold" style={{ color: accent }}>#{nominee.leaderboardRank}</div>
        </div>
      </div>

      <div className="mt-4 min-h-[30px]">
        <RolePath nominee={nominee} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        <SignalChip label="Nominations" value={nominee.nominations} tone={accent} />
        <SignalChip label="Upvotes" value={nominee.upvotes} tone="#35d07f" />
        <SignalChip label="Downvotes" value={nominee.downvotes} tone={nominee.downvotes > 0 ? '#fb7185' : '#777'} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#888]">
          Vote score <span className="text-white">{fmt(nominee.score)}</span>
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#ffd700]">
          View stats
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
      </div>
    </button>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center gap-2 text-[#ffd700]">{icon}<span className="text-xl font-semibold text-white">{fmt(value)}</span></div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#888]">{label}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="truncate text-sm font-semibold text-white">{fmt(value)}</div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[#777]">{label}</div>
    </div>
  );
}

function SignalChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-base font-semibold" style={{ color: tone }}>{fmt(value)}</div>
      <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-wider text-[#777]">{label}</div>
    </div>
  );
}

function DetailDrawer({ nominee, onClose, onCopy, copied }: { nominee: Nominee; onClose: () => void; onCopy: (nominee?: Nominee) => void; copied: boolean }) {
  const accent = targetColor(nominee.targetRole);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close nominee details" />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#080808] p-5 shadow-2xl shadow-black sm:p-7">
        <button onClick={onClose} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#aaa] transition hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="pr-12">
          <Avatar nominee={nominee} size="xl" />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: accent, borderColor: `${accent}66`, backgroundColor: `${accent}16` }}>
              Nominated for {nominee.targetRole}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#aaa]">
              {eligibilityCopy(nominee.eligibility)}
            </span>
          </div>
          <h2 className="mt-4 break-words text-4xl font-semibold tracking-tight">{nominee.displayName}</h2>
          <p className="mt-2 break-words text-lg text-[#b8b8b8]">@{nominee.username}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#ffd700]/20 bg-[#ffd700]/10 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#ffd700]">Vote flow</p>
          <p className="mt-2 text-sm leading-6 text-white">{nominee.voteInstructions}</p>
          <button onClick={() => onCopy(nominee)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd700] px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffe66d] active:translate-y-px">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy steps'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Metric label="Vote score" value={nominee.score} icon={<Trophy className="h-4 w-4" />} />
          <Metric label="Discord score" value={nominee.discordStatsScore} icon={<ShieldCheck className="h-4 w-4" />} />
          <Metric label="Net votes" value={nominee.netVotes} icon={<Flame className="h-4 w-4" />} />
          <Metric label="Contributions" value={nominee.contributionsCount} icon={<Activity className="h-4 w-4" />} />
          <Metric label="Events won" value={nominee.eventsWonCount || 0} icon={<Trophy className="h-4 w-4" />} />
          <Metric label="Events hosted" value={nominee.eventsHostedCount || 0} icon={<CalendarDays className="h-4 w-4" />} />
          <Metric label="Messages" value={nominee.globalMessages} icon={<MessageCircle className="h-4 w-4" />} />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#ffd700]">Role path</p>
          <div className="mt-3">
            <RolePath nominee={nominee} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#aaa]">{nominee.signalSummary}</p>
        </div>

        <div className="mt-6 grid gap-3">
          <Info label="Leaderboard target" value={nominee.targetRole} />
          <Info label="Current role" value={nominee.currentRole} />
          <Info label="Nominations" value={nominee.nominations.toLocaleString()} />
          <Info label="Upvotes / Downvotes" value={`${nominee.upvotes.toLocaleString()} / ${nominee.downvotes.toLocaleString()}`} />
          <Info label="Vote score formula" value={nominee.scoreFormula} />
          <Info label="Discord score formula" value={nominee.discordStatsFormula} />
          <Info label="Event participation" value={nominee.eventsCount.toLocaleString()} />
          <Info label="Events won" value={nominee.eventsWonCount == null ? 'Waiting for hourly stats' : nominee.eventsWonCount.toLocaleString()} />
          <Info label="Events hosted" value={nominee.eventsHostedCount == null ? 'Waiting for hourly stats' : nominee.eventsHostedCount.toLocaleString()} />
          <Info label="Joined" value={joinDate(nominee.joinedAt)} />
          <Info label="Discord ID" value={nominee.userId || nominee.source.discordMentionId || 'Unknown'} />
        </div>

        <div className="mt-6">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[#888]">Discord roles</p>
          <div className="flex flex-wrap gap-2">
            {(nominee.roles.length ? nominee.roles : ['No role data']).slice(0, 18).map((role) => (
              <span key={role} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#cfcfcf]">{role}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <span className="text-sm text-[#8a8a8a]">{label}</span>
      <span className="max-w-[62%] truncate text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="min-h-[420px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
  );
}

function CardSkeleton() {
  return <div className="h-[210px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />;
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-red-100">
      {message}
    </div>
  );
}
