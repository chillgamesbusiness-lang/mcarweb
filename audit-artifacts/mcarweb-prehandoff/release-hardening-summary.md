# MCarWeb Pre-Handoff Hardening Summary

Date: 2026-04-27

## Implemented Release Gates

- Re-enabled OTP in the public contact funnel. Lead creation now requires a verified OTP session before valuation, lead insert, snapshot insert, or booking token generation.
- Added explicit local/test OTP bypass via `OTP_BYPASS_ENABLED=true`; implicit Twilio-less verification is no longer accepted.
- Added production env validation in `app/lib/env.ts` and wired it into `next.config.ts` plus Supabase server client creation. Strict production requires Upstash, Turnstile public and secret keys, Twilio, DVLA, Supabase, offer secret, and Resend env vars.
- Replaced fail-open Upstash behavior in strict production. Redis errors now report through `reportError`; strict production throws instead of allowing unlimited requests.
- Moved DVLA global throttling from process memory to Upstash-backed global rate limits and added timeout/quota structured reporting.
- Added `reportError(error, context)` with severity, area, operation, lead id, request id, provider, and redacted metadata.
- Added `writeAuditLog(...)` and changed public funnel, booking, upload, inspection, and admin mutations to observable/blocking audit behavior where appropriate.
- Made `audit_log.actor_user_id` nullable in the pre-handoff migration and added `actor_kind` for `system`, `public_user`, `admin`, and `inspector`.
- Changed quote expiry to fail closed. Missing valuation snapshots now block booking.
- Contact flow now fails if valuation snapshot insert fails, except for the existing v4-column fallback path, which still must successfully create a snapshot.
- Added deterministic Europe/London slot generation and server-side validation for invalid dates, past slots, short-notice slots, weekends, off-hour crafted slots, interval mismatches, and collisions.
- Added appointment idempotency through one active booked appointment per lead, optional booking submit id, and DB exclusion/unique constraints in `patch_prehandoff_hardening.sql`.
- Added offer-token `jti` and preserved it through funnel steps. Lead creation dedupes by token jti, registration plus phone, and registration plus email within the recent window.
- Normalized admin lead statuses to the handoff lifecycle: `new`, `verified`, `contacted`, `appointment_booked`, `inspected`, `offer_made`, `won`, `lost`, `expired`, `no_response`.
- Declared `pricingEngine.calculateValuation:v3.0` canonical for customer-facing valuation snapshots. Experimental live valuation is disabled unless `ENABLE_EXPERIMENTAL_LIVE_VALUATION=true` outside production.
- Added handoff scripts for production env, booking slots, token replay/tamper/expiry, admin statuses, and HTTP smoke checks.
- Completed a production-mode Chromium responsive CSS/UX pass for available public pages, added persistent light/dark theme control, fixed mobile clipping/overflow and contrast risks, and saved screenshots under `screenshots/`.
- Reduced dependency audit risk from 9 vulnerabilities to 6 moderate-only issues by applying safe fixes and upgrading Next.js to 16.2.4.

## Files Of Interest

- `app/lib/env.ts`
- `app/lib/reportError.ts`
- `app/lib/auditLog.ts`
- `app/lib/bookingSlots.ts`
- `app/lib/valuationPolicy.ts`
- `app/app/components/TurnstileWidget.tsx`
- `app/app/components/ThemeToggle.tsx`
- `app/app/offer/OfferShell.tsx`
- `app/app/offer/details/page.tsx`
- `app/app/privacy/page.tsx`
- `app/app/offer/contact/page.tsx`
- `app/app/offer/contact/ContactForm.tsx`
- `app/app/offer/book/page.tsx`
- `app/app/offer/book/BookForm.tsx`
- `app/lib/rateLimit.ts`
- `app/lib/dvlaService.ts`
- `app/lib/leadVerification.ts`
- `sql-migration/patch_prehandoff_hardening.sql`

## Required Before Handoff

- Apply `sql-migration/patch_prehandoff_hardening.sql` to Supabase production before release.
- Configure the missing production env vars listed in `validation-summary.md`.
- Run DB smoke/integrity tests against the real Supabase project after migration.
- Run real browser E2E, Lighthouse, authenticated admin/inspector screenshots, cross-browser checks, and load tests against a deployed URL with production-like provider mocks or approved live provider credentials.