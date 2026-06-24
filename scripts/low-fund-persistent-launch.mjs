#!/usr/bin/env node
/**
 * Low-funded Persistent Agent launcher for Ritual Agents.
 *
 * Mirrors the public launcher flow at https://agents.ritualfoundation.org,
 * but lets dkmsFunding/schedulerFunding be lower than the frontend's 1 + 1 RIT
 * default. Dry-run is the default. Add --send only after simulation passes.
 *
 * Required env:
 *   PRIVATE_KEY
 *   OPENAI_API_KEY | ANTHROPIC_API_KEY | GEMINI_API_KEY | OPENROUTER_API_KEY | XAI_API_KEY
 *
 * Optional env:
 *   RITUAL_RPC_URL=https://rpc.ritualfoundation.org
 *   PROVIDER=openai
 *   MODEL=openai/gpt-4o
 *   SIGGY_SOUL="You are Siggy..."
 *   DKMS_FUNDING=0.75
 *   SCHEDULER_FUNDING=0.75
 */

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import {
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  decodeFunctionResult,
  defineChain,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  padHex,
  parseAbi,
  parseAbiParameters,
  parseEther,
  stringToHex,
  toFunctionSelector,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

let ecies;
try {
  ecies = await import('eciesjs');
} catch {
  throw new Error('Missing dependency: run `npm i eciesjs` in /opt/siggy-bot first.');
}

ecies.ECIES_CONFIG.symmetricNonceLength = 12;

const args = new Set(process.argv.slice(2));
const SEND = args.has('--send');

const RPC_URL = process.env.RITUAL_RPC_URL || process.env.RPC_URL || 'https://rpc.ritualfoundation.org';
const CHAIN_ID = 1979;
const AGENTS_ORIGIN = process.env.AGENTS_ORIGIN || 'https://agents.ritualfoundation.org';
const DEFAULT_TEE_SERVICE_REGISTRY = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F';
const DEFAULT_PERSISTENT_FACTORY = '0xB5be119daDF78508Fd006D341b300AF3E9329eA7';
const HEARTBEAT_CONTRACT = '0xef505e801f1db392b5289690e2ffc20e840a3aca';
const AGENT_RPC_URL = 'http://172.17.0.1:8545';
const CAPABILITY_HTTP_CALL = 0;

const DEFAULT_LOCK_DURATION_BLOCKS = 100000000n;
const DEFAULT_USER_WALLET_LOCK_DURATION = 10000n;
const DEFAULT_TTL_BLOCKS = 500n;
const DEFAULT_MAX_SPAWN_BLOCK = 6000n;
const DEFAULT_DELIVERY_GAS_PERSISTENT = 1000000n;
const DEFAULT_FEE_PER_GAS = 1000000000n;
const DEFAULT_PRIORITY_FEE = 100000000n;
const DEFAULT_SCHEDULER_GAS = 1800000;
const DEFAULT_SCHEDULER_TTL = 500;
const MIN_RITUAL_WALLET_BALANCE = parseEther('0.005');
const DEFAULT_RITUAL_WALLET_TOPUP = parseEther('0.05');
const PERSISTENT_LAUNCH_COMPRESSED_TOPIC = keccak256(
  stringToHex('PersistentLaunchCompressed(address,bytes32,address,address,uint256)'),
);
const EVENT_AGENT_REGISTERED =
  '0x6bd2ccd1aee53ca4e8719e5ce088ba80c1283b11a2c6c5469f159119891db5e6';

const EMPTY_STORAGE_REF = { platform: '', path: '', keyRef: '' };

const chain = defineChain({
  id: CHAIN_ID,
  name: 'Ritual',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });

const teeServiceRegistryAbi = parseAbi([
  'function getServicesByCapability(uint8 capability, bool checkValidity) view returns (((address paymentAddress,address teeAddress,uint8 teeType,bytes publicKey,string endpoint,bytes32 certPubKeyHash,uint8 capability) node,bool isValid,bytes32 workloadId)[])',
]);

const persistentFactoryAbi = parseAbi([
  'function predictCompressedLauncher(address owner, bytes32 userSalt) view returns (address launcher, bytes32 compressedSalt, bytes32 childSalt)',
  'function ritualWallet() view returns (address)',
  'function launchPersistentCompressed(bytes32 userSalt,address executor,uint64 dkmsTtl,uint256 dkmsFunding,bytes persistentInput,(uint32 schedulerGas,uint32 schedulerTtl,uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 value) schedule,uint256 schedulerLockDuration,uint256 schedulerFunding) payable returns (address launcher,address dkmsPaymentAddress,uint256 callId)',
]);

const ritualWalletAbi = parseAbi([
  'function balanceOf(address user) view returns (uint256)',
  'function lockUntil(address user) view returns (uint256)',
  'function depositFor(address user, uint256 lockDuration) payable',
]);

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function providerSecretKey(provider) {
  if (provider === 'google' || provider === 'gemini') return 'GEMINI_API_KEY';
  if (provider === 'anthropic') return 'ANTHROPIC_API_KEY';
  if (provider === 'openai') return 'OPENAI_API_KEY';
  if (provider === 'openrouter') return 'OPENROUTER_API_KEY';
  return 'XAI_API_KEY';
}

function persistentProviderEnum(provider) {
  if (provider === 'anthropic') return 0;
  if (provider === 'openai') return 1;
  if (provider === 'gemini' || provider === 'google') return 2;
  if (provider === 'xai') return 3;
  return 4;
}

function inferProvider() {
  if (process.env.PROVIDER) return process.env.PROVIDER.trim().toLowerCase();
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.XAI_API_KEY) return 'xai';
  return 'openai';
}

function defaultModel(provider) {
  if (provider === 'openai') return 'openai/gpt-4o';
  if (provider === 'anthropic') return 'anthropic/claude-sonnet-4.5';
  if (provider === 'gemini' || provider === 'google') return 'gemini/gemini-2.5-flash';
  if (provider === 'openrouter') return 'anthropic/claude-sonnet-4.5';
  if (provider === 'xai') return 'xai/grok-4';
  return 'openai/gpt-4o';
}

function bytesToHex(bytes) {
  return `0x${Buffer.from(bytes).toString('hex')}`;
}

function randomSalt() {
  return bytesToHex(randomBytes(32));
}

function encryptSecretBlob(executorPublicKey, secretMap) {
  const encoded = new TextEncoder().encode(JSON.stringify(secretMap));
  const encrypted = ecies.encrypt(executorPublicKey.slice(2), encoded);
  return bytesToHex(encrypted);
}

function buildOpenclawConfigRef() {
  return {
    platform: 'inline',
    path: JSON.stringify({
      uahi: {
        enabled: true,
        tick_sec: 3,
        app_heartbeat_sec: 10,
        onboard_mode: 'off',
      },
      heartbeat_chain: {
        enabled: true,
        contract_address: HEARTBEAT_CONTRACT,
        interval_blocks: 200,
        heartbeat_timeout_blocks: 600,
      },
    }),
    keyRef: '',
  };
}

function resolveDaPathTemplate(template, childContractAddress) {
  const clean = String(template || '').trim().replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const launcher = childContractAddress.toLowerCase();
  return clean
    .replaceAll('{child_contract_address}', launcher)
    .replaceAll('{child_contract_dkms_address}', launcher)
    .replaceAll('{agent_dkms_address}', launcher)
    .replaceAll('{agent_address}', launcher);
}

function topicToAddress(topic) {
  return `0x${String(topic).slice(-40)}`;
}

function extractPersistentDkmsFromReceipt(receipt, launcherAddress, factoryAddress) {
  const expected = launcherAddress.toLowerCase();
  for (const log of receipt.logs || []) {
    if (String(log.address).toLowerCase() !== factoryAddress.toLowerCase()) continue;
    if (String(log.topics?.[0]).toLowerCase() !== PERSISTENT_LAUNCH_COMPRESSED_TOPIC) continue;
    if (topicToAddress(log.topics[3]).toLowerCase() !== expected) continue;
    const [dkmsAddress] = decodeAbiParameters(
      parseAbiParameters('address,uint256'),
      log.data,
    );
    return dkmsAddress;
  }
  throw new Error('Could not resolve DKMS address from launch receipt.');
}

async function loadRuntimeConfig() {
  try {
    const text = await fetch(`${AGENTS_ORIGIN}/runtime-config.js`).then((r) => r.text());
    const json = text.match(/window\.__RITUAL_CONFIG__\s*=\s*(\{.*\});?/s)?.[1];
    const cfg = json ? JSON.parse(json) : {};
    return {
      teeServiceRegistry: cfg.teeServiceRegistry || DEFAULT_TEE_SERVICE_REGISTRY,
      persistentFactory: cfg.persistentFactory || DEFAULT_PERSISTENT_FACTORY,
    };
  } catch {
    return {
      teeServiceRegistry: DEFAULT_TEE_SERVICE_REGISTRY,
      persistentFactory: DEFAULT_PERSISTENT_FACTORY,
    };
  }
}

async function selectExecutor(registry) {
  const services = await publicClient.readContract({
    address: registry,
    abi: teeServiceRegistryAbi,
    functionName: 'getServicesByCapability',
    args: [CAPABILITY_HTTP_CALL, true],
  });
  const selected = services.find((service) => service.isValid) || services[0];
  if (!selected) throw new Error('No active HTTP executor found in TEEServiceRegistry.');
  if (!selected.node.publicKey || selected.node.publicKey === '0x') {
    throw new Error('Selected executor has no public key.');
  }
  return {
    teeAddress: selected.node.teeAddress,
    publicKey: selected.node.publicKey,
  };
}

async function fetchDaEnvelope(executor) {
  const res = await fetch(`${AGENTS_ORIGIN}/launch/da-blob`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      executor_tee_address: executor.teeAddress,
      executor_public_key: executor.publicKey,
    }),
  });
  if (!res.ok) {
    let detail = await res.text().catch(() => '');
    throw new Error(`DA envelope request failed (${res.status}): ${detail}`);
  }
  const payload = await res.json();
  if (!payload.encrypted_secret_hex || !payload.da_platform || !payload.da_key_ref) {
    throw new Error('DA envelope response is malformed.');
  }
  return payload;
}

async function waitForAgentRegistered(agentAddress, startBlock, timeoutMs = 300000) {
  const started = Date.now();
  const topicAgent = padHex(agentAddress, { size: 32 });
  while (Date.now() - started < timeoutMs) {
    const latest = await publicClient.getBlockNumber();
    const logs = await publicClient.getLogs({
      address: HEARTBEAT_CONTRACT,
      fromBlock: BigInt(startBlock),
      toBlock: latest,
      topics: [EVENT_AGENT_REGISTERED, topicAgent],
    });
    if (logs.length > 0) return logs[0].transactionHash;
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error('Timed out waiting for AgentHeartbeat registration.');
}

const runtime = await loadRuntimeConfig();
const provider = inferProvider();
const llmKeyName = providerSecretKey(provider);
const llmKey = requireEnv(llmKeyName);
const model = process.env.MODEL?.trim() || defaultModel(provider);
const soul =
  process.env.SIGGY_SOUL?.trim() ||
  process.env.PROMPT?.trim() ||
  'You are Siggy Anime Girl, a playful Ritual-native AI agent. Be concise, warm, and helpful.';

const privateKey = requireEnv('PRIVATE_KEY');
const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

const dkmsFunding = parseEther(process.env.DKMS_FUNDING || '0.75');
const schedulerFunding = parseEther(process.env.SCHEDULER_FUNDING || '0.75');
const totalValue = dkmsFunding + schedulerFunding;

console.log(`Mode: ${SEND ? 'SEND' : 'DRY RUN'}`);
console.log(`Wallet: ${account.address}`);
console.log(`Provider/model: ${provider} / ${model}`);
console.log(`Factory: ${runtime.persistentFactory}`);
console.log(`Funding: dkms=${formatEther(dkmsFunding)} scheduler=${formatEther(schedulerFunding)} total=${formatEther(totalValue)} RIT`);

const nativeBalance = await publicClient.getBalance({ address: account.address });
console.log(`Native balance: ${formatEther(nativeBalance)} RIT`);
if (nativeBalance < totalValue + parseEther('0.03')) {
  throw new Error(`Native balance too low for funding plus gas buffer. Have ${formatEther(nativeBalance)} RIT.`);
}

console.log('Selecting executor...');
const executor = await selectExecutor(runtime.teeServiceRegistry);
console.log(`Executor: ${executor.teeAddress}`);

console.log('Fetching DA envelope...');
const daEnvelope = await fetchDaEnvelope(executor);

console.log('Encrypting and signing secret blobs...');
const encryptedLlmBlob = encryptSecretBlob(executor.publicKey, { [llmKeyName]: llmKey });
const daSignature = await walletClient.signMessage({
  account,
  message: { raw: daEnvelope.encrypted_secret_hex },
});
const llmSignature = await walletClient.signMessage({
  account,
  message: { raw: encryptedLlmBlob },
});

const salt = randomSalt();
const [launcherAddress] = await publicClient.readContract({
  address: runtime.persistentFactory,
  abi: persistentFactoryAbi,
  functionName: 'predictCompressedLauncher',
  args: [account.address, salt],
});
console.log(`Predicted launcher: ${launcherAddress}`);

const ritualWallet = await publicClient.readContract({
  address: runtime.persistentFactory,
  abi: persistentFactoryAbi,
  functionName: 'ritualWallet',
});
const [escrowBalance, escrowLockUntil, currentBlock] = await Promise.all([
  publicClient.readContract({
    address: ritualWallet,
    abi: ritualWalletAbi,
    functionName: 'balanceOf',
    args: [account.address],
  }),
  publicClient.readContract({
    address: ritualWallet,
    abi: ritualWalletAbi,
    functionName: 'lockUntil',
    args: [account.address],
  }),
  publicClient.getBlockNumber(),
]);
console.log(`RitualWallet: ${ritualWallet}`);
console.log(`RitualWallet balance: ${formatEther(escrowBalance)} RIT`);
console.log(`RitualWallet lockUntil: ${escrowLockUntil} (current ${currentBlock})`);

if (escrowBalance < MIN_RITUAL_WALLET_BALANCE) {
  console.log(`Escrow below minimum; launch would need a ${formatEther(DEFAULT_RITUAL_WALLET_TOPUP)} RIT deposit.`);
}
if (escrowLockUntil < currentBlock + DEFAULT_USER_WALLET_LOCK_DURATION) {
  console.log('Escrow lock is too short; launch would need a lock refresh.');
}

const daPath = resolveDaPathTemplate(daEnvelope.da_path_template, launcherAddress);
const persistentInput = encodeAbiParameters(
  parseAbiParameters(
    'address executor,bytes[] encryptedSecrets,uint256 ttl,bytes[] secretSignature,bytes userPublicKey,uint64 maxSpawnBlock,address deliveryTarget,bytes4 deliverySelector,uint256 deliveryGasLimit,uint256 deliveryMaxFeePerGas,uint256 deliveryMaxPriorityFeePerGas,uint256 deliveryValue,uint8 provider,string model,string llmApiKeyRef,(string platform,string path,string keyRef) daConfig,(string platform,string path,string keyRef) soulRef,(string platform,string path,string keyRef) agentsRef,(string platform,string path,string keyRef) userRef,(string platform,string path,string keyRef) memoryRef,(string platform,string path,string keyRef) identityRef,(string platform,string path,string keyRef) toolsRef,(string platform,string path,string keyRef) openclawConfigRef,string restoreFromCid,string rpcUrls,uint16 agentRuntime',
  ),
  [
    executor.teeAddress,
    [daEnvelope.encrypted_secret_hex, encryptedLlmBlob],
    DEFAULT_TTL_BLOCKS,
    [daSignature, llmSignature],
    '0x',
    DEFAULT_MAX_SPAWN_BLOCK,
    launcherAddress,
    toFunctionSelector('onPersistentAgentResult(bytes32,bytes)'),
    DEFAULT_DELIVERY_GAS_PERSISTENT,
    DEFAULT_FEE_PER_GAS,
    DEFAULT_PRIORITY_FEE,
    0n,
    persistentProviderEnum(provider),
    model,
    llmKeyName,
    {
      platform: daEnvelope.da_platform,
      path: daPath,
      keyRef: daEnvelope.da_key_ref,
    },
    {
      platform: 'inline',
      path: soul,
      keyRef: '',
    },
    EMPTY_STORAGE_REF,
    EMPTY_STORAGE_REF,
    EMPTY_STORAGE_REF,
    EMPTY_STORAGE_REF,
    EMPTY_STORAGE_REF,
    buildOpenclawConfigRef(),
    '',
    JSON.stringify({ ritual: AGENT_RPC_URL }),
    2,
  ],
);

const launchSchedule = {
  schedulerGas: DEFAULT_SCHEDULER_GAS,
  schedulerTtl: DEFAULT_SCHEDULER_TTL,
  maxFeePerGas: DEFAULT_FEE_PER_GAS,
  maxPriorityFeePerGas: DEFAULT_PRIORITY_FEE,
  value: 0n,
};

const launchArgs = [
  salt,
  executor.teeAddress,
  DEFAULT_TTL_BLOCKS,
  dkmsFunding,
  persistentInput,
  launchSchedule,
  DEFAULT_LOCK_DURATION_BLOCKS,
  schedulerFunding,
];

const data = encodeFunctionData({
  abi: persistentFactoryAbi,
  functionName: 'launchPersistentCompressed',
  args: launchArgs,
});

console.log('Simulating launch...');
try {
  await publicClient.call({
    account: account.address,
    to: runtime.persistentFactory,
    data,
    value: totalValue,
  });
  console.log('Simulation: OK');
} catch (error) {
  console.error('Simulation failed.');
  throw error;
}

console.log('Estimating gas...');
const gas = await publicClient.estimateGas({
  account: account.address,
  to: runtime.persistentFactory,
  data,
  value: totalValue,
});
console.log(`Estimated gas: ${gas}`);

if (!SEND) {
  console.log('Dry run complete. Re-run with --send to submit the transaction.');
  process.exit(0);
}

console.log('Sending launch transaction...');
const hash = await walletClient.sendTransaction({
  account,
  to: runtime.persistentFactory,
  data,
  value: totalValue,
  gas: gas + (gas / 5n),
});
console.log(`Launch tx: https://explorer.ritualfoundation.org/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180000 });
if (receipt.status !== 'success') throw new Error(`Launch transaction failed: ${hash}`);

const dkmsAddress = extractPersistentDkmsFromReceipt(receipt, launcherAddress, runtime.persistentFactory);
console.log(`Launcher: ${launcherAddress}`);
console.log(`DKMS/payment agent address: ${dkmsAddress}`);
console.log('Waiting for AgentHeartbeat registration');
const heartbeatTx = await waitForAgentRegistered(dkmsAddress, receipt.blockNumber);
console.log('');
console.log(`Heartbeat tx: https://explorer.ritualfoundation.org/tx/${heartbeatTx}`);
console.log(`Agent: https://explorer.ritualfoundation.org/agents/${dkmsAddress}?type=persistent`);
