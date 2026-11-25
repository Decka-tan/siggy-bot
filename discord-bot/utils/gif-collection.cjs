/**
 * GIF CARD COLLECTION
 *
 * Every GIF Siggy replies with (kek keong / kek monyet / tepuk tangan) can drop as
 * a collectible card for the person it replied to. Finishing one whole category
 * (all its GIFs) earns a free lunch: their share on the next lunch invoice Daffa
 * creates in #invoice-makan-siang is marked paid automatically.
 *
 * Made hard on purpose (Daffa, 25 Nov 2026) so the rewards don't run out fast:
 * - only CARD_CHANCE of shown GIFs drop as a card,
 * - a GIF the person already holds doesn't count,
 * - at most one new card per person per day (WIB).
 *
 * data/gif-collection.json:
 *   { users: { <discordId>: { username, cards: { <folder>: [gif names] }, lastCardDay,
 *                             credits: [{ category, earnedAt }], redeemed: [...] } } }
 */
const fs = require('fs');
const path = require('path');
const { withFileLock, writeFileAtomic } = require('./file-lock.cjs');

const DB_FILE = process.env.GIF_COLLECTION_DB_PATH || path.join(__dirname, '../data/gif-collection.json');
const CARD_CHANCE = 1 / 8;
const LUNCH_REWARD = {
  creatorId: '392321900577161219', // decka_tan
  channelId: '1459522899932086420', // #invoice-makan-siang
};

const todayWIB = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

function readDB() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (db && typeof db.users === 'object') return db;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[GIF Collection] Read error:', e.message);
  }
  return { users: {} };
}

function update(mutator) {
  return withFileLock(DB_FILE, () => {
    const db = readDB();
    const out = mutator(db);
    writeFileAtomic(DB_FILE, JSON.stringify(db, null, 2));
    return out;
  });
}

const userOf = (db, userId, username) => {
  const u = (db.users[userId] ||= { username: username || null, cards: {}, lastCardDay: null, credits: [], redeemed: [] });
  if (username) u.username = username;
  return u;
};

/**
 * Called after Siggy sent `gifName` from `category` (asset folder) to `userId`.
 * Returns null when nothing dropped, else { count, total, completed }.
 * `roll` is injectable for tests.
 */
function maybeDropCard({ userId, username, category, gifName, total, roll = Math.random() }) {
  if (!userId || !category || !gifName || !total) return null;
  if (roll >= CARD_CHANCE) return null;
  try {
    return update((db) => {
      const u = userOf(db, userId, username);
      const today = todayWIB();
      if (u.lastCardDay === today) return null;
      const have = (u.cards[category] ||= []);
      if (have.includes(gifName)) return null;
      have.push(gifName);
      u.lastCardDay = today;
      const count = have.length;
      if (count < total) return { count, total, completed: false };
      // Full set: bank one free lunch and start the set over.
      u.credits.push({ category, earnedAt: Date.now() });
      u.cards[category] = [];
      return { count, total, completed: true };
    });
  } catch (e) {
    console.error('[GIF Collection] Drop error:', e.message);
    return null;
  }
}

/**
 * Spend banked free lunches on a freshly created invoice. Only Daffa's invoices in
 * #invoice-makan-siang qualify; one credit pays one unpaid row of that person.
 * Marks the rows paid in invoices.json and in the `invoice` object passed in.
 * Returns [{ userId, username, amount, category }].
 */
function applyLunchRewards(invoice) {
  if (!invoice || invoice.creator?.id !== LUNCH_REWARD.creatorId || invoice.channelId !== LUNCH_REWARD.channelId) return [];
  const invoiceDb = require('./invoice-db.cjs');

  // 1. Take the credits first, under the collection lock.
  const taken = update((db) => {
    const out = [];
    const used = new Set();
    invoice.participants.forEach((p, idx) => {
      if (p.paid || !p.userId || String(p.userId).startsWith('unknown_') || used.has(p.userId)) return;
      const u = db.users[p.userId];
      if (!u || !u.credits?.length) return;
      const credit = u.credits.shift();
      used.add(p.userId);
      out.push({ idx, userId: p.userId, username: p.username, amount: Number(p.amount) || 0, category: credit.category, credit });
      u.redeemed.push({ category: credit.category, invoiceId: invoice.id, amount: Number(p.amount) || 0, at: Date.now() });
    });
    return out;
  });
  if (!taken.length) return [];

  // 2. Mark the rows paid. If that fails, hand the credits back.
  const ok = invoiceDb.updateDB((data) => {
    const inv = data.invoices[invoice.id];
    if (!inv) return false;
    for (const t of taken) {
      const p = inv.participants[t.idx];
      if (!p || p.userId !== t.userId) return false;
      p.paid = true;
      p.notes = [p.notes, `gratis: koleksi GIF ${t.category} lengkap`].filter(Boolean).join(' | ');
    }
  });
  if (!ok) {
    update((db) => {
      for (const t of taken) {
        const u = db.users[t.userId];
        u.credits.unshift(t.credit);
        u.redeemed = u.redeemed.filter((r) => r.invoiceId !== invoice.id);
      }
    });
    console.error(`[GIF Collection] Could not mark rewards paid on ${invoice.id}; credits returned`);
    return [];
  }
  for (const t of taken) {
    const p = invoice.participants[t.idx];
    p.paid = true;
    p.notes = [p.notes, `gratis: koleksi GIF ${t.category} lengkap`].filter(Boolean).join(' | ');
  }
  return taken.map(({ userId, username, amount, category }) => ({ userId, username, amount, category }));
}

module.exports = { maybeDropCard, applyLunchRewards, CARD_CHANCE, LUNCH_REWARD, DB_FILE };
