"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  explorerUrl: string;
  error?: string;
};

const CHAIN_ID_HEX = "0x7bb";
const RPC_URL = "https://rpc.ritualfoundation.org";
const DEFAULT_PROMPT =
  "You are Siggy, a scheduled sovereign Ritual agent. Give one short AI x crypto builder insight and confirm the scheduled sovereign agent executed successfully.";

type ProviderKey = "openrouter" | "openai" | "anthropic" | "gemini";

type ProviderConfig = {
  label: string;
  envKey: string;
  keyPrefix: string;
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
    keyPrefix: "AIza",
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
  const FORM_KEY = "siggy.deploy.form.v1";
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
  const [walletBalanceRit, setWalletBalanceRit] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFrequency, setAdvFrequency] = useState("2000");
  const [advNumCalls, setAdvNumCalls] = useState("5");
  const [advSchedulerGas, setAdvSchedulerGas] = useState("500000");
  const [advCliType, setAdvCliType] = useState("5");
  const [executors, setExecutors] = useState<{ teeAddress: string; publicKey: string; endpoint: string }[]>([]);
  const [chosenExecutor, setChosenExecutor] = useState<string>("");
  const [health, setHealth] = useState<Health | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [deployHash, setDeployHash] = useState("");
  const [startHash, setStartHash] = useState("");
  const [copied, setCopied] = useState("");

  const connected = Boolean(account);
  const chainOk = chainId.toLowerCase() === CHAIN_ID_HEX;
  const balanceNum = walletBalanceRit ? parseFloat(walletBalanceRit) : 0;
  const requiredRit = parseFloat(fundingRit || "0") + 0.06;
  const balanceOk = !connected || !walletBalanceRit || balanceNum >= requiredRit;
  const providerCfg = PROVIDERS[provider];

  const freqNum = parseInt(advFrequency || "0", 10);
  const numCallsNum = parseInt(advNumCalls || "0", 10);
  const schedGasNum = parseInt(advSchedulerGas || "0", 10);
  const advLifespan = freqNum * numCallsNum;
  const advValid =
    freqNum >= 100 &&
    freqNum <= 10000 &&
    numCallsNum >= 1 &&
    numCallsNum <= 100 &&
    schedGasNum >= 200000 &&
    schedGasNum <= 5000000 &&
    advLifespan > 0 &&
    advLifespan <= 10000;

  const canPrepare =
    connected &&
    chainOk &&
    balanceOk &&
    prompt.trim().length > 0 &&
    saltLabel.trim().length > 0 &&
    /^[\w.-]+\/[\w.-]+$/.test(hfRepoId.trim()) &&
    hfToken.trim().startsWith("hf_") &&
    apiKey.trim().startsWith(providerCfg.keyPrefix) &&
    model.trim().length > 0 &&
    advValid;
  const deployDone = Boolean(deployHash) || prepared?.alreadyDeployed || verify?.deployed;
  const startDone = Boolean(startHash);
  const bytecodeGateOk = Boolean(verify?.templateMatch);
  const canFund = deployDone && bytecodeGateOk && !startDone;

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

  async function loadExecutors() {
    try {
      const res = await fetch("/api/ritual/list-executors", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.executors)) {
        setExecutors(data.executors);
        if (!chosenExecutor && data.executors[0]) setChosenExecutor(data.executors[0].teeAddress);
      }
    } catch {
      // ignore
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
      if (typeof s.hfRepoId === "string") setHfRepoId(s.hfRepoId);
      if (typeof s.provider === "string" && s.provider in PROVIDERS) {
        setProvider(s.provider as ProviderKey);
        if (typeof s.model === "string") setModel(s.model);
        else setModel(PROVIDERS[s.provider as ProviderKey].defaultModel);
      }
      if (typeof s.prompt === "string") setPrompt(s.prompt);
      if (typeof s.fundingRit === "string") setFundingRit(s.fundingRit);
      if (typeof s.advFrequency === "string") setAdvFrequency(s.advFrequency);
      if (typeof s.advNumCalls === "string") setAdvNumCalls(s.advNumCalls);
      if (typeof s.advSchedulerGas === "string") setAdvSchedulerGas(s.advSchedulerGas);
      if (typeof s.advCliType === "string") setAdvCliType(s.advCliType);
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
        JSON.stringify({ saltLabel, hfRepoId, provider, model, prompt, fundingRit, advFrequency, advNumCalls, advSchedulerGas, advCliType, chosenExecutor }),
      );
    } catch {
      // private window etc.
    }
  }, [saltLabel, hfRepoId, provider, model, prompt, fundingRit, advFrequency, advNumCalls, advSchedulerGas, advCliType, chosenExecutor]);

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
      setWalletBalanceRit(null);
      if (next) loadBalance(next);
    };
    const chainChanged = (id: string) => {
      setChainId(id);
      setPrepared(null);
      setVerify(null);
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

  async function prepare() {
    setBusy("prepare");
    setError("");
    setPrepared(null);
    setVerify(null);
    try {
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
          hfRepoId,
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Prepare failed.");
      setPrepared(data);
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
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, ...prepared.configureTx }],
      });
      setStartHash(hash);
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
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="border border-border bg-surface p-6">
            <div className="mb-4 inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
              <Rocket className="h-4 w-4" />
              Sovereign deployer
            </div>
            <h1 className="font-display text-5xl leading-none tracking-normal sm:text-6xl">Deploy Sovereign Agent</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-accent">with ease</p>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Connect wallet, prepare the official factory harness, deploy it, then fund and start the scheduler with 0.5 RITUAL.
            </p>
          </div>

          <div className="border border-border bg-surface p-5">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-text-secondary">Progress</h2>
            <div className="space-y-3">
              {[
                "Connect wallet",
                "Use Ritual Testnet",
                "Prepare calldata",
                "Deploy harness",
                "Fund and start",
                "Monitor listing",
              ].map((label, index) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-xs ${
                      step > index + 1
                        ? "border-emerald-400 bg-emerald-400 text-black"
                        : step === index + 1
                          ? "border-accent text-accent"
                          : "border-border text-text-secondary"
                    }`}
                  >
                    {step > index + 1 ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={step === index + 1 ? "text-text-primary" : "text-text-secondary"}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <HealthPanel health={health} onRefresh={loadHealth} />
        </aside>

        <main className="space-y-5">
          {error && (
            <div className="flex items-start gap-3 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-text-primary">
              <span className="text-accent"><Sparkles className="h-5 w-5" /></span>
              Before you start (5 min)
            </div>
            <p className="mb-3 text-sm text-text-secondary">
              You&apos;ll deploy a <b>Sovereign Agent</b> — a tiny on-chain bot that wakes up every ~12 minutes
              and runs a prompt on a TEE-verified AI executor. Total time: <b>5–10 minutes</b>. Total cost:{" "}
              <b>~0.15 RIT</b> (one-time).
            </p>
            <ol className="space-y-2 text-sm leading-6 text-text-secondary">
              <li className="flex gap-3">
                <span className="font-mono text-xs text-accent">1.</span>
                <span>
                  <b>Wallet with ≥ 0.16 RIT.</b> Use a burner wallet (don&apos;t use your main one). Get RITUAL from{" "}
                  <a href="https://faucet.ritualfoundation.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    faucet.ritualfoundation.org
                  </a>{" "}
                  or in Ritual Discord <code>#testnet-faucet</code>.
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
                  <b>One LLM API key.</b> Cheapest = OpenRouter (free models available). Other options work too — you&apos;ll pick from a dropdown below.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-accent">4.</span>
                <span>
                  <b>Keep this tab open</b> while the executor settles (~3 min). Closing it won&apos;t break anything but you&apos;ll need to use the monitor link to see status.
                </span>
              </li>
            </ol>
          </section>

          <details className="border border-border bg-surface p-5 open:pb-5">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-accent">
              If something goes wrong (common errors + fixes)
            </summary>
            <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
              <div>
                <p className="font-mono text-xs text-text-primary">&quot;Wallet balance too low&quot;</p>
                <p>You need at least your chosen funding amount + 0.06 RIT for gas. Hit the faucet again or lower the funding to 0.1 RIT.</p>
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
              <div>
                <p className="font-mono text-xs text-text-primary">Agent works but only ~10 wakeups, not 50</p>
                <p>Old deployments (before Jun 2026) used schedulerGas 1.8M which burns 5× more per wakeup. This deployer uses 500k so 0.1 RIT lasts ~50 wakeups.</p>
              </div>
            </div>
          </details>

          <Panel
            title="1. Wallet"
            icon={<Wallet className="h-5 w-5" />}
            subtitle="Connect a Ritual Testnet wallet. Use a burner with at least 0.16 RIT."
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="border border-border bg-bg p-4 font-mono text-sm text-text-secondary">
                {account ? account : "No wallet connected"}
              </div>
              {!account ? (
                <button onClick={connect} className="bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300">
                  Connect wallet
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={changeWallet} className="border border-border px-4 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent">
                    Change
                  </button>
                  <button onClick={disconnect} className="border border-border px-4 py-3 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-red-400/60 hover:text-red-300">
                    Disconnect
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
              <Pill ok={connected} label={connected ? `Wallet ${short(account)}` : "Wallet required"} />
              <Pill ok={chainOk} label={chainOk ? "Ritual Testnet 1979" : `Wrong chain ${chainId || "-"}`} />
              {walletBalanceRit !== null && (
                <Pill ok={balanceOk} label={`Balance ${walletBalanceRit} RIT`} />
              )}
              {!chainOk && connected && (
                <button onClick={switchChain} className="border border-border px-3 py-1.5 font-mono uppercase tracking-wider text-accent hover:border-accent">
                  Switch chain
                </button>
              )}
            </div>
          </Panel>

          {prepared && collapseForm ? (
            <section className="border border-border bg-surface p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-text-primary">
                  <span className="text-accent"><Sparkles className="h-5 w-5" /></span>
                  2. Agent setup ✓ ready
                </div>
                <button
                  onClick={() => setCollapseForm(false)}
                  className="border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent hover:border-accent"
                >
                  Edit
                </button>
              </div>
              <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
                <p>Salt: <span className="font-mono text-text-primary">{saltLabel}</span></p>
                <p>HF: <span className="font-mono text-text-primary">{hfRepoId}</span></p>
                <p>Provider: <span className="font-mono text-text-primary">{provider}</span></p>
                <p>Model: <span className="font-mono text-text-primary">{model}</span></p>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Salt label (any string — determines your agent address)">
                <input
                  value={saltLabel}
                  onChange={(e) => setSaltLabel(e.target.value)}
                  placeholder="my-agent-1"
                  className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
                />
              </Field>
              <Field label="HF Repo ID (your-username/dataset-name)">
                <input
                  value={hfRepoId}
                  onChange={(e) => setHfRepoId(e.target.value)}
                  placeholder="your-username/your-dataset"
                  className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
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
                className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowHfHelp((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-accent hover:underline"
              >
                {showHfHelp ? "Hide" : "Show"} HuggingFace setup steps
              </button>
              {showHfHelp && (
                <div className="mt-2 space-y-2 border border-border bg-bg p-4 text-xs leading-5 text-text-secondary">
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
                      The HF repo ID is <code>username/dataset-name</code> — paste it in the &quot;HF Repo ID&quot; field. <b>No URL.</b>
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
                className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
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
                <div className="mt-2 space-y-2 border border-border bg-bg p-4 text-xs leading-5 text-text-secondary">
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
                      Paste below. Your key is ECIES-encrypted in this browser to the TEE executor before any network call — the server never sees it.
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
                className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
              />
            </Field>

            <Field label="Model">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
              >
                {providerCfg.modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={`TEE Executor (${executors.length} active) — pick a different one if Phase 2 keeps timing out`}>
              <select
                value={chosenExecutor}
                onChange={(e) => setChosenExecutor(e.target.value)}
                disabled={executors.length === 0}
                className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent disabled:opacity-50"
              >
                {executors.length === 0 && <option value="">Loading executors…</option>}
                {executors.map((ex, i) => (
                  <option key={ex.teeAddress} value={ex.teeAddress}>
                    {i === 0 ? "(default) " : ""}
                    {short(ex.teeAddress)}
                    {ex.endpoint ? ` — ${ex.endpoint}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prompt">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full resize-none border border-border bg-bg px-3 py-3 text-sm leading-6 outline-none focus:border-accent"
              />
            </Field>
            <Field label={`Initial funding (locked to harness escrow). Need ≥ ${requiredRit.toFixed(2)} RIT in wallet.`}>
              <div className="grid grid-cols-4 gap-2">
                {["0.1", "0.2", "0.5", "1.0"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFundingRit(opt)}
                    className={`border px-3 py-3 font-mono text-sm uppercase tracking-wider ${
                      fundingRit === opt ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/60"
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
            <details className="border border-border bg-bg p-4" onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-accent">
                Advanced: schedule + callback gas {showAdvanced ? "(open)" : "(safe defaults)"}
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Frequency (blocks)">
                  <input
                    type="number"
                    value={advFrequency}
                    onChange={(e) => setAdvFrequency(e.target.value)}
                    min={100}
                    max={10000}
                    step={100}
                    className="w-full border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary">100-10000. ~350ms per block.</p>
                </Field>
                <Field label="Window num calls">
                  <input
                    type="number"
                    value={advNumCalls}
                    onChange={(e) => setAdvNumCalls(e.target.value)}
                    min={1}
                    max={100}
                    className="w-full border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-accent"
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
                    className="w-full border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary">200k-5M. Lower = cheaper/wakeup.</p>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="CLI Type (Harness runtime)">
                  <select
                    value={advCliType}
                    onChange={(e) => setAdvCliType(e.target.value)}
                    className="w-full border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  >
                    <option value="5">5 — Crush (recommended)</option>
                    <option value="0">0 — Zeroclaw</option>
                    <option value="2">2 — Hermes</option>
                  </select>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    Runtime CLI inside the TEE. Crush is the safe default for all providers. Only change if you know what
                    Zeroclaw or Hermes do differently.
                  </p>
                </Field>
              </div>
              <div className="mt-3 grid gap-1 text-[11px] text-text-secondary">
                <p>
                  Lifespan per window:{" "}
                  <span className={advValid ? "font-mono text-text-primary" : "font-mono text-amber-300"}>
                    {advLifespan.toLocaleString()} blocks ({(advLifespan * 0.35 / 60).toFixed(1)} min)
                  </span>
                  {!advValid && " — invalid: frequency × numCalls must be ≤ 10,000"}
                </p>
                <p>
                  Estimated cost per wakeup:{" "}
                  <span className="font-mono text-text-primary">~{((schedGasNum * 1.2e-9 + 0.0005)).toFixed(4)} RIT</span>
                </p>
              </div>
            </details>

            <button
              onClick={prepare}
              disabled={!canPrepare || busy === "prepare"}
              className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {busy === "prepare" ? "Encrypting & preparing…" : "Prepare deploy"}
            </button>
            {busy === "prepare" && (
              <p className="text-xs text-text-secondary">
                Encrypting your API key in this browser → fetching executor → predicting your harness address → building transactions. No tx is sent yet.
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
              <div className="grid gap-4 md:grid-cols-2">
                <Preview label="Predicted harness" value={prepared.harness} onCopy={() => copy(prepared.harness, "harness")} copied={copied === "harness"} />
                <Preview label="Configure selector" value={`${prepared.calldataPreview.selector} (${prepared.calldataPreview.bytes.toLocaleString()} bytes)`} />
                <Preview label="Funding" value="0.5 RITUAL" />
                <Preview label="Schedule" value={`${prepared.schedule.numCalls} calls / every ${prepared.schedule.frequency} blocks`} />
                <Preview label="Callback gas" value={prepared.schedule.schedulerGas.toLocaleString()} />
                <Preview label="Template target" value={`${prepared.templateBytes.toLocaleString()} bytes`} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={sendDeploy}
                  disabled={busy === "deploy" || prepared.alreadyDeployed}
                  className="inline-flex items-center justify-center gap-2 border border-accent bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-secondary"
                >
                  {busy === "deploy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {prepared.alreadyDeployed ? "Harness deployed" : "Deploy harness"}
                </button>
                <button
                  onClick={sendStart}
                  disabled={busy === "start" || !canFund}
                  className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                  title={!deployDone ? "Deploy harness first" : !bytecodeGateOk ? "Bytecode verification pending — refresh verify" : ""}
                >
                  {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Fund {fundingRit} and start
                </button>
              </div>
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
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => verifyAgent()}
                  className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-accent hover:text-accent"
                >
                  <RefreshCw className={`h-4 w-4 ${busy === "verify" ? "animate-spin" : ""}`} />
                  Refresh verify
                </button>
                {verify?.explorerUrl && (
                  <a
                    href={verify.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
                  >
                    Explorer
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {prepared?.harness && (
                  <a
                    href={`/agent/${prepared.harness}`}
                    className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
                  >
                    Open monitor
                    <ArrowRight className="h-4 w-4" />
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
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="border border-border bg-surface p-5">
      <div className="mb-2 flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-text-primary">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {subtitle && <p className="mb-4 text-sm text-text-secondary">{subtitle}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs uppercase tracking-wider text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono uppercase tracking-wider ${ok ? "border-emerald-400/50 text-emerald-300" : "border-amber-400/50 text-amber-300"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function Preview({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div className="border border-border bg-bg p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</p>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-sm text-text-primary">{value}</p>
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
    <div className="border border-border bg-bg p-4">
      <div className={ok ? "text-emerald-300" : "text-amber-300"}>
        {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-1 font-mono text-sm text-text-primary">{value}</p>
    </div>
  );
}

function HealthPanel({ health, onRefresh }: { health: Health | null; onRefresh: () => void }) {
  return (
    <div className="border border-border bg-surface p-5">
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
        <Pill ok label="Server never sees plaintext keys" />
      </div>
    </div>
  );
}
