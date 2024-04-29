import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "zod-metadata/register";
import "./globals.css";
import useBodyProps from "@/lib/stores/body-props-store";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VizEngine",
  description:
    "A visual programming environment for creating audiovisual experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
