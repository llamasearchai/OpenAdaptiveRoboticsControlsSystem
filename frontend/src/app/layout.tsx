import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/lib/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'ARCS - Adaptive Robotics Control System',
    template: '%s | ARCS',
  },
  description:
    'Advanced robotics control system with real-time simulation, training, and analytics.',
  keywords: [
    'robotics',
    'control system',
    'machine learning',
    'simulation',
    'training',
    'reinforcement learning',
  ],
  authors: [{ name: 'ARCS Team' }],
  creator: 'ARCS Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ARCS',
    title: 'ARCS - Adaptive Robotics Control System',
    description:
      'Advanced robotics control system with real-time simulation, training, and analytics.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARCS - Adaptive Robotics Control System',
    description:
      'Advanced robotics control system with real-time simulation, training, and analytics.',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
