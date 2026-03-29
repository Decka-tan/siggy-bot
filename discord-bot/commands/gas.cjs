/**
 * GAS TRACKER COMMAND
 * Shows Ethereum gas fees
 */

const { EmbedBuilder } = require('discord.js');

async function handleGas(interaction) {
  await interaction.deferReply();

  try {
    // Fetch from Etherscan gas tracker API (free, no API key needed for basic)
    const response = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');

    if (!response.ok) {
      throw new Error('Failed to fetch gas data');
    }

    const data = await response.json();

    if (data.status !== '1') {
      throw new Error('Invalid gas data response');
    }

    const result = data.result;
    const gasPrices = {
      slow: Math.round(parseFloat(result.SafeGasPrice)),
      average: Math.round(parseFloat(result.ProposeGasPrice)),
      fast: Math.round(parseFloat(result.FastGasPrice)),
    };

    // Calculate estimated costs for a standard ETH transfer (21000 gas)
    const gasLimit = 21000;
    const ethPriceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
    const ethPriceData = await ethPriceResponse.json();
    const ethPrice = parseFloat(ethPriceData.price);

    const calcCost = (gwei) => {
      const gasCostGwei = gwei * gasLimit;
      const gasCostEth = gasCostGwei / 1e9;
      const gasCostUsd = gasCostEth * ethPrice;
      return { gwei: gasCostGwei / 1e9, eth: gasCostEth, usd: gasCostUsd };
    };

    const slowCost = calcCost(gasPrices.slow);
    const avgCost = calcCost(gasPrices.average);
    const fastCost = calcCost(gasPrices.fast);

    const embed = new EmbedBuilder()
      .setColor(0x627EEA)
      .setTitle('⛽ Ethereum Gas Fees')
      .setDescription(`Current gas prices on the network`)
      .addFields(
        {
          name: '🐢 Slow',
          value: `${gasPrices.slow} Gwei\n≈ $${slowCost.usd.toFixed(2)} for transfer`,
          inline: true,
        },
        {
          name: '⚡ Average',
          value: `${gasPrices.average} Gwei\n≈ $${avgCost.usd.toFixed(2)} for transfer`,
          inline: true,
        },
        {
          name: '🚀 Fast',
          value: `${gasPrices.fast} Gwei\n≈ $${fastCost.usd.toFixed(2)} for transfer`,
          inline: true,
        },
      )
      .addFields({
        name: '💰 ETH Price',
        value: `$${ethPrice.toLocaleString()}`,
        inline: false,
      })
      .setFooter({ text: 'Data: Etherscan • Updated in real-time' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Gas command error:', error);
    await interaction.editReply(`❌ Error fetching gas prices: ${error.message}`);
  }
}

module.exports = { handleGas };
