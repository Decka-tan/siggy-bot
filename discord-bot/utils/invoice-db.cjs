/**
 * INVOICE DATABASE
 * JSON file persistence for invoices
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/invoices.json');

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
    return JSON.parse(data);
  } catch (error) {
    console.error('[Invoice DB] Read error:', error);
    return { invoices: {} };
  }
}

function writeDB(data) {
  initDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[Invoice DB] Write error:', error);
    return false;
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

  // Filter out participants with empty usernames
  const validParticipants = participants.filter(p => p.username && p.username.trim());

  // Add new participants
  validParticipants.forEach(p => {
    invoice.participants.push({
      userId: p.userId,
      username: p.username,
      amount: p.amount,
      paid: false,
    });
  });

  // Recalculate total
  invoice.totalAmount = invoice.participants.reduce((sum, p) => sum + p.amount, 0);

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
  markParticipantPaid,
  markMultiplePaid,
  deleteInvoice,
  calculateTotalOwed,
};
