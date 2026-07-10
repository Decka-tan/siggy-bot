import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 600; // 10 min

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET        = process.env.R2_BUCKET_NAME ?? 'ritual-tcg';
const R2_ENDPOINT      = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── AWS Sig v4 helpers (GET object) ──────────────────────────────────────────
function toBuffer(key: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (key instanceof Uint8Array)
    return key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  return key as ArrayBuffer;
}
async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey('raw', toBuffer(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}
async function sha256hex(data: string) {
  const buf = new TextEncoder().encode(data).buffer as ArrayBuffer;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
function toHex(buf: Uint8Array) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getObject(key: string): Promise<any | null> {
  const now       = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate   = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z';
  const host      = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const emptyHash = await sha256hex('');

  const canonicalHeaders  = `host:${host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeadersList = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest  = ['GET', `/${R2_BUCKET}/${key}`, '', canonicalHeaders, signedHeadersList, emptyHash].join('\n');

  const credScope    = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, await sha256hex(canonicalRequest)].join('\n');

  const kDate    = await hmac(new TextEncoder().encode(`AWS4${R2_SECRET}`), dateStamp);
  const kRegion  = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, {
    method: 'GET',
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`,
      'x-amz-content-sha256': emptyHash,
      'x-amz-date': amzDate,
      Host: host,
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

function upgradeRole(role: unknown) {
  return role == null ? 'No Role' : String(role);
}

function upgradeKey(entry: any) {
  return `${entry?.userId || ''}:${upgradeRole(entry?.fromRole)}:${upgradeRole(entry?.toRole)}`;
}

function dedupeUpgrades(upgrades: any) {
  const rows = Array.isArray(upgrades?.upgrades) ? upgrades.upgrades : [];
  const byKey = new Map<string, any>();
  for (const raw of rows) {
    if (!raw?.userId || !raw?.toRole) continue;
    const entry = {
      ...raw,
      fromRole: upgradeRole(raw.fromRole),
      toRole: upgradeRole(raw.toRole),
    };
    const key = upgradeKey(entry);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, entry);
      continue;
    }
    byKey.set(key, {
      ...current,
      username: entry.username || current.username,
      displayName: entry.displayName || current.displayName,
      avatarUrl: current.avatarUrl || entry.avatarUrl || null,
      daysToPromo: current.daysToPromo ?? entry.daysToPromo ?? null,
      at: Math.min(Number(current.at) || Number(entry.at) || Date.now(), Number(entry.at) || Number(current.at) || Date.now()),
    });
  }
  return {
    ...(upgrades ?? {}),
    upgrades: Array.from(byKey.values()).sort((a, b) => (b.at || 0) - (a.at || 0)),
  };
}

export async function GET() {
  try {
    const [stats, upgrades, insights, activity, globalMsg] = await Promise.all([
      getObject('community/role-stats.json'),
      getObject('community/recent-upgrades.json'),
      getObject('community/insights.json'),
      getObject('community/member-activity.json'),
      getObject('community/global-messages.json'),
    ]);

    if (!stats) {
      return NextResponse.json({ error: 'Stats not generated yet' }, { status: 503 });
    }

    // Build a chat leaderboard from whoever has been looked up so far.
    let chat: any[] | null = null;
    if (globalMsg?.users) {
      chat = Object.entries(globalMsg.users as Record<string, any>)
        .map(([userId, u]) => ({ userId, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, count: u.globalMessages || 0 }))
        .filter((u) => u.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 100)
        .map((u, i) => ({ ...u, rank: i + 1 }));
    }

    return NextResponse.json({
      stats,
      upgrades: dedupeUpgrades(upgrades ?? { upgrades: [], windowDays: 14, updatedAt: stats.updatedAt }),
      insights: insights ?? null,
      activity: activity ? { ...activity, chat } : (chat ? { chat } : null),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
