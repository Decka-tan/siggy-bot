import { redirect } from 'next/navigation';
import { buildMemberView, formatCurrency, formatDate, listLoginPeople, resolveDiscordIds } from './lib/data';
import { getMemberId, makeLoginToken, oauthConfig, publicBase } from './lib/session';
import { AccountBox, Chevron, Initial, MonthBars, PAGE_CSS, SectionTitle, Siggy, StatTile, StatusPill } from './ui';

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
      oauth: ['err', 'Login Discord gagal atau dibatalin. Coba lagi.'],
    } as Record<string, [string, string]>;
    const shown = searchParams.sent ? notice.sent : notice[searchParams.error || ''];
    const discordLogin = !!oauthConfig();
    return (
      <div className="inv-bg min-h-screen text-text-primary">
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
        <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-4 py-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="inv-rise relative hidden md:block">
            <div className="absolute inset-x-10 bottom-0 top-16 rounded-full bg-accent/10 blur-3xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/siggy-transparent.png" alt="Siggy" className="inv-float relative mx-auto max-h-[78vh] w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] [mask-image:linear-gradient(to_bottom,black_70%,transparent),linear-gradient(to_left,transparent,black_18%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]" />
          </div>
          <div className="inv-rise inv-rise-2 inv-card mx-auto w-full max-w-md rounded-3xl p-7 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-3">
              <Siggy mood={searchParams.sent ? 'happy' : shown ? 'sad' : 'default'} size={48} />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Siggy Ledger</p>
                <h1 className="text-2xl font-black tracking-tight">Tagihan kamu</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Liat utang, piutang, dan rekening tujuan transfer dari semua invoice Siggy.{' '}
              {discordLogin ? 'Masuk pakai akun Discord kamu, satu klik.' : 'Pilih nama kamu, nanti aku PM link login ke Discord.'}
            </p>
            {shown && (
              <p className={`mt-5 rounded-xl border px-4 py-3 text-sm ${shown[0] === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                {shown[1]}
              </p>
            )}
            {discordLogin && (
              <a href="/invoice/auth/discord" className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] py-3.5 text-sm font-black text-white shadow-lg shadow-[#5865F2]/30 transition hover:brightness-110 active:scale-[0.99]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Masuk pakai Discord
              </a>
            )}
            {discordLogin ? (
              <details className="mt-4 rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-text-secondary">
                <summary className="flex cursor-pointer items-center gap-2 hover:text-text-primary"><Chevron /> Atau minta link login lewat PM Siggy</summary>
                <div className="mt-1">
            <form action={requestLinkAction} className="mt-3 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">Nama kamu</label>
              <select name="id" required defaultValue="" className="w-full appearance-none rounded-xl border border-white/10 bg-[#101015] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat px-4 py-3.5 text-sm outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10">
                <option value="" disabled>Pilih nama…</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-accent py-3.5 text-sm font-black text-black shadow-lg shadow-accent/20 transition hover:brightness-110 active:scale-[0.99]">
                Kirim link login ke DM →
              </button>
            </form>
                </div>
              </details>
            ) : (
            <form action={requestLinkAction} className="mt-6 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">Nama kamu</label>
              <select name="id" required defaultValue="" className="w-full appearance-none rounded-xl border border-white/10 bg-[#101015] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat px-4 py-3.5 text-sm outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10">
                <option value="" disabled>Pilih nama…</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-accent py-3.5 text-sm font-black text-black shadow-lg shadow-accent/20 transition hover:brightness-110 active:scale-[0.99]">
                Kirim link login ke DM →
              </button>
            </form>
            )}
            <details className={`${discordLogin ? 'mt-2' : 'mt-5'} rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-text-secondary`}>
              <summary className="flex cursor-pointer items-center gap-2 hover:text-text-primary"><Chevron /> Nama kamu gak ada di daftar?</summary>
              <form action={requestLinkAction} className="mt-3 flex gap-2">
                <input name="name" required maxLength={64} placeholder="Username Discord / nama di invoice" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent/50" />
                <button type="submit" className="rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15">Kirim</button>
              </form>
            </details>
            <p className="mt-6 text-center text-[11px] text-text-secondary/70">{discordLogin ? 'Login nempel 30 hari di device ini' : 'Link berlaku 10 menit · cuma bisa dibuka pemilik akun Discord-nya'}</p>
          </div>
        </div>
      </div>
    );
  }

  const view = buildMemberView(memberId);
  const net = view.receivableTotal - view.owedTotal;
  const mood = view.owedTotal === 0 ? 'happy' : view.owedTotal >= 100000 ? 'shock' : 'default';
  const say =
    view.owedTotal === 0
      ? 'Bersih! Gak ada utang. Siggy bangga 🐾'
      : view.owedTotal >= 100000
        ? `Waduh, utang kamu udah ${formatCurrency(view.owedTotal)}. Yuk dicicil.`
        : `Masih ada ${formatCurrency(view.owedTotal)} ke ${view.owedByCreator.length} orang. Dikit lagi!`;
  const flow = view.owedTotal + view.receivableTotal || 1;
  const maxOwedToMe = Math.max(...view.owedToMe.map(p => p.total), 1);

  // Group the history by month for the timeline.
  const recent = view.history.slice(0, 12);
  const byMonth: { label: string; bills: typeof recent }[] = [];
  for (const b of recent) {
    const label = b.at ? new Date(b.at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Tanpa tanggal';
    const last = byMonth[byMonth.length - 1];
    if (last?.label === label) last.bills.push(b);
    else byMonth.push({ label, bills: [b] });
  }

  return (
    <div className="inv-bg min-h-screen text-text-primary">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07070a]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Siggy size={30} />
            <span className="text-sm font-black tracking-tight">Siggy <span className="text-accent">Ledger</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-text-secondary sm:inline">{view.displayName}</span>
            <Initial name={view.displayName} id={memberId} size={30} />
            <form action="/invoice/auth/logout" method="post">
              <button type="submit" className="rounded-lg px-3 py-1.5 text-xs text-text-secondary ring-1 ring-white/10 transition hover:bg-white/5 hover:text-text-primary">Keluar</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="inv-hero inv-grain inv-rise relative overflow-hidden rounded-3xl p-6 sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/siggy-transparent.png" alt="" className="inv-float pointer-events-none absolute -bottom-24 -right-6 h-[340px] w-auto opacity-30 sm:-bottom-28 sm:right-4 sm:h-[400px] sm:opacity-100 md:-bottom-32 md:h-[460px]" />
          <div className="relative max-w-xl">
            <div className="flex items-center gap-3">
              <Siggy mood={mood} size={44} />
              <p className="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-sm backdrop-blur">{say}</p>
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Hai, {view.displayName}!</h1>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Saldo bersih</p>
            <p className={`mt-1 text-4xl font-black tracking-tight sm:text-5xl ${net >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net)).replace('Rp ', 'Rp ')}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{net >= 0 ? 'Orang lebih banyak utang ke kamu.' : 'Kamu lebih banyak utang ke orang.'}</p>

            <div className="mt-6 flex h-2.5 w-full max-w-md overflow-hidden rounded-full bg-white/5">
              <div className="bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${(view.owedTotal / flow) * 100}%` }} />
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${(view.receivableTotal / flow) * 100}%` }} />
            </div>
            <div className="mt-3 flex max-w-md flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Utang <b className="text-amber-300">{formatCurrency(view.owedTotal)}</b></span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Piutang <b className="text-emerald-300">{formatCurrency(view.receivableTotal)}</b></span>
            </div>
          </div>
        </section>

        <section className="inv-rise inv-rise-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total ditagih" value={formatCurrency(view.lifetime.billed)} hint={`${view.lifetime.count} tagihan`} />
          <StatTile label="Udah dibayar" value={formatCurrency(view.lifetime.paid)} hint={`${view.lifetime.billed ? Math.round((view.lifetime.paid / view.lifetime.billed) * 100) : 0}% lunas`} tone="emerald" />
          <StatTile label="Rata-rata" value={formatCurrency(view.lifetime.avg)} hint="per tagihan" tone="violet" />
          <StatTile label="Ditagih sama" value={`${view.lifetime.creators} orang`} hint="sejak awal" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="inv-rise inv-rise-3 min-w-0 space-y-3">
            <SectionTitle aside={view.owedByCreator.length ? `${view.owedByCreator.length} orang` : undefined}>Yang harus kamu bayar</SectionTitle>
            {view.owedByCreator.length === 0 ? (
              <div className="inv-card flex items-center gap-4 rounded-2xl p-6">
                <Siggy mood="happy" size={56} />
                <div>
                  <p className="font-bold">Gak ada tagihan 🎉</p>
                  <p className="text-sm text-text-secondary">Kalau ngerasa punya, minta pembuat invoice nge-link nama kamu.</p>
                </div>
              </div>
            ) : (
              view.owedByCreator.map(group => (
                <div key={group.creatorId || group.creatorName} className="inv-card rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Initial name={group.creatorName} id={group.creatorId} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-secondary">Transfer ke</p>
                      <p className="truncate text-lg font-bold">{group.creatorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-amber-400">{formatCurrency(group.total)}</p>
                      <p className="text-xs text-text-secondary">{group.bills.length} tagihan</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AccountBox bank={group.payment?.bank} account={group.payment?.account} holder={group.payment?.name} />
                  </div>
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
                      <Chevron /> Rincian {group.bills.length} tagihan
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {group.bills.map(b => (
                        <li key={`${b.invoiceId}#${b.index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate">{b.title}</span>
                            <span className="text-xs text-text-secondary">{formatDate(b.date)}</span>
                          </span>
                          <span className="shrink-0 font-mono font-bold">{formatCurrency(b.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))
            )}
            {view.owedByCreator.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] p-4 text-sm">
                <span className="text-lg">💸</span>
                <p className="text-text-secondary">
                  Udah transfer? Konfirmasi + kirim bukti lewat <span className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-accent">/bayar</span> di Discord biar ditandain lunas.
                </p>
              </div>
            )}
          </section>

          <div className="min-w-0 space-y-6">
            {view.monthly.length > 0 && (
              <section className="inv-rise inv-rise-3 inv-card rounded-2xl p-5">
                <SectionTitle aside="6 bulan terakhir">Pengeluaran kamu</SectionTitle>
                <div className="mt-4">
                  <MonthBars months={view.monthly} />
                </div>
              </section>
            )}

            {view.owedToMe.length > 0 && (
              <section className="inv-rise inv-rise-4 space-y-3">
                <SectionTitle aside={`${view.owedToMe.length} orang`}>Yang belum bayar ke kamu</SectionTitle>
                <div className="inv-card divide-y divide-white/5 overflow-hidden rounded-2xl">
                  {view.owedToMe.map((person, i) => (
                    <details key={person.name} className="group px-4 py-3 transition hover:bg-white/[0.02]">
                      <summary className="flex cursor-pointer items-center gap-3">
                        <span className="w-4 text-center text-xs font-bold text-text-secondary">{i + 1}</span>
                        <Initial name={person.name} size={34} id={person.id} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-bold">{person.name}</span>
                            <span className="shrink-0 font-bold text-emerald-400">{formatCurrency(person.total)}</span>
                          </span>
                          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/5">
                            <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${(person.total / maxOwedToMe) * 100}%` }} />
                          </span>
                        </span>
                        <Chevron />
                      </summary>
                      <ul className="mt-3 space-y-1 pl-[3.25rem] text-sm">
                        {person.bills.map((b, j) => (
                          <li key={j} className="flex justify-between gap-3">
                            <span className="min-w-0 truncate text-text-secondary">{b.title} · {formatDate(b.date)}</span>
                            <span className="shrink-0 font-mono">{formatCurrency(b.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {byMonth.length > 0 && (
          <section className="space-y-3">
            <SectionTitle aside={`12 terakhir dari ${view.history.length}`}>Riwayat</SectionTitle>
            <div className="inv-card rounded-2xl p-4 sm:p-5">
              {byMonth.map(m => (
                <div key={m.label} className="mb-4 last:mb-0">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">{m.label}</p>
                  <ol className="relative space-y-2 border-l border-white/10 pl-5">
                    {m.bills.map(b => (
                      <li key={`${b.invoiceId}#${b.index}`} className="relative">
                        <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#0d0d12] ${b.paid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate">{b.title}</span>
                            <span className="text-xs text-text-secondary">ke {b.creatorName} · {formatDate(b.date)}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="font-mono">{formatCurrency(b.amount)}</span>
                            <StatusPill paid={b.paid} />
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="pb-6 pt-2 text-center text-xs text-text-secondary/60">Siggy Ledger · data dari invoice Siggy di Discord</footer>
      </main>
    </div>
  );
}
