import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",          // blue-600 — matches brand buttons
};

const BASE_URL = "https://mcarweb.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "MCar — Instant Vehicle Valuations",
    template: "%s | MCar",
  },
  description:
    "Get an instant, data-driven valuation for your vehicle. Fast, transparent, and fair offers from MCar.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "MCar",
    title: "MCar — Instant Vehicle Valuations",
    description:
      "Get an instant, data-driven valuation for your vehicle. Fast, transparent, and fair offers from MCar.",
    url: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
