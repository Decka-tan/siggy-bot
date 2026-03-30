/**
 * SIMPLE FUN COMMANDS
 * /hug, /slap, /pat, /highfive, /coin (simple flip), /fact, /quote
 */

const { EmbedBuilder } = require('discord.js');

// Hug command - Anime hug GIFs (Giphy - verified working)
async function handleHug(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const hugGifs = [
    'https://media.giphy.com/media/lrr9rHuoJOE0w/giphy.gif',
    'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    'https://media.giphy.com/media/LMbo45iKzdPzM/giphy.gif',
    'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
    'https://media.giphy.com/media/1nlCS44h6LTLbhlgOS/giphy.gif',
    'https://media.giphy.com/media/3o6ZsYq7LqYOi8GiEU/giphy.gif',
    'https://media.giphy.com/media/11BudlGbe9JmW0/giphy.gif',
    'https://media.giphy.com/media/xUPGcC0R9Lh9VAQlop/giphy.gif',
    'https://media.giphy.com/media/Z5fZnS2YOnl6M/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
    'https://media.giphy.com/media/5ntQ5WPrJyhN7NrF2w/giphy.gif',
    'https://media.giphy.com/media/1nkn77t9i1XCRdBFjD/giphy.gif',
    'https://media.giphy.com/media/13YrHUvPfdfKNuFA1i/giphy.gif',
    'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    'https://media.giphy.com/media/xT8qB7Sd0B0Y8p0jIA/giphy.gif',
  ];

  const randomIndex = Math.floor(Math.random() * hugGifs.length);
  console.log(`[/hug] Selected GIF ${randomIndex + 1}/${hugGifs.length}: ${hugGifs[randomIndex]}`);

  const embed = new EmbedBuilder()
    .setColor(0xFF69B4)
    .setTitle(`🤗 ${interaction.user.username} hugs ${user.username}!`)
    .setImage(hugGifs[randomIndex])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Slap command - Anime slap GIFs (Giphy)
async function handleSlap(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const slapGifs = [
    'https://media.giphy.com/media/GfXA8VA10YFLy/giphy.gif',
    'https://media.giphy.com/media/XH1YqSiiEQKOc/giphy.gif',
    'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    'https://media.giphy.com/media/1fF2Z8uesXe7widrMH/giphy.gif',
    'https://media.giphy.com/media/nWFPZbAvBMSaI/giphy.gif',
    'https://media.giphy.com/media/7eRRq5VRr277jRwj1h/giphy.gif',
    'https://media.giphy.com/media/qCTuIrNjhfMYDkpXZR/giphy.gif',
    'https://media.giphy.com/media/3o85xIOu5FnuxAX8I8/giphy.gif',
    'https://media.giphy.com/media/1zCWTBDLcBHuR1NgQD/giphy.gif',
    'https://media.giphy.com/media/8v0Q9xTPkPcM/giphy.gif',
  ];

  const randomIndex = Math.floor(Math.random() * slapGifs.length);
  console.log(`[/slap] Selected GIF ${randomIndex + 1}/${slapGifs.length}: ${slapGifs[randomIndex]}`);

  const embed = new EmbedBuilder()
    .setColor(0xFF4444)
    .setTitle(`👋 ${interaction.user.username} slaps ${user.username}!`)
    .setImage(slapGifs[randomIndex])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Pat command - Anime head pat GIFs (Giphy)
async function handlePat(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const patGifs = [
    'https://media.giphy.com/media/tOg3YhmZS39KvhCpZk/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',
    'https://media.giphy.com/media/KFaTYtPWkey6W1uDiU/giphy.gif',
    'https://media.giphy.com/media/7BTMl6mGphYHYI1sVq/giphy.gif',
    'https://media.giphy.com/media/3o6ZsYq7LqYOi8GiEU/giphy.gif',
    'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    'https://media.giphy.com/media/xUPGcC0R9Lh9VAQlop/giphy.gif',
    'https://media.giphy.com/media/4GjoLWH2pO9kI/giphy.gif',
    'https://media.giphy.com/media/Z5fZnS2YOnl6M/giphy.gif',
    'https://media.giphy.com/media/11BudlGbe9JmW0/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
    'https://media.giphy.com/media/5ntQ5WPrJyhN7NrF2w/giphy.gif',
    'https://media.giphy.com/media/j2oXzVcL45NI4lKSBu/giphy.gif',
    'https://media.giphy.com/media/1nlCS44h6LTLbhlgOS/giphy.gif',
  ];

  const randomIndex = Math.floor(Math.random() * patGifs.length);
  console.log(`[/pat] Selected GIF ${randomIndex + 1}/${patGifs.length}: ${patGifs[randomIndex]}`);

  const embed = new EmbedBuilder()
    .setColor(0x87CEEB)
    .setTitle(`👋 ${interaction.user.username} pats ${user.username}!`)
    .setImage(patGifs[randomIndex])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// High five command - Anime high-five GIFs (Giphy)
async function handleHighfive(interaction) {
  const user = interaction.options.getUser('user') || interaction.user;
  const gifs = [
    'https://media.giphy.com/media/l0MYgbpvda5TJgvHuI/giphy.gif',
    'https://media.giphy.com/media/xUOxfoA5ffZ8xoVDCk/giphy.gif',
    'https://media.giphy.com/media/1nlCS44h6LTLbhlgOS/giphy.gif',
    'https://media.giphy.com/media/3o6ZsYq7LqYOi8GiEU/giphy.gif',
    'https://media.giphy.com/media/11BudlGbe9JmW0/giphy.gif',
    'https://media.giphy.com/media/Z5fZnS2YOnl6M/giphy.gif',
    'https://media.giphy.com/media/xUPGcC0R9Lh9VAQlop/giphy.gif',
    'https://media.giphy.com/media/4GjoLWH2pO9kI/giphy.gif',
    'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
    'https://media.giphy.com/media/5ntQ5WPrJyhN7NrF2w/giphy.gif',
  ];

  const randomIndex = Math.floor(Math.random() * gifs.length);
  console.log(`[/highfive] Selected GIF ${randomIndex + 1}/${gifs.length}: ${gifs[randomIndex]}`);

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`✋ ${interaction.user.username} high-fives ${user.username}!`)
    .setImage(gifs[randomIndex])
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Random fact - Dynamic Ritual Discord facts
const fs = require('fs');
const path = require('path');

function getDiscordData() {
  try {
    const dataPath = path.join(__dirname, '../../extracted-data/member-activity-analysis.json');
    if (!fs.existsSync(dataPath)) return null;

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return data;
  } catch (error) {
    console.error('Error loading Discord data:', error);
    return null;
  }
}

function generateDynamicFact() {
  const data = getDiscordData();
  if (!data || !data.members || data.members.length === 0) {
    // Fallback to generic facts
    const fallbackFacts = [
      'Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible.',
      'Octopuses have three hearts and blue blood.',
      'A group of flamingos is called a "flamboyance".',
      'Bananas are berries, but strawberries aren\'t.',
      'The shortest war in history lasted 38 to 45 minutes between Britain and Zanzibar in 1896.',
    ];
    return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
  }

  const members = data.members;
  const totalMembers = data.totalAnalyzed || members.length;

  // Calculate stats
  const topContributors = [...members].sort((a, b) => b.contributionsCount - a.contributionsCount).slice(0, 5);
  const topMessagers = [...members].sort((a, b) => b.globalMessages - a.globalMessages).slice(0, 5);
  const topEventParticipants = [...members].filter(m => m.eventsCount > 0).sort((a, b) => b.eventsCount - a.eventsCount).slice(0, 5);

  const totalMessages = members.reduce((sum, m) => sum + (m.globalMessages || 0), 0);
  const totalContributions = members.reduce((sum, m) => sum + (m.contributionsCount || 0), 0);
  const totalEvents = members.reduce((sum, m) => sum + (m.eventsCount || 0), 0);

  // Dynamic fact templates
  const factTemplates = [
    // Top contributors
    () => {
      const top = topContributors[Math.floor(Math.random() * Math.min(3, topContributors.length))];
      return `🏆 **Top Contributor:** @${top.username} with ${top.contributionsCount} contributions!`;
    },
    // Top messagers
    () => {
      const top = topMessagers[Math.floor(Math.random() * Math.min(3, topMessagers.length))];
      return `💬 **Most Active:** @${top.username} with ${top.globalMessages.toLocaleString()} messages!`;
    },
    // Event winners
    () => {
      if (topEventParticipants.length > 0) {
        const top = topEventParticipants[Math.floor(Math.random() * Math.min(3, topEventParticipants.length))];
        return `👑 **Event Champion:** @${top.username} with ${top.eventsCount} event wins!`;
      }
      return null;
    },
    // Community stats
    () => `📊 **Ritual Community:** ${totalMembers.toLocaleString()} active members!`,
    () => `💬 **Total Messages:** ${totalMessages.toLocaleString()} messages sent!`,
    () => `✨ **Total Contributions:** ${totalContributions.toLocaleString()} contributions made!`,
    () => `🎉 **Events Hosted:** ${totalEvents} events participated in!`,
    // Random member highlight
    () => {
      const randomMember = members[Math.floor(Math.random() * members.length)];
      return `⭐ **Member Spotlight:** @${randomMember.username} - ${randomMember.displayName}`;
    },
    // Shoutout to quiet achievers
    () => {
      const quiet = members.filter(m => m.contributionsCount > 10 && m.contributionsCount < 100);
      if (quiet.length > 0) {
        const member = quiet[Math.floor(Math.random() * quiet.length)];
        return `🌟 **Rising Star:** @${member.username} with ${member.contributionsCount} contributions!`;
      }
      return null;
    },
    // Message stats
    () => {
      const avgMessages = Math.round(totalMessages / totalMembers);
      return `📈 **Average Messages:** ${avgMessages} messages per member!`;
    },
  ];

  // Try templates until we get a valid fact
  let attempts = 0;
  while (attempts < 10) {
    const template = factTemplates[Math.floor(Math.random() * factTemplates.length)];
    const fact = template();
    if (fact) return fact;
    attempts++;
  }

  // Ultimate fallback
  return `🎮 **Ritual Community:** ${totalMembers.toLocaleString()} members strong!`;
}

async function handleFact(interaction) {
  const fact = generateDynamicFact();

  const embed = new EmbedBuilder()
    .setColor(0x00CED1)
    .setTitle('🧠 Ritual Fact')
    .setDescription(fact)
    .setFooter({ text: 'Did you know? • Data from Ritual Discord' })
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
