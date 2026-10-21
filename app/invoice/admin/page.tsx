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
} from '../lib/data';
import { Initial, PAGE_CSS, Siggy } from '../ui';

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
  const creators = [...new Set(invoices.map(inv => inv.creator?.username || 'Unknown'))].sort();

  const outstandingOf = (inv: InvoiceRecord) =>
    (inv.participants || []).filter(p => !p.paid).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const listed = invoices.filter(inv => {
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!(inv.title || '').toLowerCase().includes(q) && !(inv.participants || []).some(p => (p.username || '').toLowerCase().includes(q))) return false;
    }
    if (filters.creator && (inv.creator?.username || '').toLowerCase() !== filters.creator.toLowerCase()) return false;
    if (filters.status === 'unpaid' && outstandingOf(inv) === 0) return false;
    if (filters.status === 'paid' && outstandingOf(inv) > 0) return false;
    return true;
  });

  const debtors = new Map<string, Debtor>();
  const months = new Map<string, { label: string; amount: number; count: number }>();
  const byCreator = new Map<string, { name: string; billed: number; outstanding: number; count: number }>();
  let billed = 0;
  let outstanding = 0;
  let rows = 0;
  let paidRows = 0;

  for (const inv of invoices) {
    const creator = inv.creator?.username || 'Unknown';
    const total = Number(inv.totalAmount || 0);
    const open = outstandingOf(inv);
    billed += total;
    outstanding += open;

    const c = byCreator.get(creator) || { name: creator, billed: 0, outstanding: 0, count: 0 };
    c.billed += total;
    c.outstanding += open;
    c.count += 1;
    byCreator.set(creator, c);

    const d = new Date(inv.date || inv.createdAt);
    if (!Number.isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.get(key) || { label: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }), amount: 0, count: 0 };
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
    outstandingOf,
    billed,
    outstanding,
    paidRate: rows ? Math.round((paidRows / rows) * 100) : 0,
    invoiceCount: invoices.length,
    debtors: [...debtors.values()].sort((a, b) => b.total - a.total),
    months: [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([, v]) => v),
    byCreator: [...byCreator.values()].sort((a, b) => b.billed - a.billed),
    payments: Object.entries(paymentDb.payments || {}) as [string, any][],
  };
}

// --- UI ---
const card = 'inv-card rounded-2xl';
const input = 'rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent/50';
const TABS = [
  { key: 'invoices', label: 'Tagihan' },
  { key: 'debtors', label: 'Penghutang' },
  { key: 'payments', label: 'Rekening' },
  { key: 'stats', label: 'Statistik' },
] as const;

export default async function InvoiceAdminPage({
  searchParams,
}: {
  searchParams: { tab?: string; error?: string; guild?: string; q?: string; status?: string; creator?: string; limit?: string };
}) {
  if (!checkAuth()) {
    return (
      <div className="inv-bg flex min-h-screen items-center justify-center px-4 text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
        <form action={loginAction} className="inv-card w-full max-w-xs space-y-3 rounded-2xl p-6">
          <div className="flex flex-col items-center gap-3 pb-2"><Siggy mood="shy" size={64} /><h1 className="text-xl font-bold">Siggy Admin</h1></div>
          {searchParams.error && <p className="text-xs text-red-400">Username atau password salah.</p>}
          <input name="user" placeholder="Username" required className={`${input} w-full`} />
          <input name="pass" type="password" placeholder="Password" required className={`${input} w-full`} />
          <button type="submit" className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-black">Masuk</button>
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

  const href = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, tab, ...updates })) if (v) params.set(k, String(v));
    if (params.get('tab') === 'invoices') params.delete('tab');
    return `/invoice/admin${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <div className="inv-bg min-h-screen px-4 py-6 text-text-primary">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Siggy size={32} /><h1 className="text-lg font-bold">Siggy Admin</h1></div>
          <nav className="flex gap-1 text-sm">
            {TABS.map(t => (
              <Link key={t.key} href={href({ tab: t.key, limit: null })} className={`rounded-lg px-3 py-1.5 ${tab === t.key ? 'bg-accent/15 font-bold text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/invoice" className="text-text-secondary hover:text-text-primary">Halaman member</Link>
            <form action={logoutAction}>
              <button type="submit" className="text-text-secondary hover:text-text-primary">Keluar</button>
            </form>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Total ditagih', formatCurrency(data.billed), ''],
            ['Belum dibayar', formatCurrency(data.outstanding), 'text-amber-400'],
            ['Baris lunas', `${data.paidRate}%`, 'text-emerald-400'],
            ['Invoice', String(data.invoiceCount), ''],
          ].map(([label, value, color]) => (
            <div key={label} className={`${card} p-4`}>
              <p className="text-xs text-text-secondary">{label}</p>
              <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {data.guilds.length > 1 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href={href({ guild: null, limit: null })} className={`rounded-lg px-3 py-1 ${!filters.guild ? 'bg-accent/15 text-accent' : 'bg-white/5'}`}>Semua server</Link>
            {data.guilds.map(g => (
              <Link key={g} href={href({ guild: g, limit: null })} className={`rounded-lg px-3 py-1 font-mono ${filters.guild === g ? 'bg-accent/15 text-accent' : 'bg-white/5'}`}>{g.slice(0, 8)}</Link>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <section className="space-y-3">
            <form method="get" className="flex flex-wrap gap-2">
              {filters.guild && <input type="hidden" name="guild" value={filters.guild} />}
              <input name="q" defaultValue={filters.q} placeholder="Cari judul / nama" className={`${input} min-w-0 flex-1`} />
              <select name="creator" defaultValue={filters.creator || ''} className={input}>
                <option value="">Semua pembuat</option>
                {data.creators.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
              </select>
              <select name="status" defaultValue={filters.status || ''} className={input}>
                <option value="">Semua status</option>
                <option value="unpaid">Masih ada utang</option>
                <option value="paid">Lunas</option>
              </select>
              <button type="submit" className="rounded-lg bg-accent px-4 text-sm font-bold text-black">Cari</button>
            </form>
            <p className="text-xs text-text-secondary">{data.listed.length} invoice. Klik nama buat ganti lunas / belum.</p>
            {data.listed.slice(0, limit).map(inv => {
              const open = data.outstandingOf(inv);
              return (
                <div key={inv.id} className={`${card} p-4`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate font-bold">
                      {inv.title || 'Untitled'}{' '}
                      <span className="text-xs font-normal text-text-secondary">· {inv.creator?.username} · {formatDate(inv.date)}</span>
                    </p>
                    <p className={`shrink-0 font-mono text-sm font-bold ${open ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {open ? `${formatCurrency(open)} / ${formatCurrency(inv.totalAmount)}` : `Lunas ${formatCurrency(inv.totalAmount)}`}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(inv.participants || []).map((p, i) => (
                      <form key={i} action={markPaidAction}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <input type="hidden" name="index" value={i} />
                        <input type="hidden" name="paid" value={p.paid ? '0' : '1'} />
                        <button
                          type="submit"
                          title={p.paid ? 'Tandai belum bayar' : 'Tandai lunas'}
                          className={`rounded px-2 py-0.5 text-xs ${p.paid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'}`}
                        >
                          {p.paid ? '✓ ' : ''}{p.username} {formatCurrency(p.amount)}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
            {data.listed.length > limit && (
              <Link href={href({ limit: String(limit + 30) })} className="block text-center text-sm text-accent">Tampilkan 30 lagi</Link>
            )}
          </section>
        )}

        {tab === 'debtors' && (
          <section className="space-y-2">
            <p className="text-xs text-text-secondary">
              {data.debtors.length} orang. &quot;Ke-link&quot; = ada di nameLinks, jadi tagihannya muncul di /bayar dan halaman member.
            </p>
            {data.debtors.map(d => (
              <details key={d.name} className={`${card} p-4`}>
                <summary className="flex cursor-pointer items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3 truncate">
                    <Initial name={d.name} size={30} id={d.linkedId || d.seenId} />
                    <span className="font-bold">{d.name}</span>{' '}
                    <span className="text-xs text-text-secondary">· {d.bills.length} tagihan · {d.linkedId ? 'ke-link' : 'belum ke-link'}</span>
                  </span>
                  <span className="shrink-0 font-mono font-bold text-amber-400">{formatCurrency(d.total)}</span>
                </summary>
                <div className="mt-3 space-y-3 text-sm">
                  <p className="text-xs text-text-secondary">
                    Bayar ke: {Object.entries(d.perCreator).map(([c, amt]) => `${c} ${formatCurrency(amt)}`).join(' · ')}
                  </p>
                  <ul className="divide-y divide-white/5">
                    {d.bills.map((b, i) => (
                      <li key={i} className="flex justify-between gap-3 py-1">
                        <span className="truncate">{b.title} <span className="text-xs text-text-secondary">· {b.creator} · {formatDate(b.date)}</span></span>
                        <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <form action={linkUserAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="name" value={d.name} />
                    <input name="userId" defaultValue={d.linkedId || ''} placeholder="Discord user ID" className={`${input} font-mono`} />
                    <button type="submit" className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">Simpan link</button>
                    {!d.linkedId && d.seenId && <span className="text-xs text-text-secondary">ID dari invoice lama: <span className="select-all font-mono">{d.seenId}</span> (belum disimpan)</span>}
                  </form>
                </div>
              </details>
            ))}
          </section>
        )}

        {tab === 'payments' && (
          <section className="space-y-4">
            <div className={`${card} divide-y divide-white/5`}>
              {data.payments.length === 0 && <p className="p-4 text-sm text-text-secondary">Belum ada rekening.</p>}
              {data.payments.map(([key, info]) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-bold">{key} <span className="text-xs font-normal text-text-secondary">@{info?.discordUser || '-'}</span></p>
                    <p className="text-xs text-text-secondary">{info?.bank} <span className="select-all font-mono text-text-primary">{info?.account}</span> a/n {info?.name}</p>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-400">Hapus</summary>
                    <form action={deletePaymentAction} className="mt-2">
                      <input type="hidden" name="name" value={key} />
                      <button type="submit" className="rounded bg-red-500/20 px-2 py-1 text-red-300">Yakin hapus {key}</button>
                    </form>
                  </details>
                </div>
              ))}
            </div>
            <form action={savePaymentAction} className={`${card} grid gap-2 p-4 sm:grid-cols-2`}>
              <p className="text-sm font-bold sm:col-span-2">Tambah / ganti rekening</p>
              <input name="name" required placeholder="Nama di invoice (mis. sopmod)" className={input} />
              <input name="discordUser" placeholder="Username Discord" className={input} />
              <input name="bank" required placeholder="Bank (mis. BCA)" className={input} />
              <input name="account" required placeholder="Nomor rekening" className={input} />
              <input name="holder" required placeholder="Atas nama" className={`${input} sm:col-span-2`} />
              <button type="submit" className="rounded-lg bg-accent py-2 text-sm font-bold text-black sm:col-span-2">Simpan</button>
            </form>
          </section>
        )}

        {tab === 'stats' && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className={`${card} space-y-3 p-4`}>
              <p className="text-sm font-bold">Ditagih per bulan</p>
              {data.months.map(m => (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{m.label} · {m.count} invoice</span><span className="font-mono">{formatCurrency(m.amount)}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(m.amount / Math.max(...data.months.map(x => x.amount), 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className={`${card} p-4`}>
              <p className="mb-2 text-sm font-bold">Per pembuat</p>
              <table className="w-full text-xs">
                <thead className="text-text-secondary">
                  <tr><th className="py-1 text-left font-normal">Nama</th><th className="text-right font-normal">Invoice</th><th className="text-right font-normal">Ditagih</th><th className="text-right font-normal">Belum dibayar</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.byCreator.map(c => (
                    <tr key={c.name}>
                      <td className="py-1.5">{c.name}</td>
                      <td className="text-right">{c.count}</td>
                      <td className="text-right font-mono">{formatCurrency(c.billed)}</td>
                      <td className="text-right font-mono text-amber-400">{formatCurrency(c.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
