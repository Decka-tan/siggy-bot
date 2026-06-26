"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function DeployPage() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [saltLabel, setSaltLabel] = useState("");
  const [hfRepoId, setHfRepoId] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [provider, setProvider] = useState<ProviderKey>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDERS.openrouter.defaultModel);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [fundingRit, setFundingRit] = useState("0.1");
  const [showHfHelp, setShowHfHelp] = useState(false);
  const [showProviderHelp, setShowProviderHelp] = useState(false);
  const [walletBalanceRit, setWalletBalanceRit] = useState<string | null>(null);
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
  const canPrepare =
    connected &&
    chainOk &&
    balanceOk &&
    prompt.trim().length > 0 &&
    saltLabel.trim().length > 0 &&
    /^[\w.-]+\/[\w.-]+$/.test(hfRepoId.trim()) &&
    hfToken.trim().startsWith("hf_") &&
    apiKey.trim().startsWith(providerCfg.keyPrefix) &&
    model.trim().length > 0;
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

  async function encryptSecretsClientSide(payloadJson: string) {
    const res = await fetch("/api/ritual/get-executor", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch executor.");
    const pubKey: string = data.publicKey;
    const executor: string = data.executor;
    const plaintext = new TextEncoder().encode(payloadJson);
    const cipherBytes = encrypt(pubKey, plaintext);
    return { encryptedSecrets: toHex(cipherBytes), executor };
  }

  useEffect(() => {
    loadHealth();
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

          <Panel title="1. Wallet" icon={<Wallet className="h-5 w-5" />}>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="border border-border bg-bg p-4 font-mono text-sm text-text-secondary">
                {account ? account : "No wallet connected"}
              </div>
              <button onClick={connect} className="bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300">
                {account ? "Reconnect" : "Connect wallet"}
              </button>
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

          <Panel title="2. Agent input" icon={<Sparkles className="h-5 w-5" />}>
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
            <button
              onClick={prepare}
              disabled={!canPrepare || busy === "prepare"}
              className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Prepare deploy
            </button>
          </Panel>

          {prepared && (
            <Panel title="3. Preview transactions" icon={<Database className="h-5 w-5" />}>
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
            <Panel title="4. Monitor" icon={<ShieldCheck className="h-5 w-5" />}>
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

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-surface p-5">
      <div className="mb-5 flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-text-primary">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
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
