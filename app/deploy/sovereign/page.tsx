"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { encrypt, ECIES_CONFIG } from "eciesjs";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { GoldenParticles } from "@/components/ui/GoldenParticles";
import { DeployedShareCard } from "@/components/ui/ShareAgentCard";

ECIES_CONFIG.symmetricNonceLength = 12;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

type Health = {
  latestBlock: number;
  fromBlock: number;
  deliveries: number;
  healthy: boolean;
  caution: boolean;
};

type Prepared = {
  ok: boolean;
  error?: string;
  chainId: number;
  factory: string;
  owner: string;
  saltLabel: string;
  salt: string;
  harness: string;
  alreadyDeployed: boolean;
  existingBytecodeBytes: number;
  templateBytes: number;
  deployTx: { to: string; data: string; value: string; gas: string };
  configureTx: { to: string; data: string; value: string; gas: string };
  calldataPreview: { selector: string; bytes: number };
  health: Health;
  schedule: {
    value: string;
    numCalls: number;
    frequency: number;
    schedulerGas: number;
    schedulerTtl: number;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  hfRepoId: string;
};

type Verify = {
  ok: boolean;
  agent: string;
  deployed: boolean;
  bytecodeBytes: number;
  templateMatch: boolean;
  hasStartSelector?: boolean;
  hasCallbackSelector?: boolean;
  hasRejectedV4Callback?: boolean;
  listed: boolean;
  lastActivityBlock: number | null;
  escrowRit: string;
  wakeupAttempts?: number;
  phase2Deliveries?: number;
  explorerUrl: string;
  error?: string;
};

const CHAIN_ID_HEX = "0x7bb";
const RPC_URL = "https://rpc.ritualfoundation.org";
const DEFAULT_PROMPT =
  "You are Siggy, a scheduled sovereign Ritual agent. Give one short AI x crypto builder insight and confirm the scheduled sovereign agent executed successfully.";

// Conservative product estimate. Ritual delivery can reserve far more than actual gas used.
const COST_PER_WAKEUP_RIT = 0.02;

const FREQUENCY_PRESETS = [
  { value: "3000",   label: "Every ~17 min",     desc: "High activity proof" },
  { value: "6000",   label: "Every ~35 min",     desc: "Frequent heartbeat" },
  { value: "14400",  label: "Every ~1.4 hr",     desc: "Balanced" },
  { value: "28800",  label: "Every ~2.8 hr",     desc: "Light usage" },
  { value: "74000",  label: "Every ~7.2 hr",     desc: "0.2 RIT ≈ 1 month" },
  { value: "148000", label: "Every ~14.4 hr",    desc: "0.1 RIT ≈ 1 month" },
  { value: "246857", label: "Every ~24 hr",      desc: "1× per day" },
] as const;


type ProviderKey = "openrouter" | "openai" | "anthropic" | "gemini";

type ProviderConfig = {
  label: string;
  envKey: string;
  keyPrefix: string;
  keyPrefixes?: string[];
  defaultModel: string;
  signupUrl: string;
  apiKeyUrl: string;
  notes: string;
  modelOptions: string[];
};

const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  openrouter: {
    label: "OpenRouter (free models available)",
    envKey: "OPENROUTER_API_KEY",
    keyPrefix: "sk-or-",
    defaultModel: "google/gemini-2.5-flash:free",
    signupUrl: "https://openrouter.ai/sign-up",
    apiKeyUrl: "https://openrouter.ai/keys",
    notes:
      "Cheapest option. Many free models like google/gemini-2.5-flash:free. Sign up → top up $0 → create key → copy.",
    modelOptions: [
      "google/gemini-2.5-flash:free",
      "meta-llama/llama-3.1-8b-instruct:free",
      "openrouter/free",
      "google/gemini-2.5-flash",
      "openai/gpt-4o-mini",
    ],
  },
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    keyPrefix: "sk-",
    defaultModel: "gpt-4o-mini",
    signupUrl: "https://platform.openai.com/signup",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    notes:
      "Most popular. Requires ~$5 credit on account. Create new key → copy. Keep usage limit low.",
    modelOptions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  anthropic: {
    label: "Anthropic (Claude)",
    envKey: "ANTHROPIC_API_KEY",
    keyPrefix: "sk-ant-",
    defaultModel: "claude-sonnet-4-5-20250929",
    signupUrl: "https://console.anthropic.com/",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    notes:
      "Highest quality reasoning. Pay-as-you-go after free credits. Console → Settings → API Keys → Create.",
    modelOptions: ["claude-sonnet-4-5-20250929", "claude-opus-4-1-20250805", "claude-haiku-4-5-20251001"],
  },
  gemini: {
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    keyPrefix: "AQ.Ab / AIza",
    keyPrefixes: ["AQ.Ab", "AIza"],
    defaultModel: "gemini-2.5-flash",
    signupUrl: "https://aistudio.google.com/",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    notes: "Free tier available. Open AI Studio → Get API key → Create new key.",
    modelOptions: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  },
};

function short(value = "") {
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function agentUrl(address: string) {
  return `https://siggy.decka.my.id/agent/${address}`;
}

function acceptsProviderKey(providerCfg: ProviderConfig, key: string) {
  const trimmed = key.trim();
  const prefixes = providerCfg.keyPrefixes || [providerCfg.keyPrefix];
  return prefixes.some((prefix) => trimmed.startsWith(prefix));
}

export default function DeployRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg pt-28 text-text-primary" />}>
      <DeployPage />
    </Suspense>
  );
}

function DeployPage() {
  const search = useSearchParams();
  const initialSalt = search?.get("salt") || "";
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const FORM_KEY = "siggy.deploy.form.v2"; // bumped: clears old bad defaults (numCalls=5, schedulerGas=500k)
  const PREPARED_KEY = "siggy.deploy.prepared.v1";
  const [saltLabel, setSaltLabel] = useState(initialSalt);
  const [hfRepoId, setHfRepoId] = useState("");
  const [collapseForm, setCollapseForm] = useState(false);
  const [hfToken, setHfToken] = useState("");
  const [provider, setProvider] = useState<ProviderKey>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDERS.openrouter.defaultModel);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [fundingRit, setFundingRit] = useState("0.1");
  const [showHfHelp, setShowHfHelp] = useState(false);
  const [showProviderHelp, setShowProviderHelp] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [walletBalanceRit, setWalletBalanceRit] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFrequency, setAdvFrequency] = useState("2000"); // ~12 min: fast enough for listing proof
  const [advNumCalls, setAdvNumCalls] = useState("5");
  const [advSchedulerGas, setAdvSchedulerGas] = useState("400000"); // Callback gas limit; escrow reserve is estimated conservatively in UI.
  const [advCliType, setAdvCliType] = useState("5");
  const [advSchedulerTtl, setAdvSchedulerTtl] = useState("500");
  const [executors, setExecutors] = useState<{ teeAddress: string; publicKey: string; endpoint: string }[]>([]);
  const [chosenExecutor, setChosenExecutor] = useState<string>("");
  const [executorBusy, setExecutorBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [deployHash, setDeployHash] = useState("");
  const [startHash, setStartHash] = useState("");
  const [copied, setCopied] = useState("");
  const [preparedRestored, setPreparedRestored] = useState(false);
  const [smoke, setSmoke] = useState<{ status: "idle" | "ok" | "fail"; signature: string; message: string }>({
    status: "idle",
    signature: "",
    message: "",
  });

  const connected = Boolean(account);
  const chainOk = chainId.toLowerCase() === CHAIN_ID_HEX;
  const balanceNum = walletBalanceRit ? parseFloat(walletBalanceRit) : 0;
  const fundingNum = parseFloat(fundingRit || "0");
  const fundingOk = fundingNum >= 0.1 && fundingNum <= 5;
  const requiredRit = fundingNum + 0.05;
  const balanceOk = !connected || !walletBalanceRit || balanceNum >= requiredRit;
  const providerCfg = PROVIDERS[provider];
  const effectiveHealth = prepared?.health || health;
  const healthOk = Boolean(effectiveHealth?.healthy);

  const freqNum = parseInt(advFrequency || "0", 10);
  const numCallsNum = parseInt(advNumCalls || "0", 10);
  const schedGasNum = parseInt(advSchedulerGas || "0", 10);
  const schedulerTtlNum = parseInt(advSchedulerTtl || "0", 10);
  const advLifespan = freqNum * numCallsNum;

  // Live escrow duration: how long does the chosen funding last at this frequency?
  const escrowWakeups = fundingNum > 0 ? Math.floor(fundingNum / COST_PER_WAKEUP_RIT) : 0;
  const escrowTotalSec = escrowWakeups * freqNum * 0.35;
  const escrowDurationText = escrowTotalSec < 3600
    ? `~${Math.round(escrowTotalSec / 60)} min`
    : escrowTotalSec < 86400
    ? `~${Math.round(escrowTotalSec / 3600)} hours`
    : `~${Math.round(escrowTotalSec / 86400)} days`;
  const isPresetFreq = FREQUENCY_PRESETS.some((p) => p.value === advFrequency);
  const usesDefaultSchedule =
    advFrequency === "2000" &&
    advNumCalls === "5" &&
    advSchedulerGas === "400000" &&
    advCliType === "5" &&
    advSchedulerTtl === "500";

  const promptOk = prompt.trim().length > 0;
  const saltOk = saltLabel.trim().length > 0;
  const normalizedHfRepoId = hfRepoId.trim().toLowerCase().replace(/^https:\/\/huggingface\.co\/datasets\//i, "").replace(/^\/+|\/+$/g, "");
  const hfRepoOk = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/.test(normalizedHfRepoId);
  const hfTokenOk = hfToken.trim().startsWith("hf_");
  const apiKeyOk = acceptsProviderKey(providerCfg, apiKey);
  const modelOk = model.trim().length > 0;
  const smokeSignature = JSON.stringify([normalizedHfRepoId, hfToken.trim(), provider, apiKey.trim(), model.trim()]);
  const smokeOk = smoke.status === "ok" && smoke.signature === smokeSignature;
  const advValid =
    freqNum >= 100 &&
    freqNum <= 300000 &&
    numCallsNum >= 1 &&
    numCallsNum <= 100 &&
    schedGasNum >= 200000 &&
    schedGasNum <= 5000000 &&
    schedulerTtlNum >= 100 &&
    schedulerTtlNum <= 500 &&
    (freqNum * (numCallsNum - 1) + schedulerTtlNum) <= 10000;

  const canPrepare =
    connected &&
    chainOk &&
    balanceOk &&
    promptOk &&
    saltOk &&
    hfRepoOk &&
    hfTokenOk &&
    apiKeyOk &&
    modelOk &&
    fundingOk &&
    healthOk &&
    advValid;
  const prepareWillSmokeTest = hfRepoOk && hfTokenOk && apiKeyOk && modelOk && !smokeOk;
  const prepareBlockers = useMemo(() => {
    const items: string[] = [];
    if (!connected) items.push("Connect wallet");
    if (connected && !chainOk) items.push("Switch to Ritual Testnet");
    if (connected && !balanceOk) items.push(`Need at least ${requiredRit.toFixed(2)} RIT`);
    if (!saltOk) items.push("Fill Agent Name");
    if (!hfRepoOk) items.push("HF repo must be user/repo");
    if (!hfTokenOk) items.push("Paste HF token starting with hf_");
    if (!apiKeyOk) items.push(`Paste ${providerCfg.label.split(" ")[0]} key starting with ${providerCfg.keyPrefix}`);
    if (!modelOk) items.push("Choose model");
    if (!fundingOk) items.push("Funding must be at least 0.1 RIT");
    if (!healthOk) items.push("Ritual executor health is too low; try later");
    if (!promptOk) items.push("Fill prompt");
    if (freqNum < 100 || freqNum > 300000) items.push("Frequency must be 100-300,000");
    if (numCallsNum < 1 || numCallsNum > 100) items.push("Window calls must be 1-100");
    if (schedGasNum < 200000 || schedGasNum > 5000000) items.push("Scheduler gas must be 200k-5M");
    if (advLifespan <= 0) items.push("Frequency x calls must be positive");
    if (schedulerTtlNum < 100 || schedulerTtlNum > 500) items.push("Scheduler TTL must be 100-500");
    if (freqNum * (numCallsNum - 1) + schedulerTtlNum > 10000) {
      items.push(`Total schedule lifespan is ${(freqNum * (numCallsNum - 1) + schedulerTtlNum).toLocaleString()} blocks (max 10,000 blocks limit)`);
    }
    return items;
  }, [
    connected,
    chainOk,
    balanceOk,
    requiredRit,
    saltOk,
    hfRepoOk,
    hfTokenOk,
    apiKeyOk,
    providerCfg,
    modelOk,
    fundingOk,
    healthOk,
    promptOk,
    freqNum,
    numCallsNum,
    schedGasNum,
    advLifespan,
    schedulerTtlNum,
  ]);
  const deployDone = Boolean(deployHash) || prepared?.alreadyDeployed || verify?.deployed;
  const escrowNum = verify?.escrowRit ? parseFloat(verify.escrowRit) : 0;
  const startDone = Boolean(verify?.listed || escrowNum > 0 || (verify?.wakeupAttempts || 0) > 0 || (verify?.phase2Deliveries || 0) > 0);
  const bytecodeSizeOk = Boolean(verify?.deployed && prepared?.templateBytes && verify.bytecodeBytes === prepared.templateBytes);
  const bytecodeGateOk = Boolean(verify?.templateMatch || bytecodeSizeOk);
  const preparedFundingRit = prepared?.schedule?.value || "";
  const fundingMatchesPrepared = !preparedFundingRit || parseFloat(preparedFundingRit) === parseFloat(fundingRit || "0");
  const canFund = deployDone && bytecodeGateOk && !startDone && fundingMatchesPrepared;

  const step = useMemo(() => {
    if (!connected) return 1;
    if (!chainOk) return 2;
    if (!prepared) return 3;
    if (!deployDone) return 4;
    if (!startDone) return 5;
    return verify?.listed ? 7 : 6;
  }, [connected, chainOk, prepared, deployDone, startDone, verify?.listed]);

  async function loadHealth() {
    try {
      const res = await fetch("/api/ritual/prepare-deploy", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setHealth(data.health);
    } catch {
      setHealth(null);
    }
  }

  async function loadBalance(address: string) {
    if (!window.ethereum || !address) return;
    try {
      const hex = (await window.ethereum.request({ method: "eth_getBalance", params: [address, "latest"] })) as string;
      const wei = BigInt(hex);
      const rit = Number(wei) / 1e18;
      setWalletBalanceRit(rit.toFixed(4));
    } catch {
      setWalletBalanceRit(null);
    }
  }

  function toHex(bytes: Uint8Array) {
    let s = "0x";
    for (let i = 0; i < bytes.length; i += 1) s += bytes[i].toString(16).padStart(2, "0");
    return s;
  }

  function preparedCacheId(owner: string, label: string) {
    return `${owner.toLowerCase()}::${label.trim().toLowerCase()}`;
  }

  function preparedHarnessCacheId(harness: string) {
    return `harness::${harness.toLowerCase()}`;
  }

  function readPreparedCache() {
    if (typeof window === "undefined") return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem(PREPARED_KEY) || "{}");
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, { prepared: Prepared; deployHash?: string; startHash?: string; savedAt?: number }>)
        : {};
    } catch {
      return {};
    }
  }

  function savePreparedCache(data: Prepared, hashes?: { deployHash?: string; startHash?: string }) {
    if (typeof window === "undefined" || !data.owner || !data.saltLabel) return;
    try {
      const cache = readPreparedCache();
      const record = {
        prepared: data,
        deployHash: hashes?.deployHash ?? deployHash,
        startHash: hashes?.startHash ?? startHash,
        savedAt: Date.now(),
      };
      cache[preparedCacheId(data.owner, data.saltLabel)] = record;
      cache[preparedHarnessCacheId(data.harness)] = record;
      window.localStorage.setItem(PREPARED_KEY, JSON.stringify(cache));
    } catch {
      // Best-effort resume cache only.
    }
  }

  async function loadExecutors() {
    setExecutorBusy(true);
    try {
      const res = await fetch("/api/ritual/list-executors", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.executors)) {
        setExecutors(data.executors);
        if (!chosenExecutor && data.executors[0]) setChosenExecutor(data.executors[0].teeAddress);
      }
    } catch {
      // ignore
    } finally {
      setExecutorBusy(false);
    }
  }

  async function encryptSecretsClientSide(payloadJson: string) {
    const list = executors.length ? executors : await (async () => {
      const r = await fetch("/api/ritual/list-executors", { cache: "no-store" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Failed to fetch executors");
      return d.executors as { teeAddress: string; publicKey: string }[];
    })();
    const target = chosenExecutor || list[0]?.teeAddress || "";
    const match = list.find((x) => x.teeAddress.toLowerCase() === target.toLowerCase()) || list[0];
    if (!match) throw new Error("No active executors available right now.");
    const plaintext = new TextEncoder().encode(payloadJson);
    const cipherBytes = encrypt(match.publicKey, plaintext);
    return { encryptedSecrets: toHex(cipherBytes), executor: match.teeAddress };
  }

  // Restore form state from localStorage (sensitive fields like API key + HF token NOT persisted).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FORM_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.saltLabel === "string" && !initialSalt) setSaltLabel(s.saltLabel);
      if (typeof s.hfRepoId === "string") setHfRepoId(s.hfRepoId.trim().toLowerCase());
      if (typeof s.provider === "string" && s.provider in PROVIDERS) {
        setProvider(s.provider as ProviderKey);
        if (typeof s.model === "string") setModel(s.model);
        else setModel(PROVIDERS[s.provider as ProviderKey].defaultModel);
      }
      if (typeof s.prompt === "string") setPrompt(s.prompt);
      if (typeof s.fundingRit === "string") setFundingRit(parseFloat(s.fundingRit) >= 0.1 ? s.fundingRit : "0.1");
      // Migrate old bad frequency values → safe default 28800
      if (typeof s.advFrequency === "string") {
        const f = s.advFrequency;
        setAdvFrequency(["28800", "74000", "148000", "246857"].includes(f) ? "2000" : f);
      }
      // Migrate old numCalls > 1 → 1 (required for large frequencies to avoid revert)
      if (typeof s.advNumCalls === "string") {
        setAdvNumCalls(s.advNumCalls === "1" ? "5" : s.advNumCalls);
      }
      // Migrate old schedulerGas → 400000
      if (typeof s.advSchedulerGas === "string") {
        setAdvSchedulerGas(["500000", "1800000"].includes(s.advSchedulerGas) ? "400000" : s.advSchedulerGas);
      }
      if (typeof s.advCliType === "string") setAdvCliType(s.advCliType);
      if (typeof s.advSchedulerTtl === "string") {
        setAdvSchedulerTtl(parseInt(s.advSchedulerTtl, 10) > 500 ? "500" : s.advSchedulerTtl);
      }
      if (typeof s.chosenExecutor === "string") setChosenExecutor(s.chosenExecutor);
    } catch {
      // ignore corrupted state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist non-sensitive form state on every change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        FORM_KEY,
        JSON.stringify({ saltLabel, hfRepoId, provider, model, prompt, fundingRit, advFrequency, advNumCalls, advSchedulerGas, advCliType, advSchedulerTtl, chosenExecutor }),
      );
    } catch {
      // private window etc.
    }
  }, [saltLabel, hfRepoId, provider, model, prompt, fundingRit, advFrequency, advNumCalls, advSchedulerGas, advCliType, advSchedulerTtl, chosenExecutor]);

  // Resume step 3/4 after the user returns from the monitor with the same wallet + salt label.
  useEffect(() => {
    if (!account || !saltLabel.trim() || prepared) return;
    const cached = readPreparedCache()[preparedCacheId(account, saltLabel)];
    if (!cached?.prepared?.harness) return;
    if (parseFloat(cached.prepared.schedule?.value || "0") < 0.2) return;
    setPrepared(cached.prepared);
    setDeployHash(cached.deployHash || "");
    setStartHash(cached.startHash || "");
    setPreparedRestored(true);
    if (cached.prepared.schedule?.value) setFundingRit(cached.prepared.schedule.value);
    verifyAgent(cached.prepared.harness);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, saltLabel, prepared]);

  // Collapse the form once prepare succeeds so the screen focuses on Preview + Monitor.
  useEffect(() => {
    if (prepared) setCollapseForm(true);
  }, [prepared?.harness]);

  useEffect(() => {
    loadHealth();
    loadExecutors();
    if (!window.ethereum) return;

    window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts?.[0]) setAccount(accounts[0]);
    });
    window.ethereum.request({ method: "eth_chainId" }).then(setChainId);

    const accountsChanged = (accounts: string[]) => {
      const next = accounts?.[0] || "";
      setAccount(next);
      setPrepared(null);
      setVerify(null);
      setDeployHash("");
      setStartHash("");
      setPreparedRestored(false);
      setWalletBalanceRit(null);
      if (next) loadBalance(next);
    };
    const chainChanged = (id: string) => {
      setChainId(id);
      setPrepared(null);
      setVerify(null);
      setDeployHash("");
      setStartHash("");
      setPreparedRestored(false);
      if (account) loadBalance(account);
    };
    window.ethereum.on?.("accountsChanged", accountsChanged);
    window.ethereum.on?.("chainChanged", chainChanged);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", accountsChanged);
      window.ethereum?.removeListener?.("chainChanged", chainChanged);
    };
  }, []);

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
    if (next) loadBalance(next);
  }

  async function changeWallet() {
    if (!window.ethereum) return;
    setError("");
    try {
      // Forces the wallet to re-prompt the account chooser.
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const next = accounts?.[0] || "";
      setAccount(next);
      setPrepared(null);
      setVerify(null);
      setDeployHash("");
      setStartHash("");
      setPreparedRestored(false);
      if (next) loadBalance(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Change wallet failed.");
    }
  }

  async function disconnect() {
    setAccount("");
    setWalletBalanceRit(null);
    setPrepared(null);
    setVerify(null);
    setDeployHash("");
    setStartHash("");
    setPreparedRestored(false);
    if (!window.ethereum) return;
    try {
      // EIP-2255 — supported by MetaMask 11+ and Rabby. Best-effort; silent fail elsewhere.
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // wallet doesn't support revokePermissions — UI state is reset, user can disconnect manually via extension
    }
  }

  async function switchChain() {
    setError("");
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
    } catch (switchError: any) {
      if (switchError?.code !== 4902) throw switchError;
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

  async function runSmokeTest(): Promise<boolean> {
    setBusy("smoke");
    setError("");
    setSmoke({ status: "idle", signature: smokeSignature, message: "" });
    try {
      const res = await fetch("/api/ritual/smoke-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hfRepoId: normalizedHfRepoId,
          hfToken,
          provider,
          apiKey,
          model,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Smoke test failed.");
      setSmoke({
        status: "ok",
        signature: smokeSignature,
        message: `${providerCfg.label.split(" ")[0]} + HuggingFace verified`,
      });
      return true;
    } catch (err) {
      setSmoke({
        status: "fail",
        signature: smokeSignature,
        message: err instanceof Error ? err.message : "Smoke test failed.",
      });
      return false;
    } finally {
      setBusy("");
    }
  }

  async function prepare() {
    setError("");
    setPrepared(null);
    setVerify(null);
    try {
      if (!smokeOk) {
        const ok = await runSmokeTest();
        if (!ok) {
          setError("Credential smoke test failed. Fix HuggingFace/API/model first; no on-chain transaction was prepared.");
          return;
        }
      }

      setBusy("prepare");
      // Encrypt secrets in-browser to the TEE executor pubkey before sending anything.
      // The server never sees plaintext API_KEY or HF_TOKEN.
      const secretPayload = JSON.stringify({
        LLM_PROVIDER: provider,
        [providerCfg.envKey]: apiKey,
        HF_TOKEN: hfToken,
      });
      const { encryptedSecrets, executor } = await encryptSecretsClientSide(secretPayload);

      const fundingWei = (BigInt(Math.round(parseFloat(fundingRit) * 1e6)) * 10n ** 12n).toString();
      const res = await fetch("/api/ritual/prepare-deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: account,
          saltLabel,
          hfRepoId: normalizedHfRepoId,
          prompt,
          encryptedSecrets,
          executor,
          fundingWei,
          model,
          provider,
          frequency: freqNum,
          numCalls: numCallsNum,
          schedulerGas: schedGasNum,
          cliType: parseInt(advCliType, 10),
          schedulerTtl: parseInt(advSchedulerTtl, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Prepare failed.");
      setPrepared(data);
      setPreparedRestored(false);
      savePreparedCache(data);
      setHealth(data.health);
      await verifyAgent(data.harness);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prepare failed.");
    } finally {
      setBusy("");
    }
  }

  async function sendDeploy() {
    if (!prepared || !window.ethereum) return;
    setBusy("deploy");
    setError("");
    try {
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, ...prepared.deployTx }],
      });
      setDeployHash(hash);
      const deployedPrepared = { ...prepared, alreadyDeployed: true };
      setPrepared(deployedPrepared);
      savePreparedCache(deployedPrepared, { deployHash: hash });
      await waitForCode(prepared.harness);
      await verifyAgent(prepared.harness);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy transaction failed.");
    } finally {
      setBusy("");
    }
  }

  async function sendStart() {
    if (!prepared || !window.ethereum) return;
    setBusy("start");
    setError("");
    try {
      const tx = { from: account, ...prepared.configureTx };
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
      setStartHash(hash);
      savePreparedCache(prepared, { deployHash, startHash: hash });
      window.setTimeout(() => verifyAgent(prepared.harness), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start transaction failed.");
    } finally {
      setBusy("");
    }
  }

  async function waitForCode(address: string) {
    if (!window.ethereum) return;
    for (let i = 0; i < 24; i += 1) {
      const code = await window.ethereum.request({ method: "eth_getCode", params: [address, "latest"] });
      if (code && code !== "0x") return;
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
    }
  }

  async function verifyAgent(address = prepared?.harness) {
    if (!address) return;
    setBusy((current) => current || "verify");
    try {
      const res = await fetch(`/api/ritual/verify-agent?address=${address}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setVerify(data);
    } finally {
      setBusy((current) => (current === "verify" ? "" : current));
    }
  }

  // Persist deployed agents to localStorage so /agent shows the user's history.
  useEffect(() => {
    if (!prepared?.harness) return;
    if (typeof window === "undefined") return;
    try {
      const key = "siggy.deployed.agents.v1";
      const raw = window.localStorage.getItem(key);
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.some((r) => r?.address?.toLowerCase?.() === prepared.harness.toLowerCase())) return;
      const next = [
        {
          address: prepared.harness,
          saltLabel: prepared.saltLabel,
          deployTx: deployHash || undefined,
          configureTx: startHash || undefined,
          owner: prepared.owner,
          schedule: prepared.schedule,
          createdAt: Date.now(),
        },
        ...(Array.isArray(list) ? list : []),
      ].slice(0, 50);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable in private windows — ignore
    }
  }, [prepared?.harness, prepared?.saltLabel, prepared?.owner, deployHash, startHash]);

  // Gap fix 4: auto-poll after start until LISTED or escrow drained or 30 min timeout.
  useEffect(() => {
    if (!startHash || !verify?.deployed || verify?.listed) return;
    if (parseFloat(verify.escrowRit || "0") > 0) return;
    setStartHash("");
    if (prepared) savePreparedCache(prepared, { deployHash, startHash: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHash, verify?.deployed, verify?.listed, verify?.escrowRit, prepared?.harness, deployHash]);

  useEffect(() => {
    if (!startHash || !prepared?.harness) return;
    if (verify?.listed) return;
    if (verify?.escrowRit === "0") return;
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - start > 30 * 60 * 1000) {
        window.clearInterval(timer);
        return;
      }
      verifyAgent(prepared.harness);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [startHash, prepared?.harness, verify?.listed, verify?.escrowRit]);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1200);
  }

  return (
    <div className="relative min-h-screen bg-bg pt-24 text-text-primary overflow-x-hidden sm:pt-28">
      {/* Ambient background particles */}
      <GoldenParticles mode="ambient" />
      
      {/* Celebratory confetti shower upon transaction 2 completion */}
      {startDone && <GoldenParticles mode="celebration" />}
      
      {/* Decorative background glows */}
      <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[150px] pointer-events-none" />

      {showSetupGuide && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 px-4 py-12 backdrop-blur-md" onClick={() => setShowSetupGuide(false)} role="dialog" aria-modal="true">
          <div className="mx-auto w-full max-w-2xl rounded-xl border border-white/10 bg-bg p-5 shadow-[0_0_50px_rgba(255,215,0,0.08)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-accent">Setup checklist</p>
                <h2 className="mt-1 font-display text-3xl leading-none">Before you deploy</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="rounded-lg border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-accent/40 hover:text-accent"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm leading-6 text-text-secondary">
              <div className="rounded-lg border border-white/5 bg-surface/50 p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-text-primary">1. Wallet</p>
                <p>Use a burner wallet with enough RIT for funding plus gas. Faucet: <a href="https://faucet.ritualfoundation.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">faucet.ritualfoundation.org</a>, Ritual Discord <code>#ritdrip</code>, or gifted by friends.</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-surface/50 p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-text-primary">2. HuggingFace</p>
                <p>Create a write token and an empty dataset. Paste repo as <code>username/dataset-name</code>, not a URL.</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-surface/50 p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-text-primary">3. LLM API key</p>
                <p>OpenRouter is the easiest starting point. Use the Test credentials button before signing any transaction.</p>
              </div>
              <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
                <p className="font-mono text-xs uppercase tracking-wider">Safe scheduler path</p>
                <p>Keep Advanced closed for first deploy. Longer intervals can make the first TEE callback take much longer, so they are not ideal for proving the agent is live.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-start gap-4 px-3 pb-14 sm:gap-6 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:gap-8 lg:px-8">
        <div className="border border-border bg-surface/60 p-4 backdrop-blur-md lg:hidden">
          <div className="mb-3 inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">
            <Rocket className="h-3.5 w-3.5" />
            Sovereign deployer
          </div>
          <h1 className="font-display text-4xl leading-none tracking-normal">Deploy Agent</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Connect wallet, test credentials, then sign deploy + fund.
          </p>
        </div>

        <aside className="hidden space-y-5 lg:block lg:self-start">
          <div className="border border-border bg-surface/60 backdrop-blur-md p-6 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_20px_rgba(255,215,0,0.03)]">
            <div className="mb-4 inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
              <Rocket className="h-4 w-4" />
              Sovereign deployer
            </div>
            <h1 className="font-display text-5xl leading-none tracking-normal sm:text-6xl">Deploy Agent</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-accent">with ease</p>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Connect wallet, prepare the factory harness, deploy it, then fund and start your agent.
            </p>
          </div>

          <div className="relative border border-border bg-surface/60 backdrop-blur-md p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_20px_rgba(255,215,0,0.03)]">
            <h2 className="mb-5 font-mono text-xs uppercase tracking-wider text-text-secondary">Progress</h2>
            <div className="relative space-y-4">
              {/* Connector track line */}
              <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-border/50 z-0" />
              {/* Active step progress indicator line */}
              <div 
                className="absolute left-[13px] top-3 w-[2px] bg-gradient-to-b from-emerald-400 to-accent z-0 transition-all duration-500" 
                style={{ height: `${Math.max(0, Math.min(100, ((step - 1) / 5) * 100))}%` }}
              />
              {[
                "Connect wallet",
                "Use Ritual Testnet",
                "Prepare calldata",
                "Deploy harness",
                "Fund and start",
                "Monitor listing",
              ].map((label, index) => {
                const isActive = step === index + 1;
                const isCompleted = step > index + 1;
                return (
                  <div key={label} className="relative z-10 flex items-center gap-4">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-all duration-300 ${
                        isCompleted
                          ? "border-emerald-400 bg-emerald-400 text-black shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                          : isActive
                            ? "border-accent bg-accent/15 text-accent shadow-[0_0_12px_rgba(255,215,0,0.4)] scale-110 animate-pulse"
                            : "border-border bg-bg text-text-secondary"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4 stroke-[3]" /> : index + 1}
                    </div>
                    <span className={`font-mono text-xs transition-colors duration-300 ${
                      isActive 
                        ? "text-accent font-semibold" 
                        : isCompleted 
                        ? "text-emerald-300" 
                        : "text-text-secondary"
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <HealthPanel health={health} onRefresh={loadHealth} />
        </aside>

        <main className="min-w-0 space-y-4 sm:space-y-5">
          {error && (
            <div className="flex items-start gap-3 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100 sm:p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="rounded-xl border border-white/5 bg-surface/50 p-4 backdrop-blur-md sm:p-5">
            <div className="mb-2 flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-text-primary">
              <span className="text-accent"><Sparkles className="h-5 w-5" /></span>
              New here?
            </div>
            <p className="mb-3 max-w-2xl text-sm leading-6 text-text-secondary">
              You&apos;ll deploy a <b>Sovereign Agent</b> — a tiny on-chain bot that wakes up
              and runs a prompt on a TEE-verified AI executor. Total time: <b>5–10 minutes</b>.
            </p>
            <button
              type="button"
              onClick={() => setShowSetupGuide(true)}
              className="inline-flex w-full items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-accent transition-all hover:bg-accent hover:text-black sm:w-auto"
            >
              Open setup checklist
            </button>
            <ol className="hidden space-y-2 text-sm leading-6 text-text-secondary">
              <li className="flex gap-3">
                <span className="font-mono text-xs text-accent">1.</span>
                <span>
                  <b>Wallet with ≥ 0.15 RIT.</b> Use a burner wallet. Get RITUAL from{" "}
                  <a href="https://faucet.ritualfoundation.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    faucet.ritualfoundation.org
                  </a>{" "}
                  or in Ritual Discord <code>#ritdrip</code>, or gifted by your Discord friends.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-accent">2.</span>
                <span>
                  <b>HuggingFace account + Write token + empty dataset.</b> Free, ~2 min.{" "}
                  <a href="https://huggingface.co/join" target="_blank" rel="noreferrer" className="text-accent hover:underline">Sign up</a>
                  {" "}→{" "}
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    Create Write token
                  </a>
                  {" "}→{" "}
                  <a href="https://huggingface.co/new-dataset" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    Make empty dataset
                  </a>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-accent">3.</span>
                <span>
                  <b>One LLM API key.</b> Cheapest = OpenRouter. Other options work too — pick from a dropdown below.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-accent">4.</span>
                <span>
                  <b>Keep this tab open</b> while the executor settles (~3 min).
                </span>
              </li>
            </ol>
          </section>

          <details className="border border-border bg-surface p-4 open:pb-4 sm:p-5 sm:open:pb-5">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-accent">
              If something goes wrong (common errors + fixes)
            </summary>
            <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
              <div>
                <p className="font-mono text-xs text-text-primary">&quot;Wallet balance too low&quot;</p>
                <p>You need at least your chosen funding amount + 0.05 RIT for gas. Hit the faucet again or lower the funding to 0.1 RIT.</p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-primary">&quot;Sender has a pending async job&quot;</p>
                <p>Your wallet already has an in-flight sovereign call. Wait 10–30 min for the executor to clear it, or use a fresh burner wallet.</p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-primary">&quot;DeploymentFailed&quot; / harness empty after deploy</p>
                <p>Gas limit too low. Refresh the page and retry — the deployer auto-sets gas limit to 3M which should pass.</p>
              </div>
              <div>
                <p className="font-mono text-xs text-text-primary">Listed status takes forever (more than 30 min)</p>
                <p>Ritual executor is backlogged. Check the <b>Executor health</b> panel on the left — green means good, amber means slow. Try again later when it&apos;s green.</p>
              </div>
            </div>
          </details>

          <Panel
            title="1. Wallet"
            icon={<Wallet className="h-5 w-5" />}
            subtitle="Connect a Ritual Testnet wallet. Use a burner with at least 0.26 RIT."
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0 break-all rounded-lg border border-white/5 bg-bg/50 p-3 font-mono text-xs text-text-secondary backdrop-blur-sm sm:p-4 sm:text-sm">
                {account ? account : "No wallet connected"}
              </div>
              {!account ? (
                <button onClick={connect} className="bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300">
                  Connect wallet
                </button>
              ) : (
                <div className="grid gap-2 sm:flex">
                  <button onClick={changeWallet} className="border border-white/10 hover:border-accent/40 rounded-lg px-4 py-3 font-mono text-xs uppercase tracking-wider text-accent transition-all">
                    Change
                  </button>
                  <button onClick={disconnect} className="border border-white/10 hover:border-red-500/40 rounded-lg px-4 py-3 font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-red-300 transition-all">
                    Disconnect
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary sm:gap-3 sm:text-xs">
              <Pill ok={connected} label={connected ? `Wallet ${short(account)}` : "Wallet required"} />
              <Pill ok={chainOk} label={chainOk ? "Ritual Testnet 1979" : `Wrong chain ${chainId || "-"}`} />
              {walletBalanceRit !== null && (
                <Pill ok={balanceOk} label={`Balance ${walletBalanceRit} RIT`} />
              )}
              {!chainOk && connected && (
                <button onClick={switchChain} className="border border-white/10 hover:border-accent/40 rounded-lg px-3 py-1.5 font-mono uppercase tracking-wider text-accent transition-all">
                  Switch chain
                </button>
              )}
            </div>
          </Panel>

          {prepared && collapseForm ? (
            <section className="rounded-xl border border-white/5 bg-surface/40 p-4 backdrop-blur-md transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)] sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-text-primary">
                  <span className="text-accent"><Sparkles className="h-5 w-5" /></span>
                  2. Agent setup ✓ ready
                </div>
                <button
                  onClick={() => setCollapseForm(false)}
                  className="border border-white/10 hover:border-accent/40 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent transition-all"
                >
                  Edit
                </button>
              </div>
              <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
                <p className="min-w-0">Agent: <span className="break-all font-mono text-text-primary">{saltLabel}</span></p>
                <p className="min-w-0">HF: <span className="break-all font-mono text-text-primary">{hfRepoId}</span></p>
                <p>Provider: <span className="font-mono text-text-primary">{provider}</span></p>
                <p className="min-w-0">Model: <span className="break-all font-mono text-text-primary">{model}</span></p>
                <p>Funding: <span className="font-mono text-text-primary">{fundingRit} RIT</span></p>
                <p>Schedule: <span className="font-mono text-text-primary">{advNumCalls} × {advFrequency} blk</span></p>
              </div>
            </section>
          ) : (
          <Panel
            title="2. Agent setup"
            icon={<Sparkles className="h-5 w-5" />}
            subtitle="Tell Siggy what your agent should do and where to keep its memory."
          >
            <div className="hidden gap-2 sm:grid sm:grid-cols-3">
              <div className="rounded-lg border border-white/5 bg-bg/45 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Step A</p>
                <p className="mt-1 text-xs text-text-secondary">Name + HuggingFace memory</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-bg/45 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Step B</p>
                <p className="mt-1 text-xs text-text-secondary">LLM key + smoke test</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-bg/45 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Step C</p>
                <p className="mt-1 text-xs text-text-secondary">Prepare, then sign 2 txs</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Agent Name (salt label)">
                <input
                  value={saltLabel}
                  onChange={(e) => setSaltLabel(e.target.value)}
                  placeholder="my-agent-1"
                  className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent transition-all"
                />
              </Field>
              <Field label="HuggingFace / HF Repo ID (your-username/dataset-name)">
                <input
                  value={hfRepoId}
                  onChange={(e) => setHfRepoId(e.target.value.trim().toLowerCase())}
                  placeholder="your-username/your-dataset"
                  className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent transition-all"
                />
              </Field>
            </div>
            <Field label="HF token">
              <input
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="hf_..."
                autoComplete="off"
                className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowHfHelp((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-accent hover:underline"
              >
                {showHfHelp ? "Hide" : "Show"} HuggingFace setup steps
              </button>
              {showHfHelp && (
                <div className="mt-2 space-y-2 border border-white/5 bg-bg/50 backdrop-blur-sm rounded-lg p-4 text-xs leading-5 text-text-secondary">
                  <p className="font-semibold text-text-primary">How to get HF_TOKEN + HF_REPO_ID (~2 min):</p>
                  <ol className="ml-4 list-decimal space-y-1">
                    <li>
                      Open{" "}
                      <a href="https://huggingface.co/join" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        huggingface.co/join
                      </a>{" "}
                      and create an account (free, just email + username).
                    </li>
                    <li>
                      Go to{" "}
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        huggingface.co/settings/tokens
                      </a>{" "}
                      → click <b>+ Create new token</b> → Token type: <b>Write</b> → copy the <code>hf_...</code> string into the field above.
                    </li>
                    <li>
                      Create an empty dataset at{" "}
                      <a href="https://huggingface.co/new-dataset" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        huggingface.co/new-dataset
                      </a>{" "}
                      — owner = your username, name = anything (e.g. <code>ritual-agent</code>), visibility <b>Private</b>. Don&apos;t add any files.
                    </li>
                    <li>
                      The HF repo ID is <code>username/dataset-name</code> — paste it in the &quot;HuggingFace / HF Repo ID&quot; field. <b>No URL.</b>
                    </li>
                  </ol>
                </div>
              )}
            </Field>

            <Field label="LLM Provider">
              <select
                value={provider}
                onChange={(e) => {
                  const next = e.target.value as ProviderKey;
                  setProvider(next);
                  setModel(PROVIDERS[next].defaultModel);
                  setApiKey("");
                }}
                className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent transition-all"
              >
                {(Object.keys(PROVIDERS) as ProviderKey[]).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDERS[p].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowProviderHelp((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-accent hover:underline"
              >
                {showProviderHelp ? "Hide" : "Show"} how to get a {providerCfg.label.split(" ")[0]} API key
              </button>
              {showProviderHelp && (
                <div className="mt-2 space-y-2 border border-white/5 bg-bg/50 backdrop-blur-sm rounded-lg p-4 text-xs leading-5 text-text-secondary">
                  <p className="font-semibold text-text-primary">{providerCfg.label} setup</p>
                  <p>{providerCfg.notes}</p>
                  <ol className="ml-4 list-decimal space-y-1">
                    <li>
                      Sign up:{" "}
                      <a href={providerCfg.signupUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {providerCfg.signupUrl.replace("https://", "")}
                      </a>
                    </li>
                    <li>
                      Open API keys page:{" "}
                      <a href={providerCfg.apiKeyUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {providerCfg.apiKeyUrl.replace("https://", "")}
                      </a>
                    </li>
                    <li>
                      Create new key → copy. It should start with <code>{providerCfg.keyPrefix}</code>.
                    </li>
                    <li>
                      Paste below. Test credentials checks the key before deploy; Prepare deploy ECIES-encrypts secrets in this browser for the TEE executor.
                    </li>
                  </ol>
                </div>
              )}
            </Field>

            <Field label={`${providerCfg.label.split(" ")[0]} API key (starts with ${providerCfg.keyPrefix})`}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`${providerCfg.keyPrefix}...`}
                autoComplete="off"
                className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent transition-all"
              />
            </Field>

            <Field label="Model">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent transition-all"
              >
                {providerCfg.modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-lg border border-white/5 bg-bg/50 p-3 backdrop-blur-sm sm:p-4">
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={runSmokeTest}
                  disabled={!hfRepoOk || !hfTokenOk || !apiKeyOk || !modelOk || Boolean(busy)}
                  className="inline-flex w-full items-center justify-center gap-2 bg-accent px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:py-2"
                >
                  {busy === "smoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {busy === "smoke" ? "Testing..." : "Test credentials"}
                </button>
                {smoke.status === "ok" && smoke.signature === smokeSignature && (
                  <span className="min-w-0 text-xs leading-5 text-green-300 sm:font-mono">{smoke.message}</span>
                )}
                {smoke.status === "fail" && smoke.signature === smokeSignature && (
                  <span className="min-w-0 flex-1 text-xs leading-5 text-red-200">{smoke.message}</span>
                )}
                {smoke.status === "ok" && smoke.signature !== smokeSignature && (
                  <span className="text-xs leading-5 text-amber-300 sm:font-mono">Credentials changed - test again</span>
                )}
              </div>
              <p className="mt-2 text-[10px] text-text-secondary">
                Runs a tiny model call and verifies HuggingFace token/repo before any on-chain transaction.
              </p>
            </div>

            <Field label={`TEE Executor (${executors.length} active from registry)`}>
              <div className="grid gap-2 sm:flex">
                <select
                  value={chosenExecutor}
                  onChange={(e) => setChosenExecutor(e.target.value)}
                  disabled={executors.length === 0 || executorBusy}
                  className="min-w-0 flex-1 border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-accent disabled:opacity-50 transition-all"
                >
                  {executors.length === 0 && <option value="">{executorBusy ? "Refreshing executors..." : "No executors loaded"}</option>}
                  {executors.map((ex, i) => (
                    <option key={ex.teeAddress} value={ex.teeAddress}>
                      {i === 0 ? "(default) " : ""}
                      {short(ex.teeAddress)}
                      {ex.endpoint ? ` - ${ex.endpoint}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadExecutors}
                  disabled={executorBusy}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-mono text-xs uppercase tracking-wider text-text-secondary transition-all hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 sm:py-0"
                  title="Refresh executors from Ritual registry"
                >
                  <RefreshCw className={`h-4 w-4 ${executorBusy ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <p className="mt-2 text-[10px] text-text-secondary">
                With the default schedule (frequency 2,000 blocks = ~12 min), the first wakeup fires after roughly 12 minutes. Phase 2 callback usually
                settles a few seconds later. If wakeup count grows but Phase 2 stays 0, do not top up yet; check credentials or deploy fresh.
              </p>
            </Field>
            <Field label="Prompt">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full resize-none border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-3 text-sm leading-6 outline-none focus:border-accent transition-all"
              />
            </Field>
            <Field label={`Initial funding (locked to harness escrow). Need ≥ ${requiredRit.toFixed(2)} RIT in wallet.`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["0.1", "0.2", "0.5", "1.0"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFundingRit(opt)}
                    className={`rounded-lg border px-3 py-3 font-mono text-sm uppercase tracking-wider ${
                      fundingRit === opt ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-text-secondary hover:border-accent/40"
                    }`}
                  >
                    {opt} RIT
                  </button>
                ))}
              </div>
              {!balanceOk && connected && walletBalanceRit && (
                <p className="mt-2 text-xs text-amber-300">
                  Wallet has {walletBalanceRit} RIT — need {requiredRit.toFixed(2)} RIT (funding + gas). Lower funding or top up faucet.
                </p>
              )}
            </Field>
            <details className="border border-white/5 bg-bg/40 backdrop-blur-sm rounded-lg p-4" onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-accent">
                Advanced: schedule + callback gas {showAdvanced ? "(open)" : "(safe defaults)"}
              </summary>
              {!usesDefaultSchedule && (
                <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                  Custom scheduler settings can delay the first TEE callback or make listing harder to verify. For a first deploy, use the defaults: 2000 blocks, 5 calls, 400k gas, TTL 500.
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Wakeup frequency">
                  <select
                    value={isPresetFreq ? advFrequency : "custom"}
                    onChange={(e) => { if (e.target.value !== "custom") setAdvFrequency(e.target.value); }}
                    className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-accent transition-all"
                  >
                    {FREQUENCY_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} — {p.desc}
                      </option>
                    ))}
                    {!isPresetFreq && (
                      <option value="custom">Custom ({advFrequency} blocks)</option>
                    )}
                  </select>
                  <input
                    type="number"
                    value={advFrequency}
                    onChange={(e) => setAdvFrequency(e.target.value)}
                    min={100}
                    max={300000}
                    step={100}
                    placeholder="or type custom blocks"
                    className="mt-1 w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-xs outline-none focus:border-accent text-text-secondary transition-all"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary">Keep Window calls at 1 for any frequency above 5,750 blocks.</p>
                </Field>
                <Field label="Window num calls">
                  <input
                    type="number"
                    value={advNumCalls}
                    onChange={(e) => setAdvNumCalls(e.target.value)}
                    min={1}
                    max={100}
                    className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-accent transition-all"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary">1-100. Wakeups per rolling window.</p>
                </Field>
                <Field label="Scheduler gas">
                  <input
                    type="number"
                    value={advSchedulerGas}
                    onChange={(e) => setAdvSchedulerGas(e.target.value)}
                    min={200000}
                    max={5000000}
                    step={50000}
                    className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-accent transition-all"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary">200k-5M. Lower = cheaper/wakeup.</p>
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="CLI Type (Harness runtime)">
                  <select
                    value={advCliType}
                    onChange={(e) => setAdvCliType(e.target.value)}
                    className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-accent transition-all"
                  >
                    <option value="5">5 — Crush (recommended)</option>
                    <option value="6">6 - ZeroClaw</option>
                  </select>
                  <p className="mt-1 text-[10px] text-text-secondary">Crush is safe default for all providers.</p>
                </Field>
                <Field label="Scheduler TTL (blocks)">
                  <input
                    type="number"
                    value={advSchedulerTtl}
                    onChange={(e) => setAdvSchedulerTtl(e.target.value)}
                    min={100}
                    max={500}
                    step={50}
                    className="w-full border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-sm outline-none focus:border-accent transition-all"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary">
                    Window for system executor to accept each wakeup. Default/max 500 matches the public deploy guide.
                  </p>
                </Field>
              </div>
              <div className="mt-3 grid gap-1 text-[11px] text-text-secondary">
                <p>
                  Total schedule block span:{" "}
                  <span className={advValid ? "font-mono text-text-primary" : "font-mono text-amber-300 font-semibold"}>
                    {(freqNum * (numCallsNum - 1) + schedulerTtlNum).toLocaleString()} blocks (max 10,000 blocks limit)
                  </span>
                </p>
                {freqNum * (numCallsNum - 1) + schedulerTtlNum > 10000 && (
                  <p className="text-amber-300 font-semibold">
                    ⚠ Revert Warning: Total schedule span exceeds 10,000 blocks. Reduce frequency or number of calls.
                  </p>
                )}
                {schedulerTtlNum > 500 && (
                  <p className="text-amber-300 font-semibold">
                    ⚠ Revert Warning: Scheduler TTL cannot exceed 500 blocks.
                  </p>
                )}
                <p>
                  Conservative escrow reserve per wakeup:{" "}
                  <span className="font-mono text-text-primary">~{COST_PER_WAKEUP_RIT.toFixed(3)} RIT</span>
                  <span className="text-text-secondary"> (actual gas can be lower, but delivery reserve is what drains escrow)</span>
                </p>
                <p className="mt-1 border border-emerald-400/30 bg-emerald-400/5 px-3 py-2">
                  <span className="text-emerald-300 font-semibold">{fundingRit} RIT escrow</span>
                  <span className="text-text-secondary"> → </span>
                  <span className="font-mono text-text-primary">~{escrowWakeups} wakeups</span>
                  <span className="text-text-secondary"> at this frequency = </span>
                  <span className="font-mono font-semibold text-emerald-300">{escrowDurationText} of escrow</span>
                </p>
                <p className="mt-1 border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-amber-100">
                  Heads up: deposited RIT is managed by Ritual&apos;s escrow contracts. This deployer can monitor or top up the balance, but it does not expose a withdraw path.
                </p>
              </div>
            </details>

            <button
              onClick={prepare}
              disabled={!canPrepare || Boolean(busy)}
              title={!canPrepare && prepareBlockers.length ? prepareBlockers.join(", ") : undefined}
              className="inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {busy === "prepare" || busy === "smoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {busy === "smoke" ? "Testing credentials…" : busy === "prepare" ? "Encrypting & preparing…" : prepareWillSmokeTest ? "Test & prepare deploy" : "Prepare deploy"}
            </button>
            {!canPrepare && prepareBlockers.length > 0 && (
              <p className="text-xs leading-5 text-amber-300">
                Need: {prepareBlockers.slice(0, 3).join(", ")}
                {prepareBlockers.length > 3 ? `, +${prepareBlockers.length - 3} more` : ""}.
              </p>
            )}
            {busy === "prepare" && (
              <p className="text-xs text-text-secondary">
                Encrypting your API key in this browser → fetching executor → predicting your harness address → building transactions. No tx is sent yet.
              </p>
            )}
            {busy === "smoke" && (
              <p className="text-xs text-text-secondary">
                Checking HuggingFace repo/write token and running a tiny model call before prepare. No wallet transaction is opened yet.
              </p>
            )}
          </Panel>
          )}

          {prepared && (
            <Panel
              title="3. Preview & sign 2 transactions"
              icon={<Database className="h-5 w-5" />}
              subtitle="Tx 1 deploys an empty harness contract (~0.003 RIT gas). Tx 2 funds it and arms the schedule (your chosen RIT + ~0.05 RIT gas)."
            >
              {preparedRestored && (
                <div className="border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                  Resumed from this browser for salt <span className="font-mono text-text-primary">{prepared.saltLabel}</span>. If transaction 1 is already deployed, sign only Fund and start.
                </div>
              )}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <Preview label="Predicted harness" value={prepared.harness} onCopy={() => copy(prepared.harness, "harness")} copied={copied === "harness"} />
                <Preview label="Configure selector" value={`${prepared.calldataPreview.selector} (${prepared.calldataPreview.bytes.toLocaleString()} bytes)`} />
                <Preview label="Funding" value={`${prepared.schedule.value} RITUAL`} />
                <Preview label="Schedule" value={`${prepared.schedule.numCalls} calls / every ${prepared.schedule.frequency} blocks`} />
                <Preview label="Callback gas" value={prepared.schedule.schedulerGas.toLocaleString()} />
                <Preview label="Template target" value={`${prepared.templateBytes.toLocaleString()} bytes`} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={sendDeploy}
                  disabled={busy === "deploy" || Boolean(deployDone)}
                  className="inline-flex items-center justify-center gap-2 border border-accent bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-text-secondary rounded-lg transition-all"
                >
                  {busy === "deploy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {deployDone ? "Harness deployed" : "Deploy harness"}
                </button>
                <button
                  onClick={sendStart}
                  disabled={busy === "start" || !canFund}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent transition-all hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    !deployDone
                      ? "Deploy harness first"
                      : !bytecodeGateOk
                        ? "Bytecode verification pending - refresh verify"
                        : !fundingMatchesPrepared
                          ? "Funding changed after prepare - click Prepare deploy again"
                          : ""
                  }
                >
                  {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Fund {prepared.schedule.value} and start
                </button>
              </div>
              {!fundingMatchesPrepared && (
                <p className="text-xs leading-5 text-amber-300">
                  Funding changed after prepare. Prepared tx still funds {prepared.schedule.value} RITUAL; click Prepare deploy again to rebuild it with {fundingRit} RIT.
                </p>
              )}
              {deployDone && !bytecodeGateOk && (
                <div className="flex flex-wrap items-center gap-3 text-xs leading-5 text-amber-300">
                  <span>Harness is deployed, but bytecode verification is still catching up. Refresh verify, then fund and start.</span>
                  <button
                    type="button"
                    onClick={() => verifyAgent(prepared.harness)}
                    className="inline-flex items-center gap-2 border border-amber-300/50 px-3 py-2 font-mono uppercase tracking-wider text-amber-200 hover:border-amber-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${busy === "verify" ? "animate-spin" : ""}`} />
                    Refresh verify
                  </button>
                </div>
              )}
              {deployDone && bytecodeGateOk && !startDone && (
                <p className="text-xs leading-5 text-amber-300">
                  Harness is deployed but escrow is still 0 RIT. Click Fund {prepared.schedule.value} and start to open transaction 2 in your wallet.
                </p>
              )}
              {deployDone && bytecodeGateOk && !startDone && !healthOk && (
                <p className="text-xs leading-5 text-amber-300">
                  Fund/start is paused because executor health is low. This protects the escrow from getting stuck while Ritual is lagging.
                </p>
              )}
            </Panel>
          )}

          {(deployHash || startHash || verify) && (
            <Panel
              title="4. Wait for LISTED"
              icon={<ShieldCheck className="h-5 w-5" />}
              subtitle="Auto-checks every 30 seconds. Typical: 3–15 minutes after Tx 2 to appear in the agents list."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <Status label="Deployed" ok={Boolean(verify?.deployed)} value={verify?.bytecodeBytes ? `${verify.bytecodeBytes.toLocaleString()} bytes` : "-"} />
                <Status label="Template match" ok={Boolean(verify?.templateMatch)} value={verify?.templateMatch ? "10822 bytes" : "Waiting"} />
                <Status label="Explorer listed" ok={Boolean(verify?.listed)} value={verify?.lastActivityBlock ? `Block ${verify.lastActivityBlock}` : "Not yet"} />
              </div>
              {prepared?.harness && (startHash || startDone) && (
                <DeployedShareCard
                  agentName={prepared.saltLabel || saltLabel}
                  amountRit={prepared.schedule.value}
                  address={prepared.harness}
                  lastBlock={verify?.lastActivityBlock}
                />
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => verifyAgent()}
                  className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-accent transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${busy === "verify" ? "animate-spin" : ""}`} />
                  Refresh verify
                </button>
                {verify?.explorerUrl && (
                  <a
                    href={verify.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent transition-all"
                  >
                    Explorer
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {prepared?.harness && (
                  <a
                    href={`/agent/${prepared.harness}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent transition-all"
                  >
                    Open monitor
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {deployHash && <Preview label="Deploy tx" value={deployHash} onCopy={() => copy(deployHash, "deployHash")} copied={copied === "deployHash"} />}
                {startHash && <Preview label="Start tx" value={startHash} onCopy={() => copy(startHash, "startHash")} copied={copied === "startHash"} />}
              </div>
            </Panel>
          )}
        </main>
      </section>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  subtitle,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-white/5 bg-surface/40 p-4 backdrop-blur-md transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)] sm:p-6 ${className}`}>
      <div className="mb-2 flex min-w-0 items-start gap-2 font-mono text-xs uppercase tracking-wider text-text-primary sm:items-center sm:text-sm">
        <span className="shrink-0 text-accent">{icon}</span>
        <span className="min-w-0 leading-5">{title}</span>
      </div>
      {subtitle && <p className="mb-4 text-sm leading-6 text-text-secondary">{subtitle}</p>}
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block break-words font-mono text-[11px] uppercase tracking-wider text-text-secondary sm:text-xs">{label}</span>
      {children}
    </label>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-2 border px-2.5 py-1.5 font-mono uppercase tracking-wider sm:px-3 ${ok ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/50 text-amber-300"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      <span className="min-w-0 break-all">{label}</span>
    </span>
  );
}

function Preview({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/5 bg-bg/50 p-3 backdrop-blur-sm sm:p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</p>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 break-all font-mono text-xs text-text-primary sm:truncate sm:text-sm">{value}</p>
        {onCopy && (
          <button onClick={onCopy} className="shrink-0 text-text-secondary hover:text-accent" title="Copy">
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Status({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-bg/50 p-3 backdrop-blur-sm sm:p-4">
      <div className={ok ? "text-emerald-300" : "text-amber-300"}>
        {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-text-primary">{value}</p>
    </div>
  );
}


function HealthPanel({ health, onRefresh }: { health: Health | null; onRefresh: () => void }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface/40 p-4 backdrop-blur-md transition-all duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.04)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-wider text-text-secondary">Executor health</h2>
        <button onClick={onRefresh} className="text-text-secondary hover:text-accent" title="Refresh health">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className={health?.healthy ? "text-emerald-300" : health?.caution ? "text-red-300" : "text-amber-300"}>
          {health?.healthy ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {health ? `${health.deliveries} deliveries / 200 blocks` : "Checking network"}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {health?.healthy ? "Good window to deploy." : "If low, deploy can still work but listing may take longer or burn escrow."}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <Pill ok label="Secrets encrypted in your browser" />
        <Pill ok label="Prepare encrypts secrets in browser" />
      </div>
    </div>
  );
}

