import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 600;

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET        = process.env.R2_BUCKET_NAME ?? 'ritual-tcg';
const R2_ENDPOINT      = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

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

const ALLOWED = new Set(['genesis-1000', 'ploplo-holder']);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ALLOWED.has(slug)) {
    return NextResponse.json({ error: 'unknown badge' }, { status: 404 });
  }
  const data = await getObject(`community/badge-${slug}.json`);
  if (!data) return NextResponse.json({ error: 'not generated yet' }, { status: 503 });
  return NextResponse.json(data);
}
