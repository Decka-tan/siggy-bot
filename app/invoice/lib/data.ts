import fs from 'fs';
import path from 'path';

// Read side of invoices.json / payment-info.json, shared by the member page and
// the admin page. Writes stay in the admin page under withFileLock.

export type InvoiceParticipant = {
  userId?: string;
  username: string;
  amount: number;
  paid?: boolean;
  notes?: string | null;
};

export type InvoiceRecord = {
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

export type InvoiceDb = {
  invoices?: Record<string, InvoiceRecord>;
  nameAliases?: Record<string, string[]>;
};

export type PaymentInfo = { bank?: string; account?: string; name?: string; discordUser?: string };

export function formatCurrency(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export function formatDate(value?: string | number) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function getInvoiceDbPath() {
  const candidates = [process.env.INVOICE_DB_PATH, path.join(process.cwd(), 'discord-bot', 'data', 'invoices.json')].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0] || path.join(process.cwd(), 'discord-bot', 'data', 'invoices.json');
}

export function getPaymentDbPath() {
  return path.join(process.cwd(), 'discord-bot', 'data', 'payment-info.json');
}

export function getInvoiceDb(): { db: InvoiceDb; dbPath: string } {
  const dbPath = getInvoiceDbPath();
  if (!fs.existsSync(dbPath)) return { db: { invoices: {}, nameAliases: {} }, dbPath };
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    // Spread first: this object gets written back verbatim, so dropping any
    // top-level key the bot owns would silently erase it.
    return {
      db: { ...parsed, invoices: parsed?.invoices || {}, nameAliases: parsed?.nameAliases || {} },
      dbPath,
    };
  } catch {
    return { db: { invoices: {}, nameAliases: {} }, dbPath };
  }
}

export function getPaymentDb(): any {
  const dbPath = getPaymentDbPath();
  if (!fs.existsSync(dbPath)) return { payments: {}, nameLinks: {} };
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return { payments: {}, nameLinks: {} };
  }
}

// Same shape the bot checks for: a real Discord snowflake, not a "temp_" placeholder.
export function isSnowflake(id: unknown): id is string {
  return typeof id === 'string' && /^\d{17,20}$/.test(id);
}

export function getCanonicalName(name: string, aliases: Record<string, string[]>) {
  const inputLower = (name || 'Unknown').toLowerCase().trim();
  for (const [canonical, aliasList] of Object.entries(aliases || {})) {
    if (canonical.toLowerCase().trim() === inputLower || (aliasList || []).some(a => a.toLowerCase().trim() === inputLower)) {
      return canonical;
    }
  }
  return name || 'Unknown';
}

// Mirrors the bot's /bayar lookup (payment.cjs): payments is keyed by Discord id
// for /payment-set entries and by name for dashboard entries.
export function findPaymentInfo(paymentDb: any, creatorId?: string, creatorName?: string): PaymentInfo | null {
  const payments = paymentDb?.payments || {};
  const byKey = (k?: string) => (k ? payments[String(k).toLowerCase().trim()] || null : null);
  const direct = byKey(creatorId) || byKey(creatorName);
  if (direct) return direct;
  // Dashboard entries are keyed by a display name ("sopmod") that nameLinks ties
  // to the creator's Discord id; the bot's lookup misses this one.
  if (creatorId) {
    const linkedKey = Object.keys(payments).find(k => paymentDb?.nameLinks?.[k]?.discordId === creatorId);
    if (linkedKey) return payments[linkedKey];
  }
  if (!creatorName) return null;
  const nameLower = creatorName.toLowerCase();
  for (const [key, info] of Object.entries(payments)) {
    const linked = Object.entries(paymentDb?.nameLinks || {}).find(([, link]: [string, any]) => link?.discordId === key);
    if (!linked) continue;
    const [canonical, link] = linked as [string, any];
    if (canonical.toLowerCase() === nameLower || link?.discordUsername?.toLowerCase().includes(nameLower)) {
      return info as PaymentInfo;
    }
  }
  return null;
}

export type MemberBill = {
  invoiceId: string;
  index: number;
  title: string;
  date: string;
  amount: number;
  paid: boolean;
  creatorId?: string;
  creatorName: string;
};

/**
 * Discord ids a typed name points to, from records made on purpose only: a
 * nameLinks entry, a participant saved with its snowflake, or an invoice creator.
 * The login link goes to these ids' DMs, so a wrong match still can't log anyone
 * in as somebody else — it just pings the wrong inbox.
 */
export function resolveDiscordIds(name: string): string[] {
  const { db } = getInvoiceDb();
  const paymentDb = getPaymentDb();
  const aliases = db.nameAliases || {};
  const target = getCanonicalName(name.trim(), aliases).toLowerCase().trim();
  const typed = name.toLowerCase().trim().replace(/^@/, '');
  const ids = new Set<string>();

  for (const [linkName, link] of Object.entries(paymentDb.nameLinks || {})) {
    const n = linkName.toLowerCase().trim();
    if ((n === typed || getCanonicalName(n, aliases).toLowerCase().trim() === target) && isSnowflake((link as any)?.discordId)) {
      ids.add((link as any).discordId);
    }
  }
  for (const inv of Object.values(db.invoices || {})) {
    if (isSnowflake(inv.creator?.id) && (inv.creator.username || '').toLowerCase().trim() === typed) ids.add(inv.creator.id);
    for (const p of inv.participants || []) {
      if (isSnowflake(p.userId) && getCanonicalName(p.username || '', aliases).toLowerCase().trim() === target) ids.add(p.userId);
    }
  }
  return [...ids].slice(0, 3);
}

export type MemberView = {
  displayName: string;
  owedByCreator: {
    creatorId?: string;
    creatorName: string;
    total: number;
    bills: MemberBill[];
    payment: PaymentInfo | null;
  }[];
  owedTotal: number;
  paidBills: MemberBill[];
  created: (InvoiceRecord & { outstanding: number; unpaidCount: number })[];
  receivableTotal: number;
};

/**
 * Everything one Discord user may see about themselves.
 *
 * Ownership follows the bot's /bayar rule exactly (collectOwnUnpaidBills): the
 * Discord id stored on the participant, or a name that is the user's own
 * username or explicitly linked to their id in nameLinks. Never a fuzzy match,
 * so nobody is shown someone else's debt.
 */
export function buildMemberView(userId: string): MemberView {
  const { db } = getInvoiceDb();
  const paymentDb = getPaymentDb();
  const aliases = db.nameAliases || {};
  const user = { id: userId };
  const invoices = Object.values(db.invoices || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // The bot also counts the caller's Discord username; the web only knows the
  // id, and a creator record is where that username is stored.
  const ownNames = new Set<string>();
  for (const [name, link] of Object.entries(paymentDb.nameLinks || {})) {
    if ((link as any)?.discordId === user.id) ownNames.add(name.toLowerCase().trim());
  }
  const creatorName = invoices.find(inv => inv.creator?.id === user.id)?.creator.username;
  if (creatorName) ownNames.add(creatorName.toLowerCase().trim());
  ownNames.delete('');
  const ownCanonical = new Set([...ownNames].map(n => getCanonicalName(n, aliases).toLowerCase().trim()));
  const displayName =
    creatorName ||
    invoices.flatMap(inv => inv.participants || []).find(p => p.userId === user.id)?.username ||
    [...ownNames][0] ||
    'kamu';
  const owed = new Map<string, MemberView['owedByCreator'][number]>();
  const paidBills: MemberBill[] = [];
  const created: MemberView['created'] = [];

  for (const inv of invoices) {
    (inv.participants || []).forEach((p, idx) => {
      const byId = isSnowflake(p.userId) && p.userId === user.id;
      const byName = ownCanonical.has(getCanonicalName(p.username || '', aliases).toLowerCase().trim());
      if (!byId && !byName) return;

      const bill: MemberBill = {
        invoiceId: inv.id,
        index: idx,
        title: inv.title || 'Untitled',
        date: inv.date,
        amount: Number(p.amount) || 0,
        paid: !!p.paid,
        creatorId: inv.creator?.id,
        creatorName: inv.creator?.username || 'Unknown',
      };
      if (bill.paid) {
        paidBills.push(bill);
        return;
      }
      const key = String(bill.creatorId || bill.creatorName);
      const group = owed.get(key) || { creatorId: bill.creatorId, creatorName: bill.creatorName, total: 0, bills: [], payment: null };
      group.total += bill.amount;
      group.bills.push(bill);
      owed.set(key, group);
    });

    if (inv.creator?.id === user.id) {
      const unpaid = (inv.participants || []).filter(p => !p.paid);
      created.push({
        ...inv,
        outstanding: unpaid.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        unpaidCount: unpaid.length,
      });
    }
  }

  const owedByCreator = [...owed.values()]
    .map(g => ({ ...g, payment: findPaymentInfo(paymentDb, g.creatorId, g.creatorName) }))
    .sort((a, b) => b.total - a.total);

  return {
    displayName,
    owedByCreator,
    owedTotal: owedByCreator.reduce((s, g) => s + g.total, 0),
    paidBills,
    created,
    receivableTotal: created.reduce((s, inv) => s + inv.outstanding, 0),
  };
}
