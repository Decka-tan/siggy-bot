require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const promotions = require('../lib/promotions-june-2026.json');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1210468736205852672';
const DISCORD_API = 'https://discord.com/api/v10';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const ROLE_RANK = {
  ritualist: 7, soulsmith: 6, architect: 5, mage: 4,
  ritty: 3, bitty: 2, forerunner: 1, contributor: 0,
};

const VALID = new Set(['contributor→bitty','bitty→ritty','ritty→ritualist']);
const PROMO_IDS = new Set(
  promotions.filter(m => VALID.has(`${m.fromRole}→${m.toRole}`)).map(m => m.userId)
);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllMembers() {
  const members = new Map();
  let after = '0';

  for (let page = 0; page < 150; page++) {
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
      if (hash) members.set(m.user.id, { hash, animated: hash.startsWith('a_') });
    }

    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }
  return members;
}

async function downloadAndUpload(userId, hash, animated) {
  const ext = animated ? 'gif' : 'png';
  const url = animated
    ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.gif?size=128`
    : `https://cdn.discordapp.com/avatars/${userId}/${hash}.png?size=128`;

  const res = await fetch(url);
  if (!res.ok) {
    // fallback: default avatar
    const idx = (BigInt(userId) >> 22n) % 6n;
    const fallback = await fetch(`https://cdn.discordapp.com/embed/avatars/${idx}.png`);
    if (!fallback.ok) return null;
    const buf = Buffer.from(await fallback.arrayBuffer());
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `promotion-avatars/${userId}.png`,
      Body: buf,
      ContentType: 'image/png',
    }));
    return `promotion-avatars/${userId}.png`;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const key = `promotion-avatars/${userId}.${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buf,
    ContentType: animated ? 'image/gif' : 'image/png',
  }));
  return key;
}

async function main() {
  console.log(`📋 ${PROMO_IDS.size} promoted members to process\n`);

  console.log('👥 Fetching member avatars from Discord...');
  const members = await fetchAllMembers();
  console.log(`✅ Found ${members.size} avatars\n`);

  let success = 0, fail = 0;
  const avatarMap = {};

  for (const [userId, { hash, animated }] of members) {
    try {
      const key = await downloadAndUpload(userId, hash, animated);
      if (key) {
        avatarMap[userId] = `${process.env.R2_PUBLIC_URL}/${key}`;
        success++;
        process.stdout.write(`\r  ✅ ${success}/${members.size} uploaded`);
      }
    } catch (err) {
      fail++;
      console.error(`\n  ❌ ${userId}: ${err.message}`);
    }
    await sleep(50); // gentle throttle
  }

  // Also handle members without avatar (use default)
  for (const userId of PROMO_IDS) {
    if (members.has(userId) || avatarMap[userId]) continue;
    const idx = (BigInt(userId) >> 22n) % 6n;
    avatarMap[userId] = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  // Save mapping to JSON
  const fs = require('fs');
  const outPath = require('path').join(__dirname, '../lib/promotion-avatars.json');
  fs.writeFileSync(outPath, JSON.stringify(avatarMap, null, 2));

  console.log(`\n\n📦 Done: ${success} uploaded, ${fail} failed`);
  console.log(`💾 Saved to lib/promotion-avatars.json`);
}

main().catch(console.error);
