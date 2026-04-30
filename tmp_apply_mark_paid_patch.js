const fs = require('fs');
const path = 'C:/Codingers/siggy-bot/discord-bot/commands/invoice-simple.cjs';
const text = fs.readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);

function replaceBlock(startLine1, endLine1, newBlock) {
  const start = startLine1 - 1;
  const end = endLine1; // slice end exclusive
  lines.splice(start, end - start, ...newBlock);
}

replaceBlock(520, 548, [
'/**',
' * Build select menu + pagination buttons for marking participants as paid',
' */',
'function buildMarkPaidModal(invoiceId, unpaidParticipants, page = 0) {',
'  const safeParticipants = Array.isArray(unpaidParticipants) ? unpaidParticipants.filter(Boolean) : [];',
'  const pageSize = 25;',
'  const totalPages = Math.max(1, Math.ceil(safeParticipants.length / pageSize));',
'  const safePage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);',
'  const startIndex = safePage * pageSize;',
'  const visibleParticipants = safeParticipants.slice(startIndex, startIndex + pageSize);',
'',
'  const selectOptions = visibleParticipants.map((p, index) => {',
'    const amount = safeParticipantAmount(p.amount);',
'    const fallbackValue = `index_${startIndex + index}`;',
'    const value = truncateText(String(p.userId || fallbackValue), 100, fallbackValue);',
"    const notesText = p.notes ? ` • ${truncateSelectText(p.notes, 45)}` : '';",
'',
'    return new StringSelectMenuOptionBuilder()',
"      .setLabel(truncateSelectText(`${truncateText(p.username, 70, 'Peserta')} - Rp ${amount.toLocaleString('id-ID')}`))",
'      .setValue(value)',
"      .setDescription(truncateSelectText(`Rp ${amount.toLocaleString('id-ID')}${notesText}`));",
'  });',
'',
'  const selectMenu = new StringSelectMenuBuilder()',
'    .setCustomId(`mark_paid_select_${invoiceId}_${safePage}`)',
"    .setPlaceholder(truncateSelectText(`Pilih yang lunas... (${safeParticipants.length} belum lunas)`, 150))",
'    .setMinValues(1)',
'    .setMaxValues(Math.max(1, Math.min(visibleParticipants.length, 25)))',
'    .addOptions(selectOptions);',
'',
'  const rows = [new ActionRowBuilder().addComponents(selectMenu)];',
'',
'  if (totalPages > 1) {',
'    rows.push(',
'      new ActionRowBuilder().addComponents(',
'        new ButtonBuilder()',
'          .setCustomId(`mark_paid_page_prev_${invoiceId}_${safePage}`)',
"          .setLabel('◀ Prev')",
'          .setStyle(ButtonStyle.Secondary)',
'          .setDisabled(safePage <= 0),',
'        new ButtonBuilder()',
'          .setCustomId(`mark_paid_page_info_${invoiceId}_${safePage}`)',
'          .setLabel(`${safePage + 1}/${totalPages}`)',
'          .setStyle(ButtonStyle.Secondary)',
'          .setDisabled(true),',
'        new ButtonBuilder()',
'          .setCustomId(`mark_paid_page_next_${invoiceId}_${safePage}`)',
"          .setLabel('Next ▶')",
'          .setStyle(ButtonStyle.Secondary)',
'          .setDisabled(safePage >= totalPages - 1)',
'      )',
'    );',
'  }',
'',
'  return {',
"    type: 'select_menu',",
'    customId: `mark_paid_select_${invoiceId}_${safePage}`,',
'    components: rows,',
'    unpaidParticipants: safeParticipants,',
'    page: safePage,',
'    totalPages,',
'  };',
'}'
]);

replaceBlock(629, 678, [
"    if (action === 'pay') {",
"      const unpaid = invoice.participants.filter(p => !p.paid);",
"      if (unpaid.length === 0) {",
"        return interaction.reply({",
"          content: 'âœ… Semua orang sudah lunas!',",
"          ephemeral: true",
"        });",
"      }",
"",
"      const markPaidUI = buildMarkPaidModal(invoiceId, unpaid, 0);",
"      return interaction.reply({",
"        content: `✅ Pilih peserta yang sudah lunas untuk invoice **${truncateText(invoice.title || 'Untitled', 80, 'Untitled')}**.`,",
"        components: markPaidUI.components,",
"        ephemeral: true",
"      });",
"",
"    } else if (action === 'bayar') {"
]);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Patched invoice-simple.cjs');
