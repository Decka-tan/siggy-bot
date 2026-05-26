'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { RitualCard, TYPES, CardData } from '../RitualCard';
import { Search, X, Plus, Download, RefreshCw } from 'lucide-react';

/* ── Types ────────────────────────────────────────────────────────── */
interface SearchResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  rarity: string;
  contributorRole: string | null;
  roleRank: number;
}

interface BatchItem extends SearchResult {
  typeOverride: string;
  xHandle: string;
  card: CardData | null;
  status: 'idle' | 'loading' | 'done' | 'error';
}

/* ── Constants ────────────────────────────────────────────────────── */
const TYPE_OPTIONS = [
  'builder', 'artist', 'threadoor', 'yapper', 'event-enjoyoor',
  'moderator', 'event-manager', 'team',
];
const TYPE_LABELS: Record<string, string> = {
  builder: 'Builder', artist: 'Artist', threadoor: 'Threadoor',
  yapper: 'Yapper', 'event-enjoyoor': 'Event Enjoyoor',
  moderator: 'Moderator', 'event-manager': 'Event Manager', team: 'Team',
};
const RARITY_COLOR: Record<string, string> = {
  UR: '#ff5fb8', SSR: '#FFD700', SR: '#c084fc', R: '#60a5fa', common: '#40FFAF',
};

/* ── Component ────────────────────────────────────────────────────── */
export default function BatchGeneratorPage() {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [batch, setBatch]           = useState<BatchItem[]>([]);
  const [genAll, setGenAll]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs    = useRef<Map<string, HTMLDivElement>>(new Map());

  /* search */
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res  = await fetch(`/api/member?username=${encodeURIComponent(q)}&autocomplete=true`);
      const data = await res.json();
      setResults(data.members || []);
      setSearchOpen(true);
    } catch { setResults([]); }
    finally  { setSearching(false); }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const addMember = (m: SearchResult) => {
    if (batch.some(b => b.userId === m.userId)) return;
    setBatch(prev => [...prev, {
      ...m,
      typeOverride: 'builder',
      xHandle:      '',
      card:         null,
      status:       'idle',
    }]);
    setQuery(''); setResults([]); setSearchOpen(false);
  };

  const remove = (uid: string) => setBatch(prev => prev.filter(b => b.userId !== uid));

  const update = (uid: string, patch: Partial<BatchItem>) =>
    setBatch(prev => prev.map(b => b.userId === uid ? { ...b, ...patch } : b));

  /* generate single */
  const generateOne = async (item: BatchItem) => {
    update(item.userId, { status: 'loading' });
    try {
      const handle = item.xHandle.replace('@', '').trim();
      const url    = `/api/member?userId=${item.userId}${handle ? `&xHandle=${encodeURIComponent(handle)}` : ''}`;
      const data   = await (await fetch(url)).json();
      if (data.member) {
        update(item.userId, {
          status: 'done',
          card: {
            ...data.member,
            type:           item.typeOverride,
            social:         handle ? `@${handle}` : data.member.social,
            socialPlatform: handle ? 'x' : 'discord',
          },
        });
      } else {
        update(item.userId, { status: 'error' });
      }
    } catch { update(item.userId, { status: 'error' }); }
  };

  /* generate all idle/error items sequentially */
  const generateAll = async () => {
    setGenAll(true);
    for (const item of batch.filter(b => b.status !== 'loading' && b.status !== 'done')) {
      await generateOne(item);
    }
    setGenAll(false);
  };

  /* download PNG for one card */
  const downloadCard = async (uid: string) => {
    const el = cardRefs.current.get(uid);
    if (!el) return;
    try {
      el.classList.add('rc-capture');
      await new Promise(r => setTimeout(r, 60));
      const { toPng } = await import('html-to-image');
      const dataUrl   = await toPng(el, { pixelRatio: 2.5, cacheBust: true, backgroundColor: 'transparent' });
      const name      = batch.find(b => b.userId === uid)?.displayName || uid;
      const a         = document.createElement('a');
      a.href          = dataUrl;
      a.download      = `ritual-${name.replace(/[^a-z0-9._-]+/gi, '_')}.png`;
      a.click();
    } finally { el.classList.remove('rc-capture'); }
  };

  /* close dropdown on outside click */
  useEffect(() => {
    const h = () => setSearchOpen(false);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

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
              {batch.length === 0
                ? 'Add members · set type · generate all'
                : `${batch.length} member${batch.length > 1 ? 's' : ''} queued${doneCount > 0 ? ` · ${doneCount} generated` : ''}`
              }
            </div>
          </div>
        </div>
        <div className="gen-header-actions">
          <a href="/card" className="gen-btn gen-btn-ghost">Single Card</a>
          {batch.length > 0 && (
            <button
              className="gen-btn gen-btn-primary"
              onClick={generateAll}
              disabled={genAll || batch.every(b => b.status === 'done')}
            >
              {genAll
                ? <><span className="batch-spin">⟳</span> Generating…</>
                : 'Generate All'
              }
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="gen-search-wrap" onClick={e => e.stopPropagation()}>
        <div className="gen-search-box">
          <Search size={16} className="gen-search-icon" />
          <input
            className="gen-search-input"
            placeholder="Search Ritual member to add…"
            value={query}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setSearchOpen(true)}
          />
          {searching && <div className="gen-search-spinner" />}
          {query && (
            <button className="gen-search-clear" onClick={() => { setQuery(''); setResults([]); setSearchOpen(false); }}>
              <X size={14} />
            </button>
          )}
        </div>

        {searchOpen && results.length > 0 && (
          <div className="gen-search-dropdown">
            {results.map(m => {
              const already = batch.some(b => b.userId === m.userId);
              return (
                <button
                  key={m.userId}
                  className="gen-search-item"
                  onClick={() => !already && addMember(m)}
                  style={{ opacity: already ? 0.4 : 1, cursor: already ? 'default' : 'pointer' }}
                >
                  <img src={m.avatarUrl} alt="" className="gen-search-avatar"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="gen-search-info">
                    <span className="gen-search-name">{m.displayName}</span>
                    <span className="gen-search-meta">@{m.username}</span>
                  </div>
                  {m.contributorRole && (
                    <span className="gen-search-role" style={{ color: RARITY_COLOR[m.rarity] || '#888' }}>
                      {m.contributorRole}
                    </span>
                  )}
                  <Plus size={13} style={{ color: already ? '#404040' : '#FFD700', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Queue */}
      <div className="batch-queue">
        {batch.length === 0 ? (
          <div className="batch-empty">Search and add members above to start your batch</div>
        ) : (
          batch.map(item => (
            <div key={item.userId} className="batch-row">
              {/* Avatar + info */}
              <img
                src={item.avatarUrl} alt=""
                className="batch-avatar"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="batch-info">
                <div className="batch-name-row">
                  <span className="batch-display-name">{item.displayName}</span>
                  <span className="batch-rarity-tag" style={{ color: RARITY_COLOR[item.rarity] || '#888', borderColor: `${RARITY_COLOR[item.rarity] || '#888'}44` }}>
                    {item.rarity}
                  </span>
                  {item.contributorRole && (
                    <span className="batch-contrib-role">{item.contributorRole}</span>
                  )}
                </div>
                <span className="batch-username">@{item.username}</span>
              </div>

              {/* Type */}
              <div className="batch-field">
                <label className="batch-field-label">Type</label>
                <select
                  className="batch-select"
                  value={item.typeOverride}
                  onChange={e => update(item.userId, { typeOverride: e.target.value, status: item.status === 'done' ? 'idle' : item.status })}
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* X Handle */}
              <div className="batch-field">
                <label className="batch-field-label">X Handle <span style={{ opacity: 0.4, fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="gen-input"
                  placeholder="@username"
                  value={item.xHandle}
                  onChange={e => update(item.userId, { xHandle: e.target.value, status: item.status === 'done' ? 'idle' : item.status })}
                  style={{ width: 140, padding: '6px 9px', fontSize: 12 }}
                />
              </div>

              {/* Actions */}
              <div className="batch-actions">
                {item.status === 'error' && (
                  <span style={{ fontSize: 10, color: '#f87171' }}>Error</span>
                )}
                {item.status === 'done' && (
                  <button className="gen-btn" onClick={() => downloadCard(item.userId)} style={{ padding: '7px 10px' }} title="Download PNG">
                    <Download size={13} />
                  </button>
                )}
                <button
                  className="gen-btn gen-btn-primary"
                  onClick={() => generateOne(item)}
                  disabled={item.status === 'loading'}
                  style={{ padding: '7px 12px', fontSize: 11, minWidth: 60 }}
                  title={item.status === 'done' ? 'Regenerate' : 'Generate'}
                >
                  {item.status === 'loading'
                    ? <span className="batch-spin">⟳</span>
                    : item.status === 'done'
                      ? <RefreshCw size={12} />
                      : 'Gen'
                  }
                </button>
                <button className="gen-btn gen-btn-ghost" onClick={() => remove(item.userId)} style={{ padding: '7px 10px' }} title="Remove">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cards grid */}
      {doneCount > 0 && (
        <div className="batch-cards-section">
          <div className="form-section" style={{ border: 'none', paddingTop: 0, marginBottom: 20 }}>
            Generated Cards ({doneCount})
          </div>
          <div className="batch-cards-grid">
            {batch.filter(b => b.status === 'done' && b.card).map(item => (
              <div key={item.userId} className="batch-card-wrap">
                <div
                  ref={el => { if (el) cardRefs.current.set(item.userId, el); else cardRefs.current.delete(item.userId); }}
                  className="gen-card-host"
                >
                  <RitualCard {...item.card!} />
                </div>
                <button className="gen-btn" onClick={() => downloadCard(item.userId)} style={{ fontSize: 11, marginTop: 4 }}>
                  <Download size={12} /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .batch-queue {
          max-width: 860px; margin: 24px auto 0; padding: 0 32px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .batch-empty {
          text-align: center; padding: 48px 0; color: #404040; font-size: 13px;
        }
        .batch-row {
          background: #121212; border: 1px solid #262626; border-radius: 12px;
          padding: 12px 14px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
        }
        .batch-avatar {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; background: #1a1a1a; object-fit: cover;
        }
        .batch-info { flex: 1; min-width: 140px; }
        .batch-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap; }
        .batch-display-name { font-size: 13px; font-weight: 700; color: #FAFAFA; }
        .batch-rarity-tag {
          font-size: 9px; font-weight: 900; padding: 1px 5px; border-radius: 3px; border: 1px solid;
        }
        .batch-contrib-role { font-size: 9px; color: #A3A3A3; }
        .batch-username { font-size: 11px; color: #A3A3A3; }
        .batch-field { display: flex; flex-direction: column; gap: 3px; flex-shrink: 0; }
        .batch-field-label {
          font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700; color: #A3A3A3;
        }
        .batch-select {
          background: #050505; border: 1px solid #262626; color: #FAFAFA;
          font-size: 12px; padding: 6px 8px; border-radius: 6px;
          outline: none; cursor: pointer; min-width: 140px;
        }
        .batch-select:focus { border-color: #FFD700; }
        .batch-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .batch-spin { display: inline-block; animation: gen-spin 0.7s linear infinite; }
        .batch-cards-section {
          max-width: 1200px; margin: 32px auto 48px; padding: 0 32px;
        }
        .batch-cards-grid {
          display: flex; flex-wrap: wrap; gap: 24px; justify-content: center;
        }
        .batch-card-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        @media (max-width: 640px) {
          .batch-queue { padding: 0 16px; }
          .batch-cards-section { padding: 0 16px; }
          .batch-row { gap: 8px; }
          .batch-field { min-width: 120px; }
        }
      `}</style>
    </div>
  );
}
