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

function getAvatarUrl(member) {
  const uid = member.user.id;
  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${member.avatar}.png?size=256`;
  }
  if (member.user.avatar) {
    return `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.png?size=256`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
}

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
      await sleep(wait * 1000 + 200);
    }
    const batch = await res.json();
    if (!batch.length) break;

    for (const m of batch) {
      if (!PROMO_IDS.has(m.user.id)) continue;
      const cdnUrl = getAvatarUrl(m);
      avatarMap[m.user.id] = `/api/proxy-avatar?url=${encodeURIComponent(cdnUrl)}`;
    }

    console.log(`  Page ${++page}: ${Object.keys(avatarMap).length}/${PROMO_IDS.size}`);
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  // Fill missing
  for (const userId of PROMO_IDS) {
    if (!avatarMap[userId]) {
      const idx = parseInt(userId.slice(-1)) % 5;
      const cdnUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
      avatarMap[userId] = `/api/proxy-avatar?url=${encodeURIComponent(cdnUrl)}`;
    }
  }

  const outPath = path.join(__dirname, '../lib/promotion-avatars.json');
  fs.writeFileSync(outPath, JSON.stringify(avatarMap, null, 2));
  console.log(`\n✅ Saved ${Object.keys(avatarMap).length} entries`);
}

main().catch(console.error);
