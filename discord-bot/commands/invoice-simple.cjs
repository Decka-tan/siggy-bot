/**
 * INVOICE COMMANDS - Simplified (NO MODALS)
 * Using slash command options instead of modals
 */

const {
  createInvoice,
  addParticipants,
  getInvoice,
  updateInvoiceMessage,
  getUserInvoices,
  markMultiplePaid,
  deleteInvoice,
} = require('../utils/invoice-db.cjs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Parse participants from argument string
 * Format: "@user1 15000, @user2 13000" or multiple users
 */
function parseParticipantsFromArgs(args, guild) {
  const participants = [];

  // Handle multiple user mentions with amounts
  // Args could be like: ["@user1", "15000", "@user2", "13000"] or as a single string
  let inputString = args.join(' ');

  // Try to parse pattern: @mention amount, @mention amount, etc.
  const regex = /<@!?(\d+)>\s+(\d+[kK]?\s*)/g;
  const matches = [...inputString.matchAll(new RegExp(/<@!?(\d+)>\s+(\d+[kK]?\s*)/g))];

  for (const match of matches) {
    const userId = match[1];
    const amountStr = match[2].toLowerCase().replace('k', '000');
    const amount = parseInt(amountStr);

    if (amount > 0) {
      try {
        const member = guild.members.cache.get(userId);
        if (member) {
          participants.push({
            userId: member.id,
            username: member.user.username,
            amount: amount,
            paid: false,
          });
        }
      } catch {}
    }
  }

  return participants;
}

/**
 * /invoice create — slash command with inline options
 */
async function handleInvoiceCreateSimple(interaction) {
  const title = interaction.options.getString('title') || '';
  const date = interaction.options.getString('date') || new Date().toISOString().split('T')[0];
  const people = interaction.options.getString('people') || '';

  const guild = interaction.guild;

  // Parse people input
  const participants = [];
  const lines = people.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match: @mention amount or username amount
    const match = trimmed.match(/^(<@!?(\d+)>|[\w\d]+)\s+(\d+[kK]?\s*)(.*)?$/);
    if (match) {
      const mentionOrUsername = match[1];
      const userId = match[2] || null;
      let amountStr = match[3].toLowerCase().replace('k', '000');
      const notes = match[4] ? match[4].trim() : '';

      let amount = parseInt(amountStr.replace(/\D/g, ''));
      if (amountStr.includes('k')) {
        amount = parseInt(amountStr.replace('k', '000')) || amount;
      }

      if (amount > 0) {
        let finalUsername = mentionOrUsername;
        let finalUserId = userId;

        if (userId) {
          try {
            const member = guild.members.cache.get(userId);
            if (member) {
              finalUsername = member.user.username;
              finalUserId = userId;
            }
          } catch {}
        } else {
          const member = guild.members.cache.find(
            m => m.user.username.toLowerCase() === mentionOrUsername.toLowerCase()
          );
          if (member) {
            finalUsername = member.user.username;
            finalUserId = member.id;
          }
        }

        const isPaid = /lunas|paid|bayar/i.test(notes);

        participants.push({
          userId: finalUserId || `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          username: finalUsername,
          amount: amount,
          notes: notes || null,
          paid: isPaid,
        });
      }
    }
  }

  if (participants.length === 0) {
    return interaction.reply({
      content: '❌ Format salah! Contoh:\n` +
        '`/invoice-create title:"Makan Bareng" people:"@user1 15k\n@user2 13000 lunas"`',
      ephemeral: true
    });
  }

  // Create invoice
  const invoice = createInvoice(
    interaction.guildId,
    interaction.channelId,
    { id: interaction.user.id, username: interaction.user.username },
    title,
    date
  );

  const result = addParticipants(invoice.id, participants);

  if (!result.success) {
    return interaction.reply({
      content: `❌ Error: ${result.error}`,
      ephemeral: true
    });
  }

  const finalInvoice = result.invoice;
  const embed = renderInvoiceEmbed(finalInvoice);
  const buttons = buildInvoiceButtons(finalInvoice.id);

  await interaction.reply({
    content: '✅ Invoice berhasil dibuat!',
    embeds: [embed],
    components: [buttons]
  });

  // Update message ID
  const message = await interaction.fetchReply();
  updateInvoiceMessage(finalInvoice.id, message.id);
}

/**
 * Render invoice embed
 */
function renderInvoiceEmbed(invoice) {
  const paidCount = invoice.participants.filter(p => p.paid).length;
  const totalCount = invoice.participants.length;

  let description = invoice.title
    ? `**${invoice.title}**\n\n`
    : '';

  description += `📅 **Date:** ${invoice.date}\n`;
  description += `👤 **Created by:** ${invoice.creator.username}\n\n`;
  description += '**Participants:**\n';

  invoice.participants.forEach((p, i) => {
    const status = p.paid ? '✅' : '💰';
    const notes = p.notes ? ` *(${p.notes})*` : '';
    const amount = isNaN(p.amount) ? 0 : p.amount;
    description += `${i + 1}. **${p.username}** - Rp ${amount.toLocaleString('id-ID')} ${status}${notes}\n`;
  });

  const unpaidTotal = invoice.participants
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);

  const totalAmount = isNaN(invoice.totalAmount) ? 0 : invoice.totalAmount;

  const embed = new EmbedBuilder()
    .setColor(unpaidTotal > 0 ? 0xf39c12 : 0x27ae60)
    .setTitle('🧾 INVOICE')
    .setDescription(description)
    .addFields(
      { name: '💰 Total', value: `Rp ${totalAmount.toLocaleString('id-ID')}`, inline: true },
      { name: '📊 Status', value: `${paidCount}/${totalCount} paid`, inline: true },
      { name: '⏳ Outstanding', value: `Rp ${unpaidTotal.toLocaleString('id-ID')}`, inline: true }
    )
    .setFooter({ text: `Invoice ID: ${invoice.id}` })
    .setTimestamp(invoice.createdAt);

  return embed;
}

/**
 * Build invoice action buttons
 */
function buildInvoiceButtons(invoiceId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`invoice_pay_${invoiceId}`)
      .setLabel('Mark Paid')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`invoice_add_${invoiceId}`)
      .setLabel('Add People')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`invoice_del_${invoiceId}`)
      .setLabel('Delete')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Render invoice recap embed
 */
function renderInvoiceRecapEmbed(invoices, creatorId) {
  const totalOwed = invoices
    .flatMap(inv => inv.participants)
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);

  let description = '';

  invoices.forEach((inv, i) => {
    const unpaid = inv.participants.filter(p => !p.paid);
    if (unpaid.length > 0) {
      description += `**Invoice ${i + 1}:** ${inv.title || 'Untitled'}\n`;
      const totalAmount = isNaN(inv.totalAmount) ? 0 : inv.totalAmount;
      description += `  Date: ${inv.date} | Total: Rp ${totalAmount.toLocaleString('id-ID')}\n`;
      unpaid.forEach(p => {
        const amount = isNaN(p.amount) ? 0 : p.amount;
        description += `  • ${p.username}: Rp ${amount.toLocaleString('id-ID')}\n`;
      });
      description += '\n';
    }
  });

  if (!description) {
    description = '🎉 Tidak ada invoice tertunda! Semua sudah lunas.';
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('💰 Invoice Recap')
    .setDescription(description)
    .addFields({
      name: '💵 Total Tertunda',
      value: `Rp ${totalOwed.toLocaleString('id-ID')}`,
      inline: false
    })
    .setFooter({ text: `Showing ${invoices.length} invoice(s)` })
    .setTimestamp();

  return embed;
}

/**
 * Handle invoice button interactions
 */
async function handleInvoiceButton(interaction, action) {
  try {
    const customId = interaction.customId;
    let invoiceId;

    if (customId.startsWith('invoice_pay_')) {
      invoiceId = customId.replace('invoice_pay_', '');
    } else if (customId.startsWith('invoice_add_')) {
      invoiceId = customId.replace('invoice_add_', '');
    } else if (customId.startsWith('invoice_del_')) {
      invoiceId = customId.replace('invoice_del_', '');
    }

    const invoice = getInvoice(invoiceId);

    if (!invoice) {
      return interaction.reply({
        content: '❌ Invoice tidak ditemukan.',
        ephemeral: true
      });
    }

    // Check if the user is the creator
    if (invoice.creator.id !== interaction.user.id) {
      return interaction.reply({
        content: '❌ Hanya pembuat invoice yang bisa aksi ini.',
        ephemeral: true
      });
    }

    if (action === 'pay') {
      // Simple reply: ask for numbers
      const unpaid = invoice.participants.filter(p => !p.paid);
      if (unpaid.length === 0) {
        return interaction.reply({
          content: '✅ Semua orang sudah lunas!',
          ephemeral: true
        });
      }

      const list = unpaid.map((p, i) => `${i + 1}. ${p.username} - Rp ${p.amount.toLocaleString('id-ID')}`).join('\n');
      return interaction.reply({
        content: `📋 Pilih yang lunas (reply dengan nomor):\n${list}\n\nContoh reply: "1, 3"`,
        ephemeral: true
      });

    } else if (action === 'add') {
      return interaction.reply({
        content: '💡 Fitur tambah orang belum tersedia. Buat invoice baru aja.',
        ephemeral: true
      });

    } else if (action === 'delete') {
      const result = deleteInvoice(invoiceId);

      if (!result.success) {
        return interaction.reply({
          content: `❌ Error: ${result.error}`,
          ephemeral: true
        });
      }

      await interaction.update({
        content: '🗑️ Invoice dihapus.',
        embeds: [],
        components: []
      });
    }
  } catch (error) {
    console.error('[Invoice Button] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

// Command definitions
const invoiceCommandsSimple = [
  {
    name: 'invoice-create',
    description: 'Buat invoice baru',
    options: [
      {
        name: 'title',
        description: 'Judul invoice (opsional)',
        type: 3, // STRING
        required: false,
      },
      {
        name: 'date',
        description: 'Tanggal invoice (YYYY-MM-DD)',
        type: 3,
        required: false,
      },
      {
        name: 'people',
        description: 'List orang & jumlah (satu per baris)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'invoice-recap',
    description: 'Lihat semua invoice kamu',
    type: 1, // SUB_COMMAND
  },
];

module.exports = {
  handleInvoiceCreateSimple,
  renderInvoiceEmbed,
  buildInvoiceButtons,
  renderInvoiceRecapEmbed,
  invoiceCommandsSimple,
  handleInvoiceButton,
  // Also export empty handlers for backward compatibility
  handleInvoiceCreate: () => {},
  handleInvoiceRecap: () => {},
  handleInvoiceModal: () => {},
  // Export tempInvoiceStorage for compatibility
  tempInvoiceStorage: new Map(),
};
