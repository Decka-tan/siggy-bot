/**
 * LEADERBOARD COMMANDS
 * Custom leaderboard system for tournaments, competitions, etc.
 */

const {
  createLeaderboard,
  addParticipant,
  removeParticipant,
  getLeaderboard,
  listLeaderboards,
  deleteLeaderboard,
  findLeaderboard
} = require('../utils/leaderboard-db.cjs');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

/**
 * /leaderboard create handler
 */
async function handleLeaderboardCreate(interaction) {
  const name = interaction.options.getString('name');

  if (name.length < 3 || name.length > 50) {
    await interaction.reply({
      content: '❌ Name must be between 3-50 characters!',
      ephemeral: true
    });
    return;
  }

  const result = createLeaderboard(name, interaction.user.id);

  await interaction.reply({
    content: result.message,
    ephemeral: !result.success
  });
}

/**
 * /leaderboard add handler
 */
async function handleLeaderboardAdd(interaction) {
  const event = interaction.options.getString('event');
  const user = interaction.options.getUser('user');
  const score = interaction.options.getInteger('score');

  const eventId = findLeaderboard(event);
  if (!eventId) {
    await interaction.reply({
      content: `❌ Leaderboard "${event}" not found. Use /leaderboard list to see available leaderboards.`,
      ephemeral: true
    });
    return;
  }

  const result = addParticipant(eventId, user.id, user.username, score);

  await interaction.reply({
    content: result.message,
    ephemeral: !result.success
  });
}

/**
 * /leaderboard update handler (alias for add)
 */
async function handleLeaderboardUpdate(interaction) {
  const event = interaction.options.getString('event');
  const user = interaction.options.getUser('user');
  const score = interaction.options.getInteger('score');

  const eventId = findLeaderboard(event);
  if (!eventId) {
    await interaction.reply({
      content: `❌ Leaderboard "${event}" not found. Use /leaderboard list to see available leaderboards.`,
      ephemeral: true
    });
    return;
  }

  const result = addParticipant(eventId, user.id, user.username, score);

  await interaction.reply({
    content: result.message,
    ephemeral: !result.success
  });
}

/**
 * /leaderboard remove handler
 */
async function handleLeaderboardRemove(interaction) {
  const event = interaction.options.getString('event');
  const user = interaction.options.getUser('user');

  const eventId = findLeaderboard(event);
  if (!eventId) {
    await interaction.reply({
      content: `❌ Leaderboard "${event}" not found.`,
      ephemeral: true
    });
    return;
  }

  const result = removeParticipant(eventId, user.id);

  await interaction.reply({
    content: result.message,
    ephemeral: !result.success
  });
}

/**
 * /leaderboard show handler
 */
async function handleLeaderboardShow(interaction) {
  const event = interaction.options.getString('event');

  const eventId = findLeaderboard(event);
  if (!eventId) {
    await interaction.reply({
      content: `❌ Leaderboard "${event}" not found. Use /leaderboard list to see available leaderboards.`,
      ephemeral: true
    });
    return;
  }

  const data = getLeaderboard(eventId);

  if (!data || data.participants.length === 0) {
    await interaction.reply({
      content: `📊 **${data?.name || event}**\n\nNo participants yet. Use /leaderboard add to add some!`,
      ephemeral: false
    });
    return;
  }

  // Build leaderboard display
  const medalEmojis = ['🥇', '🥈', '🥉'];

  let leaderboardText = '';

  // Top 3 with medals
  for (let i = 0; i < Math.min(3, data.participants.length); i++) {
    const p = data.participants[i];
    leaderboardText += `${medalEmojis[i]} **${p.name}** - ${p.score.toLocaleString()} pts\n`;
  }

  // Rest without medals
  if (data.participants.length > 3) {
    for (let i = 3; i < data.participants.length; i++) {
      const p = data.participants[i];
      leaderboardText += `**${p.rank}.** ${p.name} - ${p.score.toLocaleString()} pts\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${data.name}`)
    .setDescription(leaderboardText)
    .addFields(
      { name: '👥 Participants', value: `${data.totalParticipants}`, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(new Date(data.createdAt).getTime() / 1000)}:R>`, inline: true }
    )
    .setColor('#FFD700')
    .setFooter({ text: `ID: ${eventId}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * /leaderboard list handler
 */
async function handleLeaderboardList(interaction) {
  const leaderboards = listLeaderboards();

  if (leaderboards.length === 0) {
    await interaction.reply({
      content: '❌ No leaderboards found. Use /leaderboard create to create one!',
      ephemeral: false
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Available Leaderboards')
    .setDescription(leaderboards.map((lb, i) => {
      const createdAgo = Math.floor((Date.now() - new Date(lb.createdAt).getTime()) / 1000);
      return `**${i + 1}. ${lb.name}**\n   ID: \`${lb.eventId}\`\n   👥 ${lb.participantCount} participants\n   📅 Created <t:${createdAgo}:R>`;
    }).join('\n\n'))
    .setColor('#00BFFF')
    .setFooter({ text: `Total: ${leaderboards.length} leaderboards` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * /leaderboard delete handler
 */
async function handleLeaderboardDelete(interaction) {
  const event = interaction.options.getString('event');

  const eventId = findLeaderboard(event);
  if (!eventId) {
    await interaction.reply({
      content: `❌ Leaderboard "${event}" not found.`,
      ephemeral: true
    });
    return;
  }

  const result = deleteLeaderboard(eventId, interaction.user.id);

  await interaction.reply({
    content: result.message,
    ephemeral: !result.success
  });
}

module.exports = {
  handleLeaderboardCreate,
  handleLeaderboardAdd,
  handleLeaderboardUpdate,
  handleLeaderboardRemove,
  handleLeaderboardShow,
  handleLeaderboardList,
  handleLeaderboardDelete
};
