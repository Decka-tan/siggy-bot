import crypto from 'crypto';
import { cookies } from 'next/headers';

// Member login for the invoice site: Siggy DMs a signed link, the link sets a
// signed cookie carrying the Discord id. Separate from the admin cookie, which
// stays the password login in admin/page.tsx.

export const MEMBER_COOKIE = 'siggy_member_v1';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const LINK_SECONDS = 60 * 10;

export const publicBase = () => (process.env.INVOICE_PUBLIC_URL || 'https://invoice.decka.my.id').replace(/\/+$/, '');

// Fails closed: no secret, no tokens — an empty key would make every signature forgeable.
function key(purpose: string) {
  const secret = process.env.SIGGY_SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(`invoice-member:${purpose}`).digest();
}

function seal(purpose: string, id: string, ttl: number) {
  const k = key(purpose);
  if (!k) return null;
  const payload = Buffer.from(JSON.stringify({ id, exp: Math.floor(Date.now() / 1000) + ttl })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256', k).update(payload).digest('base64url')}`;
}

function open(purpose: string, value: string | undefined): string | null {
  const k = key(purpose);
  if (!k || !value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(crypto.createHmac('sha256', k).update(payload).digest('base64url'));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { id, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!/^\d{17,20}$/.test(String(id)) || !exp || exp < Date.now() / 1000) return null;
    return String(id);
  } catch {
    return null;
  }
}

// Different purposes use different keys, so a login link can't be pasted in as
// a session cookie and live for 30 days.
export const makeLoginToken = (id: string) => seal('link', id, LINK_SECONDS);
export const readLoginToken = (t: string | undefined) => open('link', t);
export const makeSessionValue = (id: string) => seal('session', id, SESSION_SECONDS);
export const sessionMaxAge = SESSION_SECONDS;

export function getMemberId() {
  return open('session', cookies().get(MEMBER_COOKIE)?.value);
}
