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
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

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
 * /invoice create — shows modal form
 */
async function handleInvoiceCreateSimple(interaction) {
  // Show modal instead of processing directly
  const modal = new ModalBuilder()
    .setCustomId('invoice_create_modal')
    .setTitle('🧾 Buat Invoice Baru');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Judul Invoice (opsional)')
    .setPlaceholder('Contoh: Makan Siang, Kopi, dll')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('Tanggal')
    .setPlaceholder(new Date().toISOString().split('T')[0])
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const peopleInput = new TextInputBuilder()
    .setCustomId('people')
    .setLabel('Orang & Jumlah (satu per baris)')
    .setPlaceholder('@user1 15000\n@user2 20000\natau: username1 15k')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const row1 = new ActionRowBuilder().addComponents(titleInput);
  const row2 = new ActionRowBuilder().addComponents(dateInput);
  const row3 = new ActionRowBuilder().addComponents(peopleInput);

  modal.addComponents(row1, row2, row3);

  return interaction.showModal(modal);
}

/**
 * Process invoice creation modal submit
 */
async function processInvoiceCreateModal(interaction) {
  const title = interaction.fields.getTextInputValue('title') || '';
  const date = interaction.fields.getTextInputValue('date') || new Date().toISOString().split('T')[0];
  const people = interaction.fields.getTextInputValue('people') || '';

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
      content: '❌ Format salah! Contoh: `/invoice-create people:"@user 15000"`',
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
    const paid = inv.participants.filter(p => p.paid);
    const unpaid = inv.participants.filter(p => !p.paid);

    if (inv.participants.length > 0) {
      description += `**Invoice ${i + 1}:** ${inv.title || 'Untitled'}\n`;
      const totalAmount = isNaN(inv.totalAmount) ? 0 : inv.totalAmount;
      description += `  📅 ${inv.date} | 💰 Total: Rp ${totalAmount.toLocaleString('id-ID')}\n`;

      // Show paid participants
      if (paid.length > 0) {
        description += `  ✅ **Lunas:**\n`;
        paid.forEach(p => {
          const amount = isNaN(p.amount) ? 0 : p.amount;
          description += `     • ${p.username}: Rp ${amount.toLocaleString('id-ID')}\n`;
        });
      }

      // Show unpaid participants
      if (unpaid.length > 0) {
        description += `  ⏳ **Belum Lunas:**\n`;
        unpaid.forEach(p => {
          const amount = isNaN(p.amount) ? 0 : p.amount;
          description += `     • ${p.username}: Rp ${amount.toLocaleString('id-ID')}\n`;
        });
      }

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
 * Build modal for marking participants as paid
 * Uses a select menu for choosing who paid
 */
function buildMarkPaidModal(invoiceId, unpaidParticipants) {
  const selectOptions = unpaidParticipants.map((p, index) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${p.username} - Rp ${p.amount.toLocaleString('id-ID')}`)
      .setValue(p.userId || `index_${index}`)
      .setDescription(`Rp ${p.amount.toLocaleString('id-ID')}`)
  );

  // Split into chunks of 25 if needed (Discord limit)
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`mark_paid_select_${invoiceId}`)
    .setPlaceholder('Pilih orang yang sudah lunas...')
    .setMinValues(1)
    .setMaxValues(unpaidParticipants.length)
    .addOptions(selectOptions.slice(0, 25));

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return {
    type: 'select_menu',
    customId: `mark_paid_modal_${invoiceId}`,
    components: [row],
    unpaidParticipants
  };
}

/**
 * Build modal for adding participants to an invoice
 * Uses a modal with user mention and amount inputs
 */
function buildAddPeopleModal(invoiceId) {
  const modal = new ModalBuilder()
    .setCustomId(`add_people_modal_${invoiceId}`)
    .setTitle('Tambah Orang ke Invoice');

  const userMentionInput = new TextInputBuilder()
    .setCustomId('user_mentions')
    .setLabel('User (mention atau username, pisahkan dengan koma)')
    .setPlaceholder('@user1, @user2 atau username1, username2')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const amountInput = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel('Jumlah per orang')
    .setPlaceholder('15000 atau 15k')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const notesInput = new TextInputBuilder()
    .setCustomId('notes')
    .setLabel('Catatan (opsional)')
    .setPlaceholder('Catatan tambahan...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const row1 = new ActionRowBuilder().addComponents(userMentionInput);
  const row2 = new ActionRowBuilder().addComponents(amountInput);
  const row3 = new ActionRowBuilder().addComponents(notesInput);

  modal.addComponents(row1, row2, row3);

  return modal;
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
      // Show select menu for marking people as paid
      const unpaid = invoice.participants.filter(p => !p.paid);
      if (unpaid.length === 0) {
        return interaction.reply({
          content: '✅ Semua orang sudah lunas!',
          ephemeral: true
        });
      }

      const { components, customId: selectMenuCustomId } = buildMarkPaidModal(invoiceId, unpaid);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`mark_paid_select_${invoiceId}`)
          .setPlaceholder('Pilih orang yang sudah lunas...')
          .setMinValues(1)
          .setMaxValues(unpaid.length)
          .addOptions(unpaid.slice(0, 25).map((p, i) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${p.username} - Rp ${p.amount.toLocaleString('id-ID')}`)
              .setValue(p.userId || `index_${i}`)
              .setDescription(`Rp ${p.amount.toLocaleString('id-ID')}`)
          ))
      );

      return interaction.reply({
        content: '✅ Pilih orang yang sudah bayar:',
        components: [row],
        ephemeral: true
      });

    } else if (action === 'add') {
      // Show modal for adding people
      const modal = buildAddPeopleModal(invoiceId);
      return interaction.showModal(modal);

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

/**
 * /invoice-recap handler - Show all invoices for a user
 */
async function handleInvoiceRecap(interaction) {
  const invoices = getUserInvoices(interaction.user.id);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice.',
      ephemeral: true
    });
  }

  const embed = renderInvoiceRecapEmbed(invoices, interaction.user.id);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

// Command definitions
const invoiceCommandsSimple = [
  {
    name: 'invoice-create',
    description: 'Buat invoice baru',
  },
  {
    name: 'invoice-recap',
    description: 'Lihat semua invoice kamu',
  },
];

module.exports = {
  handleInvoiceCreateSimple,
  processInvoiceCreateModal,
  handleInvoiceRecap,
  renderInvoiceEmbed,
  buildInvoiceButtons,
  renderInvoiceRecapEmbed,
  invoiceCommandsSimple,
  handleInvoiceButton,
  buildMarkPaidModal,
  buildAddPeopleModal,
  // Also export empty handlers for backward compatibility
  handleInvoiceCreate: () => {},
  handleInvoiceModal: () => {},
  // Export tempInvoiceStorage for compatibility
  tempInvoiceStorage: new Map(),
};
