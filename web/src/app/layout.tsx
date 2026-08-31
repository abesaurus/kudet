import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hybrid Cash — The card that earns while you spend',
  description:
    'Hybrid Cash. Load ETH, USDG or tokenized stocks on Robinhood Chain, spend anywhere cards are accepted — and keep earning yield on every dollar until you swipe.',
  openGraph: {
    title: 'Hybrid Cash — Spend it, earn on it',
    description:
      'Load your portfolio on Robinhood Chain. Spend anywhere. Keep earning yield on every dollar until you swipe.',
    images: ['/assets/og.png'],
  },
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
