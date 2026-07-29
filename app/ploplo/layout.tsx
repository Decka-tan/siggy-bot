import type { Metadata } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';

// This route runs its own type system — the global Anton/Inter pairing is
// too flat next to the PloPlo art.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--ploplo-display',
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
  variable: '--ploplo-body',
});

export const metadata: Metadata = {
  title: 'PloPlo Holder — Ritual community registry',
  description: 'Every member holding the PloPlo Holder badge in the Ritual Discord.',
};

export default function PloPloLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable}`}>{children}</div>;
}
