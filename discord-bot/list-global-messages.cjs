/**
 * list-global-messages.cjs — show who has been looked up (and thus had their
 * global message count recorded) in community/global-messages.json on R2.
 * Usage: node discord-bot/list-global-messages.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  const res = await s3.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: 'community/global-messages.json',
  }));
  const doc = JSON.parse(await res.Body.transformToString());
  const users = Object.entries(doc.users || {})
    .map(([id, u]) => ({ id, ...u }))
    .sort((a, b) => (b.globalMessages || 0) - (a.globalMessages || 0));

  console.log(`Recorded users: ${users.length} · doc updated ${new Date(doc.updatedAt).toISOString()}\n`);
  users.forEach((u, i) => {
    const when = u.updatedAt ? new Date(u.updatedAt).toISOString().slice(0, 10) : '?';
    console.log(`${String(i + 1).padStart(3)}. ${(u.globalMessages || 0).toLocaleString().padStart(8)} msgs · @${u.username} (${u.displayName}) · seen ${when}`);
  });
}
main().catch((e) => {
  if (e.name === 'NoSuchKey') console.log('global-messages.json not on R2 yet — nobody looked up since the feature shipped.');
  else { console.error(e); process.exit(1); }
});
