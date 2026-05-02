# MCarWeb Pre-Handoff Validation Summary

Date: 2026-04-27

## 2026-05-01 Live Production QA Addendum

- Final production browser proof now passes end to end on `https://mcarweb.vercel.app`: contact auto-verification -> lead creation -> valuation snapshot -> booking -> `/offer/done`. Supabase proof confirmed the lead, snapshot, appointment, and audit actions before the controlled PII-bearing proof rows were cleaned.
- Pulled Vercel production env into ignored local proof file and ran `npx tsx --env-file .env.vercel.production.local scripts/check-prod-env.ts`: pass, with optional Resend warnings only.
- Resend is no longer V1 release-blocking. Booking confirmation and admin new-lead emails degrade when Resend is absent; lead/booking persistence must not depend on email delivery.
- Production browser QA on `https://mcarweb.vercel.app` proved landing -> offer -> Turnstile success -> DVLA/MOT lookup -> signed token -> details -> contact form for `AB12CDE`.
- Production browser QA also proved invalid registration safe error and blocked/invalid phone safe OTP-send error.
- Real public OTP SMS send and server-side verify now pass with a controlled phone. The public-funnel schema patch is applied and `scripts/check-public-schema.ts` passes against production.
- Production admin browser QA used a controlled temporary QA record to verify dashboard, leads list, lead detail, note add, finance update, appointment completed, calendar visibility, inspector queue, PNG photo upload, full inspection submit, admin inspection handback, and audit log entries.
- Temporary browser QA data was cleaned up. Older `admin_audit_script` lead artifacts were also removed; audit-linked QA/dev profile rows were deauthorized rather than deleted to preserve append-only audit-log integrity.
- `admin@dev.local` was accepted by production before remediation. The known dev password has now been rotated/deauthorized and returns invalid credentials. The inactive-profile login rejection is now deployed in the latest production build.
- Latest hardening and macro-upgrade build deployed to `https://mcarweb.vercel.app` on 2026-05-01. Final live smoke passed for `/`, `/offer`, `/login`, `/privacy`, `/sitemap.xml`, and required security headers.
- Staff hygiene check after cleanup/deploy found `activeQaOrDevProfiles: 0` for known QA/dev email patterns.
- Admin Settings notification status was corrected locally so missing Resend does not show email-dependent notifications as fully active.

See `audit-artifacts/mcarweb-prehandoff/end-to-end-scenario-audit.md` for the updated scenario matrix.

## 2026-04-30 End-to-End Addendum

- `npm run verify:admin-inspector` now passes against the connected Supabase database, including inspector recommendation/photo handback, lead `inspected` status update, audit logging, and audited lead deletion.
- Browser QA confirmed `/` registration entry routes to `/offer?reg=AB12CDE`.
- Earlier local browser QA was blocked at `/offer` because Cloudflare Turnstile returned `110200` on localhost/127.0.0.1. The production hostname now succeeds through Turnstile and lookup.
- The old local `.env.local` gate result is superseded by the pulled Vercel production proof env. `RESEND_API_KEY` and `RESEND_FROM_ADDRESS` are optional for V1.
- Superseded: full public happy-path proof, landing -> lookup -> details -> contact/OTP -> valuation -> booking -> done, now passes against the production alias.
- Final-offer customer notification is documented as out of scope for V1; after inspection, admin staff record the recommended final offer and contact the customer manually.
- Superseded: Vercel production deployment has now been completed for the latest hardening/macro-upgrade build.

See `audit-artifacts/mcarweb-prehandoff/end-to-end-scenario-audit.md` for the full scenario matrix.

## Passed Locally

- `npm run handoff:slots`: 8 passed, 0 failed.
- `npm run handoff:tokens`: 5 passed, 0 failed.
- `npm run handoff:statuses`: passed all lifecycle and legacy-status exclusion checks.
- `npm run lint`: 0 errors, 23 pre-existing warnings remain.
- `npx tsc --noEmit`: no TypeScript errors.
- `npm run build`: Next production build completed successfully.
- VS Code Problems check: no errors found.
- Production-mode responsive CSS sweep: public pages rendered at 320, 390, 768, and 1366 pixel widths with 0 horizontal overflow and no clipped buttons/cards detected.
- Final polish validation after theme/dependency changes: `npm run lint` had 0 errors and 23 warnings; `npx tsc --noEmit` passed; `npm run build` passed on Next.js 16.2.4.
- Handoff scripts after polish: `handoff:slots` 8/8 passed, `handoff:tokens` 5/5 passed, `handoff:statuses` passed, `handoff:smoke` skipped without base URL.

## CSS / UX Browser Pass

Validated in Chromium via Playwright against local dev and production-mode servers.

- Pages checked: `/`, `/offer`, `/offer/details`, `/offer/contact`, `/offer/done`, `/login`, `/privacy`.
- Authenticated entry checks: `/admin`, `/admin/leads`, `/admin/calendar`, and `/inspector` correctly redirected to `/login` without mobile overflow.
- Screenshot evidence saved under `audit-artifacts/mcarweb-prehandoff/screenshots/`:
	- `home-desktop.png`
	- `offer-mobile.png`
	- `details-mobile.png`
	- `contact-mobile.png`
	- `login-mobile.png`
	- `privacy-mobile.png`
- CSS/UX fixes made during pass:
	- Public offer shell now uses horizontal-only overflow control so tall mobile forms are not clipped.
	- Turnstile widget is shared and uses responsive/flexible sizing to avoid narrow-mobile iframe overflow.
	- Contact submit button now has visible disabled styling while OTP is incomplete.
	- Vehicle details/MOT summary grids collapse to one column on mobile.
	- Vehicle details page no longer crashes when optional MOT summary fields are absent.
	- Vercel Analytics script/connect domains are now allowed by CSP.
	- Root layout marks intentional smooth scrolling for Next route-transition handling.
	- Added a persistent light/dark toggle and raised low-contrast dark-mode text across funnel, privacy, staff shell, and disabled controls.
	- `/privacy` now uses theme tokens instead of hard-coded light gray classes.
	- Local Vercel Analytics loading is disabled outside Vercel to reduce false browser-console noise in handoff screenshots.

Remaining UX evidence gap: Safari, Firefox, Edge, real device testing, authenticated admin/inspector screenshots, and a real provider-backed lookup to OTP to booking flow still require production/staging credentials and a deployed URL.

## Existing Script Results

- `npx tsx scripts/accuracyTestV3.ts`: completed. Overall enhanced V4 pass was 179/186, 96 percent. Notable remaining outliers included high-mileage and universal-model cases.
- `npx tsx scripts/simulate50_r2.ts`: completed. 47/51 pass, 92.2 percent accuracy excluding manual. Failures were VW Tiguan diesel, BMW X3 diesel, Mercedes E-Class diesel, and Volvo XC60 diesel under-valuations.
- `npx tsx scripts/smokeTest.ts`: blocked before execution because `NEXT_PUBLIC_SUPABASE_URL` was missing in this shell.

## Release-Blocking Environment Gate

Earlier `npm run handoff:env` failed as expected in an unsynced local shell. Missing required production env vars were:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OFFER_SESSION_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `DVLA_VES_API_KEY`

This local-only result is superseded for production by the pulled Vercel proof env, which passes the required gate. Resend remains optional/degraded for V1.

## Skipped Or Blocked Evidence

- `npm run handoff:smoke`: skipped because `HANDOFF_BASE_URL` or `NEXT_PUBLIC_APP_URL` was not available in the shell.
- Lighthouse reports were not generated because no deployed/base URL was available for consistent page audits.
- Authenticated admin/inspector screenshots were not generated because those pages require real auth/session setup. Public and login screenshots were generated locally in production mode.
- DB integrity tests requiring Supabase were not run because production/project env vars were unavailable.
- Provider failure simulations for Twilio, DVLA, Turnstile, and Resend were not run against live services because credentials were unavailable.

## Residual Non-Code Risks

- Dependency audit was reduced from 9 vulnerabilities (5 moderate, 4 high) to 6 moderate vulnerabilities. Safe fixes were applied and Next.js was upgraded to 16.2.4. Remaining moderate issues are in the Resend/Svix/uuid chain and require a breaking Resend upgrade path, so they were not forced in this pass.
- Accuracy outliers remain in valuation calibration. They do not block the code hardening gates but should be reviewed before client claims about valuation precision.