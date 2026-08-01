#!/usr/bin/env node
/**
 * Dry run of /bayar: shows exactly what each dropdown would contain for a
 * given user, without touching Discord.
 *
 *   node scripts/dry-run-bayar.cjs <discordUserId> [username] [guildId]
 *
 * With no arguments it picks a few real linked users from the ledger and
 * prints what they would see.
 */

const path = require('path');
const payment = require(path.join(__dirname, '../discord-bot/commands/payment.cjs'));
const { readDB } = require(path.join(__dirname, '../discord-bot/utils/invoice-db.cjs'));

// collectOwnUnpaidBills is internal; reach it through the module's own logic by
// re-requiring the file and pulling the function off the compiled exports if
// exposed, otherwise reimplement the same call the command makes.
const collect = payment.__collectOwnUnpaidBills;
if (typeof collect !== 'function') {
  console.error('collectOwnUnpaidBills is not exported — add __collectOwnUnpaidBills to payment.cjs exports for this script.');
  process.exit(2);
}

function report(userId, username, guildId) {
  const bills = collect(guildId, { id: userId, username });
  const total = bills.reduce((s, b) => s + b.amount, 0);

  console.log(`\n=== ${username || '(no username)'}  id=${userId} ===`);
  console.log(`tagihan ketemu: ${bills.length}  |  total Rp ${total.toLocaleString('id-ID')}`);
  if (!bills.length) return;

  const byCreator = new Map();
  for (const b of bills) {
    const k = String(b.creatorId || b.creatorName);
    const g = byCreator.get(k) || { name: b.creatorName, total: 0, items: [] };
    g.total += b.amount;
    g.items.push(b);
    byCreator.set(k, g);
  }

  console.log(`dropdown 1 (bayar ke siapa) — ${byCreator.size} pilihan:`);
  for (const g of byCreator.values()) {
    console.log(`  • ${g.name} — Rp ${g.total.toLocaleString('id-ID')} (${g.items.length} tagihan)`);
  }

  const first = [...byCreator.values()][0];
  console.log(`dropdown 2 untuk "${first.name}" — ${Math.min(first.items.length, 25)} baris:`);
  first.items.slice(0, 25).forEach(b => {
    console.log(`  • ${b.title} — ${b.date} — Rp ${b.amount.toLocaleString('id-ID')}  [${b.invoiceId}#${b.index}]`);
  });
  if (first.items.length > 25) console.log(`  ... ${first.items.length - 25} lagi disembunyiin (batas Discord)`);
}

const [argId, argName, argGuild] = process.argv.slice(2);

if (argId) {
  report(argId, argName, argGuild || null);
} else {
  // Sample real users straight off the ledger.
  const db = readDB();
  const seen = new Map();
  Object.values(db.invoices || {}).forEach(inv =>
    (inv.participants || []).forEach(p => {
      if (p.paid) return;
      if (/^\d{17,20}$/.test(p.userId || '') && !seen.has(p.userId)) {
        seen.set(p.userId, { username: p.username, guildId: inv.guildId });
      }
    })
  );
  const picked = [...seen.entries()].slice(0, 3);
  if (!picked.length) console.log('gak ada user ber-Discord-ID di ledger.');
  picked.forEach(([id, v]) => report(id, v.username, v.guildId));
}
