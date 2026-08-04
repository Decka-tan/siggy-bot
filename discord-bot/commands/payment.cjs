/**
 * PAYMENT COMMANDS
 * Handle payment info, name linking, and payment claims
 */

const {
  getPaymentInfo,
  getPaymentInfoByUsername,
  setPaymentInfo,
  linkName,
  getNameLink,
  getAllLinks,
  resolveName,
} = require('../utils/payment-db.cjs');
const {
  getInvoice,
  markParticipantPaid,
  markParticipantPaidByIndex,
} = require('../utils/invoice-db.cjs');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

// Pending payment claims: userId -> { invoiceId, participantName, timestamp }
const pendingClaims = new Map();
// Confirm tokens for proof-of-payment buttons. Used because customId has a
// 100-char limit and can't fit a long list of participant indices. Map of
// token -> { invoiceId, indices, payerId, participantName, amount }.
// Disk-backed on purpose. A confirm token can sit for days waiting for the
// creator to press the button, and this used to be memory-only: every bot
// restart — a deploy, a crash, a server reboot — silently killed every pending
// confirmation, and the payer was told it had "expired".
const fs = require('fs');
const path = require('path');
const { withFileLock, writeFileAtomic } = require('../utils/file-lock.cjs');

const CONFIRM_STORE_FILE =
  process.env.CONFIRM_STORE_PATH ||
  path.join(process.env.DATA_DIR || path.join(__dirname, '../data'), 'confirm-tokens.json');
const CONFIRM_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days, just to stop unbounded growth

function loadConfirmTokens() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIRM_STORE_FILE, 'utf8'));
    const now = Date.now();
    return new Map(
      Object.entries(raw).filter(([, v]) => now - (v?.timestamp || 0) < CONFIRM_TOKEN_TTL)
    );
  } catch (e) {
    return new Map();
  }
}

const _confirmTokens = loadConfirmTokens();

function persistConfirmTokens() {
  try {
    withFileLock(CONFIRM_STORE_FILE, () => {
      writeFileAtomic(CONFIRM_STORE_FILE, JSON.stringify(Object.fromEntries(_confirmTokens), null, 2));
    });
  } catch (e) {
    console.error('[Payment] Could not persist confirm tokens:', e.message);
  }
}

const confirmStore = {
  get: (k) => _confirmTokens.get(k),
  set: (k, v) => { _confirmTokens.set(k, v); persistConfirmTokens(); },
  delete: (k) => { const had = _confirmTokens.delete(k); if (had) persistConfirmTokens(); return had; },
  get size() { return _confirmTokens.size; },
};
// Which bills a user currently has ticked in the /bayar picker.
// userId -> { creatorId, values: ["<invoiceId>#<idx>", ...], timestamp }
const pendingBillSelections = new Map();

// Group all UNPAID participants by case-insensitive username. Returns
// [{ username, total, indices: [int,...] }, ...]
function groupUnpaidByName(participants) {
  const { getCanonicalName, readDB } = require('../utils/invoice-db.cjs');
  const db = readDB();

  const byKey = new Map();
  participants.forEach((p, idx) => {
    if (p.paid) return;
    // Group by canonical name, not the raw string. "Clee" and "Stepan" are one
    // person; listing them as two rows makes the payer guess which one they are
    // and leaves the other half unpaid.
    const key = getCanonicalName(p.username || '', db).toLowerCase().trim();
    if (!byKey.has(key)) {
      byKey.set(key, { username: p.username, canonical: key, spellings: [], total: 0, indices: [] });
    }
    const g = byKey.get(key);
    g.total += Number(p.amount) || 0;
    g.indices.push(idx);
    if (p.username && !g.spellings.includes(p.username)) g.spellings.push(p.username);
  });

  // Show the canonical name, so the same person always reads the same way.
  for (const g of byKey.values()) {
    g.username = g.canonical.charAt(0).toUpperCase() + g.canonical.slice(1);
  }
  return [...byKey.values()];
}
// Long enough to actually open a banking app, transfer and screenshot.
// Five minutes meant the claim was routinely dead before the proof arrived.
const CLAIM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * /payment-set command - Set payment info for current user
 */
async function handlePaymentSet(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('payment_set_modal')
    .setTitle('💰 Set Info Pembayaran');

  const bankInput = new TextInputBuilder()
    .setCustomId('bank')
    .setLabel('Bank')
    .setPlaceholder('BCA, Mandiri, BRI, dll')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const numberInput = new TextInputBuilder()
    .setCustomId('number')
    .setLabel('Nomor Rekening')
    .setPlaceholder('1234567890')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const nameInput = new TextInputBuilder()
    .setCustomId('account_name')
    .setLabel('Atas Nama')
    .setPlaceholder('Nama pemilik rekening')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const row1 = new ActionRowBuilder().addComponents(bankInput);
  const row2 = new ActionRowBuilder().addComponents(numberInput);
  const row3 = new ActionRowBuilder().addComponents(nameInput);

  modal.addComponents(row1, row2, row3);

  return interaction.showModal(modal);
}

/**
 * Process payment set modal
 */
async function processPaymentSetModal(interaction) {
  const bank = interaction.fields.getTextInputValue('bank') || '';
  const number = interaction.fields.getTextInputValue('number') || '';
  const accountName = interaction.fields.getTextInputValue('account_name') || '';

  if (!bank && !number && !accountName) {
    return interaction.reply({
      content: '⚠️ Isi minimal satu field!',
      ephemeral: true
    });
  }

  setPaymentInfo(interaction.user.id, {
    bank,
    number,
    name: accountName
  });

  let description = '✅ Payment info disimpan!\n\n';
  if (bank) description += `🏦 Bank: ${bank}\n`;
  if (number) description += `🔢 Nomor: ||${number}||\n`;
  if (accountName) description += `👤 Atas Nama: ${accountName}\n`;

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('💳 Info Pembayaran')
    .setDescription(description)
    .setFooter({ text: 'Info ini akan muncul saat orang cek hutang ke kamu' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * /invoice-link command - Link invoice name to Discord user
 */
async function handleInvoiceLink(interaction) {
  const name = interaction.options.getString('name');

  const result = linkName(name, interaction.user.id, interaction.user.username);

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('🔗 Name Link')
    .setDescription(`✅ Nama "${name}" sekarang linked ke akun Discord kamu`)
    .addFields({
      name: 'Info',
      value: `Kalo ada invoice atas nama "${name}", bot bakal DM buat notifikasi.`,
      inline: false
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * /bayar command - Start payment claim flow
 */
const isSnowflakeId = (id) => typeof id === 'string' && /^\d{17,20}$/.test(id);

/**
 * Every unpaid bill in this guild that belongs to `user`.
 *
 * Ownership only comes from something recorded on purpose: the Discord id
 * stored on the participant, an explicit nameLinks entry, or the caller's own
 * Discord username. Never a fuzzy name match — surfacing someone else's bill
 * under /bayar invites paying off the wrong person's debt.
 */
function collectOwnUnpaidBills(guildId, user) {
  const { getGuildInvoices, getCanonicalName, readDB } = require('../utils/invoice-db.cjs');
  const db = readDB();

  const ownNames = new Set([String(user.username || '').toLowerCase().trim()]);
  try {
    // getAllLinks() returns an array of { name, discordId, ... }, not a map.
    for (const link of getAllLinks() || []) {
      if (link?.discordId === user.id && link.name) ownNames.add(String(link.name).toLowerCase().trim());
    }
  } catch (e) { /* nameLinks unavailable — ids stored on the invoice still work */ }

  const ownCanonical = new Set([...ownNames].map(n => getCanonicalName(n, db).toLowerCase().trim()));

  const bills = [];
  for (const inv of getGuildInvoices(guildId)) {
    (inv.participants || []).forEach((p, idx) => {
      if (p.paid) return;

      const byId = isSnowflakeId(p.userId) && p.userId === user.id;
      const byName = ownCanonical.has(getCanonicalName(p.username || '', db).toLowerCase().trim());
      if (!byId && !byName) return;

      bills.push({
        invoiceId: inv.id,
        index: idx,
        title: inv.title || 'Untitled',
        date: inv.date,
        amount: Number(p.amount) || 0,
        username: p.username,
        creatorId: inv.creator?.id,
        creatorName: inv.creator?.username || 'Unknown',
      });
    });
  }
  return bills;
}

async function handleBayar(interaction, directInvoiceId) {
  // Invoked from a specific invoice's "Bayar" button → invoice already known,
  // skip the picker and go straight to choosing who paid. That path still
  // allows paying on someone else's behalf; only the slash command is scoped
  // to the caller.
  if (directInvoiceId) {
    return showPersonSelect(interaction, directInvoiceId, true);
  }

  const bills = collectOwnUnpaidBills(interaction.guildId, interaction.user);

  if (bills.length === 0) {
    return interaction.reply({
      content: '✅ Kamu gak punya tagihan yang belum lunas!\n\n' +
        '_Kalau ngerasa punya, kemungkinan invoice-nya belum ke-link ke akun Discord kamu. ' +
        'Minta pembuat invoice buat nge-link nama kamu._',
      ephemeral: true,
    });
  }

  // Paying = transferring to one person, so a batch only makes sense per
  // creator. Pick who to settle up with first.
  const byCreator = new Map();
  for (const b of bills) {
    const key = String(b.creatorId || b.creatorName);
    const g = byCreator.get(key) || { creatorId: b.creatorId, creatorName: b.creatorName, total: 0, count: 0 };
    g.total += b.amount;
    g.count += 1;
    byCreator.set(key, g);
  }

  if (byCreator.size === 1) {
    return showOwnBillSelect(interaction, [...byCreator.values()][0].creatorId, true);
  }

  const options = [...byCreator.values()].slice(0, 25).map(g =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${g.creatorName} — Rp ${g.total.toLocaleString('id-ID')}`.slice(0, 100))
      .setValue(String(g.creatorId))
      .setDescription(`${g.count} tagihan`)
  );

  const grandTotal = bills.reduce((s, b) => s + b.amount, 0);

  await interaction.reply({
    content: `💵 **Tagihan kamu — total Rp ${grandTotal.toLocaleString('id-ID')}**\n\n` +
      `Transfer itu ke satu orang, jadi pilih dulu mau lunasin ke siapa:`,
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('bayar_select_creator')
          .setPlaceholder('Bayar ke siapa?')
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(options)
      ),
    ],
    ephemeral: true,
  });
}

/**
 * Second dropdown: the caller's own unpaid bills owed to one creator,
 * multi-select so several settle in a single transfer.
 */
async function showOwnBillSelect(interaction, creatorId, useReply) {
  const bills = collectOwnUnpaidBills(interaction.guildId, interaction.user)
    .filter(b => String(b.creatorId) === String(creatorId));

  const respond = (payload) =>
    useReply ? interaction.reply({ ...payload, ephemeral: true }) : interaction.update(payload);

  if (bills.length === 0) {
    return respond({ content: '✅ Gak ada tagihan tersisa ke orang ini.', components: [] });
  }

  const shown = bills.slice(0, 25);
  const options = shown.map(b =>
    new StringSelectMenuOptionBuilder()
      .setLabel(String(b.title).slice(0, 100))
      .setValue(`${b.invoiceId}#${b.index}`)
      .setDescription(`${b.date} · Rp ${b.amount.toLocaleString('id-ID')}`.slice(0, 100))
      .setDefault(true) // settling everything is the common case
  );

  // Everything starts selected, and a select menu only fires when the selection
  // CHANGES — so without an explicit button, someone who wants to pay all of it
  // has nothing to press.
  const allValues = shown.map(b => `${b.invoiceId}#${b.index}`);
  pendingBillSelections.set(interaction.user.id, { creatorId: String(creatorId), values: allValues, timestamp: Date.now() });

  return respond(buildBillSelectPayload(shown, allValues, creatorId, bills.length));
}

/**
 * Message body for the bill picker. Rebuilt on every change so the checkboxes
 * and the running total stay in sync.
 */
function buildBillSelectPayload(shown, selectedValues, creatorId, totalBillCount) {
  const selected = new Set(selectedValues);
  const options = shown.map(b =>
    new StringSelectMenuOptionBuilder()
      .setLabel(String(b.title).slice(0, 100))
      .setValue(`${b.invoiceId}#${b.index}`)
      .setDescription(`${b.date} · Rp ${b.amount.toLocaleString('id-ID')}`.slice(0, 100))
      .setDefault(selected.has(`${b.invoiceId}#${b.index}`))
  );

  const pickedTotal = shown
    .filter(b => selected.has(`${b.invoiceId}#${b.index}`))
    .reduce((s, b) => s + b.amount, 0);

  const leftover = shown.length - selected.size;
  let content = `💵 **Bayar ke @${shown[0].creatorName}**\n\n`;
  content += `Dipilih: **${selected.size} dari ${shown.length}** tagihan — **Rp ${pickedTotal.toLocaleString('id-ID')}**\n`;
  content += leftover === 0
    ? `Semua kecentang. Kalau ada yang belum mau dibayar, hilangin centangnya dulu.\n`
    : `${leftover} tagihan gak ikut dibayar dan tetep jadi utang.\n`;
  content += `Kalau udah pas, pencet **Lanjut Bayar** di bawah.`;
  if (totalBillCount > shown.length) {
    content += `\n\n⚠️ _Kamu punya ${totalBillCount} tagihan ke orang ini, Discord cuma sanggup nampilin 25 sekaligus. Sisanya muncul setelah yang ini lunas._`;
  }

  return {
    content,
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`bayar_select_bills|${creatorId}`)
          .setPlaceholder('Pilih tagihan yang mau dibayar...')
          .setMinValues(1)
          .setMaxValues(shown.length)
          .addOptions(options)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`bayar_confirm_bills|${creatorId}`)
          .setLabel(`✅ Lanjut Bayar (${selected.size})`)
          .setStyle(ButtonStyle.Success)
      ),
    ],
  };
}

async function handleBayarSelectCreator(interaction) {
  return showOwnBillSelect(interaction, interaction.values[0], false);
}

/**
 * Checkbox changed — remember it and redraw so the total tracks the selection.
 */
async function handleBayarSelectBills(interaction) {
  const creatorId = interaction.customId.split('|')[1];
  pendingBillSelections.set(interaction.user.id, {
    creatorId: String(creatorId),
    values: interaction.values,
    timestamp: Date.now(),
  });

  const shown = collectOwnUnpaidBills(interaction.guildId, interaction.user)
    .filter(b => String(b.creatorId) === String(creatorId));

  if (shown.length === 0) {
    return interaction.update({ content: '✅ Gak ada tagihan tersisa ke orang ini.', components: [], embeds: [] });
  }

  return interaction.update(buildBillSelectPayload(shown.slice(0, 25), interaction.values, creatorId, shown.length));
}

/**
 * Bills chosen → one claim covering all of them, one transfer, one proof.
 */
async function handleBayarConfirmBills(interaction) {
  const creatorId = interaction.customId.split('|')[1];
  const remembered = pendingBillSelections.get(interaction.user.id);

  if (!remembered || remembered.creatorId !== String(creatorId)) {
    return interaction.update({
      content: '❌ Pilihannya udah kadaluarsa (bot sempat restart?). Jalanin `/bayar` lagi ya.',
      components: [],
      embeds: [],
    });
  }
  const picked = new Set(remembered.values);
  pendingBillSelections.delete(interaction.user.id);

  // Re-derive from disk instead of trusting the remembered values: the list was
  // built when the menu was rendered and something may have been paid since.
  const bills = collectOwnUnpaidBills(interaction.guildId, interaction.user)
    .filter(b => String(b.creatorId) === String(creatorId))
    .filter(b => picked.has(`${b.invoiceId}#${b.index}`));

  if (bills.length === 0) {
    return interaction.update({
      content: '❌ Tagihan yang kamu pilih udah gak ada (mungkin barusan ditandai lunas). Coba `/bayar` lagi.',
      components: [],
    });
  }

  // One entry per invoice, carrying every index picked from it.
  const itemMap = new Map();
  for (const b of bills) {
    const it = itemMap.get(b.invoiceId) || { invoiceId: b.invoiceId, indices: [], title: b.title, amount: 0 };
    it.indices.push(b.index);
    it.amount += b.amount;
    itemMap.set(b.invoiceId, it);
  }
  const items = [...itemMap.values()];
  const total = bills.reduce((s, b) => s + b.amount, 0);
  // Canonical, so the creator sees the same name everywhere instead of whichever
  // spelling happened to be on the first invoice.
  const { getCanonicalName, readDB } = require('../utils/invoice-db.cjs');
  const canon = getCanonicalName(bills[0].username || '', readDB()).trim();
  const payerName = canon
    ? canon.charAt(0).toUpperCase() + canon.slice(1)
    : (bills[0].username || interaction.user.username);

  const claimData = {
    items,
    participantName: payerName,
    amount: total,
    creatorId,
    timestamp: Date.now(),
    // Legacy fields so the single-invoice proof path keeps working unchanged.
    invoiceId: items[0].invoiceId,
    participantIndices: items[0].indices,
    participantUserId: interaction.user.id,
  };
  pendingClaims.set(interaction.user.id, claimData);
  console.log(`[Payment] Batch claim SET for ${interaction.user.id}: ${items.length} invoice, Rp ${total}`);

  // The name is already on the bills — the member cache is often cold and was
  // leaving "Transfer ke:" with a blank recipient.
  const creatorName = bills[0].creatorName;
  // payments is keyed by name for entries made through the dashboard and by
  // Discord id for entries made through /payment-set, so try both.
  const creatorPaymentInfo =
    getPaymentInfo(String(creatorId)) ||
    (creatorName ? getPaymentInfo(creatorName) : null) ||
    (creatorName ? getPaymentInfoByUsername(creatorName) : null);

  let description = `💵 **Bayar ${bills.length} tagihan sekaligus**\n`;
  description += `💰 Total: **Rp ${total.toLocaleString('id-ID')}**\n\n`;
  for (const it of items) {
    description += `• ${it.title} — Rp ${it.amount.toLocaleString('id-ID')}`;
    description += it.indices.length > 1 ? ` _(${it.indices.length} bill)_\n` : `\n`;
  }

  description += `\n🏦 **Transfer ke:**\n`;
  if (creatorName) description += `👤 @${creatorName}\n`;
  if (creatorPaymentInfo) {
    if (creatorPaymentInfo.bank) description += `🏦 Bank: **${creatorPaymentInfo.bank}**\n`;
    if (creatorPaymentInfo.number) description += `🔢 No. Rek: ||${creatorPaymentInfo.number}||\n`;
    if (creatorPaymentInfo.name) description += `👤 Atas Nama: ${creatorPaymentInfo.name}\n`;
  } else {
    description += `⚠️ Dia belum set info pembayaran. DM aja orangnya!\n`;
  }

  description += `\n📸 **Langkah selanjutnya:**\n`;
  description += `1. Transfer **satu kali** sejumlah total di atas\n`;
  description += `2. Screenshot bukti transfer\n`;
  description += `3. **DM Siggy dan kirim bukti**\n\n`;
  description += `_Sekali dikonfirmasi, ${bills.length} tagihan itu langsung lunas semua._`;

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🧾 Instruksi Pembayaran')
    .setDescription(description)
    .setFooter({ text: 'Bukti TF dikirim via DM Siggy' })
    .setTimestamp();

  await interaction.update({ content: '', embeds: [embed], components: [] });

  // Open the DM ourselves. Telling someone to "DM Siggy" without a thread
  // already there means hunting for the bot in the member list — and the proof
  // handler only listens in DMs, so this is the step that makes it usable.
  try {
    let dm = `📸 **Kirim bukti transfer di sini!**\n\n`;
    dm += `Bayar ke: @${creatorName}\n`;
    dm += `Total: **Rp ${total.toLocaleString('id-ID')}** untuk ${bills.length} tagihan:\n`;
    for (const it of items) {
      dm += `   • ${it.title} — Rp ${it.amount.toLocaleString('id-ID')}\n`;
    }
    dm += `\nCukup kirim screenshot bukti transfer di chat ini. Bot bakal forward ke @${creatorName} buat dikonfirmasi ✅\n\n`;
    dm += `_Berlaku 30 menit. Kalau kelewat, jalanin \`/bayar\` lagi._`;

    await interaction.user.send({ content: dm });
    console.log(`[Payment] Batch DM sent to ${interaction.user.username} — waiting for proof`);
  } catch (err) {
    console.log(`[Payment] Could not DM ${interaction.user.username}:`, err.message);
    // DMs closed — say so instead of leaving them waiting for a message that
    // will never arrive.
    try {
      await interaction.followUp({
        content: '⚠️ Siggy gak bisa DM kamu (DM dari anggota server kemungkinan kamu matiin).\n' +
          'Nyalain dulu di **Privacy Settings** server ini, terus jalanin `/bayar` lagi — ' +
          'bukti transfer cuma bisa diterima lewat DM.',
        ephemeral: true,
      });
    } catch (e) { /* nothing else we can do */ }
  }
}

/**
 * Handle invoice selection in payment flow
 */
async function handleBayarSelectInvoice(interaction) {
  return showPersonSelect(interaction, interaction.values[0], false);
}

/**
 * Render the "who paid?" person picker for a known invoice.
 * useReply=true → fresh ephemeral reply (came from the Bayar button);
 * useReply=false → update the existing ephemeral message (came from a select).
 */
async function showPersonSelect(interaction, rawInvoiceId, useReply) {
  let invoiceId = rawInvoiceId;
  let invoice = getInvoice(invoiceId);
  if (!invoice && invoiceId && !String(invoiceId).startsWith('invoice_')) {
    invoiceId = `invoice_${invoiceId}`;
    invoice = getInvoice(invoiceId);
  }

  const respond = (payload) =>
    useReply ? interaction.reply({ ...payload, ephemeral: true }) : interaction.update(payload);

  if (!invoice) {
    return respond({ content: '❌ Invoice tidak ditemukan.', components: [] });
  }

  // Group unpaid participants by name (case-insensitive). Multiple bills under
  // the same name -> one row, summed amount, all underlying indices remembered.
  const groups = groupUnpaidByName(invoice.participants);
  if (groups.length === 0) {
    return respond({ content: '✅ Semua orang di invoice ini udah lunas!', components: [] });
  }
  const options = groups.slice(0, 25).map((g, gi) => {
    const fmt = `Rp ${g.total.toLocaleString('id-ID')}`;
    const parts = [fmt];
    if (g.indices.length > 1) parts.push(`${g.indices.length} bill`);
    // Spell out the merge so nobody wonders why their own name is missing.
    const others = (g.spellings || []).filter(s => s.toLowerCase().trim() !== g.canonical);
    if (others.length) parts.push(`alias: ${others.join(', ')}`);
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${g.username} - ${fmt}`.slice(0, 100))
      .setValue(`g_${gi}`)
      .setDescription(parts.join(' · ').slice(0, 100));
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`bayar_select_person_${invoiceId}`)
    .setPlaceholder('Bayar untuk siapa?')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return respond({
    content: `💵 **Bayar — ${invoice.title || 'Invoice'}**\n\nPilih orang yang kamu bayarkan:`,
    components: [row]
  });
}

/**
 * Handle person selection in payment flow - show payment info modal
 */
async function handleBayarSelectPerson(interaction) {
  const customId = interaction.customId;
  const invoiceId = customId.replace('bayar_select_person_', '');
  const raw = interaction.values[0];

  const invoice = getInvoice(invoiceId);
  if (!invoice) {
    return interaction.update({
      content: '❌ Invoice tidak ditemukan.',
      components: []
    });
  }

  // Resolve selection — three encodings supported:
  //  g_<i>  → new grouped value (auto-sums all bills for that name)
  //  p_<i>  → previous index-based value
  //  <uid>  → legacy userId
  let groupIndices = null, groupTotal = 0, groupName = '';
  const gMatch = /^g_(\d+)$/.exec(raw);
  const pMatch = /^p_(\d+)$/.exec(raw);
  if (gMatch) {
    const g = groupUnpaidByName(invoice.participants)[Number(gMatch[1])];
    if (!g) return interaction.update({ content: '❌ Group tidak ditemukan.', components: [] });
    groupIndices = g.indices;
    groupTotal = g.total;
    groupName = g.username;
  } else {
    const idx = pMatch
      ? Number(pMatch[1])
      : invoice.participants.findIndex(p => p.userId === raw);
    const p = idx >= 0 ? invoice.participants[idx] : null;
    if (!p) return interaction.update({ content: '❌ Participant tidak ditemukan.', components: [] });
    groupIndices = [idx];
    groupTotal = Number(p.amount) || 0;
    groupName = p.username;
  }

  const participant = invoice.participants[groupIndices[0]];
  const participantUserId = participant.userId;
  const participantIdx = groupIndices[0];

  // Get creator's payment info
  const creatorPaymentInfo = getPaymentInfo(invoice.creator.id);

  // Store pending claim
  const claimData = {
    invoiceId,
    participantUserId,
    participantIdx,
    participantIndices: groupIndices,                  // all bills under this name
    participantName: groupName,
    amount: groupTotal,                                // summed across the group
    creatorId: invoice.creator.id,
    timestamp: Date.now()
  };
  pendingClaims.set(interaction.user.id, claimData);
  console.log(`[Payment] Pending claim SET for ${interaction.user.id}:`, claimData);

  // Build payment info message
  let description = `💵 **Bayar untuk: ${groupName}**\n`;
  description += `💰 Jumlah: Rp ${groupTotal.toLocaleString('id-ID')}`;
  if (groupIndices.length > 1) description += ` _(gabungan ${groupIndices.length} bill)_`;
  description += `\n`;
  description += `📋 Invoice: ${invoice.title || 'Untitled'} (${invoice.date})\n\n`;

  description += `🏦 **Transfer ke:**\n`;
  description += `👤 @${invoice.creator.username}\n`;

  if (creatorPaymentInfo) {
    if (creatorPaymentInfo.bank) {
      description += `🏦 Bank: **${creatorPaymentInfo.bank}**\n`;
    }
    if (creatorPaymentInfo.number) {
      description += `🔢 No. Rek: ||${creatorPaymentInfo.number}||\n`;
    }
    if (creatorPaymentInfo.name) {
      description += `👤 Atas Nama: ${creatorPaymentInfo.name}\n`;
    }
  } else {
    description += `⚠️ Creator belum set info pembayaran. DM aja creator-nya!\n`;
  }

  description += `\n📸 **Langkah selanjutnya:**\n`;
  description += `1. Transfer sesuai jumlah\n`;
  description += `2. Screenshot/simpan bukti transfer\n`;
  description += `3. **DM Siggy dan kirim bukti**\n\n`;
  description += `_Bot akan forward bukti ke creator untuk konfirmasi._`;

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('💳 Info Pembayaran')
    .setDescription(description)
    .setFooter({ text: 'Bukti TF dikirim via DM Siggy' })
    .setTimestamp();

  await interaction.update({
    content: '',
    embeds: [embed],
    components: []
  });

  // DM the user with instructions
  try {
    await interaction.user.send({
      content: `📸 **Kirim bukti transfer di sini!**\n\n` +
        `Invoice: ${invoice.title || 'Untitled'}\n` +
        `Untuk: ${participant.username} - Rp ${Number(participant.amount).toLocaleString('id-ID')}\n\n` +
        `Cukup kirim screenshot/foto bukti transfer. Bot akan forward ke @${invoice.creator.username} ✅\n\n` +
        `_Timeout: 5 menit_`
    });
    console.log(`[Payment] DM sent to ${interaction.user.username} - waiting for proof`);
  } catch (err) {
    console.log(`[Payment] Could not DM ${interaction.user.username}:`, err.message);
  }
}

/**
 * Handle payment proof DM (image attachment)
 */
async function handlePaymentProofDM(message, client) {
  console.log(`[Payment Proof DM] Received from ${message.author.username} (${message.author.id})`);
  console.log(`[Payment Proof DM] Attachments: ${message.attachments.size}, Stickers: ${message.stickers.size}`);

  const pending = pendingClaims.get(message.author.id);
  console.log(`[Payment Proof DM] Pending claim:`, pending ? 'FOUND' : 'NOT FOUND');

  // No pending claim, ignore
  if (!pending) {
    console.log(`[Payment Proof DM] No pending claim for ${message.author.id}. Did you complete all 3 forms?`);
    return;
  }
  if (Date.now() - pending.timestamp > CLAIM_TIMEOUT) {
    console.log(`[Payment Proof DM] Claim expired for ${message.author.id}`);
    pendingClaims.delete(message.author.id);
    return;
  }

  // Check if message has attachment or sticker
  const hasImage =
    message.attachments.size > 0 ||
    message.stickers.size > 0;

  const invoice = getInvoice(pending.invoiceId);
  if (!invoice) {
    pendingClaims.delete(message.author.id);
    return;
  }

  // Get creator
  let creator;
  try {
    creator = await client.users.fetch(pending.creatorId);
  } catch (err) {
    console.log(`[Payment] Could not fetch creator ${pending.creatorId}:`, err.message);
    pendingClaims.delete(message.author.id);
    return;
  }

  // Build proof message
  let proofContent = `📸 **Bukti Transfer Diterima!**\n\n`;
  proofContent += `💵 Dari: @${message.author.username}\n`;
  proofContent += `👤 Untuk: ${pending.participantName}\n`;
  proofContent += `💰 Jumlah: Rp ${Number(pending.amount).toLocaleString('id-ID')}\n`;

  // A batch claim settles several invoices in one transfer — list them all, so
  // the creator can see exactly what one click is about to mark paid.
  if (pending.items && pending.items.length > 1) {
    proofContent += `📋 **${pending.items.length} invoice sekaligus:**\n`;
    for (const it of pending.items) {
      const inv = getInvoice(it.invoiceId);
      proofContent += `   • ${inv?.title || it.title || 'Untitled'} — Rp ${Number(it.amount || 0).toLocaleString('id-ID')}\n`;
    }
    proofContent += `\n`;
  } else {
    proofContent += `📋 Invoice: ${invoice.title || 'Untitled'} (${invoice.date})\n\n`;
  }

  // Build confirm/reject buttons. customId has a 100-char limit so we can't put
  // a long list of indices in there — instead we save the claim into an
  // in-memory store keyed by a short token and embed that.
  const token = Math.random().toString(36).slice(2, 10);
  confirmStore.set(token, {
    invoiceId: pending.invoiceId,
    indices: pending.participantIndices || (pending.participantIdx !== undefined ? [pending.participantIdx] : []),
    items: pending.items || null,
    participantUserId: pending.participantUserId,
    participantName: pending.participantName,
    amount: pending.amount,
    payerId: message.author.id,
    timestamp: Date.now(),
  });

  const confirmButton = new ButtonBuilder()
    .setCustomId(`payment_confirm|${token}`)
    .setLabel('✅ Confirm & Lunasi')
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId(`payment_reject|${token}`)
    .setLabel('❌ Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(confirmButton, rejectButton);

  // Send to creator
  try {
    // Get image attachment if any
    const attachments = [];
    message.attachments.forEach(att => {
      if (att.contentType?.startsWith('image/')) {
        attachments.push(att.url);
      }
    });

    // Also check for stickers
    message.stickers.forEach(sticker => {
      if (sticker.url) {
        attachments.push(sticker.url);
      }
    });

    await creator.send({
      content: proofContent,
      files: attachments,
      components: [row]
    });

    // Notify payer
    await message.reply({
      content: `✅ Bukti diterima! Forwarding ke @${invoice.creator.username}...\n\n` +
        `_Tunggu konfirmasi dari creator ya!_`
    });

    // Clear pending
    pendingClaims.delete(message.author.id);

  } catch (err) {
    console.log(`[Payment] Error forwarding proof:`, err.message);
    await message.reply({
      content: `❌ Error mengirim bukti ke creator. Coba lagi atau DM creator langsung.`
    });
    pendingClaims.delete(message.author.id);
  }
}

/**
 * Handle payment confirmation (creator clicks confirm/reject)
 */
async function handlePaymentConfirm(interaction, action) {
  const customId = interaction.customId;
  // Modern format: payment_confirm|<token>  (token resolves to confirmStore)
  // Legacy:        payment_confirm|<invoiceId>|<userId[:idx]>|<payerId>
  const parts = customId.split('|');
  let invoiceId, participantUserId, participantIdx = null, participantIndices = null, payerId, participantName, amount;
  // Set when the claim covers more than one invoice (batch pay).
  let batchItems = null;

  if (parts.length === 2) {
    const stored = confirmStore.get(parts[1]);
    if (!stored) {
      return interaction.reply({
        content: '❌ Tombol ini udah gak berlaku — kemungkinan pembayarannya udah pernah dikonfirmasi/ditolak.\n\n' +
          '_Kalau belum, minta yang bayar buat kirim ulang bukti transfernya lewat DM Siggy._',
        ephemeral: true,
      });
    }
    if (stored.items && stored.items.length > 1) batchItems = stored.items;
    invoiceId = stored.invoiceId;
    participantIndices = stored.indices || [];
    participantIdx = participantIndices[0] ?? null;
    participantUserId = stored.participantUserId;
    participantName = stored.participantName;
    amount = stored.amount;
    payerId = stored.payerId;
  } else {
    invoiceId = parts[1];
    const tokenRaw = parts[2] || '';
    const colon = tokenRaw.lastIndexOf(':');
    participantUserId = colon >= 0 ? tokenRaw.slice(0, colon) : tokenRaw;
    participantIdx = colon >= 0 ? Number(tokenRaw.slice(colon + 1)) : null;
    payerId = parts[3];
    participantIndices = participantIdx !== null && !Number.isNaN(participantIdx) ? [participantIdx] : null;
  }

  console.log(`[Payment Confirm] action=${action}, invoiceId=${invoiceId}, indices=${JSON.stringify(participantIndices)}, payer=${payerId}`);

  const invoice = getInvoice(invoiceId);
  if (!invoice) {
    return interaction.reply({
      content: '❌ Invoice tidak ditemukan.',
      ephemeral: true
    });
  }

  const participant = participantIndices && participantIndices.length
    ? invoice.participants[participantIndices[0]]
    : invoice.participants.find(p => p.userId === participantUserId);
  if (!participant) {
    return interaction.reply({
      content: '❌ Participant tidak ditemukan.',
      ephemeral: true
    });
  }

  if (action === 'confirm') {
    // Discord kills the interaction token after 3 seconds. Confirming a batch
    // redraws one channel message per invoice (fetch + delete + send each), so a
    // 9-invoice claim spends ~36 API calls before it can answer — the reply then
    // died with 10062 "Unknown interaction" and the creator saw "Siggy didn't
    // respond in time", even though every bill had already been marked paid.
    // Claiming the interaction first buys 15 minutes for the work below.
    // Nothing has been mutated yet, so if this throws the token is still intact
    // and the button can simply be pressed again.
    await interaction.deferUpdate();

    // Mark every bill in the group as paid (one user can have multiple bills).
    if (batchItems) {
      // Batch: settle every invoice in the claim, not just the first one.
      for (const it of batchItems) {
        for (const i of it.indices || []) markParticipantPaidByIndex(it.invoiceId, i);
      }
    } else if (participantIndices && participantIndices.length) {
      for (const i of participantIndices) markParticipantPaidByIndex(invoiceId, i);
    } else {
      markParticipantPaid(invoiceId, participantUserId);
    }
    // Free the token (one-shot).
    if (parts.length === 2) confirmStore.delete(parts[1]);

    const { renderInvoiceEmbed, buildInvoiceButtons, sendPaidNotification } = require('./invoice-simple.cjs');
    const { updateInvoiceMessage } = require('../utils/invoice-db.cjs');

    // Every invoice touched by this claim needs its channel message redrawn,
    // otherwise a batch leaves the other invoices showing stale "belum bayar".
    const affected = batchItems ? batchItems.map(i => i.invoiceId) : [invoiceId];

    for (const affectedId of affected) {
      const updated = getInvoice(affectedId);
      if (!updated) continue;
      try {
        const channel = await interaction.client.channels.fetch(updated.channelId);

        if (updated.messageId) {
          try {
            const oldMessage = await channel.messages.fetch(updated.messageId);
            await oldMessage.delete();
          } catch (err) {
            console.log(`[Payment] Could not delete old message for ${affectedId}: ${err.message}`);
          }
        }

        const newMessage = await channel.send({
          content: `✅ 1 orang ditandai lunas!`,
          embeds: [renderInvoiceEmbed(updated)],
          components: [buildInvoiceButtons(updated.id)],
        });
        updateInvoiceMessage(updated.id, newMessage.id);
        console.log(`[Payment] Invoice ${affectedId} message refreshed: ${newMessage.id}`);
      } catch (err) {
        // One unreachable channel must not abort the rest of the batch —
        // the bills are already marked paid on disk at this point.
        console.error(`[Payment] Could not refresh invoice ${affectedId}:`, err.message);
      }
    }

    const updatedInvoice = getInvoice(invoiceId);

    const totalLunas = amount || (participantIndices ? participantIndices.reduce((s, i) => s + (Number(invoice.participants[i]?.amount) || 0), 0) : Number(participant.amount) || 0);
    const billCount = batchItems
      ? batchItems.reduce((s, i) => s + (i.indices?.length || 0), 0)
      : (participantIndices ? participantIndices.length : 1);
    const scope = batchItems ? ` _(${billCount} bill di ${batchItems.length} invoice)_` : (billCount > 1 ? ` _(gabungan ${billCount} bill)_` : '');

    // editReply, not update — the interaction was already claimed by deferUpdate.
    await interaction.editReply({
      content: `✅ Pembayaran dikonfirmasi!\n\n` +
        `👤 ${participantName || participant.username} - Rp ${totalLunas.toLocaleString('id-ID')} → LUNAS${scope}`,
      components: []
    });

    // Send paid notification to participant
    try {
      await sendPaidNotification(updatedInvoice, participant, interaction.guild);
    } catch (err) {
      console.log(`[Payment] Could not send paid notification:`, err.message);
    }

    // Notify payer. A batch settles several invoices at once, so listing only
    // the first one leaves the payer unsure the rest actually went through.
    try {
      const payer = await interaction.client.users.fetch(payerId);

      let note = `✅ **Pembayaran Dikonfirmasi!**\n\n`;
      if (batchItems) {
        note += `${billCount} tagihan di ${batchItems.length} invoice — total **Rp ${Number(totalLunas).toLocaleString('id-ID')}**\n\n`;
        for (const it of batchItems) {
          const inv = getInvoice(it.invoiceId);
          const sum = (it.indices || []).reduce(
            (s, i) => s + (Number(inv?.participants?.[i]?.amount) || 0), 0);
          note += `• ${inv?.title || 'Untitled'} — Rp ${sum.toLocaleString('id-ID')}\n`;
        }
        note += `\nSemuanya udah ditandai LUNAS. Terima kasih! 🎉`;
      } else {
        note += `Invoice: ${invoice.title || 'Untitled'}\n` +
          `Untuk: ${participant.username}\n` +
          `Jumlah: Rp ${Number(totalLunas).toLocaleString('id-ID')}\n\n` +
          `Terima kasih sudah bayar! 🎉`;
      }

      await payer.send({ content: note });
    } catch (err) {
      console.log(`[Payment] Could not notify payer:`, err.message);
    }

  } else {
    // Reject — clear the one-shot confirm token.
    if (parts.length === 2) confirmStore.delete(parts[1]);
    const totalGroup = amount || (participantIndices ? participantIndices.reduce((s, i) => s + (Number(invoice.participants[i]?.amount) || 0), 0) : Number(participant.amount) || 0);
    const billCount = participantIndices ? participantIndices.length : 1;
    await interaction.update({
      content: `❌ Pembayaran ditolak.\n\n` +
        `👤 ${participantName || participant.username} - Rp ${totalGroup.toLocaleString('id-ID')} → BELUM LUNAS${billCount > 1 ? ` _(${billCount} bill)_` : ''}`,
      components: []
    });

    // Notify payer
    try {
      const payer = await interaction.client.users.fetch(payerId);
      await payer.send({
        content: `⚠️ **Pembayaran Belum Dikonfirmasi**\n\n` +
          `Invoice: ${invoice.title || 'Untitled'}\n` +
          `Untuk: ${participant.username}\n` +
          `Jumlah: Rp ${Number(participant.amount).toLocaleString('id-ID')}\n\n` +
          `Mohon cek kembali atau hubungi creator.`
      });
    } catch (err) {
      console.log(`[Payment] Could not notify payer:`, err.message);
    }
  }
}

/**
 * Get payment display for invoice recap/owe
 */
function getPaymentDisplay(discordId, username) {
  const paymentInfo = getPaymentInfo(discordId);

  if (!paymentInfo) {
    return `👤 @${username}\n⚠️ Belum set info pembayaran`;
  }

  let display = `👤 @${username}\n`;
  if (paymentInfo.bank) display += `🏦 Bank: ${paymentInfo.bank}\n`;
  if (paymentInfo.number) display += `🔢 Rek: ||${paymentInfo.number}||\n`;
  if (paymentInfo.name) display += `👤 a.n: ${paymentInfo.name}\n`;

  return display;
}

// Command definitions
const paymentCommands = [
  {
    name: 'payment-set',
    description: 'Set info pembayaran (bank, rek, dll)',
  },
  {
    name: 'invoice-link',
    description: 'Link nama invoice ke Discord kamu',
    options: [
      {
        name: 'name',
        description: 'Nama di invoice (e.g., Cindy, Abi)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'bayar',
    description: 'Klaim udah bayar invoice',
  },
];

module.exports = {
  handlePaymentSet,
  processPaymentSetModal,
  handleInvoiceLink,
  handleBayar,
  handleBayarSelectInvoice,
  handleBayarSelectPerson,
  handleBayarSelectCreator,
  handleBayarSelectBills,
  handleBayarConfirmBills,
  handlePaymentProofDM,
  handlePaymentConfirm,
  getPaymentDisplay,
  paymentCommands,
  pendingClaims,
  // Exposed so scripts/dry-run-bayar.cjs can show what /bayar would list
  // without going through Discord.
  __collectOwnUnpaidBills: collectOwnUnpaidBills,
  __confirmStore: confirmStore,
  __groupUnpaidByName: groupUnpaidByName,
};
