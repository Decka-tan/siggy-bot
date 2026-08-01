#!/usr/bin/env node
/**
 * Dry run of /invoice-remind: resolves every debtor to a Discord ID and reports
 * how many DMs would actually go out, without sending anything.
 *
 * Answers one question: does one person get more than one reminder because
 * their invoices are spread across several name spellings?
 *
 *   node scripts/check-reminder-dupes.cjs [guildId]
 *
 * The live guild-member search in reminder-system.cjs needs a Discord client and
 * is skipped here, so this covers the stored-id and nameLinks paths only.
 */

const path = require('path');
const { getAllDebtors } = require(path.join(__dirname, '../discord-bot/utils/invoice-db.cjs'));
const { resolveName } = require(path.join(__dirname, '../discord-bot/utils/payment-db.cjs'));

const guildId = process.argv[2] || null;
const isSnowflake = (id) => typeof id === 'string' && /^\d{17,20}$/.test(id);

const debtors = getAllDebtors(guildId);
const byUser = new Map();
const unresolved = [];

for (const d of debtors) {
  let id = isSnowflake(d.userId) ? d.userId : null;
  if (!id) id = resolveName(d.username);
  if (!id && d.canonical) id = resolveName(d.canonical);
  if (!isSnowflake(id)) {
    unresolved.push(d.username);
    continue;
  }
  const entry = byUser.get(id) || { names: [], totalDebt: 0, invoiceIds: [] };
  entry.names.push(d.username);
  entry.totalDebt += d.totalDebt;
  entry.invoiceIds.push(...(d.invoices || []).map(i => i.id));
  byUser.set(id, entry);
}

const merged = [...byUser.entries()].filter(([, v]) => v.names.length > 1);

console.log(`debtor (per nama kanonik) : ${debtors.length}`);
console.log(`tanpa Discord ID          : ${unresolved.length}  (dilewat, gak dikirimi)`);
console.log(`DM yang benar-benar terkirim: ${byUser.size}`);
console.log(`orang yang ke-merge        : ${merged.length}`);

if (merged.length) {
  console.log('\nyang tadinya bakal dapat DM dobel:');
  for (const [id, v] of merged) {
    console.log(`  ${id}  <- ${v.names.join(' + ')}   (total Rp ${v.totalDebt.toLocaleString('id-ID')})`);
  }
}

// Same invoice landing twice on one person means the ledger really has two
// participant rows for them — worth eyeballing, not something to silently drop.
const dupInvoices = [];
for (const [id, v] of byUser) {
  const seen = new Set();
  const dups = v.invoiceIds.filter(x => seen.size === seen.add(x).size);
  if (dups.length) dupInvoices.push(`  ${id}: invoice ${[...new Set(dups)].join(', ')}`);
}
if (dupInvoices.length) {
  console.log('\nPERIKSA — invoice yang sama muncul 2x untuk satu orang:');
  console.log(dupInvoices.join('\n'));
}
