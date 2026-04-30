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
  History,
  TrendingUp,
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
      debtorStats.invoices.push({ title: invoice.title, amount: participant.amount, date: invoice.date });
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
    topDebtors: Array.from(debtorMap.values()).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 20),
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

export default function InvoiceDashboardPage({ searchParams }: { searchParams: { guild?: string; tab?: string } }) {
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
        {/* Sidebar */}
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
            <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-[0.25em] text-text-secondary/50">Menu</p>
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} href={buildUrl('overview')} />
            <SidebarItem icon={Users} label="Top Debtors" active={activeTab === 'debtors'} href={buildUrl('debtors')} />
            <SidebarItem icon={BarChart3} label="Analytics" active={activeTab === 'analytics'} href={buildUrl('analytics')} />
            <SidebarItem icon={History} label="Invoice Logs" active={activeTab === 'logs'} href={buildUrl('logs')} />
          </nav>

          <div className="mt-auto space-y-4 pt-6 border-t border-white/5 relative z-[1001]">
            <div className="rounded-2xl bg-gradient-to-br from-surface to-black/40 p-4 border border-white/5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-2">Live Data</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs font-medium text-emerald-400">Sync Online</p>
              </div>
              <p className="text-[9px] font-mono text-text-secondary leading-relaxed break-all opacity-30">
                {data.dbPath}
              </p>
            </div>
            <Link href="/" className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer relative z-[1002]">
              Exit Terminal
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 min-h-screen relative z-[105]">
          {/* Top Bar */}
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
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent/20 to-yellow-500/20 border border-accent/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
            </div>
          </header>

          <div className="p-8 pb-20">
            {/* Guild Switcher (Visible on all tabs) */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Guild Filter</h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link 
                  href={buildUrl(activeTab, null)}
                  className={`group flex items-center gap-3 rounded-2xl border px-5 py-3 transition-all ${!selectedGuild ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface/40 hover:border-white/20'}`}
                >
                  <p className={`text-sm font-bold ${!selectedGuild ? 'text-accent' : 'text-text-primary'}`}>All Guilds</p>
                </Link>
                {data.guilds.map((guild) => (
                  <Link 
                    key={guild.id}
                    href={buildUrl(activeTab, guild.id)}
                    className={`group flex items-center gap-3 rounded-2xl border px-5 py-3 transition-all ${selectedGuild === guild.id ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface/40 hover:border-white/20'}`}
                  >
                    <p className={`text-sm font-bold ${selectedGuild === guild.id ? 'text-accent' : 'text-text-primary'}`}>{guild.id.substring(0, 8)}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* TAB: OVERVIEW */}
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
                    <div className="space-y-4">
                      {recentInvoices.slice(0, 5).map(inv => (
                        <div key={inv.id} className="rounded-2xl border border-white/5 bg-surface/30 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-text-primary text-lg">{inv.title || 'Untitled'}</h3>
                            <p className="text-lg font-bold text-accent">{formatCurrency(inv.totalAmount)}</p>
                          </div>
                          <div className="flex gap-4 text-xs text-text-secondary font-mono">
                            <span>{formatDate(inv.date)}</span>
                            <span>•</span>
                            <span>{inv.creator.username}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                     <div className="rounded-3xl border border-white/5 bg-surface/20 p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-400"><Users className="h-5 w-5" /> Top Debtors</h3>
                        <div className="space-y-3">
                          {data.topDebtors.slice(0, 5).map((d, i) => (
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

            {/* TAB: DEBTORS */}
            {activeTab === 'debtors' && (
              <div className="space-y-8">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="h-6 w-6 text-amber-400" />
                  <h2 className="text-2xl font-bold">Auto-Merged Debtors</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.topDebtors.map((debtor, idx) => (
                    <div key={idx} className="rounded-3xl border border-white/5 bg-surface/30 p-6 hover:border-amber-400/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-text-primary">{debtor.name}</h3>
                        <p className="text-lg font-bold text-amber-400">{formatCurrency(debtor.totalDebt)}</p>
                      </div>
                      <p className="text-xs text-text-secondary mb-4 uppercase tracking-widest">{debtor.unpaidCount} Unpaid Items</p>
                      <div className="space-y-2 pt-4 border-t border-white/5">
                        {debtor.invoices.slice(0, 3).map((inv, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-text-secondary truncate max-w-[120px]">{inv.title}</span>
                            <span className="text-text-primary font-mono">{formatCurrency(inv.amount)}</span>
                          </div>
                        ))}
                        {debtor.invoices.length > 3 && <p className="text-[10px] text-center text-text-secondary pt-2">+ {debtor.invoices.length - 3} more</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="rounded-3xl border border-white/5 bg-surface/30 p-8">
                    <h3 className="text-xl font-bold mb-8">Revenue Trend (6 Months)</h3>
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
                    <h3 className="text-xl font-bold mb-8">Top Creators (Volume)</h3>
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

            {/* TAB: LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-8">Comprehensive Invoice Logs</h2>
                <div className="space-y-4">
                  {data.filteredInvoices.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border border-white/5 bg-surface/20 p-6 hover:bg-surface/30 transition-all">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-text-primary mb-1">{inv.title || 'Untitled'}</h3>
                          <div className="flex gap-3 text-[10px] font-mono text-text-secondary uppercase">
                            <span>{inv.id}</span>
                            <span>•</span>
                            <span>{formatDate(inv.date)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-text-primary">{formatCurrency(inv.totalAmount)}</p>
                          <p className="text-[10px] text-text-secondary uppercase mt-1">Creator: {inv.creator.username}</p>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {inv.participants.map((p, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${p.paid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {p.username}: {formatCurrency(p.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
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
