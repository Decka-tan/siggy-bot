/**
 * MERGE EVENTS DATA
 * Replace unreliable eventsCount with REAL mention counts from events channel
 */

const fs = require('fs');
const path = require('path');

const ACTIVITY_PATH = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');
const EVENTS_PATH = path.join(process.cwd(), 'extracted-data', 'events-participation.json');
const OUTPUT_PATH = path.join(process.cwd(), 'extracted-data', 'member-activity-analysis.json');

console.log('🔀 MERGING EVENTS DATA\n');

// Load files
const activityData = JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf-8'));
const eventsData = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf-8'));

console.log(`📂 Activity data: ${activityData.members.length} users`);
console.log(`📂 Events data: ${eventsData.totalUsers} users with mentions`);
console.log();

// Build userId -> username map from activity data
const userIdToUsername = new Map();
activityData.members.forEach(m => {
  userIdToUsername.set(m.userId, m.username);
});

// Build userId -> mention count map
const mentionCounts = new Map();
Object.entries(eventsData.mentionCounts).forEach(([userId, count]) => {
  mentionCounts.set(userId, count);
});

// Update eventsCount with real data
let updated = 0;
let found = 0;

activityData.members.forEach(member => {
  const realCount = mentionCounts.get(member.userId);

  if (realCount !== undefined) {
    // Has real events data
    member.eventsCount = realCount;
    updated++;
    found++;
  } else {
    // No mention in events channel = 0 events
    member.eventsCount = 0;
  }
});

// Save updated data
activityData.updatedAt = new Date().toISOString();
activityData.eventsDataSource = 'events-channel-mentions-1389298240762937414';
activityData.eventsDataStats = {
  totalMessages: eventsData.totalMessages,
  totalMentions: eventsData.totalMentions,
  totalUsers: eventsData.totalUsers
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(activityData, null, 2));

console.log('✅ MERGE COMPLETE!');
console.log(`\n📊 Statistics:`);
console.log(`   Total members: ${activityData.members.length}`);
console.log(`   Members with events data: ${found}`);
console.log(`   Members updated: ${updated}`);
console.log(`   Members with 0 events: ${activityData.members.length - found}`);
console.log(`\n💾 Output: ${OUTPUT_PATH}`);

// Show some examples
console.log(`\n📝 Sample updates:`);
const samples = activityData.members
  .filter(m => m.eventsCount > 0)
  .sort((a, b) => b.eventsCount - a.eventsCount)
  .slice(0, 5);

samples.forEach(m => {
  console.log(`   @${m.username}: ${m.eventsCount} mentions`);
});
