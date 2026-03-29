/**
 * SIMPLE FUN COMMANDS
 * /hug, /slap, /pat, /highfive, /coin (simple flip), /fact, /quote
 */

const { EmbedBuilder } = require('discord.js');

// Hug command
async function handleHug(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const hugGifs = [
    'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
    'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',
    'https://media.giphy.com/media/1nkn77t9i1XCRdBFjD/giphy.gif',
    'https://media.giphy.com/media/13YrHUvPfdfKNuFA1i/giphy.gif',
  ];

  const embed = new EmbedBuilder()
    .setColor(0xFF69B4)
    .setTitle(`🤗 ${interaction.user.username} hugs ${user.username}!`)
    .setImage(hugGifs[Math.floor(Math.random() * hugGifs.length)])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Slap command
async function handleSlap(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const slapGifs = [
    'https://media.giphy.com/media/GfXA8VA10YFLy/giphy.gif',
    'https://media.giphy.com/media/8v0Q9xTPkPcM/giphy.gif',
    'https://media.giphy.com/media/XH1YqSiiEQKOc/giphy.gif',
  ];

  const embed = new EmbedBuilder()
    .setColor(0xFF4444)
    .setTitle(`👋 ${interaction.user.username} slaps ${user.username}!`)
    .setImage(slapGifs[Math.floor(Math.random() * slapGifs.length)])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Pat command
async function handlePat(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const patGifs = [
    'https://media.giphy.com/media/tOg3YhmZS39KvhCpZk/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',
  ];

  const embed = new EmbedBuilder()
    .setColor(0x87CEEB)
    .setTitle(`👋 ${interaction.user.username} pats ${user.username}!`)
    .setImage(patGifs[Math.floor(Math.random() * patGifs.length)])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// High five command
async function handleHighfive(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const gifs = [
    'https://media.giphy.com/media/l0MYgbpvda5TJgvHuI/giphy.gif',
    'https://media.giphy.com/media/xUOxfoA5ffZ8xoVDCk/giphy.gif',
  ];

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`✋ ${interaction.user.username} high-fives ${user.username}!`)
    .setImage(gifs[Math.floor(Math.random() * gifs.length)])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Random fact
const facts = [
  'Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible.',
  'Octopuses have three hearts and blue blood.',
  'A group of flamingos is called a "flamboyance".',
  'Bananas are berries, but strawberries aren\'t.',
  'The shortest war in history lasted 38 to 45 minutes between Britain and Zanzibar in 1896.',
  'A day on Venus is longer than a year on Venus.',
  'Cows have best friends and get stressed when separated.',
  'The inventor of the Pringles can is buried in one.',
  'There are more stars in the universe than grains of sand on Earth.',
  'The Hawaiian alphabet has only 12 letters.',
];

async function handleFact(interaction) {
  const fact = facts[Math.floor(Math.random() * facts.length)];

  const embed = new EmbedBuilder()
    .setColor(0x00CED1)
    .setTitle('🧠 Random Fact')
    .setDescription(fact)
    .setFooter({ text: 'Did you know?' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Random quote
const quotes = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
  { text: 'Do not watch the clock. Do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
];

async function handleQuote(interaction) {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const embed = new EmbedBuilder()
    .setColor(0x9370DB)
    .setTitle('💬 Random Quote')
    .setDescription(`*"${quote.text}"*`)
    .setFooter({ text: `— ${quote.author}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Simple shuffling
async function handleShuffle(interaction) {
  const items = interaction.options.getString('items');

  if (!items || !items.includes(',')) {
    return interaction.reply({
      content: '❌ Use format: /shuffle item1, item2, item3\nExample: /shuffle pizza, burger, sushi, pasta',
      ephemeral: true
    });
  }

  const list = items.split(',').map(s => s.trim()).filter(s => s);
  if (list.length < 2) {
    return interaction.reply({ content: '❌ Need at least 2 items!', ephemeral: true });
  }

  // Fisher-Yates shuffle
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle('🔀 Shuffled List')
    .setDescription(shuffled.map((item, i) => `${i + 1}. **${item}**`).join('\n'))
    .setFooter({ text: `${list.length} items shuffled` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Rate command (rate anything 1-10)
async function handleRate(interaction) {
  const target = interaction.options.getString('target') || 'you';
  const rating = (Math.random() * 10).toFixed(1);

  let emoji = '💩';
  if (rating >= 9) emoji = '🌟';
  else if (rating >= 7) emoji = '👍';
  else if (rating >= 5) emoji = '😐';
  else if (rating >= 3) emoji = '👎';

  const embed = new EmbedBuilder()
    .setColor(rating >= 5 ? 0x00FF00 : 0xFF0000)
    .setTitle(`⭐ Rating: ${rating}/10`)
    .setDescription(`I rate **${target}** ${emoji} **${rating}/10**`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// How gay command (meme command popular in some servers)
async function handleHowGay(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const percentage = Math.floor(Math.random() * 101);

  let level = 'Barely gay at all 😐';
  if (percentage >= 80) level = 'SUPER GAY 🌈';
  else if (percentage >= 60) level = 'Pretty gay 😏';
  else if (percentage >= 40) level = 'A little gay 🤷';
  else if (percentage >= 20) level = 'Straight-ish 😌';

  const embed = new EmbedBuilder()
    .setColor(0xFF69B4)
    .setTitle(`🏳 How Gay is ${user.username}?`)
    .setDescription(`**${user.username}** is **${percentage}%** gay!\n\n${level}`)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .setFooter({ text: 'Just for fun! 💖' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Simp rate
async function handleSimp(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const percentage = Math.floor(Math.random() * 101);

  let level = 'Not a simp';
  if (percentage >= 80) level = 'MEGA SIMP 🙇';
  else if (percentage >= 60) level = 'Certified Simp �';
  else if (percentage >= 40) level = 'Kinda Simp 😅';
  else if (percentage >= 20) level = 'Simp tendencies';

  const embed = new EmbedBuilder()
    .setColor(0xFFB6C1)
    .setTitle(`💕 Simp Rate: ${user.username}`)
    .setDescription(`**${user.username}** is **${percentage}%** simp!\n\n*${level}*`)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = {
  handleHug,
  handleSlap,
  handlePat,
  handleHighfive,
  handleFact,
  handleQuote,
  handleShuffle,
  handleRate,
  handleHowGay,
  handleSimp,
};
