import { NextResponse } from "next/server";
import { Interface, isAddress } from "ethers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RPC_URL = process.env.RITUAL_RPC_URL || process.env.RPC_URL || "https://rpc.ritualfoundation.org";
const REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F";

const registryInterface = new Interface([
  "function getServicesByCapability(uint8 capability, bool active) view returns (((address a,address b,uint8 c,bytes d,string e,bytes32 f,uint8 g) node,bool v,bytes32 w)[])",
]);

type JsonRpc = { result?: string; error?: { message?: string } };

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

export async function GET() {
  try {
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

    return NextResponse.json({
      ok: true,
      chainId: 1979,
      executor,
      publicKey,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch executor." },
      { status: 500 },
    );
  }
}
