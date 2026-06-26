"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Legacy route — redirect to the canonical /agent/[address] monitor.
export default function TopupRedirect() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <TopupBody />
    </Suspense>
  );
}

function TopupBody() {
  const router = useRouter();
  const search = useSearchParams();
  const address = search?.get("address") || "";

  useEffect(() => {
    if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) {
      router.replace(`/agent/${address}`);
    } else {
      router.replace("/deploy");
    }
  }, [address, router]);

  return (
    <div className="min-h-screen bg-bg pt-28 text-text-primary">
      <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-sm text-text-secondary">Redirecting to monitor…</p>
      </section>
    </div>
  );
}
