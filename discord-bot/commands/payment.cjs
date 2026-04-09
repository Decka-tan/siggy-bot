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
async function handleBayar(interaction) {
  const { getGuildInvoices } = require('../utils/invoice-db.cjs');

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
  const invoiceId = interaction.values[0];
  const invoice = getInvoice(invoiceId);

  if (!invoice) {
    return interaction.update({
      content: '❌ Invoice tidak ditemukan.',
      components: []
    });
  }

  // Get only unpaid participants
  const unpaidParticipants = invoice.participants.filter(p => !p.paid);

  if (unpaidParticipants.length === 0) {
    return interaction.update({
      content: '✅ Semua orang di invoice ini udah lunas!',
      components: []
    });
  }

  // Build participant select menu
  const options = unpaidParticipants.map(p =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${p.username} - Rp ${Number(p.amount).toLocaleString('id-ID')}`)
      .setValue(p.userId)
      .setDescription(`Rp ${Number(p.amount).toLocaleString('id-ID')}`)
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`bayar_select_person_${invoiceId}`)
    .setPlaceholder('Bayar untuk siapa?')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({
    content: '💵 **Bayar untuk siapa?**\n\nPilih orang yang kamu bayarkan:',
    components: [row]
  });
}

/**
 * Handle person selection in payment flow - show payment info modal
 */
async function handleBayarSelectPerson(interaction) {
  const customId = interaction.customId;
  const invoiceId = customId.replace('bayar_select_person_', '');
  const participantUserId = interaction.values[0];

  const invoice = getInvoice(invoiceId);
  if (!invoice) {
    return interaction.update({
      content: '❌ Invoice tidak ditemukan.',
      components: []
    });
  }

  const participant = invoice.participants.find(p => p.userId === participantUserId);
  if (!participant) {
    return interaction.update({
      content: '❌ Participant tidak ditemukan.',
      components: []
    });
  }

  // Get creator's payment info
  const creatorPaymentInfo = getPaymentInfo(invoice.creator.id);

  // Store pending claim
  pendingClaims.set(interaction.user.id, {
    invoiceId,
    participantUserId,
    participantName: participant.username,
    amount: participant.amount,
    creatorId: invoice.creator.id,
    timestamp: Date.now()
  });

  // Build payment info message
  let description = `💵 **Bayar untuk: ${participant.username}**\n`;
  description += `💰 Jumlah: Rp ${Number(participant.amount).toLocaleString('id-ID')}\n`;
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
  } catch (err) {
    console.log(`[Payment] Could not DM ${interaction.user.username}:`, err.message);
  }
}

/**
 * Handle payment proof DM (image attachment)
 */
async function handlePaymentProofDM(message, client) {
  const pending = pendingClaims.get(message.author.id);

  // No pending claim, ignore
  if (!pending) return;
  if (Date.now() - pending.timestamp > CLAIM_TIMEOUT) {
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

  // Build confirm/reject buttons
  const confirmButton = new ButtonBuilder()
    .setCustomId(`payment_confirm_${pending.invoiceId}_${pending.participantUserId}_${message.author.id}`)
    .setLabel('✅ Confirm & Lunasi')
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId(`payment_reject_${pending.invoiceId}_${pending.participantUserId}_${message.author.id}`)
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
  // Format: payment_confirm_invoiceId_participantUserId_payerId
  const parts = customId.split('_');
  const invoiceId = parts[2];
  const participantUserId = parts[3];
  const payerId = parts[4];

  const invoice = getInvoice(invoiceId);
  if (!invoice) {
    return interaction.reply({
      content: '❌ Invoice tidak ditemukan.',
      ephemeral: true
    });
  }

  const participant = invoice.participants.find(p => p.userId === participantUserId);
  if (!participant) {
    return interaction.reply({
      content: '❌ Participant tidak ditemukan.',
      ephemeral: true
    });
  }

  if (action === 'confirm') {
    // Mark as paid
    markParticipantPaid(invoiceId, participantUserId);

    await interaction.update({
      content: `✅ Pembayaran dikonfirmasi!\n\n` +
        `👤 ${participant.username} - Rp ${Number(participant.amount).toLocaleString('id-ID')} → LUNAS`,
      components: []
    });

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

    // Update invoice message if exists
    try {
      const { renderInvoiceEmbed, buildInvoiceButtons } = require('./invoice-simple.cjs');
      const updatedInvoice = getInvoice(invoiceId);

      if (interaction.channel && updatedInvoice.messageId) {
        const channel = await interaction.client.channels.fetch(updatedInvoice.channelId);
        const msg = await channel.messages.fetch(updatedInvoice.messageId);

        await msg.edit({
          embeds: [renderInvoiceEmbed(updatedInvoice)],
          components: [buildInvoiceButtons(updatedInvoice.id)]
        });
      }
    } catch (err) {
      console.log(`[Payment] Could not update invoice message:`, err.message);
    }

  } else {
    // Reject
    await interaction.update({
      content: `❌ Pembayaran ditolak.\n\n` +
        `👤 ${participant.username} - Rp ${Number(participant.amount).toLocaleString('id-ID')} → BELUM LUNAS`,
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
