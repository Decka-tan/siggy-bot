"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Coins,
  ExternalLink,
  Heart,
  Layers,
  Rocket,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { GoldenParticles } from "@/components/ui/GoldenParticles";

type Choice = "sovereign" | "persistent" | null;

type Quip = { text: string };

const sovereignQuips: Quip[] = [
  { text: "Cheap: 0.1 RIT is enough to get listed on the default schedule." },
  { text: "Fast to deploy: connect wallet, prepare, then sign 2 transactions." },
  { text: "Default scheduler is 5 wakeups every 2000 blocks, with the first wakeup around 12 minutes." },
  { text: "Escrow refills keep the harness alive after the first schedule window." },
];

const persistentQuips: Quip[] = [
  { text: "Long-lived: built to keep an identity, memory, and revive on failure." },
  { text: "More expensive: the official launcher expects around 2.1 RIT." },
  { text: "Setup goes through agents.ritualfoundation.org; they handle the service lifecycle." },
  { text: "Pick this when you need a real always-on Ritual agent service." },
];

const SIGGY_SOVEREIGN = "/siggy-girl-happy.png";
const SIGGY_PERSISTENT = "/siggy-girl-shock.png";
const SIGGY_CTA = "/siggy-girl-happy.png";

export default function DeployLanding() {
  const [choice, setChoice] = useState<Choice>(null);
  const selected = choice || "sovereign";

  return (
    <main className="relative min-h-screen bg-bg text-text-primary overflow-hidden">
      {/* Ambient background particles */}
      <GoldenParticles mode="ambient" />

      {/* Decorative background glows */}
      <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-accent/3 blur-[150px] pointer-events-none" />

      <section className="relative min-h-screen overflow-hidden">
        <HeroBackground />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-8 pt-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
              <Rocket className="h-4 w-4" />
              Ritual Testnet Deployer
            </p>
            <h1 className="mt-5 font-display text-6xl leading-[0.9] text-accent sm:text-7xl md:text-8xl lg:text-9xl">
              DEPLOY
              <br />
              RITUAL
              <br />
              AGENTS
            </h1>
            <p className="mt-7 max-w-xl text-sm leading-7 text-text-secondary md:text-base">
              Pick a path, test credentials before spending faucet, then sign only when Siggy has verified the schedule,
              funding, and harness preview.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#pick"
                className="inline-flex items-center justify-center gap-2 bg-accent px-6 py-4 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-yellow-300"
              >
                Pick your agent
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="https://docs.ritualfoundation.org/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-surface/80 px-6 py-4 font-mono text-xs uppercase tracking-wider text-accent transition hover:bg-surface"
              >
                What is Ritual?
              </Link>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 hidden h-screen w-[55vw] lg:block">
            <Image
              src="/Logo_RItual_White.png"
              alt=""
              width={980}
              height={980}
              className="absolute -right-40 top-8 z-0 opacity-25"
              priority
            />
            <Image
              src="/character.png"
              alt="Siggy"
              width={800}
              height={1000}
              className="absolute bottom-[-30px] right-[-50px] z-10 h-[96vh] max-h-[980px] w-auto object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div id="pick" className="mx-auto max-w-6xl space-y-8">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Step 1</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Pick your agent type</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
              Tap one. Siggy will show the trade-offs before you commit any RITUAL.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ChoiceCard
              icon={<Zap className="h-5 w-5" />}
              kind="sovereign"
              title="Sovereign Agent"
              tagline="Job primitive - short-lived - cheap"
              cost="from 0.1 RIT"
              active={choice === "sovereign"}
              onClick={() => setChoice("sovereign")}
            />
            <ChoiceCard
              icon={<Heart className="h-5 w-5" />}
              kind="persistent"
              title="Persistent Agent"
              tagline="Service primitive - long-lived - revivable"
              cost="~2.1 RIT"
              active={choice === "persistent"}
              onClick={() => setChoice("persistent")}
            />
          </div>

          {choice && (
            <div className="grid gap-6 bg-surface/55 p-6 shadow-[0_0_40px_rgba(255,215,0,0.05)] md:grid-cols-[220px_1fr] md:p-8">
              <div className="flex items-center justify-center">
                <Image
                  src={choice === "sovereign" ? SIGGY_SOVEREIGN : SIGGY_PERSISTENT}
                  alt="Siggy"
                  width={220}
                  height={220}
                  className="h-44 w-auto object-contain drop-shadow-xl md:h-56"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent">Siggy says</p>
                  <p className="mt-1 font-display text-2xl">
                    {choice === "sovereign" ? "Sovereign is a job, not a service." : "Persistent is a real always-on service."}
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {(choice === "sovereign" ? sovereignQuips : persistentQuips).map((quip) => (
                    <li key={quip.text} className="flex gap-3 text-sm leading-6 text-text-secondary">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 bg-accent" />
                      {quip.text}
                    </li>
                  ))}
                </ul>

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <Stat label="Lifespan" value={choice === "sovereign" ? "5 wakeups per schedule" : "Indefinite + DA state"} icon={<Clock className="h-4 w-4" />} />
                  <Stat label="Min funding" value={choice === "sovereign" ? "0.1 RIT" : "~2.1 RIT"} icon={<Coins className="h-4 w-4" />} />
                  <Stat label="Per wakeup cost" value={choice === "sovereign" ? "~0.002 RIT" : "varies"} icon={<Layers className="h-4 w-4" />} />
                  <Stat label="Setup" value={choice === "sovereign" ? "2 txs" : "Official launcher"} icon={<Timer className="h-4 w-4" />} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface/45 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Side by side</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Sovereign vs Persistent</h2>
          </div>

          <div className="overflow-x-auto bg-bg/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface/70 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="p-4">Aspect</th>
                  <th className="p-4">Sovereign</th>
                  <th className="p-4">Persistent</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Precompile" sov="0x080C" per="0x0820" />
                <ComparisonRow label="Concept" sov="Job - task one-shot/batch" per="Service - long-lived" />
                <ComparisonRow label="Best for" sov="Achievement / demo" per="Always-on assistant" />
                <ComparisonRow label="Lifespan" sov="5 wakeups per schedule" per="Indefinite" />
                <ComparisonRow label="Per wakeup cost" sov="~0.002 RIT" per="varies" />
                <ComparisonRow label="Min funding" sov="0.1 RIT" per="~2.1 RIT" />
                <ComparisonRow label="State & memory" sov="Ephemeral" per="DA-backed (HF/GCS/Pinata)" />
                <ComparisonRow label="Reviveable" sov={<X className="inline h-4 w-4 text-red-300" />} per={<Check className="inline h-4 w-4 text-emerald-300" />} />
                <ComparisonRow label="Deploy here" sov="Siggy deployer" per="agents.ritualfoundation.org" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 bg-surface/55 p-8 md:grid-cols-[1fr_240px] md:p-12">
          <div className="space-y-5">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Step 2</p>
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">Ready to deploy?</h2>
            <p className="text-sm leading-6 text-text-secondary">
              {selected === "persistent"
                ? "Persistent agents launch through the official Ritual portal."
                : "Sovereign agents go through Siggy's deployer. Secrets stay encrypted in your browser, and Siggy warns you before irreversible steps."}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {selected === "persistent" ? (
                <a
                  href="https://agents.ritualfoundation.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                >
                  Open Ritual launcher
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  href="/deploy/sovereign"
                  className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
                >
                  Deploy sovereign with Siggy
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <a
                href="https://github.com/Decka-tan/siggy-bot/blob/main/ritual-deploy/TUTORIAL-EN.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-bg/80 px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:bg-bg"
              >
                Read tutorial
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative hidden h-full min-h-[220px] md:block">
            <Image src={SIGGY_CTA} alt="Siggy ready" fill className="object-contain" sizes="240px" />
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
        <div className="absolute inset-0 z-10 bg-bg" style={{ clipPath: "polygon(0 0, 65% 0, 45% 100%, 0 100%)" }} />
        <div className="absolute inset-0 z-0 bg-accent" style={{ clipPath: "polygon(64% 0, 68% 0, 48% 100%, 44% 100%)" }} />
        <div className="absolute inset-0 z-0 bg-accent" style={{ clipPath: "polygon(69% 0, 70% 0, 50% 100%, 49% 100%)" }} />
        <div className="absolute inset-0 z-[-1] bg-[#333333]" style={{ clipPath: "polygon(65% 0, 100% 0, 100% 100%, 45% 100%)" }}>
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
        <div className="absolute inset-0 z-10 bg-bg" style={{ clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 86%)" }} />
        <div className="absolute inset-0 z-0 bg-accent" style={{ clipPath: "polygon(0 84%, 100% 76%, 100% 79%, 0 87%)" }} />
        <div className="absolute inset-0 z-[-1] bg-[#333333]" style={{ clipPath: "polygon(0 78%, 100% 70%, 100% 100%, 0 100%)" }}>
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
    <button
      onClick={onClick}
      className={`relative overflow-hidden bg-surface/60 p-6 text-left backdrop-blur-md transition duration-300 hover:bg-surface ${
        active ? "shadow-[inset_0_0_0_2px_rgba(255,215,0,0.95),0_0_24px_rgba(255,215,0,0.08)]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-4">
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
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-bg/70 p-3">
      <div className="flex items-center gap-2 text-text-secondary">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-mono text-sm text-text-primary">{value}</p>
    </div>
  );
}

function ComparisonRow({ label, sov, per }: { label: string; sov: React.ReactNode; per: React.ReactNode }) {
  return (
    <tr className="font-mono text-xs odd:bg-bg/35 even:bg-surface/25 sm:text-sm">
      <td className="p-4 uppercase tracking-wider text-text-secondary">{label}</td>
      <td className="p-4 text-text-primary">{sov}</td>
      <td className="p-4 text-text-primary">{per}</td>
    </tr>
  );
}
