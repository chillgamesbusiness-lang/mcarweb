# Admin + Inspector Stability Audit

Date: 2026-04-30

## Deployment Gate

Status: **Passed and deployed.**

The admin and inspector code paths now pass against the connected Supabase database, including assignment, appointment updates, inspection handback, bulk deletion, and blocking audit logs. The later production public-funnel gates documented in `end-to-end-scenario-audit.md` and `mcarweb-production-readiness-report-final.md` are also closed for V1.

The latest production deployment is aliased at `https://mcarweb.vercel.app`.

## Live Database Prerequisites

| Required prerequisite | Latest live result | Notes |
|---|---:|---|
| `audit_log.actor_kind` | Pass | Audit actor attribution available |
| `appointments.booking_submit_id` | Pass | Booking idempotency column available |
| `leads.pending_photo_urls` | Pass | Inspector upload handoff column available |
| `inspections.photo_urls` | Pass | Submitted inspection photos available to admin |
| `inspections.recommended_offer` | Pass | Inspector suggested value available to admin |
| `leads.status = verified` | Pass | Enum value accepted |
| `leads.status = offer_made` | Pass | Enum value accepted |
| `leads.status = expired` | Pass | Enum value accepted |
| `leads.status = no_response` | Pass | Enum value accepted |

## Bugs Found And Fixed

| Area | Bug | Impact | Fix applied |
|---|---|---|---|
| Admin lead detail actions | Several Supabase writes redirected without checking `error` | UI could show success while DB writes failed | Checked update/insert/delete results and thrown errors |
| Inspector forwarding | Assignment did not validate active inspector or confirm persisted value | Leads could be forwarded to a bad inspector or appear forwarded without DB confirmation | Active inspector validation, DB confirmation, audit logging |
| Bulk admin workflows | No select-all or bulk actions on admin lead/calendar lists | Repetitive manual operation for operators | Visible-row selection plus bulk delete/status/finance/forwarding |
| Partial failures | Bulk operations had no structured result contract | Operators could not see per-record failures | `MutationResult` with affected, skipped, and failed records |
| Live schema drift | Live DB missed columns and enum values expected by code | Admin/inspector flows failed against production-like data | Idempotent SQL patch and verifier preflight |
| Audit log FK conflict | Lead delete conflicted with append-only audit history | Bulk delete could fail after audited actions existed | SQL patch drops the lead FK and preserves historical lead IDs as references |
| Lead delete auditability | Lead deletes were confirmed but not explicitly audit logged | Destructive actions had a weaker audit trail than status/assignment changes | `deleteLeadById` writes blocking `lead_deleted` audit rows |
| Inspector queue enum filter | Queue queried enum literals not present in the live DB | Inspector page rendered an assignment error | Removed brittle DB-side enum filter; terminal statuses are filtered in app code |
| Error reporting | Supabase/PostgREST errors logged as object strings | Debug logs lacked DB error details | Object error normalization now includes message/details/hint/code |
| Admin/inspector colours | Cards/buttons/statuses were gradient-heavy and harder to scan | Light/dark panels felt less operational | Neutral palette, 8px cards, subtle borders, dark-safe badges |

## Database Action Audit

| Action | Surfaces | Tables/storage touched | Audit expectation | Current status |
|---|---|---|---|---|
| Create lead | `/offer/contact` | `leads`, `valuation_snapshots`, `audit_log` | `lead_created` | Production browser and Supabase proof pass |
| Create booking | `/offer/book` | `appointments`, `leads`, `audit_log` | `booking_created`; idempotent `booking_submit_id` | Production browser and Supabase proof pass |
| Update lead status | Lead detail, lead bulk table | `leads`, `audit_log` | Blocking `status_change` | Live verifier pass |
| Update finance status | Lead detail, lead bulk table | `leads`, `audit_log` | Blocking `finance_change` | Live verifier pass |
| Forward to inspector | Lead detail, lead bulk table | `leads`, `users`, `audit_log` | Blocking `assignment_change` | Live verifier pass |
| Submit inspection | `/inspector/[leadId]` | `inspections`, `leads`, `audit_log` | Blocking `inspection_submitted` and status audit | Live verifier pass for recommendation/photos/status/audit handback |
| Upload inspection photos | Inspector detail photo uploader | Storage, `leads`, `audit_log` | `photos_uploaded`; pending paths stored | Code path inspected; schema verified; storage mutation not run against real files in this pass |
| Add admin note | Lead detail | `notes`, `audit_log` | Blocking `note_added` | Checked server action handling; not included in live verifier mutation set |
| Record outcome | Lead detail | `leads`, calibration data, `audit_log` | Blocking `outcome_recorded`; calibration audit where applicable | Checked server action handling; no customer-send automation exists |
| Update appointment | Lead detail, calendar bulk table | `appointments`, `leads`, `audit_log` | Blocking status audit; booked cancellation returns lead to contacted | Live verifier pass |
| Delete appointment | Calendar bulk table | `appointments`, `leads`, `audit_log` | Blocking audit and lead status repair where needed | Code path covered by shared mutation helper; direct delete not in current live verifier |
| Delete lead | Lead detail, lead bulk table | Storage, `inspections`, `leads`, `audit_log` | Blocking `lead_deleted`, then DB confirms row removal | Live verifier pass |

## Verification Run

| Check | Result | Notes |
|---|---:|---|
| `npm run test:bulk-selection` | Pass | 9 passed, 0 failed |
| `npm run test:admin-mutations` | Pass | 11 passed, 0 failed |
| `npm run handoff:slots` | Pass | 8 passed, 0 failed |
| `npm run handoff:tokens` | Pass | 5 passed, 0 failed |
| `npm run handoff:statuses` | Pass | Status lifecycle checks pass |
| `npm run handoff:smoke` | Pass | `/`, `/offer`, `/offer/details`, `/offer/contact`, `/offer/book` returned non-500 locally |
| `npm run verify:admin-inspector` | Pass | Includes inspector recommendation/photos/status/audit handback |
| `npx tsx --env-file .env.local scripts/check-prod-env.ts` | Fail | Missing `OFFER_SESSION_SECRET`, `DVLA_VES_API_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_ADDRESS` |
| Browser public funnel | Pass | Production alias completed lookup -> contact/OTP -> valuation -> booking -> done |

## Browser QA

| Surface | Mode / viewport | Result | Notes |
|---|---|---:|---|
| Admin leads | Desktop light | Pass | Bulk table, toolbar, badges, and neutral palette render cleanly |
| Admin leads | Desktop dark | Pass | Contrast and borders are readable |
| Admin leads | Mobile dark | Pass | Rows and controls remain usable |
| Admin calendar | Desktop dark | Pass | Bulk appointment table renders correctly |
| Inspector queue | Desktop dark | Pass | Enum-related assignment error fixed; row action contrast adjusted |
| Inspector detail | Desktop dark | Pass | Photo panel and checklist controls render cleanly |
| Inspector detail | Desktop light | Pass | Form remains readable with neutral surfaces |
| Landing to offer | Desktop light | Pass | `/` registration form navigates to `/offer?reg=AB12CDE` |
| Offer lookup | Desktop light | Local-only blocked | Turnstile `110200` prevents lookup button enablement locally; production hostname later passed lookup |
| Final-offer decision | V1 scope | Pass | Automated customer final-offer notification is out of scope; admin contacts customer manually |

## Required Next Steps For Future Releases

1. Add all required production provider/env values in local, staging, and production, including an explicit 32+ character `OFFER_SESSION_SECRET`.
2. Authorize local, Vercel preview, and production hostnames in Cloudflare Turnstile, or use Cloudflare Turnstile test keys for local QA.
3. Rerun the public browser journey after any provider, schema, or funnel code changes: landing -> lookup -> details -> contact/OTP -> valuation -> booking -> done.
4. Rerun `npm run test:bulk-selection`, `npm run test:admin-mutations`, `npm run handoff:slots`, `npm run handoff:tokens`, `npm run handoff:statuses`, `npm run verify:admin-inspector`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
5. Keep final-offer customer notification out of V1 unless the business explicitly reopens scope; the current documented workflow is manual admin contact after inspection.
6. Only after every future gate passes, push and deploy to Vercel.

## Deployment

Deployment URL: `https://mcarweb.vercel.app`

Reason: admin/inspector live checks pass, public-funnel browser proof passes against the target hostname, and Resend is optional/degraded for V1.
