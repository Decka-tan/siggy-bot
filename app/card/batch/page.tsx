'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RitualCard, CardData } from '../RitualCard';
import { Search, X, Download, RefreshCw, Check } from 'lucide-react';

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
  typeOverride: string;
  xHandle:      string;
  card:         CardData | null;
  status:       'idle' | 'loading' | 'done' | 'error';
}

/* ── Constants ────────────────────────────────────────────────────── */
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

  // batch queue
  const [batch, setBatch]     = useState<BatchItem[]>([]);
  const [genAll, setGenAll]   = useState(false);
  const [zipping, setZipping] = useState(false);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const LS_KEY = 'ritual-members-cache-v2';
  const LS_TTL = 12 * 60 * 60 * 1000; // 12 hours

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
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.contributorRole || '').toLowerCase().includes(q)
      );
    });
  }, [allMembers, filter, generatedIds]);

  /* batch helpers */
  const inBatch  = (uid: string) => batch.some(b => b.userId === uid);
  const addMember = (m: Member) => {
    if (inBatch(m.userId)) return;
    setBatch(prev => [...prev, { ...m, typeOverride: m.type || 'builder', xHandle: '', card: null, status: 'idle' }]);
  };
  const removeMember = (uid: string) => setBatch(prev => prev.filter(b => b.userId !== uid));
  const update = (uid: string, patch: Partial<BatchItem>) =>
    setBatch(prev => prev.map(b => b.userId === uid ? { ...b, ...patch } : b));

  /* generate one card */
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

  const generateAll = async () => {
    setGenAll(true);
    for (const item of batch.filter(b => b.status !== 'done' && b.status !== 'loading')) {
      await generateOne(item);
    }
    setGenAll(false);
  };

  /* render card to PNG data-url */
  const renderCardPng = async (uid: string): Promise<string | null> => {
    const el = cardRefs.current.get(uid);
    if (!el) return null;
    try {
      el.classList.add('rc-capture');
      await new Promise(r => setTimeout(r, 60));
      const { toPng } = await import('html-to-image');
      const url = await toPng(el, { pixelRatio: 2.5, cacheBust: true, backgroundColor: 'transparent' });
      return url;
    } finally { el.classList.remove('rc-capture'); }
  };

  /* save all PNGs directly to a local folder (File System Access API) */
  const saveToFolder = async () => {
    const done = batch.filter(b => b.status === 'done' && b.card);
    if (!done.length) return;
    setZipping(true); // reuse loading state
    try {
      // @ts-ignore — File System Access API (Chrome/Edge)
      const dir = await window.showDirectoryPicker({ mode: 'readwrite' });

      for (const item of done) {
        const dataUrl = await renderCardPng(item.userId);
        if (!dataUrl) continue;
        const blob       = await (await fetch(dataUrl)).blob();
        const fileHandle = await dir.getFileHandle(`${item.username}.png`, { create: true });
        const writable   = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
    } catch (e: any) {
      // user cancelled picker or browser unsupported — fall back to individual downloads
      if (e?.name !== 'AbortError') {
        const done2 = batch.filter(b => b.status === 'done' && b.card);
        for (const item of done2) {
          const dataUrl = await renderCardPng(item.userId);
          if (!dataUrl) continue;
          const a    = document.createElement('a');
          a.href     = dataUrl;
          a.download = `${item.username}.png`;
          a.click();
          await new Promise(r => setTimeout(r, 300));
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
              {zipping ? 'Saving…' : `Save to Folder (${doneCount})`}
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
          <div className="batch-browser-header">
            <div className="gen-search-box" style={{ margin: 0 }}>
              <Search size={14} className="gen-search-icon"/>
              <input
                className="gen-search-input"
                placeholder="Filter by name or role…"
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
                : `${filtered.length} remaining${generatedIds.size > 0 ? ` · ${generatedIds.size} done` : ''}`
              }
            </div>
          </div>

          <div className="batch-member-list">
            {filtered.map(m => {
              const added = inBatch(m.userId);
              return (
                <button
                  key={m.userId}
                  className={`batch-member-row${added ? ' is-added' : ''}`}
                  onClick={() => !added && addMember(m)}
                  disabled={added}
                >
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
            Queue {batch.length > 0 && <span style={{ color: '#A3A3A3', fontWeight: 400 }}>({batch.length})</span>}
          </div>

          {batch.length === 0 ? (
            <div className="batch-empty">← Pick members from the list</div>
          ) : (
            <div className="batch-queue-list">
              {batch.map(item => (
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

                    <div className="batch-q-fields">
                      {/* Type */}
                      <div className="batch-field">
                        <label className="batch-field-label">Type</label>
                        <select
                          className="batch-select"
                          value={item.typeOverride}
                          onChange={e => update(item.userId, { typeOverride: e.target.value, status: item.status === 'done' ? 'idle' : item.status })}
                        >
                          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                        </select>
                      </div>
                      {/* X Handle */}
                      <div className="batch-field">
                        <label className="batch-field-label">X Handle</label>
                        <input
                          className="gen-input"
                          placeholder="@user"
                          value={item.xHandle}
                          onChange={e => update(item.userId, { xHandle: e.target.value, status: item.status === 'done' ? 'idle' : item.status })}
                          style={{ padding: '5px 8px', fontSize: 12 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="batch-q-actions">
                    {item.status === 'error' && <span style={{ fontSize: 9, color: '#f87171' }}>ERR</span>}
                    {item.status === 'done' && <Check size={12} style={{ color: '#40FFAF' }}/>}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generated cards — hidden off-screen for PNG capture, not visible UI clutter */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {batch.filter(b => b.status === 'done' && b.card).map(item => (
          <div
            key={item.userId}
            ref={el => { if (el) cardRefs.current.set(item.userId, el); else cardRefs.current.delete(item.userId); }}
            className="gen-card-host"
          >
            <RitualCard {...item.card!}/>
          </div>
        ))}
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
          width: 100%; background: transparent; border: none; border-bottom: 1px solid #111;
          display: flex; align-items: center; gap: 10px; padding: 9px 16px;
          cursor: pointer; text-align: left; transition: background 80ms;
        }
        .batch-member-row:hover:not(:disabled) { background: rgba(255,215,0,0.05); }
        .batch-member-row.is-added { opacity: 0.45; cursor: default; }
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
        .batch-q-actions { display: flex; flex-direction: column; gap: 4px; align-items: center; flex-shrink: 0; }
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
