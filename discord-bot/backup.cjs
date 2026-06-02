require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILES = ['siggy-db.json', 'invoices.json', 'payment-info.json', 'leaderboards.json'];

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function backup() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let success = 0;

  for (const file of FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (not found)`);
      continue;
    }

    const key = `siggy-backups/${date}/${file}`;
    const body = fs.readFileSync(filePath);

    try {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      }));
      console.log(`✅ Backed up ${file} → ${key}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed to backup ${file}:`, err.message);
    }
  }

  console.log(`\n📦 Backup done: ${success}/${FILES.length} files`);
}

backup();
