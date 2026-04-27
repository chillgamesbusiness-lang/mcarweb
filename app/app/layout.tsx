import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import ThemeToggle from "@/app/components/ThemeToggle";
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
const ENABLE_VERCEL_ANALYTICS = process.env.VERCEL === "1";

export const metadata: Metadata = {
  title: {
    default: "MCar — See What Your Car Is Actually Worth",
    template: "%s | MCar",
  },
  description:
    "Enter your reg. We pull DVLA records, MOT history, and live market data to show you what buyers are actually paying — before anyone tries to lowball you.",
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "MCar",
    title: "MCar — See What Your Car Is Actually Worth",
    description:
      "Enter your reg. We pull DVLA records, MOT history, and live market data to show you what buyers are actually paying — before anyone tries to lowball you.",
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC: apply dark class before paint based on system preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mcar-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <ThemeToggle />
        {ENABLE_VERCEL_ANALYTICS && <Analytics />}
      </body>
    </html>
  );
}
