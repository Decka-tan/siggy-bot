/**
 * UTILITY COMMANDS
 * /roll, /flip, /avatar, /choose
 */

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateDiceImage } = require('../utils/dice-generator.cjs');

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

// Dice roll - d6 only, 1-6 dice with rolling animation
async function handleRoll(interaction, { saveCommand = true } = {}) {
  console.log('[Roll] Starting roll command...');
  try {
    const count = interaction.options.getInteger('count') || 1;
    console.log('[Roll] Count:', count);

    if (count < 1 || count > 6) {
      return interaction.reply({ content: '❌ Count must be between 1 and 6', ephemeral: true });
    }

    // Save command for reload (wrap in try-catch)
    if (saveCommand) {
      try {
        const { setLastCommand } = require('../vps-server.cjs');
        setLastCommand(interaction.user.id, 'roll', { count });
      } catch (e) {
        console.error('[Roll] Failed to save command:', e);
      }
    }

    console.log('[Roll] Calling deferReply...');
    await interaction.deferReply();
    console.log('[Roll] deferReply successful');

    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const rollEmojis = ['🎲', '🎲', '🎲', '🎲', '🎲', '🎲'];

    // Rolling animation - show random dice 3 times before final result
    for (let i = 0; i < 3; i++) {
      const tempRolls = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
      const tempVisual = tempRolls.map(() => rollEmojis[Math.floor(Math.random() * 6)]).join(' ');

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`🎲 Rolling...${'.'.repeat(i + 1)}`)
        .setDescription(tempVisual)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      await new Promise(resolve => setTimeout(resolve, 400)); // 400ms delay
    }

    // Final result
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }

    const total = rolls.reduce((a, b) => a + b, 0);

    // Color based on result
    let color = 0x9B59B6; // default purple
    if (count === 1) {
      if (rolls[0] === 6) color = 0xFFD700; // gold for max
      else if (rolls[0] === 1) color = 0xFF4444; // red for min
    } else {
      if (total === count * 6) color = 0xFFD700; // all max
      else if (total === count) color = 0xFF4444; // all min
      else if (total >= count * 4) color = 0x00FF00; // green for good rolls
    }

    // Generate dice image
    const diceImageBuffer = await generateDiceImage(rolls);
    const attachment = new AttachmentBuilder(diceImageBuffer, { name: 'dice.png' });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎲 Dice Roll${count > 1 ? 's' : ''} ${getRollReaction(rolls, count)}`)
      .setImage('attachment://dice.png')
      .setTimestamp();

    console.log('[Roll] Sending final result...');
    await interaction.editReply({ embeds: [embed], files: [attachment] });
    console.log('[Roll] Complete');
  } catch (error) {
    console.error('[Roll] Error:', error);
    // Try to reply or editReply depending on state
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ Error: ${error.message}`, components: [] });
      } else {
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
      }
    } catch (e) {
      console.error('[Roll] Failed to send error message:', e);
    }
  }
}

function getRollReaction(rolls, count) {
  const total = rolls.reduce((a, b) => a + b, 0);
  const maxPossible = count * 6;

  if (total === maxPossible) return ' 🎉✨ MAX!'; // all sixes
  if (total === count) return ' 💀 OOF...'; // all ones
  if (total >= maxPossible * 0.8) return ' 🔥 HOT!'; // 80%+ of max
  if (total <= maxPossible * 0.3) return ' 😅 Yikes...'; // 30% or less
  if (count === 1 && rolls[0] === 6) return ' 💫 PERFECT!';
  if (count === 1 && rolls[0] === 1) return ' 😬 Oof!';
  return '';
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

  if (!options || !options.includes(',')) {
    return interaction.reply({ content: '❌ Use format: /choose option1, option2, option3', ephemeral: true });
  }

  const choices = options.split(',').map(s => s.trim()).filter(s => s);
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
