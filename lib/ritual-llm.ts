/**
 * Ritual on-chain LLM client — direct precompile 0x0802 call.
 *
 * Single-shot inference via Ritual's TEE-hosted GLM-4.7-FP8 model. No external
 * LLM key, no DA storage, no Solidity contract. Pure viem.
 *
 * Returns text + tx hash so callers can surface explorer links.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  encodeAbiParameters,
  parseAbiParameters,
  decodeAbiParameters,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RITUAL_CHAIN_ID = 1979;
const LLM_PRECOMPILE = '0x0000000000000000000000000000000000000802' as const;
const TEE_SERVICE_REGISTRY = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F' as const;
const CAPABILITY_LLM = 1;
const MODEL = 'zai-org/GLM-4.7-FP8';

// Locked 30-field tuple per skills/ritual-dapp-llm/SKILL.md §2.
// Any deviation → RPC -32602 invalid async payload.
const REQUEST_ABI = [
  'address, bytes[], uint256, bytes[], bytes,',
  'string, string, int256, string, bool, int256, string, string,',
  'uint256, bool, int256, string, bytes, int256, string, string, bool,',
  'int256, bytes, bytes, int256, int256, string, bool,',
  '(string,string,string)',
].join('');

const REGISTRY_ABI = [{
  name: 'getServicesByCapability',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'capability', type: 'uint8' }, { name: 'checkValidity', type: 'bool' }],
  outputs: [{
    name: 'services',
    type: 'tuple[]',
    components: [
      { name: 'node', type: 'tuple', components: [
        { name: 'paymentAddress', type: 'address' },
        { name: 'teeAddress', type: 'address' },
        { name: 'teeType', type: 'uint8' },
        { name: 'publicKey', type: 'bytes' },
        { name: 'endpoint', type: 'string' },
        { name: 'certPubKeyHash', type: 'bytes32' },
        { name: 'capability', type: 'uint8' },
      ]},
      { name: 'isValid', type: 'bool' },
      { name: 'workloadId', type: 'bytes32' },
    ],
  }],
}] as const;

export interface RitualLLMResult {
  content: string;
  finishReason: string;
  promptTokens: bigint;
  completionTokens: bigint;
  totalTokens: bigint;
  txHash: Hex;
  executor: Address;
}

export interface RitualLLMOptions {
  system: string;
  user: string;
  privateKey: Hex;
  rpcUrl: string;
  maxCompletionTokens?: bigint;
  temperature?: bigint;
  ttlBlocks?: bigint;
}

function ritualChain(rpcUrl: string) {
  return defineChain({
    id: RITUAL_CHAIN_ID,
    name: 'Ritual',
    nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

async function pickExecutor(rpcUrl: string): Promise<Address> {
  const client = createPublicClient({ chain: ritualChain(rpcUrl), transport: http() });
  const services = await client.readContract({
    address: TEE_SERVICE_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'getServicesByCapability',
    args: [CAPABILITY_LLM, true],
  });
  const valid = (services as any[]).find(s => s.isValid);
  if (!valid) throw new Error('No valid LLM executor in TEEServiceRegistry');
  return valid.node.teeAddress as Address;
}

function encodeRequest(executor: Address, messagesJson: string, opts: RitualLLMOptions): Hex {
  return encodeAbiParameters(
    parseAbiParameters(REQUEST_ABI),
    [
      executor,
      [],                              // encryptedSecrets (none — GLM is Ritual-hosted)
      opts.ttlBlocks ?? 300n,          // ttl
      [],                              // secretSignatures
      '0x',                            // userPublicKey
      messagesJson,
      MODEL,
      0n,                              // frequencyPenalty
      '',                              // logitBiasJson
      false,                           // logprobs
      opts.maxCompletionTokens ?? 4096n, // maxCompletionTokens (>=4096 for reasoning)
      '',                              // metadataJson
      '',                              // modalitiesJson
      1n,                              // n
      true,                            // parallelToolCalls
      0n,                              // presencePenalty
      'low',                           // reasoningEffort (low = faster + cheaper)
      '0x',                            // responseFormatData
      -1n,                             // seed
      'auto',                          // serviceTier
      '',                              // stopJson
      false,                           // stream
      opts.temperature ?? 700n,        // temperature
      '0x',                            // toolChoiceData
      '0x',                            // toolsData
      -1n,                             // topLogprobs
      1000n,                           // topP
      '',                              // user
      false,                           // piiEnabled
      ['', '', ''],                    // convoHistory: empty StorageRef → stateless
    ] as any,
  );
}

async function fetchSpcOutput(rpcUrl: string, txHash: Hex): Promise<Hex | null> {
  // Ritual receipts expose precompile I/O via `spcCalls`, not via PrecompileCalled events.
  // viem's TransactionReceipt strips unknown fields, so hit raw JSON-RPC.
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [txHash] }),
  });
  const json = await res.json();
  const calls = json?.result?.spcCalls;
  if (!Array.isArray(calls)) return null;
  const hit = calls.find((c: any) => (c.address as string).toLowerCase() === LLM_PRECOMPILE);
  return (hit?.output as Hex) || null;
}

function decodeResponse(resultHex: Hex): {
  content: string;
  finishReason: string;
  promptTokens: bigint;
  completionTokens: bigint;
  totalTokens: bigint;
} {
  const [hasError, completionData, , errorMessage] = decodeAbiParameters(
    parseAbiParameters('bool, bytes, bytes, string, (string,string,string)'),
    resultHex,
  );
  if (hasError) throw new Error(`LLM envelope error: ${errorMessage}`);

  const [, , , , , , choicesCount, choicesData, usageData] = decodeAbiParameters(
    parseAbiParameters('string, string, uint256, string, string, string, uint256, bytes[], bytes'),
    completionData as Hex,
  );
  if ((choicesCount as bigint) === 0n || (choicesData as Hex[]).length === 0) {
    throw new Error('LLM returned no choices');
  }
  const [promptTokens, completionTokens, totalTokens] = decodeAbiParameters(
    parseAbiParameters('uint256, uint256, uint256'),
    usageData as Hex,
  );
  const [, finishReason, messageData] = decodeAbiParameters(
    parseAbiParameters('uint256, string, bytes'),
    (choicesData as Hex[])[0],
  );
  const [, content] = decodeAbiParameters(
    parseAbiParameters('string, string, string, uint256, bytes[]'),
    messageData as Hex,
  );
  return {
    content: content as string,
    finishReason: finishReason as string,
    promptTokens: promptTokens as bigint,
    completionTokens: completionTokens as bigint,
    totalTokens: totalTokens as bigint,
  };
}

export async function callRitualLLM(opts: RitualLLMOptions): Promise<RitualLLMResult> {
  const chain = ritualChain(opts.rpcUrl);
  const account = privateKeyToAccount(opts.privateKey);
  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });

  const executor = await pickExecutor(opts.rpcUrl);

  const messages = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.user },
  ];
  const data = encodeRequest(executor, JSON.stringify(messages), opts);

  const txHash = await walletClient.sendTransaction({
    to: LLM_PRECOMPILE,
    data,
    gas: 5_000_000n,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });
  const resultHex = await fetchSpcOutput(opts.rpcUrl, txHash);
  if (!resultHex) throw new Error(`No LLM spcCall output in receipt ${txHash}`);

  const decoded = decodeResponse(resultHex);
  return { ...decoded, txHash, executor };
}
