"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
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
const BALANCE_OF_SELECTOR = "0x70a08231";
const LOCK_BLOCKS = 100_000_000n; // ~1 year at 350ms blocks
const FUND_OPTIONS = ["0.05", "0.1", "0.2", "0.5"];

function pad(value: string) {
  return value.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function toHexBigInt(value: bigint) {
  return `0x${value.toString(16)}`;
}

export default function TopupRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg pt-28 text-text-primary" />}>
      <TopupPage />
    </Suspense>
  );
}

function TopupPage() {
  const search = useSearchParams();
  const initialAddress = search?.get("address") || "";

  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [agent, setAgent] = useState(initialAddress);
  const [amount, setAmount] = useState("0.1");
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState("");

  const validAddress = /^0x[0-9a-fA-F]{40}$/.test(agent.trim());
  const connected = Boolean(account);
  const chainOk = chainId.toLowerCase() === CHAIN_ID_HEX;
  const amountFloat = parseFloat(amount || "0");
  const needRit = amountFloat + 0.005;
  const balanceNum = walletBalance ? parseFloat(walletBalance) : 0;
  const balanceOk = !connected || !walletBalance || balanceNum >= needRit;

  const canSend = connected && chainOk && balanceOk && validAddress && amountFloat >= 0.01;

  async function rpcCall(method: string, params: unknown[] = []) {
    const r = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || method);
    return j.result;
  }

  async function loadWalletBalance(addr: string) {
    if (!addr) return;
    try {
      const hex = (await rpcCall("eth_getBalance", [addr, "latest"])) as string;
      setWalletBalance((Number(BigInt(hex)) / 1e18).toFixed(4));
    } catch {
      setWalletBalance(null);
    }
  }

  async function loadEscrow() {
    if (!validAddress) return;
    setBusy((b) => b || "escrow");
    try {
      const data = `${BALANCE_OF_SELECTOR}${pad(agent)}`;
      const result = (await rpcCall("eth_call", [{ to: RITUAL_WALLET, data }, "latest"])) as string;
      const wei = BigInt(result || "0x0");
      setEscrowBalance((Number(wei) / 1e18).toFixed(4));
    } catch {
      setEscrowBalance(null);
    } finally {
      setBusy((b) => (b === "escrow" ? "" : b));
    }
  }

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

  useEffect(() => {
    if (validAddress) loadEscrow();
  }, [validAddress, agent, txHash]);

  async function connect() {
    setError("");
    if (!window.ethereum) {
      setError("Wallet extension not found.");
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const next = accounts?.[0] || "";
    setAccount(next);
    setChainId(await window.ethereum.request({ method: "eth_chainId" }));
    if (next) loadWalletBalance(next);
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
    if (!window.ethereum) return;
    setBusy("topup");
    setError("");
    setTxHash("");
    try {
      const valueWei = BigInt(Math.round(amountFloat * 1e6)) * 10n ** 12n;
      const data = `${DEPOSIT_FOR_SELECTOR}${pad(agent)}${pad(LOCK_BLOCKS.toString(16))}`;
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: RITUAL_WALLET,
            data,
            value: toHexBigInt(valueWei),
            gas: "0x186a0", // 100k
          },
        ],
      });
      setTxHash(hash);
      window.setTimeout(() => {
        loadWalletBalance(account);
        loadEscrow();
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed.");
    } finally {
      setBusy("");
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1200);
  }

  return (
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto grid w-full max-w-4xl gap-8 px-4 pb-24 sm:px-6 lg:px-8">
        <header className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
              <Coins className="h-4 w-4" />
              Top up escrow
            </div>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
              Refill your <span className="text-accent">Sovereign Agent</span>
            </h1>
            <p className="max-w-xl text-sm leading-6 text-text-secondary">
              Send RITUAL to your harness&apos; RitualWallet escrow so the scheduler keeps paying for wakeups.
              ~0.002 RIT covers one wakeup. Top up 0.1 RIT for ~50 more.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/deploy"
                className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Back to Deploy
              </Link>
            </div>
          </div>
          <div className="relative mx-auto h-40 w-40 sm:h-48 sm:w-48">
            <Image src="/character.png" alt="Siggy" fill className="object-contain" sizes="192px" />
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-3 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="border border-border bg-surface p-5">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-secondary">1. Connect Wallet</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="border border-border bg-bg p-4 font-mono text-sm text-text-secondary">
              {account || "Not connected"}
            </div>
            <button
              onClick={connect}
              className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
            >
              <Wallet className="h-4 w-4" />
              {account ? "Reconnect" : "Connect wallet"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {connected && <Pill ok label={`Wallet ${short(account)}`} />}
            {connected && <Pill ok={chainOk} label={chainOk ? "Ritual Testnet 1979" : `Wrong chain ${chainId || "-"}`} />}
            {!chainOk && connected && (
              <button onClick={switchChain} className="border border-border px-3 py-1.5 font-mono uppercase tracking-wider text-accent hover:border-accent">
                Switch chain
              </button>
            )}
            {walletBalance !== null && <Pill ok={balanceOk} label={`Balance ${walletBalance} RIT`} />}
          </div>
        </section>

        <section className="border border-border bg-surface p-5">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-secondary">2. Agent address</h2>
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="0x..."
            className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
          />
          {validAddress && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border border-border bg-bg p-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">Current escrow</p>
                <p className="mt-1 font-mono text-2xl text-text-primary">{escrowBalance ?? "—"} <span className="text-sm text-text-secondary">RIT</span></p>
                <button onClick={loadEscrow} className="mt-3 inline-flex items-center gap-2 text-xs text-text-secondary hover:text-accent">
                  <RefreshCw className={`h-4 w-4 ${busy === "escrow" ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>
              <div className="border border-border bg-bg p-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">Estimated wakeups</p>
                <p className="mt-1 font-mono text-2xl text-text-primary">
                  {escrowBalance ? Math.floor(parseFloat(escrowBalance) / 0.002).toLocaleString() : "—"}
                </p>
                <p className="mt-1 text-xs text-text-secondary">at ~0.002 RIT per wakeup</p>
              </div>
            </div>
          )}
        </section>

        <section className="border border-border bg-surface p-5">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-secondary">3. Choose amount</h2>
          <div className="grid grid-cols-4 gap-2">
            {FUND_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setAmount(opt)}
                className={`border px-3 py-3 font-mono text-sm uppercase tracking-wider ${
                  amount === opt ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/60"
                }`}
              >
                {opt} RIT
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            {amount} RIT ≈ <span className="font-mono text-text-primary">{Math.floor(amountFloat / 0.002).toLocaleString()}</span> wakeups
          </p>
          {!balanceOk && connected && walletBalance && (
            <p className="mt-2 text-xs text-amber-300">Wallet has {walletBalance} RIT — pick a smaller amount or top up faucet.</p>
          )}
        </section>

        <section className="border border-border bg-surface p-5">
          <button
            onClick={topup}
            disabled={!canSend || busy === "topup"}
            className="inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-4 font-mono text-sm uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "topup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            Top up {amount} RIT
          </button>

          {txHash && (
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-mono text-sm">Top-up tx submitted</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 border border-border bg-bg p-3 font-mono text-xs">
                <span className="min-w-0 truncate text-text-secondary">{txHash}</span>
                <button onClick={() => copy(txHash, "tx")} className="text-text-secondary hover:text-accent" title="Copy">
                  {copied === "tx" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={`https://explorer.ritualfoundation.org/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono uppercase tracking-wider ${
        ok ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/50 text-amber-300"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function short(value = "") {
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
