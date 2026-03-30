/**
 * UTILITY COMMANDS
 * /roll, /flip, /avatar, /choose
 */

const { EmbedBuilder } = require('discord.js');

// Coin flip
async function handleFlip(interaction) {
  const amount = interaction.options.getInteger('amount') || 1;
  const choice = interaction.options.getString('choice')?.toLowerCase();

  const isHeads = Math.random() < 0.5;
  const result = isHeads ? 'Heads' : 'Tails';
  const emoji = isHeads ? '🪙' : '🦅';

  let won = false;
  if (choice) {
    won = (choice === 'heads' && isHeads) || (choice === 'tails' && !isHeads);
  }

  const embed = new EmbedBuilder()
    .setColor(isHeads ? 0xFFD700 : 0x4A5568)
    .setTitle(`${emoji} Coin Flip`)
    .setDescription(`**Result:** ${result}${choice ? `\n**You chose:** ${choice}\n**${won ? '🎉 You won!' : '😢 You lost!'}**` : ''}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Dice roll
async function handleRoll(interaction) {
  const sides = interaction.options.getInteger('sides') || 6;
  const count = interaction.options.getInteger('count') || 1;

  if (count < 1 || count > 10) {
    return interaction.reply({ content: '❌ Count must be between 1 and 10', ephemeral: true });
  }
  if (sides < 2 || sides > 100) {
    return interaction.reply({ content: '❌ Sides must be between 2 and 100', ephemeral: true });
  }

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = rolls.reduce((a, b) => a + b, 0);
  const emoji = count === 1 ? '🎲' : '🎲';

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`${emoji} Dice Roll${count > 1 ? 's' : ''}`)
    .setDescription(count === 1
      ? `**You rolled:** ${rolls[0]}`
      : `**Rolls:** ${rolls.join(', ')}\n**Total:** ${total}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Get avatar
async function handleAvatar(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const member = await interaction.guild.members.fetch(user.id);

  const embed = new EmbedBuilder()
    .setColor(0x00BFFF)
    .setTitle(`${user.username}'s Avatar`)
    .setDescription(`[Download](${user.displayAvatarURL({ size: 4096 })})`)
    .setImage(user.displayAvatarURL({ size: 4096, dynamic: true }))
    .setFooter({ text: member.nickname ? `Nickname: ${member.nickname}` : null })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Choose random option
async function handleChoose(interaction) {
  const options = interaction.options.getString('options');

  if (!options || !options.includes('|')) {
    return interaction.reply({ content: '❌ Use format: /choose option1 | option2 | option3', ephemeral: true });
  }

  const choices = options.split('|').map(s => s.trim()).filter(s => s);
  if (choices.length < 2) {
    return interaction.reply({ content: '❌ You need at least 2 options!', ephemeral: true });
  }

  const winner = choices[Math.floor(Math.random() * choices.length)];

  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle('🎯 Random Choice')
    .addFields(
      { name: 'Options', value: choices.map((c, i) => `${i + 1}. ${c}`).join('\n') },
      { name: '🎲 Winner', value: `**${winner}**` }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = {
  handleFlip,
  handleRoll,
  handleAvatar,
  handleChoose,
};
