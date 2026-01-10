import ScreenSizeGuard from '@/components/ui/screen-size-guard';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import 'zod-metadata/register';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.viz-engine.com'),
  title: {
    default: 'VizEngine - A Web-Native Audio-Reactive Animation Engine',
    template: '%s | VizEngine',
  },
  description:
    'A web-native tool designed to bridge the gap between simple creative coding sketches and complex professional software. Create audio-reactive visuals in your browser with a hybrid layer-based and node-based animation engine.',
  keywords: [
    'audio visualization',
    'audio-reactive',
    'creative coding',
    'web animation',
    'three.js',
    'webgl',
    'node editor',
    'visual programming',
    'motion graphics',
    'generative art',
    'web audio api',
    'react',
    'typescript',
    'open source',
  ],
  authors: [{ name: 'Tim Vučina' }],
  creator: 'VizEngine',
  publisher: 'VizEngine',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.viz-engine.com',
    siteName: 'VizEngine',
    title: 'VizEngine - A Web-Native Audio-Reactive Animation Engine',
    description:
      'A web-native tool designed to bridge the gap between simple creative coding sketches and complex professional software. Create audio-reactive visuals in your browser.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VizEngine - A Web-Native Audio-Reactive Animation Engine',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VizEngine - A Web-Native Audio-Reactive Animation Engine',
    description:
      'Create audio-reactive visuals in your browser. A hybrid layer-based and node-based animation engine.',
    images: ['/og-image.png'],
    creator: '@vizengine',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VizEngine',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
    description:
      'A web-native audio-reactive animation engine. Create professional motion graphics in your browser with a hybrid layer-based and node-based workflow.',
    url: 'https://www.viz-engine.com',
    downloadUrl: 'https://github.com/vucinatim/viz-engine',
    softwareVersion: '0.1.0',
    releaseNotes: 'https://github.com/vucinatim/viz-engine/releases',
    featureList: [
      'Audio-reactive animations',
      'Layer-based workflow',
      'Node-based animation engine',
      '3D + 2D compositing',
      'Client-side video export',
      'Real-time audio analysis',
    ],
    screenshot: 'https://www.viz-engine.com/og-image.png',
    author: {
      '@type': 'Organization',
      name: 'VizEngine',
      url: 'https://www.viz-engine.com',
    },
    license: 'https://opensource.org/licenses/MIT',
    programmingLanguage: ['TypeScript', 'JavaScript'],
    runtimePlatform: 'Web Browser',
  };

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="google-site-verification" content="Cdd_pPtZt4Y7G7cqA7vFR7diRXnAsYLpabl3gcIBXiU" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NODE_ENV === 'development' && (
          <script
            async
            crossOrigin="anonymous"
            src="//unpkg.com/react-scan/dist/auto.global.js"
          />
        )}
      </head>
      <body className={inter.className}>
        <ScreenSizeGuard>{children}</ScreenSizeGuard>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
