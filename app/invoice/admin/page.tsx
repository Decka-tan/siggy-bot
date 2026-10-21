import crypto from 'crypto';
import fs from 'fs';
// Same lock the Discord bot uses — both processes write these JSON files.
import { withFileLock, writeFileAtomic } from '@/discord-bot/utils/file-lock.cjs';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// Mutations re-render in place with this instead of redirecting: a redirect
// throws away the scroll position and every active filter in the URL.
import { revalidatePath } from 'next/cache';

import {
  InvoiceRecord,
  formatCurrency,
  formatDate,
  getCanonicalName,
  getInvoiceDb,
  getInvoiceDbPath,
  getPaymentDb,
  getPaymentDbPath,
  isSnowflake,
  listLoginPeople,
} from '../lib/data';
import { AccountBox, Chevron, Initial, MonthBars, PAGE_CSS, SectionTitle, Siggy, StatTile } from '../ui';
import { Toolbar } from './Toolbar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Siggy Admin' };

// --- AUTH ---
// All three come from the environment; nothing secret lives in this public repo.
// The cookie holds a value derived from the secret, never the secret itself,
// because the member login signs its links with that same secret.
const AUTH_USER = process.env.SIGGY_ADMIN_USER;
const AUTH_PASS = process.env.SIGGY_ADMIN_PASS;
const SESSION_VALUE = process.env.SIGGY_SESSION_SECRET
  ? crypto.createHmac('sha256', process.env.SIGGY_SESSION_SECRET).update('invoice-admin-session').digest('base64url')
  : '';
const COOKIE_NAME = 'siggy_session_v5';

function authConfigured() {
  if (AUTH_USER && AUTH_PASS && SESSION_VALUE) return true;
  console.error('[invoice-admin] locked: set SIGGY_ADMIN_USER, SIGGY_ADMIN_PASS and SIGGY_SESSION_SECRET');
  return false;
}

// Constant-time compare so a wrong guess cannot be narrowed down by timing.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkAuth() {
  if (!authConfigured()) return false;
  const session = cookies().get(COOKIE_NAME);
  return !!session?.value && safeEqual(session.value, SESSION_VALUE);
}

// --- SERVER ACTIONS ---
async function loginAction(formData: FormData) {
  'use server';
  if (!authConfigured()) return redirect('/invoice/admin?error=1');
  const user = String(formData.get('user') ?? '');
  const pass = String(formData.get('pass') ?? '');
  if (safeEqual(user, AUTH_USER as string) && safeEqual(pass, AUTH_PASS as string)) {
    cookies().set(COOKIE_NAME, SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/invoice/admin',
    });
    return redirect('/invoice/admin');
  }
  return redirect('/invoice/admin?error=1');
}

async function logoutAction() {
  'use server';
  cookies().set(COOKIE_NAME, '', { path: '/invoice/admin', maxAge: 0 });
  return redirect('/invoice/admin');
}

async function markPaidAction(formData: FormData) {
  'use server';
  if (!checkAuth()) return;
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const index = Number(formData.get('index'));
  const isPaid = formData.get('paid') === '1';
  const dbPath = getInvoiceDbPath();
  // Re-read inside the lock: the bot may have written since this page rendered.
  const changed = withFileLock(dbPath, () => {
    const { db } = getInvoiceDb();
    const p = db.invoices?.[invoiceId]?.participants?.[index];
    if (!p) return false;
    p.paid = isPaid;
    writeFileAtomic(dbPath, JSON.stringify(db, null, 2));
    return true;
  });

  if (changed) {
    // Redraw the invoice message in Discord. The bot listens on the host, so the
    // container reaches it through BOT_REFRESH_URL (host.docker.internal).
    const refreshUrl = process.env.BOT_REFRESH_URL || 'http://localhost:8888/api/refresh-invoice';
    try {
      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-siggy-token': process.env.INTERNAL_API_TOKEN || '' },
        body: JSON.stringify({ invoiceId }),
        // Without this a dead bot leaves the click spinning.
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) console.error(`[invoice-admin] bot refresh returned ${res.status} from ${refreshUrl}`);
    } catch (e) {
      console.error(`[invoice-admin] bot refresh failed (${refreshUrl}) — the Discord message will be stale:`, e);
    }
  }
  revalidatePath('/invoice/admin');
}

// Writes the name → Discord id link that /bayar reads (payment-info.json
// nameLinks), and stamps the id on that person's invoice rows.
async function linkUserAction(formData: FormData) {
  'use server';
  if (!checkAuth()) return;
  const name = String(formData.get('name') ?? '');
  const userId = String(formData.get('userId') ?? '').trim();
  if (!name || !isSnowflake(userId)) return;

  const paymentDbPath = getPaymentDbPath();
  if (fs.existsSync(paymentDbPath)) {
    withFileLock(paymentDbPath, () => {
      try {
        const db = JSON.parse(fs.readFileSync(paymentDbPath, 'utf8'));
        const nameLower = name.toLowerCase().trim();
        db.nameLinks = db.nameLinks || {};
        db.nameLinks[nameLower] = {
          discordId: userId,
          discordUsername: name,
          aliases: [],
          createdAt: db.nameLinks[nameLower]?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        writeFileAtomic(paymentDbPath, JSON.stringify(db, null, 2));
      } catch (e) {
        console.error('Failed to save to payment-info.json', e);
      }
    });
  }

  const invoiceDbPath = getInvoiceDbPath();
  if (fs.existsSync(invoiceDbPath)) {
    withFileLock(invoiceDbPath, () => {
      try {
        const db = JSON.parse(fs.readFileSync(invoiceDbPath, 'utf8'));
        const target = getCanonicalName(name, db.nameAliases || {}).toLowerCase().trim();
        // Match on the canonical name, not the raw string. The ledger groups
        // "Clee"/"Stepan" under "stefan" via nameAliases, so a literal compare
        // linked only the rows that happened to spell the canonical name.
        let updated = false;
        Object.values(db.invoices || {}).forEach((inv: any) => {
          (inv.participants || []).forEach((p: any) => {
            if (getCanonicalName(p.username || '', db.nameAliases || {}).toLowerCase().trim() === target) {
              p.userId = userId;
              updated = true;
            }
          });
        });
        if (updated) writeFileAtomic(invoiceDbPath, JSON.stringify(db, null, 2));
      } catch (e) {
        console.error('Failed to save to invoices.json', e);
      }
    });
  }
  revalidatePath('/invoice/admin');
}

async function savePaymentAction(formData: FormData) {
  'use server';
  if (!checkAuth()) return;
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  const paymentDbPath = getPaymentDbPath();
  withFileLock(paymentDbPath, () => {
    let db = { payments: {}, nameLinks: {} } as any;
    if (fs.existsSync(paymentDbPath)) {
      try {
        db = JSON.parse(fs.readFileSync(paymentDbPath, 'utf8'));
      } catch (e) {}
    }
    db.payments = db.payments || {};
    db.payments[name.toLowerCase()] = {
      bank: String(formData.get('bank') ?? ''),
      account: String(formData.get('account') ?? ''),
      name: String(formData.get('holder') ?? ''),
      discordUser: String(formData.get('discordUser') ?? ''),
      updatedAt: Date.now(),
    };
    writeFileAtomic(paymentDbPath, JSON.stringify(db, null, 2));
  });
  revalidatePath('/invoice/admin');
}

async function deletePaymentAction(formData: FormData) {
  'use server';
  if (!checkAuth()) return;
  const key = String(formData.get('name') ?? '').toLowerCase().trim();
  if (!key) return;
  const paymentDbPath = getPaymentDbPath();
  if (fs.existsSync(paymentDbPath)) {
    withFileLock(paymentDbPath, () => {
      try {
        const db = JSON.parse(fs.readFileSync(paymentDbPath, 'utf8'));
        if (db.payments?.[key]) {
          delete db.payments[key];
          writeFileAtomic(paymentDbPath, JSON.stringify(db, null, 2));
        }
      } catch (e) {}
    });
  }
  revalidatePath('/invoice/admin');
}

// --- DATA ---
type Filters = { guild?: string; q?: string; status?: string; creator?: string };

type Debtor = {
  name: string;
  total: number;
  bills: { id: string; title: string; amount: number; date: string; creator: string }[];
  perCreator: Record<string, number>;
  linkedId: string | null; // nameLinks — what /bayar reads
  seenId: string | null; // a snowflake on an old invoice row, not saved anywhere
};

function buildAdminData(filters: Filters) {
  const { db } = getInvoiceDb();
  const paymentDb = getPaymentDb();
  const aliases = db.nameAliases || {};
  const all = Object.values(db.invoices || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const guilds = [...new Set(all.map(inv => inv.guildId).filter(Boolean))];
  const invoices = filters.guild ? all.filter(inv => inv.guildId === filters.guild) : all;
  // Creators are stored by Discord username; label them by the name people use.
  const knownName = new Map(listLoginPeople().map(p => [p.id, p.name]));
  const labelOf = (inv: InvoiceRecord) => (inv.creator?.id && knownName.get(inv.creator.id)) || inv.creator?.username || 'Unknown';
  const creatorMap = new Map<string, { value: string; label: string; id: string | null; count: number }>();
  for (const inv of invoices) {
    const value = (inv.creator?.username || 'Unknown').toLowerCase();
    const c = creatorMap.get(value) || { value, label: labelOf(inv), id: isSnowflake(inv.creator?.id) ? inv.creator.id : null, count: 0 };
    c.count += 1;
    creatorMap.set(value, c);
  }
  const creators = [...creatorMap.values()].sort((a, b) => b.count - a.count);

  const outstandingOf = (inv: InvoiceRecord) =>
    (inv.participants || []).filter(p => !p.paid).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const listed = invoices.filter(inv => {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [inv.title, labelOf(inv), inv.creator?.username, ...(inv.participants || []).map(p => p.username)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.creator && (inv.creator?.username || '').toLowerCase() !== filters.creator.toLowerCase()) return false;
    if (filters.status === 'unpaid' && outstandingOf(inv) === 0) return false;
    if (filters.status === 'paid' && outstandingOf(inv) > 0) return false;
    return true;
  });

  const debtors = new Map<string, Debtor>();
  const months = new Map<string, { key: string; label: string; amount: number; count: number }>();
  const byCreator = new Map<string, { name: string; id: string | null; billed: number; outstanding: number; count: number }>();
  let billed = 0;
  let outstanding = 0;
  let rows = 0;
  let paidRows = 0;

  for (const inv of invoices) {
    const creator = labelOf(inv);
    const total = Number(inv.totalAmount || 0);
    const open = outstandingOf(inv);
    billed += total;
    outstanding += open;

    const c = byCreator.get(creator) || { name: creator, id: isSnowflake(inv.creator?.id) ? inv.creator.id : null, billed: 0, outstanding: 0, count: 0 };
    c.billed += total;
    c.outstanding += open;
    c.count += 1;
    byCreator.set(creator, c);

    const d = new Date(inv.date || inv.createdAt);
    if (!Number.isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.get(key) || { key, label: d.toLocaleDateString('id-ID', { month: 'short' }), amount: 0, count: 0 };
      m.amount += total;
      m.count += 1;
      months.set(key, m);
    }

    for (const p of inv.participants || []) {
      rows += 1;
      if (p.paid) {
        paidRows += 1;
        continue;
      }
      const canonical = getCanonicalName(p.username || 'Unknown', aliases);
      const key = canonical.toLowerCase().trim();
      const debtor = debtors.get(key) || {
        name: canonical,
        total: 0,
        bills: [],
        perCreator: {},
        linkedId: paymentDb.nameLinks?.[key]?.discordId || null,
        seenId: null,
      };
      if (!debtor.seenId && isSnowflake(p.userId)) debtor.seenId = p.userId;
      const amt = Number(p.amount) || 0;
      debtor.total += amt;
      debtor.bills.push({ id: inv.id, title: inv.title || 'Untitled', amount: amt, date: inv.date, creator });
      debtor.perCreator[creator] = (debtor.perCreator[creator] || 0) + amt;
      debtors.set(key, debtor);
    }
  }

  return {
    guilds,
    creators,
    listed,
    labelOf,
    outstandingOf,
    billed,
    outstanding,
    paidRate: rows ? Math.round((paidRows / rows) * 100) : 0,
    invoiceCount: invoices.length,
    debtors: [...debtors.values()]
      .map(d => ({ ...d, name: d.name.charAt(0).toUpperCase() + d.name.slice(1) }))
      .sort((a, b) => b.total - a.total),
    months: [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([, v]) => v),
    byCreator: [...byCreator.values()].sort((a, b) => b.billed - a.billed),
    payments: Object.entries(paymentDb.payments || {}) as [string, any][],
  };
}

// --- UI ---
const card = 'inv-card rounded-2xl';
const input = 'rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10';
const TABS = [
  { key: 'invoices', label: 'Tagihan', icon: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5' },
  { key: 'debtors', label: 'Penghutang', icon: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { key: 'payments', label: 'Rekening', icon: 'M3 7h18v10H3zM3 11h18M7 15h3' },
  { key: 'stats', label: 'Statistik', icon: 'M5 20V10M12 20V4M19 20v-7' },
] as const;

function Icon({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default async function InvoiceAdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; error?: string; guild?: string; q?: string; status?: string; creator?: string; limit?: string };
}) {
  if (!checkAuth()) {
    return (
      <div className="inv-bg flex min-h-screen items-center justify-center px-4 text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
        <form action={loginAction} className="inv-card inv-rise w-full max-w-sm space-y-3 rounded-3xl p-7 shadow-2xl shadow-black/60">
          <div className="flex flex-col items-center gap-3 pb-3 text-center">
            <Siggy mood="shy" size={72} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Siggy Ledger</p>
              <h1 className="text-2xl font-black tracking-tight">Admin</h1>
            </div>
          </div>
          {searchParams.error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">Username atau password salah.</p>}
          <input name="user" placeholder="Username" required className={`${input} w-full`} />
          <input name="pass" type="password" placeholder="Password" required className={`${input} w-full`} />
          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-accent py-3 text-sm font-black text-black shadow-lg shadow-accent/20 transition hover:brightness-110">Masuk</button>
        </form>
      </div>
    );
  }

  const tab = TABS.some(t => t.key === searchParams.tab) ? searchParams.tab! : 'invoices';
  const filters: Filters = {
    guild: searchParams.guild || undefined,
    q: searchParams.q || undefined,
    status: searchParams.status || undefined,
    creator: searchParams.creator || undefined,
  };
  const limit = Math.max(30, Number(searchParams.limit) || 30);
  const data = buildAdminData(filters);
  const maxDebt = Math.max(...data.debtors.map(d => d.total), 1);
  const maxCreator = Math.max(...data.byCreator.map(c => c.billed), 1);
  const linkedCount = data.debtors.filter(d => d.linkedId).length;

  const href = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, tab, ...updates })) if (v) params.set(k, String(v));
    if (params.get('tab') === 'invoices') params.delete('tab');
    return `/invoice/admin${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <div className="inv-bg min-h-screen text-text-primary">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07070a]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Siggy size={30} />
            <span className="hidden text-sm font-black tracking-tight sm:inline">Siggy <span className="text-accent">Admin</span></span>
          </div>
          <nav className="flex flex-1 justify-center gap-1 overflow-x-auto">
            {TABS.map(t => (
              <Link
                key={t.key}
                href={href({ tab: t.key, limit: null })}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${tab === t.key ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
              >
                <Icon d={t.icon} />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/invoice" className="hidden rounded-lg px-2.5 py-1.5 text-text-secondary ring-1 ring-white/10 hover:text-text-primary md:inline">Halaman member</Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-2.5 py-1.5 text-text-secondary ring-1 ring-white/10 hover:text-text-primary">Keluar</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="inv-rise grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="inv-hero inv-grain col-span-2 overflow-hidden rounded-2xl p-5 lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary">Belum dibayar</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-amber-400 sm:text-4xl">{formatCurrency(data.outstanding)}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${data.paidRate}%` }} />
            </div>
            <p className="mt-2 text-xs text-text-secondary"><b className="text-emerald-300">{data.paidRate}%</b> baris tagihan udah lunas · {data.debtors.length} orang masih utang</p>
          </div>
          <StatTile label="Total ditagih" value={formatCurrency(data.billed)} hint={`${data.invoiceCount} invoice`} />
          <StatTile label="Ke-link" value={`${linkedCount}/${data.debtors.length}`} hint="penghutang bisa /bayar" tone="violet" />
        </section>

        {data.guilds.length > 1 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href={href({ guild: null, limit: null })} className={`rounded-full px-3 py-1.5 font-bold ring-1 ${!filters.guild ? 'bg-white text-black ring-white' : 'text-text-secondary ring-white/10'}`}>Semua server</Link>
            {data.guilds.map(g => (
              <Link key={g} href={href({ guild: g, limit: null })} className={`rounded-full px-3 py-1.5 font-mono ring-1 ${filters.guild === g ? 'bg-accent/15 text-accent ring-accent/50' : 'text-text-secondary ring-white/10'}`}>{g.slice(0, 8)}</Link>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <section className="space-y-3">
            <Toolbar creators={data.creators} total={data.invoiceCount} shown={data.listed.length} />
            {data.listed.length === 0 && (
              <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
                <Siggy mood="sad" size={64} />
                <p className="text-sm text-text-secondary">Gak ada invoice yang cocok sama filter ini.</p>
              </div>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {data.listed.slice(0, limit).map(inv => {
                const open = data.outstandingOf(inv);
                const total = Number(inv.totalAmount) || 0;
                const pct = total ? Math.round(((total - open) / total) * 100) : 100;
                const parts = inv.participants || [];
                return (
                  <article key={inv.id} className={`${card} flex flex-col p-4 transition hover:border-white/15`}>
                    <div className="flex items-start gap-3">
                      <Initial name={data.labelOf(inv)} id={inv.creator?.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-bold leading-snug">{inv.title || 'Untitled'}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">{data.labelOf(inv)} · {formatDate(inv.date)} · {parts.length} orang</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-black ${open ? 'text-amber-400' : 'text-emerald-400'}`}>{open ? formatCurrency(open) : 'Lunas'}</p>
                        <p className="text-[11px] text-text-secondary">dari {formatCurrency(total)}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${open ? 'bg-gradient-to-r from-emerald-500 to-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {parts.map((p, i) => (
                        <form key={i} action={markPaidAction}>
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <input type="hidden" name="index" value={i} />
                          <input type="hidden" name="paid" value={p.paid ? '0' : '1'} />
                          <button
                            type="submit"
                            title={p.paid ? 'Klik buat tandai belum bayar' : 'Klik buat tandai lunas'}
                            className={`group flex items-center gap-1.5 rounded-lg py-1 pl-1.5 pr-2 text-xs ring-1 transition ${p.paid ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-200 ring-amber-500/25 hover:bg-amber-500/20'}`}
                          >
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${p.paid ? 'bg-emerald-400 text-black' : 'ring-1 ring-amber-400/60 group-hover:bg-amber-400/30'}`}>{p.paid ? '✓' : ''}</span>
                            <span className="font-bold">{p.username}</span>
                            <span className="font-mono opacity-80">{formatCurrency(p.amount).replace('Rp ', '')}</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
            {data.listed.length > limit && (
              <Link href={href({ limit: String(limit + 30) })} className="mx-auto block w-fit rounded-xl px-5 py-2.5 text-sm font-bold text-accent ring-1 ring-accent/30 hover:bg-accent/10">
                Tampilkan 30 lagi ({data.listed.length - limit} sisa)
              </Link>
            )}
          </section>
        )}

        {tab === 'debtors' && (
          <section className="space-y-3">
            <SectionTitle aside={`${linkedCount} ke-link · ${data.debtors.length - linkedCount} belum`}>Penghutang</SectionTitle>
            <div className={`${card} divide-y divide-white/5 overflow-hidden`}>
              {data.debtors.map((d, i) => (
                <details key={d.name} className="px-4 py-3 transition hover:bg-white/[0.02]">
                  <summary className="flex cursor-pointer items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-text-secondary">{i + 1}</span>
                    <Initial name={d.name} size={36} id={d.linkedId || d.seenId} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-bold">{d.name}</span>
                          {d.linkedId
                            ? <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">ke-link</span>
                            : <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">belum ke-link</span>}
                        </span>
                        <span className="shrink-0 font-black text-amber-400">{formatCurrency(d.total)}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                          <span className="block h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${(d.total / maxDebt) * 100}%` }} />
                        </span>
                        <span className="shrink-0 text-[11px] text-text-secondary">{d.bills.length} tagihan</span>
                      </span>
                    </span>
                    <Chevron />
                  </summary>
                  <div className="mt-4 space-y-4 pl-[4.25rem] text-sm">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(d.perCreator).map(([c, amt]) => (
                        <span key={c} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs">ke <b>{c}</b> <span className="font-mono text-amber-300">{formatCurrency(amt)}</span></span>
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {d.bills.map((b, j) => (
                        <li key={j} className="flex justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-1.5">
                          <span className="min-w-0 truncate">{b.title} <span className="text-xs text-text-secondary">· {b.creator} · {formatDate(b.date)}</span></span>
                          <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                        </li>
                      ))}
                    </ul>
                    <form action={linkUserAction} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/30 p-3 ring-1 ring-white/5">
                      <input type="hidden" name="name" value={d.name} />
                      <span className="text-xs font-bold text-text-secondary">Discord ID</span>
                      <input name="userId" defaultValue={d.linkedId || d.seenId || ''} placeholder="mis. 392321900577161219" className={`${input} min-w-0 flex-1 py-2 font-mono`} />
                      <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-xs font-black text-black hover:brightness-110">Simpan link</button>
                      {!d.linkedId && d.seenId && <p className="w-full text-xs text-text-secondary">ID diisi dari invoice lama, belum kesimpen. Pencet Simpan link biar /bayar kebaca.</p>}
                    </form>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {tab === 'payments' && (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-3">
              <SectionTitle aside={`${data.payments.length} rekening`}>Rekening tujuan</SectionTitle>
              {data.payments.length === 0 && <p className={`${card} p-5 text-sm text-text-secondary`}>Belum ada rekening.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {data.payments.map(([key, info]) => (
                  <div key={key} className="space-y-2">
                    <AccountBox bank={info?.bank} account={info?.account} holder={info?.name} />
                    <div className="flex items-center justify-between px-1 text-xs">
                      <span><b className="text-text-primary">{key}</b> <span className="text-text-secondary">@{info?.discordUser || '-'}</span></span>
                      <details className="relative">
                        <summary className="cursor-pointer text-red-400 hover:text-red-300">Hapus</summary>
                        <form action={deletePaymentAction} className="absolute right-0 z-10 mt-1">
                          <input type="hidden" name="name" value={key} />
                          <button type="submit" className="whitespace-nowrap rounded-lg bg-red-500 px-3 py-1.5 font-bold text-white shadow-lg">Yakin hapus {key}</button>
                        </form>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form action={savePaymentAction} className={`${card} h-fit space-y-3 p-5`}>
              <p className="font-bold">Tambah / ganti rekening</p>
              <p className="text-xs text-text-secondary">Nama di invoice dipakai buat nyocokin ke pembuat invoice. Nama yang udah ada bakal ketimpa.</p>
              <input name="name" required placeholder="Nama di invoice (mis. sopmod)" className={`${input} w-full`} />
              <input name="discordUser" placeholder="Username Discord" className={`${input} w-full`} />
              <div className="grid grid-cols-2 gap-2">
                <input name="bank" required placeholder="Bank (mis. BCA)" className={input} />
                <input name="account" required placeholder="Nomor rekening" className={`${input} font-mono`} />
              </div>
              <input name="holder" required placeholder="Atas nama" className={`${input} w-full`} />
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-accent py-3 text-sm font-black text-black hover:brightness-110">Simpan rekening</button>
            </form>
          </section>
        )}

        {tab === 'stats' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className={`${card} p-5`}>
              <SectionTitle aside="6 bulan terakhir">Ditagih per bulan</SectionTitle>
              <div className="mt-5"><MonthBars months={data.months} /></div>
            </div>
            <div className={`${card} p-5`}>
              <SectionTitle aside="semua waktu">Per pembuat</SectionTitle>
              <ul className="mt-4 space-y-3">
                {data.byCreator.map(c => (
                  <li key={c.name} className="flex items-center gap-3">
                    <Initial name={c.name} id={c.id} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-bold">{c.name} <span className="text-xs font-normal text-text-secondary">· {c.count} invoice</span></span>
                        <span className="shrink-0 font-mono">{formatCurrency(c.billed)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-accent" style={{ width: `${(c.billed / maxCreator) * 100}%` }} />
                      </div>
                      {c.outstanding > 0 && <p className="mt-1 text-[11px] text-amber-300">{formatCurrency(c.outstanding)} belum dibayar</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
