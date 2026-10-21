import { NextResponse } from 'next/server';
import { getInvoiceDb, getPaymentDb, isSnowflake } from '../../lib/data';

export const dynamic = 'force-dynamic';

// Discord profile picture for someone in the ledger. Only ids the ledger
// already knows are served, so this isn't an open image proxy.
const hashCache = new Map<string, { avatar: string | null; at: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

function knownIds() {
  const ids = new Set<string>();
  for (const link of Object.values(getPaymentDb().nameLinks || {})) {
    if (isSnowflake((link as any)?.discordId)) ids.add((link as any).discordId);
  }
  for (const inv of Object.values(getInvoiceDb().db.invoices || {})) {
    if (isSnowflake(inv.creator?.id)) ids.add(inv.creator.id);
    for (const p of inv.participants || []) if (isSnowflake(p.userId)) ids.add(p.userId);
  }
  return ids;
}

async function avatarHash(id: string) {
  const hit = hashCache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.avatar;
  const refresh = process.env.BOT_REFRESH_URL || 'http://localhost:8888/api/refresh-invoice';
  try {
    const res = await fetch(new URL(`/api/user-avatar/${id}`, refresh), {
      headers: { 'x-siggy-token': process.env.INTERNAL_API_TOKEN || '' },
      signal: AbortSignal.timeout(5000),
    });
    const avatar = res.ok ? ((await res.json()).avatar as string | null) : null;
    hashCache.set(id, { avatar, at: Date.now() });
    return avatar;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!isSnowflake(id) || !knownIds().has(id)) return new NextResponse('Not found', { status: 404 });

  const hash = await avatarHash(id);
  const url = hash
    ? `https://cdn.discordapp.com/avatars/${id}/${hash}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
  const img = await fetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!img?.ok) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(await img.arrayBuffer(), {
    headers: { 'Content-Type': img.headers.get('content-type') || 'image/png', 'Cache-Control': 'public, max-age=21600' },
  });
}
