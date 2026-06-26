"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
  Rocket,
  Trash2,
  Zap,
} from "lucide-react";

type AgentRecord = {
  address: string;
  saltLabel?: string;
  deployTx?: string;
  configureTx?: string;
  owner?: string;
  createdAt: number;
  note?: string;
};

type LiveSummary = {
  listed: boolean | null;
  escrowRit: string | null;
  lastActivityBlock: number | null;
  bytecodeBytes: number | null;
};

const STORAGE_KEY = "siggy.deployed.agents.v1";

function loadRecords(): AgentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is AgentRecord => typeof r?.address === "string");
  } catch {
    return [];
  }
}

function saveRecords(records: AgentRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function short(value = "") {
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function MyAgentsPage() {
  const [records, setRecords] = useState<AgentRecord[]>([]);
  const [live, setLive] = useState<Record<string, LiveSummary>>({});
  const [busy, setBusy] = useState("");
  const [manualAddr, setManualAddr] = useState("");

  useEffect(() => {
    const initial = loadRecords();
    setRecords(initial);
    initial.forEach((r) => refreshOne(r.address));
  }, []);

  async function refreshOne(address: string) {
    try {
      const res = await fetch(`/api/ritual/verify-agent?address=${address}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setLive((cur) => ({
          ...cur,
          [address.toLowerCase()]: {
            listed: Boolean(data.listed),
            escrowRit: data.escrowRit ?? null,
            lastActivityBlock: data.lastActivityBlock ?? null,
            bytecodeBytes: data.bytecodeBytes ?? null,
          },
        }));
      }
    } catch {
      // ignore single failure
    }
  }

  async function refreshAll() {
    if (busy === "refresh") return;
    setBusy("refresh");
    await Promise.all(records.map((r) => refreshOne(r.address)));
    setBusy("");
  }

  function removeAgent(address: string) {
    const next = records.filter((r) => r.address.toLowerCase() !== address.toLowerCase());
    setRecords(next);
    saveRecords(next);
  }

  function addManual() {
    const addr = manualAddr.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return;
    if (records.some((r) => r.address.toLowerCase() === addr.toLowerCase())) {
      setManualAddr("");
      return;
    }
    const next = [{ address: addr, createdAt: Date.now(), note: "Manually added" }, ...records];
    setRecords(next);
    saveRecords(next);
    setManualAddr("");
    refreshOne(addr);
  }

  return (
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-24 sm:px-6 lg:px-8">
        <header className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent border border-accent/20 rounded-md">
              <Inbox className="h-4 w-4" />
              My agents
            </div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Agents you&apos;ve <span className="text-accent">deployed</span>
            </h1>
            <p className="max-w-xl text-sm text-text-secondary">
              Saved in your browser only. If you clear site data or switch device, paste the address below to add it back.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent transition-all"
            >
              {busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh all
            </button>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 rounded-lg transition-all"
            >
              <Rocket className="h-4 w-4" />
              Deploy new
            </Link>
          </div>
        </header>

        <section className="border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-6 transition-all duration-300 hover:border-accent/20">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
            Add an agent by address (or paste a harness someone shared with you)
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={manualAddr}
              onChange={(e) => setManualAddr(e.target.value)}
              placeholder="0xYourHarnessAddress"
              className="min-w-0 flex-1 border border-white/10 bg-bg/40 focus:bg-bg/60 backdrop-blur-sm rounded-lg px-4 py-2 font-mono text-sm outline-none focus:border-accent transition-all"
            />
            <button
              onClick={addManual}
              disabled={!/^0x[0-9a-fA-F]{40}$/.test(manualAddr.trim())}
              className="inline-flex items-center gap-2 border border-accent bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-text-secondary rounded-lg transition-all"
            >
              Add
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {records.length === 0 ? (
          <div className="grid items-center gap-6 border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-8 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-2xl">No agents saved here yet.</h2>
              <p className="mt-2 max-w-xl text-sm text-text-secondary">
                Deploy a sovereign agent and Siggy will remember the address for you — no signup required. Already deployed elsewhere? Paste the harness address above.
              </p>
              <Link
                href="/deploy"
                className="mt-5 inline-flex items-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 rounded-lg transition-all"
              >
                Deploy your first agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <Image src="/siggy-girl-shy.png" alt="Siggy waiting" width={180} height={180} className="object-contain" />
          </div>
        ) : (
          <div className="grid gap-3">
            {records.map((r) => (
              <AgentRow
                key={r.address}
                record={r}
                live={live[r.address.toLowerCase()]}
                onRemove={() => removeAgent(r.address)}
                onRefresh={() => refreshOne(r.address)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AgentRow({
  record,
  live,
  onRemove,
  onRefresh,
}: {
  record: AgentRecord;
  live: LiveSummary | undefined;
  onRemove: () => void;
  onRefresh: () => void;
}) {
  const created = new Date(record.createdAt).toLocaleString();
  const status = live === undefined ? "loading" : live.listed ? "active" : live.bytecodeBytes ? "dormant" : "missing";
  const statusColor =
    status === "active" ? "text-emerald-300" : status === "dormant" ? "text-amber-300" : status === "missing" ? "text-red-300" : "text-text-secondary";
  const statusLabel =
    status === "active" ? "Listed" : status === "dormant" ? "Dormant" : status === "missing" ? "Not deployed" : "Checking…";

  return (
    <div className="grid gap-4 border border-white/5 bg-surface/40 backdrop-blur-md rounded-xl p-5 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(255,215,0,0.03)] transition-all duration-300 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/agent/${record.address}`} className="font-display text-2xl text-accent hover:underline">
            {short(record.address)}
          </Link>
          <span className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${
              status === 'active' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' :
              status === 'dormant' ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)] animate-pulse' :
              status === 'missing' ? 'bg-red-400' : 'bg-white/20 animate-pulse'
            }`} />
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-text-secondary">{record.address}</p>
        <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
          <div>
            <span className="font-mono uppercase tracking-wider">Escrow</span>
            <p className="mt-0.5 font-mono text-text-primary">{live?.escrowRit ?? "—"} RIT</p>
          </div>
          <div>
            <span className="font-mono uppercase tracking-wider">Last activity</span>
            <p className="mt-0.5 font-mono text-text-primary">
              {live?.lastActivityBlock ? `block ${live.lastActivityBlock.toLocaleString()}` : "—"}
            </p>
          </div>
          <div>
            <span className="font-mono uppercase tracking-wider">Saved</span>
            <p className="mt-0.5 font-mono text-text-primary">{created}</p>
          </div>
        </div>
        {record.saltLabel && (
          <p className="mt-2 font-mono text-[11px] text-text-secondary">
            salt label: <span className="text-text-primary">{record.saltLabel}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <Link
          href={`/agent/${record.address}`}
          className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300 rounded-lg transition-all"
        >
          Open
          <ArrowRight className="h-4 w-4" />
        </Link>
        {status === 'dormant' && (
          <Link
            href={`/deploy/sovereign?revive=${record.address}`}
            className="inline-flex items-center justify-center gap-2 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-amber-300 hover:text-amber-200 transition-all"
          >
            <Zap className="h-4 w-4" />
            Re-fund &amp; Revive
          </Link>
        )}
        <button
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-accent/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-accent transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
        <button
          onClick={onRemove}
          className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-red-500/40 rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-red-300 transition-all"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      </div>
    </div>
  );
}
