'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RitualCard, CardData } from '../RitualCard';
import { Search, X, Download, RefreshCw, Check } from 'lucide-react';
import { computeStats } from '@/lib/card-stats';

/* ── Types ────────────────────────────────────────────────────────── */
interface Member {
  userId:          string;
  username:        string;
  displayName:     string;
  avatarUrl:       string;
  rarity:          string;
  type:            string;
  contributorRole: string | null;
  roleRank:        number;
  roles:           string[];
}

interface BatchItem extends Member {
  typeOverride:   string;
  xHandle:        string;
  card:           CardData | null;        // primary (actual rarity) for thumbnail
  allRarityCards: CardData[] | null;      // from their rarity down to common
  status:         'idle' | 'loading' | 'done' | 'error';
}

/* ── Constants ────────────────────────────────────────────────────── */
const RARITIES_ORDERED = ['UR', 'SSR', 'SR', 'R', 'common'] as const;

const ROLE_FILTER_OPTIONS = [
  'Foundation Team',
  'Mods',
  'Event Manager',
  'Radiant Ritualist',
  'Zealot',
  'Ritualist',
  'Siggy Soulsmith',
  'Siggy Architect',
  'Mage',
  'ritty',
  'bitty',
];
const ROLE_FILTER_LABELS: Record<string, string> = {
  'Foundation Team':   'Foundation',
  'Mods':              'Mods',
  'Event Manager':     'Ev.Manager',
  'Radiant Ritualist': 'Radiant',
  'Zealot':            'Zealot',
  'Ritualist':         'Ritualist',
  'Siggy Soulsmith':   'Soulsmith',
  'Siggy Architect':   'Architect',
  'Mage':              'Mage',
  'ritty':             'ritty',
  'bitty':             'bitty',
};

const TYPE_OPTIONS = [
  'builder', 'artist', 'threadoor', 'yapper', 'event-enjoyoor',
  'moderator', 'event-manager', 'team', 'ambassador',
];
const TYPE_LABELS: Record<string, string> = {
  builder: 'Builder', artist: 'Artist', threadoor: 'Threadoor',
  yapper: 'Yapper', 'event-enjoyoor': 'Event Enjoyoor',
  moderator: 'Moderator', 'event-manager': 'Event Manager',
  team: 'Team', ambassador: 'Ambassador',
};
const RARITY_COLOR: Record<string, string> = {
  UR: '#ff5fb8', SSR: '#FFD700', SR: '#c084fc', R: '#60a5fa', common: '#40FFAF',
};

/* ── Component ────────────────────────────────────────────────────── */
export default function BatchGeneratorPage() {
  // member browser
  const [allMembers, setAllMembers]   = useState<Member[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listLoaded, setListLoaded]   = useState(false);
  const [filter, setFilter]           = useState('');

  // search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // batch queue
  const [batch, setBatch]           = useState<BatchItem[]>([]);
  const [genAll, setGenAll]         = useState(false);
  const [zipping, setZipping]       = useState(false);
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null);
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'done' | 'error'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('');

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const LS_KEY   = 'ritual-members-cache-v2';
  const LS_TTL   = 12 * 60 * 60 * 1000;
  const QUEUE_KEY = 'ritual-batch-queue-v1';

  /* load member list — localStorage first, Discord only when stale or forced */
  const loadMembers = useCallback(async (force = false) => {
    // Try localStorage before hitting the server
    if (!force) {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const { members, savedAt } = JSON.parse(raw);
          if (Array.isArray(members) && members.length > 0 && Date.now() - savedAt < LS_TTL) {
            setAllMembers(members);
            setListLoaded(true);
            return; // fresh cache — no network request at all
          }
        }
      } catch {}
    }

    // Cache stale or forced — fetch from server
    setListLoading(true);
    try {
      const res  = await fetch(force ? '/api/members?force=true' : '/api/members');
      const data = await res.json();
      const members = data.members || [];
      if (members.length > 0) {
        try { localStorage.setItem(LS_KEY, JSON.stringify({ members, savedAt: Date.now() })); } catch {}
      }
      setAllMembers(members);
      setListLoaded(true);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Restore queue from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) {
        const saved: BatchItem[] = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) setBatch(saved);
      }
    } catch {}
  }, []);

  // Persist queue on every change (skip card data — too large)
  useEffect(() => {
    try {
      const toSave = batch.map(({ card, allRarityCards, ...rest }) => ({
        ...rest, card: null, allRarityCards: null,
        status: rest.status === 'loading' ? 'idle' : rest.status,
      }));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [batch]);

  const onSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res  = await fetch(`/api/member?autocomplete=true&username=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setSearchResults(data.members || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  };

  const addFromSearch = (m: Member) => {
    addMember(m);
    setSearchQuery('');
    setSearchResults([]);
  };

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* IDs that are fully generated — hide from left panel */
  const generatedIds = useMemo(
    () => new Set(batch.filter(b => b.status === 'done').map(b => b.userId)),
    [batch],
  );

  /* filtered list — exclude already-generated members */
  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return allMembers.filter(m => {
      if (generatedIds.has(m.userId)) return false;
      if (filterType && !m.roles.includes(filterType)) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.contributorRole || '').toLowerCase().includes(q)
      );
    });
  }, [allMembers, filter, filterType, generatedIds]);

  /* multi-select */
  const toggleSelect = (uid: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });
  const addSelected = () => {
    filtered.filter(m => selectedIds.has(m.userId) && !inBatch(m.userId)).forEach(addMember);
    setSelectedIds(new Set());
  };

  /* filtered queue */
  const filteredBatch = useMemo(() => {
    if (queueFilter === 'pending') return batch.filter(b => b.status === 'idle' || b.status === 'loading');
    if (queueFilter === 'done')    return batch.filter(b => b.status === 'done');
    if (queueFilter === 'error')   return batch.filter(b => b.status === 'error');
    return batch;
  }, [batch, queueFilter]);

  /* batch helpers */
  const inBatch  = (uid: string) => batch.some(b => b.userId === uid);
  const deriveTypeFromRoles = (roles: string[]): string => {
    if (roles.includes('Foundation Team')) return 'team';
    if (roles.some(r => r === 'Mods' || r === 'Moderator')) return 'moderator';
    if (roles.includes('Event Manager')) return 'event-manager';
    if (roles.includes('Radiant Ritualist')) return 'ambassador';
    if (roles.includes('Zealot')) return 'ambassador';
    if (roles.some(r => ['Ritualist', 'ritty', 'Mage', 'Siggy Soulsmith', 'Siggy Architect'].includes(r))) return 'builder';
    if (roles.includes('bitty')) return 'yapper';
    return 'yapper';
  };

  const addMember = (m: Member) => {
    if (inBatch(m.userId)) return;
    const typeOverride = m.type || deriveTypeFromRoles(m.roles || []);
    setBatch(prev => [...prev, { ...m, typeOverride, xHandle: '', card: null, allRarityCards: null, status: 'idle' }]);
  };
  const removeMember = (uid: string) => setBatch(prev => prev.filter(b => b.userId !== uid));
  const update = (uid: string, patch: Partial<BatchItem>) =>
    setBatch(prev => prev.map(b => b.userId === uid ? { ...b, ...patch } : b));

  /* pre-fetch image → base64 data URI so html-to-image never re-fetches */
  const toDataUri = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return url;
      const blob = await res.blob();
      return await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror  = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch { return url; }
  };

  /* generate one card — builds all rarity variants from their tier down to common */
  const generateOne = async (item: BatchItem) => {
    update(item.userId, { status: 'loading' });
    try {
      const handle = item.xHandle.replace('@', '').trim();
      const url    = `/api/member?userId=${item.userId}${handle ? `&xHandle=${encodeURIComponent(handle)}` : ''}`;
      const data   = await (await fetch(url)).json();
      if (data.member) {
        const base = data.member;
        const days: number = base.days ?? 0;
        const roleRank: number = base.roleRank ?? item.roleRank ?? 1;

        // Pre-convert PFP to data URI — html-to-image embeds it directly, no re-fetch
        const pfpDataUri = base.pfpUrl ? await toDataUri(base.pfpUrl) : base.pfpUrl;

        const baseCard: CardData = {
          ...base,
          pfpUrl:         pfpDataUri,
          type:           item.typeOverride,
          social:         handle ? `@${handle}` : base.social,
          socialPlatform: handle ? 'x' : 'discord',
        };
        // generate from their actual rarity down to common
        const startIdx = RARITIES_ORDERED.indexOf(item.rarity as typeof RARITIES_ORDERED[number]);
        const applicableRarities = RARITIES_ORDERED.slice(startIdx >= 0 ? startIdx : 0);
        const allRarityCards: CardData[] = applicableRarities.map(rar => {
          const { rep, atk, def, spd } = computeStats(days, roleRank, rar);
          return { ...baseCard, rarity: rar, rep, atk, def, spd };
        });
        update(item.userId, { status: 'done', roleRank, card: allRarityCards[0], allRarityCards });
      } else {
        update(item.userId, { status: 'error' });
      }
    } catch { update(item.userId, { status: 'error' }); }
  };

  const generateAll = async () => {
    const pending = batch.filter(b => b.status !== 'done' && b.status !== 'loading');
    setGenAll(true);
    setGenProgress({ current: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      await generateOne(pending[i]);
      setGenProgress({ current: i + 1, total: pending.length });
    }
    setGenAll(false);
    setGenProgress(null);
  };

  /* wait for all <img> inside el to finish loading before capture */
  const waitForImages = (el: HTMLElement): Promise<void> => {
    const imgs = Array.from(el.querySelectorAll('img'));
    return Promise.all(
      imgs.map(async img => {
        if (img.complete && img.naturalWidth > 0) {
          await img.decode?.().catch(() => {});
          return;
        }
        await new Promise<void>(resolve => {
          img.onload  = () => resolve();
          img.onerror = () => resolve(); // don't block on broken image
        });
        await img.decode?.().catch(() => {});
      })
    ).then(() => {});
  };

  /* render card to PNG data-url — key is `${userId}-${rarity}` */
  const renderCardPng = async (key: string): Promise<string | null> => {
    const el = cardRefs.current.get(key);
    if (!el) return null;
    try {
      el.classList.add('rc-capture');
      await waitForImages(el);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await new Promise(r => setTimeout(r, 80));
      const { toPng } = await import('html-to-image');
      const url = await toPng(el, { pixelRatio: 2.5, cacheBust: true, backgroundColor: 'transparent' });
      return url;
    } finally { el.classList.remove('rc-capture'); }
  };

  /* save all PNGs — one file per rarity variant, e.g. claire3653_UR.png */
  const saveToFolder = async () => {
    const done = batch.filter(b => b.status === 'done' && b.allRarityCards?.length);
    if (!done.length) return;
    setZipping(true);
    try {
      // @ts-ignore — File System Access API (Chrome/Edge)
      const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      for (const item of done) {
        for (const cardData of item.allRarityCards!) {
          const key     = `${item.userId}-${cardData.rarity}`;
          const dataUrl = await renderCardPng(key);
          if (!dataUrl) continue;
          const blob       = await (await fetch(dataUrl)).blob();
          const fileHandle = await dir.getFileHandle(`${item.username}_${cardData.rarity}.png`, { create: true });
          const writable   = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        const done2 = batch.filter(b => b.status === 'done' && b.allRarityCards?.length);
        for (const item of done2) {
          for (const cardData of item.allRarityCards!) {
            const key     = `${item.userId}-${cardData.rarity}`;
            const dataUrl = await renderCardPng(key);
            if (!dataUrl) continue;
            const a    = document.createElement('a');
            a.href     = dataUrl;
            a.download = `${item.username}_${cardData.rarity}.png`;
            a.click();
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }
    } finally { setZipping(false); }
  };

  const doneCount = batch.filter(b => b.status === 'done').length;

  return (
    <div className="gen-root">
      <div className="page-grain" />

      {/* Header */}
      <div className="gen-header">
        <div className="gen-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#FFD700" strokeWidth="1.5"/>
            <path d="M12 5l6 11H6l6-11z" stroke="#FFD700" strokeWidth="1.5"/>
            <circle cx="12" cy="13" r="1.6" fill="#FFD700"/>
          </svg>
          <div>
            <div className="gen-brand-name">Batch Generator</div>
            <div className="gen-brand-sub">
              {listLoading
                ? 'Loading contributors from Discord…'
                : `${allMembers.length} contributors${doneCount > 0 ? ` · ${doneCount} generated` : ''}${batch.length > doneCount ? ` · ${batch.length - doneCount} queued` : ''}`
              }
            </div>
          </div>
        </div>
        <div className="gen-header-actions">
          <a href="/card" className="gen-btn gen-btn-ghost">Single Card</a>
          <button
            className="gen-btn gen-btn-ghost"
            onClick={() => loadMembers(true)}
            disabled={listLoading}
            title="Force-refresh from Discord"
          >
            <RefreshCw size={13} className={listLoading ? 'batch-spin' : undefined}/>
          </button>
          {doneCount > 0 && (
            <button className="gen-btn" onClick={saveToFolder} disabled={zipping}>
              <Download size={13}/>
              {zipping ? 'Saving…' : `Save to Folder (${batch.filter(b=>b.status==='done').reduce((s,b)=>s+(b.allRarityCards?.length??1),0)} files)`}
            </button>
          )}
          {batch.some(b => b.status !== 'done') && (
            <button
              className="gen-btn gen-btn-primary"
              onClick={generateAll}
              disabled={genAll || batch.length === 0}
            >
              {genAll ? <><span className="batch-spin">⟳</span> Generating…</> : 'Generate All'}
            </button>
          )}
        </div>
      </div>

      <div className="batch-workspace">
        {/* Left: member browser */}
        <div className="batch-browser">
          {/* Discord-wide search */}
          <div className="batch-search-wrap" ref={searchRef}>
            <div className="gen-search-box" style={{ margin: 0 }}>
              <Search size={14} className="gen-search-icon"/>
              <input
                className="gen-search-input"
                placeholder="Search any Discord member…"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                style={{ padding: '10px 8px', fontSize: 13 }}
              />
              {searchLoading && <span className="gen-search-spinner"/>}
              {searchQuery && !searchLoading && (
                <button className="gen-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}><X size={13}/></button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="batch-search-dropdown">
                {searchResults.map(m => {
                  const added = inBatch(m.userId);
                  return (
                    <button
                      key={m.userId}
                      className="batch-search-result"
                      onClick={() => !added && addFromSearch(m)}
                      disabled={added}
                    >
                      <img src={m.avatarUrl} alt="" className="batch-member-avatar"/>
                      <div className="batch-member-info">
                        <span className="batch-member-name">{m.displayName}</span>
                        <span className="batch-member-sub">@{m.username}</span>
                      </div>
                      <div className="batch-member-right">
                        {m.contributorRole && (
                          <span className="batch-member-role" style={{ color: RARITY_COLOR[m.rarity] || '#888' }}>
                            {m.contributorRole}
                          </span>
                        )}
                        {added
                          ? <Check size={13} style={{ color: '#40FFAF', flexShrink: 0 }}/>
                          : <span className="batch-member-add">+</span>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="batch-browser-header">
            {/* Role filter chips */}
            <div className="batch-type-chips">
              <button
                className={`batch-type-chip${!filterType ? ' active' : ''}`}
                onClick={() => setFilterType('')}
              >All</button>
              {ROLE_FILTER_OPTIONS.map(r => (
                <button
                  key={r}
                  className={`batch-type-chip${filterType === r ? ' active' : ''}`}
                  onClick={() => setFilterType(prev => prev === r ? '' : r)}
                  title={r}
                >
                  {ROLE_FILTER_LABELS[r]}
                </button>
              ))}
            </div>
            {/* Name filter */}
            <div className="gen-search-box" style={{ margin: 0 }}>
              <Search size={14} className="gen-search-icon"/>
              <input
                className="gen-search-input"
                placeholder="Filter by name…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '10px 8px', fontSize: 13 }}
              />
              {filter && (
                <button className="gen-search-clear" onClick={() => setFilter('')}><X size={13}/></button>
              )}
            </div>
            <div className="batch-browser-count">
              {listLoading
                ? <span className="batch-spin" style={{ fontSize: 16 }}>⟳</span>
                : <>
                    <span>{filtered.length} remaining{generatedIds.size > 0 ? ` · ${generatedIds.size} done` : ''}</span>
                    {selectedIds.size > 0 && (
                      <button className="gen-btn gen-btn-primary" onClick={addSelected}
                        style={{ padding: '3px 8px', fontSize: 11, marginLeft: 'auto' }}>
                        + Add {selectedIds.size} selected
                      </button>
                    )}
                  </>
              }
            </div>
          </div>

          <div className="batch-member-list">
            {filtered.map(m => {
              const added    = inBatch(m.userId);
              const selected = selectedIds.has(m.userId);
              return (
                <div key={m.userId} className={`batch-member-row${added ? ' is-added' : ''}${selected ? ' is-selected' : ''}`}>
                  {!added && (
                    <input type="checkbox" className="batch-cb" checked={selected}
                      onChange={() => toggleSelect(m.userId)}
                      onClick={e => e.stopPropagation()}/>
                  )}
                  <button className="batch-member-btn" onClick={() => !added && addMember(m)} disabled={added}>
                    <img src={m.avatarUrl} alt="" className="batch-member-avatar"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                    <div className="batch-member-info">
                      <span className="batch-member-name">{m.displayName}</span>
                      <span className="batch-member-sub">@{m.username}</span>
                    </div>
                    <div className="batch-member-right">
                      {m.contributorRole && (
                        <span className="batch-member-role" style={{ color: RARITY_COLOR[m.rarity] || '#888' }}>
                          {m.contributorRole}
                        </span>
                      )}
                      {added
                        ? <Check size={13} style={{ color: '#40FFAF', flexShrink: 0 }}/>
                        : <span className="batch-member-add">+</span>
                      }
                    </div>
                  </button>
                </div>
              );
            })}
            {listLoaded && filtered.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#404040', fontSize: 12 }}>
                No contributors found
              </div>
            )}
          </div>
        </div>

        {/* Right: queue */}
        <div className="batch-queue-panel">
          <div className="batch-queue-title">
            <span>Queue {batch.length > 0 && <span style={{ color: '#A3A3A3', fontWeight: 400 }}>({batch.length})</span>}</span>
            {batch.length > 0 && (
              <button className="gen-btn gen-btn-ghost" onClick={() => { setBatch([]); localStorage.removeItem(QUEUE_KEY); }}
                title="Clear all" style={{ padding: '3px 8px', fontSize: 11, marginLeft: 'auto' }}>
                <X size={12}/> Clear all
              </button>
            )}
          </div>
          {batch.length > 0 && (
            <div className="batch-queue-controls">
              {/* Filter tabs */}
              <div className="batch-filter-tabs">
                {(['all','pending','done','error'] as const).map(f => (
                  <button key={f} className={`batch-filter-tab${queueFilter === f ? ' active' : ''}`}
                    onClick={() => setQueueFilter(f)}>
                    {f === 'all' ? `All (${batch.length})` :
                     f === 'pending' ? `Pending (${batch.filter(b => b.status === 'idle' || b.status === 'loading').length})` :
                     f === 'done' ? `Done (${batch.filter(b => b.status === 'done').length})` :
                     `Error (${batch.filter(b => b.status === 'error').length})`}
                  </button>
                ))}
              </div>
              {/* Bulk type chips */}
              <div className="batch-bulk-chips">
                <span className="batch-bulk-label">Set all pending:</span>
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t}
                    className="batch-type-chip batch-type-chip-sm"
                    title={`Set all pending to ${TYPE_LABELS[t]}`}
                    onClick={() => setBatch(prev => prev.map(b => b.status !== 'done' ? { ...b, typeOverride: t } : b))}
                  >
                    {TYPE_LABELS[t].replace('Event ', 'Ev.')}
                  </button>
                ))}
              </div>
              {/* Progress bar */}
              {genProgress && (
                <div className="batch-progress">
                  <div className="batch-progress-bar" style={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}/>
                  <span className="batch-progress-label">{genProgress.current} / {genProgress.total}</span>
                </div>
              )}
            </div>
          )}

          {batch.length === 0 ? (
            <div className="batch-empty">← Pick members from the list</div>
          ) : (
            <div className="batch-queue-list">
              {filteredBatch.map(item => (
                <div key={item.userId} className="batch-queue-row">
                  <img src={item.avatarUrl} alt="" className="batch-q-avatar"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                  <div className="batch-q-info">
                    <div className="batch-q-name">
                      <span>{item.displayName}</span>
                      <span className="batch-q-rarity" style={{ color: RARITY_COLOR[item.rarity] || '#888', borderColor: `${RARITY_COLOR[item.rarity]}44` }}>
                        {item.rarity}
                      </span>
                    </div>

                    {/* Type chips */}
                    <div className="batch-q-type-chips">
                      {TYPE_OPTIONS.map(t => (
                        <button
                          key={t}
                          className={`batch-type-chip batch-type-chip-sm${item.typeOverride === t ? ' active' : ''}`}
                          title={TYPE_LABELS[t]}
                          onClick={() => update(item.userId, { typeOverride: t, status: item.status === 'done' ? 'idle' : item.status })}
                        >
                          {TYPE_LABELS[t].replace('Event ', 'Ev.')}
                        </button>
                      ))}
                    </div>
                    {/* X Handle */}
                    <div className="batch-field" style={{ marginTop: 4 }}>
                      <label className="batch-field-label">X / Twitter handle</label>
                      <input
                        className="gen-input"
                        placeholder="@user"
                        value={item.xHandle}
                        onChange={e => update(item.userId, { xHandle: e.target.value, status: item.status === 'done' ? 'idle' : item.status })}
                        style={{ padding: '5px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>

                  {/* Actions + compact status. Full cards render offscreen only for PNG export. */}
                  <div className="batch-q-right">
                    <div className="batch-q-actions">
                      {item.status === 'error' && <span style={{ fontSize: 9, color: '#f87171' }}>ERR</span>}
                      <button
                        className="gen-btn gen-btn-primary"
                        onClick={() => generateOne(item)}
                        disabled={item.status === 'loading'}
                        style={{ padding: '5px 8px', fontSize: 11, minWidth: 38 }}
                      >
                        {item.status === 'loading'
                          ? <span className="batch-spin" style={{ fontSize: 14 }}>⟳</span>
                          : item.status === 'done' ? <RefreshCw size={11}/> : 'Gen'
                        }
                      </button>
                      <button className="gen-btn gen-btn-ghost" onClick={() => removeMember(item.userId)} style={{ padding: '5px 8px' }}>
                        <X size={12}/>
                      </button>
                    </div>
                    {item.status === 'done' && item.allRarityCards?.length && (
                      <span className="batch-ready-pill">{item.allRarityCards.length} PNG</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden cards — all rarity variants per member, keyed by userId-rarity */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {batch.filter(b => b.status === 'done' && b.allRarityCards).flatMap(item =>
          item.allRarityCards!.map(cardData => {
            const key = `${item.userId}-${cardData.rarity}`;
            return (
              <div
                key={key}
                ref={el => { if (el) cardRefs.current.set(key, el); else cardRefs.current.delete(key); }}
                className="gen-card-host"
              >
                <RitualCard {...cardData}/>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .batch-workspace {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 0;
          flex: 1;
          min-height: 0;
          height: calc(100vh - 148px);
          margin-top: 24px;
        }
        /* Member browser */
        .batch-browser {
          border-right: 1px solid #1a1a1a;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .batch-search-wrap {
          position: relative; padding: 10px 16px 0; flex-shrink: 0;
        }
        .batch-search-dropdown {
          position: absolute; top: calc(100% - 2px); left: 16px; right: 16px;
          background: #121212; border: 1px solid #2a2a2a; border-radius: 0 0 10px 10px;
          overflow: hidden; z-index: 50;
          box-shadow: 0 12px 32px -8px rgba(0,0,0,0.9);
        }
        .batch-search-result {
          width: 100%; background: transparent; border: none; border-bottom: 1px solid #1a1a1a;
          display: flex; align-items: center; gap: 10px; padding: 9px 14px;
          cursor: pointer; text-align: left; transition: background 80ms;
        }
        .batch-search-result:last-child { border-bottom: none; }
        .batch-search-result:hover:not(:disabled) { background: rgba(255,215,0,0.06); }
        .batch-search-result:disabled { opacity: 0.45; cursor: default; }
        .batch-browser-header {
          padding: 12px 16px; border-bottom: 1px solid #1a1a1a;
          display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
        }
        .batch-browser-count {
          font-size: 10px; color: #404040; letter-spacing: 0.08em; text-transform: uppercase;
          font-weight: 700; display: flex; align-items: center; gap: 6px;
        }
        .batch-member-list {
          flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #262626 transparent;
        }
        .batch-member-row {
          background: transparent; border-bottom: 1px solid #111;
          display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 16px;
          transition: background 80ms;
        }
        .batch-member-row:hover:not(.is-added) { background: rgba(255,215,0,0.05); }
        .batch-member-row.is-added { opacity: 0.45; }
        .batch-member-row.is-selected { background: rgba(255,215,0,0.08); }
        .batch-cb { width: 14px; height: 14px; flex-shrink: 0; accent-color: #FFD700; cursor: pointer; }
        .batch-member-btn {
          flex: 1; background: transparent; border: none;
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; text-align: left; padding: 5px 0; min-width: 0;
        }
        .batch-member-btn:disabled { cursor: default; }
        .batch-member-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: #1a1a1a; object-fit: cover; }
        .batch-member-info { flex: 1; min-width: 0; }
        .batch-member-name { display: block; font-size: 12px; font-weight: 700; color: #FAFAFA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .batch-member-sub { font-size: 10px; color: #606060; }
        .batch-member-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .batch-member-role { font-size: 9px; font-weight: 700; }
        .batch-member-add { font-size: 16px; color: #404040; line-height: 1; }
        .batch-member-row:hover:not(:disabled) .batch-member-add { color: #FFD700; }

        /* Queue panel */
        .batch-queue-panel {
          display: flex; flex-direction: column; overflow: hidden;
        }
        .batch-queue-title {
          padding: 16px 20px 12px;
          font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 800; color: #FFD700;
          border-bottom: 1px solid #1a1a1a; flex-shrink: 0;
          display: flex; align-items: center;
        }
        .batch-empty {
          padding: 48px 20px; color: #404040; font-size: 12px;
        }
        .batch-queue-list {
          flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #262626 transparent;
          padding: 10px 16px; display: flex; flex-direction: column; gap: 8px;
        }
        .batch-queue-row {
          background: #0e0e0e; border: 1px solid #1e1e1e; border-radius: 10px;
          padding: 10px 12px; display: flex; gap: 10px; align-items: flex-start;
        }
        .batch-q-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: #1a1a1a; object-fit: cover; margin-top: 2px; }
        .batch-q-info { flex: 1; min-width: 0; }
        .batch-q-name { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .batch-q-name > span:first-child { font-size: 12px; font-weight: 700; color: #FAFAFA; }
        .batch-q-rarity { font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 3px; border: 1px solid; flex-shrink: 0; }
        .batch-q-fields { display: flex; gap: 8px; flex-wrap: wrap; }
        .batch-q-right { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; gap: 4px; }
        .batch-q-actions { display: flex; flex-direction: column; gap: 4px; align-items: center; }
        .batch-ready-pill {
          font-size: 8px; font-weight: 900; letter-spacing: 0.08em;
          color: #40FFAF; border: 1px solid rgba(64,255,175,0.28);
          background: rgba(64,255,175,0.08); border-radius: 999px;
          padding: 2px 6px; white-space: nowrap;
        }
        /* Queue controls bar */
        .batch-queue-controls {
          padding: 8px 16px; border-bottom: 1px solid #1a1a1a; flex-shrink: 0;
          display: flex; flex-direction: column; gap: 6px;
        }
        .batch-filter-tabs { display: flex; gap: 4px; }
        .batch-filter-tab {
          background: transparent; border: 1px solid #222; border-radius: 5px; color: #606060;
          font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 3px 7px; cursor: pointer; transition: all 100ms;
        }
        .batch-filter-tab:hover { background: #1a1a1a; color: #FAFAFA; }
        .batch-filter-tab.active { background: rgba(255,215,0,0.12); border-color: #FFD700; color: #FFD700; }
        /* Type filter chips (left panel + bulk setter) */
        .batch-type-chips {
          display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0 2px;
        }
        .batch-type-chip {
          background: #0e0e0e; border: 1px solid #222; border-radius: 4px;
          color: #666; font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
          padding: 3px 6px; cursor: pointer; transition: all 100ms; white-space: nowrap;
        }
        .batch-type-chip:hover { background: #1a1a1a; color: #ccc; border-color: #444; }
        .batch-type-chip.active { background: rgba(255,215,0,0.14); border-color: #FFD700; color: #FFD700; }
        .batch-type-chip-sm { font-size: 8px; padding: 2px 5px; }
        /* Bulk type chips row */
        .batch-bulk-chips {
          display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
        }
        .batch-bulk-label {
          font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700; color: #404040; flex-shrink: 0; margin-right: 2px;
        }
        /* Per-row type chips */
        .batch-q-type-chips {
          display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 2px;
        }
        /* Progress bar */
        .batch-progress {
          position: relative; height: 18px; background: #111; border-radius: 4px; overflow: hidden;
        }
        .batch-progress-bar {
          position: absolute; inset: 0; background: linear-gradient(90deg, #40FFAF, #FFD700);
          border-radius: 4px; transition: width 300ms ease;
        }
        .batch-progress-label {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 800; color: #050505; letter-spacing: 0.06em;
        }
        .batch-field { display: flex; flex-direction: column; gap: 3px; }
        .batch-field-label { font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: #505050; }
        .batch-select {
          background: #050505; border: 1px solid #1e1e1e; color: #FAFAFA;
          font-size: 11px; padding: 5px 7px; border-radius: 5px; outline: none; cursor: pointer;
        }
        .batch-select:focus { border-color: #FFD700; }
        .batch-spin { display: inline-block; animation: gen-spin 0.7s linear infinite; }

        @media (max-width: 900px) {
          .batch-workspace { grid-template-columns: 1fr; height: auto; }
          .batch-browser { border-right: none; border-bottom: 1px solid #1a1a1a; max-height: 50vh; }
        }
      `}</style>
    </div>
  );
}
