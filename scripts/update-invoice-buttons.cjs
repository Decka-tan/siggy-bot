/**
 * MASS UPDATE INVOICE BUTTONS
 * Run this script to update all existing invoice messages
 * with the new [Bayar] button (replacing [Remind])
 *
 * Usage: cd /home/ubuntu/siggy-bot && node scripts/update-invoice-buttons.cjs
 */

// Load .env (optional - skip if already loaded)
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not found, using env vars from process.env');
}

const { Client, GatewayIntentBits } = require('discord.js');

// Import functions (paths work when run from project root)
const { readDB } = require('./discord-bot/utils/invoice-db.cjs');
const { renderInvoiceEmbed, buildInvoiceButtons } = require('./discord-bot/commands/invoice-simple.cjs');

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const db = readDB();
  const invoices = Object.values(db.invoices || {});

  console.log(`\n📊 Found ${invoices.length} invoices total\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const invoice of invoices) {
    try {
      // Check if invoice has messageId
      if (!invoice.messageId) {
        console.log(`⏭️  Skipping ${invoice.id} - no messageId`);
        skipped++;
        continue;
      }

      // Fetch the channel
      const channel = await client.channels.fetch(invoice.channelId).catch(() => null);
      if (!channel) {
        console.log(`⚠️  Skipping ${invoice.id} - channel not found`);
        skipped++;
        continue;
      }

      // Fetch the message
      const message = await channel.messages.fetch(invoice.messageId).catch(() => null);
      if (!message) {
        console.log(`⚠️  Skipping ${invoice.id} - message not found (deleted?)`);
        skipped++;
        continue;
      }

      // Generate new embed and buttons
      const embed = renderInvoiceEmbed(invoice);
      const buttons = buildInvoiceButtons(invoice.id);

      // Update the message
      await message.edit({
        embeds: [embed],
        components: [buttons]
      });

      console.log(`✅ Updated ${invoice.id} - ${invoice.title || 'Untitled'}`);
      updated++;

      // Rate limit - wait 500ms between edits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Failed to update ${invoice.id}:`, error.message);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📈 SUMMARY:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log(`   📊 Total:   ${invoices.length}`);
  console.log(`${'='.repeat(50)}\n`);

  await client.destroy();
  process.exit(0);
});

// Login
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});
