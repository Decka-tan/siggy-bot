/**
 * UTILITY COMMANDS
 * /convert, /roll, /flip, /8ball, /avatar
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

// Magic 8-ball
const EIGHT_BALL_RESPONSES = [
  { text: 'It is certain', emoji: '✨' },
  { text: 'It is decidedly so', emoji: '💫' },
  { text: 'Without a doubt', emoji: '🌟' },
  { text: 'Yes definitely', emoji: '⭐' },
  { text: 'You may rely on it', emoji: '🔮' },
  { text: 'As I see it, yes', emoji: '👁️' },
  { text: 'Most likely', emoji: '🎯' },
  { text: 'Outlook good', emoji: '😊' },
  { text: 'Yes', emoji: '👍' },
  { text: 'Signs point to yes', emoji: '📍' },
  { text: 'Reply hazy, try again', emoji: '🌫️' },
  { text: 'Ask again later', emoji: '⏰' },
  { text: 'Better not tell you now', emoji: '🤫' },
  { text: 'Cannot predict now', emoji: '❓' },
  { text: 'Concentrate and ask again', emoji: '🧠' },
  { text: "Don't count on it", emoji: '❌' },
  { text: 'My reply is no', emoji: '🚫' },
  { text: 'My sources say no', emoji: '📚' },
  { text: 'Outlook not so good', emoji: '😕' },
  { text: 'Very doubtful', emoji: '🤷' },
];

async function handle8Ball(interaction) {
  const question = interaction.options.getString('question');

  if (!question) {
    return interaction.reply({ content: '❌ You need to ask a question!', ephemeral: true });
  }

  const response = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)];

  const embed = new EmbedBuilder()
    .setColor(0x9333EA)
    .setTitle('🎱 Magic 8-Ball')
    .addFields(
      { name: 'Question', value: question },
      { name: 'Answer', value: `${response.emoji} ${response.text}` }
    )
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

// Crypto converter
async function handleConvert(interaction) {
  const amount = interaction.options.getNumber('amount');
  const from = interaction.options.getString('from').toLowerCase();
  const to = interaction.options.getString('to').toLowerCase();

  await interaction.deferReply();

  try {
    // Coin symbol mapping
    const symbolMap = {
      btc: 'BTC', eth: 'ETH', sol: 'SOL', bnb: 'BNB', xrp: 'XRP',
      ada: 'ADA', doge: 'DOGE', dot: 'DOT', matic: 'MATIC', shib: 'SHIB',
      link: 'LINK', avax: 'AVAX', near: 'NEAR', op: 'OP', arb: 'ARB',
      apt: 'APT', sui: 'SUI', pepe: 'PEPE', bonk: 'BONK', usdt: 'USDT',
      usd: 'USDT', idr: 'BIDR', eur: 'EUR', gbp: 'GBP'
    };

    const fromSymbol = symbolMap[from] || from.toUpperCase();
    const toSymbol = symbolMap[to] || to.toUpperCase();

    // Check if both are fiat (simple conversion)
    const fiatRates = { usd: 1, idr: 15600, eur: 0.92, gbp: 0.79 };

    if (fiatRates[from] && fiatRates[to]) {
      const result = (amount * fiatRates[to] / fiatRates[from]).toFixed(2);
      const embed = new EmbedBuilder()
        .setColor(0x00D26A)
        .setTitle('💱 Currency Converter')
        .setDescription(`**${amount} ${from.toUpperCase()} = ${result} ${to.toUpperCase()}**`)
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // Fetch price from Binance
    const binanceFrom = fromSymbol + 'USDT';
    const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceFrom}`);
    if (!priceResponse.ok) throw new Error('Could not fetch price');

    const priceData = await priceResponse.json();
    const priceInUsd = parseFloat(priceData.price);

    const usdAmount = amount * priceInUsd;
    let finalAmount;

    if (to === 'usd' || to === 'usdt') {
      finalAmount = usdAmount;
    } else if (to === 'idr') {
      finalAmount = usdAmount * 15600;
    } else if (to === 'eur') {
      finalAmount = usdAmount * 0.92;
    } else if (to === 'gbp') {
      finalAmount = usdAmount * 0.79;
    } else {
      // Converting to another crypto
      const binanceTo = toSymbol + 'USDT';
      const toPriceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceTo}`);
      if (!toPriceResponse.ok) throw new Error('Could not fetch target price');

      const toPriceData = await toPriceResponse.json();
      finalAmount = usdAmount / parseFloat(toPriceData.price);
    }

    // Format result
    const formatResult = (val, coin) => {
      if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (val >= 1) return val.toFixed(4);
      return val.toFixed(8);
    };

    const embed = new EmbedBuilder()
      .setColor(0x00D26A)
      .setTitle('💱 Crypto Converter')
      .setDescription(`**${formatResult(amount, from)} ${fromSymbol} = ${formatResult(finalAmount, to)} ${toSymbol}**`)
      .addFields(
        { name: 'Price (1 ' + fromSymbol + ')', value: `$${priceInUsd.toLocaleString()}`, inline: true },
        { name: 'Rate Used', value: `1 ${fromSymbol} = ${(priceInUsd / (fiatRates[to] || 1)).toFixed(4)} ${toSymbol}`, inline: true }
      )
      .setFooter({ text: 'Data from Binance' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Convert error:', error);
    await interaction.editReply(`❌ Error: ${error.message}\n\nTry: /convert 1 btc to usd`);
  }
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
  handle8Ball,
  handleAvatar,
  handleConvert,
  handleChoose,
};
