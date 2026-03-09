import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Siggy - Multi-Dimensional Cat | Ritual Soul Forge',
  description: 'A multi-dimensional cat entity born from the Ritual Cosmic Forge. Chat with Siggy across the dimensions.',
  keywords: ['Siggy', 'Ritual', 'AI', 'Chatbot', 'Multi-dimensional'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
