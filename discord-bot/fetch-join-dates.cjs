require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';
const PROMO_DATE = new Date('2026-06-01');

const promotions = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/promotions-june-2026.json')));

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const result = {};
  let done = 0;

  for (const m of promotions) {
    let res;
    for (let i = 0; i < 3; i++) {
      res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${m.userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      });
      if (res.status !== 429) break;
      const wait = parseFloat(res.headers.get('Retry-After') || '1');
      await sleep(wait * 1000 + 200);
    }

    if (res.ok) {
      const data = await res.json();
      if (data.joined_at) {
        const joined = new Date(data.joined_at);
        const days = Math.floor((PROMO_DATE - joined) / (1000 * 60 * 60 * 24));
        result[m.userId] = { joinedAt: data.joined_at, daysToPromo: days };
      }
    }

    done++;
    process.stdout.write(`\r  ${done}/${promotions.length}`);
    await sleep(100);
  }

  const outPath = path.join(__dirname, '../lib/promotion-join-dates.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n✅ Saved ${Object.keys(result).length} join dates`);
}

main().catch(console.error);
