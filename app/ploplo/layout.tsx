import type { Metadata } from 'next';
import { Baloo_2, Fredoka } from 'next/font/google';

// Rounded, chunky type — it echoes the shape language of the PloPlo
// characters (soft 3D stars). A neutral grotesk fights the artwork.
const display = Baloo_2({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
  variable: '--ploplo-display',
});

const body = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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
