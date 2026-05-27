import { NextRequest, NextResponse } from 'next/server';

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET        = process.env.R2_BUCKET_NAME ?? 'ritual-cards';
const R2_PUBLIC_URL    = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const R2_ENDPOINT      = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── AWS Sig v4 helpers ────────────────────────────────────────────────────────

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

/**
 * Build a canonical query string per AWS Sig v4 spec:
 *   - keys sorted alphabetically
 *   - both key and value percent-encoded (uppercase hex, space → %20)
 *   - joined with &
 */
function canonicalQS(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

async function listHeaders(qsStr: string) {
  const now        = new Date();
  const dateStamp  = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate    = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z';
  const host       = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const emptyHash  = await sha256hex('');

  const canonicalHeaders  = `host:${host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeadersList = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest  = ['GET', `/${R2_BUCKET}`, qsStr, canonicalHeaders, signedHeadersList, emptyHash].join('\n');

  const credScope   = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, await sha256hex(canonicalRequest)].join('\n');

  const kDate    = await hmac(new TextEncoder().encode(`AWS4${R2_SECRET}`), dateStamp);
  const kRegion  = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`,
    'x-amz-content-sha256': emptyHash,
    'x-amz-date': amzDate,
    Host: host,
  };
}

// ── Parse XML ListObjectsV2 response ─────────────────────────────────────────
function parseKeys(xml: string): string[] {
  const keys: string[] = [];
  const re = /<Key>([^<]+)<\/Key>/g;
  let m;
  while ((m = re.exec(xml)) !== null) keys.push(decodeURIComponent(m[1].replace(/\+/g, ' ')));
  return keys;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const prefix = req.nextUrl.searchParams.get('prefix') ?? 'cards/';
    const allKeys: string[] = [];
    let continuationToken = '';
    let page = 0;

    do {
      // Build params — MUST be sorted alphabetically for Sig v4 canonical query string
      const params: Record<string, string> = {
        'list-type': '2',
        'max-keys':  '1000',
        prefix,
      };
      if (continuationToken) params['continuation-token'] = continuationToken;

      // canonicalQS sorts keys alphabetically and percent-encodes properly
      const qsStr = canonicalQS(params);

      const headers = await listHeaders(qsStr);
      const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}?${qsStr}`, {
        method: 'GET',
        headers: { ...headers },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('[list-r2] R2 error:', res.status, txt);
        return NextResponse.json({ error: `R2 ${res.status}: ${txt}` }, { status: 502 });
      }

      const xml = await res.text();
      allKeys.push(...parseKeys(xml));

      // check for NextContinuationToken
      const contMatch = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml);
      continuationToken = contMatch ? decodeURIComponent(contMatch[1].replace(/\+/g, ' ')) : '';
      page++;
    } while (continuationToken && page < 20); // safety limit

    // Only return PNG card files, build manifest-like entries from path
    const cards = allKeys
      .filter(k => k.startsWith('cards/') && k.endsWith('.png'))
      .map(key => {
        // key format: cards/{roleSlug}/{username}_{rarity}.png
        const withoutPrefix = key.replace(/^cards\//, '');
        const slashIdx = withoutPrefix.indexOf('/');
        if (slashIdx === -1) return null;
        const roleSlug   = withoutPrefix.slice(0, slashIdx);
        const filename   = withoutPrefix.slice(slashIdx + 1);            // e.g. arte_SSR.png
        const nameNoExt  = filename.replace(/\.png$/, '');
        const lastUndIdx = nameNoExt.lastIndexOf('_');
        if (lastUndIdx === -1) return null;
        const username = nameNoExt.slice(0, lastUndIdx);
        const rarity   = nameNoExt.slice(lastUndIdx + 1);
        const url      = `${R2_PUBLIC_URL}/${key}`;
        return { key, roleSlug, username, rarity, url };
      })
      .filter(Boolean);

    return NextResponse.json({ total: cards.length, cards });
  } catch (err) {
    console.error('[list-r2] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
