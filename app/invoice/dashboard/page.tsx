import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Server,
  Users,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  History,
  TrendingUp,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Save,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Wallet,
  HandCoins,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// --- AUTH CONFIG ---
const AUTH_USER = "Sopmod";
const AUTH_PASS = "4r1p1n";
const COOKIE_NAME = "siggy_session_v3";
const SESSION_VALUE = "authenticated_siggy_admin_access";

async function checkAuth() {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === SESSION_VALUE;
}

// --- SERVER ACTIONS ---
async function loginAction(formData: FormData) {
  'use server';
  const user = formData.get('user');
  const pass = formData.get('pass');
  if (user === AUTH_USER && pass === AUTH_PASS) {
    cookies().set(COOKIE_NAME, SESSION_VALUE, { 
      httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' 
    });
    return redirect('/invoice/dashboard');
  }
  return redirect('/invoice/dashboard?error=1');
}

async function markPaidAction(invoiceId: string, participantIndex: number, isPaid: boolean) {
  'use server';
  if (!(await checkAuth())) return;
  const dbPath = getInvoiceDbPath();
  const { db } = getInvoiceDb();
  if (db.invoices && db.invoices[invoiceId] && db.invoices[invoiceId].participants?.[participantIndex]) {
    db.invoices[invoiceId].participants[participantIndex].paid = isPaid;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    // Trigger Bot refresh (Delete old message, send new one in Discord)
    try {
      await fetch('http://localhost:8888/api/refresh-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoiceId })
      });
    } catch (e) {
      console.error('Failed to trigger bot refresh from dashboard:', e);
    }
  }
  return redirect(`/invoice/dashboard?tab=logs`);
}

async function filterAction(formData: FormData) {
  'use server';
  const q = formData.get('q') as string;
  const status = formData.get('status') as string;
  const creator = formData.get('creator') as string;
  const guild = formData.get('guild') as string;
  const tab = formData.get('tab') as string;

  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (guild) params.set('guild', guild);
  if (q) params.set('q', q);
  if (status && status !== 'all') params.set('status', status);
  if (creator && creator !== 'all') params.set('creator', creator);

  return redirect(`/invoice/dashboard?${params.toString()}`);
}

async function linkDiscordAction(formData: FormData) {
  'use server';
  if (!(await checkAuth())) return;
  const name = formData.get('name') as string;
  const discordId = formData.get('discordId') as string;
  const tab = formData.get('tab') as string;

  if (!name) return;

  const paymentDbPath = path.join(process.cwd(), 'discord-bot', 'data', 'payment-info.json');
  let db = { payments: {}, nameLinks: {} } as any;
  
  if (fs.existsSync(paymentDbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(paymentDbPath, 'utf8'));
    } catch (e) {}
  }

  const nameLower = name.toLowerCase().trim();
  if (discordId) {
    db.nameLinks[nameLower] = {
      ...(db.nameLinks[nameLower] || {}),
      discordId: discordId,
      createdAt: db.nameLinks[nameLower]?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  } else {
    delete db.nameLinks[nameLower];
  }

  fs.writeFileSync(paymentDbPath, JSON.stringify(db, null, 2));
  return redirect(`/invoice/dashboard?tab=${tab || 'debtors'}`);
}

async function deletePaymentAction(formData: FormData) {
  'use server';
  if (!(await checkAuth())) return;
  const name = formData.get('name') as string;
  const tab = formData.get('tab') as string;

  if (!name) return;

  const paymentDbPath = path.join(process.cwd(), 'discord-bot', 'data', 'payment-info.json');
  if (fs.existsSync(paymentDbPath)) {
    try {
      const db = JSON.parse(fs.readFileSync(paymentDbPath, 'utf8'));
      const key = name.toLowerCase().trim();
      if (db.payments[key]) {
        delete db.payments[key];
        fs.writeFileSync(paymentDbPath, JSON.stringify(db, null, 2));
      }
    } catch (e) {}
  }
  return redirect(`/invoice/dashboard?tab=${tab || 'payments'}`);
}

async function savePaymentAction(formData: FormData) {
  'use server';
  if (!(await checkAuth())) return;
  const name = formData.get('name') as string;
  const bank = formData.get('bank') as string;
  const account = formData.get('account') as string;
  const holder = formData.get('holder') as string;
  const discordUser = formData.get('discordUser') as string;
  const tab = formData.get('tab') as string;

  if (!name) return;

  const paymentDbPath = path.join(process.cwd(), 'discord-bot', 'data', 'payment-info.json');
  let db = { payments: {}, nameLinks: {} } as any;
  
  if (fs.existsSync(paymentDbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(paymentDbPath, 'utf8'));
    } catch (e) {}
  }

  const key = name.toLowerCase().trim();
  db.payments[key] = {
    bank,
    account,
    name: holder,
    discordUser,
    updatedAt: Date.now()
  };

  fs.writeFileSync(paymentDbPath, JSON.stringify(db, null, 2));
  return redirect(`/invoice/dashboard?tab=${tab || 'payments'}`);
}

// --- Types ---
type InvoiceParticipant = {
  userId?: string;
  username: string;
  amount: number;
  paid?: boolean;
  notes?: string | null;
};

type InvoiceRecord = {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string | null;
  creator: {
    id: string;
    username: string;
  };
  title?: string;
  date: string;
  createdAt: number;
  participants: InvoiceParticipant[];
  totalAmount: number;
};

type InvoiceDb = {
  invoices?: Record<string, InvoiceRecord>;
  nameAliases?: Record<string, string[]>;
};

type GuildInfo = {
  id: string;
  name: string;
  invoiceCount: number;
};

type DashboardData = {
  allInvoices: InvoiceRecord[];
  filteredInvoices: InvoiceRecord[];
  totalAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  topCreators: { name: string; totalCreated: number; invoiceCount: number }[];
  topDebtors: { 
    name: string; 
    totalDebt: number; 
    unpaidCount: number; 
    invoiceCount: number; 
    invoices: { id: string; title: string; amount: number; date: string; creatorName: string }[];
    recap: Record<string, number>;
    discordId: string | null;
  }[];
  allPayments: Record<string, { bank: string; account: string; name: string }>;
  monthlyStats: { label: string; count: number; amount: number }[];
  guilds: GuildInfo[];
  stats: {
    totalInvoices: number;
    totalParticipants: number;
    paidParticipants: number;
    unpaidParticipants: number;
  };
  dbPath: string;
};

// --- Helpers ---
function formatCurrency(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(value?: string | number) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getInvoiceDbPath() {
  const candidates = [process.env.INVOICE_DB_PATH, path.join(process.cwd(), 'discord-bot', 'data', 'invoices.json')].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0] || path.join(process.cwd(), 'discord-bot', 'data', 'invoices.json');
}

function getInvoiceDb(): { db: InvoiceDb; dbPath: string } {
  const dbPath = getInvoiceDbPath();
  if (!fs.existsSync(dbPath)) return { db: { invoices: {}, nameAliases: {} }, dbPath };
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { db: { invoices: parsed?.invoices || {}, nameAliases: parsed?.nameAliases || {} }, dbPath };
  } catch {
    return { db: { invoices: {}, nameAliases: {} }, dbPath };
  }
}

function getPaymentDb(): any {
  const dbPath = path.join(process.cwd(), 'discord-bot', 'data', 'payment-info.json');
  if (!fs.existsSync(dbPath)) return { payments: {}, nameLinks: {} };
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return { payments: {}, nameLinks: {} };
  }
}

function getCanonicalName(name: string, aliases: Record<string, string[]>) {
  const inputLower = (name || 'Unknown').toLowerCase().trim();
  for (const [canonical, aliasList] of Object.entries(aliases || {})) {
    if (canonical.toLowerCase().trim() === inputLower || (aliasList || []).some(a => a.toLowerCase().trim() === inputLower)) {
      return canonical;
    }
  }
  return name || 'Unknown';
}

function buildDashboardData(selectedGuildId?: string, filters?: { q?: string; status?: string; creator?: string }): DashboardData {
  const { db, dbPath } = getInvoiceDb();
  const paymentDb = getPaymentDb();
  let invoices = Object.values(db.invoices || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  const guildMap = new Map<string, number>();
  invoices.forEach(inv => {
    if (inv.guildId) guildMap.set(inv.guildId, (guildMap.get(inv.guildId) || 0) + 1);
  });
  const guilds: GuildInfo[] = Array.from(guildMap.entries()).map(([id, count]) => ({
    id, name: `Server ${id.substring(0, 4)}...`, invoiceCount: count
  }));

  if (selectedGuildId) {
    invoices = invoices.filter(inv => inv.guildId === selectedGuildId);
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      const matchTitle = (inv.title || "").toLowerCase().includes(q);
      const matchParticipant = (inv.participants || []).some(p => (p.username || "").toLowerCase().includes(q));
      if (!matchTitle && !matchParticipant) return false;
    }
    if (filters?.creator && filters.creator !== 'all') {
      if ((inv.creator?.username || "").toLowerCase() !== filters.creator.toLowerCase()) return false;
    }
    if (filters?.status && filters.status !== 'all') {
      const isFullyPaid = (inv.participants || []).every(p => p.paid);
      if (filters.status === 'paid' && !isFullyPaid) return false;
      if (filters.status === 'unpaid' && isFullyPaid) return false;
    }
    return true;
  });

  const allParticipants = invoices.flatMap((invoice) => invoice.participants || []);
  const unpaidParticipants = allParticipants.filter((participant) => !participant.paid);

  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const outstandingAmount = unpaidParticipants.reduce((sum, participant) => sum + Number(participant.amount || 0), 0);
  const paidAmount = totalAmount - outstandingAmount;

  const creatorMap = new Map<string, { name: string; totalCreated: number; invoiceCount: number }>();
  const debtorMap = new Map<string, any>();
  const monthlyMap = new Map<string, { label: string; count: number; amount: number }>();

  for (const invoice of invoices) {
    const creatorKey = (invoice.creator?.username || 'Unknown').toLowerCase().trim();
    const creatorName = invoice.creator?.username || 'Unknown';
    const creatorStats = creatorMap.get(creatorKey) || { name: creatorName, totalCreated: 0, invoiceCount: 0 };
    creatorStats.totalCreated += Number(invoice.totalAmount || 0);
    creatorStats.invoiceCount += 1;
    creatorMap.set(creatorKey, creatorStats);

    const monthDate = new Date(invoice.date || invoice.createdAt);
    const monthKey = Number.isNaN(monthDate.getTime()) ? 'unknown' : `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = Number.isNaN(monthDate.getTime()) ? 'Unknown' : monthDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    const monthStats = monthlyMap.get(monthKey) || { label: monthLabel, count: 0, amount: 0 };
    monthStats.count += 1;
    monthStats.amount += Number(invoice.totalAmount || 0);
    monthlyMap.set(monthKey, monthStats);

    for (const participant of (invoice.participants || [])) {
      if (participant.paid) continue;
      const canonical = getCanonicalName(participant.username || 'Unknown', db.nameAliases || {});
      const debtorKey = canonical.toLowerCase().trim();
      const linkedInfo = paymentDb.nameLinks?.[debtorKey];
      
      const debtorStats = debtorMap.get(debtorKey) || { 
        name: canonical, 
        totalDebt: 0, 
        unpaidCount: 0, 
        invoiceCount: 0, 
        invoices: [],
        recap: {},
        discordId: linkedInfo?.discordId || null
      };
      
      const amt = Number(participant.amount || 0);
      debtorStats.totalDebt += amt;
      debtorStats.unpaidCount += 1;
      debtorStats.invoiceCount += 1;
      debtorStats.invoices.push({ 
        id: invoice.id, 
        title: invoice.title, 
        amount: amt, 
        date: invoice.date,
        creatorName: invoice.creator?.username || "Unknown"
      });
      
      // Recap per creator
      const cName = invoice.creator?.username || "Unknown";
      debtorStats.recap[cName] = (debtorStats.recap[cName] || 0) + amt;
      
      debtorMap.set(debtorKey, debtorStats);
    }
  }

  return {
    allInvoices: invoices, 
    filteredInvoices, 
    totalAmount, 
    outstandingAmount, 
    paidAmount, 
    guilds,
    topCreators: Array.from(creatorMap.values()).sort((a, b) => b.totalCreated - a.totalCreated).slice(0, 10),
    topDebtors: Array.from(debtorMap.values()).sort((a, b) => b.totalDebt - a.totalDebt),
    monthlyStats: Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([, v]) => v),
    dbPath,
    allPayments: paymentDb.payments || {},
    stats: { totalInvoices: invoices.length, totalParticipants: allParticipants.length, paidParticipants: allParticipants.filter((p) => p.paid).length, unpaidParticipants: unpaidParticipants.length },
  };
}

// --- Components ---
function SidebarItem({ icon: Icon, label, active = false, href }: { icon: any; label: string; active?: boolean; href: string }) {
  return (
    <Link href={href} className={`relative z-[200] flex items-center gap-3 rounded-xl px-4 py-3 transition-all cursor-pointer ${active ? 'bg-accent/15 text-accent font-medium' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}>
      <Icon className="h-5 w-5" />
      <span className="text-sm tracking-wide">{label}</span>
      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"></div>}
    </Link>
  );
}

function StatCardMini({ title, value, icon: Icon, colorClass = "text-accent" }: { title: string; value: string; icon: any; colorClass?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface/30 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3"><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary">{title}</p><Icon className={`h-4 w-4 ${colorClass}`} /></div>
      <p className="text-xl font-bold tracking-tight text-text-primary">{value}</p>
    </div>
  );
}

function DiscordEmbed({ invoice, participantAction, isEditing, editUrl, cancelUrl }: { invoice: InvoiceRecord, participantAction: any, isEditing: boolean, editUrl: string, cancelUrl: string }) {
  if (!invoice) return null;
  const participants = invoice.participants || [];
  const unpaid = participants.filter(p => !p.paid);
  const isFullyPaid = unpaid.length === 0;
  return (
    <div className="relative overflow-hidden rounded-lg border-l-4 border-accent bg-[#2b2d31] p-4 shadow-md transition-all hover:bg-[#313338]">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">{invoice.title || "Untitled Invoice"}</h4>
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-mono text-[#b5bac1]">{String(invoice.id || "").substring(0, 8)}</p>
            {isEditing ? (
              <Link href={cancelUrl} title="Cancel Edit" className="text-accent hover:text-white transition-colors">
                <XCircle className="h-4 w-4" />
              </Link>
            ) : (
              <Link href={editUrl} title="Enable Management Mode" className="text-[#b5bac1] hover:text-accent transition-colors">
                <Edit2 className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#b5bac1]"><span>Created by {invoice.creator?.username || "Unknown"}</span><span>•</span><span>{formatDate(invoice.date)}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div><p className="text-[10px] font-bold uppercase text-[#b5bac1]">Total Amount</p><p className="text-sm font-semibold text-accent">{formatCurrency(invoice.totalAmount)}</p></div>
        <div><p className="text-[10px] font-bold uppercase text-[#b5bac1]">Status</p><p className={`text-sm font-semibold ${isFullyPaid ? "text-emerald-400" : "text-amber-400"}`}>{isFullyPaid ? "✓ All Settled" : `× ${unpaid.length} Pending`}</p></div>
      </div>
      <div className="space-y-2 rounded-md bg-[#1e1f22] p-3">
        {participants.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
            <span className="text-xs font-medium text-white">{p.username || "Unknown"}</span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${p.paid ? "text-emerald-400" : "text-amber-400"}`}>{formatCurrency(p.amount)}</span>
              {isEditing ? (
                <form action={participantAction.bind(null, invoice.id, idx, !p.paid)}>
                  <button type="submit" title={p.paid ? "Mark Unpaid" : "Mark Paid"} className={`flex h-6 w-6 items-center justify-center rounded transition-all ${p.paid ? "bg-emerald-500/10 text-emerald-400" : "bg-accent/20 text-accent hover:bg-accent hover:text-black"}`}>
                    {p.paid ? <CheckCircle2 className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                </form>
              ) : (
                <div className={`flex h-6 w-6 items-center justify-center rounded ${p.paid ? "text-emerald-500/40" : "text-white/10"}`}>
                  {p.paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-1 w-1 rounded-full bg-white/20"></div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function InvoiceDashboardPage({ searchParams }: { searchParams: { guild?: string; tab?: string; error?: string; q?: string; status?: string; creator?: string; edit?: string; add?: string } }) {
  const isAuth = await checkAuth();
  if (!isAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6 text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: `nav.fixed.top-0, footer.border-t.border-white\\/5 { display: none !important; }`}} />
        <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/5 bg-[#0d0d0d] p-10 shadow-2xl"><div className="text-center"><div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-yellow-500"><Lock className="h-8 w-8 text-black" /></div><h1 className="text-2xl font-bold tracking-tight">Siggy Secure Access</h1></div><form action={loginAction} className="space-y-5"><input name="user" type="text" placeholder="Username" className="w-full rounded-xl border border-white/10 bg-surface/50 px-5 py-3.5 text-sm outline-none" required /><input name="pass" type="password" placeholder="Password" className="w-full rounded-xl border border-white/10 bg-surface/50 px-5 py-3.5 text-sm outline-none" required /><button type="submit" className="w-full rounded-xl bg-gradient-to-r from-accent to-yellow-400 py-4 font-mono text-xs font-bold uppercase tracking-widest text-black transition-all">Unlock Dashboard</button></form></div>
      </div>
    );
  }

  const selectedGuild = searchParams.guild;
  const activeTab = searchParams.tab || 'overview';
  const editId = searchParams.edit;
  const filters = { q: searchParams.q, status: searchParams.status, creator: searchParams.creator };
  const data = buildDashboardData(selectedGuild, filters);
  const recentInvoices = data.filteredInvoices.slice(0, 15);
  const paidRatio = data.stats.totalParticipants ? Math.round((data.stats.paidParticipants / data.stats.totalParticipants) * 100) : 0;
  const creators = Array.from(new Set(data.allInvoices.map(inv => inv.creator?.username || "Unknown"))).filter(Boolean).sort();

  const buildUrl = (updates: any) => {
    const params = new URLSearchParams();
    if (selectedGuild) params.set('guild', selectedGuild);
    if (activeTab !== 'overview') params.set('tab', activeTab);
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    if (filters.creator) params.set('creator', filters.creator);
    Object.entries(updates).forEach(([k, v]) => { if (v === null || v === undefined || v === 'all' || v === '') params.delete(k); else params.set(k, v as string); });
    return `/invoice/dashboard?${params.toString()}`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `nav.fixed.top-0, footer.border-t.border-white\\/5 { display: none !important; } body { background-color: #0a0a0a !important; } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }`}} />
      <div className="relative z-[100] flex min-h-screen bg-[#0a0a0a] text-text-primary font-sans">
        <aside className="fixed left-0 top-0 hidden h-full w-72 flex-col border-r border-white/5 bg-[#0d0d0d] p-6 lg:flex z-[1000]">
          <div className="mb-10 flex items-center gap-3 px-2"><Receipt className="h-8 w-8 text-accent" /><h2 className="text-xl font-bold tracking-tight">Siggy Control</h2></div>
          <nav className="flex-1 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} href={buildUrl({tab: 'overview'})} />
             <SidebarItem icon={Users} label="Top Debtors" active={activeTab === 'debtors'} href={buildUrl({tab: 'debtors'})} />
             <SidebarItem icon={TrendingUp} label="Analytics" active={activeTab === 'analytics'} href={buildUrl({tab: 'analytics'})} />
             <SidebarItem icon={CreditCard} label="Payment Settings" active={activeTab === 'payments'} href={buildUrl({tab: 'payments'})} />
             <SidebarItem icon={History} label="Invoice Logs" active={activeTab === 'logs'} href={buildUrl({tab: 'logs'})} />
           </nav>
          <div className="mt-auto p-4 rounded-2xl bg-surface/30 border border-white/5 mb-6"><div className="flex items-center gap-2 mb-3"><Wallet className="h-4 w-4 text-accent" /><p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Payment Info</p></div><p className="text-[10px] text-text-primary leading-relaxed opacity-80">Transfer to:<br/><span className="font-bold text-accent">BCA 123456789</span><br/>a/n Siggy Admin<br/><span className="mt-2 block opacity-60 italic">Send proof to Discord bot.</span></p></div>
          <Link href="/" className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors">Exit Terminal</Link>
        </aside>

        <main className="flex-1 lg:ml-72 min-h-screen">
          <header className="sticky top-0 z-[120] flex h-20 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 px-8 backdrop-blur-xl"><h1 className="text-xl font-bold tracking-tight capitalize">{activeTab}</h1><div className="flex items-center gap-4"><div className="flex h-10 items-center gap-3 rounded-full bg-white/5 px-4 border border-white/5"><div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div><span className="text-xs font-bold">Admin Session</span></div></div></header>
          <div className="p-8">
            <div className="mb-10 space-y-6">
              <div className="flex flex-wrap gap-3"><Link href={buildUrl({guild: null})} className={`px-5 py-2 rounded-2xl border text-sm font-bold transition-all ${!selectedGuild ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 bg-surface/40 hover:border-white/10'}`}>All Guilds</Link>{data.guilds.map(g => (<Link key={g.id} href={buildUrl({guild: g.id})} className={`px-5 py-2 rounded-2xl border text-sm font-bold transition-all ${selectedGuild === g.id ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 bg-surface/40 hover:border-white/10'}`}>{String(g.id || "").substring(0, 8)}</Link>))}</div>
              {activeTab === 'logs' && (
                <form action={filterAction} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-surface/20 p-4 rounded-3xl border border-white/5 backdrop-blur-md"><input type="hidden" name="tab" value={activeTab} /><input type="hidden" name="guild" value={selectedGuild || ""} /><div className="flex items-center gap-3 px-4 py-2 bg-black/20 rounded-xl border border-white/5 col-span-1 md:col-span-2"><Search className="h-4 w-4 text-text-secondary" /><input name="q" type="text" placeholder="Search Cindy, title..." className="bg-transparent text-sm outline-none w-full" defaultValue={filters.q} /></div><select name="creator" className="bg-black/20 text-sm outline-none px-4 py-2 rounded-xl border border-white/5" defaultValue={filters.creator || 'all'}><option value="all">All Creators</option>{creators.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}</select><select name="status" className="bg-black/20 text-sm outline-none px-4 py-2 rounded-xl border border-white/5" defaultValue={filters.status || 'all'}><option value="all">All Status</option><option value="paid">Fully Paid</option><option value="unpaid">Has Pending</option></select><button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-yellow-400 transition-all"><Filter className="h-3 w-3" /> Filter</button></form>
              )}
            </div>

            {activeTab === 'overview' && (
              <><div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12"><StatCardMini title="Billing" value={formatCurrency(data.totalAmount)} icon={CircleDollarSign} /><StatCardMini title="Debt" value={formatCurrency(data.outstandingAmount)} icon={CreditCard} colorClass="text-amber-400" /><StatCardMini title="Paid Rate" value={`${paidRatio}%`} icon={TrendingUp} colorClass="text-emerald-400" /><StatCardMini title="Records" value={String(data.stats.totalInvoices)} icon={Receipt} colorClass="text-blue-400" /></div><div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]"><div className="space-y-6"><h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Latest Activity</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentInvoices.slice(0, 4).map(inv => (
                  <DiscordEmbed 
                    key={inv.id} 
                    invoice={inv} 
                    participantAction={markPaidAction} 
                    isEditing={editId === inv.id}
                    editUrl={buildUrl({edit: inv.id})}
                    cancelUrl={buildUrl({edit: null})}
                  />
                ))}
              </div></div><div className="rounded-3xl border border-white/5 bg-surface/20 p-6 h-fit"><h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-400"><Users className="h-5 w-5" /> Top Debtors</h3><div className="space-y-3">{data.topDebtors.slice(0, 10).map((d, i) => (<div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-transparent hover:border-white/10 transition-all"><span className="text-sm font-bold text-text-primary">{d.name}</span><span className="text-sm font-bold text-amber-400">{formatCurrency(d.totalDebt)}</span></div>))}</div></div></div></>
            )}

            {activeTab === 'debtors' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400"><Users className="h-7 w-7" /></div><h2 className="text-2xl font-bold">Debtor Ledger</h2></div><div className="bg-surface/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4"><Wallet className="h-5 w-5 text-accent" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Global Payment Guide</p><p className="text-sm font-bold">BCA 123456789 a/n Siggy Admin</p></div></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.topDebtors.map((debtor, idx) => (
                    <div key={idx} className="flex flex-col rounded-3xl border border-white/5 bg-surface/30 p-6 shadow-xl transition-all hover:border-amber-400/30">
                      <div className="mb-6 flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-text-primary">{debtor.name}</h3>
                          <div className="mt-1 flex items-center gap-2 rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 w-fit"><AlertCircle className="h-3 w-3 text-amber-400" /><span className="text-[10px] font-bold text-amber-400 uppercase">{debtor.unpaidCount} Pending</span></div>
                        </div>
                        <div className="text-right"><p className="text-[10px] font-mono text-text-secondary uppercase">Sisa Utang</p><p className="text-lg font-bold text-amber-400">{formatCurrency(debtor.totalDebt)}</p></div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-text-secondary border-b border-white/5 pb-2 mb-3">Pending Invoices</p>
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {debtor.invoices.map((inv, i) => (
                              <div key={i} className="flex items-center justify-between rounded-xl bg-black/20 p-3 border border-transparent hover:border-white/5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[11px] font-bold text-text-primary">{inv.title || "Untitled"}</span>
                                  <span className="text-[9px] text-text-secondary">{formatDate(inv.date)} • <span className="text-accent/70">by {inv.creatorName}</span></span>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-text-primary">{formatCurrency(inv.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-accent/5 p-4">
                           <div className="flex items-center gap-2 mb-3">
                              <HandCoins className="h-4 w-4 text-accent" />
                              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Payment Recap</p>
                           </div>
                           <div className="space-y-2">
                              {Object.entries(debtor.recap).map(([creator, amount], i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                   <span className="text-text-secondary">Bayar ke <span className="text-text-primary font-bold">{creator}</span>:</span>
                                   <span className="font-mono font-bold text-accent">{formatCurrency(amount as number)}</span>
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* Discord ID Linker */}
                        <div className="mt-4 pt-4">
                          <form action={linkDiscordAction}>
                            <input type="hidden" name="name" value={debtor.name} />
                            <input type="hidden" name="tab" value="debtors" />
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <input 
                                  name="discordId" 
                                  type="text" 
                                  placeholder="Discord User ID (e.g. 148089...)" 
                                  defaultValue={debtor.discordId || ''}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-accent/50 transition-all font-mono"
                                />
                                {debtor.discordId && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                              </div>
                              <button type="submit" title="Save Link" className="bg-white/5 hover:bg-accent hover:text-black p-2 rounded-xl transition-all border border-white/5 group">
                                <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                            <p className="mt-2 text-[9px] text-text-secondary italic">
                              {debtor.discordId 
                                ? `✅ Terhubung ke ID: ${debtor.discordId}`
                                : "💡 Masukkan ID Discord untuk mengaktifkan pengingat otomatis."}
                            </p>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="rounded-3xl border border-white/5 bg-surface/30 p-8"><h3 className="text-xl font-bold mb-8">Revenue Trend</h3><div className="space-y-6">{data.monthlyStats.map((m, i) => (<div key={i} className="space-y-2"><div className="flex justify-between text-xs font-mono"><span>{m.label}</span><span>{formatCurrency(m.amount)}</span></div><div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-accent shadow-[0_0_10px_rgba(255,215,0,0.4)]" style={{ width: `${(m.amount / Math.max(...data.monthlyStats.map(x => x.amount), 1)) * 100}%` }}></div></div></div>))}</div></div><div className="rounded-3xl border border-white/5 bg-surface/30 p-8"><h3 className="text-xl font-bold mb-8">Activity Leaders</h3><div className="space-y-4">{data.topCreators.map((c, i) => (<div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 transition-all"><span className="font-bold">{c.name}</span><span className="font-bold text-accent">{formatCurrency(c.totalCreated)}</span></div>))}</div></div></div>
            )}

            {activeTab === 'logs' && (
               <div className="space-y-8"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Management Logs</h2><p className="text-xs text-text-secondary">{data.filteredInvoices.length} results found</p></div>{data.filteredInvoices.length === 0 ? (<div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-surface/10"><p className="text-text-secondary">No invoices match your filters.</p></div>) : (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                   {data.filteredInvoices.map((inv) => (
                    <DiscordEmbed 
                      key={inv.id} 
                      invoice={inv} 
                      participantAction={markPaidAction} 
                      isEditing={editId === inv.id}
                      editUrl={buildUrl({edit: inv.id})}
                      cancelUrl={buildUrl({edit: null})}
                    />
                  ))}
                 </div>
               )}</div>
             )}

             {activeTab === 'payments' && (
               <div className="space-y-8">
                 <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                     <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent"><CreditCard className="h-7 w-7" /></div>
                     <h2 className="text-2xl font-bold">Payment Information</h2>
                   </div>
                   {!searchParams.add && (
                     <Link href={buildUrl({add: 'true'})} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-black hover:bg-yellow-400 transition-all">
                       <Plus className="h-4 w-4" /> Add New Account
                     </Link>
                   )}
                 </div>
                 
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                   {/* Editor Form - Only visible when add=true */}
                   {searchParams.add ? (
                     <div className="rounded-3xl border border-white/5 bg-surface/30 p-8 h-fit animate-in fade-in slide-in-from-top-4 duration-300">
                       <div className="flex items-center justify-between mb-8">
                         <h3 className="text-lg font-bold flex items-center gap-2"><Edit2 className="h-5 w-5 text-accent" /> New Payment Method</h3>
                         <Link href={buildUrl({add: null})} className="text-text-secondary hover:text-white p-2">
                           <XCircle className="h-5 w-5" />
                         </Link>
                       </div>
                       <form action={savePaymentAction} className="space-y-6">
                          <input type="hidden" name="tab" value="payments" />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-1">Creator Name (Display)</label>
                              <input name="name" type="text" placeholder="e.g. Sopmod" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50" required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-1">Discord Username (@)</label>
                              <input name="discordUser" type="text" placeholder="e.g. decka_tan" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50" required />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-1">Bank Name</label>
                              <input name="bank" type="text" placeholder="Bank BCA" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50" required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-1">Account Number</label>
                              <input name="account" type="text" placeholder="123456789" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-1">Account Holder Name (A.N)</label>
                            <input name="holder" type="text" placeholder="Daffa Adhyatama..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50" required />
                          </div>
                          <button type="submit" className="w-full rounded-xl bg-accent py-4 font-mono text-xs font-bold uppercase tracking-widest text-black hover:bg-yellow-400 transition-all shadow-lg shadow-accent/10">Register Payment Method</button>
                       </form>
                     </div>
                   ) : (
                     <div className="rounded-3xl border border-white/5 bg-surface/20 p-12 flex flex-col items-center justify-center text-center h-fit">
                       <Wallet className="h-12 w-12 text-white/10 mb-4" />
                       <h3 className="text-lg font-bold mb-2">Ready to expand?</h3>
                       <p className="text-sm text-text-secondary mb-6 max-w-xs">Register new creators and their payment details to enable automated reminders across the team.</p>
                       <Link href={buildUrl({add: 'true'})} className="rounded-xl bg-white/5 border border-white/10 px-6 py-2.5 text-xs font-bold hover:bg-white/10 transition-all">Start Registration</Link>
                     </div>
                   )}

                   <div className="space-y-4">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400"><CheckCircle2 className="h-5 w-5" /> Active Billing Methods</h3>
                      <div className="grid gap-4">
                        {(!data.allPayments || Object.entries(data.allPayments).length === 0) ? (
                          <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-surface/10"><p className="text-text-secondary text-sm">No payment accounts set yet.</p></div>
                        ) : (
                          Object.entries(data.allPayments).map(([key, info]: [string, any], i) => {
                            if (!info || typeof info !== 'object') return null;
                            const dUser = info.discordUser || "N/A";
                            const hName = info.name || "N/A";
                            const bName = info.bank || "BCA";
                            const aNum = info.account || "N/A";
                            
                            return (
                              <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-surface/30 p-5 transition-all">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-bold text-accent uppercase tracking-wide">{String(key)}</h4>
                                      <span className="text-[10px] text-text-secondary font-mono">(@{String(dUser)})</span>
                                    </div>
                                    <p className="text-xs font-medium text-text-primary mb-3">A.N {String(hName)}</p>
                                    <div className="flex items-center gap-3">
                                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary">{String(bName)}</span>
                                      <div className="flex items-center gap-1.5 group/copy relative">
                                        <span className="font-mono text-xs text-text-primary tracking-wider">{String(aNum)}</span>
                                        <div 
                                          dangerouslySetInnerHTML={{ __html: `
                                            <button 
                                              onclick="navigator.clipboard.writeText('${aNum}'); alert('Nomor rekening ${key.toUpperCase()} disalin!');"
                                              class="text-accent hover:text-white transition-all cursor-pointer p-1.5 bg-white/5 rounded-md border border-white/5 hover:border-accent/50"
                                              title="Copy Account Number"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                            </button>
                                          ` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <form action={deletePaymentAction}>
                                      <input type="hidden" name="name" value={String(key)} />
                                      <input type="hidden" name="tab" value="payments" />
                                      <div dangerouslySetInnerHTML={{ __html: `
                                        <button 
                                          type="submit" 
                                          onclick="return confirm('Hapus data pembayaran untuk ${key.toUpperCase()}?')"
                                          class="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-red-500/20"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </button>
                                      ` }} />
                                    </form>
                                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-text-secondary">
                                      <CreditCard className="h-5 w-5" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
        </main>
      </div>
    </>
  );
}
