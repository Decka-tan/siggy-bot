"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

const RITUAL_WALLET = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948";
const CHAIN_ID_HEX = "0x7bb";
const RPC_URL = "https://rpc.ritualfoundation.org";
const DEPOSIT_FOR_SELECTOR = "0x2f4f21e2";
const LOCK_BLOCKS = 100_000_000n;
const TOPUP_OPTIONS = ["0.1", "0.2", "0.5", "1.0"];
const COST_PER_WAKEUP_RIT = 0.002;

type Verify = {
  ok: boolean;
  agent: string;
  blockNumber: number;
  deployed: boolean;
  bytecodeBytes: number;
  templateMatch: boolean;
  hasStartSelector?: boolean;
  hasCallbackSelector?: boolean;
  hasRejectedV4Callback?: boolean;
  listed: boolean;
  lastActivityBlock: number | null;
  escrowWei?: string;
  escrowRit: string;
  explorerUrl: string;
  error?: string;
};

function short(value = "") {
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function pad(value: string) {
  return value.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function toHexBigInt(value: bigint) {
  return `0x${value.toString(16)}`;
}

export default function AgentRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg pt-28 text-text-primary" />}>
      <AgentPage />
    </Suspense>
  );
}

function AgentPage() {
  const params = useParams<{ address: string }>();
  const agentAddress = (params?.address || "").toLowerCase();
  const validAgent = /^0x[0-9a-fA-F]{40}$/.test(agentAddress);

  const [verify, setVerify] = useState<Verify | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [topupAmount, setTopupAmount] = useState("0.1");
  const [topupHash, setTopupHash] = useState("");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [walletBalance, setWalletBalance] = useState<string | null>(null);

  const connected = Boolean(account);
  const chainOk = chainId.toLowerCase() === CHAIN_ID_HEX;
  const balanceNum = walletBalance ? parseFloat(walletBalance) : 0;
  const needRit = parseFloat(topupAmount || "0") + 0.005;
  const balanceOk = !connected || !walletBalance || balanceNum >= needRit;
  const canTopup = validAgent && connected && chainOk && balanceOk;

  const wakeupsLeft = useMemo(() => {
    if (!verify?.escrowRit) return null;
    const rit = parseFloat(verify.escrowRit);
    return Math.floor(rit / COST_PER_WAKEUP_RIT);
  }, [verify?.escrowRit]);

  const blocksSinceActivity = useMemo(() => {
    if (!verify?.lastActivityBlock || !verify?.blockNumber) return null;
    return verify.blockNumber - verify.lastActivityBlock;
  }, [verify?.lastActivityBlock, verify?.blockNumber]);

  const status: "loading" | "active" | "dormant" | "missing" = useMemo(() => {
    if (!verify) return "loading";
    if (!verify.deployed) return "missing";
    if (verify.listed) return "active";
    return "dormant";
  }, [verify]);

  async function loadWalletBalance(addr: string) {
    if (!addr) return;
    try {
      const r = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [addr, "latest"] }),
      });
      const j = await r.json();
      const wei = BigInt(j.result || "0x0");
      setWalletBalance((Number(wei) / 1e18).toFixed(4));
    } catch {
      setWalletBalance(null);
    }
  }

  async function verifyAgent() {
    if (!validAgent) return;
    setBusy((b) => b || "verify");
    setError("");
    try {
      const res = await fetch(`/api/ritual/verify-agent?address=${agentAddress}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Verify failed");
      setVerify(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verify failed");
    } finally {
      setBusy((b) => (b === "verify" ? "" : b));
    }
  }

  useEffect(() => {
    if (!validAgent) return;
    verifyAgent();
    const timer = window.setInterval(verifyAgent, 60_000);
    return () => window.clearInterval(timer);
  }, [agentAddress]);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accs: string[]) => {
      const next = accs?.[0] || "";
      if (next) {
        setAccount(next);
        loadWalletBalance(next);
      }
    });
    window.ethereum.request({ method: "eth_chainId" }).then(setChainId);

    const onAccounts = (accs: string[]) => {
      const next = accs?.[0] || "";
      setAccount(next);
      if (next) loadWalletBalance(next);
    };
    const onChain = (id: string) => setChainId(id);
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, []);

  async function connect() {
    if (!window.ethereum) return;
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const next = accounts?.[0] || "";
    setAccount(next);
    setChainId(await window.ethereum.request({ method: "eth_chainId" }));
    if (next) loadWalletBalance(next);
  }

  async function changeWallet() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const next = accounts?.[0] || "";
      setAccount(next);
      setTopupHash("");
      if (next) loadWalletBalance(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Change wallet failed.");
    }
  }

  async function disconnect() {
    setAccount("");
    setWalletBalance(null);
    setTopupHash("");
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // wallet doesn't support revokePermissions — UI state is reset
    }
  }

  async function switchChain() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
    } catch (e: any) {
      if (e?.code !== 4902) throw e;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "Ritual Testnet",
            nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ["https://explorer.ritualfoundation.org"],
          },
        ],
      });
    }
    setChainId(await window.ethereum.request({ method: "eth_chainId" }));
  }

  async function topup() {
    if (!window.ethereum || !validAgent) return;
    setBusy("topup");
    setError("");
    setTopupHash("");
    try {
      const amountFloat = parseFloat(topupAmount);
      const valueWei = BigInt(Math.round(amountFloat * 1e6)) * 10n ** 12n;
      const data = `${DEPOSIT_FOR_SELECTOR}${pad(agentAddress)}${pad(LOCK_BLOCKS.toString(16))}`;
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: RITUAL_WALLET,
            data,
            value: toHexBigInt(valueWei),
            gas: "0x186a0",
          },
        ],
      });
      setTopupHash(hash);
      window.setTimeout(() => {
        loadWalletBalance(account);
        verifyAgent();
      }, 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setBusy("");
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1200);
  }

  if (!validAgent) {
    return (
      <div className="min-h-screen bg-bg pt-28 text-text-primary">
        <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="border border-red-500/40 bg-red-500/10 p-6 text-red-100">
            <p className="font-mono text-xs uppercase tracking-wider">Invalid agent address</p>
            <p className="mt-2 text-sm">URL should look like /agent/0xYourHarnessAddress</p>
            <Link href="/deploy" className="mt-4 inline-flex items-center gap-2 text-accent hover:underline">
              Go to Deploy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-24 sm:px-6 lg:px-8">
        <header className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
              <Activity className="h-4 w-4" />
              Sovereign Agent Monitor
            </div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Agent <span className="text-accent">{short(agentAddress)}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-text-secondary">
              <span className="truncate">{agentAddress}</span>
              <button onClick={() => copy(agentAddress, "addr")} title="Copy" className="text-text-secondary hover:text-accent">
                {copied === "addr" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={verifyAgent}
              className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
            >
              <RefreshCw className={`h-4 w-4 ${busy === "verify" ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <a
              href={`https://explorer.ritualfoundation.org/address/${agentAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
            >
              Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-3 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard
            title="Status"
            value={status === "loading" ? "—" : status === "active" ? "LISTED" : status === "dormant" ? "Dormant" : "Not deployed"}
            tone={status === "active" ? "good" : status === "dormant" ? "warn" : "bad"}
          />
          <StatusCard
            title="Escrow"
            value={verify ? `${verify.escrowRit} RIT` : "—"}
            sub={wakeupsLeft !== null ? `~${wakeupsLeft.toLocaleString()} wakeups left` : ""}
            tone={verify && parseFloat(verify.escrowRit) < 0.02 ? "warn" : "good"}
          />
          <StatusCard
            title="Last activity"
            value={verify?.lastActivityBlock ? `block ${verify.lastActivityBlock.toLocaleString()}` : "no activity yet"}
            sub={blocksSinceActivity !== null ? `${blocksSinceActivity.toLocaleString()} blocks ago` : ""}
            tone={blocksSinceActivity !== null && blocksSinceActivity > 50000 ? "warn" : "good"}
          />
        </div>

        <section className="border border-border bg-surface p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-secondary">
            <ShieldCheck className="h-4 w-4" /> Bytecode integrity
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Check label="Deployed" ok={Boolean(verify?.deployed)} detail={verify?.bytecodeBytes ? `${verify.bytecodeBytes.toLocaleString()} bytes` : ""} />
            <Check label="Template match" ok={Boolean(verify?.templateMatch)} detail="10822 bytes" />
            <Check label="Start selector" ok={Boolean(verify?.hasStartSelector)} detail="0xb1906702" />
            <Check label="Callback selector" ok={Boolean(verify?.hasCallbackSelector)} detail="0x18bb7d95" />
          </div>
        </section>

        <section className="border border-border bg-surface p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-secondary">
            <Coins className="h-4 w-4" /> Top up escrow
          </h2>

          <p className="text-sm text-text-secondary">
            Each scheduled wakeup burns ~{COST_PER_WAKEUP_RIT} RIT from the harness escrow. When the escrow hits zero, the scheduler
            stops and the agent eventually de-lists from the cache. Refill anytime to keep it alive.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-4 gap-2">
              {TOPUP_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTopupAmount(opt)}
                  className={`border px-3 py-3 font-mono text-sm uppercase tracking-wider ${
                    topupAmount === opt ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/60"
                  }`}
                >
                  {opt} RIT
                </button>
              ))}
            </div>
            <div className="text-xs text-text-secondary">
              +{Math.floor(parseFloat(topupAmount) / COST_PER_WAKEUP_RIT).toLocaleString()} wakeups
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            {!connected ? (
              <button
                onClick={connect}
                className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
              >
                <Wallet className="h-4 w-4" /> Connect to top up
              </button>
            ) : !chainOk ? (
              <button
                onClick={switchChain}
                className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
              >
                Switch to Ritual Testnet 1979
              </button>
            ) : (
              <button
                onClick={topup}
                disabled={!canTopup || busy === "topup"}
                className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "topup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                Top up {topupAmount} RIT
              </button>
            )}
            {walletBalance !== null && (
              <div className="text-right font-mono text-xs text-text-secondary">
                Wallet balance: <span className={balanceOk ? "text-text-primary" : "text-amber-300"}>{walletBalance} RIT</span>
              </div>
            )}
          </div>

          {connected && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-text-secondary">Connected as <span className="text-text-primary">{short(account)}</span></span>
              <button onClick={changeWallet} className="border border-border px-3 py-1.5 font-mono uppercase tracking-wider text-accent hover:border-accent">
                Change
              </button>
              <button onClick={disconnect} className="border border-border px-3 py-1.5 font-mono uppercase tracking-wider text-text-secondary hover:border-red-400/60 hover:text-red-300">
                Disconnect
              </button>
            </div>
          )}

          {topupHash && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border border-emerald-400/40 bg-emerald-400/10 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-mono">Top-up submitted</span>
              <span className="min-w-0 truncate font-mono">{topupHash}</span>
              <a
                href={`https://explorer.ritualfoundation.org/tx/${topupHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-text-secondary">
          Auto-refreshing every 60s. Last RPC at block {verify?.blockNumber?.toLocaleString() || "—"}.
        </p>
      </section>
    </div>
  );
}

function StatusCard({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone: "good" | "warn" | "bad" }) {
  const colour = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-red-300";
  return (
    <div className="border border-border bg-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">{title}</p>
      <p className={`mt-2 font-display text-3xl ${colour}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

function Check({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="border border-border bg-bg p-4">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xs text-text-primary">{detail}</p>
    </div>
  );
}
