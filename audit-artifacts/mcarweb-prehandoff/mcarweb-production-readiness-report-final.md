# MCarWeb Production Readiness Report — Final

Date: 2026-05-01

## Executive Decision

MCarWeb is **production-ready for the documented V1 launch scope**.

Admin and inspector workflows have passed live production browser QA and scripted Supabase verification. Production public lookup passes through Turnstile, DVLA, MOT enrichment, signed token generation, and the details/contact screens. Real Twilio SMS send and server-side OTP verification have passed. The production public funnel now also creates the lead, creates the valuation snapshot, books an appointment, writes public audit rows, and reaches `/offer/done` on `https://mcarweb.vercel.app`.

The final-offer customer-send decision is now resolved for V1: automated final-offer email/SMS is out of scope, and admin staff will contact the customer manually after recording the recommended final offer.

Client-facing V1 launch can proceed with the documented scope and residual non-blocking caveats in this report.

## Canonical Status

| Area | Current status | Deployment meaning |
|---|---:|---|
| Admin/inspector handoff | Pass | Live browser QA and Supabase verifier pass |
| Bulk admin actions | Pass | Bulk selection/mutation tests pass |
| Inspector forwarding | Pass | Assignment and queue flow verified |
| Inspector recommendation/photo handback | Pass | Recommendation, photos, status, audit handback verified |
| Build | Pass | Latest production build completed locally |
| Lint | Pass with warnings | No lint errors; warnings remain non-blocking |
| Public landing to offer route | Pass | `/` routes to `/offer?reg=AB12CDE` in browser QA |
| Public vehicle lookup | Pass | Production browser proved Turnstile + DVLA/MOT + signed token |
| Public OTP | Pass | Real SMS send/server verify pass; deployed UI supports 4-8 digit codes and auto-verified sessions |
| Public valuation creation | Pass | Production lead and valuation snapshot verified in Supabase |
| Public booking happy path | Pass | Production appointment, lead status, audit rows, and `/offer/done` verified |
| Final-offer customer notification | Resolved for V1 | Out of scope; admin contacts customer manually |
| Production deployment | Launch-certified for V1 | Latest deployed build is live and smoke-verified on `https://mcarweb.vercel.app` |

Historical database-schema failure blocks are superseded by the latest live verifier result: `npm run verify:admin-inspector` now passes against the connected Supabase database.

## Closed Release Gates

1. **Production public-funnel schema patch is applied**

   A controlled production OTP run on 2026-05-01 sent a real Twilio SMS and the server accepted the received code. The next contact submit initially failed at lead creation because production Supabase was missing:

   - `leads.offer_token_jti`
   - `leads.contact_submit_id`
   - `leads.otp_session_id`
   - `valuation_snapshots.valuation_engine_version`

   [sql-migration/patch_public_funnel_schema_gap.sql](../../sql-migration/patch_public_funnel_schema_gap.sql) was applied in production, then this check passed:

   ```powershell
   npx tsx --env-file .env.vercel.production.local scripts/check-public-schema.ts
   ```

2. **Public booking has final live proof**

   After the schema patch and latest code deployment, the browser completed:

   ```text
   /offer/contact -> OTP send -> OTP verify -> valuation snapshot -> booking -> done
   ```

   Supabase proof confirmed lead `1aff867c-e02e-45cf-8509-e7bbcb65a631`, valuation midpoint 6000, appointment `6745550c-8758-4627-bbc4-d3cd4e0ad4f3`, lead status `appointment_booked`, idempotency columns, and public audit actions. The controlled lead, valuation snapshot, appointment, and OTP session were cleaned after proof; three non-PII audit rows remain because `audit_log` rejects PostgREST delete-returning operations.

3. **Latest hardening changes deployed**

   Local code now includes:

   - Resend removed from the hard production gate and reported as optional/degraded.
   - Login rejection for inactive/missing staff profiles.
   - Admin Settings notification status corrected so non-configured email does not appear fully active.
   - QA cleanup tooling for labelled audit/browser test data.

   These changes have now been built, deployed to `https://mcarweb.vercel.app`, and smoke-verified against the production alias. Additional deployed fixes preserve password input exactly, allow Twilio-configured 4-8 digit OTP codes, allow auto-verified OTP sessions to submit without a fresh code, and add the public schema checker.

4. **Provider/env gate**

   Required values must exist in local, staging, and production before certification:

   - `OFFER_SESSION_SECRET`
   - `DVLA_VES_API_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SERVICE_SID`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   `OFFER_SESSION_SECRET` must be an explicit 32+ character value. Production must not rely on token-signing fallback behaviour.

   `RESEND_API_KEY` and `RESEND_FROM_ADDRESS` are optional for this V1 release. When absent, `email.ts` logs/continues instead of blocking booking or lead creation, so booking confirmations and admin new-lead email alerts should be treated as degraded operator convenience, not a deployment blocker.

   Acceptance gate:

   ```powershell
   npx tsx --env-file .env.local scripts/check-prod-env.ts
   ```

   Latest pulled production env result on 2026-05-01: pass, with optional warnings for missing Resend values.

   Vercel CLI inventory on 2026-05-01 for `chillgamesbusiness-langs-projects/mcarweb` shows `OFFER_SESSION_SECRET` and `DVLA_VES_API_KEY` are already present for Production. It also shows Twilio Verify, Turnstile, Upstash, and Supabase env vars present. `RESEND_API_KEY` and `RESEND_FROM_ADDRESS` were not listed in any Vercel environment and are not required for V1 production readiness.

5. **Staff-account hygiene must stay closed**

   Production accepted `admin@dev.local` with the known dev password during QA. That credential has since been rotated/deauthorized and the old password now returns invalid credentials. After cleanup and redeploy, the known QA/dev profile query returned `activeQaOrDevProfiles: 0`.

## Resolved Product Decision

**Final-offer customer notification is out of scope for V1.** After inspection, the admin records the recommended final offer in the system and contacts the customer manually. Automated final-offer email/SMS will be implemented in a later version behind an explicit `Send final offer` admin action with audit logging and delivery status.

This avoids adding email/SMS delivery, resend states, failed-send recovery, customer dispute trail, offer expiry, and audit semantics during deployment stabilisation. If the business later needs automated sends, it should be shipped as a dedicated workflow rather than silently coupled to inspection handback.

## Certification Gates

| Gate | Required evidence | Current status |
|---|---|---:|
| Environment gate | Required env values exist in target environment and local proof env as needed | Pass with pulled production env; optional Resend warning only |
| Turnstile server enforcement | Missing/invalid lookup and OTP tokens are rejected server-side before DVLA/Twilio | Pass: `npm run handoff:public-guards` |
| Turnstile lookup browser | No `110200`; button enables only after valid challenge | Pass on `mcarweb.vercel.app` |
| Turnstile OTP browser | OTP send requires and verifies valid token with live provider hostname | Pass for real send and deployed UI |
| DVLA lookup | Valid reg returns safe usable vehicle data | Pass: production browser returned vehicle/MOT data |
| Invalid reg | Safe validation error, no raw provider leak | Pass in production browser and `handoff:public-guards` |
| DVLA/provider failure | User-safe failure, no raw provider leak | Pass: `npm run handoff:public-guards`; needs live timeout/error observation when configured |
| Upstash rate limit | Lookup rate limit works with configured Redis | Pass by env/script/code; not exhaustion-tested against production to avoid inducing live limits |
| Signed offer token | Lookup creates token accepted by `/offer/details` | Pass in production browser |
| Twilio OTP send | Real Twilio Verify service sends OTP | Pass with controlled phone |
| Twilio OTP verify | Correct OTP passes; wrong/expired OTP fails safely | Pass for correct-code server verify; wrong/expired still covered by guard tests |
| Contact submission | Cannot submit valuation without verified OTP | Pass in production browser |
| Lead creation | Lead created once; duplicate behaviour matches intended reuse | Pass in production browser/Supabase proof |
| Valuation snapshot | Snapshot row created and attached to lead | Pass in production browser/Supabase proof |
| Booking | Valid appointment saved and status/audit updated | Pass in production browser/Supabase proof |
| Admin/inspector verifier | `npm run verify:admin-inspector` passes | Pass |
| Admin/inspector browser QA | Dashboard, leads, calendar, inspector upload/submit, admin handback | Pass with controlled QA record; cleanup completed |
| Staff dev credentials | Known dev credentials cannot access production | Remediated; post-deploy active QA/dev profile count is 0 |
| Final-offer decision | Option A documented or Option B implemented | Pass: Option A documented |

## Final Verification Commands

Run these from `app/` after provider/env fixes:

```powershell
npm run test:bulk-selection
npm run test:admin-mutations
npm run handoff:slots
npm run handoff:tokens
npm run handoff:statuses
npm run handoff:public-guards
npm run handoff:public-schema
npm run verify:admin-inspector
npm run lint
npx tsc --noEmit
npm run build
```

Then run from the repository root:

```powershell
git diff --check
```

Browser E2E must cover:

- Public customer funnel
- Admin light mode
- Admin dark mode
- Inspector light mode
- Inspector dark mode
- Mobile public funnel
- Mobile admin usability if supported

## Deployment Gate

Only deploy when all are true:

- Environment check passes.
- Turnstile works on the target hostname.
- DVLA lookup works.
- Twilio OTP works.
- Public schema check passes against the target Supabase project.
- Public funnel passes browser E2E.
- Admin/inspector verifier passes.
- Build passes.
- Lint has no errors.
- No known client-blocking provider gaps remain.
- Final-offer workflow is either implemented or explicitly out of scope.

Deployment commands after all gates are closed:

```powershell
git status
git add .
git commit -m "Stabilise MCarWeb admin, inspector, and public funnel handoff"
git push origin main
```

If Vercel auto-deploy is connected, verify the deployment in Vercel. If manual deployment is required:

```powershell
vercel --prod
```

## Current Recommendation

Call it production-ready for V1. The admin/inspector system is proven, production lookup is proven, real Twilio OTP send/verify is proven, public contact/valuation/booking is proven, Resend is correctly optional for V1, and staff-account hygiene is closed for known QA/dev profiles.