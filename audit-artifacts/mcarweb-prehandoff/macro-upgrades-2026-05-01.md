# Macro Upgrade Pass

Date: 2026-05-01

Scope: high-ROI production hardening and operator workflow improvements only. No paid/new customer-facing feature scope was added.

## Completed Upgrades

1. Added `X-DNS-Prefetch-Control` security header.
2. Added `X-Permitted-Cross-Domain-Policies` security header.
3. Added `Cross-Origin-Opener-Policy` security header.
4. Added `Cross-Origin-Resource-Policy` security header.
5. Added `Origin-Agent-Cluster` security header.
6. Added CSP `worker-src` directive.
7. Added CSP `media-src` directive.
8. Added CSP `manifest-src` directive.
9. Production env gate validates Supabase URL format and HTTPS.
10. Production env gate validates Upstash URL format and HTTPS.
11. Production env gate rejects placeholder offer-session secrets.
12. Production env gate validates Twilio Account SID shape.
13. Production env gate validates Twilio Verify Service SID shape.
14. Production env gate rejects placeholder DVLA keys.
15. Production env gate rejects placeholder Turnstile site keys.
16. Production env gate rejects placeholder Turnstile secret keys.
17. Production env gate rejects placeholder Upstash tokens.
18. Production env gate validates optional Resend sender address format when configured.
19. Env checker prints an explicit OTP-proof-deferred warning without weakening OTP enforcement.
20. Details mileage input now uses integer step validation.
21. Details mileage input now declares numeric mobile keyboard intent.
22. Details mileage input now uses `enterKeyHint="next"`.
23. Details mileage input disables irrelevant browser autocomplete.
24. Details condition select disables irrelevant browser autocomplete.
25. Booking form now sends a stable `submitId` for idempotency protection.
26. Booking error banner now has `role="alert"` and polite live-region semantics.
27. Booking appointment type select disables irrelevant browser autocomplete.
28. Booking slot select disables irrelevant browser autocomplete.
29. Contact form now sends a stable `submitId` for lead idempotency protection.
30. Contact OTP resend is rate-shaped client-side with a visible cooldown.
31. Contact OTP cooldown updates once per second.
32. Contact OTP success text uses a polite live region.
33. Contact OTP error text uses `role="alert"`.
34. Contact name input has autocomplete and max length.
35. Contact phone input has autocomplete, phone keyboard hint, and max length.
36. Contact email input has autocomplete and max length.
37. Contact postcode input has autocomplete and max length.
38. Contact OTP input advertises `one-time-code` autocomplete.
39. Changing phone number resets stale OTP resend cooldown state.
40. Staff login trims and lowercases email before auth.
41. Staff login preserves password bytes before auth instead of trimming secrets.
42. Staff login rejects empty credentials before Supabase auth.
43. Admin Settings now has a Release Gate section.
44. Admin Settings shows current build hash.
45. Admin Settings shows current Vercel environment.
46. Admin Settings shows current Node environment.
47. Admin Settings exposes OTP proof as required/deferred operational state.
48. Admin Settings makes public booking proof gap visible to operators.
49. Browser QA cleanup now deauthorizes audit-linked users instead of breaking audit history.
50. Added live deployment smoke script covering key routes and required security headers.
51. Added `handoff:live` npm script for deployment smoke checks.
52. Added `release:verify` npm script to run the core pre-deploy verification chain.
53. Admin dashboard now surfaces engine confidence as an operator KPI.
54. Admin dashboard now surfaces manual review rate as an operator KPI.
55. Admin dashboard now surfaces blocked/manual-only quote rate.
56. Admin dashboard now surfaces confidence decay rate.
57. Admin dashboard now surfaces calibration sample size.
58. Admin dashboard now surfaces rollback-blocked rate.
59. Admin dashboard now surfaces dangerous-defect rate.
60. Admin dashboard now surfaces average risk flag load.
61. Admin dashboard now surfaces average recon estimate percentage.
62. Admin dashboard now surfaces deployed capital and capital-cap usage.
63. Admin dashboard now surfaces same-model breach count.
64. Admin dashboard now surfaces EV and old-diesel concentration.
65. Admin dashboard now surfaces current/candidate valuation engine versions.
66. Admin dashboard now surfaces shadow comparison count.
67. Admin dashboard now surfaces average and maximum shadow delta.
68. Admin dashboard now shows an 8-week funnel strip.
69. Admin dashboard now shows won/lost/manual-review mix per trend week.
70. Admin dashboard now shows the build hash alongside trend data.

## Deliberately Deferred

- Public OTP-to-booking is no longer deferred; the production schema patch is applied and the public funnel reaches `/offer/done` on the production alias.
- OTP enforcement remains active; no bypass was added for production.

## Deployment Evidence

- Latest production deployment: `https://mcarweb-197tem9cn-chillgamesbusiness-langs-projects.vercel.app`.
- Production alias: `https://mcarweb.vercel.app`.
- Final live smoke passed for `/`, `/offer`, `/login`, `/privacy`, `/sitemap.xml`, and required security headers.
- Known QA/dev staff profile hygiene check returned `activeQaOrDevProfiles: 0`.

## 2026-05-01 Controlled OTP Addendum

- Real Twilio SMS send succeeded against `https://mcarweb.vercel.app` using a controlled phone.
- Twilio accepted a four-digit code, while the contact UI was hard-coded to six digits. The local code now accepts 4-8 digit SMS codes to match Twilio Verify service configuration.
- Contact submit initially failed at lead persistence because production Supabase was missing `leads.offer_token_jti`, `leads.contact_submit_id`, `leads.otp_session_id`, and `valuation_snapshots.valuation_engine_version`.
- Added `app/scripts/check-public-schema.ts` and `npm run handoff:public-schema` so this schema drift is caught explicitly.
- Added `sql-migration/patch_public_funnel_schema_gap.sql`; after applying it, the public schema check passed and production OTP -> valuation -> booking proof reached `/offer/done`.
- Patched the auto-verified phone path so a recently verified OTP session can submit contact details without requiring a fresh visible code value.