'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Holder = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string | null;
  topRole: string | null;
};

type Payload = {
  updatedAt: number;
  badge: string;
  count: number;
  holders: Holder[];
};

type Activity = {
  userId: string;
  contributions?: number;
  eventsWon?: number;
  eventsHosted?: number;
};

const ROLE_COLOR: Record<string, string> = {
  'Radiant Ritualist': '#FFD700',
  Zealot: '#ef4444',
  Ritualist: '#22c55e',
  Mage: '#1ABC9C',
  ritty: '#a855f7',
  bitty: '#3b82f6',
};

const GOLD = '#FFD700';

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function DetailOverlay({
  holder,
  activity,
  onClose,
}: {
  holder: Holder;
  activity: Activity | null;
  onClose: () => void;
}) {
  const color = holder.topRole ? ROLE_COLOR[holder.topRole] || GOLD : GOLD;
  const days = daysSince(holder.joinedAt);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/genesis?u=${holder.username}` : '';
  const tweet = `Check out ${holder.displayName} — Genesis 1000 holder on Ritual Chain.`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  };
  const copyId = async () => {
    try { await navigator.clipboard.writeText(holder.userId); } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 backdrop-blur-xl" style={{ backgroundColor: '#050505ee' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden border"
        style={{
          backgroundColor: '#0a0a0a',
          borderColor: `${color}44`,
          boxShadow: `0 0 80px ${color}22`,
        }}
      >
        {/* Gold gradient top strip */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #FFA500 50%, #FF6B35 100%)` }}
        />

        {/* Header: avatar + identity */}
        <div className="p-6 sm:p-8 border-b" style={{ borderColor: '#1a1a1a' }}>
          <div className="flex items-start gap-5">
            <img
              src={holder.avatarUrl}
              alt={holder.displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 shrink-0"
              style={{ borderColor: `${color}88` }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2"
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)',
                  color: '#0a0a0a',
                }}
              >
                🎴 Prime Genesis · Genesis 1000
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight truncate">{holder.displayName}</h2>
              <p className="text-sm opacity-60 font-mono truncate">@{holder.username}</p>
              <button
                onClick={copyId}
                title="Copy Discord ID"
                className="mt-2 text-[10px] font-mono opacity-40 hover:opacity-80 transition cursor-pointer"
              >
                {holder.userId} · copy
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-2xl leading-none opacity-50 hover:opacity-100 transition shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Role + join date row */}
          <div className="flex flex-wrap gap-2 mt-5">
            {holder.topRole && (
              <span
                className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
                style={{ color, borderColor: `${color}66`, backgroundColor: `${color}11` }}
              >
                {holder.topRole}
              </span>
            )}
            <span
              className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ color: '#888', borderColor: '#222' }}
            >
              Joined {formatJoinDate(holder.joinedAt)}
            </span>
            {days !== null && (
              <span
                className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full border"
                style={{ color: '#888', borderColor: '#222' }}
              >
                {days} days in
              </span>
            )}
          </div>
        </div>

        {/* Activity stats */}
        <div className="p-6 sm:p-8 border-b" style={{ borderColor: '#1a1a1a' }}>
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-50 mb-3">
            Activity Metrics
          </h3>
          {activity ? (
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Contributions" value={activity.contributions ?? 0} accent="#22c55e" />
              <StatTile label="Events Won" value={activity.eventsWon ?? 0} accent="#FFD700" />
              <StatTile label="Hosted" value={activity.eventsHosted ?? 0} accent="#a855f7" />
            </div>
          ) : (
            <p className="text-xs opacity-40 italic">No activity data yet.</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 sm:p-8 flex flex-wrap gap-2 justify-end">
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition"
            style={{ borderColor: '#222', color: '#ccc' }}
          >
            Copy link
          </button>
          <a
            href={`/stats?u=${encodeURIComponent(holder.username)}`}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border transition"
            style={{ borderColor: '#222', color: '#ccc' }}
          >
            View on /stats
          </a>
          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)',
              color: '#0a0a0a',
            }}
          >
            Share on X
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: '#050505', borderColor: '#1a1a1a' }}>
      <div className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-50 mb-1.5">{label}</div>
      <div className="text-2xl font-black font-mono" style={{ color: accent }}>{value.toLocaleString()}</div>
    </div>
  );
}

export default function GenesisPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [activityByUser, setActivityByUser] = useState<Record<string, Activity> | null>(null);
  const [selected, setSelected] = useState<Holder | null>(null);

  useEffect(() => {
    fetch('/api/badge/genesis-1000')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(e => setErr(`Failed to load (${e})`));

    // Pull activity data once so the overlay can show metrics without a per-click round trip.
    fetch('/api/community')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.activity?.byUser) setActivityByUser(d.activity.byUser);
      })
      .catch(() => {});
  }, []);

  // Deep-link: /genesis?u=username opens overlay on load.
  useEffect(() => {
    if (!data) return;
    const u = new URLSearchParams(window.location.search).get('u');
    if (!u) return;
    const target = data.holders.find(h => h.username.toLowerCase() === u.toLowerCase());
    if (target) setSelected(target);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.holders;
    return data.holders.filter(
      h =>
        h.username.toLowerCase().includes(needle) ||
        h.displayName.toLowerCase().includes(needle),
    );
  }, [data, q]);

  return (
    <main className="min-h-screen px-4 sm:px-6 py-12" style={{ backgroundColor: '#050505', color: '#e5e5e5' }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Genesis 1000
          </h1>
          <p className="text-sm sm:text-base opacity-70">
            Discord members holding the Genesis 1000 role — the first 1,000 to deploy a sovereign agent on testnet.
          </p>
          {data && (
            <p className="text-xs opacity-50 mt-2">
              {data.count} holders · updated {new Date(data.updatedAt).toLocaleString()}
            </p>
          )}
        </header>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by username or display name…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border outline-none focus:border-yellow-500/50 transition"
            style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a', color: '#e5e5e5' }}
          />
        </div>

        {err && <p className="text-center text-red-400">{err}</p>}
        {!data && !err && <p className="text-center opacity-50">Loading…</p>}

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(h => {
              const color = h.topRole ? ROLE_COLOR[h.topRole] || GOLD : GOLD;
              return (
                <button
                  key={h.userId}
                  onClick={() => setSelected(h)}
                  className="rounded-2xl border p-4 flex flex-col items-center text-center transition hover:scale-[1.02] cursor-pointer"
                  style={{
                    backgroundColor: '#0a0a0a',
                    borderColor: `${color}33`,
                    boxShadow: `0 0 24px ${color}11`,
                  }}
                >
                  <img
                    src={h.avatarUrl}
                    alt={h.displayName}
                    className="w-16 h-16 rounded-full mb-3 border-2"
                    style={{ borderColor: `${color}66` }}
                  />
                  <div className="text-sm font-semibold truncate w-full">{h.displayName}</div>
                  <div className="text-xs opacity-50 truncate w-full">@{h.username}</div>
                  {h.topRole && (
                    <div className="text-xs mt-2 px-2 py-0.5 rounded-full border" style={{ color, borderColor: `${color}55` }}>
                      {h.topRole}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {data && filtered.length === 0 && q && (
          <p className="text-center opacity-50 mt-8">No holder matches “{q}”.</p>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <DetailOverlay
            holder={selected}
            activity={activityByUser?.[selected.userId] || null}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
