/**
 * RANK COMMAND
 * Shows user rank based on message count from extracted data
 */

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load message stats from extracted data
function getMessageStats() {
  try {
    const statsPath = path.join(__dirname, '../../extracted-data/member-activity-analysis.json');
    if (!fs.existsSync(statsPath)) return null;

    const data = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    // Convert to array and sort by message count
    const members = Object.entries(data)
      .map(([userId, member]: any) => ({
        userId,
        username: member.username,
        displayName: member.displayName,
        messageCount: member.globalMessages || 0,
        contributions: member.contributionsCount || 0,
        roles: member.roles || [],
      }))
      .sort((a, b) => b.messageCount - a.messageCount);

    return members;
  } catch (error) {
    console.error('Error loading message stats:', error);
    return null;
  }
}

// Calculate level based on message count
function getLevel(messageCount) {
  if (messageCount >= 10000) return { level: 100, name: '💎 Diamond Guardian', color: 0x00BFFF };
  if (messageCount >= 5000) return { level: 75, name: '🌟 Celestial Voyager', color: 0xFFD700 };
  if (messageCount >= 2500) return { level: 50, name: '🔮 Mystic Adept', color: 0x9B59B6 };
  if (messageCount >= 1000) return { level: 30, name: '⚡ Storm Rider', color: 0x3498db };
  if (messageCount >= 500) return { level: 20, name: '🌙 Night Walker', color: 0x2C3E50 };
  if (messageCount >= 250) return { level: 15, name: '🌿 Forest Sage', color: 0x27AE60 };
  if (messageCount >= 100) return { level: 10, name: '🔥 Ember Keeper', color: 0xE67E22 };
  if (messageCount >= 50) return { level: 5, name: '💧 Spring Seeker', color: 0x5DADE2 };
  if (messageCount >= 25) return { level: 3, name: '🌱 Dawn Initiate', color: 0x82E0AA };
  if (messageCount >= 10) return { level: 2, name: '🌿 Seedling', color: 0xA9DFBF };
  return { level: 1, name: '🍃 Newcomer', color: 0xABEBC6 };
}

// Calculate XP to next level
function getXPForLevel(level) {
  return Math.floor(50 * Math.pow(1.2, level - 1));
}

async function handleRank(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;

  await interaction.deferReply();

  const members = getMessageStats();

  if (!members) {
    return interaction.editReply('❌ Member data not available. Please ensure data extraction is complete.');
  }

  // Find the target user in the data
  const memberData = members.find(m => m.userId === targetUser.id);

  if (!memberData) {
    return interaction.editReply(`❌ User ${targetUser.username} not found in member data.`);
  }

  // Find rank (position in sorted array)
  const rank = members.findIndex(m => m.userId === targetUser.id) + 1;

  // Calculate level and XP
  const levelInfo = getLevel(memberData.messageCount);
  const xpForCurrent = getXPForLevel(levelInfo.level);
  const xpForNext = getXPForLevel(levelInfo.level + 1);
  const xpProgress = memberData.messageCount - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;
  const xpPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

  // Create progress bar
  const progressBar = '█'.repeat(Math.floor(xpPercent / 10)) + '░'.repeat(10 - Math.floor(xpPercent / 10));

  // Get top 3 for comparison
  const topMembers = members.slice(0, 3);

  const embed = new EmbedBuilder()
    .setColor(levelInfo.color)
    .setTitle(`📊 ${memberData.displayName || memberData.username}'s Rank`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .addFields(
      {
        name: '🏆 Server Rank',
        value: `#${rank} / ${members.length}`,
        inline: true,
      },
      {
        name: '⭐ Level',
        value: `${levelInfo.level} - ${levelInfo.name}`,
        inline: true,
      },
      {
        name: '💬 Messages',
        value: memberData.messageCount.toLocaleString(),
        inline: true,
      },
      {
        name: '🎯 Contributions',
        value: memberData.contributions.toLocaleString(),
        inline: true,
      },
      {
        name: '✨ XP Progress',
        value: `${progressBar} ${xpPercent.toFixed(0)}%\n${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP to next level`,
        inline: false,
      },
    );

  // Show top 3 if user is in top 10
  if (rank <= 10) {
    embed.addFields({
      name: '👑 Top 3',
      value: topMembers.map((m, i) => `${i + 1}. **${m.displayName || m.username}** - ${m.messageCount.toLocaleString()} msgs`).join('\n'),
      inline: false,
    });
  }

  embed.setFooter({ text: 'Data from Ritual community • Updated periodically' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleRank };
