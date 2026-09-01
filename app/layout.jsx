import './globals.css';

export const metadata = {
  title: 'HYBRID — Lending Protocol',
  description:
    'Deposit HYBRID, borrow USDG at up to 50% LTV on Robinhood Chain. No liquidation, keeper price safety, proportional redeem.',
  openGraph: {
    title: 'HYBRID — Lending Protocol',
    description: 'Deposit HYBRID. Borrow USDG. No liquidation, no deadlines.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
