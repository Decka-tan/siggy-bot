from pathlib import Path

path = Path(r'C:\Codingers\siggy-bot\discord-bot\commands\invoice-simple.cjs')
text = path.read_text(encoding='utf-8')

repls = [
    (".setTitle('🧾 Buat Invoice Baru');", ".setTitle(safeModalTitle('🧾 Buat Invoice Baru', 'Buat Invoice Baru'));"),
    (".setLabel('Judul Invoice (opsional)')", ".setLabel(safeInputLabel('Judul Invoice (opsional)', 'Judul Invoice'))"),
    (".setPlaceholder('Contoh: Makan Siang, Kopi, dll')", ".setPlaceholder(safeInputPlaceholder('Contoh: Makan Siang, Kopi, dll'))"),
    (".setLabel('Tanggal')", ".setLabel(safeInputLabel('Tanggal', 'Tanggal'))"),
    (".setLabel('Orang & Jumlah (satu per baris)')", ".setLabel(safeInputLabel('Orang & Jumlah (satu per baris)', 'Orang & Jumlah'))"),
    (".setPlaceholder('@user1 15000\n@user2 20000\natau: username1 15k')", ".setPlaceholder(safeInputPlaceholder('@user1 15000\n@user2 20000\natau: username1 15k'))"),
    (".setTitle('🧾 INVOICE')", ".setTitle(safeInvoiceTitle('🧾 INVOICE'))"),
    (".setDescription(description)", ".setDescription(safeEmbedDescription(description))"),
    ("{ name: '💰 Total', value: `Rp ${totalAmount.toLocaleString('id-ID')}`, inline: true }", "{ name: '💰 Total', value: safeFieldValue(`Rp ${totalAmount.toLocaleString('id-ID')}`), inline: true }"),
    ("{ name: '📊 Status', value: `${paidCount}/${totalCount} paid`, inline: true }", "{ name: '📊 Status', value: safeFieldValue(`${paidCount}/${totalCount} paid`), inline: true }"),
    ("{ name: '⏳ Outstanding', value: `Rp ${unpaidTotal.toLocaleString('id-ID')}`, inline: true }", "{ name: '⏳ Outstanding', value: safeFieldValue(`Rp ${unpaidTotal.toLocaleString('id-ID')}`), inline: true }"),
    (".setTitle('💰 Invoice Recap')", ".setTitle(safeInvoiceTitle('💰 Invoice Recap'))"),
    ("      value: `Rp ${totalOwed.toLocaleString('id-ID')}`", "      value: safeFieldValue(`Rp ${totalOwed.toLocaleString('id-ID')}`)"),
    (".setPlaceholder('Pilih orang yang sudah lunas...')", ".setPlaceholder(truncateSelectText('Pilih orang yang sudah lunas...', 150))"),
    (".setMaxValues(unpaidParticipants.length)", ".setMaxValues(Math.min(unpaidParticipants.length, 25))"),
    (".setTitle(modalTitleBase.length > 45 ? `${modalTitleBase.slice(0, 42)}...` : modalTitleBase);", ".setTitle(safeModalTitle(modalTitleBase, 'Tandai Lunas'));"),
    (".setLabel(label.length > 45 ? `${label.slice(0, 42)}...` : label)", ".setLabel(safeInputLabel(label, 'Peserta'))"),
    (".setPlaceholder(placeholder.length > 100 ? `${placeholder.slice(0, 97)}...` : placeholder)", ".setPlaceholder(safeInputPlaceholder(placeholder))"),
    (".setValue(nameInfo.name.slice(0, 100))", ".setValue(truncateSelectText(nameInfo.name, 100))"),
    (".setPlaceholder('Pilih nama kamu...')", ".setPlaceholder(truncateSelectText('Pilih nama kamu...', 150))"),
    (".setTitle('🔗 **Merge Nama**')", ".setTitle(safeInvoiceTitle('🔗 Merge Nama', 'Merge Nama'))"),
    (".setDescription(`✅ \"${aliasName}\" sekarang digabung dengan \"${canonicalName}\"`)", ".setDescription(safeEmbedDescription(`✅ \"${aliasName}\" sekarang digabung dengan \"${canonicalName}\"`))"),
    ("      value: `Sekarang kalau ada invoice atas nama \"${aliasName}\", akan dihitung sebagai milik \"${canonicalName}\".`", "      value: safeFieldValue(`Sekarang kalau ada invoice atas nama \"${aliasName}\", akan dihitung sebagai milik \"${canonicalName}\".`)"),
    (".setTitle(`💳 Hutang Belum Dibayar: ${selectedName}`)", ".setTitle(safeInvoiceTitle(`💳 Hutang Belum Dibayar: ${selectedName}`, 'Hutang Belum Dibayar'))"),
    (".setLabel(label)", ".setLabel(truncateSelectText(label))"),
    (".setDescription(description);", ".setDescription(truncateSelectText(description));"),
    (".setPlaceholder('Pilih invoice yang ingin dihapus...')", ".setPlaceholder(truncateSelectText('Pilih invoice yang ingin dihapus...', 150))"),
    (".setTitle('🗑️ Hapus Semua Invoice');", ".setTitle(safeModalTitle('🗑️ Hapus Semua Invoice', 'Hapus Semua Invoice'));"),
    (".setLabel(`Ketik \"DELETE\" untuk menghapus ${invoices.length} invoice`)", ".setLabel(safeInputLabel(`Ketik \"DELETE\" untuk menghapus ${invoices.length} invoice`, 'Ketik DELETE untuk konfirmasi'))"),
    (".setPlaceholder('DELETE')", ".setPlaceholder(safeInputPlaceholder('DELETE'))"),
    (".setTitle(`🔍 Invoice Search${period !== 'all' ? ` (${period})` : ''}`)", ".setTitle(safeInvoiceTitle(`🔍 Invoice Search${period !== 'all' ? ` (${period})` : ''}`, 'Invoice Search'))"),
    ("{ name: '📊 Total Invoice', value: `${totalInvoices}`, inline: true }", "{ name: '📊 Total Invoice', value: safeFieldValue(`${totalInvoices}`), inline: true }"),
    ("{ name: '👥 Total Orang', value: `${totalPeople}`, inline: true }", "{ name: '👥 Total Orang', value: safeFieldValue(`${totalPeople}`), inline: true }"),
    ("{ name: '✅ Lunas', value: `${paidPeople}`, inline: true }", "{ name: '✅ Lunas', value: safeFieldValue(`${paidPeople}`), inline: true }"),
    ("{ name: '⏳ Belum Lunas', value: `${unpaidPeople}`, inline: true }", "{ name: '⏳ Belum Lunas', value: safeFieldValue(`${unpaidPeople}`), inline: true }"),
    ("{ name: '💰 Total Amount', value: `Rp ${totalAmount.toLocaleString('id-ID')}`, inline: true }", "{ name: '💰 Total Amount', value: safeFieldValue(`Rp ${totalAmount.toLocaleString('id-ID')}`), inline: true }"),
    ("{ name: '💵 Belum Dibayar', value: `Rp ${unpaidAmount.toLocaleString('id-ID')}`, inline: true }", "{ name: '💵 Belum Dibayar', value: safeFieldValue(`Rp ${unpaidAmount.toLocaleString('id-ID')}`), inline: true }"),
    (".setTitle(`📊 Invoice Analytics - ${periodLabel}`)", ".setTitle(safeInvoiceTitle(`📊 Invoice Analytics - ${periodLabel}`, 'Invoice Analytics'))"),
    (".setDescription(description || 'Tidak ada data')", ".setDescription(safeEmbedDescription(description || 'Tidak ada data'))"),
    ("{ name: `👥 Total: ${people.length} orang`, value: `Halaman ${page + 1}/${totalPages}`, inline: true }", "{ name: truncateText(`👥 Total: ${people.length} orang`, 256, 'Total'), value: safeFieldValue(`Halaman ${page + 1}/${totalPages}`), inline: true }")
]

for old, new in repls:
    text = text.replace(old, new)

old = "  // Send notifications to newly paid users\n  await sendPaidNotification(invoice, nowPaid);"
new = "  // Send notifications to newly paid users\n  for (const participant of updated.participants.filter(p => nowPaid.includes(p.username))) {\n    await sendPaidNotification(updated, participant, interaction.guild);\n  }"
text = text.replace(old, new)

path.write_text(text, encoding='utf-8')
