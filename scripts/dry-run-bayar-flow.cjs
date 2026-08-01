#!/usr/bin/env node
/**
 * Walks the whole /bayar flow with fake interactions: slash command → creator
 * dropdown → bill checkboxes → "Lanjut Bayar" button.
 *
 * Nothing is written to disk; the flow only stores an in-memory claim. It is
 * here because the wiring between customIds and handlers cannot be checked any
 * other way without a live Discord session — and a select menu with everything
 * preselected fires no event at all, which is exactly how the confirm button
 * came to be missing the first time.
 *
 *   node scripts/dry-run-bayar-flow.cjs [discordUserId] [username] [guildId]
 */

const path = require('path');
const payment = require(path.join(__dirname, '../discord-bot/commands/payment.cjs'));
const { readDB } = require(path.join(__dirname, '../discord-bot/utils/invoice-db.cjs'));

let [userId, username, guildId] = process.argv.slice(2);

if (!userId) {
  const db = readDB();
  outer: for (const inv of Object.values(db.invoices || {})) {
    for (const p of inv.participants || []) {
      if (!p.paid && /^\d{17,20}$/.test(p.userId || '')) {
        userId = p.userId; username = p.username; guildId = inv.guildId;
        break outer;
      }
    }
  }
}
if (!userId) { console.error('gak ada user ber-Discord-ID di ledger'); process.exit(2); }

const user = { id: userId, username };
let captured = null;

let dmSent = null;
const fakeInteraction = (extra = {}) => ({
  user: { ...user, send: async (x) => { dmSent = x; return x; } },
  guildId,
  guild: { members: { cache: new Map() } },
  reply: async (x) => { captured = x; return x; },
  followUp: async (x) => x,
  update: async (x) => { captured = x; return x; },
  ...extra,
});

const describe = (label) => {
  console.log(`\n--- ${label} ---`);
  if (!captured) return console.log('(tidak ada balasan)');
  if (captured.content) console.log(captured.content.split('\n').slice(0, 4).join('\n'));
  if (captured.embeds?.length) {
    console.log('[embed] ' + (captured.embeds[0].data?.description || '').split('\n').slice(0, 6).join('\n'));
  }
  for (const row of captured.components || []) {
    for (const c of row.components || []) {
      const d = c.data || {};
      // discord.js keeps select options on the builder, not on .data
      const opts = Array.isArray(c.options) ? c.options.map(o => o.data || o) : null;
      const kind = opts ? `select(${opts.length} opsi, max ${d.max_values})` : `button "${d.label}"`;
      console.log(`  [komponen] ${kind}  customId=${d.custom_id}`);
    }
  }
};

(async () => {
  console.log(`user: ${username} (${userId})  guild: ${guildId}`);

  await payment.handleBayar(fakeInteraction());
  describe('1. /bayar');

  const firstComp = captured.components?.[0]?.components?.[0];
  const firstSelect = firstComp?.data;
  const firstOpts = Array.isArray(firstComp?.options) ? firstComp.options.map(o => o.data || o) : [];
  let creatorId;

  if (firstSelect?.custom_id === 'bayar_select_creator') {
    creatorId = firstOpts[0].value;
    await payment.handleBayarSelectCreator(
      fakeInteraction({ customId: 'bayar_select_creator', values: [creatorId] })
    );
    describe(`2. pilih creator ${creatorId}`);
  } else {
    creatorId = String(firstSelect?.custom_id || '').split('|')[1];
    console.log('\n(cuma satu creator — dropdown pertama dilewat)');
  }

  const billComp = captured.components?.[0]?.components?.[0];
  const billOpts = Array.isArray(billComp?.options) ? billComp.options.map(o => o.data || o) : [];
  const btn = captured.components?.[1]?.components?.[0]?.data;
  if (!btn) { console.error('\n❌ TOMBOL KONFIRMASI TIDAK ADA — user bakal kejebak'); process.exit(1); }

  // Untick the first bill to prove the running total follows the selection.
  const all = billOpts.map(o => o.value);
  if (all.length > 1) {
    await payment.handleBayarSelectBills(
      fakeInteraction({ customId: `bayar_select_bills|${creatorId}`, values: all.slice(1) })
    );
    describe('3. hilangin centang 1 tagihan');
  }

  await payment.handleBayarConfirmBills(
    fakeInteraction({ customId: `bayar_confirm_bills|${creatorId}` })
  );
  describe('4. pencet Lanjut Bayar');

  const claim = payment.pendingClaims.get(userId);
  console.log('\n--- klaim yang tersimpan ---');
  if (!claim) { console.error('❌ KLAIM TIDAK TERBENTUK'); process.exit(1); }
  console.log(`invoice tercakup : ${claim.items?.length}`);
  console.log(`total bill       : ${claim.items?.reduce((s, i) => s + i.indices.length, 0)}`);
  console.log(`jumlah           : Rp ${Number(claim.amount).toLocaleString('id-ID')}`);
  console.log(`creator          : ${claim.creatorId}`);
  console.log('\n✅ alur lengkap tanpa mentok');
})();
