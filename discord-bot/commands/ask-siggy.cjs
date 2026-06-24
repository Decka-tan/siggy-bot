/**
 * /ask-siggy <prompt>
 *
 * Calls Ritual on-chain LLM (precompile 0x0802) with Siggy's persona.
 * Renders a mood-aware embed (color + sprite from [MOOD:X] tag in response).
 */

const { EmbedBuilder } = require('discord.js');
const { SIGGY_CORE_IDENTITY } = require('../lib/siggy-persona.cjs');

const EXPLORER = 'https://explorer.ritualfoundation.org';

const SPRITES = {
  DEFAULT: 'https://siggy-bot.vercel.app/siggy-girl-default.png',
  HAPPY:   'https://siggy-bot.vercel.app/siggy-girl-happy.png',
  SAD:     'https://siggy-bot.vercel.app/siggy-girl-sad.png',
  SHOCK:   'https://siggy-bot.vercel.app/siggy-girl-shock.png',
  SHY:     'https://siggy-bot.vercel.app/siggy-girl-shy.png',
  ANGRY:   'https://siggy-bot.vercel.app/siggy-girl-angry.png',
};
const MOOD_COLORS = {
  DEFAULT: 0x3498db,
  HAPPY:   0xf1c40f,
  SAD:     0x5dade2,
  SHOCK:   0xe67e22,
  SHY:     0xff69b4,
  ANGRY:   0xe74c3c,
};

function parseMood(raw) {
  const m = raw.match(/\[MOOD:(DEFAULT|HAPPY|SAD|SHOCK|SHY|ANGRY)\]/i);
  const mood = (m?.[1] || 'DEFAULT').toUpperCase();
  const cleaned = raw.replace(/\[MOOD:\w+\]/i, '').trim();
  return { mood, cleaned };
}

function fmtRit(wei) {
  const n = Number(wei) / 1e18;
  return n < 0.001 ? `${(n * 1e6).toFixed(2)} µRIT` : `${n.toFixed(4)} RIT`;
}

// Rough estimate: 0.0000002 RIT/token observed empirically. Display-only.
function estCostRit(totalTokens) {
  return BigInt(totalTokens) * 200_000_000_000n;
}

let callRitualLLM;
function getRitualLLM() {
  if (callRitualLLM) return callRitualLLM;
  try {
    callRitualLLM = require('../../lib/ritual-llm').callRitualLLM;
  } catch {
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
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('Configuration error')
        .setDescription('`PRIVATE_KEY` not set on bot host.')],
    });
  }

  // Thinking state
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(0x3498db)
      .setAuthor({ name: 'Siggy is thinking on-chain…', iconURL: SPRITES.DEFAULT })
      .setDescription(`*Summoning response via Ritual TEE • model GLM-4.7-FP8*\n\n> ${userPrompt.slice(0, 200)}`)
      .setFooter({ text: 'On-chain inference usually settles in ~10-25s' })],
  });

  try {
    const t0 = Date.now();
    const res = await getRitualLLM()({
      system: SIGGY_CORE_IDENTITY,
      user: userPrompt,
      privateKey: pk,
      rpcUrl: process.env.RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org',
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const { mood, cleaned } = parseMood(res.content);

    const shortTx = `${res.txHash.slice(0, 6)}…${res.txHash.slice(-4)}`;
    const cost = fmtRit(estCostRit(Number(res.totalTokens)));

    const embed = new EmbedBuilder()
      .setColor(MOOD_COLORS[mood] || MOOD_COLORS.DEFAULT)
      .setAuthor({
        name: `Siggy — ${interaction.user.username} summoned a response`,
        iconURL: SPRITES[mood] || SPRITES.DEFAULT,
      })
      .setThumbnail(SPRITES[mood] || SPRITES.DEFAULT)
      .setDescription(
        `> ${userPrompt.length > 180 ? userPrompt.slice(0, 180) + '…' : userPrompt}\n\n` +
        cleaned.slice(0, 3500),
      )
      .addFields(
        { name: '🌀 Mood', value: mood, inline: true },
        { name: '⚡ Latency', value: `${elapsed}s`, inline: true },
        { name: '🧮 Tokens', value: `${res.totalTokens}`, inline: true },
        { name: '💸 Est. cost', value: cost, inline: true },
        { name: '🤖 Model', value: 'GLM-4.7-FP8', inline: true },
        { name: '🔗 Tx', value: `[${shortTx}](${EXPLORER}/tx/${res.txHash})`, inline: true },
      )
      .setFooter({
        text: `Ritual Chain 1979 • precompile 0x0802 • TEE ${res.executor.slice(0,6)}…${res.executor.slice(-4)}`,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: 'On-chain inference failed', iconURL: SPRITES.SAD })
        .setDescription('```\n' + String(err.message).slice(0, 1800) + '\n```')
        .setFooter({ text: 'Retry in a few seconds — Ritual RPC sometimes hiccups' })],
    });
  }
}

module.exports = { handleAskSiggy };
