#!/usr/bin/env node
/**
 * VERIFY CROSS-PROCESS FILE LOCK
 *
 * invoices.json and payment-info.json are written by two separate processes:
 * the Discord bot (PM2) and siggy-web (Next). This script proves the lock in
 * discord-bot/utils/file-lock.cjs actually serialises them ON THIS MACHINE —
 * a pass on a dev laptop says nothing about the VPS filesystem.
 *
 * It never touches real data: every run works on a fresh file in the OS temp dir.
 *
 *   node scripts/verify-file-lock.cjs
 *
 * Exit code 0 = safe to deploy, 1 = do not deploy.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_ROOT = path.join(__dirname, '..');
const WORKERS = 6;
const PER_WORKER = 40;
const EXPECTED = WORKERS * PER_WORKER;

// ---------------------------------------------------------------- worker mode
if (process.argv[2] === '--worker') {
  const [, , , kind, dbPath, tag, count] = process.argv;

  if (kind === 'invoice') {
    process.env.INVOICE_DB_PATH = dbPath;
    const db = require(path.join(REPO_ROOT, 'discord-bot/utils/invoice-db.cjs'));
    for (let i = 0; i < parseInt(count, 10); i++) db.addNameAlias('shared', `${tag}-${i}`);
  } else {
    process.env.PAYMENT_DB_PATH = dbPath;
    const db = require(path.join(REPO_ROOT, 'discord-bot/utils/payment-db.cjs'));
    for (let i = 0; i < parseInt(count, 10); i++) db.linkName(`${tag}-${i}`, `id-${tag}-${i}`, tag);
  }
  process.exit(0);
}

// ----------------------------------------------------------- orchestrator mode
function seed(kind, file) {
  const empty = kind === 'invoice'
    ? { invoices: {}, nameAliases: {} }
    : { payments: {}, nameLinks: {} };
  fs.writeFileSync(file, JSON.stringify(empty, null, 2));
}

function countEntries(kind, file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return kind === 'invoice'
    ? (parsed.nameAliases?.shared || []).length
    : Object.keys(parsed.nameLinks || {}).length;
}

function runCase(kind) {
  const file = path.join(os.tmpdir(), `siggy-locktest-${kind}-${process.pid}-${Date.now()}.json`);
  seed(kind, file);
  const started = Date.now();

  return Promise.all(
    Array.from({ length: WORKERS }, (_, w) =>
      new Promise((resolve) => {
        spawn(
          process.execPath,
          [__filename, '--worker', kind, file, `w${w}`, String(PER_WORKER)],
          { cwd: REPO_ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
        ).on('exit', resolve);
      })
    )
  ).then(() => {
    const elapsed = Date.now() - started;
    let landed = 0;
    let corrupt = null;
    try {
      landed = countEntries(kind, file);
    } catch (e) {
      corrupt = e.message;
    }

    const lockLeft = fs.existsSync(`${file}.lock`);
    const base = path.basename(file);
    const tmpLeft = fs.readdirSync(os.tmpdir()).filter(f => f.startsWith(base) && f.includes('.tmp.'));

    fs.rmSync(file, { force: true });
    fs.rmSync(`${file}.lock`, { recursive: true, force: true });
    tmpLeft.forEach(f => fs.rmSync(path.join(os.tmpdir(), f), { force: true }));

    const ok = !corrupt && landed === EXPECTED && !lockLeft && tmpLeft.length === 0;

    console.log(`\n[${kind}]  ${WORKERS} proses x ${PER_WORKER} tulisan  (${elapsed} ms)`);
    console.log(`  tulisan tercatat : ${landed} / ${EXPECTED}${landed === EXPECTED ? '' : `   <-- HILANG ${EXPECTED - landed}`}`);
    console.log(`  file JSON valid  : ${corrupt ? 'TIDAK — ' + corrupt : 'ya'}`);
    console.log(`  sisa lock dir    : ${lockLeft ? 'ADA (bug)' : 'bersih'}`);
    console.log(`  sisa file temp   : ${tmpLeft.length ? tmpLeft.join(', ') : 'bersih'}`);
    console.log(`  hasil            : ${ok ? 'AMAN' : 'GAGAL'}`);
    return ok;
  });
}

console.log('Verifikasi lock lintas-proses');
console.log(`node   : ${process.version}`);
console.log(`platform: ${process.platform} ${os.release()}`);
console.log(`tmpdir : ${os.tmpdir()}`);

runCase('invoice')
  .then(async (a) => ({ a, b: await runCase('payment') }))
  .then(({ a, b }) => {
    const ok = a && b;
    console.log(`\n=== ${ok ? 'SEMUA AMAN — boleh deploy' : 'ADA YANG GAGAL — JANGAN deploy'} ===`);
    process.exit(ok ? 0 : 1);
  })
  .catch((e) => {
    console.error('verifikasi error:', e);
    process.exit(1);
  });
