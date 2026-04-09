/**
 * PAYMENT DATABASE
 * JSON file persistence for payment info and name links
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/payment-info.json');

// Initialize DB file if not exists
function initDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      payments: {},    // discordId -> { bank, number, name }
      nameLinks: {}    // nameLower -> { discordId, discordUsername, aliases[] }
    }, null, 2));
  }
}

function readDB() {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      console.error('[Payment DB] Invalid structure, resetting');
      return { payments: {}, nameLinks: {} };
    }
    if (!parsed.payments || typeof parsed.payments !== 'object') {
      parsed.payments = {};
    }
    if (!parsed.nameLinks || typeof parsed.nameLinks !== 'object') {
      parsed.nameLinks = {};
    }
    return parsed;
  } catch (error) {
    console.error('[Payment DB] Read error:', error);
    return { payments: {}, nameLinks: {} };
  }
}

function writeDB(data) {
  initDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[Payment DB] Write error:', error);
    return false;
  }
}

/**
 * Set payment info for a Discord user
 */
function setPaymentInfo(discordId, paymentData) {
  const db = readDB();

  db.payments[discordId] = {
    bank: paymentData.bank || '',
    number: paymentData.number || '',
    name: paymentData.name || '',
    updatedAt: Date.now()
  };

  writeDB(db);
  return { success: true, data: db.payments[discordId] };
}

/**
 * Get payment info by Discord ID
 */
function getPaymentInfo(discordId) {
  const db = readDB();
  return db.payments[discordId] || null;
}

/**
 * Get payment info by username (search)
 */
function getPaymentInfoByUsername(username) {
  const db = readDB();
  const usernameLower = username.toLowerCase();

  for (const [discordId, info] of Object.entries(db.payments)) {
    // Check if this payment info belongs to the username
    const linkedName = Object.entries(db.nameLinks).find(([_, link]) =>
      link.discordId === discordId
    );

    if (linkedName) {
      const [canonicalName, linkData] = linkedName;
      if (canonicalName.toLowerCase() === usernameLower ||
          linkData.discordUsername?.toLowerCase().includes(usernameLower)) {
        return info;
      }
    }
  }

  return null;
}

/**
 * Link a name to Discord user
 * name: The invoice name (e.g., "Cindy", "Abi")
 * discordId: Discord user ID
 * discordUsername: Discord username (with discriminator if available)
 */
function linkName(name, discordId, discordUsername) {
  const db = readDB();
  const nameLower = name.toLowerCase().trim();

  if (!db.nameLinks[nameLower]) {
    db.nameLinks[nameLower] = {
      discordId: discordId,
      discordUsername: discordUsername,
      aliases: [],
      createdAt: Date.now()
    };
  } else {
    // Update existing link
    db.nameLinks[nameLower].discordId = discordId;
    db.nameLinks[nameLower].discordUsername = discordUsername;
  }

  writeDB(db);
  return { success: true, link: db.nameLinks[nameLower] };
}

/**
 * Get name link by invoice name
 */
function getNameLink(name) {
  const db = readDB();
  const nameLower = name.toLowerCase().trim();

  return db.nameLinks[nameLower] || null;
}

/**
 * Get Discord ID by invoice name
 */
function getDiscordIdByName(name) {
  const link = getNameLink(name);
  return link ? link.discordId : null;
}

/**
 * Get all name links (for admin/debug)
 */
function getAllLinks() {
  const db = readDB();
  return Object.entries(db.nameLinks).map(([name, link]) => ({
    name,
    ...link
  }));
}

/**
 * Add alias to a name link
 */
function addAlias(canonicalName, aliasName) {
  const db = readDB();
  const canonicalLower = canonicalName.toLowerCase().trim();
  const aliasLower = aliasName.toLowerCase().trim();

  if (!db.nameLinks[canonicalLower]) {
    return { success: false, error: 'Canonical name not found' };
  }

  if (!db.nameLinks[canonicalLower].aliases) {
    db.nameLinks[canonicalLower].aliases = [];
  }

  if (!db.nameLinks[canonicalLower].aliases.includes(aliasLower)) {
    db.nameLinks[canonicalLower].aliases.push(aliasLower);
    writeDB(db);
  }

  return { success: true };
}

/**
 * Resolve name to Discord ID (with aliases)
 */
function resolveName(name) {
  const db = readDB();
  const nameLower = name.toLowerCase().trim();

  // Direct match
  if (db.nameLinks[nameLower]) {
    return db.nameLinks[nameLower].discordId;
  }

  // Check aliases
  for (const [canonical, link] of Object.entries(db.nameLinks)) {
    if (link.aliases && link.aliases.includes(nameLower)) {
      return link.discordId;
    }
  }

  return null;
}

/**
 * Bulk import name links (for admin setup)
 * Format: [{ name, discordId, discordUsername }]
 */
function bulkImportLinks(links) {
  const db = readDB();
  let imported = 0;

  for (const link of links) {
    const nameLower = link.name.toLowerCase().trim();
    if (!nameLower) continue;

    db.nameLinks[nameLower] = {
      discordId: link.discordId,
      discordUsername: link.discordUsername || '',
      aliases: link.aliases || [],
      createdAt: Date.now()
    };
    imported++;
  }

  writeDB(db);
  return { success: true, imported };
}

module.exports = {
  setPaymentInfo,
  getPaymentInfo,
  getPaymentInfoByUsername,
  linkName,
  getNameLink,
  getDiscordIdByName,
  getAllLinks,
  addAlias,
  resolveName,
  bulkImportLinks,
  readDB,
  writeDB,
};
