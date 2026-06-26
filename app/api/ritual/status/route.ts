import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.RITUAL_RPC_URL || process.env.RPC_URL || "https://rpc.ritualfoundation.org";
const EXPLORER_CACHE = "https://explorer.ritualfoundation.org/api/agents/cache";

const OWNER = "0x35292cb972eF6233E5d7651Ef7adBe0C1b2E5CCd";
const AGENT = "0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537";
const FACTORY = "0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304";
const RITUAL_WALLET = "0x532f0df0896f353d8c3dd8cc134e8129da2a3948";
const SCHEDULER_CALL_ID = "2742077";
const DEPLOY_TX = "0x8f23d29a7aa5176f443b0e17a638ae8e33b55004799302c82faea749894ece0e";
const CONFIGURE_TX = "0x8705fa7b077bf1d2654a90e6a4fcf3a9e89eb2056ec2e171b59ce098602732f1";

type JsonRpcResult = {
  result?: string;
  error?: { message?: string };
};

function padAddress(address: string) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function hexToBigInt(hex?: string) {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function formatEther(value: bigint) {
  const base = 10n ** 18n;
  const whole = value / base;
  const fraction = value % base;
  const trimmed = fraction.toString().padStart(18, "0").replace(/0+$/, "").slice(0, 6);
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

async function rpc(method: string, params: unknown[] = []) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const data = (await response.json()) as JsonRpcResult;
  if (data.error) throw new Error(data.error.message || `RPC ${method} failed`);
  return data.result || "0x";
}

export async function GET() {
  try {
    const cachePromise = fetch(EXPLORER_CACHE, { cache: "no-store" }).then((r) => r.json());
    const blockPromise = rpc("eth_blockNumber");
    const ownerBalancePromise = rpc("eth_getBalance", [OWNER, "latest"]);
    const agentCodePromise = rpc("eth_getCode", [AGENT, "latest"]);
    const escrowPromise = rpc("eth_call", [
      {
        to: RITUAL_WALLET,
        data: `0x70a08231${padAddress(AGENT)}`,
      },
      "latest",
    ]);

    const [cache, blockHex, ownerBalanceHex, agentCode, escrowHex] = await Promise.all([
      cachePromise,
      blockPromise,
      ownerBalancePromise,
      agentCodePromise,
      escrowPromise,
    ]);

    const sovereign = Array.isArray(cache?.sovereign) ? cache.sovereign : [];
    const agentHit = sovereign.find((item: { address?: string }) => item.address?.toLowerCase() === AGENT.toLowerCase());
    const bytecodeBytes = agentCode && agentCode !== "0x" ? (agentCode.length - 2) / 2 : 0;
    const ownerBalanceWei = hexToBigInt(ownerBalanceHex);
    const escrowWei = hexToBigInt(escrowHex);

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      rpcUrl: RPC_URL,
      chainId: 1979,
      blockNumber: Number(hexToBigInt(blockHex)),
      owner: OWNER,
      agent: AGENT,
      factory: FACTORY,
      ritualWallet: RITUAL_WALLET,
      deployTx: DEPLOY_TX,
      configureTx: CONFIGURE_TX,
      schedulerCallId: SCHEDULER_CALL_ID,
      listed: Boolean(agentHit),
      lastActivityBlock: agentHit?.lastActivityBlock || null,
      cacheSovereignCount: sovereign.length,
      bytecodeBytes,
      templateMatch: bytecodeBytes === 10822,
      ownerBalanceWei: ownerBalanceWei.toString(),
      ownerBalanceRit: formatEther(ownerBalanceWei),
      escrowWei: escrowWei.toString(),
      escrowRit: formatEther(escrowWei),
      explorerUrl: `https://explorer.ritualfoundation.org/agents/${AGENT}?type=sovereign`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Ritual status error",
      },
      { status: 500 },
    );
  }
}
