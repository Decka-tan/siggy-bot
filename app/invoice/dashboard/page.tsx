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
  Edit2,
  CheckCircle2,
  XCircle,
  Save,
  Trash2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// --- AUTH CONFIG ---
const AUTH_USER = "Sopmod";
const AUTH_PASS = "4r1p1n";
const COOKIE_NAME = "siggy_session_v3"; // Changed name to reset old cookies
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
      httpOnly: true, 
      secure: false, // FORCE FALSE biar bisa jalan di HTTP/IP VPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/' 
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
  
  if (db.invoices && db.invoices[invoiceId] && db.invoices[invoiceId].participants[participantIndex]) {
    db.invoices[invoiceId].participants[participantIndex].paid = isPaid;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }
  return redirect(`/invoice/dashboard?tab=logs`);
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
  topDebtors: { name: string; totalDebt: number; unpaidCount: number; invoiceCount: number; invoices: any[] }[];
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
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getInvoiceDbPath() {
  const candidates = [
    process.env.INVOICE_DB_PATH,
    path.join(process.cwd(), 'discord-bot', 'data', 'invoices.json'),
  ].filter(Boolean) as string[];

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
    return {
      db: { invoices: parsed?.invoices || {}, nameAliases: parsed?.nameAliases || {} },
      dbPath,
    };
  } catch {
    return { db: { invoices: {}, nameAliases: {} }, dbPath };
  }
}

function getCanonicalName(name: string, aliases: Record<string, string[]>) {
  const inputLower = (name || 'Unknown').toLowerCase().trim();
  for (const [canonical, aliasList] of Object.entries(aliases || {})) {
    if (canonical.toLowerCase().trim() === inputLower || aliasList.some(a => a.toLowerCase().trim() === inputLower)) {
      return canonical;
    }
  }
  return name || 'Unknown';
}

function buildDashboardData(selectedGuildId?: string): DashboardData {
  const { db, dbPath } = getInvoiceDb();
  const allInvoices = Object.values(db.invoices || {}).sort((a, b) => b.createdAt - a.createdAt);
  
  const guildMap = new Map<string, number>();
  allInvoices.forEach(inv => {
    if (inv.guildId) guildMap.set(inv.guildId, (guildMap.get(inv.guildId) || 0) + 1);
  });
  
  const guilds: GuildInfo[] = Array.from(guildMap.entries()).map(([id, count]) => ({
    id,
    name: `Server ${id.substring(0, 4)}...`,
    invoiceCount: count
  }));

  const filteredInvoices = selectedGuildId 
    ? allInvoices.filter(inv => inv.guildId === selectedGuildId)
    : allInvoices;

  const participants = filteredInvoices.flatMap((invoice) => invoice.participants || []);
  const unpaidParticipants = participants.filter((participant) => !participant.paid);

  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const outstandingAmount = unpaidParticipants.reduce((sum, participant) => sum + Number(participant.amount || 0), 0);
  const paidAmount = totalAmount - outstandingAmount;

  const creatorMap = new Map<string, { name: string; totalCreated: number; invoiceCount: number }>();
  const debtorMap = new Map<string, { name: string; totalDebt: number; unpaidCount: number; invoiceCount: number; invoices: any[] }>();
  const monthlyMap = new Map<string, { label: string; count: number; amount: number }>();

  for (const invoice of filteredInvoices) {
    const creatorKey = (invoice.creator?.username || 'Unknown').toLowerCase().trim();
    const creatorName = invoice.creator?.username || 'Unknown';
    const creatorStats = creatorMap.get(creatorKey) || { name: creatorName, totalCreated: 0, invoiceCount: 0 };
    creatorStats.totalCreated += Number(invoice.totalAmount || 0);
    creatorStats.invoiceCount += 1;
    creatorMap.set(creatorKey, creatorStats);

    const monthDate = new Date(invoice.date || invoice.createdAt);
    const monthKey = Number.isNaN(monthDate.getTime())
      ? 'unknown'
      : `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = Number.isNaN(monthDate.getTime())
      ? 'Unknown'
      : monthDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    const monthStats = monthlyMap.get(monthKey) || { label: monthLabel, count: 0, amount: 0 };
    monthStats.count += 1;
    monthStats.amount += Number(invoice.totalAmount || 0);
    monthlyMap.set(monthKey, monthStats);

    for (const participant of invoice.participants || []) {
      if (participant.paid) continue;
      const canonical = getCanonicalName(participant.username || 'Unknown', db.nameAliases || {});
      const debtorKey = canonical.toLowerCase().trim();
      
      const debtorStats = debtorMap.get(debtorKey) || {
        name: canonical,
        totalDebt: 0,
        unpaidCount: 0,
        invoiceCount: 0,
        invoices: [],
      };
      debtorStats.totalDebt += Number(participant.amount || 0);
      debtorStats.unpaidCount += 1;
      debtorStats.invoiceCount += 1;
      debtorStats.invoices.push({ id: invoice.id, title: invoice.title, amount: participant.amount, date: invoice.date });
      debtorMap.set(debtorKey, debtorStats);
    }
  }

  return {
    allInvoices,
    filteredInvoices,
    totalAmount,
    outstandingAmount,
    paidAmount,
    guilds,
    topCreators: Array.from(creatorMap.values()).sort((a, b) => b.totalCreated - a.totalCreated).slice(0, 5),
    topDebtors: Array.from(debtorMap.values()).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 40),
    monthlyStats: Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([, v]) => v),
    dbPath,
    stats: {
      totalInvoices: filteredInvoices.length,
      totalParticipants: participants.length,
      paidParticipants: participants.filter((p) => p.paid).length,
      unpaidParticipants: unpaidParticipants.length,
    },
  };
}

// --- Components ---

function SidebarItem({ icon: Icon, label, active = false, href }: { icon: any; label: string; active?: boolean; href: string }) {
  return (
    <Link 
      href={href} 
      className={`relative z-[200] flex items-center gap-3 rounded-xl px-4 py-3 transition-all cursor-pointer ${active ? 'bg-accent/15 text-accent font-medium' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm tracking-wide">{label}</span>
      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(255,215,0,0.6)]"></div>}
    </Link>
  );
}

function StatCardMini({ title, value, icon: Icon, colorClass = "text-accent" }: { title: string; value: string; icon: any; colorClass?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface/30 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary">{title}</p>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <p className="text-xl font-bold tracking-tight text-text-primary">{value}</p>
    </div>
  );
}

function DiscordEmbed({ invoice, participantAction }: { invoice: InvoiceRecord, participantAction: any }) {
  const unpaid = invoice.participants.filter(p => !p.paid);
  const isFullyPaid = unpaid.length === 0;
  
  return (
    <div className="relative overflow-hidden rounded-lg border-l-4 border-accent bg-[#2b2d31] p-4 shadow-md transition-all hover:bg-[#313338]">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">{invoice.title || "Untitled Invoice"}</h4>
          <p className="text-[10px] font-mono text-[#b5bac1]">{invoice.id.substring(0, 8)}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#b5bac1]">
          <span>Created by {invoice.creator.username}</span>
          <span>•</span>
          <span>{formatDate(invoice.date)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-[#b5bac1]">Total Amount</p>
          <p className="text-sm font-semibold text-accent">{formatCurrency(invoice.totalAmount)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-[#b5bac1]">Status</p>
          <p className={`text-sm font-semibold ${isFullyPaid ? "text-emerald-400" : "text-amber-400"}`}>
            {isFullyPaid ? "✓ All Settled" : `× ${unpaid.length} Pending`}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-md bg-[#1e1f22] p-3">
        {invoice.participants.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
            <span className="text-xs font-medium text-white">{p.username}</span>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${p.paid ? "text-emerald-400" : "text-amber-400"}`}>
                {formatCurrency(p.amount)}
              </span>
              <form action={participantAction.bind(null, invoice.id, idx, !p.paid)}>
                <button 
                  type="submit"
                  className={`flex h-6 w-6 items-center justify-center rounded transition-all ${p.paid ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-white/5 text-[#b5bac1] hover:bg-amber-500/20 hover:text-amber-400"}`}
                >
                  {p.paid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="flex items-center gap-1.5 rounded bg-[#4e5058] px-3 py-1.5 text-[10px] font-medium text-white transition-all hover:bg-[#676a74]">
          <Edit2 className="h-3 w-3" /> Edit
        </button>
      </div>
    </div>
  );
}

export default async function InvoiceDashboardPage({ searchParams }: { searchParams: { guild?: string; tab?: string; error?: string } }) {
  const isAuth = await checkAuth();
  
  if (!isAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6 text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: `
          nav.fixed.top-0, footer.border-t.border-white\\/5 { display: none !important; }
        `}} />
        <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/5 bg-[#0d0d0d] p-10 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-yellow-500 shadow-xl shadow-accent/20">
              <Lock className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Siggy Secure Access</h1>
            <p className="mt-2 text-sm text-text-secondary">Please enter your credentials to manage invoices.</p>
          </div>

          <form action={loginAction} className="space-y-5">
            <div>
              <label className="mb-2 block text-[10px] font-mono uppercase tracking-widest text-text-secondary">Username</label>
              <input 
                name="user"
                type="text" 
                placeholder="Enter username"
                className="w-full rounded-xl border border-white/10 bg-surface/50 px-5 py-3.5 text-sm outline-none focus:border-accent/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-mono uppercase tracking-widest text-text-secondary">Password</label>
              <input 
                name="pass"
                type="password" 
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-surface/50 px-5 py-3.5 text-sm outline-none focus:border-accent/50 transition-all"
                required
              />
            </div>
            {searchParams.error && (
              <p className="text-center text-xs font-bold text-red-400">Invalid credentials.</p>
            )}
            <button 
              type="submit"
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-accent to-yellow-400 px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.18em] text-black transition-all hover:scale-[1.02]"
            >
              Unlock Dashboard <Unlock className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const selectedGuild = searchParams.guild;
  const activeTab = searchParams.tab || 'overview';
  const data = buildDashboardData(selectedGuild);
  const recentInvoices = data.filteredInvoices.slice(0, 15);
  const paidRatio = data.stats.totalParticipants ? Math.round((data.stats.paidParticipants / data.stats.totalParticipants) * 100) : 0;

  const buildUrl = (newTab?: string, newGuild?: string | null) => {
    const params = new URLSearchParams();
    const guild = newGuild !== undefined ? newGuild : selectedGuild;
    const tab = newTab !== undefined ? newTab : activeTab;
    if (guild) params.set('guild', guild);
    if (tab && tab !== 'overview') params.set('tab', tab);
    const qs = params.toString();
    return `/invoice/dashboard${qs ? '?' + qs : ''}`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        nav.fixed.top-0, footer.border-t.border-white\\/5 { display: none !important; }
        body { background-color: #0a0a0a !important; }
      `}} />

      <div className="relative z-[100] flex min-h-screen bg-[#0a0a0a] text-text-primary">
        <aside className="fixed left-0 top-0 hidden h-full w-72 flex-col border-r border-white/5 bg-[#0d0d0d] p-6 lg:flex z-[1000]">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-yellow-500 shadow-lg shadow-accent/20">
              <Receipt className="h-6 w-6 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Siggy Control</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-accent/70">Admin Terminal</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 relative z-[1001]">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} href={buildUrl('overview')} />
            <SidebarItem icon={Users} label="Top Debtors" active={activeTab === 'debtors'} href={buildUrl('debtors')} />
            <SidebarItem icon={BarChart3} label="Analytics" active={activeTab === 'analytics'} href={buildUrl('analytics')} />
            <SidebarItem icon={History} label="Invoice Logs" active={activeTab === 'logs'} href={buildUrl('logs')} />
          </nav>

          <div className="mt-auto space-y-4 pt-6 border-t border-white/5 relative z-[1001]">
            <div className="rounded-2xl bg-gradient-to-br from-surface to-black/40 p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs font-medium text-emerald-400">Sync Online</p>
              </div>
            </div>
            <Link href="/" className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer relative z-[1002]">
              Exit Terminal
            </Link>
          </div>
        </aside>

        <main className="flex-1 lg:ml-72 min-h-screen relative z-[105]">
          <header className="sticky top-0 z-[120] flex h-20 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 px-8 backdrop-blur-xl">
            <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold tracking-tight capitalize">{activeTab}</h1>
               {selectedGuild && (
                 <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 border border-accent/20">
                   <Server className="h-3 w-3 text-accent" />
                   <span className="text-[10px] font-mono text-accent">{selectedGuild}</span>
                 </div>
               )}
            </div>
            <div className="flex items-center gap-4">
               <div className="flex h-10 items-center gap-3 rounded-full bg-white/5 px-4 border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-accent"></div>
                  <span className="text-xs font-bold text-text-primary">Admin: {AUTH_USER}</span>
               </div>
            </div>
          </header>

          <div className="p-8 pb-20">
            {/* Guild Switcher */}
            <div className="mb-10">
              <div className="flex flex-wrap gap-3">
                <Link 
                  href={buildUrl(activeTab, null)}
                  className={`group flex items-center gap-3 rounded-2xl border px-5 py-2 transition-all ${!selectedGuild ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface/40 hover:border-white/20'}`}
                >
                  <p className={`text-sm font-bold ${!selectedGuild ? 'text-accent' : 'text-text-primary'}`}>All Guilds</p>
                </Link>
                {data.guilds.map((guild) => (
                  <Link 
                    key={guild.id}
                    href={buildUrl(activeTab, guild.id)}
                    className={`group flex items-center gap-3 rounded-2xl border px-5 py-2 transition-all ${selectedGuild === guild.id ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface/40 hover:border-white/20'}`}
                  >
                    <p className={`text-sm font-bold ${selectedGuild === guild.id ? 'text-accent' : 'text-text-primary'}`}>{guild.id.substring(0, 8)}</p>
                  </Link>
                ))}
              </div>
            </div>

            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
                  <StatCardMini title="Billing" value={formatCurrency(data.totalAmount)} icon={CircleDollarSign} />
                  <StatCardMini title="Debt" value={formatCurrency(data.outstandingAmount)} icon={CreditCard} colorClass="text-amber-400" />
                  <StatCardMini title="Paid Rate" value={`${paidRatio}%`} icon={TrendingUp} colorClass="text-emerald-400" />
                  <StatCardMini title="Total Logs" value={String(data.stats.totalInvoices)} icon={Receipt} colorClass="text-blue-400" />
                </div>
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> Recent Activity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recentInvoices.slice(0, 4).map(inv => (
                        <DiscordEmbed key={inv.id} invoice={inv} participantAction={markPaidAction} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                     <div className="rounded-3xl border border-white/5 bg-surface/20 p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-400"><Users className="h-5 w-5" /> Top Debtors</h3>
                        <div className="space-y-3">
                          {data.topDebtors.slice(0, 8).map((d, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                              <span className="text-sm font-bold">{d.name}</span>
                              <span className="text-sm font-bold text-amber-400">{formatCurrency(d.totalDebt)}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'debtors' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {data.topDebtors.map((debtor, idx) => (
                    <div key={idx} className="flex flex-col rounded-3xl border border-white/5 bg-surface/30 p-6 shadow-xl transition-all hover:border-amber-400/20">
                      <div className="mb-6 flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-text-primary">{debtor.name}</h3>
                          <div className="mt-1 flex items-center gap-2 rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 w-fit">
                            <AlertCircle className="h-3 w-3 text-amber-400" />
                            <span className="text-[10px] font-bold text-amber-400 uppercase">{debtor.unpaidCount} Pending</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">Total Owed</p>
                          <p className="text-lg font-bold text-amber-400">{formatCurrency(debtor.totalDebt)}</p>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <p className="text-[10px] font-bold uppercase text-text-secondary border-b border-white/5 pb-2">Pending Invoices</p>
                        <div className="space-y-2.5">
                          {debtor.invoices.map((inv, i) => (
                            <Link 
                              key={i} 
                              href={buildUrl('logs')} 
                              className="group flex items-center justify-between rounded-xl bg-black/20 p-3 transition-all hover:bg-black/40 border border-transparent hover:border-white/10"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold text-text-primary group-hover:text-accent transition-colors">{inv.title || "Untitled"}</span>
                                <span className="text-[10px] text-text-secondary">{formatDate(inv.date)}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[11px] font-mono font-bold text-text-primary">{formatCurrency(inv.amount)}</span>
                                <ChevronRight className="h-3 w-3 text-text-secondary group-hover:text-accent transition-all" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="rounded-3xl border border-white/5 bg-surface/30 p-8">
                    <h3 className="text-xl font-bold mb-8">Revenue Trend</h3>
                    <div className="space-y-6">
                      {data.monthlyStats.map((m, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span>{m.label}</span>
                            <span>{formatCurrency(m.amount)}</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-accent shadow-[0_0_10px_rgba(255,215,0,0.4)]" style={{ width: `${(m.amount / Math.max(...data.monthlyStats.map(x => x.amount), 1)) * 100}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/5 bg-surface/30 p-8">
                    <h3 className="text-xl font-bold mb-8">Top Creators</h3>
                    <div className="space-y-4">
                      {data.topCreators.map((c, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                          <span className="font-bold">{c.name}</span>
                          <span className="font-bold text-accent">{formatCurrency(c.totalCreated)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold mb-8">Management Logs</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {data.filteredInvoices.map((inv) => (
                    <DiscordEmbed key={inv.id} invoice={inv} participantAction={markPaidAction} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
