import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Siggy - Multi-Dimensional Cat',
  description: 'Chat with Siggy, a multi-dimensional cat entity born from the Ritual Cosmic Forge.',
  keywords: ['Siggy', 'Ritual', 'AI', 'Chatbot', 'Multi-dimensional'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
