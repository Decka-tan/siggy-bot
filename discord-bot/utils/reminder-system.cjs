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

  // Resolve everyone first, then merge by Discord ID before sending anything.
  // getAllDebtors() groups by canonical name, but a spelling that is not in
  // nameAliases yet becomes its own debtor — and two of those can still point at
  // the same person, who would then get one DM per spelling.
  const resolved = [];

  for (const debtor of debtors) {
    // Try to resolve Discord ID if not already in debtor info
    let discordId = debtor.userId && /^\d{17,20}$/.test(debtor.userId) ? debtor.userId : null;
    if (!discordId) {
      discordId = resolveName(debtor.username);
    }
    if (!discordId && debtor.canonical) {
      discordId = resolveName(debtor.canonical);
    }

    // Deliberately NOT falling back to a Discord member search by name.
    // Matching "Eric" against server members is a guess, and the thing being
    // sent is a bill — it already billed the wrong person once. An identity
    // here must be one someone explicitly recorded: the userId stored on the
    // invoice, or an entry in nameLinks. No match means no DM.

    // VALIDASI: Hanya proses kalo ID-nya beneran angka (Snowflake)
    const isSnowflake = discordId && /^\d{17,20}$/.test(discordId);

    if (!isSnowflake) {
      results.push({ name: debtor.username, status: 'skipped', reason: 'No valid Discord ID/Link' });
      continue;
    }

    resolved.push({ debtor, discordId });
  }

  // One entry per Discord user, carrying every name they appear under.
  const byUser = new Map();
  for (const { debtor, discordId } of resolved) {
    const merged = byUser.get(discordId);
    if (!merged) {
      byUser.set(discordId, {
        discordId,
        username: debtor.username,
        names: [debtor.username],
        totalDebt: debtor.totalDebt,
        invoices: [...(debtor.invoices || [])],
      });
      continue;
    }
    merged.totalDebt += debtor.totalDebt;
    merged.invoices.push(...(debtor.invoices || []));
    if (!merged.names.includes(debtor.username)) merged.names.push(debtor.username);
  }

  for (const target of byUser.values()) {
    // Shown in the report so a merge is visible rather than silent.
    const label = target.names.length > 1 ? `${target.username} (+${target.names.slice(1).join(', ')})` : target.username;

    try {
      const user = await client.users.fetch(target.discordId);
      if (!user) throw new Error('User not found in Discord');

      const embed = buildReminderEmbed(target);
      await user.send({ embeds: [embed] });

      sentCount++;
      results.push({ name: label, status: 'sent' });
    } catch (error) {
      console.error(`Failed to remind ${label}:`, error.message);
      failCount++;

      let reason = error.message;
      if (error.code === 50007) reason = 'DMs Closed/Blocked';

      results.push({ name: label, status: 'failed', error: reason });
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

// Helper to get payment info by Discord Username
function getPaymentInfoByName(username) {
  const { readDB } = require('./payment-db.cjs');
  const db = readDB();
  const searchName = username.toLowerCase().replace(/^@/, ''); // Bersih-bersih @ kalo ada

  // Cari di database payments yang discordUser-nya cocok sama creator invoice
  const info = Object.values(db.payments || {}).find(p => 
    (p.discordUser || "").toLowerCase().replace(/^@/, '') === searchName
  );

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
