/**
 * REMINDER SYSTEM
 * Handles automatic and manual DM reminders for debtors
 */

const { getAllDebtors, getInvoice } = require('./invoice-db.cjs');
const { resolveName, getPaymentInfo } = require('./payment-db.cjs');
const { EmbedBuilder } = require('discord.js');

/**
 * Send reminders to all debtors who have a linked Discord account
 */
async function sendAllReminders(client, guildId = null) {
  const debtors = getAllDebtors(guildId);
  let sentCount = 0;
  let failCount = 0;
  const results = [];

  for (const debtor of debtors) {
    // Try to resolve Discord ID if not already in debtor info
    let discordId = debtor.userId;
    if (!discordId) {
      discordId = resolveName(debtor.username);
    }

    if (!discordId) {
      results.push({ name: debtor.username, status: 'skipped', reason: 'No Discord link' });
      continue;
    }

    try {
      const user = await client.users.fetch(discordId);
      if (!user) throw new Error('User not found in Discord');

      const embed = buildReminderEmbed(debtor);
      await user.send({ embeds: [embed] });
      
      sentCount++;
      results.push({ name: debtor.username, status: 'sent' });
    } catch (error) {
      console.error(`Failed to remind ${debtor.username}:`, error.message);
      failCount++;
      results.push({ name: debtor.username, status: 'failed', error: error.message });
    }
  }

  return { sentCount, failCount, results };
}

/**
 * Build a beautiful reminder embed for a specific debtor
 */
function buildReminderEmbed(debtor) {
  const totalDebt = debtor.totalDebt;
  
  let description = `Halo **${debtor.username}**! 👋\n\nIni adalah pengingat otomatis dari **Siggy Bot** mengenai invoice kamu yang belum lunas.\n\n`;
  
  // Group by creator
  const byCreator = {};
  debtor.invoices.forEach(inv => {
    if (!byCreator[inv.creator]) byCreator[inv.creator] = [];
    byCreator[inv.creator].push(inv);
  });

  Object.entries(byCreator).forEach(([creator, invs]) => {
    const creatorTotal = invs.reduce((sum, i) => sum + i.amount, 0);
    description += `👤 **Kepada: ${creator}**\n`;
    
    invs.forEach(inv => {
      description += `   • ${inv.title} — **Rp ${inv.amount.toLocaleString('id-ID')}**\n`;
    });
    
    // Get payment info for creator if available
    const paymentInfo = getPaymentInfoByName(creator);
    if (paymentInfo) {
      description += `   💳 *Bayar ke: ${paymentInfo.bank} ${paymentInfo.number} (${paymentInfo.name})*\n`;
    }
    
    description += `   💰 **Subtotal: Rp ${creatorTotal.toLocaleString('id-ID')}**\n\n`;
  });

  description += `━━━━━━━━━━━━━━━━━━━━\n`;
  description += `🔴 **TOTAL HUTANG: Rp ${totalDebt.toLocaleString('id-ID')}**\n`;
  description += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  description += `*Mohon segera diselesaikan ya! Kalo udah bayar, jangan lupa konfirmasi ke pembuat invoice atau pake tombol "Bayar" di Discord.*`;

  return new EmbedBuilder()
    .setColor(0xe74c3c) // Red for urgency
    .setTitle('🧾 Pengingat Tagihan Invoice')
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'Siggy - Multiversal Cat Girl' });
}

// Helper to get payment info by username
function getPaymentInfoByName(username) {
  const { getPaymentInfo } = require('./payment-db.cjs');
  const info = getPaymentInfo(username);
  if (!info) return null;
  
  return {
    bank: info.bank,
    number: info.account || info.number,
    name: info.name
  };
}

module.exports = {
  sendAllReminders,
  buildReminderEmbed
};
