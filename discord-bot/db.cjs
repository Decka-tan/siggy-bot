/**
 * SIGGY DISCORD BOT - DATABASE LAYER
 * JSON file persistence - No native compilation needed!
 * Simple and reliable for single-instance deployments
 */

const fs = require('fs');
const path = require('path');

// Database file path
const DATA_DIR = process.env.DATA_DIR || path.join(path.dirname(__filename), 'data');
const DB_FILE = path.join(DATA_DIR, 'siggy-db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache with periodic write-back
let db = {
  userStates: {},
  conversationHistory: {},
  meta: {
    version: 1,
    lastSaved: null,
  },
};

// Load database from file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);

      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid database structure');
      }
      if (!parsed.userStates || typeof parsed.userStates !== 'object') {
        throw new Error('Invalid userStates in database');
      }

      db = parsed;
      console.log('✅ Database loaded from disk');
    } else {
      saveDatabase(); // Create initial file
      console.log('✅ New database created');
    }
  } catch (error) {
    console.error('Error loading database:', error);
    // Backup corrupted file and start fresh
    if (fs.existsSync(DB_FILE)) {
      const backupFile = DB_FILE + '.corrupted.' + Date.now();
      fs.copyFileSync(DB_FILE, backupFile);
      console.log(`📦 Corrupted database backed up to: ${backupFile}`);
    }
    // Start with empty db
    db = {
      userStates: {},
      conversationHistory: {},
      meta: {
        version: 1,
        lastSaved: null,
      },
    };
    saveDatabase();
  }
}

// Save database to file (atomic write to prevent corruption)
function saveDatabase() {
  try {
    db.meta.lastSaved = Date.now();
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    // Atomic rename - this either succeeds completely or fails without corrupting
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Debounced save. The 30s interval below is only a backstop: on its own it lost
// up to 30 seconds of conversation and relationship state on every hard kill
// (OOM, SIGKILL, VPS reboot) — SIGINT/SIGTERM are handled, those are not.
// Mutations now schedule a write ~2s out, so bursts still coalesce into one
// write but nothing sits unsaved for long.
const SAVE_DEBOUNCE_MS = 2000;
let pendingSave = null;

function scheduleSave() {
  if (pendingSave) return;
  pendingSave = setTimeout(() => {
    pendingSave = null;
    saveDatabase();
  }, SAVE_DEBOUNCE_MS);
  if (pendingSave.unref) pendingSave.unref();
}

// Auto-save every 30 seconds
const saveInterval = setInterval(saveDatabase, 30000);

// Clear interval and save on process exit
const shutdown = () => {
  clearInterval(saveInterval);
  if (pendingSave) clearTimeout(pendingSave);
  saveDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ============ USER STATES ============

function getUserState(userId, guildId = null) {
  if (!db.userStates[userId]) {
    // Create default state for new user
    db.userStates[userId] = {
      userId,
      guildId, // Store which guild this user is from
      userName: null,
      mood: 'DEFAULT',
      form: 'ANIME',
      relationshipScore: 0,
      messageCount: 0,
      contributionCount: 0, // Track contributions in #contributions channel
      eventParticipationCount: 0, // Track event participation (mentions in #event channel)
      lastInteraction: Date.now(),
    };
    saveDatabase();
  } else if (guildId && !db.userStates[userId].guildId) {
    // Update guildId if not set
    db.userStates[userId].guildId = guildId;
    saveDatabase();
  }
  return db.userStates[userId];
}

function saveUserState(state) {
  db.userStates[state.userId] = {
    ...state,
    lastInteraction: state.lastInteraction || Date.now(),
  };
  scheduleSave();
}

function updateUserState(userId, updates) {
  const state = getUserState(userId);
  Object.assign(state, updates);
  state.lastInteraction = Date.now();
  saveUserState(state);
  return state;
}

function deleteUserState(userId) {
  delete db.userStates[userId];
  delete db.conversationHistory[userId];
  saveDatabase();
}

// ============ CONVERSATION HISTORY ============

function getConversationHistory(userId, limit = 10) {
  const history = db.conversationHistory[userId] || [];
  return history.slice(-limit);
}

function addConversationMessage(userId, role, content) {
  if (!db.conversationHistory[userId]) {
    db.conversationHistory[userId] = [];
  }

  db.conversationHistory[userId].push({
    role,
    content,
    timestamp: Date.now(),
  });

  // Keep only last 50 messages per user
  if (db.conversationHistory[userId].length > 50) {
    db.conversationHistory[userId] = db.conversationHistory[userId].slice(-50);
  }

  scheduleSave();
}

function setConversationHistory(userId, messages) {
  db.conversationHistory[userId] = messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp || Date.now(),
  }));
  scheduleSave();
}

function clearConversationHistory(userId) {
  delete db.conversationHistory[userId];
  saveDatabase();
}

// ============ STATS & ADMIN ============

function getGlobalStats() {
  const users = Object.values(db.userStates);
  const totalUsers = users.length;
  const totalMessages = users.reduce((sum, u) => sum + (u.messageCount || 0), 0);
  const avgRelationship = users.length > 0
    ? users.reduce((sum, u) => sum + (u.relationshipScore || 0), 0) / users.length
    : 0;

  // Top users by message count
  const topUsers = users
    .filter(u => u.userName)
    .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
    .slice(0, 10)
    .map(u => ({
      user_name: u.userName,
      message_count: u.messageCount,
      relationship_score: u.relationshipScore,
      mood: u.mood,
      form: u.form,
    }));

  // Mood distribution
  const moodDist = {};
  users.forEach(u => {
    const mood = u.mood || 'DEFAULT';
    moodDist[mood] = (moodDist[mood] || 0) + 1;
  });
  const moodDistribution = Object.entries(moodDist).map(([mood, count]) => ({ mood, count }));

  // Form distribution
  const formDist = {};
  users.forEach(u => {
    const form = u.form || 'ANIME';
    formDist[form] = (formDist[form] || 0) + 1;
  });
  const formDistribution = Object.entries(formDist).map(([form, count]) => ({ form, count }));

  return {
    totalUsers,
    totalMessages,
    avgRelationship: Math.round(avgRelationship),
    topUsers,
    moodDistribution,
    formDistribution,
  };
}

function getTopUsers(limit = 10, guildId = null) {
  let users = Object.values(db.userStates);

  // Filter by guild if specified
  if (guildId) {
    users = users.filter(u => u.guildId === guildId);
  }

  return users
    .filter(u => u.userName)
    .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
    .slice(0, limit)
    .map(u => ({
      user_name: u.userName,
      message_count: u.messageCount,
      relationship_score: u.relationshipScore,
      mood: u.mood,
      form: u.form,
    }));
}

function getUserRank(userId, guildId = null) {
  const userMessageCount = db.userStates[userId]?.messageCount || 0;
  if (userMessageCount === 0) return null;

  let users = Object.values(db.userStates);

  // Filter by guild if specified
  if (guildId) {
    users = users.filter(u => u.guildId === guildId);
  }

  const rank = users
    .filter(u => (u.messageCount || 0) > userMessageCount)
    .length;

  return rank + 1;
}

// ============ CLEANUP ============

function cleanupOldMessages(daysToKeep = 30) {
  const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  let cleaned = 0;

  for (const userId in db.conversationHistory) {
    const before = db.conversationHistory[userId].length;
    db.conversationHistory[userId] = db.conversationHistory[userId].filter(
      msg => msg.timestamp > cutoff
    );
    cleaned += before - db.conversationHistory[userId].length;

    // Remove empty histories
    if (db.conversationHistory[userId].length === 0) {
      delete db.conversationHistory[userId];
    }
  }

  saveDatabase();
  console.log(`🧹 Cleaned up ${cleaned} old messages`);
  return cleaned;
}

// Force save database
function flush() {
  saveDatabase();
  console.log('💾 Database flushed to disk');
}

// ============ EXPORTS ============

module.exports = {
  initDatabase: loadDatabase,
  loadDatabase,
  saveDatabase,
  flush,
  // User states
  getUserState,
  saveUserState,
  updateUserState,
  deleteUserState,
  // Conversation history
  getConversationHistory,
  addConversationMessage,
  setConversationHistory,
  clearConversationHistory,
  // Stats
  getGlobalStats,
  getTopUsers,
  getUserRank,
  // Cleanup
  cleanupOldMessages,
};

// Initialize on module load
loadDatabase();
