import { redirect } from 'next/navigation';
import { buildMemberView, formatCurrency, formatDate, listLoginPeople, resolveDiscordIds } from './lib/data';
import { getMemberId, makeLoginToken, publicBase } from './lib/session';
import { AccountBox, Chevron, Initial, PAGE_CSS, Siggy } from './ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tagihan Siggy' };

// The bot's local HTTP server; same host as BOT_REFRESH_URL.
function botUrl(pathname: string) {
  const refresh = process.env.BOT_REFRESH_URL || 'http://localhost:8888/api/refresh-invoice';
  return new URL(pathname, refresh).toString();
}

async function requestLinkAction(formData: FormData) {
  'use server';
  // The picker sends a Discord id, but only ids the ledger already links are
  // accepted, so the form can't be used to make Siggy ping arbitrary accounts.
  const picked = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim().slice(0, 64);
  const ids = picked
    ? listLoginPeople().some(p => p.id === picked) ? [picked] : []
    : name ? resolveDiscordIds(name) : [];
  if (ids.length === 0) return redirect(name || picked ? '/invoice?error=unknown' : '/invoice');

  let delivered = false;
  let limited = false;
  for (const id of ids) {
    const token = makeLoginToken(id);
    if (!token) break;
    try {
      const res = await fetch(botUrl('/api/send-login-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-siggy-token': process.env.INTERNAL_API_TOKEN || '' },
        body: JSON.stringify({ discordId: id, url: `${publicBase()}/invoice/auth/verify?t=${token}` }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) delivered = true;
      else if (res.status === 429) limited = true;
      else console.error(`[invoice-login] bot returned ${res.status} for ${id}`);
    } catch (e) {
      console.error('[invoice-login] bot unreachable', e);
    }
  }
  if (delivered) return redirect('/invoice?sent=1');
  return redirect(limited ? '/invoice?error=wait' : '/invoice?error=dm');
}

export default async function MemberInvoicePage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  const memberId = getMemberId();

  if (!memberId) {
    const people = listLoginPeople();
    const notice = {
      sent: ['ok', 'Udah aku PM link login-nya. Cek DM Discord kamu ya.'],
      link: ['err', 'Link-nya udah kadaluarsa atau rusak. Minta link baru.'],
      dm: ['err', 'Aku gak bisa PM kamu. Kamu harus satu server sama Siggy, dan DM dari member server harus kebuka.'],
      wait: ['err', 'Link baru aja dikirim. Tunggu semenit sebelum minta lagi.'],
      unknown: ['err', 'Nama itu belum ke-link ke akun Discord. Minta pembuat invoice nge-link nama kamu.'],
    } as Record<string, [string, string]>;
    const shown = searchParams.sent ? notice.sent : notice[searchParams.error || ''];
    const mood = searchParams.sent ? 'happy' : shown ? 'sad' : 'default';
    return (
      <div className="inv-bg flex min-h-screen items-center justify-center px-4 py-10 text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
        <div className="inv-card w-full max-w-sm rounded-2xl p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center text-center">
            <Siggy mood={mood} size={88} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Tagihan Siggy</h1>
            <p className="mt-1 text-sm text-text-secondary">Cek utang dan piutang kamu dari invoice Siggy. Pilih nama, nanti aku PM link login-nya.</p>
          </div>
          {shown && (
            <p className={`mt-5 rounded-lg border px-3 py-2 text-xs ${shown[0] === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
              {shown[1]}
            </p>
          )}
          <form action={requestLinkAction} className="mt-5 space-y-2">
            <select name="id" required defaultValue="" className="w-full rounded-xl border border-white/10 bg-[#111114] px-4 py-3 text-sm outline-none focus:border-accent/60">
              <option value="" disabled>Pilih nama kamu</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-black transition hover:brightness-110">Kirim link ke DM</button>
          </form>
          <details className="mt-4 text-xs text-text-secondary">
            <summary className="cursor-pointer text-center hover:text-text-primary">Nama kamu gak ada di daftar?</summary>
            <form action={requestLinkAction} className="mt-2 flex gap-2">
              <input name="name" required maxLength={64} placeholder="Username Discord / nama di invoice" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50" />
              <button type="submit" className="rounded-lg bg-white/10 px-3 text-sm font-bold">Kirim</button>
            </form>
          </details>
        </div>
      </div>
    );
  }

  const view = buildMemberView(memberId);
  const mood = view.owedTotal === 0 ? 'happy' : view.owedTotal >= 100000 ? 'shock' : 'default';
  const say =
    view.owedTotal === 0
      ? 'Bersih! Kamu gak punya utang sama sekali.'
      : `Kamu masih punya utang ${formatCurrency(view.owedTotal)} ke ${view.owedByCreator.length} orang.`;

  return (
    <div className="inv-bg min-h-screen px-4 py-6 text-text-primary">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Siggy size={28} />
            <span className="text-sm font-bold">Tagihan Siggy</span>
          </div>
          <form action="/invoice/auth/logout" method="post">
            <button type="submit" className="rounded-lg px-3 py-1.5 text-xs text-text-secondary ring-1 ring-white/10 hover:text-text-primary">Keluar</button>
          </form>
        </header>

        <section className="inv-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <Siggy mood={mood} size={64} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">Hai, {view.displayName}!</h1>
              <p className="text-sm text-text-secondary">{say}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-500/[0.07] p-4 ring-1 ring-amber-500/20">
              <p className="text-xs text-amber-200/70">Utang kamu</p>
              <p className="mt-1 text-xl font-bold text-amber-400 sm:text-2xl">{formatCurrency(view.owedTotal)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/[0.07] p-4 ring-1 ring-emerald-500/20">
              <p className="text-xs text-emerald-200/70">Piutang kamu</p>
              <p className="mt-1 text-xl font-bold text-emerald-400 sm:text-2xl">{formatCurrency(view.receivableTotal)}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Yang harus kamu bayar</h2>
          {view.owedByCreator.length === 0 ? (
            <p className="inv-card rounded-2xl p-5 text-sm text-text-secondary">Gak ada tagihan. Kalau ngerasa punya, minta pembuat invoice nge-link nama kamu.</p>
          ) : (
            view.owedByCreator.map(group => (
              <div key={group.creatorId || group.creatorName} className="inv-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Initial name={group.creatorName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">ke {group.creatorName}</p>
                    <p className="text-xs text-text-secondary">{group.bills.length} tagihan</p>
                  </div>
                  <p className="shrink-0 text-lg font-bold text-amber-400">{formatCurrency(group.total)}</p>
                </div>
                <div className="mt-3">
                  <AccountBox bank={group.payment?.bank} account={group.payment?.account} holder={group.payment?.name} />
                </div>
                <details className="mt-2">
                  <summary className="flex cursor-pointer items-center gap-1 py-1 text-xs text-text-secondary hover:text-text-primary">
                    <Chevron /> Rincian tagihan
                  </summary>
                  <ul className="mt-1 divide-y divide-white/5 text-sm">
                    {group.bills.map(b => (
                      <li key={`${b.invoiceId}#${b.index}`} className="flex justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate">{b.title}</span>
                          <span className="text-xs text-text-secondary">{formatDate(b.date)}</span>
                        </span>
                        <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))
          )}
          {view.owedByCreator.length > 0 && (
            <p className="px-1 text-xs text-text-secondary">
              Udah transfer? Konfirmasi + kirim bukti lewat <span className="rounded bg-white/10 px-1 font-mono text-text-primary">/bayar</span> di Discord.
            </p>
          )}
        </section>

        {view.owedToMe.length > 0 && (
          <section className="space-y-3">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-text-secondary">Yang belum bayar ke kamu</h2>
            <div className="inv-card divide-y divide-white/5 rounded-2xl">
              {view.owedToMe.map(person => (
                <details key={person.name} className="px-4 py-3">
                  <summary className="flex cursor-pointer items-center gap-3">
                    <Initial name={person.name} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{person.name}</span>
                      <span className="text-xs text-text-secondary">{person.bills.length} tagihan</span>
                    </span>
                    <span className="shrink-0 font-bold text-emerald-400">{formatCurrency(person.total)}</span>
                    <Chevron />
                  </summary>
                  <ul className="mt-2 divide-y divide-white/5 pl-11 text-sm">
                    {person.bills.map((b, i) => (
                      <li key={i} className="flex justify-between gap-3 py-1.5">
                        <span className="min-w-0">
                          <span className="block truncate">{b.title}</span>
                          <span className="text-xs text-text-secondary">{formatDate(b.date)}</span>
                        </span>
                        <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        )}

        {view.paidBills.length > 0 && (
          <details className="inv-card rounded-2xl px-4 py-3 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 font-bold">
              <span className="flex-1">Udah lunas</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">{view.paidBills.length}</span>
              <Chevron />
            </summary>
            <ul className="mt-2 divide-y divide-white/5">
              {view.paidBills.slice(0, 30).map(b => (
                <li key={`${b.invoiceId}#${b.index}`} className="flex justify-between gap-3 py-1.5 text-text-secondary">
                  <span className="truncate">{b.title} · ke {b.creatorName}</span>
                  <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
