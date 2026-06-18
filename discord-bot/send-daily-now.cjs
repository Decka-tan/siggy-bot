/**
 * send-daily-now.cjs — manually trigger one of the DAILY_POSTS messages right now.
 * Usage:
 *   node discord-bot/send-daily-now.cjs 11am
 *   node discord-bot/send-daily-now.cjs 3pm
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');

const which = (process.argv[2] || '').toLowerCase();
const POSTS = {
  '11am': {
    channelId: '1455014277847973984',
    content: '<@&1463045360514629652>',
    file: 'daily-11am.png',
  },
  '3pm': {
    channelId: '1455014277847973984',
    content: '<@416478332452864001> <@392321900577161219>',
    file: 'daily-3pm.png',
  },
};

const post = POSTS[which];
if (!post) {
  console.error('Usage: node send-daily-now.cjs <11am|3pm>');
  process.exit(1);
}

const filePath = path.join(__dirname, 'assets', post.file);
if (!fs.existsSync(filePath)) {
  console.error(`Image missing at ${filePath}`);
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', async () => {
  try {
    const channel = await client.channels.fetch(post.channelId);
    await channel.send({
      content: post.content,
      files: [filePath],
      allowedMentions: { parse: ['users', 'roles'] },
    });
    console.log(`✓ sent ${which} to #${channel.name}`);
  } catch (e) {
    console.error('send error:', e.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});
client.login(process.env.DISCORD_BOT_TOKEN);
