'use client';

import { useState } from 'react';
import Image from 'next/image';
import promotions from '@/lib/promotions-june-2026.json';

const ROLE_RANK: Record<string, number> = {
  ritualist: 7, soulsmith: 6, architect: 5, mage: 4,
  ritty: 3, bitty: 2, forerunner: 1, contributor: 0,
};

const ROLE_LABEL: Record<string, string> = {
  ritualist: 'Ritualist', soulsmith: 'Soulsmith', architect: 'Architect',
  mage: 'Mage', forerunner: 'Forerunner', ritty: 'ritty', bitty: 'bitty',
  contributor: 'Contributor',
};

const ROLE_COLOR: Record<string, string> = {
  ritualist: '#FF6B35',
  soulsmith: '#9B59B6',
  architect: '#3498DB',
  mage: '#1ABC9C',
  forerunner: '#FFD700',
  ritty: '#FFD700',
  bitty: '#A3A3A3',
  contributor: '#555',
};

type FilterType = 'all' | string;

function getDiscordAvatar(userId: string) {
  const defaultIndex = (BigInt(userId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLOR[role] || '#555';
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: color, backgroundColor: `${color}18` }}
    >
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function MemberCard({ member }: { member: typeof promotions[0] }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = imgError
    ? getDiscordAvatar(member.userId)
    : `https://cdn.discordapp.com/avatars/${member.userId}/avatar.png?size=128`;

  const isHighlight = ROLE_RANK[member.toRole] >= 3; // forerunner+

  return (
    <div
      className="relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: isHighlight ? ROLE_COLOR[member.toRole] + '44' : 'var(--color-border)',
        boxShadow: isHighlight ? `0 0 20px ${ROLE_COLOR[member.toRole]}22` : undefined,
      }}
    >
      {isHighlight && (
        <div
          className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: ROLE_COLOR[member.toRole], color: '#000' }}
        >
          ↑
        </div>
      )}

      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2"
        style={{ borderColor: ROLE_COLOR[member.toRole] || 'var(--color-border)' }}>
        <Image
          src={avatarUrl}
          alt={member.displayName}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>

      <div className="text-center min-w-0 w-full">
        <p className="font-semibold text-sm truncate" title={member.displayName}>
          {member.displayName}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">@{member.username}</p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <RoleBadge role={member.fromRole} />
        <span className="text-[var(--color-text-secondary)] text-xs">→</span>
        <RoleBadge role={member.toRole} />
      </div>
    </div>
  );
}

const GENUINE_PROMOS = promotions.filter(
  m => (ROLE_RANK[m.toRole] ?? 0) > (ROLE_RANK[m.fromRole] ?? 0)
);

const ALL_TO_ROLES = [...new Set(GENUINE_PROMOS.map(m => m.toRole))]
  .sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);

export default function PromotionPage() {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = (filter === 'all'
    ? promotions
    : promotions.filter(m => m.toRole === filter)
  ).filter(m => (ROLE_RANK[m.toRole] ?? 0) > (ROLE_RANK[m.fromRole] ?? 0));

  const sorted = [...filtered].sort(
    (a, b) => (ROLE_RANK[b.toRole] ?? 0) - (ROLE_RANK[a.toRole] ?? 0)
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[var(--color-accent)] font-mono text-sm tracking-widest uppercase mb-4">
            May 2026 Nomination Period · Results June 1, 2026
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight mb-5 leading-tight">
            Are You Upgraded?
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl md:text-2xl mb-2">
            Getting a promotion from the
          </p>
          <p className="font-display text-2xl md:text-3xl uppercase tracking-wide mb-6"
            style={{ color: 'var(--color-accent)' }}>
            May 2026 Nomination Period?
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {GENUINE_PROMOS.length} members promoted in Ritual
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {ALL_TO_ROLES.map(role => {
            const count = GENUINE_PROMOS.filter(m => m.toRole === role).length;
            return (
              <div key={role}
                className="rounded-lg p-3 border text-center"
                style={{ borderColor: ROLE_COLOR[role] + '44', backgroundColor: ROLE_COLOR[role] + '10' }}>
                <p className="text-2xl font-bold" style={{ color: ROLE_COLOR[role] }}>{count}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{ROLE_LABEL[role]}</p>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <button
            onClick={() => setFilter('all')}
            className="px-4 py-1.5 rounded-full text-sm border transition-all"
            style={{
              borderColor: filter === 'all' ? 'var(--color-accent)' : 'var(--color-border)',
              backgroundColor: filter === 'all' ? 'var(--color-accent)' : 'transparent',
              color: filter === 'all' ? '#000' : 'var(--color-text-secondary)',
            }}
          >
            All ({GENUINE_PROMOS.length})
          </button>
          {ALL_TO_ROLES.map(role => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className="px-4 py-1.5 rounded-full text-sm border transition-all"
              style={{
                borderColor: filter === role ? ROLE_COLOR[role] : 'var(--color-border)',
                backgroundColor: filter === role ? ROLE_COLOR[role] : 'transparent',
                color: filter === role ? '#000' : 'var(--color-text-secondary)',
              }}
            >
              {ROLE_LABEL[role]} ({GENUINE_PROMOS.filter(m => m.toRole === role).length})
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sorted.map(member => (
            <MemberCard key={member.userId} member={member} />
          ))}
        </div>

      </div>
    </div>
  );
}
