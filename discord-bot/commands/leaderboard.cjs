/**
 * LEADERBOARD COMMANDS
 * Rolling auto-expiring single session leaderboard
 */

const {
  startSession,
  addScore,
  endSession,
  getActiveLeaderboard
} = require('../utils/leaderboard-db.cjs');
const { EmbedBuilder } = require('discord.js');

/**
 * Renders the active leaderboard into an Embed
 */
function renderLeaderboardEmbed(guildId) {
  const data = getActiveLeaderboard(guildId);

  if (!data || data.participants.length === 0) {
    return new EmbedBuilder()
      .setTitle('🏆 LEADERBOARD')
      .setDescription('No active participants yet.')
      .setColor('#FFD700');
  }

  const medalEmojis = ['🥇', '🥈', '🥉'];
  let leaderboardText = '';

  data.participants.forEach((p, index) => {
    const medal = index < 3 ? medalEmojis[index] : `**${p.rank}.**`;
    leaderboardText += `${medal} ${p.name} - ${p.score.toLocaleString()} pts\n`;
  });

  const createdAgo = Math.floor(data.createdAt / 1000);

  return new EmbedBuilder()
    .setTitle('🏆 LEADERBOARD')
    .setDescription(leaderboardText)
    .addFields(
      { name: '👥 Participants', value: `${data.totalParticipants}`, inline: true },
      { name: '📅 Created', value: `<t:${createdAgo}:R>`, inline: true }
    )
    .setColor('#FFD700')
    .setFooter({ text: 'Session automatically closes after 1 hour of inactivity' })
    .setTimestamp();
}

/**
 * /leaderboard start handler
 */
async function handleLeaderboardStart(interaction) {
  const user = interaction.options.getUser('user');
  const score = interaction.options.getInteger('score');
  const guildId = interaction.guildId || 'global';

  // Start the session, ignoring/overwriting previous ones
  const result = startSession(guildId, interaction.user.id, user.id, user.username, score);

  await interaction.reply({
    content: result.message
  });

  // Follow-up with the formatted auto-leaderboard
  const embed = renderLeaderboardEmbed(guildId);
  await interaction.followUp({ embeds: [embed] });
}

/**
 * /leaderboard add handler
 */
async function handleLeaderboardAdd(interaction) {
  const user = interaction.options.getUser('user');
  const score = interaction.options.getInteger('score');
  const guildId = interaction.guildId || 'global';

  const result = addScore(guildId, user.id, user.username, score);

  if (!result.success) {
    // Fails if no active session
    return interaction.reply({
      content: result.message,
      ephemeral: true
    });
  }

  // If successful, send the confirmation and the updated leaderboard
  await interaction.reply({
    content: result.message
  });

  const embed = renderLeaderboardEmbed(guildId);
  await interaction.followUp({ embeds: [embed] });
}

/**
 * /leaderboard end handler
 */
async function handleLeaderboardEnd(interaction) {
  const guildId = interaction.guildId || 'global';
  
  // Snap it before we delete it so we can show final results
  const finalEmbed = renderLeaderboardEmbed(guildId);
  const result = endSession(guildId);

  if (!result.success) {
    return interaction.reply({
      content: result.message,
      ephemeral: true
    });
  }

  finalEmbed.setTitle('🛑 FINAL LEADERBOARD 🛑')
            .setFooter({ text: 'Session has been manually closed.' });

  await interaction.reply({
    content: result.message,
    embeds: [finalEmbed]
  });
}

module.exports = {
  handleLeaderboardStart,
  handleLeaderboardAdd,
  handleLeaderboardEnd,
};
