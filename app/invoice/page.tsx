import { redirect } from 'next/navigation';
import { buildMemberView, formatCurrency, formatDate, resolveDiscordIds } from './lib/data';
import { getMemberId, makeLoginToken, publicBase } from './lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tagihan Siggy' };

// The bot's local HTTP server; same host as BOT_REFRESH_URL.
function botUrl(pathname: string) {
  const refresh = process.env.BOT_REFRESH_URL || 'http://localhost:8888/api/refresh-invoice';
  return new URL(pathname, refresh).toString();
}

async function requestLinkAction(formData: FormData) {
  'use server';
  const name = String(formData.get('name') ?? '').trim().slice(0, 64);
  if (!name) return redirect('/invoice');

  for (const id of resolveDiscordIds(name)) {
    const token = makeLoginToken(id);
    if (!token) break;
    try {
      const res = await fetch(botUrl('/api/send-login-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-siggy-token': process.env.INTERNAL_API_TOKEN || '' },
        body: JSON.stringify({ discordId: id, url: `${publicBase()}/invoice/auth/verify?t=${token}` }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok && res.status !== 429) console.error(`[invoice-login] bot returned ${res.status} for ${id}`);
    } catch (e) {
      console.error('[invoice-login] bot unreachable', e);
    }
  }
  // Same answer whether or not the name matched, so the form can't be used to
  // probe who is in the ledger.
  return redirect('/invoice?sent=1');
}

const HIDE_SITE_CHROME = `body { background-color: #0a0a0a !important; }`;

export default async function MemberInvoicePage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  const memberId = getMemberId();

  if (!memberId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: HIDE_SITE_CHROME }} />
        <div className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-xl font-bold">Tagihan Siggy</h1>
            <p className="mt-1 text-sm text-text-secondary">Masukin username Discord atau nama kamu di invoice. Siggy bakal PM link login.</p>
          </div>
          {searchParams.sent && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              Kalau namanya kedaftar, Siggy udah PM link-nya. Cek DM Discord. Gak masuk? Pastiin DM dari member server kebuka, atau minta pembuat invoice nge-link nama kamu.
            </p>
          )}
          {searchParams.error === 'link' && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">Link-nya udah kadaluarsa atau rusak. Minta link baru.</p>
          )}
          <form action={requestLinkAction} className="flex gap-2">
            <input name="name" required maxLength={64} placeholder="decka_tan" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-accent/50" />
            <button type="submit" className="rounded-lg bg-accent px-4 text-sm font-bold text-black">Kirim</button>
          </form>
        </div>
      </div>
    );
  }

  const view = buildMemberView(memberId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-text-primary">
      <style dangerouslySetInnerHTML={{ __html: HIDE_SITE_CHROME }} />
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Tagihan Siggy</p>
            <h1 className="text-xl font-bold">Hai, {view.displayName}</h1>
          </div>
          <form action="/invoice/auth/logout" method="post">
            <button type="submit" className="text-xs text-text-secondary hover:text-text-primary">Keluar</button>
          </form>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-xs text-text-secondary">Utang kamu</p>
            <p className="mt-1 text-lg font-bold text-amber-400">{formatCurrency(view.owedTotal)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-xs text-text-secondary">Piutang kamu</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">{formatCurrency(view.receivableTotal)}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-bold">Yang harus kamu bayar</h2>
          {view.owedByCreator.length === 0 ? (
            <p className="text-sm text-text-secondary">Gak ada tagihan. Kalau ngerasa punya, minta pembuat invoice nge-link nama kamu.</p>
          ) : (
            view.owedByCreator.map(group => (
              <div key={group.creatorId || group.creatorName} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-bold">ke {group.creatorName}</p>
                  <p className="font-mono font-bold text-amber-400">{formatCurrency(group.total)}</p>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {group.payment?.account
                    ? <>{group.payment.bank} <span className="select-all font-mono text-text-primary">{group.payment.account}</span> a/n {group.payment.name}</>
                    : 'Rekening belum diisi, tanya langsung ke orangnya.'}
                </p>
                <ul className="mt-3 divide-y divide-white/5 text-sm">
                  {group.bills.map(b => (
                    <li key={`${b.invoiceId}#${b.index}`} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate">{b.title} <span className="text-xs text-text-secondary">· {formatDate(b.date)}</span></span>
                      <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          {view.owedByCreator.length > 0 && (
            <p className="text-xs text-text-secondary">Udah transfer? Konfirmasi + kirim bukti lewat <span className="font-mono text-text-primary">/bayar</span> di Discord.</p>
          )}
        </section>

        {view.owedToMe.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Yang belum bayar ke kamu</h2>
            {view.owedToMe.map(person => (
              <details key={person.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <summary className="flex cursor-pointer items-baseline justify-between gap-3">
                  <span className="truncate">
                    <span className="font-bold">{person.name}</span>{' '}
                    <span className="text-xs text-text-secondary">· {person.bills.length} tagihan</span>
                  </span>
                  <span className="shrink-0 font-mono font-bold text-emerald-400">{formatCurrency(person.total)}</span>
                </summary>
                <ul className="mt-2 divide-y divide-white/5 text-sm">
                  {person.bills.map((b, i) => (
                    <li key={i} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate">{b.title} <span className="text-xs text-text-secondary">· {formatDate(b.date)}</span></span>
                      <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        )}

        {view.paidBills.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-bold">Udah lunas ({view.paidBills.length})</summary>
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
