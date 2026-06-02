require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const promotions = require('../lib/promotions-june-2026.json');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

const VALID = new Set(['contributor→bitty','bitty→ritty','ritty→ritualist']);
const PROMO_IDS = new Set(
  promotions.filter(m => VALID.has(`${m.fromRole}→${m.toRole}`)).map(m => m.userId)
);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`📋 Fetching avatar URLs for ${PROMO_IDS.size} members...`);
  const avatarMap = {};
  let after = '0';
  let page = 0;

  while (true) {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      if (res.status !== 429) break;
      const wait = parseFloat(res.headers.get('Retry-After') || '1');
      console.log(`  Rate limited, waiting ${wait}s...`);
      await sleep(wait * 1000 + 200);
    }
    const batch = await res.json();
    if (!batch.length) break;

    for (const m of batch) {
      if (!PROMO_IDS.has(m.user.id)) continue;
      const hash = m.avatar || m.user.avatar;
      if (hash) {
        const ext = hash.startsWith('a_') ? 'gif' : 'png';
        avatarMap[m.user.id] = `https://cdn.discordapp.com/avatars/${m.user.id}/${hash}.${ext}?size=128`;
      } else {
        const idx = (BigInt(m.user.id) >> 22n) % 6n;
        avatarMap[m.user.id] = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
      }
    }

    console.log(`  Page ${++page}: found ${Object.keys(avatarMap).length}/${PROMO_IDS.size}`);
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  // Fill missing with default
  for (const userId of PROMO_IDS) {
    if (!avatarMap[userId]) {
      const idx = (BigInt(userId) >> 22n) % 6n;
      avatarMap[userId] = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }
  }

  const outPath = path.join(__dirname, '../lib/promotion-avatars.json');
  fs.writeFileSync(outPath, JSON.stringify(avatarMap, null, 2));
  console.log(`\n✅ Saved ${Object.keys(avatarMap).length} avatar URLs to lib/promotion-avatars.json`);
}

main().catch(console.error);
