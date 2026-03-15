const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'extracted-data');
const data = JSON.parse(fs.readFileSync(path.join(dataDir, 'complete-guild-members-enriched.json'), 'utf-8'));
const roleMap = JSON.parse(fs.readFileSync(path.join(dataDir, 'roles-map.json'), 'utf-8'));

const summary = data.members.map(m => {
  const roleNames = (m.roles || [])
    .slice(0, 10)
    .map(id => roleMap[id] || id)
    .filter(n => n !== '@everyone');

  return {
    userId: m.userId,
    username: m.username,
    displayName: m.displayName,
    avatar: m.avatar,
    roleNames,
    joinedAt: m.joinedAt
  };
});

fs.writeFileSync(
  path.join(dataDir, 'user-roles-summary.json'),
  JSON.stringify({ members: summary })
);

const stats = fs.statSync(path.join(dataDir, 'user-roles-summary.json'));
console.log('✅ Optimized size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
console.log('✅ Users:', summary.length);
