"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Wallet,
} from "lucide-react";

type RitualStatus = {
  ok: boolean;
  checkedAt: string;
  blockNumber: number;
  owner: string;
  agent: string;
  factory: string;
  ritualWallet: string;
  deployTx: string;
  configureTx: string;
  schedulerCallId: string;
  listed: boolean;
  lastActivityBlock: number | null;
  cacheSovereignCount: number;
  bytecodeBytes: number;
  templateMatch: boolean;
  ownerBalanceRit: string;
  escrowRit: string;
  explorerUrl: string;
  error?: string;
};

const short = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

const commands = [
  {
    label: "V5 cache proof",
    value:
      "curl -s https://explorer.ritualfoundation.org/api/agents/cache | python3 -c \"import json,sys; d=json.load(sys.stdin); t='0x7d982c0e05fe9de98f006d6d629619bf6caee537'; print([x for x in d.get('sovereign',[]) if x['address'].lower()==t])\"",
  },
  {
    label: "Escrow balance",
    value:
      "cast call 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948 \"balanceOf(address)(uint256)\" 0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537 --rpc-url $RPC_URL",
  },
  {
    label: "Future deploy script",
    value: "bash ritual-deploy/deploy-sovereign-harness.sh",
  },
  {
    label: "Monitor script",
    value: "bash ritual-deploy/monitor.sh 0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537",
  },
];

export default function RitualDashboardPage() {
  const [status, setStatus] = useState<RitualStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const response = await fetch("/api/ritual/status", { cache: "no-store" });
      const data = (await response.json()) as RitualStatus;
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = window.setInterval(loadStatus, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const lastActivityLag = useMemo(() => {
    if (!status?.blockNumber || !status.lastActivityBlock) return null;
    return Math.max(0, status.blockNumber - status.lastActivityBlock);
  }, [status]);

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-between gap-8 border-b border-border pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
                <ShieldCheck className="h-4 w-4" />
                Ritual Testnet Sovereign
              </div>
              <h1 className="font-display text-5xl leading-none tracking-normal text-text-primary sm:text-7xl">
                Siggy Agent Dashboard
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
                Live proof surface for Siggy V5: factory deployed, explorer-listed, and tracked from the same Ritual cache that decides sovereign visibility.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/deploy"
                  className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                >
                  Deploy your own agent
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href="#monitor"
                  className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
                  onClick={(e) => {
                    e.preventDefault();
                    const addr = window.prompt("Enter your agent address (0x...)") || "";
                    if (/^0x[0-9a-fA-F]{40}$/.test(addr.trim())) {
                      window.location.href = `/agent/${addr.trim()}`;
                    } else if (addr) {
                      alert("Invalid address. Format: 0x + 40 hex chars.");
                    }
                  }}
                >
                  Monitor my agent
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Explorer status"
                value={status?.listed ? "Listed" : loading ? "Checking" : "Not listed"}
                tone={status?.listed ? "good" : "warn"}
              />
              <Metric
                icon={<Activity className="h-5 w-5" />}
                label="Last activity"
                value={status?.lastActivityBlock ? status.lastActivityBlock.toLocaleString() : "-"}
              />
              <Metric
                icon={<Database className="h-5 w-5" />}
                label="Template bytes"
                value={status?.bytecodeBytes ? status.bytecodeBytes.toLocaleString() : "-"}
                tone={status?.templateMatch ? "good" : "warn"}
              />
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden border border-border bg-surface">
            <Image
              src="/siggy-transparent.png"
              alt="Siggy"
              width={520}
              height={520}
              priority
              className="absolute bottom-0 right-0 h-[92%] w-auto object-contain opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/50 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between p-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">Agent</p>
                <button
                  onClick={() => status && copyText("agent", status.agent)}
                  className="mt-2 flex max-w-full items-center gap-2 font-mono text-sm text-accent hover:text-yellow-300"
                >
                  <span className="truncate">{status?.agent || "0x7D982c...EE537"}</span>
                  <Copy className="h-4 w-4 shrink-0" />
                </button>
              </div>
              <div className="max-w-sm space-y-3">
                <a
                  href={status?.explorerUrl || "https://explorer.ritualfoundation.org"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                >
                  Open explorer
                  <ExternalLink className="h-4 w-4" />
                </a>
                <p className="font-mono text-xs text-text-secondary">
                  {copied === "agent" ? "Agent address copied" : "Factory pattern: deployHarness -> configureFundAndStart"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {status?.ok === false && (
          <div className="border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {status.error || "Ritual status API failed."}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusTile icon={<Gauge />} label="Current block" value={status?.blockNumber?.toLocaleString() || "-"} />
          <StatusTile icon={<Clock3 />} label="Activity lag" value={lastActivityLag === null ? "-" : `${lastActivityLag.toLocaleString()} blocks`} />
          <StatusTile icon={<Wallet />} label="Owner balance" value={`${status?.ownerBalanceRit || "-"} RIT`} />
          <StatusTile icon={<Database />} label="Escrow" value={`${status?.escrowRit || "-"} RIT`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border border-border bg-surface p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-mono text-sm uppercase tracking-wider text-text-primary">Proof record</h2>
                <p className="mt-1 text-sm text-text-secondary">Pinned from `ritual-deploy/PROOF.md`.</p>
              </div>
              <button
                onClick={loadStatus}
                className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-accent hover:text-accent"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              <ProofLine label="Owner" value={status?.owner || "0x35292c...E5CCd"} />
              <ProofLine label="Factory" value={status?.factory || "0x9dC4...f304"} />
              <ProofLine label="Deploy tx" value={status?.deployTx || ""} link={`https://explorer.ritualfoundation.org/tx/${status?.deployTx}`} />
              <ProofLine label="Configure tx" value={status?.configureTx || ""} link={`https://explorer.ritualfoundation.org/tx/${status?.configureTx}`} />
              <ProofLine label="Scheduler call" value={status?.schedulerCallId || "2742077"} />
              <ProofLine label="Cache count" value={status?.cacheSovereignCount?.toString() || "-"} />
            </div>
          </section>

          <section className="border border-border bg-surface p-5">
            <div className="mb-5">
              <h2 className="font-mono text-sm uppercase tracking-wider text-text-primary">Operator commands</h2>
              <p className="mt-1 text-sm text-text-secondary">Read-only checks and the saved future deploy flow.</p>
            </div>
            <div className="space-y-3">
              {commands.map((command) => (
                <div key={command.label} className="border border-border bg-bg p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
                      <Terminal className="h-4 w-4" />
                      {command.label}
                    </div>
                    <button
                      onClick={() => copyText(command.label, command.value)}
                      className="inline-flex items-center gap-2 border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-text-secondary hover:border-accent hover:text-accent"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied === command.label ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-text-secondary">
                    {command.value}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "good" | "warn" | "neutral";
}) {
  const toneClass = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-accent";
  return (
    <div className="border border-border bg-surface p-4">
      <div className={`mb-3 ${toneClass}`}>{icon}</div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function StatusTile({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center border border-border text-accent">
        {icon}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function ProofLine({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="grid gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[130px_1fr]">
      <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">{label}</p>
      {link && value ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-2 font-mono text-sm text-accent hover:text-yellow-300"
        >
          <span className="truncate">{short(value)}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </a>
      ) : (
        <p className="min-w-0 truncate font-mono text-sm text-text-primary">{value}</p>
      )}
    </div>
  );
}
