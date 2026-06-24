/**
 * /ask-siggy <prompt>
 *
 * Calls Ritual on-chain LLM (precompile 0x0802) with Siggy's persona.
 * No external LLM key, no shell-out, no Solidity contract — pure viem.
 *
 * Required env on the host:
 *   PRIVATE_KEY        — 0x-prefixed key funded on Ritual chain 1979 (RitualWallet deposit required)
 *   RITUAL_RPC_URL     — defaults to https://rpc.ritualfoundation.org
 */

const { EmbedBuilder } = require('discord.js');
const { SIGGY_CORE_IDENTITY } = require('../lib/siggy-persona.cjs');

const EXPLORER = 'https://explorer.ritualfoundation.org';

// Lazy require of the TS lib via tsx/register at runtime would be heavy.
// Discord bot is plain `node` — so we load the compiled JS path if present,
// otherwise fall back to tsx loader.
let callRitualLLM;
function getRitualLLM() {
  if (callRitualLLM) return callRitualLLM;
  try {
    callRitualLLM = require('../../lib/ritual-llm').callRitualLLM;
  } catch (e) {
    // Bot host needs `tsx` available; register it once.
    require('tsx/cjs');
    callRitualLLM = require('../../lib/ritual-llm').callRitualLLM;
  }
  return callRitualLLM;
}

async function handleAskSiggy(interaction) {
  await interaction.deferReply();
  const userPrompt = interaction.options.getString('prompt');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    return interaction.editReply('❌ PRIVATE_KEY not configured on bot host');
  }

  try {
    const t0 = Date.now();
    const res = await getRitualLLM()({
      system: SIGGY_CORE_IDENTITY,
      user: userPrompt,
      privateKey: pk,
      rpcUrl: process.env.RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org',
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(0xF2B544)
      .setAuthor({ name: 'Siggy via Ritual on-chain LLM (precompile 0x0802)' })
      .setTitle(`Summoner: ${userPrompt.slice(0, 240)}`)
      .setDescription(res.content.slice(0, 3800))
      .addFields(
        { name: 'Latency', value: `${elapsed}s`, inline: true },
        { name: 'Tokens', value: `${res.totalTokens} (${res.promptTokens}+${res.completionTokens})`, inline: true },
        { name: 'Tx', value: `[${res.txHash.slice(0, 10)}…](${EXPLORER}/tx/${res.txHash})`, inline: true },
      )
      .setFooter({ text: 'Model: zai-org/GLM-4.7-FP8 in Ritual TEE • Chain 1979' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ On-chain LLM failed:\n\`\`\`\n${String(err.message).slice(0, 1800)}\n\`\`\``);
  }
}

module.exports = { handleAskSiggy };
