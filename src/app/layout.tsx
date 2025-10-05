import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'zod-metadata/register';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VizEngine',
  description:
    'A visual programming environment for creating audiovisual experiences.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.reactScanConfig = {
                enabled: ${process.env.NODE_ENV === 'development'},
                showToolbar: ${process.env.NODE_ENV === 'development'}
              };
            `,
          }}
        />
        <script
          async
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
