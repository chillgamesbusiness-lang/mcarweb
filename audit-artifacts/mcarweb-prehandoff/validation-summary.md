# MCarWeb Pre-Handoff Validation Summary

Date: 2026-04-27

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

`npm run handoff:env` failed as expected in this local shell. Missing required production env vars:

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
- `RESEND_API_KEY`
- `RESEND_FROM_ADDRESS`

This is a handoff blocker until configured in the production host.

## Skipped Or Blocked Evidence

- `npm run handoff:smoke`: skipped because `HANDOFF_BASE_URL` or `NEXT_PUBLIC_APP_URL` was not available in the shell.
- Lighthouse reports were not generated because no deployed/base URL was available for consistent page audits.
- Authenticated admin/inspector screenshots were not generated because those pages require real auth/session setup. Public and login screenshots were generated locally in production mode.
- DB integrity tests requiring Supabase were not run because production/project env vars were unavailable.
- Provider failure simulations for Twilio, DVLA, Turnstile, and Resend were not run against live services because credentials were unavailable.

## Residual Non-Code Risks

- Dependency audit was reduced from 9 vulnerabilities (5 moderate, 4 high) to 6 moderate vulnerabilities. Safe fixes were applied and Next.js was upgraded to 16.2.4. Remaining moderate issues are in the Resend/Svix/uuid chain and require a breaking Resend upgrade path, so they were not forced in this pass.
- Accuracy outliers remain in valuation calibration. They do not block the code hardening gates but should be reviewed before client claims about valuation precision.