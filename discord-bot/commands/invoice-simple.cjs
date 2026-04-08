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
  getUserDebts,
  getAllParticipantNames,
  getDebtsByName,
  addNameAlias,
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
      } catch (err) {
        // Member not found or error fetching, skip this participant
        console.error(`[Invoice] Error fetching member: ${err.message}`);
      }
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

      // Validate amount is a positive number
      if (isNaN(amount) || amount <= 0) {
        continue; // Skip invalid entries
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
          } catch (err) {
            // Member fetch failed, will use username as-is
            console.error(`[Invoice] Error fetching user ${userId}: ${err.message}`);
          }
        } else {
          // No @mention - just use the name as-is (nickname/real name is fine)
          finalUsername = mentionOrUsername;
          finalUserId = null; // No Discord ID available
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

  // Try to match participants to guild members for DM
  await matchParticipantsToGuild(finalInvoice, interaction.guild);

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

  // Send DM notifications to participants
  await sendInvoiceNotifications(finalInvoice, interaction.guild);
}

/**
 * Match invoice participants to guild members by username
 * This enables DM for users who were added without @mention
 */
async function matchParticipantsToGuild(invoice, guild) {
  const { updateInvoiceMessage: updateMsg, getInvoice: getInv, markMultiplePaid } = require('../utils/invoice-db.cjs');

  let updated = false;

  for (const participant of invoice.participants) {
    // Skip if already has a valid userId
    if (participant.userId && !participant.userId.startsWith('unknown_')) {
      continue;
    }

    // Try to find by username
    const member = guild.members.cache.find(
      m => m.user.username.toLowerCase() === participant.username.toLowerCase() ||
           m.displayName.toLowerCase() === participant.username.toLowerCase()
    );

    if (member) {
      participant.userId = member.id;
      updated = true;
    }
  }

  // Save updated participant data using DB function
  if (updated) {
    // Update participants in DB by reading, updating, and writing back
    const db = require('../utils/invoice-db.cjs');
    const data = db.readDB();

    if (data.invoices[invoice.id]) {
      data.invoices[invoice.id].participants = invoice.participants;
      db.writeDB(data);
    }
  }
}

/**
 * Send DM notifications to invoice participants
 */
async function sendInvoiceNotifications(invoice, guild) {
  for (const participant of invoice.participants) {
    if (participant.userId && participant.userId.startsWith && !participant.userId.startsWith('unknown_')) {
      try {
        const user = await guild.client.users.fetch(participant.userId);
        if (user && !user.bot) {
          const amount = isNaN(participant.amount) ? 0 : participant.amount;
          await user.send({
            content: `🧾 **Invoice Baru!**\n\n` +
              `Kamu ditambahkan ke invoice: **${invoice.title || 'Untitled'}**\n` +
              `💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n` +
              `📅 Tanggal: ${invoice.date}\n` +
              `👤 Dibuat oleh: ${invoice.creator.username}\n\n` +
              `_Silakan lunasi secepatnya. Terima kasih!_`
          });
        }
      } catch (err) {
        // User has DMs disabled or doesn't exist, skip
        console.log(`[Invoice] Could not send DM to ${participant.username}:`, err.message);
      }
    }
  }
}

/**
 * Send DM notification when marked as paid
 */
async function sendPaidNotification(invoice, participant, guild) {
  if (participant.userId && !participant.userId.startsWith('unknown_')) {
    try {
      const user = await guild.client.users.fetch(participant.userId);
      if (user && !user.bot) {
        const amount = isNaN(participant.amount) ? 0 : participant.amount;
        await user.send({
          content: `✅ **Pembayaran Dikonfirmasi!**\n\n` +
            `Invoice: **${invoice.title || 'Untitled'}**\n` +
            `💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n` +
            `📅 Tanggal: ${invoice.date}\n\n` +
            `_Terima kasih sudah melunasi!_`
        });
      }
    } catch (err) {
      console.log(`[Invoice] Could not send paid DM to ${participant.username}:`, err.message);
    }
  }
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
      .setCustomId(`invoice_remind_${invoiceId}`)
      .setLabel('Remind')
      .setEmoji('🔔')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`invoice_settle_${invoiceId}`)
      .setLabel('Settle All')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`invoice_add_${invoiceId}`)
      .setLabel('Add')
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
    const creatorName = inv.creator.username;

    if (inv.participants.length > 0) {
      description += `**Invoice ${i + 1}:** ${inv.title || 'Untitled'}\n`;
      description += `  👤 Dibuat oleh: ${creatorName}\n`;
      const totalAmount = isNaN(inv.totalAmount) ? 0 : inv.totalAmount;
      description += `  📅 ${inv.date} | 💰 Total: Rp ${totalAmount.toLocaleString('id-ID')}\n`;

      // Show paid participants with "lunas ke creator"
      if (paid.length > 0) {
        description += `  ✅ **Lunas:**\n`;
        paid.forEach(p => {
          const amount = isNaN(p.amount) ? 0 : p.amount;
          description += `     • ${p.username}: Rp ${amount.toLocaleString('id-ID')} → ${creatorName}\n`;
        });
      }

      // Show unpaid participants with "hutang ke creator"
      if (unpaid.length > 0) {
        description += `  ⏳ **Belum Lunas:**\n`;
        unpaid.forEach(p => {
          const amount = isNaN(p.amount) ? 0 : p.amount;
          description += `     • ${p.username} hutang Rp ${amount.toLocaleString('id-ID')} ke ${creatorName}\n`;
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
    .setLabel('User (@mention atau username, koma)')
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
    } else if (customId.startsWith('invoice_remind_')) {
      invoiceId = customId.replace('invoice_remind_', '');
    } else if (customId.startsWith('invoice_settle_')) {
      invoiceId = customId.replace('invoice_settle_', '');
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

    // Permission check:
    // - remind: Anyone can use (to remind people to pay)
    // - pay, settle, add, delete: Only creator
    const actionsRequiringCreator = ['pay', 'settle', 'add', 'delete'];
    if (actionsRequiringCreator.includes(action) && invoice.creator.id !== interaction.user.id) {
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

    } else if (action === 'remind') {
      // Send reminder DMs to unpaid participants
      const unpaid = invoice.participants.filter(p => !p.paid);
      if (unpaid.length === 0) {
        return interaction.reply({
          content: '✅ Semua orang sudah lunas!',
          ephemeral: true
        });
      }

      let sentCount = 0;
      for (const participant of unpaid) {
        if (participant.userId && !participant.userId.startsWith('unknown_')) {
          try {
            const user = await interaction.guild.client.users.fetch(participant.userId);
            if (user && !user.bot) {
              const amount = isNaN(participant.amount) ? 0 : participant.amount;
              await user.send({
                content: `🔔 **Pengingat Pembayaran**\n\n` +
                  `Halo ${participant.username}! 👋\n\n` +
                  `Kamu masih memiliki tagihan invoice:\n` +
                  `📋 **${invoice.title || 'Untitled'}**\n` +
                  `💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n` +
                  `📅 Tanggal: ${invoice.date}\n\n` +
                  `_Mohon segera lunasi. Terima kasih!_`
              });
              sentCount++;
            }
          } catch (err) {
            console.log(`[Invoice] Could not send reminder to ${participant.username}:`, err.message);
          }
        }
      }

      return interaction.reply({
        content: `🔔 Reminder terkirim ke ${sentCount}/${unpaid.length} orang!`,
        ephemeral: true
      });

    } else if (action === 'settle') {
      // Mark all participants as paid
      const unpaid = invoice.participants.filter(p => !p.paid);
      if (unpaid.length === 0) {
        return interaction.reply({
          content: '✅ Semua orang sudah lunas!',
          ephemeral: true
        });
      }

      const { markMultiplePaid } = require('../utils/invoice-db.cjs');
      const allUserIds = invoice.participants.map(p => p.userId);
      markMultiplePaid(invoiceId, allUserIds);

      return interaction.reply({
        content: `✅ Semua ${unpaid.length} orang ditandai lunas!`,
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
 * /invoice-recap handler - Show invoices for THIS SERVER only
 */
async function handleInvoiceRecap(interaction) {
  const db = require('../utils/invoice-db.cjs');
  const allInvoices = db.readDB();
  const guildId = interaction.guildId;

  // Get invoices for THIS SERVER only
  const invoices = Object.values(allInvoices.invoices || {})
    .filter(inv => inv.guildId === guildId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice di server ini.',
      ephemeral: true
    });
  }

  const embed = renderInvoiceRecapEmbed(invoices, interaction.user.id);

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * /invoice-owe handler - Show dropdown to find debts by name (PER-SERVER)
 */
async function handleInvoiceOwe(interaction) {
  const allNames = getAllParticipantNames(interaction.guildId);

  if (allNames.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice.',
      ephemeral: true
    });
  }

  // Limit to 25 (Discord select menu max)
  const topNames = allNames.slice(0, 25);

  const options = topNames.map(nameInfo => {
    const hasUnpaid = nameInfo.unpaidCount > 0;
    const label = nameInfo.name;
    const description = hasUnpaid
      ? `Rp ${nameInfo.totalDebt.toLocaleString('id-ID')} | ${nameInfo.unpaidCount} belum lunas`
      : `Rp ${nameInfo.totalDebt.toLocaleString('id-ID')} | Lunas`;

    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(nameInfo.name)
      .setDescription(description);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('find_debt_select')
    .setPlaceholder('Pilih nama kamu...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: '🔍 **Cari Hutang Berdasarkan Nama**\n\nPilih nama kamu dari daftar di bawah:',
    components: [row],
    ephemeral: true
  });
}

/**
 * /invoice-merge handler - Merge name aliases
 */
async function handleInvoiceMerge(interaction) {
  const canonicalName = interaction.options.getString('canonical');
  const aliasName = interaction.options.getString('alias');

  // Only creator can merge (for now)
  // In the future, you might want to add admin permission check
  const result = addNameAlias(canonicalName, aliasName);

  const embed = new EmbedBuilder()
    .setColor(result.success ? 0x27ae60 : 0xf39c12)
    .setTitle('🔗 **Merge Nama**')
    .setDescription(`✅ "${aliasName}" sekarang digabung dengan "${canonicalName}"`)
    .addFields({
      name: 'Info',
      value: `Sekarang kalau ada invoice atas nama "${aliasName}", akan dihitung sebagai milik "${canonicalName}".`,
      inline: false
    })
    .setFooter({ text: 'Cek dengan /invoice-owe' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle find debt select menu (PER-SERVER)
 */
async function handleFindDebtSelect(interaction) {
  const selectedName = interaction.values[0];
  const debts = getDebtsByName(selectedName, interaction.guildId);

  if (debts.length === 0) {
    return interaction.update({
      content: `🎉 **${selectedName} gak punya hutang!** Semua invoice lunas!`,
      components: []
    });
  }

  const totalOwed = debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0);

  let description = '';

  debts.forEach((debt, i) => {
    const inv = debt.invoice;
    const amount = Number(debt.amount) || 0;
    const creator = inv.creator.username;
    const title = inv.title || 'Untitled';
    const notes = debt.notes ? ` *(${debt.notes})*` : '';

    description += `**${i + 1}. ${title}**\n`;
    description += `   👤 Creator: ${creator}\n`;
    description += `   💰 Hutang: Rp ${amount.toLocaleString('id-ID')}${notes}\n`;
    description += `   📅 Tanggal: ${inv.date}\n\n`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`💳 Hutang Belum Dibayar: ${selectedName}`)
    .setDescription(description)
    .addFields({
      name: '💵 Total Hutang',
      value: `Rp ${totalOwed.toLocaleString('id-ID')}`,
      inline: false
    })
    .setFooter({ text: `${debts.length} invoice belum lunas` })
    .setTimestamp();

  await interaction.update({
    content: '',
    embeds: [embed],
    components: []
  });
}

/**
 * /invoice-delete handler - Show select menu to delete invoices
 */
async function handleInvoiceDelete(interaction) {
  const invoices = getUserInvoices(interaction.user.id);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice.',
      ephemeral: true
    });
  }

  // Limit to 25 (Discord select menu max)
  const recentInvoices = invoices.slice(0, 25);

  const options = recentInvoices.map(inv => {
    const unpaidCount = inv.participants.filter(p => !p.paid).length;
    const amount = isNaN(inv.totalAmount) ? 0 : inv.totalAmount;
    const label = `${inv.title || 'Untitled'} - ${inv.date}`;
    const description = `Rp ${amount.toLocaleString('id-ID')} | ${unpaidCount} belum lunas`;
    const value = inv.id;

    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(value)
      .setDescription(description);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('delete_invoice_select')
    .setPlaceholder('Pilih invoice yang ingin dihapus...')
    .setMinValues(1)
    .setMaxValues(Math.min(recentInvoices.length, 10))
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: '🗑️ Pilih invoice yang ingin dihapus:',
    components: [row],
    ephemeral: true
  });
}

/**
 * /invoice-clear handler - Delete all invoices (with confirmation)
 */
async function handleInvoiceClear(interaction) {
  const invoices = getUserInvoices(interaction.user.id);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice.',
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('clear_invoice_modal')
    .setTitle('🗑️ Hapus Semua Invoice');

  const confirmInput = new TextInputBuilder()
    .setCustomId('confirm')
    .setLabel(`Ketik "DELETE" untuk menghapus ${invoices.length} invoice`)
    .setPlaceholder('DELETE')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);

  const row = new ActionRowBuilder().addComponents(confirmInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * /invoice-search handler - Search invoices with filters (PER-SERVER)
 */
async function handleInvoiceSearch(interaction) {
  const query = interaction.options.getString('query') || '';
  const period = interaction.options.getString('period') || 'all';

  const db = require('../utils/invoice-db.cjs');
  const allData = db.readDB();
  const guildId = interaction.guildId;

  // Get invoices for THIS SERVER only
  const invoices = Object.values(allData.invoices || {})
    .filter(inv => inv.guildId === guildId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice di server ini.',
      ephemeral: true
    });
  }

  let filtered = invoices;

  // Filter by period
  const now = new Date();
  if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(inv => new Date(inv.date) >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    filtered = filtered.filter(inv => new Date(inv.date) >= monthAgo);
  }

  // Filter by query (username or title)
  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter(inv =>
      inv.title?.toLowerCase().includes(lowerQuery) ||
      inv.participants.some(p => p.username?.toLowerCase().includes(lowerQuery))
    );
  }

  if (filtered.length === 0) {
    return interaction.reply({
      content: `📋 Tidak ada invoice yang cocok dengan filter.`,
      ephemeral: true
    });
  }

  // Calculate stats
  const totalInvoices = filtered.length;
  const totalPeople = filtered.flatMap(inv => inv.participants).length;
  const paidPeople = filtered.flatMap(inv => inv.participants).filter(p => p.paid).length;
  const unpaidPeople = totalPeople - paidPeople;
  const totalAmount = filtered.reduce((sum, inv) => sum + (isNaN(inv.totalAmount) ? 0 : inv.totalAmount), 0);
  const unpaidAmount = filtered
    .flatMap(inv => inv.participants)
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + (isNaN(p.amount) ? 0 : p.amount), 0);

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`🔍 Invoice Search${period !== 'all' ? ` (${period})` : ''}`)
    .addFields(
      { name: '📊 Total Invoice', value: `${totalInvoices}`, inline: true },
      { name: '👥 Total Orang', value: `${totalPeople}`, inline: true },
      { name: '✅ Lunas', value: `${paidPeople}`, inline: true },
      { name: '⏳ Belum Lunas', value: `${unpaidPeople}`, inline: true },
      { name: '💰 Total Amount', value: `Rp ${totalAmount.toLocaleString('id-ID')}`, inline: true },
      { name: '💵 Belum Dibayar', value: `Rp ${unpaidAmount.toLocaleString('id-ID')}`, inline: true }
    )
    .setFooter({ text: query ? `Query: ${query}` : '' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

// Analytics pagination state: userId -> { page, data, timestamp }
const analyticsState = new Map();
const ANALYTICS_STATE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * /invoice-analytics handler - Show weekly/monthly analytics (PER-SERVER with pagination)
 * Shows analytics for invoices in this server only
 */
async function handleInvoiceAnalytics(interaction) {
  const period = interaction.options.getString('period') || 'month';
  const db = require('../utils/invoice-db.cjs');
  const allData = db.readDB();

  // Get invoices for THIS SERVER ONLY
  const guildId = interaction.guildId;
  const invoices = Object.values(allData.invoices || {})
    .filter(inv => inv.guildId === guildId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice.',
      ephemeral: true
    });
  }

  const now = new Date();
  let startDate;
  let periodLabel;

  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    periodLabel = '7 Hari Terakhir';
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = 'Bulan Ini';
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    periodLabel = `Bulan Lalu (${endDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
  }

  const filtered = invoices.filter(inv => new Date(inv.date) >= startDate);

  if (filtered.length === 0) {
    return interaction.reply({
      content: `📋 Tidak ada invoice untuk ${periodLabel}.`,
      ephemeral: true
    });
  }

  // Calculate per-person stats with creditors tracking and alias resolution
  const personStats = {};
  filtered.forEach(inv => {
    const creatorName = inv.creator.username;
    inv.participants.forEach(p => {
      // Resolve alias to get canonical name (Abi -> Abimanyu)
      const { getCanonicalName } = require('../utils/invoice-db.cjs');
      const canonicalName = getCanonicalName(p.username, allData.nameAliases);

      if (!personStats[canonicalName]) {
        personStats[canonicalName] = {
          total: 0,
          paid: 0,
          unpaid: 0,
          count: 0,
          creditors: {} // Track who this person owes money to
        };
      }
      const amount = isNaN(p.amount) ? 0 : p.amount;
      personStats[canonicalName].total += amount;
      personStats[canonicalName].count += 1;
      if (p.paid) {
        personStats[canonicalName].paid += amount;
      } else {
        personStats[canonicalName].unpaid += amount;
        // Track creditor (who they owe money to)
        if (!personStats[canonicalName].creditors[creatorName]) {
          personStats[canonicalName].creditors[creatorName] = 0;
        }
        personStats[canonicalName].creditors[creatorName] += amount;
      }
    });
  });

  // Sort by unpaid amount (highest first)
  const sortedPeople = Object.entries(personStats)
    .sort((a, b) => b[1].unpaid - a[1].unpaid);

  // Save state for pagination
  analyticsState.set(interaction.user.id, {
    page: 0,
    people: sortedPeople,
    periodLabel,
    filtered: filtered,
    timestamp: Date.now()
  });

  // Show first page
  await sendAnalyticsPage(interaction, sortedPeople, periodLabel, 0);
}

/**
 * Send analytics page with pagination buttons
 */
async function sendAnalyticsPage(interaction, people, periodLabel, page) {
  const pageSize = 10;
  const totalPages = Math.ceil(people.length / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, people.length);
  const pagePeople = people.slice(startIdx, endIdx);

  // Build description for this page
  let description = '';
  pagePeople.forEach(([name, stats], i) => {
    const globalIndex = startIdx + i + 1;
    const status = stats.unpaid > 0 ? '⏳' : '✅';
    description += `${globalIndex}. **${name}** ${status}\n`;
    description += `   Total: Rp ${stats.total.toLocaleString('id-ID')} | `;
    description += `Lunas: Rp ${stats.paid.toLocaleString('id-ID')} | `;
    description += `Hutang: Rp ${stats.unpaid.toLocaleString('id-ID')}\n`;

    // Show breakdown of who they owe money to
    if (Object.keys(stats.creditors).length > 0) {
      const creditorList = Object.entries(stats.creditors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Top 3 creditors
      description += `   📎 Hutang ke: ${creditorList.map(([c, amt]) => `${c} (Rp ${amt.toLocaleString('id-ID')})`).join(', ')}\n`;
    }
  });

  const totalAmount = people.reduce((sum, [, stats]) => sum + stats.total, 0);
  const paidAmount = people.reduce((sum, [, stats]) => sum + stats.paid, 0);
  const unpaidAmount = totalAmount - paidAmount;

  const embed = new EmbedBuilder()
    .setColor(unpaidAmount > 0 ? 0xf39c12 : 0x27ae60)
    .setTitle(`📊 Invoice Analytics - ${periodLabel}`)
    .setDescription(description || 'Tidak ada data')
    .addFields(
      { name: `👥 Total: ${people.length} orang`, value: `Halaman ${page + 1}/${totalPages}`, inline: true },
      { name: '💰 Total Amount', value: `Rp ${totalAmount.toLocaleString('id-ID')}`, inline: true },
      { name: '💵 Belum Dibayar', value: `Rp ${unpaidAmount.toLocaleString('id-ID')}`, inline: true }
    )
    .setTimestamp();

  // Build pagination buttons
  const row = new ActionRowBuilder();
  if (page > 0) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`analytics_prev_${interaction.user.id}`)
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Primary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`analytics_page_${interaction.user.id}_${page}`)
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  if (page < totalPages - 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`analytics_next_${interaction.user.id}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Primary)
    );
  }

  const components = row.components.length > 1 ? [row] : [];

  // Update or reply
  const method = interaction.replied || interaction.deferred ? 'update' : 'reply';

  if (method === 'update') {
    await interaction.update({ embeds: [embed], components });
  } else {
    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  }
}

/**
 * Send analytics page with update (for pagination)
 */
async function sendAnalyticsPageUpdate(interaction, people, periodLabel, page) {
  const pageSize = 10;
  const totalPages = Math.ceil(people.length / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, people.length);
  const pagePeople = people.slice(startIdx, endIdx);

  // Build description for this page
  let description = '';
  pagePeople.forEach(([name, stats], i) => {
    const globalIndex = startIdx + i + 1;
    const status = stats.unpaid > 0 ? '⏳' : '✅';
    description += `${globalIndex}. **${name}** ${status}\n`;
    description += `   Total: Rp ${stats.total.toLocaleString('id-ID')} | `;
    description += `Lunas: Rp ${stats.paid.toLocaleString('id-ID')} | `;
    description += `Hutang: Rp ${stats.unpaid.toLocaleString('id-ID')}\n`;

    // Show breakdown of who they owe money to
    if (Object.keys(stats.creditors).length > 0) {
      const creditorList = Object.entries(stats.creditors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      description += `   📎 Hutang ke: ${creditorList.map(([c, amt]) => `${c} (Rp ${amt.toLocaleString('id-ID')})`).join(', ')}\n`;
    }
  });

  const totalAmount = people.reduce((sum, [, stats]) => sum + stats.total, 0);
  const paidAmount = people.reduce((sum, [, stats]) => sum + stats.paid, 0);
  const unpaidAmount = totalAmount - paidAmount;

  const embed = new EmbedBuilder()
    .setColor(unpaidAmount > 0 ? 0xf39c12 : 0x27ae60)
    .setTitle(`📊 Invoice Analytics - ${periodLabel}`)
    .setDescription(description || 'Tidak ada data')
    .addFields(
      { name: `👥 Total: ${people.length} orang`, value: `Halaman ${page + 1}/${totalPages}`, inline: true },
      { name: '💰 Total Amount', value: `Rp ${totalAmount.toLocaleString('id-ID')}`, inline: true },
      { name: '💵 Belum Dibayar', value: `Rp ${unpaidAmount.toLocaleString('id-ID')}`, inline: true }
    )
    .setTimestamp();

  // Build pagination buttons
  const row = new ActionRowBuilder();
  if (page > 0) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`analytics_prev_${interaction.user.id}`)
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Primary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`analytics_page_${interaction.user.id}_${page}`)
      .setLabel(`${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  if (page < totalPages - 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`analytics_next_${interaction.user.id}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Primary)
    );
  }

  const components = row.components.length > 1 ? [row] : [];

  // ALWAYS use update for pagination
  await interaction.update({ embeds: [embed], components });
}

/**
 * Handle analytics pagination buttons
 */
async function handleAnalyticsPagination(interaction, action) {
  const state = analyticsState.get(interaction.user.id);

  if (!state || Date.now() - state.timestamp > ANALYTICS_STATE_TTL) {
    return interaction.reply({
      content: '❌ Sesi habis. Silakan jalankan /invoice-analytics lagi.',
      ephemeral: true
    });
  }

  let newPage = state.page;
  if (action === 'next') {
    newPage = Math.min(state.page + 1, Math.ceil(state.people.length / 10) - 1);
  } else if (action === 'prev') {
    newPage = Math.max(state.page - 1, 0);
  } else {
    return; // Invalid action
  }

  // Update state
  state.page = newPage;

  // Send new page (using update, not reply)
  await sendAnalyticsPageUpdate(interaction, state.people, state.periodLabel, newPage);
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
  {
    name: 'invoice-search',
    description: 'Cari invoice dengan filter',
    options: [
      {
        name: 'query',
        description: 'Cari berdasarkan nama atau judul',
        type: 3, // STRING
        required: false,
      },
      {
        name: 'period',
        description: 'Filter periode waktu',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Semua', value: 'all' },
          { name: 'Minggu Ini', value: 'week' },
          { name: 'Bulan Ini', value: 'month' },
        ],
      },
    ],
  },
  {
    name: 'invoice-analytics',
    description: 'Lihat analitik invoice (mingguan/bulanan)',
    options: [
      {
        name: 'period',
        description: 'Pilih periode',
        type: 3, // STRING
        required: false,
        choices: [
          { name: '7 Hari Terakhir', value: 'week' },
          { name: 'Bulan Ini', value: 'month' },
          { name: 'Bulan Lalu', value: 'last_month' },
        ],
      },
    ],
  },
  {
    name: 'invoice-delete',
    description: 'Hapus invoice (pilih dari daftar)',
  },
  {
    name: 'invoice-clear',
    description: 'Hapus SEMUA invoice',
  },
  {
    name: 'invoice-owe',
    description: 'Cek hutang yang belum kamu bayar',
  },
  {
    name: 'invoice-merge',
    description: 'Merge nama alias (Abi -> Abimanyu)',
    options: [
      {
        name: 'canonical',
        description: 'Nama asli yang benar',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'alias',
        description: 'Nama alias yang mau di-merge',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

module.exports = {
  handleInvoiceCreateSimple,
  processInvoiceCreateModal,
  handleInvoiceRecap,
  handleInvoiceSearch,
  handleInvoiceAnalytics,
  handleAnalyticsPagination,
  handleInvoiceDelete,
  handleInvoiceClear,
  handleInvoiceOwe,
  handleInvoiceMerge,
  handleFindDebtSelect,
  renderInvoiceEmbed,
  buildInvoiceButtons,
  renderInvoiceRecapEmbed,
  invoiceCommandsSimple,
  handleInvoiceButton,
  buildMarkPaidModal,
  buildAddPeopleModal,
  sendInvoiceNotifications,
  sendPaidNotification,
  // Also export empty handlers for backward compatibility
  handleInvoiceCreate: () => {},
  handleInvoiceModal: () => {},
  // Export tempInvoiceStorage for compatibility
  tempInvoiceStorage: new Map(),
};
