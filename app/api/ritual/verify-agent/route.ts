import { NextResponse } from "next/server";
import { isAddress } from "ethers";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.RITUAL_RPC_URL || process.env.RPC_URL || "https://rpc.ritualfoundation.org";
const EXPLORER_CACHE = "https://explorer.ritualfoundation.org/api/agents/cache";
const RITUAL_WALLET = "0x532f0df0896f353d8c3dd8cc134e8129da2a3948";

type JsonRpc = { result?: string; error?: { message?: string } };

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
  const data = (await response.json()) as JsonRpc;
  if (data.error) throw new Error(data.error.message || `${method} failed`);
  return data.result || "0x";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const agent = url.searchParams.get("address") || "";
    if (!isAddress(agent)) throw new Error("Invalid agent address.");

    const SCHEDULER = "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B";
    const ASYNC_DELIVERY = "0x5A16214fF555848411544b005f7Ac063742f39F6";
    const padded = padAddress(agent);
    const latestHex = (await rpc("eth_blockNumber")) as string;
    const latestNum = Number(hexToBigInt(latestHex));
    // Ritual RPC caps eth_getLogs at 100k blocks. Stay under to keep this endpoint stable.
    const lookback = Math.max(0, latestNum - 99_000); // ~9.6h history cap at 350ms blocks
    const fromHex = `0x${lookback.toString(16)}`;

    // Core RPC calls — must always succeed for the page to render.
    const [cache, code, escrowHex] = await Promise.all([
      fetch(EXPLORER_CACHE, { cache: "no-store" }).then((r) => r.json()),
      rpc("eth_getCode", [agent, "latest"]),
      rpc("eth_call", [
        {
          to: RITUAL_WALLET,
          data: `0x70a08231${padded}`,
        },
        "latest",
      ]),
    ]);

    const bytecodeBytes = code === "0x" ? 0 : (code.length - 2) / 2;
    const escrowWei = hexToBigInt(escrowHex);
    const lowerCode = (code || "0x").toLowerCase();
    const hasStartSelector = lowerCode.includes("b1906702");
    const hasCallbackSelector = lowerCode.includes("18bb7d95");
    const hasRejectedV4Callback = lowerCode.includes("80b63e7e");
    const templateMatch =
      bytecodeBytes === 10822 && hasStartSelector && hasCallbackSelector && !hasRejectedV4Callback;
    const isSovereign = templateMatch || hasStartSelector;

    // Optional activity logs — wrap in try so an RPC limit error doesn't blank the whole page.
    let schedLogs: unknown[] = [];
    let p2Logs: unknown[] = [];
    try {
      const p2LogsPromise = isSovereign
        ? rpc("eth_getLogs", [{ address: agent, fromBlock: fromHex, topics: ["0x0f46290068e3564761b6805b2330989b9ff59aa79006e68999e3047d22909c4f"] }])
        : rpc("eth_getLogs", [{ address: ASYNC_DELIVERY, fromBlock: fromHex, topics: [null, null, `0x${padded}`] }]);

      const res = await Promise.all([
        rpc("eth_getLogs", [{ address: SCHEDULER, fromBlock: fromHex, topics: [null, null, null, `0x${padded}`] }]),
        p2LogsPromise,
      ]);
      schedLogs = Array.isArray(res[0]) ? (res[0] as unknown[]) : [];
      p2Logs = Array.isArray(res[1]) ? (res[1] as unknown[]) : [];
    } catch {
      // RPC may cap fromBlock range or be temporarily down — return -1 so the UI shows "—"
      schedLogs = [];
      p2Logs = [];
    }

    const blockHex = latestHex;
    const wakeupAttempts = Array.isArray(schedLogs) ? schedLogs.length : 0;
    const phase2Deliveries = Array.isArray(p2Logs) ? p2Logs.length : 0;

    const sovereign = Array.isArray(cache?.sovereign) ? cache.sovereign : [];
    const hit = sovereign.find((item: { address?: string }) => item.address?.toLowerCase() === agent.toLowerCase());

    return NextResponse.json({
      ok: true,
      agent,
      blockNumber: Number(hexToBigInt(blockHex)),
      deployed: code !== "0x",
      bytecodeBytes,
      templateMatch,
      hasStartSelector,
      hasCallbackSelector,
      hasRejectedV4Callback,
      listed: Boolean(hit),
      lastActivityBlock: hit?.lastActivityBlock || null,
      escrowWei: escrowWei.toString(),
      escrowRit: formatEther(escrowWei),
      explorerUrl: `https://explorer.ritualfoundation.org/agents/${agent}?type=sovereign`,
      wakeupAttempts,
      phase2Deliveries,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to verify agent." },
      { status: 400 },
    );
  }
}
