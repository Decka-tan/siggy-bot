import { NextResponse } from 'next/server';

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET        = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET        = process.env.R2_BUCKET_NAME ?? 'ritual-cards';
const R2_PUBLIC_URL    = process.env.R2_PUBLIC_URL ?? '';

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

export async function GET() {
  // 1. Check env vars
  const envCheck = {
    R2_ACCOUNT_ID:    R2_ACCOUNT_ID ? `${R2_ACCOUNT_ID.slice(0,6)}...` : 'MISSING',
    R2_ACCESS_KEY_ID: R2_ACCESS_KEY_ID ? `${R2_ACCESS_KEY_ID.slice(0,6)}...` : 'MISSING',
    R2_SECRET:        R2_SECRET ? `len=${R2_SECRET.length}` : 'MISSING',
    R2_BUCKET,
    R2_PUBLIC_URL,
  };

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET) {
    return NextResponse.json({ ok: false, step: 'env', envCheck });
  }

  // 2. Try uploading a tiny 1-byte test file
  const body = new TextEncoder().encode('test').buffer as ArrayBuffer;
  const key  = 'test/ping.txt';
  const contentType = 'text/plain';

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate   = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z';
  const payloadHash = await sha256hex(body);
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const canonicalHeaders    = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeadersList   = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest    = ['PUT', `/${R2_BUCKET}/${key}`, '', canonicalHeaders, signedHeadersList, payloadHash].join('\n');
  const credentialScope     = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign        = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256hex(canonicalRequest)].join('\n');

  const kDate    = await hmac(new TextEncoder().encode(`AWS4${R2_SECRET}`), dateStamp);
  const kRegion  = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  const endpoint = `https://${host}/${R2_BUCKET}/${key}`;
  try {
    const r2Res = await fetch(endpoint, {
      method: 'PUT',
      headers: { Authorization: authorization, 'Content-Type': contentType, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, Host: host },
      body,
    });

    const txt = await r2Res.text();
    return NextResponse.json({
      ok: r2Res.ok,
      step: 'r2_put',
      status: r2Res.status,
      r2Response: txt,
      envCheck,
      endpoint,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, step: 'fetch_error', error: String(e), envCheck, endpoint });
  }
}
