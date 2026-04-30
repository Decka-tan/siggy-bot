import fs from 'fs';
import path from 'path';
import Link from 'next/link';
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
} from 'lucide-react';

export const dynamic = 'force-dynamic';

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
  topDebtors: { name: string; totalDebt: number; unpaidCount: number; invoiceCount: number }[];
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
  // AUTO-MERGE: Normalize to lowercase for matching, but keep it robust
  const inputLower = (name || 'Unknown').toLowerCase().trim();

  // 1. Check explicit aliases first
  for (const [canonical, aliasList] of Object.entries(aliases || {})) {
    if (canonical.toLowerCase().trim() === inputLower || aliasList.some(a => a.toLowerCase().trim() === inputLower)) {
      return canonical;
    }
  }

  // 2. Fallback to just the name (the caller will handle lowercase grouping)
  return name || 'Unknown';
}

function buildDashboardData(selectedGuildId?: string): DashboardData {
  const { db, dbPath } = getInvoiceDb();
  const allInvoices = Object.values(db.invoices || {}).sort((a, b) => b.createdAt - a.createdAt);
  
  // Guild mapping
  const guildMap = new Map<string, number>();
  allInvoices.forEach(inv => {
    if (inv.guildId) guildMap.set(inv.guildId, (guildMap.get(inv.guildId) || 0) + 1);
  });
  
  const guilds: GuildInfo[] = Array.from(guildMap.entries()).map(([id, count]) => ({
    id,
    name: `Server ${id.substring(0, 4)}...`,
    invoiceCount: count
  }));

  // Filtering
  const filteredInvoices = selectedGuildId 
    ? allInvoices.filter(inv => inv.guildId === selectedGuildId)
    : allInvoices;

  const participants = filteredInvoices.flatMap((invoice) => invoice.participants || []);
  const unpaidParticipants = participants.filter((participant) => !participant.paid);

  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const outstandingAmount = unpaidParticipants.reduce((sum, participant) => sum + Number(participant.amount || 0), 0);
  const paidAmount = totalAmount - outstandingAmount;

  const creatorMap = new Map<string, { name: string; totalCreated: number; invoiceCount: number }>();
  const debtorMap = new Map<string, { name: string; totalDebt: number; unpaidCount: number; invoiceCount: number }>();
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
      
      // AUTO-MERGE: Normalize name for grouping
      const canonical = getCanonicalName(participant.username || 'Unknown', db.nameAliases || {});
      const debtorKey = canonical.toLowerCase().trim();
      
      const debtorStats = debtorMap.get(debtorKey) || {
        name: canonical, // Keep the display name
        totalDebt: 0,
        unpaidCount: 0,
        invoiceCount: 0,
      };
      debtorStats.totalDebt += Number(participant.amount || 0);
      debtorStats.unpaidCount += 1;
      debtorStats.invoiceCount += 1;
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
    topDebtors: Array.from(debtorMap.values()).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 10),
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

function SidebarItem({ icon: Icon, label, active = false, href = '#' }: { icon: any; label: string; active?: boolean; href?: string }) {
  return (
    <Link 
      href={href} 
      className={`relative z-50 flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${active ? 'bg-accent/15 text-accent font-medium' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
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

export default function InvoiceDashboardPage({ searchParams }: { searchParams: { guild?: string } }) {
  const selectedGuild = searchParams.guild;
  const data = buildDashboardData(selectedGuild);
  const recentInvoices = data.filteredInvoices.slice(0, 10);
  const paidRatio = data.stats.totalParticipants ? Math.round((data.stats.paidParticipants / data.stats.totalParticipants) * 100) : 0;

  return (
    <>
      {/* MAGIC CSS: Hide global Header & Footer for this page only */}
      <style dangerouslySetInnerHTML={{ __html: `
        nav.fixed.top-0, footer.border-t.border-white\\/5 { display: none !important; }
        body { background-color: #0a0a0a !important; }
      `}} />

      <div className="relative z-[100] flex min-h-screen bg-[#0a0a0a] text-text-primary">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 hidden h-full w-72 flex-col border-r border-white/5 bg-[#0d0d0d] p-6 lg:flex z-[110]">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-yellow-500 shadow-lg shadow-accent/20">
              <Receipt className="h-6 w-6 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Siggy Control</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-accent/70">Terminal v2</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-text-secondary/50">Navigation</p>
            <SidebarItem icon={LayoutDashboard} label="Overview" active href="/invoice/dashboard" />
            <SidebarItem icon={Users} label="Debtors (Auto-Merged)" href="#" />
            <SidebarItem icon={BarChart3} label="Guild Analytics" href="#" />
            <SidebarItem icon={Receipt} label="Invoice Logs" href="#" />
          </nav>

          <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
            <div className="rounded-2xl bg-gradient-to-br from-surface to-black/40 p-4 border border-white/5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-2">Live Database</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-xs font-medium text-emerald-400">Connection Active</p>
              </div>
              <p className="text-[9px] font-mono text-text-secondary leading-relaxed break-all opacity-40">
                {data.dbPath}
              </p>
            </div>
            <Link href="/" className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors">
              Exit Terminal
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 min-h-screen relative z-[105]">
          {/* Top Bar */}
          <header className="sticky top-0 z-[120] flex h-20 items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 px-8 backdrop-blur-xl">
            <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold tracking-tight">Financial Overview</h1>
               {selectedGuild && (
                 <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 border border-accent/20">
                   <Server className="h-3 w-3 text-accent" />
                   <span className="text-[10px] font-mono text-accent">{selectedGuild}</span>
                 </div>
               )}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/5">
                <Search className="h-4 w-4 text-text-secondary" />
                <input type="text" placeholder="Search entries..." className="bg-transparent text-xs outline-none w-40" />
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent/20 to-yellow-500/20 border border-accent/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
            </div>
          </header>

          <div className="p-8 pb-20">
            {/* Guild Switcher */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Select Active Guild</h3>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Link 
                  href="/invoice/dashboard"
                  className={`group flex items-center gap-3 rounded-2xl border px-5 py-3.5 transition-all ${!selectedGuild ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(255,215,0,0.05)]' : 'border-white/5 bg-surface/40 hover:border-white/20'}`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!selectedGuild ? 'bg-accent text-black' : 'bg-white/5 text-text-secondary'}`}>
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${!selectedGuild ? 'text-accent' : 'text-text-primary'}`}>All Guilds</p>
                    <p className="text-[10px] text-text-secondary">{data.allInvoices.length} Total</p>
                  </div>
                </Link>

                {data.guilds.map((guild) => (
                  <Link 
                    key={guild.id}
                    href={`/invoice/dashboard?guild=${guild.id}`}
                    className={`group flex items-center gap-3 rounded-2xl border px-5 py-3.5 transition-all ${selectedGuild === guild.id ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(255,215,0,0.05)]' : 'border-white/5 bg-surface/40 hover:border-white/20'}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedGuild === guild.id ? 'bg-accent text-black' : 'bg-white/5 text-text-secondary'}`}>
                      <Server className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${selectedGuild === guild.id ? 'text-accent' : 'text-text-primary'}`}>ID: {guild.id.substring(0, 8)}</p>
                      <p className="text-[10px] text-text-secondary">{guild.invoiceCount} Invoices</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
              <StatCardMini title="Gross Billing" value={formatCurrency(data.totalAmount)} icon={CircleDollarSign} />
              <StatCardMini title="Net Outstanding" value={formatCurrency(data.outstandingAmount)} icon={CreditCard} colorClass="text-amber-400" />
              <StatCardMini title="Collection Rate" value={`${paidRatio}%`} icon={BarChart3} colorClass="text-emerald-400" />
              <StatCardMini title="Records" value={String(data.stats.totalInvoices)} icon={Receipt} colorClass="text-blue-400" />
            </div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
              {/* Recent Activity */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    <h2 className="text-xl font-bold tracking-tight">Recent Invoices</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {recentInvoices.map((invoice) => {
                    const unpaid = invoice.participants.filter(p => !p.paid);
                    const isFullyPaid = unpaid.length === 0;

                    return (
                      <div key={invoice.id} className="rounded-2xl border border-white/5 bg-surface/30 p-6 transition-all hover:border-white/10">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-text-primary">{invoice.title || 'Untitled'}</h3>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isFullyPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                {isFullyPaid ? 'Settled' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <span className="text-text-primary">{invoice.creator?.username}</span>
                              <span>•</span>
                              <span>{formatDate(invoice.date)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1">Total</p>
                            <p className="text-lg font-bold text-text-primary">{formatCurrency(invoice.totalAmount)}</p>
                          </div>
                        </div>

                        {/* List entries */}
                        <div className="mt-6 divide-y divide-white/5 rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                          {invoice.participants.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs">
                              <span className="text-text-primary">{p.username}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-text-secondary">{formatCurrency(p.amount)}</span>
                                <span className={p.paid ? 'text-emerald-400' : 'text-amber-400'}>{p.paid ? '✓' : '×'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {recentInvoices.length === 0 && <p className="text-center py-20 text-text-secondary border border-dashed border-white/10 rounded-3xl">No data available.</p>}
                </div>
              </div>

              {/* Debtors & Analytics */}
              <div className="space-y-8">
                {/* AUTO-MERGED DEBTORS */}
                <div className="rounded-3xl border border-white/5 bg-surface/20 p-6 shadow-2xl">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-5 w-5 text-amber-400" />
                      <h2 className="text-lg font-bold tracking-tight">Top Debtors</h2>
                    </div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest">Auto-merged Case-Insensitive</p>
                  </div>
                  
                  <div className="space-y-3">
                    {data.topDebtors.map((debtor, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 p-4 border border-transparent">
                        <div>
                          <p className="text-sm font-bold text-text-primary">{debtor.name}</p>
                          <p className="text-[10px] text-text-secondary mt-0.5">{debtor.unpaidCount} unpaid items</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-400">{formatCurrency(debtor.totalDebt)}</p>
                        </div>
                      </div>
                    ))}
                    {data.topDebtors.length === 0 && <p className="text-xs text-text-secondary text-center py-10">Zero debt detected. Clean slate!</p>}
                  </div>
                </div>

                {/* CREATORS */}
                <div className="rounded-3xl border border-white/5 bg-surface/20 p-6 shadow-2xl">
                  <h2 className="text-lg font-bold tracking-tight mb-6">Activity Leaders</h2>
                  <div className="space-y-3">
                    {data.topCreators.map((creator, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                         <p className="text-sm font-bold text-text-primary">{creator.name}</p>
                         <p className="text-sm font-bold text-text-primary">{formatCurrency(creator.totalCreated)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
