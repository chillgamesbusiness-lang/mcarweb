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
  themeColor: "#C4963C",          // gold accent — brand identity
};

const BASE_URL = "https://mcarweb.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "MCar — Sell Your Car Without the Hassle",
    template: "%s | MCar",
  },
  description:
    "Enter your registration for a free, no-obligation valuation backed by real vehicle data. A simpler way to sell your car.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "MCar",
    title: "MCar — Sell Your Car Without the Hassle",
    description:
      "Enter your registration for a free, no-obligation valuation backed by real vehicle data. A simpler way to sell your car.",
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
