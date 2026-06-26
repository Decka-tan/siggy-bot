"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

export type ShareAgentCardProps = {
  agentName: string;
  amountRit: string;
  address: string;
  lastBlock: number | null | undefined;
};

function short(value = "") {
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function agentUrl(address: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/agent/${address}`;
}

/** The actual visual card — exported so it can be rendered in a modal or inline */
export function ShareCardVisual({
  cardRef,
  agentName,
  amountRit,
  address,
  lastBlock,
}: ShareAgentCardProps & { cardRef?: React.Ref<HTMLDivElement> }) {
  const url = agentUrl(address);
  const lastBlockText = lastBlock
    ? `Block ${lastBlock.toLocaleString()}`
    : "Waiting for LISTED";

  return (
    <div
      ref={cardRef}
      className="overflow-hidden border border-accent/40 bg-bg"
      style={{ fontFamily: "inherit" }}
    >
      <div className="grid gap-0 md:grid-cols-[1fr_220px]">
        {/* Left: content */}
        <div className="p-5">
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Share card
          </div>
          <h3 className="mt-4 font-display text-3xl leading-none text-accent">
            I deployed my agent!
          </h3>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <ShareLine label="Agent Name" value={agentName} />
            <ShareLine label="Deployed" value={`${amountRit} RIT`} />
            <div className="border border-white/5 bg-surface/50 backdrop-blur-sm rounded-lg p-4 sm:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                Agent address
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-2 truncate font-mono text-sm text-accent hover:underline"
              >
                {short(address)}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
            <ShareLine label="Last block" value={lastBlockText} />
          </div>
        </div>

        {/* Right: character panel */}
        <div className="relative hidden min-h-[260px] md:block overflow-hidden bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <Image
            src="/character.png"
            alt="Siggy"
            fill
            className="object-contain object-bottom"
            sizes="220px"
          />
        </div>
      </div>
    </div>
  );
}

function ShareLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/5 bg-surface/50 backdrop-blur-sm rounded-lg p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-1 min-w-0 truncate font-mono text-sm text-text-primary">
        {value}
      </p>
    </div>
  );
}

/** Full share card with download + share + copy actions — used inline after deploy */
export function DeployedShareCard(props: ShareAgentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const url = agentUrl(props.address);
  const lastBlockText = props.lastBlock
    ? `Block ${props.lastBlock.toLocaleString()}`
    : "Waiting for LISTED";

  const shareText = [
    "I deployed my agent!",
    `Agent Name: ${props.agentName}`,
    `Deployed: ${props.amountRit} RIT`,
    `Agent address: ${short(props.address)}`,
    url,
    `Last block: ${lastBlockText}`,
  ].join("\n");

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 1200);
    } catch {
      setCopiedShare(false);
    }
  }

  async function downloadCard() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#050505",
      });
      const link = document.createElement("a");
      link.download = `siggy-agent-${short(props.address)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloading(false);
    }
  }

  async function shareCard() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#050505",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `siggy-agent-${short(props.address)}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Siggy Agent", text: shareText });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    copyShare();
  }

  return (
    <div className="mt-5">
      <ShareCardVisual cardRef={cardRef} {...props} />
      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadCard}
          disabled={downloading}
          className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/45 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent rounded-lg transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating…" : "Download PNG"}
        </button>
        <button
          type="button"
          onClick={shareCard}
          className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 hover:bg-accent/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent rounded-lg transition-all"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button
          type="button"
          onClick={copyShare}
          className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/45 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-accent rounded-lg transition-all"
        >
          {copiedShare ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiedShare ? "Copied" : "Copy text"}
        </button>
      </div>
    </div>
  );
}

/** Modal wrapper — shows the share card as an overlay */
export function ShareCardModal({
  open,
  onClose,
  ...props
}: ShareAgentCardProps & { open: boolean; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = agentUrl(props.address);
  const lastBlockText = props.lastBlock
    ? `Block ${props.lastBlock.toLocaleString()}`
    : "Waiting for LISTED";

  const shareText = [
    "I deployed my agent!",
    `Agent Name: ${props.agentName}`,
    `Deployed: ${props.amountRit} RIT`,
    `Agent address: ${short(props.address)}`,
    url,
    `Last block: ${lastBlockText}`,
  ].join("\n");

  async function downloadCard() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#050505",
      });
      const link = document.createElement("a");
      link.download = `siggy-agent-${short(props.address)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloading(false);
    }
  }

  async function shareCard() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#050505",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `siggy-agent-${short(props.address)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Siggy Agent", text: shareText });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  async function copyText() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-text-secondary hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <ShareCardVisual cardRef={cardRef} {...props} />

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={downloadCard}
            disabled={downloading}
            className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/45 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent rounded-lg transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generating…" : "Download PNG"}
          </button>
          <button
            onClick={shareCard}
            className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 hover:bg-accent/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent rounded-lg transition-all"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={copyText}
            className="inline-flex items-center gap-2 border border-white/10 hover:border-accent/45 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent rounded-lg transition-all"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy text"}
          </button>
        </div>
      </div>
    </div>
  );
}
