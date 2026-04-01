/**
 * INVOICE - Minimal Working Version
 */

const {
  createInvoice,
  addParticipants,
  getInvoice,
  deleteInvoice,
} = require('../utils/invoice-db.cjs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * /invoice-create handler
 */
async function handleInvoiceCreateSimple(interaction) {
  try {
    const title = interaction.options.getString('title') || '';
    const people = interaction.options.getString('people') || '';

    if (!people || !people.trim()) {
      return interaction.reply({
        content: '❌ Masukkan orang & jumlah!\nContoh: `/invoice-create people:"@user 15000"`',
        ephemeral: true
      });
    }

    const guild = interaction.guild;
    const participants = [];

    // Parse each line
    const lines = people.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to match: @mention amount OR username amount
      const match = trimmed.match(/^<@!?(\d+)>\s+(\d+)/);
      if (match) {
        // Mention format
        try {
          const member = await guild.members.fetch(match[1]);
          const amount = parseInt(match[2]);

          if (amount > 0) {
            participants.push({
              userId: member.id,
              username: member.user.username,
              amount: amount,
              paid: false,
            });
          }
        } catch {}
      } else {
        // Try to parse username + amount
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const username = parts[0];
          const amountStr = parts[1].toLowerCase().replace('k', '000');
          const amount = parseInt(amountStr);

          if (amount > 0) {
            participants.push({
              userId: `manual_${Date.now()}`,
              username: username,
              amount: amount,
              paid: false,
            });
          }
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
    const date = new Date().toISOString().split('T')[0];
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

    const invoice = result.invoice;
    const total = invoice.totalAmount || 0;

    // Build simple embed
    let desc = `**${title || 'Invoice'}**\n📅 ${date}\n\n**Participants:**\n`;
    invoice.participants.forEach((p, i) => {
      desc += `${i + 1}. ${p.username} - Rp ${p.amount.toLocaleString('id-ID')}\n`;
    });
    desc += `\n💰 Total: Rp ${total.toLocaleString('id-ID')}`;

    const embed = new EmbedBuilder()
      .setTitle('🧾 INVOICE')
      .setDescription(desc)
      .setColor(0xf39c12)
      .setFooter({ text: `ID: ${invoice.id}` })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_pay_${invoice.id}`)
        .setLabel('Lunas')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`inv_del_${invoice.id}`)
        .setLabel('Hapus')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons]
    });

  } catch (error) {
    console.error('[Invoice] Error:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    }).catch(() => {});
  }
}

/**
 * Handle button clicks
 */
async function handleInvoiceButton(interaction) {
  try {
    const customId = interaction.customId;

    if (customId.startsWith('inv_pay_')) {
      const invoiceId = customId.replace('inv_pay_', '');
      const invoice = getInvoice(invoiceId);

      if (!invoice) {
        return interaction.reply({
          content: '❌ Invoice tidak ditemukan',
          ephemeral: true
        });
      }

      // Mark all as paid
      invoice.participants.forEach(p => p.paid = true);
      // Update in DB (need to add update function)

      const embed = new EmbedBuilder()
        .setTitle('🧾 INVOICE - LUNAS')
        .setDescription('Semua sudah lunas! ✅')
        .setColor(0x27ae60)
        .setFooter({ text: `ID: ${invoice.id}` })
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: []
      });

    } else if (customId.startsWith('inv_del_')) {
      const invoiceId = customId.replace('inv_del_', '');

      if (getInvoice(invoiceId)) {
        deleteInvoice(invoiceId);
      }

      await interaction.update({
        content: '🗑️ Invoice dihapus.',
        embeds: [],
        components: []
      });
    }

  } catch (error) {
    console.error('[Invoice Button] Error:', error);
  }
}

/**
 * /invoice-recap handler
 */
async function handleInvoiceRecap(interaction) {
  const invoices = require('../utils/invoice-db.cjs').getUserInvoices(interaction.user.id);

  if (invoices.length === 0) {
    return interaction.reply({
      content: '📋 Belum ada invoice.',
      ephemeral: true
    });
  }

  let total = 0;
  let desc = '';
  invoices.forEach((inv, i) => {
    const unpaid = inv.participants.filter(p => !p.paid);
    if (unpaid.length > 0) {
      const invTotal = unpaid.reduce((sum, p) => sum + p.amount, 0);
      total += invTotal;
      desc += `**${i + 1}.** ${inv.title || 'Untitled'} — Rp ${invTotal.toLocaleString('id-ID')}\n`;
    }
  });

  if (!desc) desc = '🎉 Semua sudah lunas!';

  const embed = new EmbedBuilder()
    .setTitle('💰 Invoice Recap')
    .setDescription(desc + `\n💵 Total: Rp ${total.toLocaleString('id-ID')}`)
    .setColor(0x3498db)
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

const invoiceCommands = [
  {
    name: 'invoice-create',
    description: 'Buat invoice baru',
    options: [
      {
        name: 'title',
        description: 'Judul (opsional)',
        type: 3,
        required: false,
      },
      {
        name: 'people',
        description: 'List orang & jumlah',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'invoice-recap',
    description: 'Lihat invoice kamu',
    type: 1,
  },
];

module.exports = {
  handleInvoiceCreateSimple,
  handleInvoiceRecap,
  handleInvoiceButton,
  invoiceCommands,
  handleInvoiceCreate: () => {},
  handleInvoiceRecap: () => {},
  handleInvoiceModal: () => {},
  tempInvoiceStorage: new Map(),
};
