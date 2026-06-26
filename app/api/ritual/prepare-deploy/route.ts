import { NextResponse } from "next/server";
import { Interface, isAddress, keccak256, toUtf8Bytes } from "ethers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RPC_URL = process.env.RITUAL_RPC_URL || process.env.RPC_URL || "https://rpc.ritualfoundation.org";
const FACTORY = "0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304";
const REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F";
const DELIVERY_LOG = "0x5A16214fF555848411544b005f7Ac063742f39F6";
const ASYNC_JOB_TRACKER = "0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5";
const TEMPLATE_BYTES = 10822;
const MIN_FUNDING_WEI = 200_000_000_000_000_000n; // 0.2 RIT — safer minimum for reaching MONITORED
const DEFAULT_FUNDING_WEI = 200_000_000_000_000_000n; // 0.2 RIT
const MIN_BALANCE_BUFFER_WEI = 60_000_000_000_000_000n; // 0.06 RIT — covers deploy + configure gas

const trackerInterface = new Interface([
  "function hasPendingJobForSender(address sender) view returns (bool)",
]);

const factoryInterface = new Interface([
  "function predictHarness(address owner, bytes32 salt) view returns (address harness, bytes32 codeHash)",
  "function deployHarness(bytes32 salt) returns (address harness)",
]);
const registryInterface = new Interface([
  "function getServicesByCapability(uint8 capability, bool active) view returns (((address a,address b,uint8 c,bytes d,string e,bytes32 f,uint8 g) node,bool v,bytes32 w)[])",
]);
const configureInterface = new Interface([
  "function configureFundAndStart((address,uint256,bytes,uint64,uint64,string,address,bytes4,uint256,uint256,uint256,uint16,string,bytes,(string,string,string),(string,string,string),(string,string,string)[],(string,string,string),string,string[],uint16,uint32,string),(uint32,uint32,uint32,uint256,uint256,uint256),(uint32,uint16,uint16),uint256)",
]);

type JsonRpc = { result?: string | unknown[]; error?: { message?: string } };

function normalizeRepo(repo: string) {
  return repo
    .trim()
    .replace(/^https:\/\/huggingface\.co\/datasets\//i, "")
    .replace(/^\/+|\/+$/g, "");
}

async function rpc(method: string, params: unknown[] = []) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = (await response.json()) as JsonRpc;
  if (json.error) throw new Error(json.error.message || `${method} failed`);
  return json.result;
}

function hexNumber(value: bigint | number) {
  return `0x${BigInt(value).toString(16)}`;
}

async function predictHarness(owner: string, salt: string) {
  const data = factoryInterface.encodeFunctionData("predictHarness", [owner, salt]);
  const result = (await rpc("eth_call", [{ to: FACTORY, data }, "latest"])) as string;
  const [harness, codeHash] = factoryInterface.decodeFunctionResult("predictHarness", result);
  return { harness: String(harness), codeHash: String(codeHash) };
}

async function getExecutorHealth() {
  const latestHex = (await rpc("eth_blockNumber")) as string;
  const latest = BigInt(latestHex);
  const from = latest > 200n ? latest - 200n : 0n;
  const logs = (await rpc("eth_getLogs", [
    {
      address: DELIVERY_LOG,
      fromBlock: hexNumber(from),
      toBlock: "latest",
    },
  ])) as unknown[];
  return {
    latestBlock: Number(latest),
    fromBlock: Number(from),
    deliveries: logs.length,
    healthy: logs.length >= 5,
    caution: logs.length < 3,
  };
}

async function getExecutor() {
  const data = registryInterface.encodeFunctionData("getServicesByCapability", [0, true]);
  const result = (await rpc("eth_call", [{ to: REGISTRY, data }, "latest"])) as string;
  const [services] = registryInterface.decodeFunctionResult("getServicesByCapability", result);
  const first = services?.[0];
  if (!first) throw new Error("No active sovereign executor found in registry.");

  const node = first.node || first[0];
  const executor = String(node.b || node[1]);
  const publicKey = String(node.d || node[3]);
  if (!isAddress(executor) || !publicKey || publicKey === "0x") {
    throw new Error("Registry returned an invalid executor.");
  }
  return { executor, publicKey };
}

function buildCalldata({
  harness,
  prompt,
  hfRepoId,
  encryptedSecrets,
  executor,
  numCalls,
  model,
  frequency,
  schedulerGas,
  cliType,
  schedulerTtl,
}: {
  harness: string;
  prompt: string;
  hfRepoId: string;
  encryptedSecrets: string;
  executor: string;
  numCalls: number;
  model: string;
  frequency: number;
  schedulerGas: number;
  cliType: number;
  schedulerTtl: number;
}) {
  const params = [
    executor,
    500,
    "0x",
    5,
    6000,
    "SOVEREIGN_AGENT_TASK",
    harness,
    "0x8ca12055",
    3000000,
    1000000000,
    100000000,
    cliType,
    prompt,
    encryptedSecrets,
    ["hf", `${hfRepoId}/sessions/session-001.jsonl`, "HF_TOKEN"],
    ["hf", `${hfRepoId}/artifacts/`, "HF_TOKEN"],
    [],
    ["hf", `${hfRepoId}/prompts/default-system.md`, ""],
    model,
    [],
    50,
    8192,
    "",
  ];
  // schedulerGas 500k (not 1.8M) so each call only burns ~0.002 RIT from escrow,
  // and frequency 2000 (~11.7 min) so 0.1 RIT lasts ~50 wakeUps ≈ ~10h base + rolling windows.
  const schedule = [schedulerGas, frequency, schedulerTtl, 20000000000, 1000000000, 0];
  const rolling = [numCalls, 5000, 1];
  const lockDuration = 100000000;
  const calldata = configureInterface.encodeFunctionData("configureFundAndStart", [params, schedule, rolling, lockDuration]);

  if (!calldata.startsWith("0xb1906702")) {
    throw new Error(`configure selector mismatch: ${calldata.slice(0, 10)}`);
  }
  return calldata;
}

async function getBalance(addr: string) {
  const hex = (await rpc("eth_getBalance", [addr, "latest"])) as string;
  return BigInt(hex);
}

async function hasPendingAsync(owner: string) {
  const data = trackerInterface.encodeFunctionData("hasPendingJobForSender", [owner]);
  try {
    const result = (await rpc("eth_call", [{ to: ASYNC_JOB_TRACKER, data }, "latest"])) as string;
    const [pending] = trackerInterface.decodeFunctionResult("hasPendingJobForSender", result);
    return Boolean(pending);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const owner = String(body.owner || "").trim();
    const prompt = String(body.prompt || "").trim();
    const saltLabel = String(body.saltLabel || `siggy-${Date.now()}`).trim();
    const hfRepoId = normalizeRepo(String(body.hfRepoId || "decka-tan/ritual-sovereign-agent"));
    const encryptedSecrets = String(body.encryptedSecrets || "").trim();
    const executor = String(body.executor || "").trim();
    const model = String(body.model || "gpt-4o-mini").trim();
    const provider = String(body.provider || "openai").trim().toLowerCase();
    const ALLOWED_PROVIDERS = ["openrouter", "openai", "anthropic", "gemini"];
    if (!ALLOWED_PROVIDERS.includes(provider)) throw new Error(`provider must be one of ${ALLOWED_PROVIDERS.join(", ")}`);
    if (model.length === 0 || model.length > 200) throw new Error("model must be a non-empty string under 200 chars.");

    // Funding (default 0.2 RIT). Clamp into [MIN_FUNDING_WEI, 5 RIT].
    let fundingWei = DEFAULT_FUNDING_WEI;
    if (body.fundingWei !== undefined) {
      try {
        fundingWei = BigInt(String(body.fundingWei));
      } catch {
        throw new Error("fundingWei must be a bigint-coerceable string.");
      }
    }
    if (fundingWei < MIN_FUNDING_WEI) throw new Error("Funding below 0.2 RIT is too tight to reach MONITORED.");
    if (fundingWei > 5_000_000_000_000_000_000n) throw new Error("Funding above 5 RIT is wasteful for sovereign.");

    if (!isAddress(owner)) throw new Error("Connect a valid wallet first.");
    if (!prompt) throw new Error("Prompt is required.");
    if (!/^[\w.-]+\/[\w.-]+$/.test(hfRepoId)) throw new Error("HF repo must be in user/repo format.");
    if (!/^0x[0-9a-fA-F]+$/.test(encryptedSecrets) || encryptedSecrets.length < 200) {
      throw new Error("encryptedSecrets must be a hex blob from client-side ECIES encryption.");
    }
    if (!isAddress(executor)) throw new Error("Invalid executor address from client.");

    // Gap fix 1: balance check
    const ownerBalanceWei = await getBalance(owner);
    const requiredWei = fundingWei + MIN_BALANCE_BUFFER_WEI;
    if (ownerBalanceWei < requiredWei) {
      throw new Error(
        `Wallet balance too low. Have ${(Number(ownerBalanceWei) / 1e18).toFixed(4)} RIT, need ${(Number(requiredWei) / 1e18).toFixed(4)} RIT (funding + gas buffer).`,
      );
    }

    // Gap fix 2: pending async lock check
    const pending = await hasPendingAsync(owner);
    if (pending) {
      throw new Error(
        "Your wallet has a pending async sovereign job. Wait ~10-30 minutes for the executor to clear it before deploying.",
      );
    }

    // Verify the executor the client chose is still in the registry's active set.
    // If it dropped out (deregistered) between encrypt + send, abort so user re-encrypts.
    const data = registryInterface.encodeFunctionData("getServicesByCapability", [0, true]);
    const result = (await rpc("eth_call", [{ to: REGISTRY, data }, "latest"])) as string;
    const [services] = registryInterface.decodeFunctionResult("getServicesByCapability", result);
    const stillActive = (Array.isArray(services) ? services : []).some((s: any) => {
      const node = s.node || s[0];
      const addr = String(node.b || node[1]);
      return addr.toLowerCase() === executor.toLowerCase();
    });
    if (!stillActive) {
      throw new Error(`Executor ${executor.slice(0, 10)}… is no longer active. Re-prepare to pick a fresh executor.`);
    }

    // Parse + clamp schedule controls (defaults match community-proven values).
    const numCallsRaw = Number.isFinite(body.numCalls) ? Number(body.numCalls) : 5;
    const frequencyRaw = Number.isFinite(body.frequency) ? Number(body.frequency) : 2000;
    const schedulerGasRaw = Number.isFinite(body.schedulerGas) ? Number(body.schedulerGas) : 500000;
    const cliTypeRaw = Number.isFinite(body.cliType) ? Number(body.cliType) : 5;
    const schedulerTtlRaw = Number.isFinite(body.schedulerTtl) ? Number(body.schedulerTtl) : 5000;
    if (numCallsRaw < 1 || numCallsRaw > 100) throw new Error("numCalls must be between 1 and 100.");
    if (frequencyRaw < 100 || frequencyRaw > 10000) throw new Error("frequency must be between 100 and 10000 blocks.");
    if (schedulerGasRaw < 200000 || schedulerGasRaw > 5000000) throw new Error("schedulerGas must be between 200,000 and 5,000,000.");
    if (frequencyRaw * numCallsRaw > 10000) throw new Error("frequency × numCalls must be ≤ 10,000 (Scheduler MAX_LIFESPAN).");
    if (![0, 2, 5].includes(cliTypeRaw)) throw new Error("cliType must be 0 (zeroclaw), 2 (hermes), or 5 (crush).");
    if (schedulerTtlRaw < 500 || schedulerTtlRaw > 20000) throw new Error("schedulerTtl must be between 500 and 20000 blocks.");
    if (schedulerTtlRaw < frequencyRaw) throw new Error(`schedulerTtl (${schedulerTtlRaw}) must be ≥ frequency (${frequencyRaw}) to give the system executor a full wakeup window.`);
    const numCalls = numCallsRaw;
    const frequency = frequencyRaw;
    const schedulerGas = schedulerGasRaw;
    const cliType = cliTypeRaw;
    const schedulerTtl = schedulerTtlRaw;
    const salt = keccak256(toUtf8Bytes(saltLabel));
    const { harness, codeHash } = await predictHarness(owner, salt);
    const existingCode = (await rpc("eth_getCode", [harness, "latest"])) as string;
    const deployData = factoryInterface.encodeFunctionData("deployHarness", [salt]);
    const calldata = buildCalldata({ harness, prompt, hfRepoId, encryptedSecrets, executor, numCalls, model, frequency, schedulerGas, cliType, schedulerTtl });
    const health = await getExecutorHealth();
    const fundingEther = (Number(fundingWei) / 1e18).toFixed(2);
    const schedule = {
      value: fundingEther,
      valueWei: fundingWei.toString(),
      numCalls,
      frequency,
      schedulerGas,
      schedulerTtl,
      maxFeePerGas: "20000000000",
      maxPriorityFeePerGas: "1000000000",
    };

    return NextResponse.json({
      ok: true,
      chainId: 1979,
      rpcUrl: RPC_URL,
      factory: FACTORY,
      owner,
      saltLabel,
      salt,
      harness,
      codeHash,
      executor,
      alreadyDeployed: existingCode !== "0x",
      existingBytecodeBytes: existingCode === "0x" ? 0 : (existingCode.length - 2) / 2,
      templateBytes: TEMPLATE_BYTES,
      deployTx: {
        to: FACTORY,
        data: deployData,
        value: "0x0",
        gas: "0x2dc6c0",
      },
      configureTx: {
        to: harness,
        data: calldata,
        value: hexNumber(fundingWei),
        gas: "0x3567e0",
      },
      ownerBalanceWei: ownerBalanceWei.toString(),
      calldataPreview: {
        selector: calldata.slice(0, 10),
        bytes: (calldata.length - 2) / 2,
        encryptedSecretBytes: (encryptedSecrets.length - 2) / 2,
      },
      health,
      schedule,
      hfRepoId,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to prepare deployment." },
      { status: 400 },
    );
  }
}

export async function GET() {
  try {
    const health = await getExecutorHealth();
    return NextResponse.json({
      ok: true,
      chainId: 1979,
      rpcUrl: RPC_URL,
      factory: FACTORY,
      health,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load deploy health." },
      { status: 500 },
    );
  }
}
