import type { NextConfig } from "next";

const securityHeaders = [
  // Never render inside an iframe — prevents clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send origin on cross-origin requests (no full URL in Referer)
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS — tell browsers to only ever use HTTPS (2 years)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable browser features the app doesn't use
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy
  // - script-src: self + Cloudflare Turnstile + Next.js needs unsafe-inline for RSC hydration
  // - style-src: self + unsafe-inline (Tailwind inline styles)
  // - img-src: self + blob + data (Next/Image, base64 previews)
  // - connect-src: self + Supabase + Cloudflare Turnstile
  // - frame-src: Cloudflare Turnstile widget
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' blob: data: https://*.supabase.co`,
      `connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com`,
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
