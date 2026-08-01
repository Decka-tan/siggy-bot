/**
 * CROSS-PROCESS FILE LOCK
 *
 * The bot (PM2) and siggy-web (Next) both read-modify-write the same JSON files.
 * An in-process flag cannot see the other process, so two writers can interleave
 * and silently drop each other's changes.
 *
 * mkdir() is atomic on every OS we run on, so a lock directory is the primitive:
 * whoever creates it first owns the file until it is removed.
 */

const fs = require('fs');
const path = require('path');

const ACQUIRE_TIMEOUT_MS = 5000;  // 660-byte file — nobody legitimately holds it this long
const STALE_LOCK_MS = 30000;      // a lock older than this belongs to a crashed process
const RETRY_MS = 25;

// Re-entrancy depth per lock dir, so nested calls in one process don't deadlock.
const heldDepth = new Map();

function sleepSync(ms) {
  // Blocking sleep — every caller here is synchronous.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeLockDir(lockDir) {
  try {
    fs.rmSync(lockDir, { recursive: true, force: true });
  } catch (e) {
    /* another process may have cleaned it already */
  }
}

function acquire(lockDir) {
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;

  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      try {
        fs.writeFileSync(path.join(lockDir, 'owner'), `${process.pid}`);
      } catch (e) { /* owner file is diagnostics only */ }
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      try {
        const age = Date.now() - fs.statSync(lockDir).mtimeMs;
        if (age > STALE_LOCK_MS) {
          console.warn(`[file-lock] breaking stale lock (${Math.round(age / 1000)}s old): ${lockDir}`);
          removeLockDir(lockDir);
          continue;
        }
      } catch (e) { /* lock vanished between calls — just retry */ }

      if (Date.now() > deadline) {
        // Never fail a user's command over lock contention on a tiny file:
        // take it by force, but make the anomaly loud.
        console.error(`[file-lock] timed out after ${ACQUIRE_TIMEOUT_MS}ms, forcing: ${lockDir}`);
        removeLockDir(lockDir);
        continue;
      }

      sleepSync(RETRY_MS);
    }
  }
}

/**
 * Run fn() holding an exclusive lock on targetFile. Synchronous by design:
 * the lock must not stay held across an await.
 */
function withFileLock(targetFile, fn) {
  const lockDir = `${targetFile}.lock`;
  const depth = heldDepth.get(lockDir) || 0;

  if (depth > 0) {
    heldDepth.set(lockDir, depth + 1);
    try {
      return fn();
    } finally {
      heldDepth.set(lockDir, heldDepth.get(lockDir) - 1);
    }
  }

  acquire(lockDir);
  heldDepth.set(lockDir, 1);
  try {
    return fn();
  } finally {
    heldDepth.delete(lockDir);
    removeLockDir(lockDir);
  }
}

/**
 * Write via temp file + rename. rename() is atomic, so a reader either sees the
 * whole old file or the whole new one — never a half-written one.
 */
function writeFileAtomic(targetFile, contents) {
  const tmp = `${targetFile}.tmp.${process.pid}.${Date.now()}`;
  try {
    fs.writeFileSync(tmp, contents);
    fs.renameSync(tmp, targetFile);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch (e) { /* nothing else to do */ }
    throw err;
  }
}

module.exports = { withFileLock, writeFileAtomic };
