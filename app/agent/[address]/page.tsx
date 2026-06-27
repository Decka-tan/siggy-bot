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
import { GoldenParticles } from "@/components/ui/GoldenParticles";

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
const COST_PER_WAKEUP_RIT = 0.02;
const DEFAULT_FREQUENCY_BLOCKS = 2000;
const AVG_BLOCK_SECONDS = 0.35;
const CALLBACK_GRACE_BLOCKS = Math.ceil((15 * 60) / AVG_BLOCK_SECONDS);
const PREPARED_KEY = "siggy.deploy.prepared.v1";

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
  wakeupAttempts?: number;
  phase2Deliveries?: number;
  lastSchedulerBlock?: number | null;
  error?: string;
};

type SavedSchedule = {
  frequency?: number;
  numCalls?: number;
  schedulerGas?: number;
  source: "saved" | "prepared" | "default";
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

function hexToBigInt(value?: string) {
  try {
    return value ? BigInt(value) : 0n;
  } catch {
    return 0n;
  }
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

  const [savedSalt, setSavedSalt] = useState<string>("");
  const [verify, setVerify] = useState<Verify | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [topupAmount, setTopupAmount] = useState("0.1");
  const [topupHash, setTopupHash] = useState("");
  const [retryHash, setRetryHash] = useState("");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [savedSchedule, setSavedSchedule] = useState<SavedSchedule>({ source: "default" });

  const connected = Boolean(account);
  const chainOk = chainId.toLowerCase() === CHAIN_ID_HEX;
  const balanceNum = walletBalance ? parseFloat(walletBalance) : 0;
  const needRit = parseFloat(topupAmount || "0") + 0.005;
  const balanceOk = !connected || !walletBalance || balanceNum >= needRit;
  const canTopup = validAgent && connected && chainOk && balanceOk;
  const fundedButNotScheduled =
    Boolean(verify?.templateMatch) &&
    parseFloat(verify?.escrowRit || "0") > 0 &&
    (verify?.wakeupAttempts ?? 0) === 0 &&
    (verify?.phase2Deliveries ?? 0) === 0 &&
    verify?.lastActivityBlock === null;
  const blocksSinceScheduler = verify?.lastSchedulerBlock && verify?.blockNumber
    ? verify.blockNumber - verify.lastSchedulerBlock
    : null;
  const schedulerWithoutCallback =
    Boolean(verify?.templateMatch) &&
    (verify?.wakeupAttempts ?? 0) > 0 &&
    (verify?.phase2Deliveries ?? 0) === 0 &&
    blocksSinceScheduler !== null &&
    blocksSinceScheduler >= CALLBACK_GRACE_BLOCKS;
  const topupPaused = fundedButNotScheduled || schedulerWithoutCallback;
  const effectiveFrequency = savedSchedule.frequency || DEFAULT_FREQUENCY_BLOCKS;

  const wakeupsLeft = useMemo(() => {
    if (!verify?.escrowRit) return null;
    const rit = parseFloat(verify.escrowRit);
    return Math.floor(rit / COST_PER_WAKEUP_RIT);
  }, [verify?.escrowRit]);

  const nextWakeup = useMemo(() => {
    if (!verify?.blockNumber || !verify.deployed || !effectiveFrequency) return null;
    const anchor = verify.lastSchedulerBlock || verify.lastActivityBlock;
    if (!anchor) {
      return {
        label: "waiting for first scheduler event",
        detail: savedSchedule.source === "default" ? "using default 2000-block schedule" : "schedule known from this browser",
      };
    }
    const nextBlock = anchor + effectiveFrequency;
    const blocksUntil = Math.max(0, nextBlock - verify.blockNumber);
    const minutes = Math.max(0, Math.round((blocksUntil * AVG_BLOCK_SECONDS) / 60));
    return {
      nextBlock,
      blocksUntil,
      minutes,
      label: blocksUntil === 0 ? "due now / executor pending" : `~${minutes} min`,
      detail: `${blocksUntil.toLocaleString()} blocks until block ${nextBlock.toLocaleString()}`,
    };
  }, [effectiveFrequency, savedSchedule.source, verify?.blockNumber, verify?.deployed, verify?.lastActivityBlock, verify?.lastSchedulerBlock]);

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
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("siggy.deployed.agents.v1");
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const match = list.find((r: any) => r?.address?.toLowerCase?.() === agentAddress);
      if (match?.saltLabel) setSavedSalt(String(match.saltLabel));
      if (match?.schedule?.frequency) {
        setSavedSchedule({
          frequency: Number(match.schedule.frequency),
          numCalls: match.schedule.numCalls ? Number(match.schedule.numCalls) : undefined,
          schedulerGas: match.schedule.schedulerGas ? Number(match.schedule.schedulerGas) : undefined,
          source: "saved",
        });
      }
    } catch {
      // ignore
    }
  }, [agentAddress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cache = JSON.parse(window.localStorage.getItem(PREPARED_KEY) || "{}");
      const scanned = Object.values(cache || {}).find((record: any) => {
        return String(record?.prepared?.harness || "").toLowerCase() === agentAddress.toLowerCase();
      }) as any;
      const schedule = scanned?.prepared?.schedule;
      if (!schedule?.frequency) return;
      setSavedSchedule((current) =>
        current.source === "saved"
          ? current
          : {
              frequency: Number(schedule.frequency),
              numCalls: schedule.numCalls ? Number(schedule.numCalls) : undefined,
              schedulerGas: schedule.schedulerGas ? Number(schedule.schedulerGas) : undefined,
              source: "prepared",
            },
      );
    } catch {
      // ignore
    }
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

  function readPreparedCache() {
    if (typeof window === "undefined") return null;
    try {
      const cache = JSON.parse(window.localStorage.getItem(PREPARED_KEY) || "{}");
      const direct = cache?.[`harness::${agentAddress.toLowerCase()}`]?.prepared;
      const key = account && savedSalt ? `${account.toLowerCase()}::${savedSalt.trim().toLowerCase()}` : "";
      const keyed = key ? cache?.[key]?.prepared : null;
      const scanned = Object.values(cache || {}).find((record: any) => {
        return String(record?.prepared?.harness || "").toLowerCase() === agentAddress.toLowerCase();
      }) as any;
      const hit = direct || keyed || scanned?.prepared;
      if (!hit?.configureTx?.data) return null;
      if (String(hit.harness || "").toLowerCase() !== agentAddress.toLowerCase()) return null;
      return hit as { harness: string; configureTx: { to: string; data: string; gas?: string; value?: string } };
    } catch {
      return null;
    }
  }

  async function retrySchedule() {
    if (!window.ethereum || !validAgent) return;
    setBusy("retry");
    setError("");
    setRetryHash("");
    try {
      const prepared = readPreparedCache();
      if (!prepared) {
        throw new Error("Retry data not found in this browser. Open the deployer with the same salt label and prepare again.");
      }
      const retryValue = hexToBigInt(prepared.configureTx.value);
      if (retryValue <= 0n) {
        throw new Error("Retry data is missing the original funding value. Open the deployer with the same salt label and prepare again.");
      }
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: prepared.configureTx.to,
            data: prepared.configureTx.data,
            value: toHexBigInt(retryValue),
            gas: prepared.configureTx.gas || "0x4c4b40",
          },
        ],
      });
      setRetryHash(hash);
      window.setTimeout(() => {
        loadWalletBalance(account);
        verifyAgent();
      }, 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry schedule failed");
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
    <div className="relative min-h-screen bg-bg pt-28 text-text-primary overflow-hidden">
      {/* Ambient background particles */}
      <GoldenParticles mode="ambient" />
      
      {/* Celebratory confetti if active */}
      {status === "active" && <GoldenParticles mode="celebration" />}

      {/* Decorative background glows */}
      <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[150px] pointer-events-none" />

      <section className="relative z-10 mx-auto w-full max-w-5xl space-y-6 px-4 pb-24 sm:px-6 lg:px-8">
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
              className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${busy === "verify" ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <a
              href={`https://explorer.ritualfoundation.org/address/${agentAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent transition-all"
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

        {verify?.templateMatch && parseFloat(verify.escrowRit || "0") === 0 && verify.lastActivityBlock === null && (
          <div className="border border-amber-400/40 bg-amber-400/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="space-y-2">
                <p className="font-mono text-sm uppercase tracking-wider text-amber-200">Harness deployed but NOT funded</p>
                <p className="text-sm leading-6 text-text-secondary">
                  Looks like you signed transaction 1 (deploy) but never signed transaction 2 (fund + arm schedule).
                  Top-up alone won&apos;t start it — the schedule was never configured.
                </p>
                <p className="text-sm leading-6 text-text-secondary">
                  Open the deployer{savedSalt ? <> with salt label <code className="text-text-primary">{savedSalt}</code></> : ""},
                  fill the form again with the <b>same salt label</b>, click <b>Prepare deploy</b>, and sign the second
                  transaction. The first one will be auto-skipped.
                </p>
                <Link
                  href={savedSalt ? `/deploy/sovereign?salt=${encodeURIComponent(savedSalt)}` : "/deploy/sovereign"}
                  className="mt-1 inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                >
                  Resume deploy {savedSalt ? "(salt pre-filled)" : ""}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {fundedButNotScheduled && (
          <div className="border border-amber-400/40 bg-amber-400/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="space-y-3">
                <p className="font-mono text-sm uppercase tracking-wider text-amber-200">Funded but scheduler has not fired</p>
                <p className="text-sm leading-6 text-text-secondary">
                  Escrow exists, but there are no scheduler events yet. Top-up only adds funds; it does not retry the start call.
                  If this browser still has the prepared deployment data, retry the original fund/start transaction value.
                </p>
                <div className="flex flex-wrap gap-2">
                  {!connected ? (
                    <button
                      onClick={connect}
                      className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                    >
                      <Wallet className="h-4 w-4" /> Connect wallet
                    </button>
                  ) : !chainOk ? (
                    <button
                      onClick={switchChain}
                      className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                    >
                      Switch to Ritual Testnet
                    </button>
                  ) : (
                    <button
                      onClick={retrySchedule}
                      disabled={busy === "retry"}
                      className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === "retry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Retry fund/start
                    </button>
                  )}
                  {savedSalt && (
                    <Link
                      href={`/deploy/sovereign?salt=${encodeURIComponent(savedSalt)}`}
                      className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent transition-all"
                    >
                      Open deployer
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
                {retryHash && (
                  <div className="flex flex-wrap items-center gap-2 border border-emerald-400/40 bg-emerald-400/10 p-3 text-xs text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-mono">Retry submitted</span>
                    <span className="min-w-0 truncate font-mono">{retryHash}</span>
                    <a
                      href={`https://explorer.ritualfoundation.org/tx/${retryHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {schedulerWithoutCallback && (
          <div className="border border-red-400/40 bg-red-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              <div className="space-y-2">
                <p className="font-mono text-sm uppercase tracking-wider text-red-200">Scheduler fired but TEE callback never landed</p>
                <p className="text-sm leading-6 text-text-secondary">
                  The schedule is spending escrow, but this monitor has not seen a Phase 2 callback from the TEE. Do not top up yet.
                  Check HF/API/model settings and deploy a fresh agent if this stays unchanged after another wakeup.
                </p>
              </div>
            </div>
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
            sub={wakeupsLeft !== null ? `~${wakeupsLeft.toLocaleString()} wakeups at conservative ~0.02 RIT reserve` : ""}
            tone={verify && parseFloat(verify.escrowRit) < 0.02 ? "warn" : "good"}
          />
          <StatusCard
            title="Last activity"
            value={verify?.lastActivityBlock ? `block ${verify.lastActivityBlock.toLocaleString()}` : "no activity yet"}
            sub={blocksSinceActivity !== null ? `${blocksSinceActivity.toLocaleString()} blocks ago` : ""}
            tone={blocksSinceActivity !== null && blocksSinceActivity > 50000 ? "warn" : "good"}
          />
        </div>

        <section className="border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-6 transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)]">
          <h2 className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-secondary">
            <Activity className="h-4 w-4" /> Schedule activity
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Check
              label="Wakeup attempts"
              ok={(verify?.wakeupAttempts ?? 0) > 0}
              detail={
                verify
                  ? `${verify.wakeupAttempts ?? 0} scheduler events`
                  : "—"
              }
            />
            <Check
              label="Phase 2 delivered"
              ok={(verify?.phase2Deliveries ?? 0) > 0}
              detail={
                verify
                  ? `${verify.phase2Deliveries ?? 0} TEE callbacks`
                  : "—"
              }
            />
            <Check
              label="Next wakeup ETA"
              ok={Boolean(verify?.lastSchedulerBlock || verify?.lastActivityBlock)}
              detail={
                nextWakeup
                  ? `${nextWakeup.label} (${nextWakeup.detail})`
                  : "scheduler hasn't fired yet"
              }
            />
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            ETA updates from the latest RPC block every refresh. If wakeup attempts grow but Phase 2 stays 0, the scheduler is spending escrow but
            the TEE callback is not landing. Do not top up until at least one Phase 2 callback succeeds.
          </p>
        </section>

        <section className="border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-6 transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)]">
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

        <section className="border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-6 transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)]">
          <h2 className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-secondary">
            <Coins className="h-4 w-4" /> Top up escrow
          </h2>

          <p className="text-sm text-text-secondary">
            Top-up only extends an agent that already receives Phase 2 callbacks. Deposited RIT is managed by Ritual&apos;s escrow contracts;
            this monitor does not expose a withdraw path or repair broken HF/API settings. Conservative reserve estimate: ~{COST_PER_WAKEUP_RIT} RIT per successful wakeup/delivery.
          </p>

          {topupPaused && (
            <div className="mt-4 border border-amber-300/40 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
              Top-up is paused for this state. Adding escrow now can just feed a stuck schedule; fix/redeploy first.
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-4 gap-2">
              {TOPUP_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTopupAmount(opt)}
                  className={`border px-3 py-3 font-mono text-sm uppercase tracking-wider ${
                    topupAmount === opt ? "border-accent bg-accent/10 text-accent rounded-lg" : "border-white/10 text-text-secondary hover:border-accent/40 rounded-lg"
                  }`}
                >
                  {opt} RIT
                </button>
              ))}
            </div>
            <div className="text-xs text-text-secondary">
              +~{Math.floor(parseFloat(topupAmount) / COST_PER_WAKEUP_RIT).toLocaleString()} wakeups
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
                disabled={!canTopup || topupPaused || busy === "topup"}
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
              <button onClick={changeWallet} className="border border-white/10 px-3 py-1.5 font-mono uppercase tracking-wider text-accent hover:border-accent/40 rounded-lg">
                Change
              </button>
              <button onClick={disconnect} className="border border-white/10 px-3 py-1.5 font-mono uppercase tracking-wider text-text-secondary hover:border-red-400/60 hover:text-red-300 rounded-lg">
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
    <div className="border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-5 transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)]">
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">{title}</p>
      <p className={`mt-2 font-display text-3xl ${colour}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

function Check({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="border border-white/5 bg-bg/50 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)]">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xs text-text-primary">{detail}</p>
    </div>
  );
}
