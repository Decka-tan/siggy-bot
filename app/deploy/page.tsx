"use client";

import Link from "next/link";
import Image from "next/image";
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
  Shield,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";

type Choice = "sovereign" | "persistent" | null;

type Quip = { mood: "happy" | "neutral" | "shy"; text: string };

const sovereignQuips: Quip[] = [
  { mood: "happy", text: "Cheap! 0.1 RIT is enough to get listed. Friendly for first-timer." },
  { mood: "happy", text: "Fast to deploy — connect wallet, sign 2 txs, done." },
  { mood: "neutral", text: "With safe defaults (schedulerGas 500k + frequency 2000), 0.1 RIT funds ~50 wakeups — that's roughly 1 wakeup/day for a month." },
  { mood: "neutral", text: "Top up the escrow before it drains and the agent stays listed indefinitely." },
];

const persistentQuips: Quip[] = [
  { mood: "happy", text: "Long-lived! Built to keep an identity, memory, and revive on failure." },
  { mood: "neutral", text: "More expensive though — official launcher wants ~2.1 RIT minimum." },
  { mood: "neutral", text: "Setup goes through agents.ritualfoundation.org. They handle the harness for you." },
  { mood: "shy", text: "Pick this if you want a real always-on Ritual agent service." },
];

const SIGGY_HERO = "/character.png";
const SIGGY_SOVEREIGN = "/siggy-girl-happy.png";
const SIGGY_PERSISTENT = "/siggy-girl-shock.png";
const SIGGY_CTA = "/siggy-girl-happy.png";

export default function DeployLanding() {
  const [choice, setChoice] = useState<Choice>(null);

  return (
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* HERO */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-accent/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-accent">
              <Rocket className="h-4 w-4" />
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
                className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs uppercase tracking-wider text-black hover:bg-yellow-300"
              >
                Pick your agent
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="https://www.ritualfoundation.org/docs/overview/what-is-ritual"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
              >
                What is Ritual?
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 text-xs text-text-secondary">
              <Pill icon={<Shield className="h-3.5 w-3.5" />} label="Secrets stay in your browser" />
              <Pill icon={<Zap className="h-3.5 w-3.5" />} label="Verified factory pattern" />
              <Pill icon={<Coins className="h-3.5 w-3.5" />} label="From 0.1 RIT" />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 bg-accent/20" aria-hidden />
            <div className="relative aspect-square bg-surface">
              <Image
                src={SIGGY_HERO}
                alt="Siggy"
                fill
                priority
                className="object-contain p-6"
                sizes="(min-width: 1024px) 400px, 80vw"
              />
            </div>
          </div>
        </div>

        {/* PICK SECTION */}
        <div id="pick" className="mt-24 space-y-8">
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

          {/* SIGGY TALK */}
          {choice && (
            <div className="grid gap-6 border border-border bg-surface p-6 md:grid-cols-[180px_1fr] md:p-8">
              <div className="relative mx-auto h-32 w-32 md:h-44 md:w-44">
                <Image
                  src={choice === "sovereign" ? SIGGY_SOVEREIGN : SIGGY_PERSISTENT}
                  alt="Siggy"
                  fill
                  className="object-contain"
                  sizes="180px"
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
                  {(choice === "sovereign" ? sovereignQuips : persistentQuips).map((quip, idx) => (
                    <li key={idx} className="flex gap-3 text-sm leading-6 text-text-secondary">
                      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {quip.text}
                    </li>
                  ))}
                </ul>

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <Stat label="Lifespan" value={choice === "sovereign" ? "~50 wakeups / 0.1 RIT" : "Indefinite + DA state"} icon={<Clock className="h-4 w-4" />} />
                  <Stat label="Min funding" value={choice === "sovereign" ? "0.1 RIT" : "~2.1 RIT"} icon={<Coins className="h-4 w-4" />} />
                  <Stat label="Per wakeup cost" value={choice === "sovereign" ? "~0.002 RIT" : "varies"} icon={<Layers className="h-4 w-4" />} />
                  <Stat label="Setup" value={choice === "sovereign" ? "2 txs, ~3 min" : "Official launcher"} icon={<Timer className="h-4 w-4" />} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COMPARISON */}
        <div className="mt-24 space-y-6">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-accent">Side by side</p>
            <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Sovereign vs Persistent</h2>
          </div>

          <div className="overflow-x-auto border border-border bg-surface">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/40 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
                  <th className="p-4">Aspect</th>
                  <th className="p-4">Sovereign</th>
                  <th className="p-4">Persistent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <ComparisonRow label="Precompile" sov="0x080C" per="0x0820" />
                <ComparisonRow label="Concept" sov="Job — task one-shot/batch" per="Service — long-lived" />
                <ComparisonRow label="Best for" sov="Achievement / demo" per="Always-on assistant" />
                <ComparisonRow label="Lifespan" sov="~50 wakeups / 0.1 RIT (refillable)" per="Indefinite" />
                <ComparisonRow label="Per wakeup cost" sov="~0.002 RIT" per="~varies" />
                <ComparisonRow label="Min funding" sov="0.1 RIT" per="~2.1 RIT" />
                <ComparisonRow label="State & memory" sov="Ephemeral" per="DA-backed (HF/GCS/Pinata)" />
                <ComparisonRow label="Reviveable" sov={<X className="inline h-4 w-4 text-red-300" />} per={<Check className="inline h-4 w-4 text-emerald-300" />} />
                <ComparisonRow label="Deploy here" sov="Siggy deployer" per="agents.ritualfoundation.org" />
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24">
          <div className="grid gap-8 border border-border bg-surface p-8 md:grid-cols-[1fr_240px] md:p-12">
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
                  className="inline-flex items-center gap-2 border border-border px-5 py-3 font-mono text-xs uppercase tracking-wider text-accent hover:border-accent"
                >
                  Read tutorial
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {!choice && (
                <p className="pt-2 text-xs text-text-secondary">
                  Tip: pick Sovereign or Persistent above to swap the action button.
                </p>
              )}
            </div>

            <div className="relative hidden h-full min-h-[220px] md:block">
              <Image src={SIGGY_CTA} alt="Siggy ready" fill className="object-contain" sizes="240px" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono uppercase tracking-wider">
      {icon}
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
    <button
      onClick={onClick}
      className={`text-left transition ${
        active ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/60"
      } border p-6`}
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
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-border bg-bg p-3">
      <div className="flex items-center gap-2 text-text-secondary">{icon}<span className="font-mono text-[10px] uppercase tracking-wider">{label}</span></div>
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
    <tr className="font-mono text-xs sm:text-sm">
      <td className="p-4 uppercase tracking-wider text-text-secondary">{label}</td>
      <td className="p-4 text-text-primary">
        <span className="inline-flex items-center gap-2">{sov}{sovText && <span>{sovText}</span>}</span>
      </td>
      <td className="p-4 text-text-primary">
        <span className="inline-flex items-center gap-2">{per}{perText && <span>{perText}</span>}</span>
      </td>
    </tr>
  );
}
