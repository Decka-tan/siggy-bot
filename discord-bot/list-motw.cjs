/**
 * list-motw.cjs — print the current Members of the Week + score breakdown.
 * Usage: node discord-bot/list-motw.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function main() {
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: 'community/member-activity.json' }));
  const doc = JSON.parse(await res.Body.transformToString());
  const motw = doc.membersOfWeek || [];
  console.log(`Members of the Week (${motw.length}) · updated ${new Date(doc.updatedAt).toISOString()}\n`);
  console.log('  #  score  contrib  won  host   chat  role          name');
  motw.forEach((m, i) => {
    const line = [
      String(i + 1).padStart(3),
      String(m.score).padStart(6),
      String(m.contributions).padStart(8),
      String(m.eventsWon).padStart(4),
      String(m.eventsHosted).padStart(5),
      String(m.chat).padStart(6),
      (m.role || '—').padEnd(13),
      `${m.displayName} (@${m.username})`,
    ].join(' ');
    console.log(line);
  });
}
main().catch((e) => { console.error(e.name === 'NoSuchKey' ? 'member-activity.json not on R2 yet — run fetch-activity first.' : e); process.exit(1); });
