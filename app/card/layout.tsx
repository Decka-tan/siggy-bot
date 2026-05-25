import { Rajdhani } from 'next/font/google';
import './card.css';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata = {
  title: 'Ritual Card Generator · Siggy',
  description: 'Generate a Ritual contributor card for any member — live Discord data, downloadable as PNG.',
};

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={rajdhani.variable}>
      {children}
    </div>
  );
}
