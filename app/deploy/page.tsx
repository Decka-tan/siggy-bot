"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Coins,
  ExternalLink,
  Heart,
  Layers,
  LockKeyhole,
  Rocket,
  Shield,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";

type Choice = "sovereign" | "persistent";

type Quip = {
  text: string;
  tone?: "good" | "warn";
};

const choices: Record<Choice, {
  eyebrow: string;
  title: string;
  tagline: string;
  cost: string;
  image: string;
  icon: React.ReactNode;
  action: string;
  href: string;
  external?: boolean;
  quips: Quip[];
}> = {
  sovereign: {
    eyebrow: "Siggy deployer",
    title: "Sovereign Agent",
    tagline: "Low-cost scheduled harness for demos, achievements, and testnet proof.",
    cost: "from 0.1 RIT",
    image: "/siggy-girl-happy.png",
    icon: <Zap className="h-5 w-5" />,
    action: "Deploy sovereign",
    href: "/deploy/sovereign",
    quips: [
      { text: "Browser-side credential smoke test before the wallet signs." },
      { text: "Default schedule: 5 wakeups every 2000 blocks, first wakeup around 12 minutes." },
      { text: "Refillable escrow keeps the harness alive after the first schedule window." },
      { text: "Best when you want the fastest path to a listed Ritual testnet agent.", tone: "good" },
    ],
  },
  persistent: {
    eyebrow: "Official launcher",
    title: "Persistent Agent",
    tagline: "Long-lived service agent with identity, state, and recovery flow.",
    cost: "~2.1 RIT",
    image: "/siggy-girl-shock.png",
    icon: <Heart className="h-5 w-5" />,
    action: "Open launcher",
    href: "https://agents.ritualfoundation.org/",
    external: true,
    quips: [
      { text: "Use this when the agent should behave like a real always-on service." },
      { text: "The official Ritual launcher owns more of the lifecycle and recovery path." },
      { text: "Higher starting cost, but better fit for durable identity and memory." },
      { text: "Siggy links out instead of pretending this route is handled locally.", tone: "warn" },
    ],
  },
};

const comparisonRows = [
  ["Precompile", "0x080C", "0x0820"],
  ["Concept", "Scheduled job harness", "Long-lived service"],
  ["Best for", "Demo, achievement, quick deploy", "Always-on assistant"],
  ["Default first wakeup", "~12 min", "Launcher managed"],
  ["Funding", "from 0.1 RIT", "~2.1 RIT"],
  ["Secrets", "Encrypted in browser", "Launcher flow"],
  ["State", "HF-backed runtime data", "DA-backed service state"],
  ["Deploy path", "Siggy deployer", "agents.ritualfoundation.org"],
];

export default function DeployLanding() {
  const [choice, setChoice] = useState<Choice>("sovereign");
  const active = choices[choice];

  const action = useMemo(() => {
    const className =
      "inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-yellow-300";

    if (active.external) {
      return (
        <a href={active.href} target="_blank" rel="noreferrer" className={className}>
          {active.action}
          <ExternalLink className="h-4 w-4" />
        </a>
      );
    }

    return (
      <Link href={active.href} className={className}>
        {active.action}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }, [active]);

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <section className="relative min-h-screen overflow-hidden">
        <HeroBackground />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pt-28 sm:px-8 md:pt-20">
          <div className="grid flex-1 items-center gap-8 pb-10 lg:grid-cols-[0.98fr_1.02fr]">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="inline-flex items-center gap-2 border border-accent/35 bg-bg/80 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent backdrop-blur"
              >
                <Rocket className="h-4 w-4" />
                Ritual Testnet Agent Deployer
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="mt-5 font-display text-6xl leading-[0.9] text-accent sm:text-7xl md:text-8xl lg:text-9xl"
              >
                DEPLOY
                <br />
                RITUAL
                <br />
                AGENTS
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                className="mt-6 max-w-xl text-sm leading-7 text-text-secondary md:text-base"
              >
                Pick a path, test credentials before spending faucet, then sign only when the deployer has verified the
                schedule, funding, and harness preview.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Link
                  href="/deploy/sovereign"
                  className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-4 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-yellow-300"
                >
                  Start sovereign deploy
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#choose"
                  className="inline-flex items-center justify-center gap-2 border border-border bg-bg/75 px-5 py-4 font-mono text-xs uppercase tracking-wider text-text-primary backdrop-blur transition hover:border-accent hover:text-accent"
                >
                  Compare paths
                  <ChevronDown className="h-4 w-4" />
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="mt-6 grid max-w-xl gap-2 text-xs text-text-secondary sm:grid-cols-3"
              >
                <HeroPill icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Smoke test first" />
                <HeroPill icon={<Coins className="h-3.5 w-3.5" />} label="From 0.1 RIT" />
                <HeroPill icon={<Clock className="h-3.5 w-3.5" />} label="~12 min first wakeup" />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 42 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="pointer-events-none relative hidden min-h-[680px] lg:block"
            >
              <Image
                src="/Logo_RItual_White.png"
                alt=""
                width={940}
                height={940}
                className="absolute -right-40 top-8 z-0 opacity-25"
                priority
              />
              <Image
                src="/character.png"
                alt="Siggy"
                width={800}
                height={1000}
                className="absolute bottom-[-48px] right-[-60px] z-10 h-[88vh] max-h-[900px] w-auto object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </div>

          <div className="mb-6 hidden items-center gap-4 border-t border-white/10 pt-4 text-xs text-text-secondary md:flex">
            <span className="font-mono uppercase tracking-wider text-accent">Next</span>
            <span>Choose Sovereign for the local Siggy flow, or Persistent for the official long-lived launcher.</span>
          </div>
        </div>
      </section>

      <section id="choose" className="border-t border-border bg-bg px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-accent">Choose a route</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
                Same mission, different lifecycle.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-text-secondary">
                The deployer now defaults to the practical testnet route: sovereign first, with clear warnings and a
                monitor path after funding. Persistent stays one click away when the project needs a real service agent.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(Object.keys(choices) as Choice[]).map((key) => (
                <ChoiceCard key={key} id={key} active={choice === key} onClick={() => setChoice(key)} />
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 border border-border bg-surface/45 p-5 backdrop-blur md:grid-cols-[180px_1fr] md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${choice}-image`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                className="relative mx-auto h-36 w-36 md:h-44 md:w-44"
              >
                <Image src={active.image} alt="Siggy advice" fill className="object-contain" sizes="180px" />
              </motion.div>
            </AnimatePresence>

            <div className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent">Siggy says</p>
                  <h3 className="mt-1 font-display text-2xl md:text-3xl">{active.title}</h3>
                </div>
                <span className="w-fit border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
                  {active.cost}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.ul
                  key={`${choice}-quips`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-5 grid gap-3 sm:grid-cols-2"
                >
                  {active.quips.map((quip) => (
                    <li key={quip.text} className="flex gap-3 border border-border bg-bg/60 p-3 text-sm leading-6 text-text-secondary">
                      <span className={`mt-1 h-2 w-2 shrink-0 ${quip.tone === "warn" ? "bg-yellow-300" : "bg-accent"}`} />
                      <span>{quip.text}</span>
                    </li>
                  ))}
                </motion.ul>
              </AnimatePresence>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {action}
                <a
                  href="https://www.ritualfoundation.org/docs/overview/what-is-ritual"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent transition hover:border-accent"
                >
                  Ritual docs
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-accent">What happens next</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">No mystery states.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-text-secondary">
                The deploy path should explain where the agent is stuck: wallet, credentials, harness, funding, wakeup,
                TEE callback, or listing. That matters more than looking shiny.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FlowStep icon={<Shield className="h-4 w-4" />} title="1. Smoke test" text="HF repo, HF write token, provider key, and model are checked before prepare." />
              <FlowStep icon={<Rocket className="h-4 w-4" />} title="2. Deploy harness" text="Transaction 1 deploys the empty harness. Existing salts skip the deploy path." />
              <FlowStep icon={<Coins className="h-4 w-4" />} title="3. Fund and start" text="Transaction 2 funds escrow and arms the schedule. This is the important one." />
              <FlowStep icon={<Timer className="h-4 w-4" />} title="4. Wait for listed" text="Default first wakeup is around 12 minutes, then the monitor tracks Phase 2." />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-accent">Side by side</p>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Sovereign vs Persistent</h2>
            </div>
            <Link
              href="/agent"
              className="inline-flex w-fit items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition hover:border-accent"
            >
              My agents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 overflow-x-auto border border-border bg-surface">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/55 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="p-4">Aspect</th>
                  <th className="p-4">Sovereign</th>
                  <th className="p-4">Persistent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map(([label, sovereign, persistent]) => (
                  <ComparisonRow key={label} label={label} sovereign={sovereign} persistent={persistent} />
                ))}
                <tr className="font-mono text-xs sm:text-sm">
                  <td className="p-4 uppercase tracking-wider text-text-secondary">Reviveable</td>
                  <td className="p-4 text-text-primary">
                    <X className="inline h-4 w-4 text-red-300" />
                  </td>
                  <td className="p-4 text-text-primary">
                    <Check className="inline h-4 w-4 text-emerald-300" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 hidden md:block">
        <div className="absolute inset-0 z-10 bg-bg" style={{ clipPath: "polygon(0 0, 64% 0, 46% 100%, 0 100%)" }} />
        <div className="absolute inset-0 z-0 bg-accent" style={{ clipPath: "polygon(63% 0, 67% 0, 49% 100%, 45% 100%)" }} />
        <div className="absolute inset-0 z-0 bg-accent" style={{ clipPath: "polygon(68% 0, 69% 0, 51% 100%, 50% 100%)" }} />
        <div className="absolute inset-0 z-[-1] bg-[#333333]" style={{ clipPath: "polygon(64% 0, 100% 0, 100% 100%, 46% 100%)" }}>
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundColor: "#333333",
              backgroundImage:
                "linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555), linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555)",
              backgroundPosition: "0 0, 50px 50px",
              backgroundSize: "100px 100px",
            }}
          />
        </div>
      </div>

      <div className="absolute inset-0 block md:hidden">
        <div className="absolute inset-0 z-10 bg-bg" style={{ clipPath: "polygon(0 0, 100% 0, 100% 94%, 0 100%)" }} />
        <div className="absolute inset-0 z-0 bg-accent" style={{ clipPath: "polygon(0 98%, 100% 92%, 100% 95%, 0 100%)" }} />
        <div className="absolute inset-0 z-[-1] bg-[#333333]" style={{ clipPath: "polygon(0 94%, 100% 86%, 100% 100%, 0 100%)" }}>
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundColor: "#333333",
              backgroundImage:
                "linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555), linear-gradient(45deg, #555555 25%, transparent 25%, transparent 75%, #555555 75%, #555555)",
              backgroundPosition: "0 0, 30px 30px",
              backgroundSize: "60px 60px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function HeroPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-bg/80 px-3 py-2 font-mono uppercase tracking-wider backdrop-blur">
      <span className="text-accent">{icon}</span>
      {label}
    </span>
  );
}

function ChoiceCard({ id, active, onClick }: { id: Choice; active: boolean; onClick: () => void }) {
  const choice = choices[id];

  return (
    <button
      onClick={onClick}
      className={`group relative min-h-[220px] overflow-hidden border p-5 text-left transition duration-300 ${
        active
          ? "border-accent bg-accent/10 shadow-[0_0_26px_rgba(255,215,0,0.12)]"
          : "border-border bg-surface/55 hover:border-accent/45 hover:bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider ${active ? "text-accent" : "text-text-secondary"}`}>
          {choice.icon}
          {choice.eyebrow}
        </div>
        <span className="shrink-0 border border-border bg-bg/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
          {choice.cost}
        </span>
      </div>

      <h3 className="mt-8 font-display text-3xl leading-none">{choice.title}</h3>
      <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">{choice.tagline}</p>

      <div className="absolute bottom-5 left-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        {active ? "Selected" : "Tap to preview"}
      </div>
    </button>
  );
}

function FlowStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border border-border bg-bg p-5 transition hover:border-accent/45">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center border border-accent/35 bg-accent/10 text-accent">{icon}</span>
        <h3 className="font-mono text-xs uppercase tracking-wider text-text-primary">{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-secondary">{text}</p>
    </div>
  );
}

function ComparisonRow({ label, sovereign, persistent }: { label: string; sovereign: React.ReactNode; persistent: React.ReactNode }) {
  return (
    <tr className="font-mono text-xs sm:text-sm">
      <td className="p-4 uppercase tracking-wider text-text-secondary">{label}</td>
      <td className="p-4 text-text-primary">{sovereign}</td>
      <td className="p-4 text-text-primary">{persistent}</td>
    </tr>
  );
}
