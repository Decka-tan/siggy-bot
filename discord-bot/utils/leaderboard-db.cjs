/**
 * LEADERBOARD DATABASE
 * Custom leaderboard system for tournaments, competitions, etc.
 * Uses JSON file for persistence
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/leaderboards.json');

// Initialize DB file if not exists
function initDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ leaderboards: {} }, null, 2));
  }
}

/**
 * Read database
 */
function readDB() {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Leaderboard DB] Read error:', error);
    return { leaderboards: {} };
  }
}

/**
 * Write database
 */
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
 * Generate event ID from name
 */
function generateEventId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

/**
 * Create a new leaderboard
 * @param {string} name - Display name
 * @param {string} createdBy - User ID who created it
 * @returns {Object} Result with success, eventId, message
 */
function createLeaderboard(name, createdBy) {
  const db = readDB();
  const eventId = generateEventId(name);

  if (db.leaderboards[eventId]) {
    return {
      success: false,
      message: `Leaderboard "${name}" already exists! Use a different name.`,
      eventId
    };
  }

  db.leaderboards[eventId] = {
    name: name,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    participants: {}
  };

  const saved = writeDB(db);

  if (saved) {
    return {
      success: true,
      message: `✅ Created leaderboard "**${name}**"!`,
      eventId
    };
  }

  return {
    success: false,
    message: '❌ Failed to create leaderboard. Try again.'
  };
}

/**
 * Add or update a participant
 * @param {string} eventId - Event ID
 * @param {string} userId - Discord user ID
 * @param {string} userName - Display name
 * @param {number} score - Score
 * @returns {Object} Result
 */
function addParticipant(eventId, userId, userName, score) {
  const db = readDB();

  if (!db.leaderboards[eventId]) {
    return {
      success: false,
      message: `❌ Leaderboard not found. Use /leaderboard list to see available leaderboards.`
    };
  }

  const isNew = !db.leaderboards[eventId].participants[userId];

  db.leaderboards[eventId].participants[userId] = {
    name: userName,
    score: score,
    updated_at: new Date().toISOString()
  };

  const saved = writeDB(db);

  if (saved) {
    const action = isNew ? 'added to' : 'updated in';
    return {
      success: true,
      message: `✅ **${userName}** ${action} "**${db.leaderboards[eventId].name}**" with score **${score}**!`
    };
  }

  return {
    success: false,
    message: '❌ Failed to update participant.'
  };
}

/**
 * Remove a participant
 * @param {string} eventId - Event ID
 * @param {string} userId - Discord user ID
 * @returns {Object} Result
 */
function removeParticipant(eventId, userId) {
  const db = readDB();

  if (!db.leaderboards[eventId]) {
    return {
      success: false,
      message: `❌ Leaderboard not found.`
    };
  }

  if (!db.leaderboards[eventId].participants[userId]) {
    return {
      success: false,
      message: `❌ User not found in this leaderboard.`
    };
  }

  const userName = db.leaderboards[eventId].participants[userId].name;
  delete db.leaderboards[eventId].participants[userId];

  const saved = writeDB(db);

  if (saved) {
    return {
      success: true,
      message: `✅ **${userName}** removed from "**${db.leaderboards[eventId].name}**"!`
    };
  }

  return {
    success: false,
    message: '❌ Failed to remove participant.'
  };
}

/**
 * Get leaderboard sorted by score
 * @param {string} eventId - Event ID
 * @returns {Object|null} Leaderboard data or null
 */
function getLeaderboard(eventId) {
  const db = readDB();

  if (!db.leaderboards[eventId]) {
    return null;
  }

  const leaderboard = db.leaderboards[eventId];
  const sortedParticipants = Object.entries(leaderboard.participants)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([userId, data], index) => ({
      rank: index + 1,
      userId,
      ...data
    }));

  return {
    eventId,
    name: leaderboard.name,
    createdAt: leaderboard.created_at,
    createdBy: leaderboard.created_by,
    participants: sortedParticipants,
    totalParticipants: sortedParticipants.length
  };
}

/**
 * List all leaderboards
 * @returns {Array} List of leaderboards
 */
function listLeaderboards() {
  const db = readDB();

  return Object.entries(db.leaderboards).map(([eventId, data]) => ({
    eventId,
    name: data.name,
    participantCount: Object.keys(data.participants).length,
    createdAt: data.created_at
  }));
}

/**
 * Delete a leaderboard
 * @param {string} eventId - Event ID
 * @param {string} requesterId - User ID requesting deletion
 * @returns {Object} Result
 */
function deleteLeaderboard(eventId, requesterId) {
  const db = readDB();

  if (!db.leaderboards[eventId]) {
    return {
      success: false,
      message: `❌ Leaderboard not found.`
    };
  }

  // Check if user is the creator (you can add admin checks later)
  if (db.leaderboards[eventId].created_by !== requesterId) {
    return {
      success: false,
      message: `❌ Only the creator can delete this leaderboard.`
    };
  }

  const name = db.leaderboards[eventId].name;
  delete db.leaderboards[eventId];

  const saved = writeDB(db);

  if (saved) {
    return {
      success: true,
      message: `✅ Deleted leaderboard "**${name}**"!`
    };
  }

  return {
    success: false,
    message: '❌ Failed to delete leaderboard.'
  };
}

/**
 * Search leaderboard by partial name
 * @param {string} query - Search query
 * @returns {string|null} Event ID or null
 */
function findLeaderboard(query) {
  const db = readDB();
  const lowerQuery = query.toLowerCase();

  // Exact match first
  if (db.leaderboards[lowerQuery]) {
    return lowerQuery;
  }

  // Partial name match
  for (const [eventId, data] of Object.entries(db.leaderboards)) {
    if (data.name.toLowerCase().includes(lowerQuery) || eventId.includes(lowerQuery)) {
      return eventId;
    }
  }

  return null;
}

module.exports = {
  createLeaderboard,
  addParticipant,
  removeParticipant,
  getLeaderboard,
  listLeaderboards,
  deleteLeaderboard,
  findLeaderboard,
  generateEventId
};
