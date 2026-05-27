import { NextRequest, NextResponse } from 'next/server';

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET        = process.env.R2_BUCKET_NAME ?? 'ritual-cards';

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
const R2_ENDPOINT   = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── AWS Signature v4 (minimal, for R2 PUT) ────────────────────────────────────

function toBuffer(key: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (key instanceof Uint8Array) {
    return key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer;
  }
  return key as ArrayBuffer;
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey(
    'raw', toBuffer(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}

async function sha256hex(data: ArrayBuffer | string) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data).buffer as ArrayBuffer : data as ArrayBuffer;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function toHex(buf: Uint8Array) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signedHeaders(
  method: string,
  key: string,          // object key (path in bucket)
  body: ArrayBuffer,
  contentType: string,
) {
  const now = new Date();
  const dateStamp  = now.toISOString().slice(0, 10).replace(/-/g, '');  // YYYYMMDD
  const amzDate    = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z'; // YYYYMMDDTHHmmssZ

  const payloadHash = await sha256hex(body);
  const host        = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeadersList = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method,
    `/${R2_BUCKET}/${key}`,
    '',
    canonicalHeaders,
    signedHeadersList,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const kDate    = await hmac(new TextEncoder().encode(`AWS4${R2_SECRET}`), dateStamp);
  const kRegion  = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  return {
    Authorization: authorization,
    'Content-Type': contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Host: host,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const key  = form.get('key')  as string | null;   // e.g. "cards/userId_rarity.png"

    if (!file || !key) {
      return NextResponse.json({ error: 'missing file or key' }, { status: 400 });
    }

    const body        = await file.arrayBuffer();
    const contentType = file.type || 'image/png';

    const headers = await signedHeaders('PUT', key, body, contentType);

    const r2Res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, {
      method: 'PUT',
      headers,
      body,
    });

    if (!r2Res.ok) {
      const txt = await r2Res.text();
      console.error('R2 upload error:', r2Res.status, txt);
      return NextResponse.json({ error: `R2 ${r2Res.status}: ${txt}` }, { status: 502 });
    }

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    return NextResponse.json({ ok: true, url: publicUrl });

  } catch (err: unknown) {
    console.error('upload-cards error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
