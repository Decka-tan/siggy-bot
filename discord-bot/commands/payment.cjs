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
const confirmStore = new Map();

// Group all UNPAID participants by case-insensitive username. Returns
// [{ username, total, indices: [int,...] }, ...]
function groupUnpaidByName(participants) {
  const byKey = new Map();
  participants.forEach((p, idx) => {
    if (p.paid) return;
    const key = (p.username || '').toLowerCase().trim();
    if (!byKey.has(key)) byKey.set(key, { username: p.username, total: 0, indices: [] });
    const g = byKey.get(key);
    g.total += Number(p.amount) || 0;
    g.indices.push(idx);
  });
  return [...byKey.values()];
}
const CLAIM_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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
async function handleBayar(interaction, directInvoiceId) {
  const { getGuildInvoices } = require('../utils/invoice-db.cjs');

  // Invoked from a specific invoice's "Bayar" button → invoice already known,
  // skip the invoice picker and go straight to choosing who paid.
  if (directInvoiceId) {
    return showPersonSelect(interaction, directInvoiceId, true);
  }

  const invoices = getGuildInvoices(interaction.guildId);

  // Filter invoices with unpaid participants
  const unpaidInvoices = invoices.filter(inv =>
    inv.participants.some(p => !p.paid)
  );

  if (unpaidInvoices.length === 0) {
    return interaction.reply({
      content: '✅ Semua invoice lunas!',
      ephemeral: true
    });
  }

  // Build invoice select menu
  const options = unpaidInvoices.slice(0, 25).map(inv => {
    const unpaidCount = inv.participants.filter(p => !p.paid).length;
    const totalUnpaid = inv.participants
      .filter(p => !p.paid)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return new StringSelectMenuOptionBuilder()
      .setLabel(`${inv.title || 'Untitled'} - ${inv.date}`)
      .setValue(inv.id)
      .setDescription(`${unpaidCount} orang - Rp ${totalUnpaid.toLocaleString('id-ID')} blm bayar`);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('bayar_select_invoice')
    .setPlaceholder('Pilih invoice...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: '💵 **Bayar Invoice**\n\nPilih invoice yang mau dibayar:',
    components: [row],
    ephemeral: true
  });
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
    const desc = g.indices.length > 1 ? `${fmt} · ${g.indices.length} bills` : fmt;
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${g.username} - ${fmt}`)
      .setValue(`g_${gi}`)
      .setDescription(desc);
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
  proofContent += `📋 Invoice: ${invoice.title || 'Untitled'} (${invoice.date})\n\n`;

  // Build confirm/reject buttons. customId has a 100-char limit so we can't put
  // a long list of indices in there — instead we save the claim into an
  // in-memory store keyed by a short token and embed that.
  const token = Math.random().toString(36).slice(2, 10);
  confirmStore.set(token, {
    invoiceId: pending.invoiceId,
    indices: pending.participantIndices || (pending.participantIdx !== undefined ? [pending.participantIdx] : []),
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

  if (parts.length === 2) {
    const stored = confirmStore.get(parts[1]);
    if (!stored) {
      return interaction.reply({ content: '❌ Confirmation expired atau sudah diproses.', ephemeral: true });
    }
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
    // Mark every bill in the group as paid (one user can have multiple bills).
    if (participantIndices && participantIndices.length) {
      for (const i of participantIndices) markParticipantPaidByIndex(invoiceId, i);
    } else {
      markParticipantPaid(invoiceId, participantUserId);
    }
    // Free the token (one-shot).
    if (parts.length === 2) confirmStore.delete(parts[1]);

    // Get updated invoice
    const updatedInvoice = getInvoice(invoiceId);
    const { renderInvoiceEmbed, buildInvoiceButtons, sendPaidNotification } = require('./invoice-simple.cjs');

    // Get channel and delete old invoice message if exists
    const channel = await interaction.client.channels.fetch(updatedInvoice.channelId);

    // Delete the original invoice message (the one with buttons)
    if (updatedInvoice.messageId) {
      try {
        const oldMessage = await channel.messages.fetch(updatedInvoice.messageId);
        await oldMessage.delete();
        console.log(`[Payment] Old invoice message deleted`);
      } catch (err) {
        console.log(`[Payment] Could not delete old message: ${err.message}`);
      }
    }

    // Send new updated invoice message
    const embed = renderInvoiceEmbed(updatedInvoice);
    const components = buildInvoiceButtons(updatedInvoice.id);

    const newMessage = await channel.send({
      content: `✅ 1 orang ditandai lunas!`,
      embeds: [embed],
      components: [components]
    });

    // Update messageId in database
    const { updateInvoiceMessage } = require('../utils/invoice-db.cjs');
    updateInvoiceMessage(updatedInvoice.id, newMessage.id);

    console.log(`[Payment] New invoice message sent: ${newMessage.id}`);

    const totalLunas = amount || (participantIndices ? participantIndices.reduce((s, i) => s + (Number(invoice.participants[i]?.amount) || 0), 0) : Number(participant.amount) || 0);
    const billCount = participantIndices ? participantIndices.length : 1;
    await interaction.update({
      content: `✅ Pembayaran dikonfirmasi!\n\n` +
        `👤 ${participantName || participant.username} - Rp ${totalLunas.toLocaleString('id-ID')} → LUNAS${billCount > 1 ? ` _(gabungan ${billCount} bill)_` : ''}`,
      components: []
    });

    // Send paid notification to participant
    try {
      await sendPaidNotification(updatedInvoice, participant, interaction.guild);
    } catch (err) {
      console.log(`[Payment] Could not send paid notification:`, err.message);
    }

    // Notify payer
    try {
      const payer = await interaction.client.users.fetch(payerId);
      await payer.send({
        content: `✅ **Pembayaran Dikonfirmasi!**\n\n` +
          `Invoice: ${invoice.title || 'Untitled'}\n` +
          `Untuk: ${participant.username}\n` +
          `Jumlah: Rp ${Number(participant.amount).toLocaleString('id-ID')}\n\n` +
          `Terima kasih sudah bayar! 🎉`
      });
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
  handlePaymentProofDM,
  handlePaymentConfirm,
  getPaymentDisplay,
  paymentCommands,
  pendingClaims,
};
