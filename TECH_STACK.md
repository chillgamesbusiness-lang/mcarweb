# Tech Stack – Vehicle Acquisition & CRM System v1

**Locked:** 22 February 2026
**Status:** Approved for build

This document locks the technology decisions for v1. Changes to this stack require explicit sign-off and an update to this file with a reason and date.

---

## Stack Overview

| Layer | Technology | Decision |
|---|---|---|
| Framework | Next.js (App Router) | Locked |
| Hosting | Vercel | Locked |
| Database | Supabase (PostgreSQL) | Locked |
| Auth | Supabase Auth | Locked |
| File Storage | Supabase Storage | Locked |
| Email | Resend | Locked |
| Rate Limiting | Upstash Redis | Locked |
| Bot Protection | Cloudflare Turnstile | Locked |
| Styling | Tailwind CSS | Locked |

---

## Decisions in Detail

---

### Framework — Next.js (App Router)

- Server components and server actions keep API keys off the client
- API routes used for reg lookup, appointment slot availability, and lead submission
- `middleware.ts` handles route-level auth protection for `/admin/*` and `/inspector/*`
- Deployed on Vercel with zero config

---

### Database — Supabase (PostgreSQL)

- Managed Postgres — no separate DB server to maintain
- Row-Level Security (RLS) enforced at DB level as a second layer behind application auth
- Supabase client used server-side only in API routes and server actions
- Schema defined in `DATA_MODEL.md` — migrations managed via Supabase CLI

---

### Auth — Supabase Auth

- Email + password for Admin and Inspector accounts
- Sessions managed via Supabase JWT — validated in `middleware.ts` and server actions
- Public funnel users have no accounts — no auth required for `/offer/*`
- Role stored in `users.role` column, read from DB after login to determine redirect and permissions

---

### File Storage — Supabase Storage

- Inspection photos uploaded directly to a private Supabase Storage bucket
- Inspector panel uploads via signed upload URLs (server-generated, short-lived)
- Admin can view photos via signed read URLs — never publicly accessible
- Bucket: `inspection-photos`

---

### Email — Resend

- Transactional email only (no marketing bulk sends in v1)
- Triggered server-side from Next.js API routes / server actions
- Templates:
  - `appointment-confirmation` — sent to customer on booking
  - `appointment-reminder` — sent 24h before appointment (scheduled via Vercel Cron or Supabase pg_cron)
  - `admin-new-lead` — sent to admin on new lead submission
  - `admin-inspection-complete` — sent to admin on inspection submission
- From domain configured and verified in Resend dashboard

---

### Rate Limiting — Upstash Redis

- Applied to the reg lookup endpoint (`POST /api/lookup`) to prevent scraping
- Limit: 10 requests per IP per 10 minutes (adjustable)
- Upstash Redis used via `@upstash/ratelimit` SDK — serverless compatible
- Soft block returns `429 Too Many Requests` with a retry-after header

---

### Bot Protection — Cloudflare Turnstile

- Turnstile widget embedded on the `/offer/contact` step (the contact gate)
- Token verified server-side before lead is created in the DB
- Chosen over hCaptcha for better UX (non-interactive in most cases)
- Free tier sufficient for v1 volumes

---

### Styling — Tailwind CSS

- Utility-first, fast to build with
- No component library mandated in v1 — use plain Tailwind with a consistent design token set
- If a component library is needed later, shadcn/ui is the preferred addition (Tailwind-native)

---

## What Is Explicitly Out of Scope for v1

| Feature | Reason Deferred |
|---|---|
| SMS notifications | Adds Twilio dependency — not required for MVP |
| Mobile app | Web is sufficient for inspector panel at v1 |
| Multi-location / branch support | Single-site operation in v1 |
| Automated offer calculation engine | Manual or rule-based range is sufficient for v1 |
| Customer portal / login | Sellers have no account — confirmation is email only |
| Stripe / payment processing | Not applicable at acquisition stage |

---

## Environment Variables Required

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Reg Lookup
REG_LOOKUP_API_KEY=
REG_LOOKUP_API_URL=

# Resend
RESEND_API_KEY=
RESEND_FROM_ADDRESS=

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

> All secrets are server-side only. Only `NEXT_PUBLIC_*` variables are exposed to the client — intentionally limited to Supabase URL, Supabase anon key, and Turnstile site key.
