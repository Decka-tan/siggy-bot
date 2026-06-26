"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock,
  Coins,
  ExternalLink,
  Heart,
  Layers,
  Rocket,
  Shield,
  Sparkles,
  Timer,
  X,
  Zap,
  Terminal,
  ChevronRight,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { GoldenParticles } from "@/components/ui/GoldenParticles";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

type Choice = "sovereign" | "persistent" | null;

type Quip = { text: string };

const sovereignQuips: Quip[] = [
  { text: "Cheap! 0.1 RIT is enough to get listed on the testnet. Very friendly for first-timers." },
  { text: "Fast to deploy — connect your web3 wallet, sign 2 transactions, and you are done." },
  { text: "Short lifespan by default. After 5 wakeups the schedule ends and the agent becomes dormant." },
  { text: "Best for: 'I just want to prove I deployed a Ritual agent' or claiming testnet achievements." },
];

const persistentQuips: Quip[] = [
  { text: "Long-lived! Built to keep an active identity, persistent memory, and auto-revive on executor failure." },
  { text: "More expensive — the official Ritual portal launcher expects around 2.1 RIT minimum." },
  { text: "Setup goes through agents.ritualfoundation.org. They handle the execution harness lifecycle." },
  { text: "Pick this if you are building a real, always-on assistant or production AI agent service." },
];

const SIGGY_HERO = "/siggy-girl-happy.png";
const SIGGY_SOVEREIGN = "/siggy-girl-happy.png";
const SIGGY_PERSISTENT = "/siggy-girl-shock.png";

export default function DeployLanding() {
  const [choice, setChoice] = useState<Choice>("sovereign");
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "SYSTEM: Siggy Deployer initialized.",
    "SYSTEM: Ready to list on Ritual chain.",
  ]);
  const [terminalPaused, setTerminalPaused] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const TERMINAL_COMMANDS: Record<string, string[]> = {
    help: [
      "Available commands: help, deploy-cost, agent-types, status",
      "Type a chip below to simulate a command.",
    ],
    "deploy-cost": [
      "Sovereign agent: ~0.002 RIT/wakeup × 5 wakeups = ~0.01 RIT + escrow buffer",
      "Recommended escrow: 0.1 RIT (covers 5 full schedule cycles)",
      "Persistent agent: ~2.1 RIT minimum (official Ritual launcher)",
    ],
    "agent-types": [
      "Sovereign (0x080C): Short-lived, cheap, no DA memory. Best for demos.",
      "Persistent (0x0820): Long-lived, auto-revive, DA-backed. Best for production.",
    ],
    status: [
      "Chain: Ritual Testnet (ID: 1979)",
      "Registry: 0x3B1...f7e4 — active",
      "TEE Executors online: 15/15",
      "Avg block time: 0.35s · Avg gas: 0.0019 RIT/wakeup",
    ],
  };

  function runTerminalCommand(cmd: string) {
    const lines = TERMINAL_COMMANDS[cmd] || [`Error: unknown command '${cmd}'`];
    setTerminalPaused(true);
    setTerminalLogs([`> ${cmd}`, ...lines]);
    setTimeout(() => setTerminalPaused(false), 6000);
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const active = choice ? (choice === "sovereign" ? sovereignQuips : persistentQuips) : sovereignQuips;
  const activeDialogue = active[dialogueIndex]?.text || "";

  // Reset dialogue index on choice swap
  useEffect(() => {
    setDialogueIndex(0);
  }, [choice]);

  // Typewriter effect
  useEffect(() => {
    let isCancelled = false;
    let currentIdx = 0;
    setTypewriterText("");

    const type = () => {
      if (isCancelled) return;
      if (currentIdx <= activeDialogue.length) {
        setTypewriterText(activeDialogue.substring(0, currentIdx));
        currentIdx++;
        setTimeout(type, 16);
      }
    };
    type();

    return () => {
      isCancelled = true;
    };
  }, [choice, dialogueIndex, activeDialogue]);

  // Mock Terminal log streaming — paused when user ran a command
  useEffect(() => {
    if (terminalPaused) return;
    const mockLogs = [
      "SDK: Local secrets loaded securely.",
      "SIGGY-CORE: Bytecode compiled successfully (10,822 bytes).",
      "FACTORY: Predicting client address on chain 1979...",
      "FACTORY: Predicted harness: 0x1da3...e122",
      "SMOKE-TEST: Running HF credentials validation...",
      "SMOKE-TEST: Credentials match, mock inference OK.",
      "ESCROW: Expected schedule cost ~0.002 RIT per loop.",
      "ESCROW: Escrow threshold set to 0.1 RIT.",
      "SYSTEM: Awaiting wallet transaction signatures...",
      "SYSTEM: Active listening mode armed.",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setTerminalLogs((prev) => {
        const nextLogs = [...prev, mockLogs[idx]];
        if (nextLogs.length > 5) {
          nextLogs.shift();
        }
        return nextLogs;
      });
      idx = (idx + 1) % mockLogs.length;
    }, 4500);

    return () => clearInterval(interval);
  }, [terminalPaused]);

  const handleNextDialogue = () => {
    const quipsList = choice === "sovereign" ? sovereignQuips : persistentQuips;
    if (dialogueIndex < quipsList.length - 1) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      setDialogueIndex(0);
    }
  };

  return (
    <main
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-bg pt-28 text-text-primary overflow-x-hidden"
      style={{
        "--mouse-x": `${mousePos.x}px`,
        "--mouse-y": `${mousePos.y}px`,
      } as React.CSSProperties}
    >
      <GoldenParticles mode="ambient" />

      {/* Dynamic Cursor Spotlight Glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-50 transition-opacity duration-300"
        style={{
          background: `radial-gradient(800px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 215, 0, 0.07), transparent 75%)`
        }}
      />

      {/* Background radial glows */}
      <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[150px] pointer-events-none" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        .siggy-float {
          animation: float 4.5s ease-in-out infinite;
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .orbit-ring {
          animation: spinSlow 20s linear infinite;
        }
      `}</style>

      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* HERO */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent border border-accent/20 rounded-md">
              <Rocket className="h-4 w-4 animate-pulse" />
              Ritual Testnet Deployer
            </div>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Deploy Agent <span className="text-accent">easily</span> with Siggy
            </h1>
            <p className="max-w-xl text-base leading-7 text-text-secondary">
              Sovereign or Persistent? Siggy walks you through both, sets safe defaults, encrypts your secrets in
              the browser, and only asks your wallet to sign when the math is right.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#pick"
                className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-300 transition rounded-lg"
              >
                Pick your agent
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="https://docs.ritualfoundation.org/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/5 bg-surface/30 px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent/40 rounded-lg transition-colors"
              >
                What is Ritual?
              </Link>
            </div>

            {/* Interactive Terminal Console */}
            <div className="border border-white/5 bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-4 shadow-2xl font-mono text-[11px] max-w-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Terminal className="h-3.5 w-3.5 text-accent" />
                  <span>Siggy Deploy Console v1.0.0</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                </div>
              </div>
              <div className="space-y-1.5 min-h-[90px] text-text-secondary">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-accent select-none">&gt;</span>
                    <span className={log.startsWith('> ') ? 'text-accent font-bold' : log.includes("SYSTEM:") ? "text-accent" : log.includes("Error") ? "text-red-400" : "text-text-primary"}>
                      {log}
                    </span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <span className="text-accent select-none animate-pulse">&gt;</span>
                  <span className="w-2 h-3.5 bg-accent/80 animate-pulse ml-0.5" />
                </div>
              </div>
              {/* Clickable command chips */}
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                {(['help', 'deploy-cost', 'agent-types', 'status'] as const).map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => runTerminalCommand(cmd)}
                    className="px-2.5 py-1 rounded-md bg-accent/10 hover:bg-accent/20 border border-accent/15 hover:border-accent/40 text-accent text-[10px] font-mono uppercase tracking-wider transition-all hover:scale-[1.03]"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-text-secondary">
              <Pill icon={<Shield className="h-3.5 w-3.5" />} label="Secrets stay in browser" />
              <Pill icon={<Zap className="h-3.5 w-3.5" />} label="Verified factory pattern" />
              <Pill icon={<Coins className="h-3.5 w-3.5" />} label="From 0.1 RIT" />
            </div>
          </div>

          {/* Right Column: Character Image anchored to bottom right */}
          <div className="relative hidden lg:block self-stretch pointer-events-none min-h-[500px]">
            {/* Ambient Summoning Portal rings behind character */}
            <div className="absolute w-80 h-80 rounded-full border border-accent/5 animate-[spin_30s_linear_infinite] pointer-events-none bottom-10 right-10" />
            <div className="absolute w-[420px] h-[420px] rounded-full border border-dashed border-accent/5 animate-[spin_40s_linear_infinite_reverse] pointer-events-none bottom-0 right-0" />
            <div className="absolute w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none bottom-20 right-20" />
            <div className="absolute bottom-0 right-0 z-30 h-[56%] w-[72%] pointer-events-none">
              <div
                className="absolute bottom-0 left-0 h-[30px] w-full bg-accent shadow-[0_0_34px_rgba(255,215,0,0.22)]"
                style={{ clipPath: "polygon(28px 0, 100% 0, 100% 100%, 0 100%)" }}
              />
              <div
                className="absolute bottom-0 right-0 h-full w-[30px] bg-accent shadow-[0_0_34px_rgba(255,215,0,0.22)]"
                style={{ clipPath: "polygon(0 28px, 100% 0, 100% 100%, 0 100%)" }}
              />
            </div>

            {/* Anime Character pinned to bottom-right of the column */}
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="absolute bottom-0 right-0 w-[380px] xl:w-[440px]"
              style={{ height: '90%', maxHeight: '700px' }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="relative w-full h-full"
              >
                <Image
                  src="/character.png"
                  alt="Siggy Character"
                  fill
                  className="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(255,215,0,0.1)]"
                  priority
                  sizes="440px"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* PICK SECTION */}
        <div id="pick" className="mt-28 space-y-8">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Step 1</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Pick your agent type</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
              Tap one — Siggy will tell you the trade-offs before you commit any RITUAL.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ChoiceCard
              icon={<Zap className="h-5 w-5" />}
              kind="sovereign"
              title="Sovereign Agent"
              tagline="Job primitive · short-lived · cheap"
              cost="from 0.1 RIT"
              active={choice === "sovereign"}
              onClick={() => setChoice("sovereign")}
            />
            <ChoiceCard
              icon={<Heart className="h-5 w-5" />}
              kind="persistent"
              title="Persistent Agent"
              tagline="Service primitive · long-lived · revivable"
              cost="~2.1 RIT"
              active={choice === "persistent"}
              onClick={() => setChoice("persistent")}
            />
          </div>

          {/* VISUAL NOVEL DIALOGUE CONSOLE */}
          <AnimatePresence mode="wait">
            {choice && (
              <motion.div
                key={choice}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="grid gap-6 border border-white/5 bg-surface/30 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_40px_rgba(255,215,0,0.02)] md:grid-cols-[180px_1fr] md:p-8"
              >
                <div className="relative mx-auto h-36 w-36 md:h-44 md:w-44 flex items-end justify-center overflow-hidden">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={choice === "sovereign" ? SIGGY_SOVEREIGN : SIGGY_PERSISTENT}
                      alt="Siggy"
                      fill
                      className="object-contain"
                      sizes="180px"
                    />
                  </motion.div>
                </div>
                <div className="space-y-5 flex flex-col justify-between">
                  <div
                    onClick={handleNextDialogue}
                    className="group/dialogue cursor-pointer relative bg-bg/40 border border-white/5 p-4 rounded-xl hover:border-accent/20 transition-all min-h-[90px] flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Siggy says
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-text-primary pr-4">
                        {typewriterText}
                        <span className="w-1.5 h-3.5 bg-accent/85 inline-block ml-1 animate-pulse" />
                      </p>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-text-secondary group-hover/dialogue:text-accent transition-colors">
                        <span>Next advice</span>
                        <ChevronRight className="h-3 w-3 group-hover/dialogue:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Lifespan" value={choice === "sovereign" ? "5 wakeups per schedule" : "Indefinite"} icon={<Clock className="h-4 w-4" />} />
                    <Stat label="Min funding" value={choice === "sovereign" ? "0.1 RIT" : "~2.1 RIT"} icon={<Coins className="h-4 w-4" />} />
                    <Stat label="State" value={choice === "sovereign" ? "Ephemeral" : "DA-backed memory"} icon={<Layers className="h-4 w-4" />} />
                    <Stat label="Setup" value={choice === "sovereign" ? "2 txs, ~3 min" : "Official launcher"} icon={<Timer className="h-4 w-4" />} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* COMPARISON */}
        <div className="mt-28 space-y-8">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Side by side</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Sovereign vs Persistent</h2>
          </div>

          <div className="overflow-x-auto border border-white/5 bg-surface/35 backdrop-blur-sm rounded-2xl shadow-xl">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-bg/40 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="p-4">Aspect</th>
                  <th className="p-4">Sovereign</th>
                  <th className="p-4">Persistent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <ComparisonRow label="Precompile" sov="0x080C" per="0x0820" />
                <ComparisonRow label="Concept" sov="Job — task one-shot/batch" per="Service — long-lived" />
                <ComparisonRow label="Best for" sov="Achievement / demo" per="Always-on assistant" />
                <ComparisonRow label="Lifespan" sov={<X className="inline h-4 w-4 text-red-300" />} per={<Check className="inline h-4 w-4 text-emerald-300" />} sovText="Short" perText="Indefinite" />
                <ComparisonRow label="Min funding" sov="0.1 RIT" per="~2.1 RIT" />
                <ComparisonRow label="State & memory" sov="Ephemeral" per="DA-backed (HF/GCS/Pinata)" />
                <ComparisonRow label="Reviveable" sov={<X className="inline h-4 w-4 text-red-300" />} per={<Check className="inline h-4 w-4 text-emerald-300" />} />
                <ComparisonRow label="Deploy here" sov="Siggy deployer" per="agents.ritualfoundation.org" />
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-28">
          <div className="grid gap-8 border border-white/5 bg-surface/30 backdrop-blur-md rounded-2xl p-8 shadow-[0_0_40px_rgba(255,215,0,0.02)] md:grid-cols-[1fr_240px] md:p-12">
            <div className="space-y-5">
              <p className="font-mono text-xs uppercase tracking-wider text-accent">Step 2</p>
              <h2 className="font-display text-4xl leading-tight sm:text-5xl">Ready to deploy?</h2>
              <p className="text-sm leading-6 text-text-secondary">
                {choice === "persistent"
                  ? "Persistent agents launch through the official Ritual portal. Click to continue there."
                  : "Sovereign agents go through Siggy's deployer. Secrets stay encrypted in your browser, factory pattern is verified, and Siggy will warn you before any irreversible step."}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                {choice === "persistent" ? (
                  <a
                    href="https://agents.ritualfoundation.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-300 transition rounded-lg"
                  >
                    Open Ritual launcher
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    href="/deploy/sovereign"
                    className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-300 transition rounded-lg"
                  >
                    Deploy sovereign with Siggy
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <a
                  href="https://github.com/Decka-tan/siggy-bot/blob/main/ritual-deploy/TUTORIAL-EN.md"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-white/5 px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent/40 rounded-lg transition"
                >
                  Read tutorial
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative hidden h-full min-h-[200px] md:block siggy-float">
              <Image src="/siggy-girl-happy.png" alt="Siggy ready" fill className="object-contain" sizes="240px" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-white/5 bg-surface/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary rounded-lg backdrop-blur-sm">
      <span className="text-accent">{icon}</span>
      {label}
    </span>
  );
}

function ChoiceCard({
  icon,
  kind,
  title,
  tagline,
  cost,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  kind: "sovereign" | "persistent";
  title: string;
  tagline: string;
  cost: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <SpotlightCard
      glowColor={active ? "rgba(255, 215, 0, 0.12)" : "rgba(255, 215, 0, 0.05)"}
      className={`rounded-xl border ${
        active
          ? "border-accent bg-accent/10 shadow-[0_0_24px_rgba(255,215,0,0.08)] scale-[1.01]"
          : "border-white/5 bg-surface/40 hover:border-accent/40 hover:bg-surface/60 hover:scale-[1.005]"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full text-left p-6"
      >
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 ${active ? "text-accent" : "text-text-secondary"}`}>
            {icon}
            <span className="font-mono text-xs uppercase tracking-wider">{kind}</span>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">{cost}</span>
        </div>
        <h3 className="mt-4 font-display text-3xl">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{tagline}</p>
        <div className="mt-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          {active ? "Selected" : "Tap to learn"}
        </div>
      </button>
    </SpotlightCard>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-white/5 bg-bg/50 backdrop-blur-sm rounded-lg p-3">
      <div className="flex items-center gap-2 text-text-secondary">
        <span className="text-accent">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-mono text-sm text-text-primary">{value}</p>
    </div>
  );
}

function ComparisonRow({
  label,
  sov,
  per,
  sovText,
  perText,
}: {
  label: string;
  sov: React.ReactNode;
  per: React.ReactNode;
  sovText?: string;
  perText?: string;
}) {
  return (
    <tr className="font-mono text-xs sm:text-sm hover:bg-white/5 transition-colors">
      <td className="p-4 uppercase tracking-wider text-text-secondary border-b border-white/5">{label}</td>
      <td className="p-4 text-text-primary border-b border-white/5">
        <span className="inline-flex items-center gap-2">{sov}{sovText && <span>{sovText}</span>}</span>
      </td>
      <td className="p-4 text-text-primary border-b border-white/5">
        <span className="inline-flex items-center gap-2">{per}{perText && <span>{perText}</span>}</span>
      </td>
    </tr>
  );
}
