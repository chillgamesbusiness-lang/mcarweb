import type { NextConfig } from "next";
import { execSync } from "child_process";
import { assertProductionEnv } from "./lib/env";

assertProductionEnv('next-config')

// Capture git commit hash at build time for reproducibility
let gitCommitHash = 'unknown';
try {
  gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch { /* not in a git repo or git not available */ }

const securityHeaders = [
  // Never render inside an iframe — prevents clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send origin on cross-origin requests (no full URL in Referer)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS — tell browsers to only ever use HTTPS (2 years)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable browser features the app doesn't use (camera allowed for self — inspector photo capture)
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy
  // - script-src: self + Cloudflare Turnstile + Vercel Analytics + Next.js needs unsafe-inline for RSC hydration
  // - style-src: self + unsafe-inline (Tailwind inline styles)
  // - img-src: self + blob + data (Next/Image, base64 previews)
  // - connect-src: self + Supabase + Cloudflare Turnstile
  // - frame-src: Cloudflare Turnstile widget
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' blob: data: https://*.supabase.co`,
      `connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://*.vercel-insights.com https://va.vercel-scripts.com`,
      `frame-src https://challenges.cloudflare.com`,
      `font-src 'self'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`,
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Remove X-Powered-By header — reduces response size + hides stack info
  poweredByHeader: false,

  // Tree-shake heavy packages — only ship used exports
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@vercel/analytics'],
  },

  // Prefer AVIF (smaller) with WebP fallback for next/image
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  env: {
    NEXT_PUBLIC_GIT_COMMIT_HASH: gitCommitHash,
  },
  async headers() {
    return [
      {
        // Apply to every route
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
