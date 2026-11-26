/**
 * INVOICE DM NOTICES
 *
 * When an invoice is created Siggy DMs every participant ("🧾 Invoice Baru!").
 * When the invoice is deleted those DMs are edited to say it was cancelled, so
 * nobody pays a bill that no longer exists (Daffa, 26 Nov 2026).
 *
 * New invoices store where each DM went in `invoice.dmNotices`
 * ([{ userId, channelId, messageId }]). Invoices made before that have no record,
 * so their DM is found by reading the bot's recent DMs with the person and
 * matching the title, date and creator.
 */

const NEW_INVOICE_HEADER = '🧾 **Invoice Baru!**';
const SEARCH_LIMIT = 100;

const isRealUser = (id) => id && !String(id).startsWith('unknown_');
const rupiah = (n) => (isNaN(n) ? 0 : Number(n)).toLocaleString('id-ID');

function newInvoiceText(invoice, amount) {
  return `${NEW_INVOICE_HEADER}\n\n` +
    `Kamu ditambahkan ke invoice: **${invoice.title || 'Untitled'}**\n` +
    `💰 Jumlah: Rp ${rupiah(amount)}\n` +
    `📅 Tanggal: ${invoice.date}\n` +
    `👤 Dibuat oleh: ${invoice.creator.username}\n\n` +
    `_Silakan lunasi secepatnya. Terima kasih!_`;
}

const CANCELLED_NOTE = '_Invoice ini udah dihapus sama pembuatnya, gak perlu dibayar._';

/** Turn the original DM into the cancelled one, keeping the figures the person saw. */
function cancelledText(original) {
  return original
    .replace(NEW_INVOICE_HEADER, '🗑️ **Invoice Dihapus**')
    .replace(/_Silakan lunasi[^\n]*_\s*$/, CANCELLED_NOTE);
}

/** Find the old "Invoice Baru" DM for an invoice that has no stored message id. */
async function findLegacyNotice(client, userId, invoice) {
  const user = await client.users.fetch(userId);
  const dm = await user.createDM();
  const messages = await dm.messages.fetch({ limit: SEARCH_LIMIT });
  const want = [
    NEW_INVOICE_HEADER,
    `invoice: **${invoice.title || 'Untitled'}**`,
    `Tanggal: ${invoice.date}`,
    `Dibuat oleh: ${invoice.creator.username}`,
  ];
  // Newest first; one DM per participant per invoice.
  return messages.find((m) => m.author.id === client.user.id && want.every((w) => m.content.includes(w))) || null;
}

/**
 * Edit every "Invoice Baru" DM of a deleted invoice. Never throws.
 * Returns { edited, missing }.
 */
async function retractInvoiceNotices(client, invoice) {
  let edited = 0;
  let missing = 0;
  if (!client || !invoice) return { edited, missing };
  const stored = new Map((invoice.dmNotices || []).map((n) => [n.userId, n]));
  const seen = new Set();

  for (const p of invoice.participants || []) {
    if (!isRealUser(p.userId) || seen.has(p.userId)) continue;
    seen.add(p.userId);
    try {
      let msg = null;
      const n = stored.get(p.userId);
      if (n) {
        const channel = await client.channels.fetch(n.channelId);
        msg = await channel.messages.fetch(n.messageId).catch(() => null);
      } else {
        msg = await findLegacyNotice(client, p.userId, invoice);
      }
      if (!msg || !msg.content.startsWith(NEW_INVOICE_HEADER)) { missing++; continue; }
      await msg.edit({ content: cancelledText(msg.content) });
      edited++;
    } catch (err) {
      missing++;
      console.log(`[Invoice DM] Could not retract notice for ${p.username} on ${invoice.id}:`, err.message);
    }
  }
  console.log(`[Invoice DM] ${invoice.id}: ${edited} DM edited, ${missing} not found`);
  return { edited, missing };
}

module.exports = { newInvoiceText, cancelledText, retractInvoiceNotices, findLegacyNotice };
