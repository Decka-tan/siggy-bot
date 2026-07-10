/**
 * fetch-role-stats.cjs — run hourly on VPS via cron
 *
 * 1. Fetches all Ritual guild members
 * 2. Computes role distribution (counts + %) for tracked roles
 * 3. Detects upgrades vs previous snapshot, appends to a rolling 14-day log
 * 4. Uploads role-stats.json + recent-upgrades.json to R2 (community/)
 *
 * State files (local, persist across runs, backed up by daily backup cron):
 *   discord-bot/data/role-snapshot.json   userId -> topRole
 *   discord-bot/data/upgrade-log.json     [{ userId, displayName, username, fromRole, toRole, at }]
 *
 * Cron:  0 * * * * cd /opt/siggy-bot && node discord-bot/fetch-role-stats.cjs >> /home/ubuntu/role-stats.log 2>&1
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DISCORD_API, fetchWithRetry, paginate } = require('./lib/discord-fetch.cjs');

const BOT_TOKEN  = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID   = '1210468736205852672';
const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, 'data');

const SNAPSHOT_FILE = path.join(DATA_DIR, 'role-snapshot.json');
const LOG_FILE      = path.join(DATA_DIR, 'upgrade-log.json');
const RETENTION_MS  = 14 * 24 * 60 * 60 * 1000; // 14 days
const NO_ROLE       = '__NO_TRACKED_ROLE__';

// Roles shown in the distribution chart (display name -> rank).
// Higher rank = higher tier. Used to pick each member's "top" role and to detect upgrades.
const ROLE_RANK = {
  'Radiant Ritualist': 8,
  'Zealot': 7,
  'Ritualist': 6,
  'Mage': 3,
  'ritty': 2,
  'bitty': 1,
};
const TRACKED_ROLES = Object.keys(ROLE_RANK);

// Roles that count as the "contributor ladder" (used for the page's contributor-only filter).
// Zealot/Mage/Forerunner are tracked + labeled but DO NOT have their own tier bucket.
// Members holding them fall into their contributor role's bucket (or 'Other' if none).
const CONTRIBUTOR_LADDER = new Set(['bitty', 'ritty', 'Ritualist', 'Radiant Ritualist']);
const CONTRIBUTOR_RANK = { 'Radiant Ritualist': 4, 'Ritualist': 3, 'ritty': 2, 'bitty': 1 };

// Staff/mod roles — excluded from activity leaderboards (they post in those
// channels as part of their role, not as community contributors).
const STAFF_ROLES = new Set(['Mods', 'Moderator', 'Foundation Team', 'Event Manager']);

// Alignment roles (mutually exclusive) — shown as a label only for members
// without a contributor role.
const SPECIAL_ROLES = ['Blessed', 'Cursed', 'Harmonic'];

// Fallback role labels — shown on badge pages when a holder has no tracked
// ladder role. Priority order matters (first match wins).
const FALLBACK_ROLES = ['Forerunner', 'Blessed', 'Harmonic', 'Cursed', 'Initiate'];

// Badge roles — additive (orthogonal to the contributor ladder). A member can
// hold a badge in addition to any tracked role. Used to surface special cohorts
// (e.g. early-deployer registry) on /stats and as standalone /<badge> pages.
const BADGE_ROLES = ['Genesis 1000'];

// Regional community roles (for the Insights tab) — counted over ALL members
const REGION_ROLES = [
  'Komunitas Indonesia', 'Viet Community', 'Chinese Community', 'Korean Community',
  'Japanese Community', 'Thai Community', 'Indian Community', 'Arabic Comunity',
  'Russian Community', 'Ukraine Community', 'Türkiye Topluluğu', 'Naija Community',
  'Filipinas', 'português',
];
const REGION_SET = new Set(REGION_ROLES);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function avatarProxy(m) {
  const uid = m.user.id;
  let cdn;
  if (m.avatar)            cdn = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${uid}/avatars/${m.avatar}.png?size=128`;
  else if (m.user.avatar)  cdn = `https://cdn.discordapp.com/avatars/${uid}/${m.user.avatar}.png?size=128`;
  else                     cdn = `https://cdn.discordapp.com/embed/avatars/${parseInt(uid.slice(-1)) % 5}.png`;
  return `/api/proxy-avatar?url=${encodeURIComponent(cdn)}`;
}

async function getRolesMap() {
  const res = await fetchWithRetry(`${DISCORD_API}/guilds/${GUILD_ID}/roles`, { token: BOT_TOKEN });
  const roles = await res.json();
  return new Map(roles.map(r => [r.id, r.name]));
}

async function fetchAllMembers(rolesMap) {
  const trackedIds = new Set(
    Array.from(rolesMap.entries()).filter(([, n]) => TRACKED_ROLES.includes(n)).map(([id]) => id)
  );

  const members = [];
  const allMemberIds = [];                 // every current (non-bot) member id — used to filter activity
  const roleSnapshot = {};                 // every current (non-bot) member id -> top tracked role or NO_ROLE
  const staffIds = [];                     // members holding a staff/mod role — excluded from leaderboards
  const specialRoles = {};                 // userId -> Blessed/Cursed/Harmonic (for non-contributor label)
  const badgeHolders = {};                 // badgeName -> [{ userId, username, displayName, avatarUrl, joinedAt, topRole }]
  for (const b of BADGE_ROLES) badgeHolders[b] = [];
  // Insights over ALL members (not just ranked)
  let totalGuildMembers = 0;
  const joinByMonth = {};                 // 'YYYY-MM' -> count
  const regional = {};                    // regionRole -> count (any: member may hold several)
  const regionalPure = {};                // regionRole -> count (pure: member holds ONLY this region)
  let multiRegion = 0;                    // members holding >1 region role
  const regionTiers = {};                 // region -> { role: count } (any-region contributors, by top role)
  const regionTiersPure = {};             // region -> { role: count } (pure-region contributors, by top role)
  for (const r of REGION_ROLES) { regional[r] = 0; regionalPure[r] = 0; regionTiers[r] = {}; regionTiersPure[r] = {}; }

  // paginate() retries 429/5xx/network and throws if it can't reach the end,
  // so we never publish a partial member scan.
  await paginate({
    url: after => `${DISCORD_API}/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
    token: BOT_TOKEN,
    limit: 1000,
    maxPages: 500,
    onBatch: batch => {
      for (const m of batch) {
        if (m.user.bot) continue;
        totalGuildMembers++;
        allMemberIds.push(m.user.id);
        // growth: bucket by join month
        if (m.joined_at) {
          const ym = m.joined_at.slice(0, 7); // YYYY-MM
          joinByMonth[ym] = (joinByMonth[ym] || 0) + 1;
        }
        const roleNames = m.roles.map(id => rolesMap.get(id)).filter(Boolean);
        if (roleNames.some(rn => STAFF_ROLES.has(rn))) staffIds.push(m.user.id);
        const special = SPECIAL_ROLES.find(rn => roleNames.includes(rn));
        if (special) specialRoles[m.user.id] = special;
        // regional: tally
        const memberRegions = roleNames.filter(rn => REGION_SET.has(rn));
        for (const rn of memberRegions) regional[rn]++;        // any
        if (memberRegions.length === 1) regionalPure[memberRegions[0]]++; // pure (single region)
        else if (memberRegions.length > 1) multiRegion++;

        const tracked = roleNames.filter(r => TRACKED_ROLES.includes(r));
        // top role = highest rank among tracked (may be null for badge-only / no-role members)
        let top = tracked[0] || null;
        for (const r of tracked) if (top && ROLE_RANK[r] > ROLE_RANK[top]) top = r;
        roleSnapshot[m.user.id] = top || NO_ROLE;
        // Contributor-only top: ignores Mage/Forerunner so a Mage+ritty member
        // is bucketed as 'ritty' (even though their displayed label stays 'Mage').
        const contributorTracked = roleNames.filter(r => CONTRIBUTOR_LADDER.has(r));
        let topContributor = contributorTracked[0] || null;
        for (const r of contributorTracked) if (topContributor && CONTRIBUTOR_RANK[r] > CONTRIBUTOR_RANK[topContributor]) topContributor = r;
        // Badge holders — recorded even if member has no contributor role.
        const memberBadges = roleNames.filter(rn => BADGE_ROLES.includes(rn));
        if (memberBadges.length) {
          // Fallback role for non-contributors (no tracked ladder role).
          const fallback = top ? null : (FALLBACK_ROLES.find(rn => roleNames.includes(rn)) || null);
          for (const b of memberBadges) {
            badgeHolders[b].push({
              userId: m.user.id,
              username: m.user.username,
              displayName: m.nick || m.user.global_name || m.user.username,
              avatarUrl: avatarProxy(m),
              joinedAt: m.joined_at || null,
              topRole: top,                       // full top (Mage/Forerunner allowed) — used for the displayed label
              contributorRole: topContributor,    // contributor-ladder top — used for filter bucketing
              fallbackRole: fallback,
            });
          }
        }
        // region × role bucket: members are slotted into their highest CONTRIBUTOR
        // ladder role; if they hold none, they fall into 'Other' (still labeled
        // by their actual top role like Mage/Forerunner elsewhere). This applies
        // to ALL regional members, not just contributor-role holders, so the
        // 'Other' column reflects the rest of the community accurately.
        const tierBucket = topContributor || 'Other';
        for (const rg of memberRegions) {
          regionTiers[rg][tierBucket] = (regionTiers[rg][tierBucket] || 0) + 1;
        }
        if (memberRegions.length === 1) {
          const rg = memberRegions[0];
          regionTiersPure[rg][tierBucket] = (regionTiersPure[rg][tierBucket] || 0) + 1;
        }
        // Member registry below is contributor-only (skip if no tracked role at all).
        if (!tracked.length) continue;
        members.push({
          userId: m.user.id,
          username: m.user.username,
          displayName: m.nick || m.user.global_name || m.user.username,
          topRole: top,            // for upgrade detection only
          contributorRole: topContributor,
          roles: tracked,          // ALL tracked roles this member has (counted independently)
          avatarUrl: avatarProxy(m),
          joinedAt: m.joined_at || null,
        });
      }
    },
  });
  return { members, allMemberIds, roleSnapshot, staffIds, specialRoles, badgeHolders, insights: { totalGuildMembers, joinByMonth, regional, regionalPure, multiRegion, regionTiers, regionTiersPure } };
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function logRole(role) {
  return role === NO_ROLE || role == null ? 'No Role' : String(role);
}

function upgradeKey(entry) {
  return `${entry.userId}:${logRole(entry.fromRole)}:${logRole(entry.toRole)}`;
}

function mergeUpgradeEntry(current, next) {
  return {
    ...current,
    username: next.username || current.username,
    displayName: next.displayName || current.displayName,
    avatarUrl: current.avatarUrl || next.avatarUrl || null,
    daysToPromo: current.daysToPromo ?? next.daysToPromo ?? null,
    at: Math.min(
      Number(current.at) || Number(next.at) || Date.now(),
      Number(next.at) || Number(current.at) || Date.now()
    ),
  };
}

function dedupeUpgradeLog(log) {
  const byKey = new Map();
  for (const raw of Array.isArray(log) ? log : []) {
    if (!raw || !raw.userId || !raw.toRole) continue;
    const entry = {
      ...raw,
      fromRole: logRole(raw.fromRole),
      toRole: logRole(raw.toRole),
    };
    const key = upgradeKey(entry);
    byKey.set(key, byKey.has(key) ? mergeUpgradeEntry(byKey.get(key), entry) : entry);
  }
  return Array.from(byKey.values()).sort((a, b) => (a.at || 0) - (b.at || 0));
}

function normalizeContributorFromRole(fromRole, toRole) {
  const from = logRole(fromRole);
  const to = logRole(toRole);
  if ((from === 'Zealot' || from === 'Mage') && to === 'Radiant Ritualist') return 'Ritualist';
  if ((from === 'Zealot' || from === 'Mage') && to === 'Ritualist') return 'ritty';
  return from;
}

async function uploadR2(key, obj) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(obj),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=300',
  }));
}

async function main() {
  const now = Date.now();
  console.log(`[${new Date().toISOString()}] Fetching role stats...`);

  const rolesMap = await getRolesMap();
  const { members, allMemberIds, roleSnapshot, staffIds, specialRoles, badgeHolders, insights } = await fetchAllMembers(rolesMap);
  console.log(`  ${members.length} ranked / ${insights.totalGuildMembers} total members / ${staffIds.length} staff`);

  // Dump current member-id set so fetch-activity can exclude kicked/left users
  // (their historical messages otherwise still count by author_id), plus the
  // staff-id set so mods/staff are excluded from leaderboards.
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'member-ids.json'), JSON.stringify(allMemberIds));
  fs.writeFileSync(path.join(DATA_DIR, 'staff-ids.json'), JSON.stringify(staffIds));
  fs.writeFileSync(path.join(DATA_DIR, 'special-roles.json'), JSON.stringify(specialRoles));

  // 1. Distribution
  //    - count    (all):  each member counted in EVERY tracked role they hold
  //                       (someone with Mage + Ritualist counts in both)
  //    - pureCount (top): each member counted ONCE at their highest tier
  //                       (a "pure bitty" = top role is bitty, nothing higher)
  const counts = {};
  const pureCounts = {};
  for (const r of TRACKED_ROLES) { counts[r] = 0; pureCounts[r] = 0; }
  for (const m of members) {
    for (const r of m.roles) counts[r]++;
    pureCounts[m.topRole]++;
  }
  const total = members.length;                         // unique members with >=1 tracked role
  const sumCounts = TRACKED_ROLES.reduce((s, r) => s + counts[r], 0);
  const sumPure   = TRACKED_ROLES.reduce((s, r) => s + pureCounts[r], 0); // == total
  const distribution = TRACKED_ROLES.map(role => ({
    role,
    count: counts[role],
    percent: sumCounts ? +((counts[role] / sumCounts) * 100).toFixed(2) : 0, // share of all role holdings
    pureCount: pureCounts[role],
    purePercent: sumPure ? +((pureCounts[role] / sumPure) * 100).toFixed(2) : 0, // share of members by top tier
    contributor: CONTRIBUTOR_LADDER.has(role),
  }));

  // 2. Detect upgrades vs previous snapshot
  const prevSnapshot = readJSON(SNAPSHOT_FILE, {});
  const isFirstRun = Object.keys(prevSnapshot).length === 0;
  let log = dedupeUpgradeLog(readJSON(LOG_FILE, []));
  const existingUpgrades = new Set(log.map(upgradeKey));

  for (const m of members) {
    const prev = prevSnapshot[m.userId];
    const currentRole = m.contributorRole || NO_ROLE;
    const previousRole = normalizeContributorFromRole(prev, currentRole);
    const isKnownNoRole = prev === NO_ROLE || prev === null;
    const isFirstTrackedRole = isKnownNoRole && currentRole !== NO_ROLE;
    const isUpgrade = prev && previousRole !== currentRole && ROLE_RANK[currentRole] > ROLE_RANK[previousRole];
    if (isFirstTrackedRole || isUpgrade) {
      const entry = {
        userId: m.userId,
        username: m.username,
        displayName: m.displayName,
        fromRole: isFirstTrackedRole ? 'No Role' : previousRole,
        toRole: currentRole,
        avatarUrl: m.avatarUrl,
        daysToPromo: m.joinedAt ? Math.max(0, Math.floor((now - Date.parse(m.joinedAt)) / 86400000)) : null,
        at: now,
      };
      const key = upgradeKey(entry);
      if (existingUpgrades.has(key)) continue;
      log.push(entry);
      existingUpgrades.add(key);
      console.log(`  ⬆ ${m.displayName}: ${isFirstTrackedRole ? 'No Role' : prev} → ${m.topRole}`);
    }
  }

  // 3. Prune log older than 14 days
  log = dedupeUpgradeLog(log).filter(e => now - e.at <= RETENTION_MS);

  // Persist state locally
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(SNAPSHOT_FILE)) {
    const snapshotDir = path.join(DATA_DIR, 'role-snapshots');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.mkdirSync(snapshotDir, { recursive: true });
    fs.copyFileSync(SNAPSHOT_FILE, path.join(snapshotDir, `role-snapshot.before-${stamp}.json`));
  }
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(roleSnapshot));
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

  // 4. Upload public outputs to R2
  const badges = BADGE_ROLES.map(name => ({ name, count: badgeHolders[name].length }));
  await uploadR2('community/role-stats.json', {
    updatedAt: now,
    totalMembers: total,
    distribution,
    badges,
  });
  // Per-badge holder roster — used by standalone /<badge> pages.
  for (const name of BADGE_ROLES) {
    const slug = name.toLowerCase().replace(/\s+/g, '-'); // 'Genesis 1000' -> 'genesis-1000'
    const holders = badgeHolders[name]
      .slice()
      .sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || ''));
    await uploadR2(`community/badge-${slug}.json`, {
      updatedAt: now,
      badge: name,
      count: holders.length,
      holders,
    });
    console.log(`  badge ${name}: ${holders.length} holders`);
  }
  await uploadR2('community/recent-upgrades.json', {
    updatedAt: now,
    windowDays: 14,
    upgrades: log.slice().sort((a, b) => b.at - a.at), // newest first
  });

  // 5. Insights — growth history + regional breakdown (over ALL members)
  const growth = Object.entries(insights.joinByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
  // running cumulative total
  let cum = 0;
  for (const g of growth) { cum += g.count; g.cumulative = cum; }
  const regional = Object.keys(insights.regional)
    .map(region => ({ region, count: insights.regionalPure[region], any: insights.regional[region] }))
    .filter(r => r.count > 0 || r.any > 0)
    .sort((a, b) => b.count - a.count);

  // Region × Role: per region, contributor breakdown by top tier (any-region members)
  const regionRoles = Object.keys(insights.regionTiers)
    .map(region => {
      const tiers = insights.regionTiers[region];
      // 'Other' bucket is non-contributor — exclude from the contributors total.
      const contributors = Object.entries(tiers).reduce((s, [k, n]) => k === 'Other' ? s : s + n, 0);
      const members = insights.regional[region] || 0; // any-region members (matches crosstab)
      return {
        region,
        members,                                   // any-region members
        contributors,                              // of those, how many hold a tracked role
        rate: members ? +((contributors / members) * 100).toFixed(2) : 0,
        tiers,                                     // { role: count }
      };
    })
    .filter(r => r.contributors > 0 || (r.tiers && r.tiers.Other > 0))
    .sort((a, b) => b.contributors - a.contributors);

  // Region × Role (Pure): per region, contributor breakdown by top tier (pure single-region members)
  const regionRolesPure = Object.keys(insights.regionTiersPure)
    .map(region => {
      const tiers = insights.regionTiersPure[region];
      // 'Other' bucket is non-contributor — exclude from the contributors total.
      const contributors = Object.entries(tiers).reduce((s, [k, n]) => k === 'Other' ? s : s + n, 0);
      const members = insights.regionalPure[region] || 0; // pure single-region members
      return {
        region,
        members,                                   // pure single-region members
        contributors,                              // of those, how many hold a tracked role
        rate: members ? +((contributors / members) * 100).toFixed(2) : 0,
        tiers,                                     // { role: count }
      };
    })
    .filter(r => r.contributors > 0 || (r.tiers && r.tiers.Other > 0))
    .sort((a, b) => b.contributors - a.contributors);

  await uploadR2('community/insights.json', {
    updatedAt: now,
    totalGuildMembers: insights.totalGuildMembers,
    multiRegion: insights.multiRegion,
    growth,
    regional, // count = pure (single-region), any = holds-this-region
    regionRoles,
    regionRolesPure,
  });

  console.log(`✅ Done. ${log.length} upgrades in last 14d${isFirstRun ? ' (first run — baseline snapshot saved, upgrades start tracking next run)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
