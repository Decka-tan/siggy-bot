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
const MIN_FUNDING_WEI = 50_000_000_000_000_000n; // 0.05 RIT — below this, escrow likely drains before MONITORED state
const DEFAULT_FUNDING_WEI = 100_000_000_000_000_000n; // 0.1 RIT — proven sufficient
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
}: {
  harness: string;
  prompt: string;
  hfRepoId: string;
  encryptedSecrets: string;
  executor: string;
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
    5,
    prompt,
    encryptedSecrets,
    ["hf", `${hfRepoId}/sessions/session-001.jsonl`, "HF_TOKEN"],
    ["hf", `${hfRepoId}/artifacts/`, "HF_TOKEN"],
    [],
    ["hf", `${hfRepoId}/prompts/default-system.md`, ""],
    "gpt-4o-mini",
    [],
    50,
    8192,
    "",
  ];
  const schedule = [1800000, 180, 500, 20000000000, 1000000000, 0];
  const rolling = [30, 5000, 1];
  const lockDuration = 100000000;
  const calldata = configureInterface.encodeFunctionData("configureFundAndStart", [params, schedule, rolling, lockDuration]);

  if (!calldata.startsWith("0xb1906702")) {
    throw new Error(`configure selector mismatch: ${calldata.slice(0, 10)}`);
  }
  return calldata;
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

    if (!isAddress(owner)) throw new Error("Connect a valid wallet first.");
    if (!prompt) throw new Error("Prompt is required.");
    if (!/^[\w.-]+\/[\w.-]+$/.test(hfRepoId)) throw new Error("HF repo must be in user/repo format.");
    if (!/^0x[0-9a-fA-F]+$/.test(encryptedSecrets) || encryptedSecrets.length < 200) {
      throw new Error("encryptedSecrets must be a hex blob from client-side ECIES encryption.");
    }
    if (!isAddress(executor)) throw new Error("Invalid executor address from client.");

    // Re-fetch executor from registry to verify it still matches client-side encryption target.
    // If executor rotated between get-executor and prepare-deploy, abort so user re-encrypts.
    const live = await getExecutor();
    if (live.executor.toLowerCase() !== executor.toLowerCase()) {
      throw new Error(
        `Executor rotated since you opened the page (${executor.slice(0, 10)} → ${live.executor.slice(0, 10)}). Re-prepare to encrypt for the new executor.`,
      );
    }

    const salt = keccak256(toUtf8Bytes(saltLabel));
    const { harness, codeHash } = await predictHarness(owner, salt);
    const existingCode = (await rpc("eth_getCode", [harness, "latest"])) as string;
    const deployData = factoryInterface.encodeFunctionData("deployHarness", [salt]);
    const calldata = buildCalldata({ harness, prompt, hfRepoId, encryptedSecrets, executor });
    const health = await getExecutorHealth();
    const schedule = {
      value: "0.5",
      valueWei: "500000000000000000",
      numCalls: 30,
      frequency: 180,
      schedulerGas: 1800000,
      schedulerTtl: 500,
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
        value: hexNumber(500000000000000000n),
        gas: "0x3567e0",
      },
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
