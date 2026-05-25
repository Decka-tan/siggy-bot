'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { RitualCard, TYPES, RARITY_OPTIONS, CardData, Rarity } from './RitualCard';
import { Search, Download, RefreshCw, X } from 'lucide-react';

interface MemberResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  rarity: string;
  contributorRole: string | null;
  globalMessages: number;
}

const DEFAULT_CARD: CardData = {
  pfpUrl: '',
  name: 'anon.ritual',
  joinDate: 'Mar 2024',
  setNumber: '001/3890',
  type: 'builder',
  rarity: 'common',
  artist: '',
  social: '@anon',
  network: 'Ritual',
  rep: 0,
  contributions: [
    { icon: '◆', title: 'First Contribution', flavor: '' },
    { icon: '✦', title: 'Second Contribution', flavor: '' },
  ],
};

const RARITY_COLORS: Record<string, string> = {
  UR: 'text-pink-300',
  SSR: 'text-yellow-300',
  SR: 'text-purple-300',
  R: 'text-emerald-300',
  common: 'text-gray-400',
};

export default function CardGeneratorPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardData>(DEFAULT_CARD);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [xHandle, setXHandle] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/member?username=${encodeURIComponent(q)}&autocomplete=true`);
      const data = await res.json();
      setResults(data.members || []);
      setSearchOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const loadMember = async (userId: string, handle: string) => {
    setLoading(true);
    try {
      const cleanHandle = handle.replace('@', '').trim();
      const url = `/api/member?userId=${userId}${cleanHandle ? `&xHandle=${encodeURIComponent(cleanHandle)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.member) {
        const social = cleanHandle ? `@${cleanHandle}` : data.member.social;
        setCard({ ...data.member, social });
        showToast(`Loaded ${data.member.name}${cleanHandle ? ' + X data' : ''}`);
      }
    } catch {
      showToast('Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  const selectMember = async (m: MemberResult) => {
    setSearchOpen(false);
    setQuery(m.displayName);
    setSelectedUserId(m.userId);
    await loadMember(m.userId, xHandle);
  };

  const regenerate = async () => {
    if (!selectedUserId) return showToast('Select a member first');
    await loadMember(selectedUserId, xHandle);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      cardRef.current.classList.add('rc-capture');
      await new Promise((r) => setTimeout(r, 60));
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: 'transparent',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ritual-${(card.name || 'card').replace(/[^a-z0-9._-]+/gi, '_')}.png`;
      a.click();
      showToast('Card downloaded as PNG');
    } catch (err) {
      console.error(err);
      showToast('Download failed — check console');
    } finally {
      cardRef.current?.classList.remove('rc-capture');
      setDownloading(false);
    }
  };

  const update = (patch: Partial<CardData>) => setCard((c) => ({ ...c, ...patch }));
  const updateContrib = (i: number, patch: Partial<{ icon: string; title: string; flavor: string }>) =>
    setCard((c) => ({
      ...c,
      contributions: (c.contributions || []).map((row, idx) => idx === i ? { ...row, ...patch } : row),
    }));

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setSearchOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="gen-root">
      <div className="page-grain"/>

      <div className="gen-header">
        <div className="gen-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#FFD700" strokeWidth="1.5"/>
            <path d="M12 5l6 11H6l6-11z" stroke="#FFD700" strokeWidth="1.5"/>
            <circle cx="12" cy="13" r="1.6" fill="#FFD700"/>
          </svg>
          <div>
            <div className="gen-brand-name">Ritual Card Generator</div>
            <div className="gen-brand-sub">Search a member · get their card</div>
          </div>
        </div>
        <div className="gen-header-actions">
          <button className="gen-btn gen-btn-ghost" onClick={() => { setCard(DEFAULT_CARD); setQuery(''); }}>
            <RefreshCw size={13}/> Reset
          </button>
          <button
            className="gen-btn gen-btn-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={13}/>
            {downloading ? 'Saving...' : 'Download PNG'}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="gen-search-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="gen-search-box">
          <Search size={16} className="gen-search-icon"/>
          <input
            className="gen-search-input"
            placeholder="Search Ritual member by username…"
            value={query}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setSearchOpen(true)}
          />
          {loading && <div className="gen-search-spinner"/>}
          {query && (
            <button className="gen-search-clear" onClick={() => { setQuery(''); setResults([]); setSearchOpen(false); }}>
              <X size={14}/>
            </button>
          )}
        </div>

        {searchOpen && results.length > 0 && (
          <div className="gen-search-dropdown">
            {results.map((m) => (
              <button key={m.userId} className="gen-search-item" onClick={() => selectMember(m)}>
                <img
                  src={m.avatarUrl}
                  alt=""
                  className="gen-search-avatar"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="gen-search-info">
                  <span className="gen-search-name">{m.displayName}</span>
                  <span className="gen-search-meta">@{m.username} · {m.globalMessages.toLocaleString()} msgs</span>
                </div>
                {m.contributorRole && (
                  <span className={`gen-search-role ${RARITY_COLORS[m.rarity] || 'text-gray-400'}`}>
                    {m.contributorRole}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="gen-workspace">
        {/* Preview */}
        <section className="gen-preview">
          <div className="gen-preview-card-wrap">
            <div ref={cardRef} className="gen-card-host">
              <RitualCard {...card}/>
            </div>
          </div>
          <div className="gen-preview-meta">
            <span className="gen-chip">{card.rarity ? (card.rarity === 'common' ? 'Common' : card.rarity) : 'Common'}</span>
            <span className="gen-chip">{TYPES[card.type || 'builder']?.label}</span>
            <span className="gen-chip gen-chip-mute">{card.setNumber}</span>
          </div>
        </section>

        {/* Form */}
        <aside className="gen-form">
          <div className="form-stack">
            <div className="form-section">Identity</div>

            <label className="gen-field">
              <span className="gen-field-label">Display name</span>
              <input className="gen-input" value={card.name || ''} onChange={(e) => update({ name: e.target.value })} placeholder="0xtako.eth"/>
            </label>

            <div className="field-row">
              <label className="gen-field">
                <span className="gen-field-label">Joined</span>
                <input className="gen-input" value={card.joinDate || ''} onChange={(e) => update({ joinDate: e.target.value })} placeholder="Mar 2024"/>
              </label>
              <label className="gen-field">
                <span className="gen-field-label">Set #</span>
                <input className="gen-input" value={card.setNumber || ''} onChange={(e) => update({ setNumber: e.target.value })} placeholder="001/3890"/>
              </label>
            </div>

            <div className="form-section">Type &amp; Rarity</div>

            <label className="gen-field">
              <span className="gen-field-label">Type</span>
              <div className="seg-grid">
                {Object.entries(TYPES).map(([tp, info]) => (
                  <button
                    key={tp}
                    className={`seg-cell ${card.type === tp ? 'is-active' : ''}`}
                    onClick={() => update({ type: tp })}
                    style={{ '--seg-accent': info.color } as React.CSSProperties}
                  >
                    <span className="seg-dot" style={{ background: info.color }}/>
                    {info.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="gen-field">
              <span className="gen-field-label">Rarity</span>
              <div className="seg-row">
                {RARITY_OPTIONS.map((r) => (
                  <button
                    key={r}
                    className={`seg-pill rar-${r.toLowerCase()} ${card.rarity === r ? 'is-active' : ''}`}
                    onClick={() => update({ rarity: r })}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </label>

            <div className="form-section">Contributions</div>
            {(card.contributions || []).map((row, i) => (
              <div key={i} className="contrib-block">
                <div className="contrib-block-label">#{i + 1}</div>
                <input
                  className="gen-input"
                  placeholder={`Title ${i + 1}`}
                  value={row.title || ''}
                  onChange={(e) => updateContrib(i, { title: e.target.value })}
                />
                <input
                  className="gen-input gen-input-sm"
                  placeholder="Flavor text (optional)"
                  value={row.flavor || ''}
                  onChange={(e) => updateContrib(i, { flavor: e.target.value })}
                />
              </div>
            ))}

            <div className="form-section">X / Twitter</div>
            <div className="gen-field">
              <span className="gen-field-label">X handle <span style={{ opacity: 0.4, fontWeight: 400 }}>(optional — improves contributions)</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="gen-input"
                  placeholder="@username"
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="gen-btn"
                  onClick={regenerate}
                  disabled={loading || !selectedUserId}
                  title="Regenerate contributions with X data"
                  style={{ flexShrink: 0, padding: '9px 12px' }}
                >
                  <RefreshCw size={13}/> Regen
                </button>
              </div>
            </div>

            <div className="form-section">Metadata</div>
            <div className="field-row">
              <label className="gen-field">
                <span className="gen-field-label">Network</span>
                <input className="gen-input" value={card.network || ''} onChange={(e) => update({ network: e.target.value })}/>
              </label>
              <label className="gen-field">
                <span className="gen-field-label">Social</span>
                <input className="gen-input" value={card.social || ''} onChange={(e) => update({ social: e.target.value })}/>
              </label>
            </div>
            <label className="gen-field">
              <span className="gen-field-label">PFP credit</span>
              <input className="gen-input" value={card.artist || ''} placeholder="self" onChange={(e) => update({ artist: e.target.value })}/>
            </label>
          </div>
        </aside>
      </main>

      {toast && <div className="gen-toast">{toast}</div>}
    </div>
  );
}
