"use client";

import { useEffect, useMemo, useState } from "react";
import { encrypt, ECIES_CONFIG } from "eciesjs";
import {
  AlertTriangle,
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

function short(value = "") {
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function DeployPage() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [saltLabel, setSaltLabel] = useState(`siggy-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`);
  const [hfRepoId, setHfRepoId] = useState("decka-tan/ritual-sovereign-agent");
  const [hfToken, setHfToken] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
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
  const canPrepare =
    connected &&
    chainOk &&
    prompt.trim().length > 0 &&
    hfRepoId.includes("/") &&
    hfToken.trim().startsWith("hf_") &&
    openaiApiKey.trim().startsWith("sk-");
  const deployDone = Boolean(deployHash) || prepared?.alreadyDeployed || verify?.deployed;
  const startDone = Boolean(startHash);

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
      setAccount(accounts?.[0] || "");
      setPrepared(null);
      setVerify(null);
    };
    const chainChanged = (id: string) => {
      setChainId(id);
      setPrepared(null);
      setVerify(null);
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
    setAccount(accounts?.[0] || "");
    setChainId(await window.ethereum.request({ method: "eth_chainId" }));
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
      // The server never sees plaintext OPENAI_API_KEY or HF_TOKEN.
      const secretPayload = JSON.stringify({
        OPENAI_API_KEY: openaiApiKey,
        HF_TOKEN: hfToken,
      });
      const { encryptedSecrets, executor } = await encryptSecretsClientSide(secretPayload);

      const res = await fetch("/api/ritual/prepare-deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: account, saltLabel, hfRepoId, prompt, encryptedSecrets, executor }),
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
            <div className="mb-4 inline-flex items-center gap-2 border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
              <Rocket className="h-4 w-4" />
              Sovereign deployer
            </div>
            <h1 className="font-display text-5xl leading-none tracking-normal sm:text-6xl">Deploy Siggy Agent</h1>
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
              {!chainOk && connected && (
                <button onClick={switchChain} className="border border-border px-3 py-1.5 font-mono uppercase tracking-wider text-accent hover:border-accent">
                  Switch chain
                </button>
              )}
            </div>
          </Panel>

          <Panel title="2. Agent input" icon={<Sparkles className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Salt label">
                <input
                  value={saltLabel}
                  onChange={(e) => setSaltLabel(e.target.value)}
                  className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
                />
              </Field>
              <Field label="HF repo ID">
                <input
                  value={hfRepoId}
                  onChange={(e) => setHfRepoId(e.target.value)}
                  placeholder="username/dataset"
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
            </Field>
            <Field label="OpenAI API key">
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                className="w-full border border-border bg-bg px-3 py-3 font-mono text-sm outline-none focus:border-accent"
              />
            </Field>
            <Field label="Prompt">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full resize-none border border-border bg-bg px-3 py-3 text-sm leading-6 outline-none focus:border-accent"
              />
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
                  disabled={busy === "start" || !deployDone}
                  className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Fund 0.5 and start
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
