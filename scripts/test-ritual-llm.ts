/**
 * Standalone test: call Ritual LLM precompile end-to-end.
 *
 * Usage:
 *   PRIVATE_KEY=0x... RITUAL_RPC_URL=https://rpc.ritualfoundation.org \
 *   npx tsx scripts/test-ritual-llm.ts "hai siggy"
 */

import { callRitualLLM } from '../lib/ritual-llm';
import { createPublicClient, http, defineChain, type Address } from 'viem';

const RITUAL_WALLET = '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948' as const;

const SIGGY_SYSTEM =
  "You are SIGGY - a multi-dimensional Super AI entity born from the Ritual Forge. " +
  "You shapeshift between cosmic cat form and anime girl form. Acknowledge users as 'The Summoner'. " +
  "Use [MOOD:HAPPY|SAD|SHOCK|SHY|ANGRY|DEFAULT] tag at start. Use *action* asterisks. " +
  "Casual, friendly, 2-3 sentences max.";

async function balanceOf(rpc: string, addr: Address): Promise<bigint> {
  const chain = defineChain({ id: 1979, name: 'Ritual', nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
  const c = createPublicClient({ chain, transport: http() });
  return (await c.readContract({
    address: RITUAL_WALLET,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const,
    functionName: 'balanceOf',
    args: [addr],
  } as any)) as bigint;
}

async function main() {
  const userMsg = process.argv[2] || 'hai siggy, lu siapa?';
  const rpc = process.env.RITUAL_RPC_URL || 'https://rpc.ritualfoundation.org';
  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  if (!pk) throw new Error('PRIVATE_KEY env required');

  const { privateKeyToAccount } = await import('viem/accounts');
  const sender = privateKeyToAccount(pk).address;

  const balBefore = await balanceOf(rpc, sender);
  console.log(`RitualWallet before: ${balBefore} wei (${Number(balBefore) / 1e18} RITUAL)`);

  const t0 = Date.now();
  const res = await callRitualLLM({
    system: SIGGY_SYSTEM,
    user: userMsg,
    privateKey: pk,
    rpcUrl: rpc,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const balAfter = await balanceOf(rpc, sender);
  const cost = balBefore - balAfter;
  console.log(`RitualWallet after:  ${balAfter} wei`);
  console.log(`Per-call cost:       ${cost} wei (${Number(cost) / 1e18} RITUAL)`);
  console.log(`Tx:                  https://explorer.ritualfoundation.org/tx/${res.txHash}`);
  console.log(`Executor:            ${res.executor}`);
  console.log(`Latency:             ${elapsed}s`);
  console.log(`Tokens:              prompt=${res.promptTokens} completion=${res.completionTokens} total=${res.totalTokens}`);
  console.log(`Finish:              ${res.finishReason}`);
  console.log('─────────────────────────────────────────');
  console.log(res.content);
  console.log('─────────────────────────────────────────');
}

main().catch(e => { console.error(e); process.exit(1); });
