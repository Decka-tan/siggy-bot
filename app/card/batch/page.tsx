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
  forceUpload?:   boolean;               // bypass manifest-already-uploaded check
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
  'Forerunner',
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
  'Forerunner':        'Forerunner',
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
const R2_WORKER_BASE = 'https://ritual-tcg.artelamon.workers.dev';
const R2_PUBLIC_BASE = 'https://pub-6e7d7fa0c27b4a9aa07575fad91eaeac.r2.dev';
const ASSUMED_R2_UPLOADED_ROLES = new Set([
  'Foundation Team',
  'Mods',
  'Moderator',
  'Radiant Ritualist',
  'Event Manager',
  'Zealot',
  'Siggy Architect',
  'Siggy Soulsmith',
]);

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
  const [autoUploadPending, setAutoUploadPending] = useState(false);
  const [zipping, setZipping]       = useState(false);
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null);
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'done' | 'error'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('');
  const [browserTab, setBrowserTab] = useState<'remaining' | 'uploaded'>('remaining');

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const LS_KEY   = 'ritual-members-cache-v2';
  const LS_TTL   = 12 * 60 * 60 * 1000;
  const QUEUE_KEY = 'ritual-batch-queue-v1';
  const TYPE_MEMORY_KEY = 'ritual-batch-type-memory-v1';
  const [uploadedCards, setUploadedCards] = useState<any[]>([]);

  const getTypeMemory = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(TYPE_MEMORY_KEY) || '{}'); } catch { return {}; }
  };
  const rememberType = (userId: string, type: string) => {
    try { localStorage.setItem(TYPE_MEMORY_KEY, JSON.stringify({ ...getTypeMemory(), [userId]: type })); } catch {}
  };

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const manifestRes = await fetch(`${R2_WORKER_BASE}/api/cards?t=${Date.now()}`);
        const merged = new Map<string, any>();
        if (manifestRes.ok) {
          const data = await manifestRes.json();
          for (const card of Array.isArray(data.cards) ? data.cards : []) {
            merged.set(`${card.roleSlug || 'contributor'}/${card.username}_${card.rarity}`.toLowerCase(), card);
          }
        }
        if (!cancelled) setUploadedCards(Array.from(merged.values()));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Restore queue from localStorage on mount — wait for allMembers to be available
  const queueRestoredRef = useRef(false);
  useEffect(() => {
    if (queueRestoredRef.current || allMembers.length === 0) return;
    queueRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      // Support both slim format { userId, status, typeOverride, xHandle }
      // and legacy full format (older saves)
      const saved: Array<{ userId: string; status: string; typeOverride?: string; xHandle?: string } & Partial<Member>> = JSON.parse(raw);
      if (!Array.isArray(saved) || saved.length === 0) return;

      const memberMap = new Map(allMembers.map(m => [m.userId, m]));
      const restored: BatchItem[] = saved.map(s => {
        const m = memberMap.get(s.userId) ?? (s as unknown as Member);
        return {
          ...m,
          typeOverride: s.typeOverride ?? m.type ?? deriveTypeFromRoles(m.roles ?? []),
          xHandle:      s.xHandle ?? '',
          card:         null,
          allRarityCards: null,
          status:       (s.status === 'done' || s.status === 'error') ? s.status : 'idle',
        } as BatchItem;
      }).filter(b => b.userId);

      if (restored.length > 0) setBatch(restored);
    } catch {}
  }, [allMembers]); // re-run once allMembers loads

  // Persist queue — save only slim fields to avoid localStorage quota issues
  useEffect(() => {
    if (batch.length === 0) return;
    try {
      const slim = batch.map(b => ({
        userId:       b.userId,
        username:     b.username,       // keep for display before allMembers loads
        displayName:  b.displayName,
        rarity:       b.rarity,
        status:       b.status === 'loading' ? 'idle' : b.status,
        typeOverride: b.typeOverride,
        xHandle:      b.xHandle,
      }));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(slim));
    } catch (e) {
      // Quota exceeded — try saving without displayName/username to save space
      try {
        const minimal = batch.map(b => ({
          userId:      b.userId,
          status:      b.status === 'loading' ? 'idle' : b.status,
          typeOverride: b.typeOverride,
          xHandle:     b.xHandle,
        }));
        localStorage.setItem(QUEUE_KEY, JSON.stringify(minimal));
      } catch {}
    }
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
  // Only trust the live manifest — ASSUMED_R2_UPLOADED_ROLES is NOT used to block anymore
  // (it caused members to be un-re-generatable even when missing from manifest)
  const uploadedUsernames = useMemo(
    () => new Set(uploadedCards.map(c => String(c.username || '').toLowerCase()).filter(Boolean)),
    [uploadedCards],
  );
  const uploadedKeys = useMemo(
    () => new Set(uploadedCards.map(c => `${c.roleSlug || 'contributor'}/${c.username}_${c.rarity}`.toLowerCase())),
    [uploadedCards],
  );

  /* filtered list — exclude already-generated members */
  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return allMembers.filter(m => {
      if (generatedIds.has(m.userId)) return false;
      if (uploadedUsernames.has(String(m.username || '').toLowerCase())) return false;
      if (filterType && !m.roles.includes(filterType)) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.contributorRole || '').toLowerCase().includes(q)
      );
    });
  }, [allMembers, filter, filterType, generatedIds, uploadedUsernames]);

  const uploadedFiltered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return allMembers.filter(m => {
      if (!uploadedUsernames.has(String(m.username || '').toLowerCase())) return false;
      if (filterType && !m.roles.includes(filterType)) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.contributorRole || '').toLowerCase().includes(q)
      );
    });
  }, [allMembers, filter, filterType, uploadedUsernames]);

  const activeMembers = browserTab === 'uploaded' ? uploadedFiltered : filtered;

  /* multi-select */
  const toggleSelect = (uid: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });
  const addSelected = () => {
    filtered.filter(m => selectedIds.has(m.userId) && !inBatch(m.userId)).forEach(m => addMember(m));
    setSelectedIds(new Set());
  };

  /* selectable members in the current filtered view (not yet in batch) */
  const selectableFiltered = useMemo(
    () => filtered.filter(m => !batch.some(b => b.userId === m.userId)),
    [filtered, batch],
  );
  const allFilteredSelected = useMemo(
    () => selectableFiltered.length > 0 && selectableFiltered.every(m => selectedIds.has(m.userId)),
    [selectableFiltered, selectedIds],
  );

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
    // Forerunner and bitty — randomized: 40% yapper, 40% threadoor, 10% artist, 10% builder
    const rand = Math.random();
    if (rand < 0.40) return 'yapper';
    if (rand < 0.80) return 'threadoor';
    if (rand < 0.90) return 'artist';
    return 'builder';
  };

  const addMember = (m: Member, force = false) => {
    if (inBatch(m.userId)) return;
    if (!force && uploadedUsernames.has(String(m.username || '').toLowerCase())) return;
    const remembered = getTypeMemory()[m.userId];
    // If force-adding from Uploaded tab, try to recover type from manifest
    const manifestType = force
      ? uploadedCards.find(c => String(c.username || '').toLowerCase() === String(m.username || '').toLowerCase())?.type ?? null
      : null;
    const typeOverride = remembered || manifestType || m.type || deriveTypeFromRoles(m.roles || []);
    setBatch(prev => [...prev, { ...m, typeOverride, xHandle: '', card: null, allRarityCards: null, status: 'idle', forceUpload: force }]);
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
        // use fresh rarity from API, not stale cache in item.rarity
        const freshRarity = base.rarity || item.rarity;
        const startIdx = RARITIES_ORDERED.indexOf(freshRarity as typeof RARITIES_ORDERED[number]);
        const applicableRarities = RARITIES_ORDERED.slice(startIdx >= 0 ? startIdx : 0);
        const allRarityCards: CardData[] = applicableRarities.map(rar => {
          const { rep, atk, def, spd } = computeStats(days, roleRank, rar);
          return { ...baseCard, rarity: rar, rep, atk, def, spd };
        });
        update(item.userId, { status: 'done', rarity: freshRarity, roleRank, card: allRarityCards[0], allRarityCards });
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
    // Flag auto-upload — fires via useEffect with fresh closures (avoids stale batch closure)
    setAutoUploadPending(true);
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

  /* render card to PNG — fontEmbedCSS pre-fetched once and passed in to avoid per-card font fetching */
  const renderCardPng = async (key: string, fontEmbedCSS: string): Promise<string | null> => {
    const el = cardRefs.current.get(key);
    if (!el) return null;
    try {
      el.classList.add('rc-capture');
      await waitForImages(el);
      // Use setTimeout instead of requestAnimationFrame so upload continues when tab is hidden
      await new Promise(r => setTimeout(r, 60));
      const { toPng } = await import('html-to-image');
      const url = await toPng(el, {
        pixelRatio: 2.5,
        cacheBust: false,
        backgroundColor: 'transparent',
        fontEmbedCSS,
      });
      return url;
    } catch { return null; }
    finally { el.classList.remove('rc-capture'); }
  };

  /* save all PNGs — one file per rarity variant, e.g. claire3653_UR.png */
  const saveToFolder = async () => {
    const done = batch.filter(b => b.status === 'done' && b.allRarityCards?.length);
    if (!done.length) return;
    setZipping(true);
    try {
      // Pre-fetch font CSS once — reused for every card so toPng never re-fetches fonts
      const { getFontEmbedCSS, toPng } = await import('html-to-image');
      const firstKey = `${done[0].userId}-${done[0].allRarityCards![0].rarity}`;
      const firstEl  = cardRefs.current.get(firstKey);
      const fontEmbedCSS = firstEl ? await getFontEmbedCSS(firstEl).catch(() => '') : '';

      const capture = async (item: BatchItem) => {
        const results: { name: string; dataUrl: string }[] = [];
        for (const cardData of item.allRarityCards!) {
          const key    = `${item.userId}-${cardData.rarity}`;
          const dataUrl = await renderCardPng(key, fontEmbedCSS);
          if (dataUrl) results.push({ name: `${item.username}_${cardData.rarity}.png`, dataUrl });
        }
        return results;
      };

      try {
        // @ts-ignore — File System Access API (Chrome/Edge)
        const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
        for (const item of done) {
          for (const { name, dataUrl } of await capture(item)) {
            const blob     = await (await fetch(dataUrl)).blob();
            const handle   = await dir.getFileHandle(name, { create: true });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
          }
        }
      } catch (e: any) {
        if ((e as any)?.name === 'AbortError') return; // user cancelled picker
        // Fallback: trigger individual <a> downloads
        for (const item of done) {
          for (const { name, dataUrl } of await capture(item)) {
            const a    = document.createElement('a');
            a.href     = dataUrl;
            a.download = name;
            a.click();
            await new Promise(r => setTimeout(r, 150));
          }
        }
      }
    } finally { setZipping(false); }
  };

  /* ── R2 upload state ─────────────────────────────────────────────── */
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadResults, setUploadResults]   = useState<{ ok: number; fail: number } | null>(null);

  // Auto-upload: runs after generateAll sets the flag, with the latest batch in scope
  // Must be declared after `uploading` to avoid "used before declaration" TS error
  useEffect(() => {
    if (!autoUploadPending || genAll || uploading) return;
    setAutoUploadPending(false);
    uploadToR2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUploadPending, genAll, uploading]);

  /* role → folder slug: Foundation Team → foundation-team */
  const toRoleSlug = (roles: string[]): string => {
    if (roles.includes('Foundation Team'))   return 'foundation-team';
    if (roles.some(r => r === 'Mods'))       return 'mods';
    if (roles.includes('Event Manager'))     return 'event-manager';
    if (roles.includes('Radiant Ritualist')) return 'radiant-ritualist';
    if (roles.includes('Zealot'))            return 'zealot';
    if (roles.includes('Ritualist'))         return 'ritualist';
    if (roles.includes('Siggy Soulsmith'))   return 'soulsmith';
    if (roles.includes('Siggy Architect'))   return 'architect';
    if (roles.includes('Mage'))              return 'mage';
    if (roles.includes('ritty'))             return 'ritty';
    if (roles.includes('bitty'))             return 'bitty';
    return 'contributor';
  };

  const uploadToR2 = async () => {
    const done = batch.filter(b => b.status === 'done' && b.allRarityCards?.length);
    if (!done.length) return;
    setUploading(true);
    setUploadResults(null);

    const { getFontEmbedCSS } = await import('html-to-image');
    const firstKey = `${done[0].userId}-${done[0].allRarityCards![0].rarity}`;
    const firstEl  = cardRefs.current.get(firstKey);
    const fontEmbedCSS = firstEl ? await getFontEmbedCSS(firstEl).catch(() => '') : '';

    // e.g. cards/foundation-team/artelamon_UR.png
    const tasks: { itemUsername: string; userId: string; rarity: string; roleSlug: string; key: string; forceUpload: boolean }[] = [];
    for (const item of done) {
      const roleSlug = toRoleSlug(item.roles || []);
      for (const cardData of item.allRarityCards!) {
        const uploadKey = `${roleSlug}/${item.username}_${cardData.rarity}`.toLowerCase();
        if (!item.forceUpload && (uploadedUsernames.has(String(item.username || '').toLowerCase()) || uploadedKeys.has(uploadKey))) continue;
        tasks.push({
          itemUsername: item.username,
          userId:       item.userId,
          rarity:       cardData.rarity,
          roleSlug,
          key: `cards/${roleSlug}/${item.username}_${cardData.rarity}.png`,
          forceUpload:  !!item.forceUpload,
        });
      }
    }

    if (tasks.length === 0) {
      setUploading(false);
      setUploadProgress(null);
      setUploadResults({ ok: 0, fail: 0 });
      return;
    }

    setUploadProgress({ current: 0, total: tasks.length });
    let ok = 0, fail = 0;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const cardKey = `${t.userId}-${t.rarity}`;
      try {
        const dataUrl = await renderCardPng(cardKey, fontEmbedCSS);
        if (!dataUrl) {
          console.warn(`[R2] renderCardPng returned null for key=${cardKey} (el exists: ${!!cardRefs.current.get(cardKey)})`);
          fail++; continue;
        }

        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${t.itemUsername}_${t.rarity}.png`, { type: 'image/png' });

        const form = new FormData();
        form.append('file', file);
        form.append('key', t.key);

        const res = await fetch('/api/upload-cards', { method: 'POST', body: form });
        const data = await res.json();
        if (data.ok) {
          ok++;
        } else {
          console.error(`[R2] upload failed for ${t.key}:`, data);
          fail++;
        }
      } catch (e) {
        console.error(`[R2] exception for ${t.key}:`, e);
        fail++;
      }

      setUploadProgress({ current: i + 1, total: tasks.length });
    }

    // Build + upload manifest.json
    // ALWAYS re-fetch live manifest right before merge so concurrent sessions don't clobber each other
    if (ok > 0) {
      try {
        // Fresh fetch — bypass KV cache with unique timestamp
        let liveCards: any[] = [];
        try {
          const liveRes = await fetch(`${R2_WORKER_BASE}/api/cards?_bust=${Date.now()}`, { cache: 'no-store' });
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            liveCards = Array.isArray(liveData.cards) ? liveData.cards : [];
          }
        } catch (e) { console.warn('manifest live-fetch failed, falling back to state', e); liveCards = uploadedCards; }

        const fresh = done.flatMap(item => {
          const roleSlug = toRoleSlug(item.roles || []);
          return item.allRarityCards!.map(cardData => ({
            userId:          item.userId,
            username:        item.username,
            displayName:     item.displayName,
            rarity:          cardData.rarity,
            contributorRole: item.contributorRole ?? null,
            roleSlug,
            roles:           item.roles,
            rep:             cardData.rep,
            type:            item.typeOverride || item.type || null,
            url: `${R2_PUBLIC_BASE}/cards/${roleSlug}/${item.username}_${cardData.rarity}.png`,
          }));
        });
        const mergedMap = new Map<string, any>();
        // Base: live manifest (most up-to-date)
        for (const c of liveCards) mergedMap.set(`${c.roleSlug || 'contributor'}/${c.username}_${c.rarity}`.toLowerCase(), c);
        // Override with freshly-uploaded cards
        for (const c of fresh) mergedMap.set(`${c.roleSlug || 'contributor'}/${c.username}_${c.rarity}`.toLowerCase(), c);
        const manifest = {
          updatedAt: Date.now(),
          cards: Array.from(mergedMap.values()),
        };
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const manifestFile = new File([manifestBlob], 'manifest.json', { type: 'application/json' });
        const form = new FormData();
        form.append('file', manifestFile);
        form.append('key', 'manifest.json');
        await fetch('/api/upload-cards', { method: 'POST', body: form });
        // Update local state to match
        setUploadedCards(Array.from(mergedMap.values()));
      } catch (e) { console.warn('manifest upload failed', e); }
    }

    setUploading(false);
    setUploadProgress(null);
    setUploadResults({ ok, fail });
  };

  const doneCount = batch.filter(b => b.status === 'done').length;

  /* ── Repair Manifest — list R2 bucket and rebuild from actual files ── */
  const [repairState, setRepairState] = useState<'idle' | 'listing' | 'fetching' | 'uploading' | 'done' | 'error'>('idle');
  const [repairLog,   setRepairLog]   = useState<string[]>([]);

  const repairManifest = async () => {
    setRepairState('listing');
    setRepairLog(['Listing R2 bucket…']);
    try {
      // 1. List all PNGs from R2
      const listRes = await fetch('/api/upload-cards/list?prefix=cards/');
      if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`);
      const listData = await listRes.json();
      const r2Files: { key: string; roleSlug: string; username: string; rarity: string; url: string }[] = listData.cards ?? [];
      setRepairLog(p => [...p, `Found ${r2Files.length} PNG files in R2`]);

      // 2. Fetch current live manifest as base
      setRepairState('fetching');
      setRepairLog(p => [...p, 'Fetching current live manifest…']);
      let liveCards: any[] = [];
      try {
        const liveRes = await fetch(`${R2_WORKER_BASE}/api/cards?_bust=${Date.now()}`, { cache: 'no-store' });
        if (liveRes.ok) liveCards = (await liveRes.json()).cards ?? [];
      } catch {}
      setRepairLog(p => [...p, `Live manifest has ${liveCards.length} cards`]);

      // 3. Build merged manifest — live cards are base, R2 listing fills in any missing entries
      const mergedMap = new Map<string, any>();
      // Seed from live manifest first
      for (const c of liveCards) {
        mergedMap.set(`${c.roleSlug || 'contributor'}/${c.username}_${c.rarity}`.toLowerCase(), c);
      }
      // For R2 files not yet in manifest, create stub entries from allMembers data
      const memberByUsername = new Map(allMembers.map(m => [m.username.toLowerCase(), m]));
      let recovered = 0;
      for (const f of r2Files) {
        const mapKey = `${f.roleSlug}/${f.username}_${f.rarity}`.toLowerCase();
        if (!mergedMap.has(mapKey)) {
          // Try to find member data from loaded members list
          const m = memberByUsername.get(f.username.toLowerCase());
          mergedMap.set(mapKey, {
            userId:          m?.userId ?? f.username,
            username:        f.username,
            displayName:     m?.displayName ?? f.username,
            rarity:          f.rarity,
            contributorRole: m?.contributorRole ?? null,
            roleSlug:        f.roleSlug,
            roles:           m?.roles ?? [],
            rep:             0,
            url:             f.url,
          });
          recovered++;
        }
      }
      setRepairLog(p => [...p, `Recovered ${recovered} missing entries · total now ${mergedMap.size}`]);

      // 4. Upload rebuilt manifest
      setRepairState('uploading');
      setRepairLog(p => [...p, 'Uploading repaired manifest.json…']);
      const manifest = { updatedAt: Date.now(), cards: Array.from(mergedMap.values()) };
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const file = new File([blob], 'manifest.json', { type: 'application/json' });
      const form = new FormData();
      form.append('file', file);
      form.append('key', 'manifest.json');
      const upRes = await fetch('/api/upload-cards', { method: 'POST', body: form });
      if (!upRes.ok) throw new Error(`Upload failed: ${upRes.status}`);

      setUploadedCards(Array.from(mergedMap.values()));
      setRepairLog(p => [...p, `✓ Manifest repaired! ${mergedMap.size} total cards`]);
      setRepairState('done');
    } catch (e) {
      setRepairLog(p => [...p, `✗ Error: ${String(e)}`]);
      setRepairState('error');
    }
  };

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
            <button className="gen-btn" onClick={saveToFolder} disabled={zipping || uploading}>
              <Download size={13}/>
              {zipping ? 'Saving…' : `Save to Folder (${batch.filter(b=>b.status==='done').reduce((s,b)=>s+(b.allRarityCards?.length??1),0)} files)`}
            </button>
          )}
          {doneCount > 0 && (
            <button
              className="gen-btn gen-btn-r2"
              onClick={uploadToR2}
              disabled={uploading || zipping || genAll}
              title="Re-upload manually if auto-upload failed"
            >
              {uploading
                ? <><span className="batch-spin">⟳</span> {uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : 'Uploading…'}</>
                : uploadResults
                  ? <>{uploadResults.fail === 0 ? '✓' : '⚠'} {uploadResults.ok} ok{uploadResults.fail > 0 ? ` · ${uploadResults.fail} failed` : ''}</>
                  : <>☁ Re-upload ({batch.filter(b=>b.status==='done').reduce((s,b)=>s+(b.allRarityCards?.length??1),0)})</>
              }
            </button>
          )}
          {batch.some(b => b.status !== 'done') && (
            <button
              className="gen-btn gen-btn-primary"
              onClick={generateAll}
              disabled={genAll || uploading || batch.length === 0}
            >
              {genAll
                ? <><span className="batch-spin">⟳</span> {genProgress ? `${genProgress.current}/${genProgress.total}` : 'Generating…'}</>
                : '⚡ Generate + Upload'
              }
            </button>
          )}
          {/* Repair manifest — recover missing entries from actual R2 files */}
          <button
            className="gen-btn gen-btn-repair"
            onClick={repairManifest}
            disabled={repairState === 'listing' || repairState === 'fetching' || repairState === 'uploading' || uploading}
            title="List all R2 PNGs and rebuild manifest (recovers cards lost from manifest)"
          >
            {repairState === 'idle' || repairState === 'done' || repairState === 'error'
              ? '🛠 Repair Manifest'
              : <><span className="batch-spin">⟳</span> {repairState === 'listing' ? 'Listing R2…' : repairState === 'fetching' ? 'Fetching…' : 'Uploading…'}</>
            }
          </button>
        </div>
      </div>
      {/* Repair log */}
      {repairLog.length > 0 && (
        <div className="repair-log">
          {repairLog.map((line, i) => (
            <div key={i} className={line.startsWith('✓') ? 'repair-log-ok' : line.startsWith('✗') ? 'repair-log-err' : ''}>{line}</div>
          ))}
          {(repairState === 'done' || repairState === 'error') && (
            <button className="repair-log-close" onClick={() => { setRepairLog([]); setRepairState('idle'); }}>Dismiss</button>
          )}
        </div>
      )}

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
                  const uploaded = uploadedUsernames.has(String(m.username || '').toLowerCase());
                  return (
                    <button
                      key={m.userId}
                      className={`batch-search-result${uploaded ? ' is-uploaded' : ''}`}
                      onClick={() => !added && !uploaded && addFromSearch(m)}
                      disabled={added || uploaded}
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
                        {uploaded
                          ? <span className="batch-uploaded-pill">R2</span>
                          : added
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
            <div className="batch-browser-tabs">
              <button
                className={`batch-browser-tab${browserTab === 'remaining' ? ' active' : ''}`}
                onClick={() => setBrowserTab('remaining')}
              >
                Remaining <b>{filtered.length}</b>
              </button>
              <button
                className={`batch-browser-tab uploaded${browserTab === 'uploaded' ? ' active' : ''}`}
                onClick={() => {
                  setBrowserTab('uploaded');
                  setSelectedIds(new Set());
                }}
              >
                Uploaded to R2 <b>{uploadedFiltered.length}</b>
              </button>
            </div>
            {/* Role filter chips */}
            <div className="batch-type-chips">
              <button
                className={`batch-type-chip${!filterType ? ' active' : ''}`}
                onClick={() => setFilterType('')}
              >All</button>
              {ROLE_FILTER_OPTIONS.map(r => {
                const roleMembers = allMembers.filter(m =>
                  m.roles.includes(r) &&
                  !batch.some(b => b.userId === m.userId) &&
                  !uploadedUsernames.has(String(m.username || '').toLowerCase())
                );
                return (
                  <span key={r} className="batch-chip-wrap">
                    <button
                      className={`batch-type-chip${filterType === r ? ' active' : ''}`}
                      onClick={() => setFilterType(prev => prev === r ? '' : r)}
                      title={r}
                    >
                      {ROLE_FILTER_LABELS[r]}
                    </button>
                    {browserTab === 'remaining' && roleMembers.length > 0 && (
                      <button
                        className="batch-chip-add"
                        title={`Add all ${r} (${roleMembers.length})`}
                        onClick={() => roleMembers.forEach(m => addMember(m))}
                      >+{roleMembers.length}</button>
                    )}
                  </span>
                );
              })}
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
                    <span>{browserTab === 'uploaded' ? `${uploadedFiltered.length} uploaded to R2` : `${filtered.length} remaining`}{generatedIds.size > 0 ? ` · ${generatedIds.size} done` : ''}</span>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
                      {browserTab === 'remaining' && selectableFiltered.length > 0 && (
                        <button
                          className="gen-btn gen-btn-ghost"
                          onClick={() => setSelectedIds(
                            allFilteredSelected
                              ? new Set()
                              : new Set(selectableFiltered.map(m => m.userId))
                          )}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          {allFilteredSelected ? 'Deselect All' : `Select All (${selectableFiltered.length})`}
                        </button>
                      )}
                      {browserTab === 'remaining' && selectedIds.size > 0 && (
                        <button className="gen-btn gen-btn-primary" onClick={addSelected}
                          style={{ padding: '3px 8px', fontSize: 11 }}>
                          + Add {selectedIds.size}
                        </button>
                      )}
                      {browserTab === 'uploaded' && uploadedFiltered.length > 0 && (
                        <button
                          className="gen-btn gen-btn-repair"
                          title="Force re-add ALL uploaded members to batch for re-generation"
                          onClick={() => uploadedFiltered.filter(m => !inBatch(m.userId)).forEach(m => addMember(m, true))}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          ↺ Re-gen All ({uploadedFiltered.filter(m => !inBatch(m.userId)).length})
                        </button>
                      )}
                    </div>
                  </>
              }
            </div>
          </div>

          <div className="batch-member-list">
            {activeMembers.map(m => {
              const added    = inBatch(m.userId);
              const selected = selectedIds.has(m.userId);
              const uploaded = uploadedUsernames.has(String(m.username || '').toLowerCase());
              const isUploadedTab = browserTab === 'uploaded';
              return (
                <div key={m.userId} className={`batch-member-row${added ? ' is-added' : ''}${selected ? ' is-selected' : ''}${uploaded ? ' is-uploaded' : ''}`}>
                  {!added && !uploaded && (
                    <input type="checkbox" className="batch-cb" checked={selected}
                      onChange={() => toggleSelect(m.userId)}
                      onClick={e => e.stopPropagation()}/>
                  )}
                  <button
                    className="batch-member-btn"
                    onClick={() => {
                      if (added) return;
                      if (isUploadedTab) addMember(m, true); // force re-add from uploaded tab
                      else if (!uploaded) addMember(m);
                    }}
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
                        : isUploadedTab
                        ? <span className="batch-regen-btn" title="Force re-generate">↺</span>
                        : uploaded
                        ? <span className="batch-uploaded-pill">R2</span>
                        : <span className="batch-member-add">+</span>
                      }
                    </div>
                  </button>
                </div>
              );
            })}
            {listLoaded && activeMembers.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#404040', fontSize: 12 }}>
                {browserTab === 'uploaded' ? 'No uploaded R2 cards found' : 'No contributors found'}
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
                    onClick={() => setBatch(prev => prev.map(b => {
                      if (b.status === 'done') return b;
                      rememberType(b.userId, t);
                      return { ...b, typeOverride: t };
                    }))}
                  >
                    {TYPE_LABELS[t].replace('Event ', 'Ev.')}
                  </button>
                ))}
              </div>
              {/* Progress bar — generate phase */}
              {genProgress && (
                <div className="batch-progress">
                  <div className="batch-progress-bar" style={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}/>
                  <span className="batch-progress-label">⚡ {genProgress.current} / {genProgress.total} generated</span>
                </div>
              )}
              {/* Progress bar — upload phase */}
              {!genProgress && uploadProgress && (
                <div className="batch-progress">
                  <div className="batch-progress-bar" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, background: 'linear-gradient(90deg, #f77f00, #ffaa44)' }}/>
                  <span className="batch-progress-label">☁ {uploadProgress.current} / {uploadProgress.total} uploading</span>
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
                          onClick={() => {
                            rememberType(item.userId, t);
                            update(item.userId, { typeOverride: t, status: item.status === 'done' ? 'idle' : item.status });
                          }}
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

      {/* Hidden cards — off-viewport, fixed so they never affect page layout or scrollbar */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
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
        .batch-search-result.is-uploaded { background: rgba(64,255,175,0.03); }
        .batch-browser-header {
          padding: 12px 16px; border-bottom: 1px solid #1a1a1a;
          display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
        }
        .batch-browser-tabs {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
        }
        .batch-browser-tab {
          border: 1px solid #262626; background: #0F0F0F; color: #8A8A8A;
          border-radius: 5px; padding: 8px 10px; cursor: pointer;
          font-size: 10px; font-weight: 900; letter-spacing: 0.08em;
          text-transform: uppercase; display: flex; justify-content: space-between;
          align-items: center; gap: 8px;
        }
        .batch-browser-tab b {
          color: #FAFAFA; background: #1E1E1E; border-radius: 3px;
          min-width: 22px; padding: 2px 5px; text-align: center;
        }
        .batch-browser-tab.active {
          border-color: #FFD700; color: #FFD700; background: rgba(255,215,0,0.08);
        }
        .batch-browser-tab.uploaded.active {
          border-color: #40FFAF; color: #40FFAF; background: rgba(64,255,175,0.08);
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
        .batch-member-row.is-uploaded { opacity: 0.7; background: rgba(64,255,175,0.025); }
        .batch-member-row.is-uploaded:hover { background: rgba(64,255,175,0.04); }
        .batch-member-row.is-selected { background: rgba(255,215,0,0.08); }
        .batch-uploaded-pill {
          font-size: 8px; line-height: 1; font-weight: 900; letter-spacing: 0.08em;
          color: #40FFAF; border: 1px solid rgba(64,255,175,0.45);
          background: rgba(64,255,175,0.08); border-radius: 3px; padding: 3px 5px;
        }
        .batch-regen-btn {
          font-size: 14px; line-height: 1; color: #f77f00;
          opacity: 0.7; transition: opacity 100ms;
        }
        .batch-member-row.is-uploaded:hover .batch-regen-btn { opacity: 1; }
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
        .batch-chip-wrap {
          display: inline-flex; align-items: center; gap: 1px;
        }
        .batch-type-chip {
          background: #0e0e0e; border: 1px solid #222; border-radius: 4px;
          color: #666; font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
          padding: 3px 6px; cursor: pointer; transition: all 100ms; white-space: nowrap;
        }
        .batch-type-chip:hover { background: #1a1a1a; color: #ccc; border-color: #444; }
        .batch-type-chip.active { background: rgba(255,215,0,0.14); border-color: #FFD700; color: #FFD700; }
        .batch-type-chip-sm { font-size: 8px; padding: 2px 5px; }
        .batch-chip-add {
          background: #0e0e0e; border: 1px solid #222; border-left: none;
          border-radius: 0 4px 4px 0; color: #40FFAF;
          font-size: 8px; font-weight: 800; letter-spacing: 0.02em;
          padding: 3px 5px; cursor: pointer; transition: all 100ms; white-space: nowrap;
        }
        .batch-chip-add:hover { background: rgba(64,255,175,0.12); border-color: #40FFAF; }
        .batch-chip-wrap .batch-type-chip { border-radius: 4px 0 0 4px; }
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
        .gen-btn-r2 {
          background: rgba(247,127,0,0.15); border-color: #f77f00; color: #f77f00;
        }
        .gen-btn-r2:hover:not(:disabled) {
          background: rgba(247,127,0,0.28); border-color: #ffaa44; color: #ffaa44;
        }
        .gen-btn-repair {
          background: rgba(239,68,68,0.12); border-color: #ef4444; color: #ef4444;
        }
        .gen-btn-repair:hover:not(:disabled) {
          background: rgba(239,68,68,0.24); border-color: #f87171; color: #f87171;
        }
        .repair-log {
          margin: 0 24px 12px;
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 12px 14px;
          font-family: monospace;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .repair-log div { color: #a0a0a0; }
        .repair-log .repair-log-ok  { color: #40FFAF; }
        .repair-log .repair-log-err { color: #f87171; }
        .repair-log-close {
          align-self: flex-start;
          margin-top: 6px;
          background: #1a1a1a; border: 1px solid #333;
          border-radius: 4px; color: #777; font-size: 11px;
          padding: 3px 10px; cursor: pointer;
        }
        .repair-log-close:hover { color: #FAFAFA; border-color: #555; }

        @media (max-width: 900px) {
          .batch-workspace { grid-template-columns: 1fr; height: auto; }
          .batch-browser { border-right: none; border-bottom: 1px solid #1a1a1a; max-height: 50vh; }
        }
      `}</style>
    </div>
  );
}
