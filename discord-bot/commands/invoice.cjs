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
 * Build Step 1: Details Modal
 */
function buildDetailsModal() {
  const today = formatDate(new Date());

  const modal = new ModalBuilder()
    .setCustomId('invoice_details')
    .setTitle('🧾 Create Invoice - Step 1: Details');

  const dateInput = new TextInputBuilder()
    .setCustomId('invoice_date')
    .setLabel('Invoice Date')
    .setValue(today)
    .setPlaceholder('YYYY-MM-DD or "today" or "tomorrow"')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const titleInput = new TextInputBuilder()
    .setCustomId('invoice_title')
    .setLabel('Invoice Title (Optional)')
    .setPlaceholder('e.g., Event Supplies, Team Dinner')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  return modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(titleInput)
  );
}

/**
 * Build Step 2: Participants Modal (5 rows)
 */
function buildParticipantsModal() {
  const modal = new ModalBuilder()
    .setCustomId('invoice_participants')
    .setTitle('🧾 Create Invoice - Step 2: Add People');

  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const usernameInput = new TextInputBuilder()
      .setCustomId(`user_${i}`)
      .setLabel(`Person ${i} - Username`)
      .setPlaceholder('@username or username#1234')
      .setStyle(TextInputStyle.Short)
      .setRequired(i === 1);

    const amountInput = new TextInputBuilder()
      .setCustomId(`amount_${i}`)
      .setLabel(`Person ${i} - Jumlah (Rp)`)
      .setPlaceholder('Contoh: 50000')
      .setStyle(TextInputStyle.Short)
      .setRequired(i === 1);

    rows.push(
      new ActionRowBuilder().addComponents(usernameInput),
      new ActionRowBuilder().addComponents(amountInput)
    );
  }

  return modal.addComponents(...rows);
}

/**
 * Build Mark Paid Modal
 */
function buildMarkPaidModal(invoice) {
  const modal = new ModalBuilder()
    .setCustomId(`mark_paid_${invoice.id}`)
    .setTitle('✅ Mark Participants as Paid');

  const rows = invoice.participants.map((p) => {
    const checkbox = new TextInputBuilder()
      .setCustomId(`paid_${p.userId}`)
      .setLabel(`${p.username} - Rp ${p.amount.toLocaleString('id-ID')}`)
      .setPlaceholder('Type "yes" to mark as paid, leave blank for unpaid')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    return new ActionRowBuilder().addComponents(checkbox);
  });

  return modal.addComponents(...rows);
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
  await interaction.showModal(buildDetailsModal());
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
 * Handle invoice modal submissions
 */
async function handleInvoiceModal(interaction, modalType) {
  try {
    if (modalType === 'details') {
      // Process Step 1: Details modal
      const dateInput = interaction.fields.getTextInputValue('invoice_date');
      const titleInput = interaction.fields.getTextInputValue('invoice_title');

      const date = parseDateInput(dateInput);
      const formattedDate = formatDate(date);

      // Create a temporary invoice
      const invoice = createInvoice(
        interaction.guildId,
        interaction.channelId,
        interaction.user,
        titleInput,
        formattedDate
      );

      // Store in temp for the next step
      tempInvoiceStorage.set(interaction.user.id, invoice.id);

      // Show button to add participants
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`invoice_add_participants_${invoice.id}`)
          .setLabel('➕ Add Participants')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        content: `✅ Invoice **${titleInput || 'Untitled'}** created! Now add the people who owe you.`,
        components: [row],
        ephemeral: true
      });

    } else if (modalType === 'participants') {
      // Process Step 2: Participants modal
      const userId = interaction.user.id;
      const tempInvoiceId = tempInvoiceStorage.get(userId);

      if (!tempInvoiceId) {
        return interaction.reply({
          content: '❌ Invoice session expired. Please start over with `/invoice create`.',
          ephemeral: true
        });
      }

      const guild = interaction.guild;
      const participants = [];
      const errors = [];

      // Parse 5 participant rows
      for (let i = 1; i <= 5; i++) {
        const username = interaction.fields.getTextInputValue(`user_${i}`)?.trim();
        const amountStr = interaction.fields.getTextInputValue(`amount_${i}`)?.trim();

        if (!username) continue;

        const amount = parseFloat(amountStr);

        if (isNaN(amount) || amount <= 0) {
          errors.push(`Person ${i}: Invalid amount "${amountStr}"`);
          continue;
        }

        // Try to resolve the username
        const member = await resolveUsername(guild, username);

        participants.push({
          userId: member ? member.id : `unknown_${i}`,
          username: member ? member.user.username : username,
          amount: amount,
        });
      }

      if (participants.length === 0) {
        return interaction.reply({
          content: '❌ Please add at least one participant.',
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

      // Send the invoice embed
      const msg = await interaction.reply({
        content: '✅ Invoice created successfully!',
        embeds: [embed],
        components: [buttons],
        fetchReply: true
      });

      // Update the invoice with the message ID
      updateInvoiceMessage(invoice.id, msg.id);

    } else if (modalType.startsWith('mark_paid')) {
      // Process Mark Paid modal
      const invoiceId = modalType.replace('mark_paid_', '');
      const invoice = getInvoice(invoiceId);

      if (!invoice) {
        return interaction.reply({
          content: '❌ Invoice not found.',
          ephemeral: true
        });
      }

      // Collect all user IDs marked as paid
      const paidUserIds = [];
      const allParticipants = invoice.participants;

      for (const p of allParticipants) {
        const value = interaction.fields.getTextInputValue(`paid_${p.userId}`);
        if (value && value.toLowerCase().trim() === 'yes') {
          paidUserIds.push(p.userId);
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
        content: '✅ Payment status updated!',
        embeds: [embed],
        components: [buttons]
      });
    }
  } catch (error) {
    console.error('[Invoice Modal] Error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
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
    const invoiceId = customId.split('_').pop();
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
      // Show the participants modal again
      tempInvoiceStorage.set(interaction.user.id, invoiceId);

      await interaction.reply({
        content: 'ℹ️ Adding more people to your invoice...',
        ephemeral: true
      });

      await interaction.followUp({ modal: buildParticipantsModal() });

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

/**
 * Handle adding participants to existing invoice (called from modal)
 */
async function handleAddParticipantsToExisting(interaction, invoiceId) {
  const guild = interaction.guild;
  const participants = [];
  const errors = [];

  // Parse 5 participant rows
  for (let i = 1; i <= 5; i++) {
    const username = interaction.fields.getTextInputValue(`user_${i}`)?.trim();
    const amountStr = interaction.fields.getTextInputValue(`amount_${i}`)?.trim();

    if (!username) continue;

    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      errors.push(`Person ${i}: Invalid amount "${amountStr}"`);
      continue;
    }

    // Try to resolve the username
    const member = await resolveUsername(guild, username);

    participants.push({
      userId: member ? member.id : `unknown_${i}`,
      username: member ? member.user.username : username,
      amount: amount,
    });
  }

  if (participants.length === 0) {
    return interaction.reply({
      content: '❌ Please add at least one participant.',
      ephemeral: true
    });
  }

  // Add participants to the invoice
  const result = addParticipants(invoiceId, participants);

  if (!result.success) {
    return interaction.reply({
      content: `❌ Error: ${result.error}`,
      ephemeral: true
    });
  }

  // Clear temp storage
  tempInvoiceStorage.delete(interaction.user.id);

  const invoice = result.invoice;
  const embed = renderInvoiceEmbed(invoice);
  const buttons = buildInvoiceButtons(invoice.id);

  await interaction.reply({
    content: '✅ Participants added to your invoice!',
    embeds: [embed],
    components: [buttons]
  });
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
  handleAddParticipantsToExisting,
  invoiceCommands,
  tempInvoiceStorage,
  buildParticipantsModal,
};
