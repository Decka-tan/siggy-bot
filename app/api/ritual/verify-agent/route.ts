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

    const [cache, blockHex, code, escrowHex] = await Promise.all([
      fetch(EXPLORER_CACHE, { cache: "no-store" }).then((r) => r.json()),
      rpc("eth_blockNumber"),
      rpc("eth_getCode", [agent, "latest"]),
      rpc("eth_call", [
        {
          to: RITUAL_WALLET,
          data: `0x70a08231${padAddress(agent)}`,
        },
        "latest",
      ]),
    ]);

    const sovereign = Array.isArray(cache?.sovereign) ? cache.sovereign : [];
    const hit = sovereign.find((item: { address?: string }) => item.address?.toLowerCase() === agent.toLowerCase());
    const bytecodeBytes = code === "0x" ? 0 : (code.length - 2) / 2;
    const escrowWei = hexToBigInt(escrowHex);

    return NextResponse.json({
      ok: true,
      agent,
      blockNumber: Number(hexToBigInt(blockHex)),
      deployed: code !== "0x",
      bytecodeBytes,
      templateMatch: bytecodeBytes === 10822,
      listed: Boolean(hit),
      lastActivityBlock: hit?.lastActivityBlock || null,
      escrowWei: escrowWei.toString(),
      escrowRit: formatEther(escrowWei),
      explorerUrl: `https://explorer.ritualfoundation.org/agents/${agent}?type=sovereign`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to verify agent." },
      { status: 400 },
    );
  }
}
