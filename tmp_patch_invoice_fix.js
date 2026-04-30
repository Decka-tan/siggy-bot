const fs = require('fs');
const path = require('path');
const file = path.join('C:/Codingers/siggy-bot/discord-bot/commands/invoice-simple.cjs');
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
`function renderInvoiceEmbed(invoice) {
  const paidCount = invoice.participants.filter(p => p.paid).length;
  const totalCount = invoice.participants.length;

  let description = invoice.title
    ? \`**\${invoice.title}**\\n\\n\`
    : '';

  description += \`📅 **Date:** \${invoice.date}\\n\`;
  description += \`👤 **Created by:** \${invoice.creator.username}\\n\\n\`;
  description += '**Participants:**\\n';

  invoice.participants.forEach((p, i) => {
    const status = p.paid ? '✅' : '💰';
    const notes = p.notes ? \` *(\${p.notes})*\` : '';
    const amount = isNaN(p.amount) ? 0 : p.amount;
    description += \`${i + 1}. **\${p.username}** - Rp \${amount.toLocaleString('id-ID')} \${status}\${notes}\\n\`;
  });
`,
`function renderInvoiceEmbed(invoice) {
  const paidCount = invoice.participants.filter(p => p.paid).length;
  const totalCount = invoice.participants.length;

  const safeTitle = truncateText(invoice.title, 200, 'Untitled');
  const safeDate = truncateText(invoice.date, 100, '-');
  const safeCreator = truncateText(invoice.creator?.username, 100, 'Unknown');

  let description = invoice.title
    ? \`**\${safeTitle}**\\n\\n\`
    : '';

  description += \`📅 **Date:** \${safeDate}\\n\`;
  description += \`👤 **Created by:** \${safeCreator}\\n\\n\`;
  description += '**Participants:**\\n';

  invoice.participants.forEach((p, i) => {
    const status = p.paid ? '✅' : '💰';
    const safeUsername = truncateText(p.username, 100, 'Unknown');
    const safeNotes = p.notes ? truncateText(p.notes, 150, '') : '';
    const notes = safeNotes ? \` *(\${safeNotes})*\` : '';
    const amount = isNaN(p.amount) ? 0 : p.amount;
    description += \`${i + 1}. **\${safeUsername}** - Rp \${amount.toLocaleString('id-ID')} \${status}\${notes}\\n\`;
  });
`);

text = text.replace(
`      for (let i = 0; i < visibleUnpaid.length; i++) {
        const p = visibleUnpaid[i];
        const label = \`${p.username} - Rp ${p.amount.toLocaleString('id-ID')}\`;
        const placeholder = unpaid.length > maxInputs && i === visibleUnpaid.length - 1
          ? \`Ketik "yes". Sisa ${unpaid.length - maxInputs} orang, submit lagi setelah ini.\`
          : 'Ketik "yes" atau "y" untuk tandai lunas';

        const input = new TextInputBuilder()
          .setCustomId(\`paid_${i}\`)
          .setLabel(safeInputLabel(label, 'Peserta'))
          .setPlaceholder(safeInputPlaceholder(placeholder))
          .setStyle(TextInputStyle.Short)
          .setRequired(false);
        rows.push(new ActionRowBuilder().addComponents(input));
      }
`,
`      for (let i = 0; i < visibleUnpaid.length; i++) {
        const p = visibleUnpaid[i];
        const safeUsername = truncateText(p.username, 30, 'Peserta');
        const safeAmount = Number(p.amount) || 0;
        const label = \`${safeUsername} - Rp ${safeAmount.toLocaleString('id-ID')}\`;
        const placeholder = unpaid.length > maxInputs && i === visibleUnpaid.length - 1
          ? \`Ketik "yes". Sisa ${unpaid.length - maxInputs} orang, submit lagi setelah ini.\`
          : 'Ketik "yes" atau "y" untuk tandai lunas';

        const input = new TextInputBuilder()
          .setCustomId(\`paid_${i}\`)
          .setLabel(safeInputLabel(label, 'Peserta'))
          .setPlaceholder(safeInputPlaceholder(placeholder))
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(5);
        rows.push(new ActionRowBuilder().addComponents(input));
      }
`);

text = text.replace(
`  for (let i = 0; i < Math.min(unpaid.length, 5); i++) {
    const value = interaction.fields.getTextInputValue(\`paid_${i}\`);
    if (value && (value.toLowerCase().trim() === 'yes' || value.trim() === '✓' || value.toLowerCase().trim() === 'y')) {
      const p = unpaid[i];
      markMultiplePaid(invoiceId, [p.userId]);
      nowPaid.push(p.username);
    }
  }
`,
`  for (let i = 0; i < Math.min(unpaid.length, 5); i++) {
    let value = '';
    try {
      value = interaction.fields.getTextInputValue(\`paid_${i}\`) || '';
    } catch (_) {
      value = '';
    }

    const normalized = value.toLowerCase().trim();
    if (normalized === 'yes' || normalized === 'y' || value.trim() === '✓') {
      const p = unpaid[i];
      markMultiplePaid(invoiceId, [p.userId]);
      nowPaid.push(p.username);
    }
  }
`);

fs.writeFileSync(file, text, 'utf8');
console.log('patched');
