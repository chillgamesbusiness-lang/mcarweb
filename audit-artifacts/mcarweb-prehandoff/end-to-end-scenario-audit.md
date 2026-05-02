# End-to-End Scenario Audit

Date: 2026-05-01

## Status

Overall status: **Production-ready for the documented V1 launch scope.**

Admin and inspector handoff passes both scripted Supabase verification and a live production browser journey. The public journey now proves production Turnstile, DVLA, MOT enrichment, signed token generation, details/contact routing, real Twilio SMS send, server-side OTP verification, lead creation, valuation snapshot creation, appointment booking, audit rows, and `/offer/done` on `https://mcarweb.vercel.app`.

The controlled proof lead, appointment, valuation snapshot, and OTP session were removed after verification to avoid retaining test data created with a real phone. Three append-only audit rows for the proof lead remain because production `audit_log` rejects PostgREST delete-returning operations; those rows do not contain the phone number.

## Customer Funnel Scenarios

| Scenario | Expected behaviour | Evidence | Status |
|---|---|---|---:|
| Landing page loads | Home page presents registration input and CTA | Browser opened `/`; title and H1 rendered | Pass |
| Landing registration submit | Registration is uppercased/trimmed and routes to `/offer?reg=...` | Browser entered `AB12CDE` and clicked `Go`; URL became `/offer?reg=AB12CDE` | Pass |
| Short/empty landing registration | Landing form does not navigate until at least 2 chars | Code check in `HeroSection` | Pass by code inspection |
| Offer page loads with reg | `/offer?reg=...` pre-fills lookup form | Browser rendered offer page with `AB12CDE` | Pass |
| Turnstile completion | Lookup button stays disabled until bot check returns token | Production browser showed Cloudflare success on `/offer?reg=AB12CDE` | Pass |
| Turnstile local provider failure | User cannot continue when local domain is not authorized | Earlier localhost/127.0.0.1 run showed Cloudflare `110200`; production hostname now succeeds | Local-only config gap |
| Vehicle lookup happy path | `/api/vehicle/lookup` rate-limits, verifies Turnstile, validates reg, calls DVLA/MOT, returns signed token | Production browser reached `/offer/details` with Vauxhall Astra DVLA/MOT data for `AB12CDE`; `npm run handoff:public-guards` covers safe mocked failures | Pass |
| Invalid registration | API rejects invalid/sanitized reg input with user-safe error before DVLA | Production browser showed safe `We couldn't find that registration`; `npm run handoff:public-guards` covers route behaviour | Pass |
| Lookup rate limit | Upstash-backed rate limit protects lookup endpoint | Route and rate-limit helper inspected | Requires production Upstash env to verify live |
| Details with valid token | `/offer/details` validates token, shows vehicle/MOT, collects mileage/condition | Production browser displayed DVLA/MOT data, accepted mileage/condition, and routed to contact | Pass |
| Details missing/tampered/expired token | User cannot continue with invalid session | `npm run handoff:tokens` passed 5/5 | Pass |
| Mileage/condition validation | Server validates mileage and condition before contact step | Details server action inspected | Pass by code inspection |
| Contact form loads with valid token | `/offer/contact` uses token/cookie state and shows contact/OTP form | Production browser reached contact form with vehicle summary | Pass |
| Contact validation | Name, mobile, email, postcode, consent, mileage, and condition are validated | Contact server action inspected | Pass by code inspection |
| OTP send | Turnstile token and UK mobile are required before Twilio send | Production browser sent a real Twilio SMS to a controlled phone; `npm run handoff:public-guards` proves token enforcement before Twilio | Pass |
| OTP verify | Verified session/code required before valuation submit | Server accepted the received code and returned `verified: true`; deployed UI now allows Twilio-configured 4-8 digit codes, and auto-verified sessions can submit without a fresh code | Pass |
| Duplicate lead/contact | Existing matching lead can be reused instead of duplicating | Contact action inspected | Pass by code inspection |
| Valuation snapshot creation | Pricing engine result creates `leads` and `valuation_snapshots` rows | Production browser created lead `1aff867c-e02e-45cf-8509-e7bbcb65a631`; Supabase proof showed valuation midpoint 6000, `auto_quote=true`, and `valuation_engine_version=pricingEngine.calculateValuation:v3.0`; proof rows cleaned after verification | Pass |
| Auto quote display | `/offer/book` shows midpoint/range for `auto_quote` snapshots | Booking page inspected | Pass by code inspection |
| Manual review display | `/offer/book` shows review-required copy when auto quote is unavailable/blocked | Booking page inspected | Pass by code inspection |
| Quote expiry | Expired/missing snapshot marks lead expired and blocks booking | Booking page inspected | Pass by code inspection |
| Booking slot validation | Invalid, duplicate, and colliding slots are blocked | `npm run handoff:slots` passed 8/8 | Pass |
| Booking idempotency | Duplicate booking submit IDs are protected | Booking action inspected; schema verified | Pass by live schema verifier/code inspection |
| Booking confirmation | Appointment inserts, lead becomes `appointment_booked`, audit/email are attempted, user reaches `/offer/done` | Production browser booked an in-person slot and reached `/offer/done`; Supabase proof showed appointment `6745550c-8758-4627-bbc4-d3cd4e0ad4f3`, lead status `appointment_booked`, `booking_submit_id`, and audit actions `lead_created`, `status_change`, `booking_created` | Pass |
| Done page | Confirmation page renders after booking | Production browser rendered `Booking Confirmed`; live smoke also returns 200 | Pass |

## Admin Scenarios

| Scenario | Expected behaviour | Evidence | Status |
|---|---|---|---:|
| Admin list loads | Leads list fetches recent leads and active inspectors | Production browser opened dashboard/leads list with controlled QA record | Pass |
| Admin select all | Header checkbox selects only visible rows and supports indeterminate state | `npm run test:bulk-selection` passed 9/9 | Pass |
| Bulk lead status change | Selected leads update status and write audit logs | Live verifier pass | Pass |
| Bulk finance change | Selected leads update finance status and write audit logs | Live verifier pass | Pass |
| Bulk forward to inspector | Active inspector validation, assignment, queue visibility, audit log | Live verifier pass | Pass |
| Invalid inspector assignment | Missing/inactive inspector is rejected | Live verifier pass | Pass |
| Bulk lead delete | Deletes selected leads, removes photos, writes `lead_deleted`, confirms rows gone | Live verifier pass | Pass |
| Lead detail loads | Admin sees seller, vehicle, valuation, appointment, inspection, notes, audit | Production browser opened QA lead detail | Pass |
| Admin note | Note insert is checked and audit logged | Production browser added QA note; audit showed `note added` | Pass |
| Admin status/finance forms | Writes are checked, audited, and errors thrown | Production browser updated finance to clear and status to offer_made; audit rows appeared | Pass |
| Admin outcome won/lost | Admin records outcome, final agreed price, purchase/resale/recon data, and calibration inputs | Source inspected | Pass by code inspection |
| Customer final offer send | For V1, admin records the recommended final offer and contacts the customer manually | Product decision documented in production readiness report; automated send deferred to later explicit workflow | Pass for V1 scope |
| Calendar status/detail | Appointment status updates and lead status repair happen with audit | Production browser marked QA appointment completed; calendar showed completed row | Pass |
| Calendar bulk delete | Appointment deletion helper repairs lead status and audits | Source inspected | Pass by code inspection |

## Inspector And Handback Scenarios

| Scenario | Expected behaviour | Evidence | Status |
|---|---|---|---:|
| Inspector queue | Assigned non-terminal leads appear; terminal won/lost/expired are hidden | Production browser showed assigned QA lead in inspector queue | Pass |
| Inspector detail authorization | Inspector can only open leads assigned to their user ID | Source inspected | Pass by code inspection |
| Photo upload authorization | Upload API requires auth and assignment to the lead | Upload route inspected | Pass by code inspection |
| Photo upload validation | File count/type/size/magic bytes are validated; submitted inspections are locked | Production browser uploaded a valid PNG through the real upload route; route inspected for type/size/magic-byte checks | Pass |
| Pending photo handoff | Uploads append paths to `leads.pending_photo_urls` | Production browser showed Photos (1); admin audit showed `photos uploaded` | Pass |
| Inspection checklist | Bodywork, interior, mechanical, and tyre sections are required | Inspector action inspected | Pass by code inspection |
| Recommended offer bounds | Suggested value must be 0 to 500000 | Inspector action inspected | Pass by code inspection |
| Inspection submit | Inspection row stores checklist, notes, photos, recommended offer; lead becomes `inspected`; pending photos clear | Production browser submitted full checklist, note, and GBP 4,550 recommended offer | Pass |
| Admin sees inspection | Admin detail reads recommendation, notes, checklist, and signed photo URLs | Production browser confirmed admin sees offer, notes, photo count, checklist, and audit | Pass |
| Inspection audit | `inspection_submitted` and status-change audit entries are written | Production browser confirmed audit rows | Pass |
| Resubmission/idempotency | Already submitted inspection redirects/read-only instead of duplicate write | Source inspected | Pass by code inspection |

## Provider And Environment Notes

| Item | Impact | Required action |
|---|---|---|
| Public contact persistence schema drift | Closed; `scripts/check-public-schema.ts` now passes against production | Keep `npm run handoff:public-schema` in future release checks |
| Booking browser proof | Closed; production browser completed contact -> valuation -> booking -> done and Supabase rows were verified | Repeat after future funnel/schema changes |
| Local Turnstile `110200` on `127.0.0.1` | Local browser cannot complete `/offer` lookup with production keys | Add local hostname to Turnstile Hostname Management or use Cloudflare test keys locally |
| Latest code deployed | OTP code-length fix, auto-verified session submit fix, password exact-preservation, schema checker, Resend optional gate, staff hygiene, security headers, dashboard macro panels, and live smoke script are deployed | Final production alias smoke passed on `https://mcarweb.vercel.app` |

## Resolved Product Decision

Final-offer customer notification is out of scope for V1. After inspection, the admin records the recommended final offer in the system and contacts the customer manually. Automated final-offer email/SMS should be implemented later behind an explicit `Send final offer` admin action with audit logging and delivery status.

Resend is optional for V1. If it remains unset, booking confirmations and admin new-lead email alerts degrade to logged/no-send behaviour; the core public funnel still creates leads, valuations, appointments, and audit records.

## Command Evidence

| Command/check | Result |
|---|---:|
| `npm run verify:admin-inspector` | Pass, including recommendation/photos handback |
| `npm run handoff:slots` | Pass, 8/8 |
| `npm run handoff:tokens` | Pass, 5/5 |
| `npm run handoff:statuses` | Pass |
| `npm run handoff:public-guards` | Pass, server-side Turnstile missing/invalid rejection and DVLA safe-error mapping |
| `npm run handoff:smoke` with local base URL | Pass, public routes returned non-500 |
| `npx tsx --env-file .env.vercel.production.local scripts/check-prod-env.ts` | Pass; warns that optional Resend values are not configured |
| `vercel env ls` / `vercel env pull` | Production has `OFFER_SESSION_SECRET`, `DVLA_VES_API_KEY`, Twilio Verify, Turnstile, Upstash, and Supabase; Resend is not listed and is optional for V1 |
| Browser landing -> offer | Pass |
| Production browser offer lookup | Pass: Turnstile success, DVLA/MOT data returned, details/contact reached |
| Production browser public OTP/booking | Pass: SMS send/server verify, auto-verified submit, lead/snapshot creation, booking, and `/offer/done` all completed |
| Supabase row proof | Pass: lead status `appointment_booked`, valuation midpoint 6000, booked appointment with `booking_submit_id`, and public audit actions verified; PII-bearing proof rows cleaned afterward |
| `npx tsx --env-file .env.vercel.production.local scripts/check-public-schema.ts` | Pass: all six public-funnel prerequisites present |
| Production browser admin/inspector QA | Pass: controlled QA record exercised and cleaned up |
| Production dev credential check | `admin@dev.local` was accepted before remediation; old password now returns invalid credentials after credential rotation |

## Deployment Decision

Call production ready for the documented V1 launch scope. Admin/inspector is live-verified, Resend is optional for V1, production lookup works, real Twilio OTP send/verify works, public contact/valuation/booking reaches `/offer/done`, Supabase persistence is verified, and known QA/dev staff profiles are inactive.