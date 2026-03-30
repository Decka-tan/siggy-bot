/**
 * LEADERBOARD DATABASE
 * Single active 1-hour session rolling leaderboard
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/leaderboards.json');
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 Hour

// Initialize DB file if not exists
function initDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ sessions: {} }, null, 2));
  }
}

function readDB() {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Leaderboard DB] Read error:', error);
    return { sessions: {} };
  }
}

function writeDB(data) {
  initDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[Leaderboard DB] Write error:', error);
    return false;
  }
}

/**
 * Clean up expired sessions dynamically
 */
function cleanupExpiredSessions(db) {
  let changed = false;
  const now = Date.now();
  for (const guildId in db.sessions) {
    if (now > db.sessions[guildId].expiresAt) {
      delete db.sessions[guildId];
      changed = true;
    }
  }
  return changed;
}

/**
 * Start a new active leaderboard session, unconditionally replacing the old one.
 */
function startSession(guildId, createdBy, userId, userName, score) {
  const db = readDB();
  cleanupExpiredSessions(db);

  const now = Date.now();
  
  db.sessions[guildId] = {
    createdBy: createdBy,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
    participants: {
      [userId]: {
        name: userName,
        score: score,
        updatedAt: now
      }
    }
  };

  writeDB(db);

  return {
    success: true,
    message: `✅ **${userName}** added with score **${score}**!`
  };
}

/**
 * Add or update score for a participant in the current active session
 */
function addScore(guildId, userId, userName, addedScore) {
  const db = readDB();
  
  // Auto-cleanup
  if (cleanupExpiredSessions(db)) {
    writeDB(db);
  }

  if (!db.sessions[guildId]) {
    return {
      success: false,
      message: `❌ No active leaderboard session! Use \`/leaderboard start\` to begin one.`
    };
  }

  const session = db.sessions[guildId];
  const participant = session.participants[userId];

  let newScore = addedScore;
  if (participant) {
    newScore = participant.score + addedScore;
  }

  session.participants[userId] = {
    name: userName,
    score: newScore,
    updatedAt: Date.now()
  };

  // Reset the expiry timer to 1 HOUR from the latest activity
  session.expiresAt = Date.now() + SESSION_DURATION_MS;

  writeDB(db);

  return {
    success: true,
    message: `✅ **${userName}** score increased by ${addedScore} (Total: **${newScore}**)!`
  };
}

/**
 * Manually end the active session
 */
function endSession(guildId) {
  const db = readDB();
  cleanupExpiredSessions(db);

  if (!db.sessions[guildId]) {
    return {
      success: false,
      message: `❌ There is no active leaderboard session to end.`
    };
  }

  delete db.sessions[guildId];
  writeDB(db);

  return {
    success: true,
    message: `✅ Leaderboard session has been closed.`
  };
}

/**
 * Get the current active sorted leaderboard
 */
function getActiveLeaderboard(guildId) {
  const db = readDB();
  
  // Clean up inline so we don't return an expired one
  if (cleanupExpiredSessions(db)) {
    writeDB(db);
  }

  if (!db.sessions[guildId]) {
    return null;
  }

  const session = db.sessions[guildId];
  
  const sortedParticipants = Object.entries(session.participants)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([uid, data], index) => ({
      rank: index + 1,
      userId: uid,
      ...data
    }));

  return {
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    participants: sortedParticipants,
    totalParticipants: sortedParticipants.length
  };
}

module.exports = {
  startSession,
  addScore,
  endSession,
  getActiveLeaderboard
};
