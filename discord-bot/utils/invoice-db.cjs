/**
 * INVOICE DATABASE
 * JSON file persistence for invoices
 * With simple locking to prevent race conditions
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.INVOICE_DB_PATH || path.join(__dirname, '../data/invoices.json');
const PAYMENT_DB_FILE = path.join(__dirname, '../data/payment-info.json');

function resolveUserIdFromName(username) {
  try {
    if (!fs.existsSync(PAYMENT_DB_FILE)) return null;
    const pDb = JSON.parse(fs.readFileSync(PAYMENT_DB_FILE, 'utf8'));
    const links = pDb.nameLinks || {};
    const key = username.toLowerCase().trim();
    if (links[key]?.discordId) return links[key].discordId;

    // Try via canonical name (alias resolution)
    const iDb = readDB();
    const canonical = getCanonicalName(username, iDb).toLowerCase().trim();
    if (canonical !== key && links[canonical]?.discordId) return links[canonical].discordId;

    return null;
  } catch (e) {
    return null;
  }
}

// Simple in-memory lock for write operations
let writeLock = false;
let pendingWrites = [];

// Initialize DB file if not exists
function initDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ invoices: {} }, null, 2));
  }
}

function readDB() {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      console.error('[Invoice DB] Invalid structure, resetting');
      return { invoices: {}, nameAliases: {} };
    }
    if (!parsed.invoices || typeof parsed.invoices !== 'object') {
      console.error('[Invoice DB] Invalid invoices, resetting');
      return { invoices: {}, nameAliases: {} };
    }
    // Ensure nameAliases exists
    if (!parsed.nameAliases) {
      parsed.nameAliases = {};
    }
    return parsed;
  } catch (error) {
    console.error('[Invoice DB] Read error:', error);
    return { invoices: {}, nameAliases: {} };
  }
}

function writeDB(data) {
  initDB();
  try {
    // Validate data before writing
    if (!data || typeof data !== 'object' || !data.invoices) {
      console.error('[Invoice DB] Invalid data structure, skipping write');
      return false;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[Invoice DB] Write error:', error);
    return false;
  }
}

/**
 * Acquire lock and run operation safely
 */
async function withLock(operation) {
  // Wait for lock to be released
  while (writeLock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  writeLock = true;
  try {
    return await operation();
  } finally {
    writeLock = false;
  }
}

/**
 * Generate unique invoice ID
 */
function generateInvoiceId() {
  return `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new invoice
 */
function createInvoice(guildId, channelId, creator, title, date) {
  const db = readDB();
  const invoiceId = generateInvoiceId();
  const now = Date.now();

  const invoice = {
    id: invoiceId,
    guildId: guildId.toString(),
    channelId: channelId.toString(),
    messageId: null,
    creator: {
      id: creator.id,
      username: creator.username,
    },
    title: title || '',
    date: date,
    createdAt: now,
    participants: [],
    totalAmount: 0,
  };

  db.invoices[invoiceId] = invoice;
  writeDB(db);

  return invoice;
}

/**
 * Add participants to an invoice
 */
function addParticipants(invoiceId, participants) {
  const db = readDB();
  const invoice = db.invoices[invoiceId];

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  // Filter out participants with empty usernames or invalid amounts
  const validParticipants = participants.filter(p => {
    if (!p.username || !p.username.trim()) return false;
    // Validate amount: must be a positive number
    const amount = Number(p.amount);
    if (isNaN(amount) || amount <= 0) return false;
    return true;
  });

  if (validParticipants.length === 0) {
    return { success: false, error: 'No valid participants to add' };
  }

  // Add new participants with validated amounts. We seed the generated userId
  // with the current participants.length (after each push) so that several
  // "unknown" entries added in the same millisecond stay unique — Date.now() +
  // Math.random alone can collide and break the Bayar SelectMenu.
  validParticipants.forEach(p => {
    invoice.participants.push({
      userId: p.userId || resolveUserIdFromName(p.username) || `unknown_${Date.now()}_${invoice.participants.length}_${Math.random().toString(36).slice(2, 5)}`,
      username: p.username,
      amount: Number(p.amount), // Ensure it's a number
      paid: p.paid || false,
    });
  });

  // Recalculate total safely
  invoice.totalAmount = invoice.participants.reduce((sum, p) => {
    const amount = Number(p.amount) || 0;
    return sum + amount;
  }, 0);

  writeDB(db);

  return { success: true, invoice };
}

/**
 * Get a single invoice
 */
function getInvoice(invoiceId) {
  const db = readDB();
  return db.invoices[invoiceId] || null;
}

/**
 * Update invoice message ID
 */
function updateInvoiceMessage(invoiceId, messageId) {
  const db = readDB();
  const invoice = db.invoices[invoiceId];

  if (invoice) {
    invoice.messageId = messageId.toString();
    writeDB(db);
  }
}

/**
 * Get all invoices for a guild
 */
function getGuildInvoices(guildId) {
  const db = readDB();
  const guildInvoices = [];

  for (const invoiceId in db.invoices) {
    const invoice = db.invoices[invoiceId];
    if (invoice.guildId === guildId.toString()) {
      guildInvoices.push(invoice);
    }
  }

  // Sort by creation date, newest first
  return guildInvoices.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get invoices created by a specific user
 */
function getUserInvoices(userId) {
  const db = readDB();
  const userInvoices = [];

  for (const invoiceId in db.invoices) {
    const invoice = db.invoices[invoiceId];
    if (invoice.creator.id === userId.toString()) {
      userInvoices.push(invoice);
    }
  }

  return userInvoices.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get invoices where user is a participant (owes money)
 */
function getUserDebts(userId) {
  const db = readDB();
  const debts = [];

  for (const invoiceId in db.invoices) {
    const invoice = db.invoices[invoiceId];
    // Find if user is a participant in this invoice
    const userParticipation = invoice.participants.find(p =>
      p.userId === userId.toString() || p.username.toLowerCase() === userId.toString().toLowerCase()
    );

    if (userParticipation && !userParticipation.paid) {
      // User owes money in this invoice
      debts.push({
        invoice,
        amount: userParticipation.amount,
        notes: userParticipation.notes || null,
      });
    }
  }

  return debts.sort((a, b) => b.invoice.createdAt - a.invoice.createdAt);
}

/**
 * Get all unique participant names across all invoices (for dropdown)
 * Groups by canonical name using aliases
 * @param {string|null} guildId - Filter by guild ID, or null for all guilds
 */
function getAllParticipantNames(guildId = null) {
  const db = readDB();
  const nameMap = new Map(); // canonicalName -> { totalDebt, unpaidCount, aliases }

  for (const invoiceId in db.invoices) {
    const invoice = db.invoices[invoiceId];

    // Skip if guild filter is set and doesn't match
    if (guildId && invoice.guildId !== guildId.toString()) {
      continue;
    }
    for (const p of invoice.participants) {
      const rawName = p.username;
      // Get canonical name (resolve alias)
      const canonicalName = getCanonicalName(rawName, db.nameAliases);

      if (!nameMap.has(canonicalName)) {
        nameMap.set(canonicalName, {
          totalDebt: 0,
          unpaidCount: 0,
          aliases: new Set(),
        });
      }
      const stats = nameMap.get(canonicalName);
      stats.totalDebt += Number(p.amount) || 0;
      if (!p.paid) {
        stats.unpaidCount += 1;
      }
      // Track all aliases for this canonical name
      if (rawName.toLowerCase() !== canonicalName.toLowerCase()) {
        stats.aliases.add(rawName);
      }
    }
  }

  // Convert to array and sort by debt amount (highest first)
  return Array.from(nameMap.entries())
    .map(([name, stats]) => ({
      name,
      ...stats,
      aliases: Array.from(stats.aliases)
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);
}

/**
 * Get canonical name for a participant (resolves aliases)
 */
function getCanonicalName(participantName, aliases = null) {
  const db = aliases || readDB();
  const nameLower = participantName.toLowerCase();

  // Check if this name is an alias
  for (const [canonical, aliasesList] of Object.entries(db.nameAliases || {})) {
    if (aliasesList.includes(nameLower) || nameLower === canonical.toLowerCase()) {
      return canonical;
    }
  }

  // No alias found, return original name
  return participantName;
}

/**
 * Add name alias (e.g., "Abi" -> "Abimanyu")
 */
function addNameAlias(canonicalName, aliasName) {
  const db = readDB();

  if (!db.nameAliases) {
    db.nameAliases = {};
  }

  const canonicalLower = canonicalName.toLowerCase();
  const aliasLower = aliasName.toLowerCase();

  if (!db.nameAliases[canonicalLower]) {
    db.nameAliases[canonicalLower] = [];
  }

  if (!db.nameAliases[canonicalLower].includes(aliasLower)) {
    db.nameAliases[canonicalLower].push(aliasLower);
    writeDB(db);
    return { success: true, message: `Alias "${aliasName}" -> "${canonicalName}" added` };
  }

  return { success: true, message: `Alias already exists` };
}

/**
 * Get all participants with unpaid debts (grouped by name/id)
 */
function getAllDebtors(guildId = null) {
  const db = readDB();
  const debtorMap = new Map();

  Object.entries(db.invoices || {}).forEach(([id, inv]) => {
    // Filter by guild if provided
    if (guildId && inv.guildId !== guildId) return;

    (inv.participants || []).forEach(p => {
      if (p.paid) return;

      const canonical = getCanonicalName(p.username, db);
      const key = canonical.toLowerCase().trim();
      const isSnowflake = p.userId && /^\d{17,20}$/.test(p.userId);

      if (!debtorMap.has(key)) {
        debtorMap.set(key, {
          username: p.username,
          userId: isSnowflake ? p.userId : null,
          guildId: inv.guildId, // TAMBAHIN INI BOS
          canonical: canonical,
          totalDebt: 0,
          invoices: []
        });
      } else if (isSnowflake && !debtorMap.get(key).userId) {
        // Upgrade to a real snowflake if a later invoice has one
        debtorMap.get(key).userId = p.userId;
      }

      const stats = debtorMap.get(key);
      const amt = Number(p.amount) || 0;
      stats.totalDebt += amt;
      stats.invoices.push({
        id: id,
        title: inv.title || 'Untitled',
        amount: amt,
        creator: inv.creator?.username || 'Unknown',
        date: inv.date
      });
    });
  });

  return Array.from(debtorMap.values());
}

/**
 * Link a participant name to a Discord User ID across all invoices
 */
function linkUserToName(name, userId) {
  const db = readDB();
  const canonical = getCanonicalName(name, db);
  let count = 0;

  Object.values(db.invoices || {}).forEach(inv => {
    (inv.participants || []).forEach(p => {
      const pCanonical = getCanonicalName(p.username, db);
      if (pCanonical === canonical) {
        p.userId = userId;
        count++;
      }
    });
  });

  writeDB(db);
  return { success: true, count: count };
}

/**
 * Get debts by participant name (resolves aliases)
 * @param {string} participantName - Name to search for
 * @param {string|null} guildId - Filter by guild ID, or null for all guilds
 */
function getDebtsByName(participantName, guildId = null) {
  const db = readDB();
  const debts = [];
  const canonicalName = getCanonicalName(participantName, db.nameAliases);
  const canonicalLower = canonicalName.toLowerCase();
  const aliases = db.nameAliases[canonicalLower] || [];

  for (const invoiceId in db.invoices) {
    const invoice = db.invoices[invoiceId];

    // Skip if guild filter is set and doesn't match
    if (guildId && invoice.guildId !== guildId.toString()) {
      continue;
    }
    // Find if participant name matches (canonical OR aliases)
    const userParticipation = invoice.participants.find(p => {
      const pNameLower = p.username.toLowerCase();
      return pNameLower === canonicalLower || aliases.includes(pNameLower);
    });

    if (userParticipation && !userParticipation.paid) {
      debts.push({
        invoice,
        amount: userParticipation.amount,
        notes: userParticipation.notes || null,
      });
    }
  }

  return debts.sort((a, b) => b.invoice.createdAt - a.invoice.createdAt);
}

/**
 * Mark a participant as paid or unpaid
 */
function markParticipantPaid(invoiceId, userId, paid = true) {
  const db = readDB();
  const invoice = db.invoices[invoiceId];

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  const participant = invoice.participants.find(p => p.userId === userId.toString());

  if (!participant) {
    return { success: false, error: 'Participant not found' };
  }

  participant.paid = paid;

  writeDB(db);

  return { success: true, invoice };
}

/**
 * Mark a specific participant entry (by array index) as paid. Used by the
 * /bayar flow because participants can share the same userId (e.g. multiple
 * "Cindy" bills); index is the only stable identifier.
 */
function markParticipantPaidByIndex(invoiceId, idx, paid = true) {
  const db = readDB();
  const invoice = db.invoices[invoiceId];
  if (!invoice) return { success: false, error: 'Invoice not found' };
  const participant = invoice.participants[idx];
  if (!participant) return { success: false, error: 'Participant index out of range' };
  participant.paid = paid;
  writeDB(db);
  return { success: true, invoice };
}

/**
 * Mark multiple participants as paid based on user inputs
 */
function markMultiplePaid(invoiceId, paidUserIds) {
  const db = readDB();
  const invoice = db.invoices[invoiceId];

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  invoice.participants.forEach(p => {
    if (paidUserIds.includes(p.userId)) {
      p.paid = true;
    }
  });

  writeDB(db);

  return { success: true, invoice };
}

/**
 * Delete an invoice
 */
function deleteInvoice(invoiceId) {
  const db = readDB();

  if (!db.invoices[invoiceId]) {
    return { success: false, error: 'Invoice not found' };
  }

  delete db.invoices[invoiceId];
  writeDB(db);

  return { success: true };
}

/**
 * Calculate total unpaid amount for a creator
 */
function calculateTotalOwed(creatorId, guildId) {
  const db = readDB();
  let total = 0;

  for (const invoiceId in db.invoices) {
    const invoice = db.invoices[invoiceId];

    // Check if this invoice was created by the user in the specified guild
    if (invoice.creator.id === creatorId.toString() &&
        (guildId === null || invoice.guildId === guildId.toString())) {
      // Sum up unpaid amounts
      invoice.participants.forEach(p => {
        if (!p.paid) {
          total += p.amount;
        }
      });
    }
  }

  return total;
}

module.exports = {
  createInvoice,
  addParticipants,
  getInvoice,
  updateInvoiceMessage,
  getGuildInvoices,
  getUserInvoices,
  getUserDebts,
  getAllParticipantNames,
  getDebtsByName,
  getCanonicalName,
  getAllDebtors,
  linkUserToName,
  addNameAlias,
  markParticipantPaid,
  markParticipantPaidByIndex,
  markMultiplePaid,
  deleteInvoice,
  calculateTotalOwed,
  readDB,
  writeDB,
};
