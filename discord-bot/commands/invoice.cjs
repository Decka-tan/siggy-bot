/**
 * INVOICE COMMANDS
 * Create and manage invoices with multi-step modals
 */

const {
  createInvoice,
  addParticipants,
  getInvoice,
  updateInvoiceMessage,
  getUserInvoices,
  markMultiplePaid,
  deleteInvoice,
  calculateTotalOwed,
} = require('../utils/invoice-db.cjs');
const {
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

// Temporary storage for incomplete invoice flows
const tempInvoiceStorage = new Map();

/**
 * Parse date input (supports "today", "tomorrow", YYYY-MM-DD, MM/DD/YYYY)
 */
function parseDateInput(dateStr) {
  if (!dateStr) return new Date();

  const lower = dateStr.toLowerCase().trim();

  if (lower === 'today') return new Date();
  if (lower === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // MM/DD/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return new Date(parseInt(slashMatch[3]), parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
  }

  return new Date();
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Resolve username to guild member
 * Supports: @mentions, username#discriminator, username only
 */
async function resolveUsername(guild, usernameInput) {
  if (!usernameInput || !usernameInput.trim()) return null;

  const input = usernameInput.trim();

  // Mention format
  const mentionMatch = input.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    try {
      return await guild.members.fetch(mentionMatch[1]);
    } catch {
      return null;
    }
  }

  // Discriminator format
  if (input.includes('#')) {
    const member = guild.members.cache.find(m => m.user.tag === input);
    return member || null;
  }

  // Username only (case-insensitive)
  const member = guild.members.cache.find(
    m => m.user.username.toLowerCase() === input.toLowerCase()
  );
  return member || null;
}

/**
 * Build Single Invoice Modal (all in one)
 */
function buildInvoiceModal() {
  const today = formatDate(new Date());

  const modal = new ModalBuilder()
    .setCustomId('invoice_create')
    .setTitle('🧾 Buat Invoice Baru');

  const dateInput = new TextInputBuilder()
    .setCustomId('invoice_date')
    .setLabel('Tanggal')
    .setValue(today)
    .setPlaceholder('YYYY-MM-DD atau "today" atau "tomorrow"')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const titleInput = new TextInputBuilder()
    .setCustomId('invoice_title')
    .setLabel('Judul Invoice (Opsional)')
    .setPlaceholder('Contoh: Makan bersama, Event, dll')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const participantsInput = new TextInputBuilder()
    .setCustomId('invoice_participants')
    .setLabel('List Orang (satu per baris)')
    .setPlaceholder('Format: username atau @mention\nContoh:\n@user1:50000\n@user2:75000\nuser3:100000')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  return modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(participantsInput)
  );
}

/**
 * Build Participants Modal (for adding more people)
 */
function buildParticipantsModal() {
  const modal = new ModalBuilder()
    .setCustomId('invoice_add_participants')
    .setTitle('➕ Tambah Orang ke Invoice');

  const participantsInput = new TextInputBuilder()
    .setCustomId('participants_list')
    .setLabel('List Orang (satu per baris)')
    .setPlaceholder('Format: username:jumlah\nContoh:\n@user1:50000\n@user2:75000')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  return modal.addComponents(new ActionRowBuilder().addComponents(participantsInput));
}

// Keep old function name for compatibility
function buildDetailsModal() {
  return buildInvoiceModal();
}

/**
 * Build Mark Paid Modal - single field with list format
 */
function buildMarkPaidModal(invoice) {
  const modal = new ModalBuilder()
    .setCustomId(`mark_paid_${invoice.id}`)
    .setTitle('✅ Tandai Sudah Bayar');

  // Build list of unpaid participants
  const unpaidList = invoice.participants
    .filter(p => !p.paid)
    .map((p, i) => `${i + 1}. ${p.username} - Rp ${p.amount.toLocaleString('id-ID')}`)
    .join('\n');

  const input = new TextInputBuilder()
    .setCustomId('paid_list')
    .setLabel('Nomor orang yang sudah bayar')
    .setPlaceholder(`Masukkan nomor yang sudah bayar, pisahkan dengan koma\n\n${unpaidList}`)
    .setValue('')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  return modal.addComponents(new ActionRowBuilder().addComponents(input));
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
    const status = p.paid ? '✅ Paid' : '💰 Unpaid';
    description += `${i + 1}. **${p.username}** - Rp ${p.amount.toLocaleString('id-ID')} - ${status}\n`;
  });

  const unpaidTotal = invoice.participants
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const embed = new EmbedBuilder()
    .setColor(unpaidTotal > 0 ? 0xf39c12 : 0x27ae60)
    .setTitle('🧾 INVOICE')
    .setDescription(description)
    .addFields(
      { name: '💰 Total', value: `Rp ${invoice.totalAmount.toLocaleString('id-ID')}`, inline: true },
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
      .setCustomId(`invoice_markpaid_${invoiceId}`)
      .setLabel('Mark Paid')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`invoice_add_${invoiceId}`)
      .setLabel('Add People')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`invoice_delete_${invoiceId}`)
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
    .reduce((sum, p) => sum + p.amount, 0);

  let description = '';

  invoices.forEach((inv, i) => {
    const unpaid = inv.participants.filter(p => !p.paid);
    if (unpaid.length > 0) {
      description += `**Invoice ${i + 1}:** ${inv.title || 'Untitled'}\n`;
      description += `  Date: ${inv.date} | Total: Rp ${inv.totalAmount.toLocaleString('id-ID')}\n`;
      unpaid.forEach(p => {
        description += `  • ${p.username}: Rp ${p.amount.toLocaleString('id-ID')}\n`;
      });
      description += '\n';
    }
  });

  if (!description) {
    description = '🎉 No outstanding invoices! Everyone has paid!';
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('💰 Your Invoice Recap')
    .setDescription(description)
    .addFields({
      name: '💵 Total Owed to You',
      value: `Rp ${totalOwed.toLocaleString('id-ID')}`,
      inline: false
    })
    .setFooter({ text: `Showing ${invoices.length} invoice(s)` })
    .setTimestamp();

  return embed;
}

/**
 * Handle /invoice create command
 */
async function handleInvoiceCreate(interaction) {
  await interaction.showModal(buildInvoiceModal());
}

/**
 * Handle /invoice recap command
 */
async function handleInvoiceRecap(interaction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  const invoices = getUserInvoices(userId).filter(inv => inv.guildId === guildId.toString());

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 You haven\'t created any invoices yet. Use `/invoice create` to get started!',
      ephemeral: true
    });
  }

  const embed = renderInvoiceRecapEmbed(invoices, userId);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Parse participants from text (format: username:amount)
 */
function parseParticipants(text, guild) {
  const participants = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try format "username:amount" or "@username:amount"
    const match = trimmed.match(/^(<@!?(\d+)>|[^:]+):(\d+)$/);
    if (match) {
      const mention = match[1];
      const userId = match[2] || null;
      const username = match[1];
      const amount = parseInt(match[3]);

      if (amount > 0) {
        let finalUsername = username;
        let finalUserId = userId || `unknown_${Date.now()}_${Math.random()}`;

        if (userId) {
          // It's a mention, try to get actual username
          try {
            const member = guild.members.cache.get(userId);
            if (member) {
              finalUsername = member.user.username;
              finalUserId = userId;
            }
          } catch {}
        } else {
          // It's a plain username, try to resolve
          const member = guild.members.cache.find(
            m => m.user.username.toLowerCase() === username.toLowerCase()
          );
          if (member) {
            finalUsername = member.user.username;
            finalUserId = member.id;
          }
        }

        participants.push({
          userId: finalUserId,
          username: finalUsername,
          amount: amount,
        });
      }
    }
  }

  return participants;
}

/**
 * Handle invoice modal submissions
 */
async function handleInvoiceModal(interaction, modalType) {
  try {
    if (modalType === 'details' || modalType === 'invoice_create') {
      // Process invoice creation modal
      const dateInput = interaction.fields.getTextInputValue('invoice_date');
      const titleInput = interaction.fields.getTextInputValue('invoice_title');
      const participantsInput = interaction.fields.getTextInputValue('invoice_participants');

      const date = parseDateInput(dateInput);
      const formattedDate = formatDate(date);

      // Create the invoice
      const invoice = createInvoice(
        interaction.guildId,
        interaction.channelId,
        interaction.user,
        titleInput,
        formattedDate
      );

      // Parse participants
      const participants = parseParticipants(participantsInput, interaction.guild);

      if (participants.length === 0) {
        return interaction.reply({
          content: '❌ Masukkan minimal 1 orang dengan format: `username:jumlah`\nContoh: `@user:50000`',
          ephemeral: true
        });
      }

      // Add participants to the invoice
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

      // Send the invoice embed
      await interaction.reply({
        content: '✅ Invoice berhasil dibuat!',
        embeds: [embed],
        components: [buttons]
      });

    } else if (modalType === 'invoice_add_participants') {
      // Add participants to existing invoice
      const userId = interaction.user.id;
      const tempInvoiceId = tempInvoiceStorage.get(userId);

      if (!tempInvoiceId) {
        return interaction.reply({
          content: '❌ Sesi invoice kadaluarsa. Mulai ulang dengan `/invoice create`.',
          ephemeral: true
        });
      }

      const participantsInput = interaction.fields.getTextInputValue('participants_list');
      const participants = parseParticipants(participantsInput, interaction.guild);

      if (participants.length === 0) {
        return interaction.reply({
          content: '❌ Masukkan minimal 1 orang dengan format: `username:jumlah`',
          ephemeral: true
        });
      }

      // Add participants to the invoice
      const result = addParticipants(tempInvoiceId, participants);

      if (!result.success) {
        return interaction.reply({
          content: `❌ Error: ${result.error}`,
          ephemeral: true
        });
      }

      // Clear temp storage
      tempInvoiceStorage.delete(userId);

      const invoice = result.invoice;
      const embed = renderInvoiceEmbed(invoice);
      const buttons = buildInvoiceButtons(invoice.id);

      await interaction.reply({
        content: '✅ Orang berhasil ditambahkan ke invoice!',
        embeds: [embed],
        components: [buttons]
      });

    } else if (modalType.startsWith('mark_paid_')) {
      // Process Mark Paid modal
      const invoiceId = modalType.replace('mark_paid_', '');
      const invoice = getInvoice(invoiceId);

      if (!invoice) {
        return interaction.reply({
          content: '❌ Invoice tidak ditemukan.',
          ephemeral: true
        });
      }

      // Parse comma-separated numbers
      const paidInput = interaction.fields.getTextInputValue('paid_list');
      const unpaidParticipants = invoice.participants.filter(p => !p.paid);
      const paidUserIds = [];

      if (paidInput && paidInput.trim()) {
        const numbers = paidInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        for (const num of numbers) {
          if (num > 0 && num <= unpaidParticipants.length) {
            paidUserIds.push(unpaidParticipants[num - 1].userId);
          }
        }
      }

      // Update payment status
      const result = markMultiplePaid(invoiceId, paidUserIds);

      if (!result.success) {
        return interaction.reply({
          content: `❌ Error: ${result.error}`,
          ephemeral: true
        });
      }

      const updatedInvoice = result.invoice;
      const embed = renderInvoiceEmbed(updatedInvoice);
      const buttons = buildInvoiceButtons(invoiceId);

      await interaction.update({
        content: '✅ Status pembayaran diperbarui!',
        embeds: [embed],
        components: [buttons]
      });
    }
  } catch (error) {
    console.error('[Invoice Modal] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Terjadi error: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

/**
 * Handle invoice button interactions
 */
async function handleInvoiceButton(interaction, action) {
  try {
    const customId = interaction.customId;
    // Extract invoice ID by removing prefix
    let invoiceId;
    if (customId.startsWith('invoice_markpaid_')) {
      invoiceId = customId.replace('invoice_markpaid_', '');
    } else if (customId.startsWith('invoice_add_')) {
      invoiceId = customId.replace('invoice_add_', '');
    } else if (customId.startsWith('invoice_delete_')) {
      invoiceId = customId.replace('invoice_delete_', '');
    }

    const invoice = getInvoice(invoiceId);

    if (!invoice) {
      return interaction.reply({
        content: '❌ Invoice not found. It may have been deleted.',
        ephemeral: true
      });
    }

    // Check if the user is the creator
    if (invoice.creator.id !== interaction.user.id) {
      return interaction.reply({
        content: '❌ Only the invoice creator can perform this action.',
        ephemeral: true
      });
    }

    if (action === 'markpaid') {
      await interaction.showModal(buildMarkPaidModal(invoice));

    } else if (action === 'add') {
      // Show the add participants modal
      tempInvoiceStorage.set(interaction.user.id, invoiceId);
      await interaction.showModal(buildParticipantsModal());

    } else if (action === 'delete') {
      const result = deleteInvoice(invoiceId);

      if (!result.success) {
        return interaction.reply({
          content: `❌ Error: ${result.error}`,
          ephemeral: true
        });
      }

      await interaction.update({
        content: '🗑️ Invoice deleted successfully.',
        embeds: [],
        components: []
      });
    }
  } catch (error) {
    console.error('[Invoice Button] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  }
}

// Invoice command definitions
const invoiceCommands = [
  {
    name: 'invoice',
    description: 'Create and manage invoices',
    options: [
      {
        name: 'create',
        description: 'Create a new invoice',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'recap',
        description: 'Show all invoices and total owed to you',
        type: 1,
      },
    ],
  },
];

module.exports = {
  handleInvoiceCreate,
  handleInvoiceRecap,
  handleInvoiceModal,
  handleInvoiceButton,
  invoiceCommands,
  tempInvoiceStorage,
};
