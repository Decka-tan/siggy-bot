'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#FFD700',
  'Zealot': '#ef4444',
  'Ritualist': '#22c55e',
  'Siggy Soulsmith': '#ec4899',
  'Siggy Architect': '#06b6d4',
  'Mage': '#14b8a6',
  'ritty': '#a855f7',
  'bitty': '#3b82f6',
  'Forerunner': '#64748b',
};
const ROLE_ORDER = [
  'Radiant Ritualist', 'Zealot', 'Ritualist', 'Siggy Soulsmith',
  'Siggy Architect', 'Mage', 'ritty', 'bitty', 'Forerunner',
];

type DistRow = { role: string; count: number; percent: number; contributor: boolean };
type Upgrade = { userId: string; username: string; displayName: string; fromRole: string; toRole: string; at: number };

function color(role: string) { return ROLE_COLOR[role] || '#888'; }

function relativeTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function RoleBadge({ role }: { role: string }) {
  const c = color(role);
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
      style={{ color: c, borderColor: c, backgroundColor: `${c}20` }}>
      {role}
    </span>
  );
}

function UpgradeCard({ u }: { u: Upgrade }) {
  const [err, setErr] = useState(false);
  const c = color(u.toRole);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border"
      style={{ backgroundColor: '#0a0a0a', borderColor: `${c}44` }}>
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#1a1a1a]"
        style={{ boxShadow: `0 0 0 2px ${c}55` }}>
        <Image
          src={err ? `https://cdn.discordapp.com/embed/avatars/0.png` : `/api/avatar?id=${u.userId}`}
          alt={u.displayName} fill className="object-cover" onError={() => setErr(true)} unoptimized
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{u.displayName}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <RoleBadge role={u.fromRole} />
          <span className="text-[#444] text-xs">→</span>
          <RoleBadge role={u.toRole} />
        </div>
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color: '#555' }}>{relativeTime(u.at)}</span>
    </div>
  );
}

export default function CommunityPage() {
  const [data, setData] = useState<{ stats: any; upgrades: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contributorOnly, setContributorOnly] = useState(false);

  useEffect(() => {
    fetch('/api/community')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const dist: DistRow[] = data?.stats?.distribution ?? [];
  const shown = (contributorOnly ? dist.filter(d => d.contributor) : dist)
    .filter(d => d.count > 0)
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  const maxCount = Math.max(1, ...shown.map(d => d.count));
  const upgrades: Upgrade[] = data?.upgrades?.upgrades ?? [];
  const total = data?.stats?.totalMembers ?? 0;
  const updatedAt = data?.stats?.updatedAt;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-6xl mx-auto px-4 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: '#22c55e' }}>
              Live · Updates Hourly
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tight mb-4">
            Ritual Community
          </h1>
          <p className="text-[#888] text-lg">
            {total.toLocaleString()} contributors across the ranks
            {updatedAt && <span className="text-[#555]"> · synced {relativeTime(updatedAt)}</span>}
          </p>
        </div>

        {loading && <p className="text-center text-[#555] font-mono">Loading...</p>}
        {error && (
          <p className="text-center text-[#555] font-mono">
            Stats not available yet. The hourly job may not have run.
          </p>
        )}

        {data && (
          <div className="grid lg:grid-cols-5 gap-8">

            {/* Distribution */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl uppercase tracking-wide">Role Distribution</h2>
                <button
                  onClick={() => setContributorOnly(v => !v)}
                  className="px-4 py-1.5 rounded-full text-xs font-mono border transition-all"
                  style={{
                    borderColor: contributorOnly ? 'var(--color-accent)' : '#222',
                    backgroundColor: contributorOnly ? 'var(--color-accent)' : 'transparent',
                    color: contributorOnly ? '#000' : '#666',
                  }}>
                  Contributor only
                </button>
              </div>

              <div className="space-y-3">
                {shown.map((d, i) => {
                  const c = color(d.role);
                  return (
                    <motion.div key={d.role}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-xl border p-4"
                      style={{ backgroundColor: '#0a0a0a', borderColor: `${c}33` }}>
                      <div className="flex items-center justify-between mb-2">
                        <RoleBadge role={d.role} />
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-xl" style={{ color: c }}>{d.count}</span>
                          <span className="text-xs font-mono text-[#555]">{d.percent}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.count / maxCount) * 100}%` }}
                          transition={{ delay: i * 0.04 + 0.1, duration: 0.6, ease: 'easeOut' }}
                          style={{ backgroundColor: c }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Recently Upgraded */}
            <div className="lg:col-span-2">
              <h2 className="font-display text-2xl uppercase tracking-wide mb-6">
                Recently Upgraded
                <span className="block text-xs font-mono text-[#555] mt-1 normal-case tracking-normal">
                  last 14 days
                </span>
              </h2>

              {upgrades.length === 0 ? (
                <p className="text-[#555] text-sm font-mono">No upgrades in the last 14 days yet.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {upgrades.map(u => <UpgradeCard key={`${u.userId}-${u.at}`} u={u} />)}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
