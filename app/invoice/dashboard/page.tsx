import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  CircleDollarSign,
  CreditCard,
  Receipt,
  Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';


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

type DashboardData = {
  invoices: InvoiceRecord[];
  totalAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  topCreators: { name: string; totalCreated: number; invoiceCount: number }[];
  topDebtors: { name: string; totalDebt: number; unpaidCount: number; invoiceCount: number }[];
  monthlyStats: { label: string; count: number; amount: number }[];
  stats: {
    totalInvoices: number;
    totalParticipants: number;
    paidParticipants: number;
    unpaidParticipants: number;
    uniqueGuilds: number;
  };
  dbPath: string;
};

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
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || path.join(process.cwd(), 'discord-bot', 'data', 'invoices.json');
}

function getInvoiceDb(): { db: InvoiceDb; dbPath: string } {
  const dbPath = getInvoiceDbPath();

  if (!fs.existsSync(dbPath)) {
    return { db: { invoices: {}, nameAliases: {} }, dbPath };
  }

  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      db: {
        invoices: parsed?.invoices || {},
        nameAliases: parsed?.nameAliases || {},
      },
      dbPath,
    };
  } catch {
    return { db: { invoices: {}, nameAliases: {} }, dbPath };
  }
}

function getCanonicalName(name: string, aliases: Record<string, string[]>) {
  const lower = name.toLowerCase();

  for (const [canonical, aliasList] of Object.entries(aliases || {})) {
    if (canonical.toLowerCase() === lower || aliasList.includes(lower)) {
      return canonical;
    }
  }

  return name;
}

function buildDashboardData(): DashboardData {
  const { db, dbPath } = getInvoiceDb();
  const invoices = Object.values(db.invoices || {}).sort((a, b) => b.createdAt - a.createdAt);
  const participants = invoices.flatMap((invoice) => invoice.participants || []);
  const unpaidParticipants = participants.filter((participant) => !participant.paid);

  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const outstandingAmount = unpaidParticipants.reduce((sum, participant) => sum + Number(participant.amount || 0), 0);
  const paidAmount = totalAmount - outstandingAmount;

  const creatorMap = new Map<string, { name: string; totalCreated: number; invoiceCount: number }>();
  const debtorMap = new Map<string, { name: string; totalDebt: number; unpaidCount: number; invoiceCount: number }>();
  const monthlyMap = new Map<string, { label: string; count: number; amount: number }>();
  const guildSet = new Set<string>();

  for (const invoice of invoices) {
    if (invoice.guildId) guildSet.add(invoice.guildId);

    const creatorKey = invoice.creator?.id || invoice.creator?.username || 'unknown';
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
      const debtorKey = canonical.toLowerCase();
      const debtorStats = debtorMap.get(debtorKey) || {
        name: canonical,
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

  const topCreators = Array.from(creatorMap.values()).sort((a, b) => b.totalCreated - a.totalCreated).slice(0, 5);
  const topDebtors = Array.from(debtorMap.values()).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 8);
  const monthlyStats = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([, value]) => value);

  return {
    invoices,
    totalAmount,
    outstandingAmount,
    paidAmount,
    topCreators,
    topDebtors,
    monthlyStats,
    dbPath,
    stats: {
      totalInvoices: invoices.length,
      totalParticipants: participants.length,
      paidParticipants: participants.filter((participant) => participant.paid).length,
      unpaidParticipants: unpaidParticipants.length,
      uniqueGuilds: guildSet.size,
    },
  };
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-bg/55 p-6 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.18)] transition-all hover:border-accent/30 hover:shadow-[0_0_30px_rgba(255,215,0,0.08)]">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-text-secondary">{title}</p>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-yellow-400/20 text-accent">
          {icon}
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-2xl font-semibold text-text-primary sm:text-3xl">{value}</h3>
        <p className="text-sm leading-6 text-text-secondary">{subtitle}</p>
      </div>
    </div>
  );
}

export default function InvoiceDashboardPage() {
  const { invoices, topCreators, topDebtors, monthlyStats, totalAmount, outstandingAmount, paidAmount, stats, dbPath } = buildDashboardData();
  const recentInvoices = invoices.slice(0, 10);
  const paidRatio = stats.totalParticipants ? Math.round((stats.paidParticipants / stats.totalParticipants) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <section className="relative overflow-hidden border-b border-white/5 pt-28 sm:pt-32">
        <div className="absolute inset-0 z-0 hidden md:block">
          <div className="absolute inset-0 bg-bg z-10" style={{ clipPath: 'polygon(0 0, 68% 0, 52% 100%, 0 100%)' }}></div>
          <div className="absolute inset-0 bg-accent z-0 opacity-90" style={{ clipPath: 'polygon(67% 0, 70% 0, 54% 100%, 51% 100%)' }}></div>
          <div className="absolute inset-0 bg-accent z-0 opacity-70" style={{ clipPath: 'polygon(71% 0, 72% 0, 56% 100%, 55% 100%)' }}></div>
          <div className="absolute inset-0 bg-[#333333] z-[-1]" style={{ clipPath: 'polygon(68% 0, 100% 0, 100% 100%, 52% 100%)' }}>
            <div
              className="absolute inset-0 opacity-90"
              style={{
                backgroundColor: '#333333',
                backgroundImage: `linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555),
                                  linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555)`,
                backgroundSize: '90px 90px',
                backgroundPosition: '0 0, 45px 45px',
              }}
            ></div>
          </div>
        </div>

        <div className="absolute inset-0 z-0 block md:hidden">
          <div className="absolute inset-0 bg-bg z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 58%, 0 72%)' }}></div>
          <div className="absolute inset-0 bg-accent z-0 opacity-90" style={{ clipPath: 'polygon(0 69%, 100% 56%, 100% 58%, 0 71%)' }}></div>
          <div className="absolute inset-0 bg-accent z-0 opacity-70" style={{ clipPath: 'polygon(0 72%, 100% 59%, 100% 61%, 0 74%)' }}></div>
          <div className="absolute inset-0 bg-[#333333] z-[-1]" style={{ clipPath: 'polygon(0 58%, 100% 45%, 100% 100%, 0 100%)' }}>
            <div
              className="absolute inset-0 opacity-90"
              style={{
                backgroundColor: '#333333',
                backgroundImage: `linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555),
                                  linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555)`,
                backgroundSize: '60px 60px',
                backgroundPosition: '0 0, 30px 30px',
              }}
            ></div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-8 lg:pb-24">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.24em] text-accent">
                <BarChart3 className="h-3.5 w-3.5" /> Invoice dashboard
              </div>
              <h1 className="text-4xl font-display tracking-tight text-accent sm:text-6xl lg:text-7xl">
                SIGGY INVOICE<br />CONTROL PANEL
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
                Dashboard invoice yang baca langsung dari storage bot di VPS. Karena folder deployment-mu sama, page ini akan read file invoice yang sama dengan Discord bot dan nunjukin summary invoice tanpa perlu manage lewat Discord lagi.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/#about" className="w-full sm:w-auto">
                  <button className="w-full rounded-xl border border-border bg-surface px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-text-primary transition-all hover:border-accent hover:text-accent">
                    Back to site
                  </button>
                </Link>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-4 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-text-secondary">
                  <CalendarRange className="h-4 w-4 text-accent" /> Live file: <span className="max-w-[260px] truncate text-text-primary">{dbPath}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/35 p-6 backdrop-blur-sm shadow-2xl">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-text-secondary">Snapshot</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">Invoice system health</p>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-300">
                  Live
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-bg/60 p-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-secondary">Invoices</p>
                  <p className="mt-2 text-2xl font-semibold">{stats.totalInvoices}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-bg/60 p-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-secondary">Guilds</p>
                  <p className="mt-2 text-2xl font-semibold">{stats.uniqueGuilds}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-bg/60 p-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-secondary">Participants</p>
                  <p className="mt-2 text-2xl font-semibold">{stats.totalParticipants}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-bg/60 p-4">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-secondary">Paid ratio</p>
                  <p className="mt-2 text-2xl font-semibold text-accent">{paidRatio}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface px-6 py-8 sm:px-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total invoices"
            value={String(stats.totalInvoices)}
            subtitle={`${stats.totalParticipants} participant entries tracked`}
            icon={<Receipt className="h-5 w-5" />}
          />
          <StatCard
            title="Total amount"
            value={formatCurrency(totalAmount)}
            subtitle={`${formatCurrency(paidAmount)} already settled`}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(outstandingAmount)}
            subtitle={`${stats.unpaidParticipants} unpaid participant entries`}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <StatCard
            title="Coverage"
            value={`${stats.uniqueGuilds} guild${stats.uniqueGuilds === 1 ? '' : 's'}`}
            subtitle="Detected from existing invoice records"
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      </section>

      <section className="border-t border-border bg-bg px-6 py-12 sm:px-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-surface/50 p-6 backdrop-blur-sm shadow-xl">
              <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-2xl font-display tracking-tight text-text-primary">Recent invoices</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Latest activity from the same JSON source used by the Discord bot.
                  </p>
                </div>
                <div className="hidden rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-accent sm:block">
                  Last {Math.min(recentInvoices.length, 10)} shown
                </div>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-text-secondary">
                  Belum ada invoice di database. Begitu bot bikin invoice pertama di VPS, dashboard ini langsung ngikut.
                </div>
              ) : (
                <div className="space-y-5">
                  {recentInvoices.map((invoice) => {
                    const unpaid = invoice.participants.filter((participant) => !participant.paid);
                    const paid = invoice.participants.length - unpaid.length;
                    const outstanding = unpaid.reduce((sum, participant) => sum + Number(participant.amount || 0), 0);

                    return (
                      <div key={invoice.id} className="rounded-3xl border border-white/10 bg-black/25 p-5 transition-all hover:border-accent/20">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold text-text-primary">{invoice.title || 'Untitled Invoice'}</h3>
                              <span className="rounded-full border border-white/10 bg-bg/60 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary">
                                {formatDate(invoice.date)}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary">
                              Created by <span className="text-text-primary">{invoice.creator?.username || 'Unknown'}</span>
                              <span className="mx-2 text-white/20">•</span>
                              Guild <span className="text-text-primary">{invoice.guildId}</span>
                            </p>
                            <p className="break-all font-mono text-[11px] uppercase tracking-[0.12em] text-text-secondary">{invoice.id}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[440px]">
                            <div className="rounded-2xl border border-white/10 bg-bg/50 p-3.5">
                              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary">Total</p>
                              <p className="mt-1.5 text-sm font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-bg/50 p-3.5">
                              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary">Participants</p>
                              <p className="mt-1.5 text-sm font-semibold">{invoice.participants.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-bg/50 p-3.5">
                              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary">Paid</p>
                              <p className="mt-1.5 text-sm font-semibold text-emerald-300">{paid}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-bg/50 p-3.5">
                              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary">Outstanding</p>
                              <p className="mt-1.5 text-sm font-semibold text-amber-300">{formatCurrency(outstanding)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-bg/40">
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-text-secondary">
                                <th className="px-4 py-3 font-medium">Participant</th>
                                <th className="px-4 py-3 font-medium">Amount</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.participants.map((participant, index) => (
                                <tr
                                  key={`${invoice.id}-${participant.userId || participant.username}-${index}`}
                                  className="border-b border-white/10 last:border-0"
                                >
                                  <td className="px-4 py-3 text-text-primary">{participant.username}</td>
                                  <td className="px-4 py-3">{formatCurrency(participant.amount)}</td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${participant.paid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}
                                    >
                                      {participant.paid ? 'Paid' : 'Unpaid'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-text-secondary">{participant.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-surface/50 p-6 shadow-xl backdrop-blur-sm">
              <div className="mb-5 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-display tracking-tight">Top debtors</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Grouped with the same alias logic used by the invoice bot.</p>
              </div>

              {topDebtors.length === 0 ? (
                <p className="text-sm text-text-secondary">No unpaid debt found.</p>
              ) : (
                <div className="space-y-3">
                  {topDebtors.map((debtor, index) => (
                    <div key={`${debtor.name}-${index}`} className="rounded-2xl border border-white/10 bg-bg/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{debtor.name}</p>
                          <p className="mt-1 text-xs text-text-secondary">{debtor.unpaidCount} unpaid entries across {debtor.invoiceCount} item(s)</p>
                        </div>
                        <p className="text-sm font-semibold text-amber-300">{formatCurrency(debtor.totalDebt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-surface/50 p-6 shadow-xl backdrop-blur-sm">
              <div className="mb-5 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-display tracking-tight">Top creators</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Who has created the most invoice value.</p>
              </div>

              {topCreators.length === 0 ? (
                <p className="text-sm text-text-secondary">No creator stats yet.</p>
              ) : (
                <div className="space-y-3">
                  {topCreators.map((creator, index) => (
                    <div key={`${creator.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-bg/50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{creator.name}</p>
                        <p className="mt-1 text-xs text-text-secondary">{creator.invoiceCount} invoice(s)</p>
                      </div>
                      <p className="text-sm font-semibold text-accent">{formatCurrency(creator.totalCreated)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-surface/50 p-6 shadow-xl backdrop-blur-sm">
              <div className="mb-5 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-display tracking-tight">Monthly trend</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Last 6 months based on invoice date.</p>
              </div>

              {monthlyStats.length === 0 ? (
                <p className="text-sm text-text-secondary">No monthly data yet.</p>
              ) : (
                <div className="space-y-3">
                  {monthlyStats.map((month) => (
                    <div key={month.label} className="rounded-2xl border border-white/10 bg-bg/50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-text-primary">{month.label}</p>
                        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-secondary">{month.count} invoice(s)</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-yellow-400"
                          style={{ width: `${Math.max(12, Math.min(100, (month.count / Math.max(...monthlyStats.map((item) => item.count), 1)) * 100))}%` }}
                        ></div>
                      </div>
                      <p className="mt-3 text-sm text-accent">{formatCurrency(month.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface px-6 py-12 sm:px-8 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-bg/40 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-display tracking-tight text-text-primary">Production-ready for VPS sync</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
                Selama Next app dan Discord bot jalan di folder yang sama di VPS, dashboard ini otomatis baca invoice live dari storage yang sama. Kalau nanti path-mu berubah, cukup set <code className="rounded bg-black/30 px-2 py-1 font-mono text-[11px] text-accent">INVOICE_DB_PATH</code> tanpa ubah code lagi.
              </p>
            </div>
            <Link href="/chat?new=true" className="w-full lg:w-auto">
              <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-accent to-yellow-400 px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.18em] text-black transition-all hover:from-yellow-400 hover:to-accent lg:w-auto">
                Open Siggy <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
